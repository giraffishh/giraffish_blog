import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { populateRendered } from './rendered-document.js';
import { searchPanelOpen } from '@codemirror/search';
export const renderedBlocks = StateEffect.define();
export const renderMode = StateEffect.define();
export const editingBlock = StateEffect.define();
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
    populateRendered(node, this.block.html);
    for (const image of node.querySelectorAll('img')) image.addEventListener('load', () => view.requestMeasure());
    node.addEventListener('toggle', () => view.requestMeasure(), true);
    node.addEventListener('click', event => {
      const href = event.target.closest('a')?.getAttribute('href');
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
      if (event.button !== 0 || event.target.closest('a,summary,button,input')) return;
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
    if (selected) continue;
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
      decorations: Decoration.none
    };
  },
  update(value, tr) {
    const effects = tr.effects.filter(effect => effect.is(renderedBlocks) || effect.is(renderMode) || effect.is(editingBlock));
    const selectionChanged = !tr.startState.selection.eq(tr.state.selection);
    const searching = searchPanelOpen(tr.state);
    const searchChanged = searching !== value.searching;
    if (!tr.docChanged && !effects.length && !searchChanged && (!(value.editing || searching) || !selectionChanged)) return value;
    let next = {
      ...value,
      searching
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
      if (effect.is(renderedBlocks)) next.blocks = effect.value;else if (effect.is(renderMode)) {
        next.enabled = effect.value;
        next.editing = false;
      } else if (effect.is(editingBlock)) next.editing = effect.value;
    }
    if (!tr.docChanged && !selectionChanged && !searchChanged && next.enabled === value.enabled && next.editing === value.editing && next.blocks === value.blocks) return value;
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
