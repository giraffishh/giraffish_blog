import { WritingStudio, markBodySaved } from './studio.js';
import { safeImageUrl, templates } from './document.js';
import { parse } from 'yaml';
import './studio.css';

const { CMS, createClass, h } = window;
if (!CMS || !createClass || !h) throw new Error('CMS 组件未加载，请刷新后重试。');

const MarkdownControl = createClass({
  componentDidMount() {
    this.studio = new WritingStudio(this.container, {
      value: this.props.value || '', onChange: this.props.onChange,
      name: this.props.field.get('name'),
      entryKey: `${this.props.collection.get('name')}/${this.props.entry?.get('slug') || '__new__'}`,
    });
  },
  componentDidUpdate() { this.studio.setValue(this.props.value || ''); },
  componentWillUnmount() { this.studio.destroy(); },
  isValid() { this.studio.flush(); return true; },
  render() { return h('div', { ref: node => { this.container = node; } }); },
});
const ImageURLControl = createClass({
  isValid() {
    return !this.props.value || safeImageUrl(this.props.value) ? true : { error: '请输入有效的 http(s) 图片地址或 /images/ 站内路径。' };
  },
  render() {
    const value = this.props.value || '';
    const url = safeImageUrl(value);
    return h('div', { className: 'studio-image-field' },
      h('input', { id: this.props.forID, type: 'text', value, placeholder: '粘贴图床图片地址，或 /images/…',
        className: this.props.classNameWrapper, onChange: event => this.props.onChange(event.target.value) }),
      url ? h('a', { href: url.startsWith('/') ? `https://blog.giraffish.top${url}` : url, target: '_blank', rel: 'noopener noreferrer' }, '查看图片 ↗') : null,
    );
  },
});
CMS.registerWidget('studio-markdown', MarkdownControl);
CMS.registerWidget('image-url', ImageURLControl);
CMS.registerEventListener({ name: 'postSave', handler: ({ entry }) => markBodySaved(entry.getIn(['data', 'body'])) });
CMS.registerEventListener({
  name: 'preSave',
  handler: ({ entry }) => {
    if (entry.get('collection') !== 'posts') return entry.get('data');
    const now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
    return entry.get('data').set('updated', now);
  },
});
async function initialize() {
 const demo = new URLSearchParams(location.search).get('demo') === '1';
 if (demo) {
  document.body.classList.add('studio-demo');
  const notice = document.createElement('div');
  notice.className = 'studio-demo-notice';
  notice.textContent = '体验模式 · 不会保存到博客';
  document.body.append(notice);
  // Exercise the real collections and widgets; only the persistence backend
  // changes. This catches configuration issues hidden by a simplified demo.
  const response = await fetch('/admin/config.yml');
  if (!response.ok) throw new Error('无法加载后台配置');
  const config = parse(await response.text());
  config.load_config_file = false;
  config.backend = { name: 'test-repo' };
  config.local_backend = false;
  config.publish_mode = 'simple';
  const fields = config.collections.find(collection => collection.name === 'posts').fields;
  fields.find(field => field.name === 'title').default = '示例文章';
  fields.find(field => field.name === 'body').default = `${templates['折叠块']}\n## 公式示例\n\n$E=mc^2$\n\n$$\n\\mathcal{L} = \\mathbb{E}_{x} \\left[\\lVert x - \\hat{x} \\rVert^2\\right]\n$$\n\n![外链图片](https://blog.giraffish.top/img/default.png)\n`;
  CMS.init({ config });
 } else CMS.init();
 document.getElementById('studio-loading')?.remove();
}
initialize().catch(error => {
  const target = document.getElementById('studio-loading');
  if (target) target.textContent = `后台启动失败：${error.message}。请刷新后重试。`;
});
