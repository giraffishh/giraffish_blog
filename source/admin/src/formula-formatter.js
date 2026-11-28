import {Annotation, EditorState} from '@codemirror/state';
import {isolateHistory} from '@codemirror/commands';
import {markdownLanguage} from '@codemirror/lang-markdown';
import {element, button} from './studio-ui.js';

// Preview invalidation only needs the user's original edits. The appended
// delimiter replacements still participate in selection mapping and history.
export const editsBeforeFormulaFormatting = Annotation.define();

const delimiters = {
  dollar: [['$', '$'], ['$$', '$$']],
  tex: [['\\(', '\\)'], ['\\[', '\\]']]
};
const literalNodes = new Set(['FencedCode', 'CodeBlock', 'InlineCode', 'HTMLBlock', 'HTMLTag', 'Comment', 'URL', 'LinkTitle', 'Autolink']);

function protectedRanges(text) {
  const ranges = [];
  markdownLanguage.parser.parse(text).iterate({enter(node) {
    if (literalNodes.has(node.name)) {
      ranges.push({from:node.from, to:node.to});
      return false;
    }
  }});
  return ranges;
}

// Scan the whole document even for a selection: a selected closing delimiter
// may belong to a formula whose opening delimiter lies outside the selection.
export function formulaChanges(text, target, selections = []) {
  const changes = [];
  if (!delimiters[target] || !(target === 'tex' ? text.includes('$') : /\\[([]/.test(text))) return changes;
  const protectedText = protectedRanges(text);
  const ranges = selections.filter(range => !range.empty);
  const tokens = /\\[()[\]\\$]|\$\$?|\n[ \t]*\n/g;
  let protectedIndex = 0;
  let open = null;
  let match;
  while ((match = tokens.exec(text))) {
    const at = match.index;
    let token = match[0];
    // Between adjacent inline formulas the first dollar closes the current
    // formula. Leave the second for the next scan (e.g. $x$$y$).
    if (open?.token === '$' && token === '$$' && !/\s/.test(text[at - 1])) {
      token = '$';
      tokens.lastIndex = at + 1;
    }
    while (protectedIndex < protectedText.length && protectedText[protectedIndex].to <= at) {
      if (open && protectedText[protectedIndex].from > open.at) open = null;
      protectedIndex++;
    }
    if (protectedText[protectedIndex]?.from <= at) { open = null; continue; }
    if (token.startsWith('\n')) { if (!open?.display) open = null; continue; }
    if (token === '\\\\' || token === '\\$') continue;

    if (open && token === open.close) {
      const end = at + token.length;
      const canClose = token !== '$' || (!/\s/.test(text[at-1]) && !/\d/.test(text[end] || ''));
      if (canClose && at > open.at + open.token.length) {
        if (open.style !== target && (!ranges.length || ranges.some(range => range.from <= open.at && end <= range.to))) {
          const [left, right] = delimiters[target][Number(open.display)];
          let bodyStart = open.at + open.token.length, bodyEnd = at;
          if (target === 'dollar' && !open.display) {
            while (bodyStart < bodyEnd && /[ \t]/.test(text[bodyStart])) bodyStart++;
            while (bodyEnd > bodyStart && /[ \t]/.test(text[bodyEnd-1])) bodyEnd--;
          }
          if (bodyStart < bodyEnd) changes.push({from:open.at,to:bodyStart,insert:left}, {from:bodyEnd,to:end,insert:right});
        }
        open = null;
        continue;
      }
      open = null;
    }
    // An unmatched price marker must not hide the next TeX formula.
    if (open?.token === '$' && (token === '\\(' || token === '\\[' || token === '$$')) open = null;
    if (open) continue;
    if (token === '\\(' || token === '\\[') {
      open = {at, token, close:token === '\\(' ? '\\)' : '\\]', style:'tex', display:token === '\\['};
    } else if (token === '$$' || (token === '$' && !/\s/.test(text[at+1] || ' '))) {
      open = {at, token, close:token, style:'dollar', display:token === '$$'};
    }
  }
  return changes;
}

export class FormulaFormatter {
  mode = 'off';
  extension = EditorState.transactionFilter.of(tr => {
    if (this.mode === 'off' || !tr.docChanged || tr.isUserEvent('undo') || tr.isUserEvent('redo') ||
        tr.isUserEvent('input.formula') || tr.startState.readOnly) return tr;
    const changes = formulaChanges(tr.newDoc.toString(), this.mode);
    return changes.length ? [tr, {changes, sequential:true, annotations:editsBeforeFormulaFormatting.of(tr.changes)}] : tr;
  });

  convert(view, target, selectedOnly) {
    if (view.state.readOnly) return;
    const changes = formulaChanges(view.state.doc.toString(), target, selectedOnly ? view.state.selection.ranges : []);
    if (changes.length) view.dispatch({changes, userEvent:'input.formula', annotations:[isolateHistory.of('full'), editsBeforeFormulaFormatting.of(view.state.changes([]))]});
  }

  panel(view, groupName) {
    const panel = element('section', 'studio-formula-tools');
    const actions = element('div', 'studio-formula-actions');
    const formats = [['dollar', '$ / $$'], ['tex', '\\( \\) / \\[ \\]']];
    for (const [mode, label] of formats) {
      actions.append(button('转为 ' + label, () => this.convert(view, mode, true)));
    }
    const slider = element('div', 'studio-segmented studio-formula-slider');
    slider.setAttribute('role','radiogroup');
    slider.setAttribute('aria-label','自动格式化');
    slider.dataset.mode = this.mode;
    for (const [mode, label] of [['off','关闭'], ...formats]) {
      const option = element('label'), input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = mode;
      input.checked = this.mode === mode;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        this.mode = slider.dataset.mode = mode;
        if (mode !== 'off') this.convert(view, mode, false);
      });
      option.append(input, element('span','',label));
      slider.append(option);
    }
    panel.append(element('span','studio-template-name','公式格式化'), actions, element('span','','自动格式化'), slider);
    return panel;
  }
}
