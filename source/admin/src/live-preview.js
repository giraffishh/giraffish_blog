import { EditorSelection, Prec, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, keymap, ViewPlugin } from '@codemirror/view';
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
export const previewPointer = StateEffect.define();
const pointerSessions = new WeakMap();
function measurePreviewBlock(view,node) {
  const from=view.posAtDOM(node),block=blockAt(view.state.field(livePreview).blocks,from);
  const child=node.firstElementChild;
  // Headings use shared CSS. Only ordinary single-line paragraphs need a
  // measured minimum height when inline media changes their rendered height.
  if(!block || child?.tagName!=='P' || node.children.length!==1 ||
    view.state.doc.lineAt(from).number!==view.state.doc.lineAt(block.to).number) return null;
  const style=getComputedStyle(child);
  return {from,to:block.to,style:`box-sizing:border-box;min-height:${node.getBoundingClientRect().height}px;font-size:${style.fontSize};font-weight:${style.fontWeight};line-height:${style.lineHeight};padding-top:${style.marginTop};padding-bottom:${style.marginBottom}`};
}
// Heading presentation follows the Markdown, not a transient clicked DOM node.
export function previewHeading(state,block) {
  const line=state.doc.lineAt(block.from);
  const marker=line.text.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)/);
  if (!marker || (!block.dirty && !/^<h[1-6]\b/.test(block.html))) return null;
  const suffix=line.text.slice(marker[0].length).match(/[ \t]+#+[ \t]*$/)?.[0] || '';
  return {level:marker[1].length,from:line.from,to:line.to,
    contentFrom:line.from+marker[0].length,contentTo:line.to-suffix.length};
}
export function copyPreviewMarkdown(text,state) {
  const preview=state.field(livePreview,false);
  if (!preview?.enabled || state.selection.ranges.every(range=>range.empty)) return text;
  return state.selection.ranges.map(range=>{
    let {from,to}=range;
    for(const block of preview.blocks) {
      if(block.to<from || block.from>to) continue;
      const heading=previewHeading(state,block);
      if(heading && from<=heading.contentFrom && to>=heading.contentTo && heading.contentTo>heading.contentFrom) {
        from=Math.min(from,heading.from);to=Math.max(to,heading.to);
      }
    }
    return state.sliceDoc(from,to);
  }).join(state.lineBreak);
}
// Text maps are immutable for the lifetime of a rendered widget. Build the
// decoded source boundaries once, then share them for hit testing and painting.
const textMaps = new WeakMap();
const ignoredText = '.studio-code-toolbar, .studio-heading-syntax, .katex-mathml, script, style';
function decodePreviewEntity(value) {
  const element=document.createElement('textarea');
  element.innerHTML=value;
  return element.value;
}
function lowerBound(values,position) {
  let low=0,high=values.length;
  while(low<high) {const mid=(low+high)>>>1;if(values[mid]<position) low=mid+1;else high=mid;}
  return low;
}
export function createRenderedTextMap(source,texts,decodeEntity=decodePreviewEntity) {
  const normalize=text=>text.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\u00a0/g,' ');
  let normalized='';
  const boundaries=[0];
  const literalOnly=texts.every(entry=>typeof entry!=='string' && entry.literal);
  for(const part of source.matchAll(/\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]|&(?:#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);|[\s\S]/gi)) {
    const raw=part[0];
    const text=literalOnly ? raw : normalize(raw.length>1 && raw[0]==='\\' ? raw.slice(1) : raw.length>1 && raw[0]==='&' ? decodeEntity(raw) : raw);
    normalized+=text;
    for(let i=0;i<text.length;i++) boundaries.push(literalOnly ? part.index+i+1 : i===text.length-1 ? part.index+raw.length : part.index);
  }
  let cursor=0;
  const segments=texts.map(entry=>{
    const {text,literal=false}=typeof entry==='string' ? {text:entry} : entry;
    const at=literal ? source.indexOf(text,cursor) : normalized.indexOf(normalize(text),lowerBound(boundaries,cursor));
    if(at<0 || (!literal && !text.trim())) return [cursor];
    const offsets=literal ? Array.from({length:text.length+1},(_,i)=>at+i) : boundaries.slice(at,at+text.length+1);
    cursor=offsets.at(-1);
    return offsets;
  });
  return {
    sourceOffset(index,offset) {
      const segment=segments[index];
      return segment ? segment[Math.max(0,Math.min(segment.length-1,offset))] : 0;
    },
    textPoint(position) {
      for(let index=0;index<segments.length;index++) {
        const segment=segments[index];
        if(segment.length>1 && position>=segment[0] && position<=segment.at(-1)) {
          return {index,offset:Math.min(segment.length-1,lowerBound(segment,position))};
        }
      }
      return null;
    }
  };
}
function widgetTextNodes(widget) {
  const nodes=[],walker=widget.ownerDocument.createTreeWalker(widget,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()) {
    const node=walker.currentNode;
    if((node.textContent.trim() || node.parentElement.closest('code')) && !node.parentElement.closest(ignoredText)) nodes.push(node);
  }
  return nodes;
}
function blockAt(blocks,position) {
  let low=0,high=blocks.length;
  while(low<high) {const mid=(low+high)>>>1;if(blocks[mid].from<=position) low=mid+1;else high=mid;}
  const block=blocks[low-1];
  return block && position<=block.to ? block : null;
}
function widgetTextMap(view,widget) {
  const from=view.posAtDOM(widget),block=blockAt(view.state.field(livePreview).blocks,from);
  if(!block || block.from!==from) return null;
  let cached=textMaps.get(widget);
  if(cached?.block===block) return cached;
  const hitNodes=widgetTextNodes(widget);
  const nodes=hitNodes.filter(node=>!node.parentElement.closest('.katex'));
  const map=createRenderedTextMap(view.state.sliceDoc(block.from,block.to),nodes.map(node=>({text:node.textContent,literal:!!node.parentElement.closest('code')})));
  cached={block,nodes,hitNodes,map};textMaps.set(widget,cached);
  return cached;
}
function textPointAt(widget,x,y,nodes=widgetTextNodes(widget)) {
  const range=widget.ownerDocument.createRange();
  let best=null, distance=Infinity;
  for(const node of nodes) {
    range.selectNodeContents(node);
    for(const rect of range.getClientRects()) {
      const gap=Math.max(rect.top-y,0,y-rect.bottom)*10000 + Math.max(rect.left-x,0,x-rect.right);
      if(gap<distance) {distance=gap;best=node;}
    }
  }
  if(!best) return {node:widget,offset:0};
  let low=0, high=best.length;
  while(low<high) {
    const mid=(low+high)>>>1;
    range.setStart(best,mid);range.setEnd(best,mid+1);
    const rect=range.getBoundingClientRect();
    if(y>rect.bottom || (y>=rect.top && x>(rect.left+rect.right)/2)) low=mid+1;
    else high=mid;
  }
  return {node:best,offset:low};
}
function pointerPoint(view,event) {
  const doc = view.dom.ownerDocument, rect = view.scrollDOM.getBoundingClientRect();
  const x = Math.max(rect.left+1,Math.min(rect.right-16,event.clientX));
  const y = Math.max(rect.top+1,Math.min(rect.bottom-1,event.clientY));
  const hit=doc.elementFromPoint(x,y);
  const headingLine=hit?.closest('.studio-preview-heading');
  if(headingLine && !hit.closest('.studio-heading-syntax')) {
    const point=textPointAt(headingLine,x,y);
    return {...point,pos:view.posAtDOM(point.node,point.offset)};
  }
  const widget = hit?.closest('.studio-rendered-editable');
  if (widget && view.contentDOM.contains(widget)) {
    const cached=widgetTextMap(view,widget),point=textPointAt(widget,x,y,cached?.hitNodes);
    const from=cached?.block.from ?? view.posAtDOM(widget),index=cached?.nodes.indexOf(point.node) ?? -1;
    const pos=index>=0 ? from+cached.map.sourceOffset(index,point.offset)
      : (y<widget.getBoundingClientRect().top+widget.getBoundingClientRect().height/2 ? from : cached?.block.to ?? from);
    return {...point,pos};
  }
  const caret = doc.caretPositionFromPoint?.(x,y);
  const range = !caret && doc.caretRangeFromPoint?.(x,y);
  const node = caret?.offsetNode || range?.startContainer;
  const offset = caret?.offset ?? range?.startOffset;
  if (!node || !view.contentDOM.contains(node)) {
    const pos = view.posAtCoords({x,y},false) ?? view.state.selection.main.head;
    return {...view.domAtPos(pos),pos};
  }
  return {node,offset,pos:view.posAtDOM(node,offset)};
}
function pointAtSource(view,pos) {
  for(const widget of view.contentDOM.querySelectorAll('.studio-rendered-editable')) {
    const from=view.posAtDOM(widget),block=blockAt(view.state.field(livePreview).blocks,from);
    if(!block || pos<from || pos>block.to) continue;
    const cached=widgetTextMap(view,widget),point=cached?.map.textPoint(pos-from);
    if(point) return {node:cached.nodes[point.index],offset:point.offset,pos};
  }
  return {...view.domAtPos(pos),pos};
}
const highlightName='studio-preview-selection';
let highlightOwner=null;
function clearPointerSelection(view) {
  if(highlightOwner!==view) return;
  globalThis.CSS?.highlights?.delete(highlightName);
  highlightOwner=null;
}
function disposePointerSession(view) {
  const session=pointerSessions.get(view);
  if(!session) return;
  session.abort.abort();
  view.dom.ownerDocument.defaultView.cancelAnimationFrame(session.paintFrame);
  pointerSessions.delete(view);
}
function paintPointerSelection(view,session) {
  if(pointerSessions.get(view)!==session || !view.dom.isConnected || !view.state.field(livePreview).pointerFrozen ||
    !globalThis.CSS?.highlights || !globalThis.Highlight) return;
  const ranges=[];
  for(const selection of view.state.selection.ranges) {
    if(selection.empty) continue;
    const resolve=pos=>{
      const point=[session.anchor,session.head].find(point=>point?.pos===pos && view.contentDOM.contains(point.node));
      return point || pointAtSource(view,pos);
    };
    const first=resolve(selection.from),last=resolve(selection.to),range=view.dom.ownerDocument.createRange();
    // Include only the mounted portion of a selection spanning virtualized blocks.
    if(view.contentDOM.contains(first.node)) range.setStart(first.node,first.offset);else range.setStart(view.contentDOM,0);
    if(view.contentDOM.contains(last.node)) range.setEnd(last.node,last.offset);else range.setEnd(view.contentDOM,view.contentDOM.childNodes.length);
    ranges.push(range);
  }
  if(!ranges.length) {clearPointerSelection(view);return;}
  CSS.highlights.set(highlightName,new Highlight(...ranges));highlightOwner=view;
}
function schedulePointerPaint(view,session) {
  if(session.paintFrame) return;
  session.paintFrame=view.dom.ownerDocument.defaultView.requestAnimationFrame(()=>{
    session.paintFrame=0;paintPointerSelection(view,session);
  });
}
export function previewSelectionRange(state,anchor,head,clicks=1) {
  const forward=anchor<=head;
  if(clicks===2) {
    const first=state.wordAt(anchor),last=state.wordAt(head);
    if(first && last) return EditorSelection.range(forward?first.from:first.to,forward?last.to:last.from);
  } else if(clicks>=3) {
    const first=state.doc.lineAt(anchor),last=state.doc.lineAt(head);
    return EditorSelection.range(forward?first.from:first.to,forward?last.to:last.from);
  }
  return EditorSelection.range(anchor,head);
}
function finishPreviewPointer(view,session,click) {
  if (!view.dom.isConnected || pointerSessions.get(view)!==session) return;
  session.abort.abort();
  if (!click) {view.dispatch({effects:previewPointer.of({active:false})});return;}
  const pos=session.head.pos;
  const point=view.contentDOM.contains(session.head.node) ? session.head : pointAtSource(view,pos);
  const element=point.node.nodeType===1 ? point.node : point.node.parentElement;
  const node=element?.closest('.studio-rendered-editable');
  const layout=node ? measurePreviewBlock(view,node) : null;
  const caret = view.dom.ownerDocument.createRange();
  caret.setStart(point.node,point.offset);caret.collapse(true);
  const rect = caret.getBoundingClientRect();
  const top = rect.height ? rect.top : view.coordsAtPos(pos)?.top;
  const effects=[editingBlock.of(true),previewPointer.of({active:false,edit:true,layout})];
  // Let CodeMirror apply one anchor after its height map has been measured.
  // A manual scroll followed by scrollSnapshot captures a stale line estimate
  // and accumulates drift when switching between distant rendered blocks.
  if(top!=null) effects.push(EditorView.scrollIntoView(pos,{
    y:'start',yMargin:top-view.scrollDOM.getBoundingClientRect().top
  }));
  view.dispatch({selection:{anchor:pos},effects});
  view.focus();
}
const previewMouseSelection = EditorView.mouseSelectionStyle.of((view,event) => {
  if (event.button!==0 || !view.state.field(livePreview).enabled ||
    event.target.closest?.('a,summary,button,input,iframe,select,textarea,.cm-gutters')) return null;
  const point = pointerPoint(view,event), original = view.state.selection;
  const previous = pointerSessions.get(view);
  disposePointerSession(view);
  const anchor = event.shiftKey ? previous?.anchor || pointAtSource(view,original.main.anchor) : point;
  const session = {abort:new AbortController(),anchor,head:point,moved:false,paintFrame:0};
  pointerSessions.set(view,session);
  view.dispatch({selection:{anchor:point.pos},effects:previewPointer.of({active:true})});
  const finish = up => queueMicrotask(()=>finishPreviewPointer(view,session,
    up.type==='mouseup' && !session.moved && !event.shiftKey && event.detail<2));
  view.dom.ownerDocument.addEventListener('mouseup',finish,{once:true,signal:session.abort.signal});
  view.dom.ownerDocument.defaultView.addEventListener('blur',finish,{once:true,signal:session.abort.signal});
  return {
    get(move,extend,multiple) {
      session.moved ||= Math.hypot(move.clientX-event.clientX,move.clientY-event.clientY)>4;
      session.head = pointerPoint(view,move);
      const range=previewSelectionRange(view.state,anchor.pos,session.head.pos,event.detail);
      if(event.detail>=2) {
        session.anchor=pointAtSource(view,range.anchor);session.head=pointAtSource(view,range.head);
      }
      schedulePointerPaint(view,session);
      return multiple ? original.addRange(range) : EditorSelection.create([range]);
    },
    update(update) {
      if (update.docChanged) disposePointerSession(view);
    }
  };
});
function touchesEndpoint(range, block) {
  return (range.anchor >= block.from && range.anchor <= block.to) ||
    (range.head >= block.from && range.head <= block.to);
}
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
    return node;
  }
  ignoreEvent(event) {
    // CodeMirror owns selection/autoscroll; the custom style leaves widgets intact.
    return event.type !== 'mousedown';
  }
}
function decorations(value, state) {
  if (!value.enabled) return Decoration.none;
  const ranges = [];
  const revealed=new Set([...value.revealed,...value.pointerBlocks]);
  const layouts=new Map(value.layouts.map(layout=>[layout.from,layout]));
  if(value.pointerFrozen && value.pointerBlank!=null) ranges.push(Decoration.line({class:'studio-preview-blank'}).range(value.pointerBlank));
  for (const block of value.blocks) {
    if (block.to <= block.from || block.to > state.doc.length) continue;
    const selected = !value.pointerFrozen && state.selection.ranges.some(r =>
      (value.editing && touchesEndpoint(r,block)) ||
      (value.searching && !r.empty && r.from <= block.to && r.to >= block.from));
    if (block.dirty || selected || revealed.has(block.from)) {
      const layout = layouts.get(block.from);
      const heading=previewHeading(state,block);
      if(heading) {
        ranges.push(Decoration.line({attributes:{class:'studio-preview-heading','data-heading-level':String(heading.level)}}).range(heading.from));
        ranges.push(Decoration.mark({class:'studio-heading-syntax'}).range(heading.from,heading.contentFrom));
      } else if (layout?.style) {
        ranges.push(Decoration.line({attributes:{style:layout.style}}).range(state.doc.lineAt(block.from).from));
      }
      continue;
    }
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
      pointerBlocks: [], layouts: [], pointerActive:false, pointerFrozen:false, pointerBlank:null,
      decorations: Decoration.none
    };
  },
  update(value, tr) {
    const effects = tr.effects.filter(effect => effect.is(renderedBlocks) || effect.is(renderMode) || effect.is(editingBlock) || effect.is(revealForNavigation) || effect.is(previewPointer));
    const selectionChanged = !tr.startState.selection.eq(tr.state.selection);
    const searching = searchPanelOpen(tr.state);
    const searchChanged = searching !== value.searching;
    if (value.pointerFrozen && !tr.docChanged && !effects.length && !searchChanged) return value;
    if (!tr.docChanged && !effects.length && !searchChanged && (!(value.editing || searching) || !selectionChanged)) return value;
    let next = {
      ...value,
      searching,
      revealed: []
    };
    if (tr.docChanged) {
      next.layouts = value.layouts.map(layout=>({...layout,from:tr.changes.mapPos(layout.from,-1),to:tr.changes.mapPos(layout.to,1)}));
      next.pointerBlocks = []; next.pointerFrozen = false; next.pointerActive = false;
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
      if (effect.is(previewPointer)) {
        const {active,layout,edit} = effect.value;
        if (active && !value.pointerActive) {
          const replaced = new Set();
          value.decorations.between(0,tr.startState.doc.length,(from,to,decoration)=>{
            if (decoration.spec.widget instanceof MarkdownBlock) replaced.add(from);
          });
          next.pointerBlocks = value.blocks.filter(block=>!replaced.has(block.from)).map(block=>block.from);
          next.pointerFrozen = true;
          const line=tr.startState.doc.lineAt(tr.startState.selection.main.head);
          next.pointerBlank=value.pointerFrozen ? value.pointerBlank : value.editing && !line.text ? line.from : null;
        }
        next.pointerActive = active;
        if (edit) {
          next.pointerFrozen = false; next.pointerBlocks = [];
          if (layout) next.layouts = [layout];
        }
      } else if (effect.is(revealForNavigation)) next.revealed = effect.value;else if (effect.is(renderedBlocks)) next.blocks = effect.value;else if (effect.is(renderMode)) {
        next.enabled = effect.value;
        next.layouts = []; next.pointerBlocks = []; next.pointerActive = false; next.pointerFrozen = false;
        next.editing = false;
      } else if (effect.is(editingBlock)) {
        next.editing = effect.value;
        if (!next.editing && !next.pointerFrozen) { next.layouts = []; next.pointerBlocks = []; }
      }
    }
    if (!tr.docChanged && !selectionChanged && !searchChanged && next.enabled === value.enabled && next.editing === value.editing && next.blocks === value.blocks && !value.revealed.length && !next.revealed.length && next.layouts === value.layouts && next.pointerBlocks === value.pointerBlocks && next.pointerActive === value.pointerActive && next.pointerFrozen === value.pointerFrozen) return value;
    next.decorations = decorations(next, tr.state);
    return next;
  },
  provide: field => EditorView.decorations.from(field, value => value.decorations)
});
function releasePointerSelection(view) {
  if(view.state.field(livePreview).pointerFrozen) view.dispatch({effects:previewPointer.of({active:false,edit:true})});
}
export const liveFocus = [EditorView.clipboardOutputFilter.of(copyPreviewMarkdown), previewMouseSelection, EditorView.domEventHandlers({
  compositionstart(event,view) { releasePointerSelection(view);return false; },
  keydown(event,view) {
    const preview=view.state.field(livePreview);
    if (!event.isComposing && !view.composing && event.keyCode!==229 && preview.pointerFrozen && !['Control','Meta','Shift','Alt'].includes(event.key) &&
      !((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='c')) {
      releasePointerSelection(view);
    }
    return false;
  },
  focus(event, view) {
    if (event.target !== view.contentDOM) return;
    queueMicrotask(() => {
      if (view.dom.isConnected && view.hasFocus) view.dispatch({
        effects: editingBlock.of(true)
      });
    });
  },
  blur(event, view) {
    queueMicrotask(() => {
      if (view.dom.isConnected && !view.hasFocus) view.dispatch({
        effects: [editingBlock.of(false),view.scrollSnapshot()]
      });
    });
  }
}), ViewPlugin.fromClass(class {
  constructor(view) { this.view=view; }
  update(update) {
    const preview=update.state.field(livePreview);
    const painted=preview.pointerFrozen && !!globalThis.CSS?.highlights && !!globalThis.Highlight;
    update.view.dom.classList.toggle('studio-preview-selecting',painted);
    if(!preview.pointerFrozen) {
      clearPointerSelection(this.view);disposePointerSession(this.view);
    } else if(update.selectionSet || update.viewportChanged || update.geometryChanged) {
      const session=pointerSessions.get(this.view);
      if(session) schedulePointerPaint(this.view,session);
    }
  }
  destroy() { disposePointerSession(this.view);clearPointerSelection(this.view); }
})];

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
    preview.decorations.between(adjacent.from, adjacent.to, (from, to, decoration) => {
      if (decoration.spec.widget instanceof MarkdownBlock && from <= adjacent.to && to >= adjacent.from) targets.add(from);
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

// Share container handling between paste, block shortcuts and math editing.
export function quotePrefix(text) { return text.match(/^ {0,3}>[ \t]?(?: {0,3}>[ \t]?)*/)?.[0] || ''; }
export function quoteContinuation(line, position) {
  const quote = quotePrefix(line.text);
  if (!quote || position < line.from + quote.length) return '';
  const body = line.text.slice(quote.length);
  const marker = body.match(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/);
  const indent = marker && position >= line.from + quote.length + marker[0].length
    ? marker[0].replace(/[^\t]/g,' ') : body.match(/^[ \t]*/)[0];
  return quote + indent;
}
export function quotedPaste(text, state) {
  if (!/[\r\n]/.test(text) || state.selection.ranges.length !== 1) return text;
  const range = state.selection.main, line = state.doc.lineAt(range.from);
  const prefix = quoteContinuation(line,range.from);
  if (!prefix || state.doc.lineAt(range.to).number !== line.number) return text;
  const tree = ensureSyntaxTree(state,range.to,50);
  if (!tree || withinNode(tree,range.from,['FencedCode','CodeBlock','InlineCode','HTMLBlock'])) return text;
  const quote = quotePrefix(line.text);
  const lines = text.replace(/\r\n?/g,'\n').split('\n');
  // A copied quote already has its container markers. Reuse, rather than nest, them.
  if (lines[0].startsWith(quote)) lines[0] = lines[0].slice(quote.length);
  let result = lines.map((part,i) => i && !quotePrefix(part) ? prefix+part : part).join('\n');
  const beginsBlock = /^\s*(?:\$\$|\\\[|`{3,}|~{3,}|[-+*]\s|\d+[.)]\s)/.test(lines[0]);
  const before = state.sliceDoc(line.from+prefix.length,range.from);
  if (beginsBlock && before.trim()) result = '\n'+prefix+'\n'+prefix+result;
  if (beginsBlock && state.sliceDoc(range.to,line.to).trim()) result += '\n'+prefix+'\n'+prefix;
  return result;
}
export const quoteEditing = EditorView.clipboardInputFilter.of(quotedPaste);
function withinNode(tree, position, names) {
  for (let node = tree.resolveInner(position, -1); node; node = node.parent) {
    if (names.includes(node.name)) return true;
  }
  return false;
}
function withinMathBlock(state, tree, position) {
  let delimiter = null, quoteDepth = 0;
  const last = state.doc.lineAt(position).number;
  for (let n = 1; n <= last; n++) {
    const line = state.doc.line(n);
    if (withinNode(tree, Math.min(line.from + 1, line.to), ['FencedCode','CodeBlock','HTMLBlock'])) continue;
    const raw = state.sliceDoc(line.from, Math.min(line.to, position));
    const depth = (quotePrefix(raw).match(/>/g) || []).length;
    if (delimiter && depth !== quoteDepth) delimiter = null;
    quoteDepth = depth;
    const text = raw.slice(quotePrefix(raw).length).replace(/^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/, '').trim();
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
  if (state.readOnly || view.composing) return false;
  const tree = ensureSyntaxTree(state, state.selection.ranges.reduce((end,r)=>Math.max(end,r.to),0), 50);
  // If parsing is still catching up, prefer the existing safe Markdown behavior.
  if (!tree) return false;
  const mathPositions=new Map();
  const inMath=position=>{
    if(!mathPositions.has(position)) mathPositions.set(position,withinMathBlock(state,tree,position));
    return mathPositions.get(position);
  };
  // Inside quoted equations, Enter continues the container, not a list item.
  if (state.selection.ranges.every(range => quoteContinuation(state.doc.lineAt(range.from),range.from) && (soft || inMath(range.from)) && !withinNode(tree,range.from,['FencedCode','CodeBlock','HTMLBlock']))) {
    const spec = state.changeByRange(range => {
      const insert = '\n' + quoteContinuation(state.doc.lineAt(range.from),range.from);
      return {changes:{from:range.from,to:range.to,insert},range:EditorSelection.cursor(range.from+insert.length)};
    });
    view.dispatch(state.update({...spec,effects:editingBlock.of(true),scrollIntoView:true,userEvent:'input'}));
    return true;
  }
  if (!state.field(livePreview, false)?.enabled) return false;
  if (soft) return insertNewlineAndIndent(view);
  if (state.selection.ranges.some(range => withinNode(tree, range.head, ['ListItem','Blockquote']))) {
    return continuePreviewMarkup(view);
  }
  const literal = range => withinNode(tree, range.head, ['FencedCode','CodeBlock','HTMLBlock','Table']) || inMath(range.head);
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