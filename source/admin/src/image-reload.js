import {imagePreviewUrl, reloadImageElement} from './image-preview.js';

function imagesIn(root) {
  const images = [...root.querySelectorAll('img')];
  for (const host of root.querySelectorAll('.studio-html-preview')) {
    if (host.shadowRoot) images.push(...imagesIn(host.shadowRoot));
  }
  return images;
}

export async function reloadDocumentImages(root, records, signal, onProgress) {
  const groups = new Map();
  const refreshed = new WeakSet();
  const add = (value, image) => {
    const url = imagePreviewUrl(value);
    if (!url) return;
    if (!groups.has(url)) groups.set(url, []);
    if (image) groups.get(url).push(image);
  };
  for (const record of records) add(record.url);
  for (const image of imagesIn(root)) add(image.currentSrc || image.src, image);
  const entries = [...groups];
  let next = 0, completed = 0;
  onProgress(0, entries.length);
  const refresh = image => {
    if (!image.isConnected || refreshed.has(image)) return;
    refreshed.add(image);
    reloadImageElement(image);
  };
  // Revalidate unchanged URLs: appending cache-busters can break signed images.
  // Limit concurrency so a large article does not flood the host or block editing.
  await Promise.all(Array.from({length:Math.min(4, entries.length)}, async () => {
    while (!signal.aborted && next < entries.length) {
      const [url, images] = entries[next++];
      try {
        const response = await fetch(url, {
          cache:'reload', mode:'no-cors', credentials:'omit', referrerPolicy:'no-referrer',
          signal:AbortSignal.any([signal, AbortSignal.timeout(15000)])
        });
        await response.blob();
      } catch { /* Still retry the image element if the host disallows fetch. */ }
      if (signal.aborted) return;
      images.forEach(refresh);
      onProgress(++completed, entries.length);
    }
  }));
  if (!signal.aborted) {
    // Include widgets mounted while the requests were running, without forcing
    // the editor to render the entire article or changing its scroll position.
    for (const image of imagesIn(root)) {
      if (groups.has(imagePreviewUrl(image.currentSrc || image.src))) refresh(image);
    }
  }
  return completed;
}
