export function safeImageUrl(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (/^\/(?!\/)/.test(text)) return text;
  try {
    const url = new URL(text);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
export function imageMarkdown(url, alt = '') {
  const valid = safeImageUrl(url);
  if (!valid) throw new Error('请输入 http(s) 图片地址或以 / 开头的站内路径。');
  return `![${alt.replace(/[\\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ')}](<${valid.replace(/>/g, '%3E').replace(/</g, '%3C')}>)`;
}

export function imagePreviewUrl(value) {
  const url = safeImageUrl(value);
  return url?.startsWith('/') ? `https://blog.giraffish.top${url}` : url;
}

export function reloadImageElement(image) {
  const url = image.getAttribute('src');
  if (!url) return;
  const root = image.closest('.studio-image-preview');
  if (root) {
    root.dataset.state = 'loading';
    const message = root.querySelector('.studio-image-placeholder');
    if (message) { message.textContent = '加载中…'; message.hidden = false; }
    const retry = root.querySelector('.studio-image-retry');
    if (retry) retry.hidden = true;
  }
  image.removeAttribute('src');
  image.setAttribute('src', url);
}

export function createImageThumbnail(value, alt = '图片预览') {
  const root = document.createElement('div');
  root.className = 'studio-image-preview';
  const url = imagePreviewUrl(value);
  if (!url) {
    root.dataset.state = 'error';
    root.textContent = '图片地址不可预览';
    return root;
  }
  root.dataset.state = 'loading';
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = '打开原图';
  link.setAttribute('aria-label', `${alt}，打开原图`);
  const image = document.createElement('img');
  image.alt = alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  const message = document.createElement('span');
  message.className = 'studio-image-placeholder';
  message.textContent = '加载中…';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'studio-image-retry';
  retry.textContent = '重试';
  retry.hidden = true;
  image.addEventListener('load', () => {
    root.dataset.state = 'loaded';
    message.hidden = true;
    retry.hidden = true;
  });
  image.addEventListener('error', () => {
    root.dataset.state = 'error';
    message.textContent = '图片暂时无法加载';
    message.hidden = false;
    retry.hidden = false;
  });
  retry.addEventListener('click', () => reloadImageElement(image));
  image.src = url;
  link.append(image, message);
  root.append(link, retry);
  return root;
}

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
