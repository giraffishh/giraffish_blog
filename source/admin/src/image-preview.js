import {safeImageUrl} from './document-utils.js';

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
