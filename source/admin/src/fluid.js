// Fluid's installed tag set: themes/fluid/scripts/tags. This renderer previews
// the supported tags; it never rewrites the original Hexo source.
export function fluidTags(md) {
  const escape = md.utils.escapeHtml;
  const styles = new Set(['primary','secondary','default','success','danger','warning','info','light']);
  const style = value => styles.has(value.trim()) ? value.trim() : 'info';
  const containers = new Set(['note','fold','gi','groupimage']);
  md.block.ruler.before('fence', 'fluid_block', (state, start, end, silent) => {
    const line = n => state.src.slice(state.bMarks[n] + state.tShift[n], state.eMarks[n]);
    const open = line(start).match(/^\{%\s*(note|fold|gi|groupimage)\b(.*?)%\}\s*$/);
    if (!open) return false;
    let stop = start + 1;
    const stack = [open[1]];
    let fence = null;
    for (; stop < end; stop++) {
      const text = line(stop);
      const marker = text.match(/^\s*(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
        continue;
      }
      if (fence) continue;
      const tag = text.match(/^\{%\s*(end)?(note|fold|gi|groupimage)\b.*?%\}\s*$/);
      if (!tag) continue;
      if (!tag[1] && containers.has(tag[2])) stack.push(tag[2]);
      else if (tag[1] && tag[2] === stack.at(-1)) stack.pop();
      if (!stack.length) break;
    }
    if (stack.length) return false;
    if (silent) return true;
    const token = state.push('fluid_block', '', 0);
    token.block = true;
    token.map = [start, stop + 1];
    token.content = state.getLines(start + 1, stop, state.blkIndent, false);
    token.meta = { kind:open[1], args:open[2].trim(), contentLine:start + 1 };
    state.line = stop + 1;
    return true;
  }, { alt: ['paragraph','reference','blockquote','list'] });
  md.renderer.rules.fluid_block = (tokens, i, options, env) => {
    const token = tokens[i];
    const {kind,args} = token.meta;
    const content = md.render(token.content, env);
    if (kind === 'note') return `<div class="note note-${style(args)}">${content}</div>`;
    if (kind === 'fold') {
      const at = args.indexOf('@');
      return `<details class="fluid-fold note-${style(at < 0 ? args : args.slice(0,at))}"><summary>${escape(at < 0 ? '展开' : args.slice(at+1).trim())}</summary><div>${content}</div></details>`;
    }
    const images = content.match(/<img\b[^>]*>/gi) || [];
    const [total,layout] = args.split(/\s+/);
    let sizes = (layout || '').split('-').map(Number);
    if (sizes.some(n=>!Number.isInteger(n)||n<1||n>10) || sizes.reduce((a,b)=>a+b,0)!==Number(total) || Number(total)!==images.length) {
      const defaults = {2:[1,1],3:[2,1],4:[2,2],5:[3,2],6:[3,3],7:[3,2,2],8:[3,2,3],9:[3,3,3],10:[3,2,2,3]};
      sizes = defaults[images.length] || Array.from({length:Math.ceil(images.length/3)},(_,j)=>Math.min(3,images.length-j*3));
    }
    let offset = 0;
    return `<div class="fluid-gallery">${sizes.map(size=>{
      const row=images.slice(offset,offset+size); offset+=size;
      return `<div class="fluid-gallery-row">${row.map(img=>`<div>${img}</div>`).join('')}</div>`;
    }).join('')}</div>`;
  };
  md.inline.ruler.before('emphasis', 'fluid_inline', (state, silent) => {
    if (!state.src.startsWith('{%',state.pos)) return false;
    const match=state.src.slice(state.pos).match(/^\{%\s*(label|btn|button|cb|checkbox)\s+([^\n]*?)%\}/);
    if (!match) return false;
    if (!silent) {
      const token=state.push('fluid_inline','',0);
      token.meta={kind:match[1],args:match[2].trim()};
    }
    state.pos+=match[0].length;
    return true;
  });
  md.renderer.rules.fluid_inline=(tokens,i)=>{
    const {kind,args}=tokens[i].meta;
    if (kind==='label') {
      const at=args.indexOf('@');
      return `<span class="fluid-label note-${style(args.slice(0,at))}">${escape(at<0?args:args.slice(at+1).trim())}</span>`;
    }
    const parts=args.split(',').map(x=>x.trim());
    if (kind==='btn'||kind==='button') {
      const url=md.validateLink(parts[0])?md.normalizeLink(parts[0]):'#';
      return `<a class="fluid-button" href="${escape(url)}" title="${escape(parts[2]||'')}">${escape(parts[1]||'链接')}</a>`;
    }
    const checked = ['true','checked'].includes(parts[0]) || (parts[1] && parts[1]!=='false');
    const text = ['true','false','checked'].includes(parts[0])?'':parts[0];
    return `<span class="fluid-checkbox" role="checkbox" aria-checked="${Boolean(checked)}">${checked?'☑':'☐'} ${escape(text)}</span>`;
  };
}

export const fluidTemplates = {
  '折叠块': '{% fold info @展开查看 %}\n\n折叠内容\n\n{% endfold %}\n',
  '提示便签': '{% note info %}\n提示内容\n{% endnote %}\n',
  '成功便签': '{% note success %}\n提示内容\n{% endnote %}\n',
  '警告便签': '{% note warning %}\n注意事项\n{% endnote %}\n',
  '行内标签': '{% label primary @标签文字 %}',
  '按钮链接': '{% btn https://example.com, 按钮文字, 提示文字 %}',
  '勾选框': '{% cb 待办事项, false, false, false %}',
  '组图': '{% gi 2 2 %}\n![图片一](https://blog.giraffish.top/img/default.png)\n![图片二](https://blog.giraffish.top/img/default.png)\n{% endgi %}\n',
};
