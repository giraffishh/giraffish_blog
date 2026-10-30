import {codeLanguage} from './code-language.js';

const languageNames = {
  javascript:'JavaScript', typescript:'TypeScript', python:'Python', cpp:'C++', c:'C',
  java:'Java', json:'JSON', bash:'Bash', powershell:'PowerShell', dos:'Batch',
  sql:'SQL', yaml:'YAML', xml:'XML', css:'CSS', r:'R', http:'HTTP',
  dockerfile:'Dockerfile', plaintext:'纯文本'
};
const icons = {
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  copied:'<path d="m5 12 4 4L19 6"/>',
  error:'<path d="M12 5v8m0 4h.01"/>'
};

// Enhance the sanitized view, not the Markdown or cached HTML. Both the split
// preview and CodeMirror's rendered widgets use this, while exports stay plain.
export function enhanceCodeBlocks(root) {
  for (const code of root.querySelectorAll('pre > code')) {
    const pre = code.parentElement;
    if (pre.parentElement?.classList.contains('studio-code-block')) continue;
    const doc = pre.ownerDocument;
    const rawLanguage = [...code.classList].find(name => name.startsWith('language-'))?.slice(9) || '';
    const normalized = codeLanguage(rawLanguage);
    const language = doc.createElement('span');
    language.className = 'studio-code-language';
    language.textContent = /^(html|htm)$/i.test(rawLanguage) ? 'HTML' : languageNames[normalized] || rawLanguage || '纯文本';
    language.title = language.textContent;

    const wrapper = doc.createElement('div');
    wrapper.className = 'studio-code-block';
    const toolbar = doc.createElement('div');
    toolbar.className = 'studio-code-toolbar';
    toolbar.contentEditable = 'false';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'studio-code-copy';
    const status = doc.createElement('span');
    status.className = 'studio-code-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    function show(state, label) {
      button.dataset.state = state;
      button.title = label;
      button.setAttribute('aria-label', label);
      button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[state]}</svg>`;
    }
    show('copy', '复制代码');
    let timer;
    // Clicking the control must not select a source block or enter edit mode.
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', async event => {
      event.stopPropagation();
      clearTimeout(timer);
      button.disabled = true;
      status.textContent = '';
      try {
        await navigator.clipboard.writeText(code.textContent);
        show('copied', '已复制');
        status.textContent = '代码已复制';
      } catch {
        show('error', '复制失败，请重试或手动选择代码');
        status.textContent = '复制失败，请重试或手动选择代码';
      } finally {
        button.disabled = false;
        timer = setTimeout(() => { show('copy', '复制代码'); status.textContent = ''; }, 2000);
      }
    });
    pre.replaceWith(wrapper);
    toolbar.append(language, button, status);
    wrapper.append(toolbar, pre);
  }
}
