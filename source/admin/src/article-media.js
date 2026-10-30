import {element as node, button, compactAction} from './studio-ui.js';
import { mediaCatalog, filterMedia } from './media-catalog.js';
import {createImageThumbnail, imageMarkdown} from './images.js';
import { MediaSizeLoader, NativeMediaSizes, showFileSize } from './media-size.js';
import './article-media.css';
import { requestArticleRecord } from './analysis-client.js';
const maxPageSize = 48;
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const formatDate = time => Number.isFinite(time) ? dateFormatter.format(time) : '日期未知';
export class ArticleMediaStore {
  constructor() {
    this.saved = new Map();
    this.listeners = new Set();
    this.articles = [];
    this.items = [];
    this.loaded = false;
    this.sizeCache = new Map();
    this.files = [];
    this.fileSizes = new Map();
    this.fileNames = new Map();
  }
  rebuild() {
    const articles = new Map(this.articles.map(article => [article.id, article]));
    for (const [id, article] of this.saved) {
      if (article) articles.set(id, article);else articles.delete(id);
    }
    this.current = [...articles.values()];
    this.items = mediaCatalog(this.current);
    for (const listener of this.listeners) listener();
  }
  async load(force = false) {
    if (this.pending) return this.pending;
    if (this.loaded && !force) return;
    this.pending = (async () => {
      const response = await fetch('/admin/assets/article-media.json', {
        cache: 'no-cache',
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error('图片索引暂时无法加载');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.articles) || data.articles.some(article => typeof article.id !== 'string' || typeof article.title !== 'string' || !Array.isArray(article.images))) throw new Error('图片索引格式不正确');
      this.articles = data.articles;
      this.files = Array.isArray(data.files) ? data.files : [];
      this.fileNames = new Map();
      for (const file of this.files) for (const name of new Set([file.name,file.name.split('/').pop()])) {
        if (!this.fileNames.has(name)) this.fileNames.set(name,file.bytes);
        else this.fileNames.set(name,undefined); // Ambiguous basenames need the exact URL.
      }
      this.fileSizes = new Map(this.files.map(file => [new URL(file.path, 'https://blog.giraffish.top').href, file.bytes]));
      if (force) this.sizeCache.clear();
      this.generatedAt = data.generatedAt;
      this.loaded = true;
      this.rebuild();
    })();
    try {
      await this.pending;
    } finally {
      this.pending = null;
    }
  }
  async savedEntry(entry) {
    if (entry.get('collection') !== 'posts') return;
    const data = entry.get('data').toJS();
    const path = entry.get('path');
    const id = path?.startsWith('source/_posts/') ? path.slice('source/_posts/'.length).replace(/\.md$/i, '') : entry.get('slug');
    if (!id) return;
    const revision = {};
    this.revisions ??= new Map();
    this.revisions.set(id, revision);
    const record = data.published === false || data.draft === true ? null : await requestArticleRecord(id, data);
    if (this.revisions.get(id) !== revision) return;
    this.revisions.delete(id);
    this.saved.set(id, record);
    this.rebuild();
  }
}
export class ArticleMediaPanel {
  constructor(modal, store, filters = {
    sort: 'recent'
  }) {
    this.modal = modal;
    this.store = store;
    this.filters = filters;
    this.page = 0;
    this.pageSize = maxPageSize;
    this.thumbnailCache = new Map();
    this.pendingThumbnails = new Map();
    this.sizeLoader = new MediaSizeLoader(store.sizeCache);
    this.top = modal.querySelector('[class*="LibraryTop"]');
    this.tabs = node('nav', 'studio-media-tabs');
    this.tabs.setAttribute('role', 'tablist');
    this.tabs.setAttribute('aria-label', '媒体来源');
    this.articleTab = button('文章图片', () => this.setMode('articles'));
    this.fileTab = button('上传文件', () => this.setMode('files'));
    for (const tab of [this.articleTab, this.fileTab]) tab.setAttribute('role', 'tab');
    this.tabs.append(this.articleTab, this.fileTab);
    this.top.append(this.tabs);
    this.panel = node('section', 'studio-article-media');
    this.panel.setAttribute('role', 'tabpanel');
    this.panel.setAttribute('aria-label', '文章图片');
    this.build();
    this.thumbnailObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) this.mountThumbnail(entry.target);
    }, {root:this.scroller, rootMargin:'160px 0px'}) : null;
    this.modal.append(this.panel);
    this.nativeSizes = new NativeMediaSizes(modal,store,this.sizeLoader);
    this.gridResize = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (!width || width === this.gridWidth) return;
      this.gridWidth = width;
      cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = requestAnimationFrame(() => {
        if (!this.destroyed && this.mode === 'articles' && this.readPageSize() !== this.pageSize) this.render();
      });
    });
    this.gridResize.observe(this.grid);
    this.onChange = () => {
      this.updateOptions();
      this.optionsReady = true;
      this.render();
      this.nativeSizes.schedule();
    };
    store.listeners.add(this.onChange);
    this.setMode('articles');
    this.load();
  }
  build() {
    const controls = node('div', 'studio-media-controls');
    this.filterFields = node('div', 'studio-media-filter-fields');
    this.filterFields.id = 'studio-media-filter-fields';
    this.filterToggle = compactAction(button('筛选', () => this.toggleFilters()), 'filter');
    this.filterToggle.classList.add('studio-media-filter-toggle');
    this.filterToggle.setAttribute('aria-controls', this.filterFields.id);
    this.filterToggle.setAttribute('aria-expanded', 'false');
    // Reuse Decap's controlled input without moving it out of its React tree.
    this.search = this.top.querySelector('[class*="SearchContainer"] input');
    this.searchAttributes = Object.fromEntries(['role', 'placeholder', 'aria-label', 'disabled'].map(name => [name, this.search.getAttribute(name)]));
    this.search.setAttribute('role', 'searchbox');
    this.search.setAttribute('aria-label', '搜索媒体');
    this.syncSearch = () => {
      if (this.search.disabled) this.search.disabled = false;
      if (this.search.placeholder !== '搜索媒体…') this.search.placeholder = '搜索媒体…';
    };
    this.syncSearch();
    this.searchObserver = new MutationObserver(this.syncSearch);
    this.searchObserver.observe(this.search, {attributes:true, attributeFilter:['disabled','placeholder']});
    this.searchInput = () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.filters.query = this.search.value;
        this.page = 0;
        if (this.mode === 'articles') this.render();
      }, 120);
    };
    this.search.addEventListener('input', this.searchInput);
    if (this.filters.query && this.search.value !== this.filters.query) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(this.search, this.filters.query);
      this.search.dispatchEvent(new Event('input', {bubbles:true}));
    }
    this.selects = {};
    const select = (key, label, options) => {
      const field = node('label', 'studio-media-filter');
      field.append(node('span', '', label));
      const input = node('select');
      input.setAttribute('aria-label', label);
      input.addEventListener('change', () => {
        this.filters[key] = input.value;
        this.page = 0;
        this.render();
      });
      field.append(input);
      this.selects[key] = input;
      this.options(key, options);
      return field;
    };
    const refresh = compactAction(button('刷新', () => this.load(true)), 'refresh');
    refresh.classList.add('studio-media-refresh');
    this.refresh = refresh;
    const sorting = select('sort', '排序', [['recent', '时间 ↓'], ['oldest', '时间 ↑'], ['most', '次数 ↓'], ['least', '次数 ↑']]);
    sorting.classList.add('studio-media-sort');
    this.selects.sort.title = '↓ 降序，↑ 升序；时间按引用文章的更新／发布日期统计';
    this.filterFields.append(select('source', '来源', [['', '全部来源'], ['external', '外链图片'], ['site', '站内图片']]), select('domain', '域名', [['', '全部域名']]), select('article', '文章', [['', '全部文章']]), select('format', '格式', [['', '全部格式']]));
    const filterActions = node('div', 'studio-media-filter-actions');
    filterActions.append(button('重置', () => {
      for (const key of ['source', 'domain', 'article', 'format']) {
        this.filters[key] = this.selects[key].value = '';
      }
      this.page = 0;
      this.render();
    }), button('完成', () => {
      this.toggleFilters(false);
      this.filterToggle.focus();
    }));
    this.filterFields.append(filterActions);
    this.filterFields.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !window.matchMedia('(max-width:760px)').matches) return;
      event.preventDefault();
      event.stopPropagation();
      this.toggleFilters(false);
      this.filterToggle.focus();
    });
    controls.append(this.filterToggle, this.filterFields, sorting, refresh);
    this.summary = node('div', 'studio-media-summary');
    this.summary.setAttribute('role', 'status');
    this.info = node('div', 'studio-media-info');
    this.info.append(this.summary);
    this.scroller = node('div', 'studio-media-scroll');
    this.grid = node('div', 'studio-media-grid');
    this.scroller.append(this.grid);
    this.pager = node('div', 'studio-media-pager');
    this.previous = button('上一页', () => {
      this.page--;
      this.render();
    });
    this.next = button('下一页', () => {
      this.page++;
      this.render();
    });
    this.pageText = node('span');
    this.pager.append(this.previous, this.pageText, this.next);
    this.message = node('div', 'studio-media-message');
    this.message.setAttribute('role', 'status');
    this.panel.append(controls, this.info, this.scroller, this.pager, this.message);
  }
  toggleFilters(open = this.filterToggle.getAttribute('aria-expanded') !== 'true') {
    this.filterToggle.setAttribute('aria-expanded', String(open));
    this.filterFields.classList.toggle('is-open', open);
  }
  options(key, options) {
    const select = this.selects[key];
    const current = this.filters[key] || '';
    select.replaceChildren(...options.map(([value, label]) => {
      const option = node('option', '', label);
      option.value = value;
      return option;
    }));
    select.value = options.some(([value]) => value === current) ? current : options[0][0];
    this.filters[key] = select.value;
  }
  updateOptions() {
    const items = this.store.items;
    this.options('domain', [['', '全部域名'], ...[...new Set(items.map(image => image.domain))].sort().map(value => [value, value])]);
    this.options('format', [['', '全部格式'], ...[...new Set(items.map(image => image.format))].sort().map(value => [value, value.toUpperCase()])]);
    const articles = (this.store.current || []).filter(article => article.images.length);
    const titles = new Map();
    for (const article of articles) titles.set(article.title, (titles.get(article.title) || 0) + 1);
    this.options('article', [['', '全部文章'], ...articles.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN')).map(article => [article.id, titles.get(article.title) > 1 ? `${article.title} · ${article.id}` : article.title])]);
  }
  setMode(mode) {
    clearTimeout(this.searchTimer);
    if (this.filters.query !== this.search.value) this.page = 0;
    this.filters.query = this.search.value;
    this.mode = mode;
    this.modal.dataset.studioMedia = mode;
    this.panel.hidden = mode !== 'articles';
    this.articleTab.setAttribute('aria-selected', String(mode === 'articles'));
    this.fileTab.setAttribute('aria-selected', String(mode === 'files'));
    if (mode === 'articles' && this.optionsReady) this.render();
    if (mode === 'files') this.nativeSizes.schedule();
  }
  async load(force = false) {
    this.refresh.disabled = true;
    this.message.textContent = '';
    if (!this.store.loaded) this.summary.textContent = '正在读取文章图片…';
    try {
      await this.store.load(force);
      if (!this.destroyed && !this.grid.childElementCount) this.onChange();
    } catch (error) {
      if (!this.destroyed) {
        this.summary.textContent = this.store.loaded ? this.summary.textContent : '未能加载文章图片';
        this.message.textContent = `${error.message}，请点击刷新重试。`;
      }
    } finally {
      if (!this.destroyed) this.refresh.disabled = false;
    }
  }
  async copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      this.message.textContent = '已复制';
    } catch {
      this.message.textContent = '复制未获允许，可通过原图链接复制地址。';
    }
  }
  mountThumbnail(host) {
    if (this.destroyed || !host.isConnected) return;
    const image = this.pendingThumbnails.get(host);
    if (!image) return;
    this.pendingThumbnails.delete(host);
    this.thumbnailObserver?.unobserve(host);
    const key = JSON.stringify([image.url, image.label]);
    const preview = this.thumbnailCache.get(key) || createImageThumbnail(image.url, image.label);
    this.thumbnailCache.delete(key);
    this.thumbnailCache.set(key, preview);
    // Retain at most one page of thumbnails, rather than every image ever viewed.
    if (this.thumbnailCache.size > maxPageSize) this.thumbnailCache.delete(this.thumbnailCache.keys().next().value);
    host.replaceChildren(preview);
    this.sizeLoader.get(image.url, this.store.fileSizes.get(image.url)).then(bytes => {
      if (!this.destroyed && image.size.isConnected) showFileSize(image.size,bytes);
    });
  }
  card(image) {
    const card = node('article', 'studio-media-card');
    const label = image.fields?.length ? image.fields.join(' / ') : image.alt || image.name;
    const thumbnail = node('div', 'studio-media-thumbnail');
    card.append(thumbnail);
    const content = node('div', 'studio-media-card-content');
    const title = node('h2', '', label);
    title.title = label;
    const domain = node('div', 'studio-media-domain', image.domain);
    domain.title = image.url;
    const size = node('span', 'studio-media-size', '—');
    size.title = '图片进入可见区域后读取文件大小';
    const fileMeta = node('div', 'studio-media-file-meta');
    fileMeta.append(domain,size);
    this.pendingThumbnails.set(thumbnail, {url:image.url, label, size});
    const stats = node('div', 'studio-media-stats', `${image.count} 次 · ${image.uses.length} 篇文章`);
    const date = node('div', 'studio-media-muted', `文章时间 ${formatDate(image.time)}`);
    const actions = node('div', 'studio-media-card-actions');
    const original = node('a', '', '原图');
    original.href = image.url;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    actions.append(compactAction(button('复制地址', () => this.copy(image.url)), 'copy'), compactAction(button('复制 Markdown', () => this.copy(imageMarkdown(image.url, image.alt))), 'markdown'), compactAction(original, 'external', '查看原图'));
    const refs = node('details', 'studio-media-references');
    refs.append(node('summary', '', '引用文章'));
    const list = node('ul');
    for (const use of image.uses) {
      const item = node('li');
      const link = node('a', '', use.title);
      link.href = use.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link, node('span', 'studio-media-muted', `${use.count} 次 · ${formatDate(use.time)}`));
      list.append(item);
    }
    refs.append(list);
    content.append(title, fileMeta, stats, date, actions, refs);
    card.append(content);
    return card;
  }
  readPageSize() {
    if (!this.grid.clientWidth) return this.pageSize;
    const tracks = getComputedStyle(this.grid).gridTemplateColumns.trim();
    if (!/^(?:[\d.]+px\s*)+$/.test(tracks)) return this.pageSize;
    const columns = tracks.split(/\s+/).length;
    return Math.max(columns, Math.floor(maxPageSize / columns) * columns);
  }
  render() {
    if (!this.store.loaded && !this.store.items.length) return;
    const filterCount = ['source', 'domain', 'article', 'format'].filter(key => this.filters[key]).length;
    this.filterToggle.querySelector('.studio-action-label').textContent = filterCount ? `筛选 · ${filterCount}` : '筛选';
    this.filterToggle.setAttribute('aria-label', filterCount ? `筛选，已启用 ${filterCount} 项` : '筛选');
    this.filterToggle.classList.toggle('has-filters', filterCount > 0);
    const pageSize = this.readPageSize();
    if (pageSize !== this.pageSize) {
      // Keep the old page's first item on the new page when column count changes.
      this.page = Math.floor(this.page * this.pageSize / pageSize);
      this.pageSize = pageSize;
    }
    const query = JSON.stringify(this.filters);
    if (this.resultSource !== this.store.items || this.resultQuery !== query) {
      this.resultSource = this.store.items;
      this.resultQuery = query;
      this.results = filterMedia(this.store.items, this.filters);
      this.resultCount = this.results.reduce((sum,image) => sum + image.count,0);
    }
    const items = this.results;
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    this.page = Math.max(0, Math.min(this.page, pages - 1));
    this.summary.textContent = `${items.length} 张图片 · ${this.resultCount} 次引用`;
    this.thumbnailObserver?.disconnect();
    this.pendingThumbnails.clear();
    this.grid.replaceChildren(...items.slice(this.page * pageSize, (this.page + 1) * pageSize).map(image => this.card(image)));
    if (!items.length) this.grid.append(node('p', 'studio-media-empty', '没有符合筛选条件的图片'));
    this.scroller.scrollTop = 0;
    for (const host of this.pendingThumbnails.keys()) {
      if (this.thumbnailObserver) this.thumbnailObserver.observe(host);
      else this.mountThumbnail(host);
    }
    this.previous.disabled = this.page === 0;
    this.next.disabled = this.page === pages - 1;
    this.pager.hidden = pages === 1;
    this.pageText.textContent = `${this.page + 1} / ${pages}`;
    this.message.textContent = '';
  }
  destroy() {
    this.destroyed = true;
    this.sizeLoader.destroy();
    this.nativeSizes.destroy();
    this.gridResize.disconnect();
    cancelAnimationFrame(this.layoutFrame);
    clearTimeout(this.searchTimer);
    this.searchObserver.disconnect();
    this.search.removeEventListener('input', this.searchInput);
    for (const [name, value] of Object.entries(this.searchAttributes)) {
      if (value === null) this.search.removeAttribute(name);
      else this.search.setAttribute(name, value);
    }
    this.thumbnailObserver?.disconnect();
    this.pendingThumbnails.clear();
    this.thumbnailCache.clear();
    this.store.listeners.delete(this.onChange);
    this.tabs.remove();
    this.panel.remove();
    delete this.modal.dataset.studioMedia;
  }
}
export function installArticleMedia(CMS) {
  const store = new ArticleMediaStore();
  const filters = {
    sort: 'recent'
  };
  let active, frame;
  CMS.registerEventListener({
    name: 'postSave',
    handler: ({
      entry
    }) => {
      store.savedEntry(entry).catch(error => console.warn('文章图片索引更新失败', error));
    }
  });
  const scan = () => {
    frame = 0;
    if (active && !active.modal.isConnected) {
      active.destroy();
      active = null;
    }
    if (active) return;
    const modal = [...document.querySelectorAll('[role="dialog"]')].find(element => element.querySelector('[class*="LibraryTop"]'));
    if (modal) active = new ArticleMediaPanel(modal, store, filters);
  };
  const observer = new MutationObserver(records => {
    if (frame) return;
    const changed = records.some(record => {
      if (record.target.nodeType === 1 && record.target.closest('.writing-studio,.studio-article-media')) return false;
      return [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('[role="dialog"]') || node.querySelector('[role="dialog"]')));
    });
    if (changed) frame = requestAnimationFrame(scan);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  scan();
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    active?.destroy();
  };
}
