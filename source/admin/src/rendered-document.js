import DOMPurify from 'dompurify';
// Render mode recycles off-screen CodeMirror widgets. Reuse small sanitized
// fragments on return; never cache connected nodes, listeners or frame state.
const markupCache = new Map();
let cachedCharacters = 0;
function sanitizedFragment(html, styled) {
  const cached = markupCache.get(html);
  if (cached) {
    markupCache.delete(html);
    markupCache.set(html, cached);
    return cached.cloneNode(true);
  }
  const fragment = DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    FORCE_BODY: true,
    ADD_TAGS: styled ? ['iframe', 'link', 'style'] : ['iframe'],
    ADD_ATTR: ['target', 'allow', 'allowfullscreen'],
    FORBID_ATTR: ['srcdoc'],
    FORBID_TAGS: styled ? ['form', 'input'] : ['form', 'input', 'style']
  });
  if (html.length <= 50_000) {
    markupCache.set(html, fragment.cloneNode(true));
    cachedCharacters += html.length;
    while (markupCache.size > 64 || cachedCharacters > 250_000) {
      const oldest = markupCache.keys().next().value;
      cachedCharacters -= oldest.length;
      markupCache.delete(oldest);
    }
  }
  return fragment;
}
function resourceUrl(value, base = 'https://blog.giraffish.top/') {
  try {
    const url = value?.trim() && new URL(value, base);
    return url && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function populateRendered(element, html, onLayout = () => {}, {print = false} = {}) {
  const styled = /<(?:link|style)\b/i.test(html);
  const content = sanitizedFragment(html, styled);
  const styles = new Set();
  for (const link of content.querySelectorAll('link')) {
    const href = link.getAttribute('href');
    const localCss = ['127.0.0.1', 'localhost'].includes(window.location.hostname) && /^\/css\//.test(href || '');
    const url = resourceUrl(href, localCss ? window.location.origin : undefined);
    const key = JSON.stringify([url, link.media]);
    if (link.rel.toLowerCase() !== 'stylesheet' || !url || styles.has(key)) {
      link.remove();
      continue;
    }
    styles.add(key);
    link.href = url;
    link.referrerPolicy = 'no-referrer';
    link.addEventListener('load', onLayout);
    link.addEventListener('error', onLayout);
  }
  for (const style of content.querySelectorAll('style')) {
    const key = JSON.stringify([style.textContent, style.media]);
    if (styles.has(key)) style.remove();
    else styles.add(key);
  }
  // Configure frames while detached, before their documents can start loading.
  // Preview scripts run in an opaque origin, isolated from CMS login/storage.
  for (const frame of content.querySelectorAll('iframe')) {
    const url = resourceUrl(frame.getAttribute('src'));
    if (!url) {
      frame.remove();
      continue;
    }
    if (print) {
      const link = document.createElement('a');
      link.href = url;
      link.className = 'pdf-embed-link';
      link.textContent = (frame.title || '内嵌页面') + '：' + url;
      frame.replaceWith(link);
      continue;
    }
    frame.setAttribute('sandbox', 'allow-scripts allow-presentation');
    frame.referrerPolicy = 'no-referrer';
    frame.loading = 'lazy';
    frame.src = url;
    if (!frame.title) frame.title = '内嵌页面';
    if (!frame.hasAttribute('width') && !frame.style.width) frame.style.width = '100%';
    if (!frame.hasAttribute('height') && !frame.style.height && !frame.style.aspectRatio) frame.style.height = '480px';
    frame.style.maxWidth = '100%';
    frame.style.display = 'block';
  }
  for (const media of content.querySelectorAll('img, iframe')) media.addEventListener('load', onLayout);
  for (const image of content.querySelectorAll('img')) {
    image.loading = print ? 'eager' : 'lazy';
    image.referrerPolicy = 'no-referrer';
    const src = image.getAttribute('src');
    if (src?.startsWith('/')) image.src = new URL(src, 'https://blog.giraffish.top').href;
  }
  for (const link of content.querySelectorAll('a[href]')) {
    if (!link.getAttribute('href').startsWith('#')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const url = resourceUrl(link.getAttribute('href'));
      if (url) link.href = url;
    }
  }
  if (styles.size) {
    const host = document.createElement('div');
    host.className = 'studio-html-preview';
    const shadow = host.attachShadow({mode:'open'});
    const defaults = document.createElement('style');
    defaults.textContent = ':host{display:block;font:inherit;color:inherit}*,*::before,*::after{box-sizing:border-box}a{color:inherit;text-decoration:none}img,svg{max-width:100%}';
    shadow.append(defaults, content);
    element.replaceChildren(host);
  } else element.replaceChildren(content);
}
export class LazyDocument {
  constructor(root, onLayout = () => {}) {
    this.root = root;
    this.onLayout = onLayout;
    this.pending = new Set();
    this.resizeObserver = new ResizeObserver(onLayout);
    this.resizeObserver.observe(root);
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.pending.add(entry.target);
        else this.pending.delete(entry.target);
      }
      this.scheduleMounts();
    }, {
      root,
      rootMargin: '800px 0px'
    });
    this.nodes = [];
  }
  scheduleMounts() {
    if (this.frame || this.destroyed || !this.pending.size) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const start = performance.now();
      for (const node of this.pending) {
        this.pending.delete(node);
        this.mount(node);
        if (performance.now() - start >= 6) break;
      }
      this.scheduleMounts();
    });
  }
  mount(node) {
    if (this.destroyed || node.parentNode !== this.root || node.dataset.mounted) return;
    populateRendered(node, node.block.html, this.onLayout);
    node.dataset.mounted = 'true';
    this.pending.delete(node);
    node.style.minHeight = '';
    this.resizeObserver.observe(node);
    this.observer.unobserve(node);
    this.onLayout();
  }
  update(blocks) {
    if (this.destroyed) return;
    const previous = this.nodes;
    const top = this.root.scrollTop;
    const available = new Map();
    for (const node of previous) {
      let bucket = available.get(node.block.html);
      if (!bucket) available.set(node.block.html, bucket = {
        nodes: [],
        index: 0
      });
      bucket.nodes.push(node);
    }
    const created = [];
    const retained = new Set();
    this.nodes = blocks.map((block, index) => {
      const bucket = available.get(block.html);
      let node = bucket?.nodes[bucket.index++];
      if (node) retained.add(node);else {
        node = document.createElement('div');
        node.className = 'studio-rendered-block';
        created.push({
          node,
          wasVisible: !!previous[index]?.dataset.mounted
        });
      }
      node.block = block;
      node.style.setProperty('--block-height', `${block.height}px`);
      const from = String(block.from);
      if (node.dataset.from !== from) node.dataset.from = from;
      if (!node.dataset.mounted) node.style.minHeight = `${block.height}px`;
      return node;
    });
    for (const node of previous) if (!retained.has(node)) {
      this.observer.unobserve(node);
      this.resizeObserver.unobserve(node);
      this.pending.delete(node);
      node.remove();
    }
    // Keep unchanged DOM connected: image loading and expanded details survive edits.
    let cursor = this.root.firstChild;
    for (const node of this.nodes) {
      if (node === cursor) cursor = cursor.nextSibling;else this.root.insertBefore(node, cursor);
    }
    for (const {
      node,
      wasVisible
    } of created) {
      if (wasVisible) this.mount(node);else this.observer.observe(node);
    }
    this.root.scrollTop = top;
    this.onLayout();
    return {
      reused: retained.size,
      created: created.length,
      removed: previous.length - retained.size
    };
  }
  jump(position) {
    const node = this.nodes.find(n => n.block.from <= position && n.block.to >= position);
    if (node) {
      this.mount(node);
      this.root.scrollTop += node.getBoundingClientRect().top - this.root.getBoundingClientRect().top - 20;
    }
  }
  jumpAnchor(id) {
    const node = this.nodes.find(n => n.block.html.includes(`id="${id}"`));
    if (node) {
      this.mount(node);
      const scope = node.querySelector('.studio-html-preview')?.shadowRoot || node;
      const target = scope.querySelector(`#${CSS.escape(id)}`);
      if (target) this.root.scrollTop += target.getBoundingClientRect().top - this.root.getBoundingClientRect().top - 20;
    }
  }
  destroy() {
    this.destroyed = true;
    this.observer.disconnect();
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.frame);
    this.pending.clear();
    this.nodes = [];
    this.root.replaceChildren();
  }
}
