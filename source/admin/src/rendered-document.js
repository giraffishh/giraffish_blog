import DOMPurify from 'dompurify';
export function populateRendered(element, html) {
  element.innerHTML = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['iframe', 'form', 'input', 'style']
  });
  for (const image of element.querySelectorAll('img')) {
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    const src = image.getAttribute('src');
    if (src?.startsWith('/')) image.src = new URL(src, 'https://blog.giraffish.top').href;
  }
  for (const link of element.querySelectorAll('a[href]')) {
    if (!link.getAttribute('href').startsWith('#')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }
}
export class LazyDocument {
  constructor(root, onLayout = () => {}) {
    this.root = root;
    this.onLayout = onLayout;
    this.resizeObserver = new ResizeObserver(onLayout);
    this.resizeObserver.observe(root);
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) this.mount(entry.target);
    }, {
      root,
      rootMargin: '800px 0px'
    });
    this.nodes = [];
  }
  mount(node) {
    if (this.destroyed || node.parentNode !== this.root || node.dataset.mounted) return;
    populateRendered(node, node.block.html);
    node.dataset.mounted = 'true';
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
      const from = String(block.from);
      if (node.dataset.from !== from) node.dataset.from = from;
      if (!node.dataset.mounted) node.style.minHeight = `${block.height}px`;
      return node;
    });
    for (const node of previous) if (!retained.has(node)) {
      this.observer.unobserve(node);
      this.resizeObserver.unobserve(node);
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
      const target = node.querySelector(`#${CSS.escape(id)}`);
      if (target) this.root.scrollTop += target.getBoundingClientRect().top - this.root.getBoundingClientRect().top - 20;
    }
  }
  destroy() {
    this.destroyed = true;
    this.observer.disconnect();
    this.resizeObserver.disconnect();
    this.nodes = [];
    this.root.replaceChildren();
  }
}
