import { EditorSelection, Prec, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, keymap } from '@codemirror/view';
import { populateRendered } from './rendered-document.js';
import { searchPanelOpen } from '@codemirror/search';
import {cursorLineUp, cursorLineDown, selectLineUp, selectLineDown, insertNewlineAndIndent} from '@codemirror/commands';
import {ensureSyntaxTree} from '@codemirror/language';
import {insertNewlineContinueMarkupCommand} from '@codemirror/lang-markdown';
const continuePreviewMarkup = insertNewlineContinueMarkupCommand({nonTightLists:false});
export const renderedBlocks = StateEffect.define();
export const renderMode = StateEffect.define();
export const editingBlock = StateEffect.define();
const revealForNavigation = StateEffect.define();
class MarkdownBlock extends WidgetType {
  constructor(block) {
    super();
    this.block = block;
  }
  eq(other) {
    return this.block.html === other.block.html;
  }
  get estimatedHeight() {
    return this.block.height;
  }
  toDOM(view) {
    const node = document.createElement('div');
    node.className = 'studio-rendered-block studio-rendered-editable studio-typography';
    populateRendered(node, this.block.html, () => { if (view.dom.isConnected) view.requestMeasure(); }, {codeActions:true});
    node.addEventListener('toggle', () => view.requestMeasure(), true);
    node.addEventListener('click', event => {
      const href = event.composedPath()[0].closest?.('a')?.getAttribute('href');
      if (!href?.startsWith('#')) return;
      event.preventDefault();
      const id = href.slice(1);
      const block = view.state.field(livePreview).blocks.find(b => b.html.includes(`id="${id}"`));
      if (block) view.dispatch({
        effects: EditorView.scrollIntoView(block.from, {
          y: 'start'
        })
      });
    });
    node.addEventListener('mousedown', event => {
      if (event.button !== 0 || event.composedPath()[0].closest?.('a,summary,button,input,iframe')) return;
      event.preventDefault();
      const position = view.posAtDOM(node);
      view.dispatch({
        selection: {
          anchor: position
        },
        effects: editingBlock.of(true)
      });
      view.focus();
    });
    return node;
  }
  ignoreEvent() {
    return true;
  }
}
function decorations(value, state) {
  if (!value.enabled) return Decoration.none;
  const ranges = [];
  for (const block of value.blocks) {
    if (block.dirty || block.to <= block.from || block.to > state.doc.length) continue;
    const selected = state.selection.ranges.some(r =>
      (value.editing || (value.searching && !r.empty)) && r.from <= block.to && r.to >= block.from);
    if (selected || value.revealed.includes(block.from)) continue;
    ranges.push(Decoration.replace({
      widget: new MarkdownBlock(block),
      block: true,
      inclusive: false
    }).range(block.from, block.to));
  }
  return Decoration.set(ranges, true);
}
export const livePreview = StateField.define({
  create() {
    return {
      enabled: false,
      editing: false,
      searching: false,
      blocks: [],
      revealed: [],
      decorations: Decoration.none
    };
  },
  update(value, tr) {
    const effects = tr.effects.filter(effect => effect.is(renderedBlocks) || effect.is(renderMode) || effect.is(editingBlock) || effect.is(revealForNavigation));
    const selectionChanged = !tr.startState.selection.eq(tr.state.selection);
    const searching = searchPanelOpen(tr.state);
    const searchChanged = searching !== value.searching;
    if (!tr.docChanged && !effects.length && !searchChanged && (!(value.editing || searching) || !selectionChanged)) return value;
    let next = {
      ...value,
      searching,
      revealed: []
    };
    if (tr.docChanged) {
      const changes = [];
      tr.changes.iterChangedRanges((from, to) => changes.push({
        from,
        to
      }));
      next.blocks = value.blocks.map(block => {
        const dirty = block.dirty || changes.some(({
          from,
          to
        }) => from <= block.to && to >= block.from);
        return {
          ...block,
          dirty,
          from: tr.changes.mapPos(block.from, -1),
          to: tr.changes.mapPos(block.to, 1)
        };
      });
    }
    for (const effect of effects) {
      if (effect.is(revealForNavigation)) next.revealed = effect.value;else if (effect.is(renderedBlocks)) next.blocks = effect.value;else if (effect.is(renderMode)) {
        next.enabled = effect.value;
        next.editing = false;
      } else if (effect.is(editingBlock)) next.editing = effect.value;
    }
    if (!tr.docChanged && !selectionChanged && !searchChanged && next.enabled === value.enabled && next.editing === value.editing && next.blocks === value.blocks && !value.revealed.length && !next.revealed.length) return value;
    next.decorations = decorations(next, tr.state);
    return next;
  },
  provide: field => EditorView.decorations.from(field, value => value.decorations)
});
export const liveFocus = EditorView.domEventHandlers({
  focus(event, view) {
    if (event.target !== view.contentDOM) return;
    queueMicrotask(() => {
      if (view.dom.isConnected) view.dispatch({
        effects: editingBlock.of(true)
      });
    });
  },
  blur(event, view) {
    queueMicrotask(() => {
      if (view.dom.isConnected) view.dispatch({
        effects: editingBlock.of(false)
      });
    });
  }
});

// Native vertical motion skips block widgets. Expose only the adjacent target
// before asking CodeMirror to calculate the visual row and horizontal column.
export function moveRenderedLine(view, forward, extend = false) {
  const state = view.state, preview = state.field(livePreview, false);
  if (!preview?.enabled || view.composing) return false;
  const targets = new Set();
  for (const range of state.selection.ranges) {
    if (!extend && !range.empty) return false;
    const line = state.doc.lineAt(range.head);
    const number = line.number + (forward ? 1 : -1);
    if (number < 1 || number > state.doc.lines) continue;
    const boundary = view.moveToLineBoundary(range, forward, true).head;
    if (forward ? boundary < line.to : boundary > line.from) continue;
    const adjacent = state.doc.line(number);
    preview.decorations.between(adjacent.from, adjacent.to, (from, to) => {
      if (from <= adjacent.to && to >= adjacent.from) targets.add(from);
    });
  }
  if (!targets.size) return false;
  view.dispatch({effects:[revealForNavigation.of([...targets]), editingBlock.of(true)]});
  try {
    const command = extend ? (forward ? selectLineDown : selectLineUp) : (forward ? cursorLineDown : cursorLineUp);
    return command(view);
  } finally {
    if (view.state.field(livePreview).revealed.length) view.dispatch({effects:revealForNavigation.of([])});
  }
}

function withinNode(tree, position, names) {
  for (let node = tree.resolveInner(position, -1); node; node = node.parent) {
    if (names.includes(node.name)) return true;
  }
  return false;
}
function withinMathBlock(state, tree, position) {
  let delimiter = null;
  const last = state.doc.lineAt(position).number;
  for (let n = 1; n <= last; n++) {
    const line = state.doc.line(n);
    if (withinNode(tree, Math.min(line.from + 1, line.to), ['FencedCode','CodeBlock','HTMLBlock'])) continue;
    const text = state.sliceDoc(line.from, Math.min(line.to, position)).trim();
    if (delimiter) {
      if (text.endsWith(delimiter)) delimiter = null;
    } else if (text.startsWith('$$')) {
      if (text.length === 2 || !text.slice(2).trimEnd().endsWith('$$')) delimiter = '$$';
    } else if (text.startsWith('\\[')) {
      if (!text.slice(2).trimEnd().endsWith('\\]')) delimiter = '\\]';
    }
  }
  return delimiter !== null;
}
export function previewNewline(view, soft = false) {
  const state = view.state;
  if (!state.field(livePreview, false)?.enabled || state.readOnly || view.composing) return false;
  if (soft) return insertNewlineAndIndent(view);
  const tree = ensureSyntaxTree(state, state.selection.ranges.reduce((end,r)=>Math.max(end,r.to),0), 50);
  // If parsing is still catching up, prefer the existing safe Markdown behavior.
  if (!tree) return false;
  if (state.selection.ranges.some(range => withinNode(tree, range.head, ['ListItem','Blockquote']))) {
    return continuePreviewMarkup(view);
  }
  const literal = range => withinNode(tree, range.head, ['FencedCode','CodeBlock','HTMLBlock','Table']) || withinMathBlock(state, tree, range.head);
  if (state.selection.ranges.every(literal)) return insertNewlineAndIndent(view);
  const spec = state.changeByRange(range => {
    const line = state.doc.lineAt(range.from);
    // One Enter creates a new paragraph; an already blank line needs no extra separator.
    const insert = literal(range) || !line.text.trim() ? '\n' : '\n\n';
    return {changes:{from:range.from,to:range.to,insert},range:EditorSelection.cursor(range.from + insert.length)};
  });
  view.dispatch(state.update({...spec,effects:editingBlock.of(true),scrollIntoView:true,userEvent:'input'}));
  return true;
}
export const liveNavigation = Prec.high(keymap.of([
  {key:'Enter', run:view => previewNewline(view), shift:view => previewNewline(view, true)},
  {key:'ArrowUp', run:view => moveRenderedLine(view, false), shift:view => moveRenderedLine(view, false, true)},
  {key:'ArrowDown', run:view => moveRenderedLine(view, true), shift:view => moveRenderedLine(view, true, true)}
]));