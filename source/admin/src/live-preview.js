import { EditorSelection, Prec, StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, keymap, ViewPlugin } from '@codemirror/view';
import {editsBeforeFormulaFormatting} from './formula-formatter.js';
import {checkboxOptions} from './fluid.js';
import { populateRendered } from './rendered-document.js';
import { searchPanelOpen } from '@codemirror/search';
import {insertNewlineAndIndent, isolateHistory} from '@codemirror/commands';
import {ensureSyntaxTree, syntaxTree} from '@codemirror/language';
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
function headingOnLine(line) {
  const marker = line.text.match(/^( {0,3})(#{1,6})([ \t]+|$)/);
  if (!marker) return null;
  const contentFrom = line.from + marker[0].length;
  const body = line.text.slice(marker[0].length);
  const suffix = body.match(/(?:^|[ \t]+)#+[ \t]*$/)?.[0] || '';
  return {
    level: marker[2].length, from: line.from, to: line.to,
    markerEnd: contentFrom - marker[3].length, contentFrom, contentTo: line.to - suffix.length
  };
}

export function previewHeading(state, block) {
  if (!block.dirty && !/^<h[1-6]\b/.test(block.html)) return null;
  return headingOnLine(state.doc.lineAt(block.from));
}

function decorateHeading(ranges, heading) {
  ranges.push(Decoration.line({attributes:{
    class:'studio-preview-heading', 'data-heading-level':String(heading.level)
  }}).range(heading.from));
  // Only the hashes hang in the gutter. Keep the editable end of the empty
  // heading in normal text flow so the browser can anchor IME composition there.
  ranges.push(Decoration.mark({class:'studio-heading-syntax'}).range(heading.from, heading.markerEnd));
  if (heading.markerEnd < heading.contentFrom) {
    ranges.push(Decoration.mark({class:'studio-heading-gap'}).range(heading.markerEnd, heading.contentFrom));
  }
}

function parsedHeading(tree, line) {
  const heading = headingOnLine(line);
  if (!heading) return null;
  for (let node = tree.resolveInner(heading.markerEnd, -1); node; node = node.parent) {
    if (node.name === 'ATXHeading' + heading.level) return heading;
  }
  return null;
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
  const end = view.state.doc.length;
  if ((hit === view.contentDOM || hit === view.scrollDOM) &&
      event.clientY >= view.documentTop + view.lineBlockAt(end).bottom) {
    return {...view.domAtPos(end), pos:end, belowDocument:true};
  }
  const headingLine=hit?.closest('.studio-preview-heading');
  if (headingLine) {
    const line = view.state.doc.lineAt(view.posAtDOM(headingLine, 0));
    const heading = headingOnLine(line);
    if (heading && heading.contentFrom === heading.contentTo) {
      const pos = heading.contentFrom;
      return {...view.domAtPos(pos, -1), pos, needsHeadingSpace:pos === heading.markerEnd};
    }
  }
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
// Start a paragraph after the final block, or reuse the trailing writing space.
export function continueAtDocumentEnd(view) {
  const doc = view.state.doc;
  const end = doc.length;
  const lastLine = doc.line(doc.lines);
  let separator = '';
  if (end && !view.state.readOnly) {
    if (lastLine.text.trim()) separator = '\n\n';
    else if (doc.lines > 1 && doc.line(doc.lines - 1).text.trim()) separator = '\n';
  }
  view.dispatch({
    changes: separator ? {from:end, insert:separator} : undefined,
    selection: {anchor:end + separator.length},
    effects: [editingBlock.of(true), previewPointer.of({active:false, edit:true})],
    userEvent: separator ? 'input.appendParagraph' : 'select.pointer'
  });
  view.focus();
}

function finishPreviewPointer(view,session,click) {
  if (!view.dom.isConnected || pointerSessions.get(view)!==session) return;
  session.abort.abort();
  if (!click) {view.dispatch({effects:previewPointer.of({active:false})});return;}
  if (session.anchor.belowDocument && session.head.belowDocument) {
    continueAtDocumentEnd(view);
    return;
  }
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
  if (session.head.needsHeadingSpace && !view.state.readOnly) {
    view.dispatch({changes:{from:pos, insert:' '}, selection:{anchor:pos + 1}, effects, userEvent:'input'});
  } else {
    view.dispatch({selection:{anchor:pos}, effects});
  }
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
// Identify the exact rendered occurrence, even when labels repeat or the same
// tag is shown as a code example. Refuse stale/ambiguous matches.
export function checkboxChange(state, block, tag, occurrence, count, checked) {
  if (!block || block.dirty || state.readOnly || !tag) return null;
  const match = /^(\{%\s*(?:cb|checkbox)\s+)([^\n]*?)(\s*%\})$/.exec(tag);
  if (!match) return null;
  const args = match[2].split(',');
  if (checkboxOptions(args.map(part => part.trim())).disabled) return null;
  const source = state.sliceDoc(block.from, block.to);
  const tree = ensureSyntaxTree(state, block.to, 50);
  if (!tree) return null;
  const matches = [];
  for (let at = source.indexOf(tag); at !== -1; at = source.indexOf(tag, at + tag.length)) {
    let start = at;
    while (start > 0 && source[start - 1] === '\\') start--;
    if ((at - start) % 2) continue;
    const position = block.from + at;
    if (!withinNode(tree, position + 1, ['InlineCode','FencedCode','CodeBlock','HTMLBlock','URL','Comment'])) matches.push(position);
  }
  if (matches.length !== count || matches[occurrence] == null) return null;
  const value = String(checked);
  let offset = match[1].length + args[0].length;
  let insert = ', ' + value;
  let length = 0;
  if (args.length > 1) {
    offset += 1 + args[1].match(/^\s*/)[0].length;
    insert = value;
    length = args[1].trim().length;
  }
  const from = matches[occurrence] + offset;
  return {changes:{from, to:from + length, insert}, tag:tag.slice(0,offset) + insert + tag.slice(offset + length)};
}

export function togglePreviewCheckbox(view, root, input, block) {
  const tag = input.dataset.fluidTag;
  const peers = Array.from(root.querySelectorAll('input[data-fluid-tag]')).filter(peer => peer.dataset.fluidTag === tag);
  const edit = checkboxChange(view.state, block, tag, peers.indexOf(input), peers.length, input.checked);
  if (!edit) {
    input.checked = !input.checked;
    return;
  }
  input.dataset.fluidTag = edit.tag;
  view.dispatch({changes:edit.changes, annotations:isolateHistory.of('full'), userEvent:'input.checkbox'});
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
    node.addEventListener('change', event => {
      const input = event.target;
      if (!input.matches?.('input[data-fluid-tag]')) return;
      const block = blockAt(view.state.field(livePreview).blocks, view.posAtDOM(node));
      togglePreviewCheckbox(view, node, input, block);
    });
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
    return event.type !== 'mousedown' || event.target.matches?.('input[data-fluid-tag]');
  }
}
function decorations(value, state) {
  if (!value.enabled) return Decoration.none;
  const ranges = [];
  const styledHeadings = new Set();
  const revealed=new Set([...value.revealed,...value.pointerBlocks]);
  const layouts=new Map(value.layouts.map(layout=>[layout.from,layout]));
  if(value.pointerFrozen && value.pointerBlank!=null) ranges.push(Decoration.line({class:'studio-preview-blank'}).range(value.pointerBlank));
  for(const position of value.revealed) {
    const line=state.doc.lineAt(position);
    if(!line.text) ranges.push(Decoration.line({class:'studio-navigation-line'}).range(line.from));
  }
  for (const block of value.blocks) {
    if (block.to <= block.from || block.to > state.doc.length) continue;
    const selected = !value.pointerFrozen && state.selection.ranges.some(r =>
      (value.editing && touchesEndpoint(r,block)) ||
      (value.searching && !r.empty && r.from <= block.to && r.to >= block.from));
    const heading = previewHeading(state, block);
    const emptyHeading = heading && heading.contentFrom === heading.contentTo;
    if (emptyHeading || block.dirty || selected || revealed.has(block.from)) {
      const layout = layouts.get(block.from);
      if (heading) {
        decorateHeading(ranges, heading);
        styledHeadings.add(heading.from);
      } else {
        const firstLine = state.doc.lineAt(block.from);
        const singleLineParagraph = /^<p(?:>|\s)/.test(block.html) &&
          firstLine.number === state.doc.lineAt(block.to).number;
        if (singleLineParagraph || layout?.style) {
          const attributes = {};
          if (singleLineParagraph) attributes.class = 'studio-preview-paragraph';
          if (layout?.style) attributes.style = layout.style;
          ranges.push(Decoration.line({attributes}).range(firstLine.from));
        }
      }
      continue;
    }
    ranges.push(Decoration.replace({
      widget: new MarkdownBlock(block),
      block: true,
      inclusive: false
    }).range(block.from, block.to));
  }
  // A heading created on a new line has no rendered block until analysis returns.
  if (value.editing && !value.pointerFrozen) {
    for (const range of state.selection.ranges) {
      const line = state.doc.lineAt(range.head);
      if (styledHeadings.has(line.from)) continue;
      const existing = blockAt(value.blocks, line.from);
      if (existing && !existing.dirty) continue;
      const heading = parsedHeading(syntaxTree(state), line);
      if (heading) {
        decorateHeading(ranges, heading);
        styledHeadings.add(line.from);
      }
    }
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
      const contentChanges = tr.annotation(editsBeforeFormulaFormatting) ?? tr.changes;
      if (!tr.isUserEvent('input.checkbox')) {
        contentChanges.iterChangedRanges((from, to) => changes.push({from, to}));
      }
      const appendingParagraph = tr.isUserEvent('input.appendParagraph');
      next.blocks = value.blocks.map(block => {
        // Appended separators belong to the new paragraph. Keep the preceding
        // rendered block and its original end until the parser catches up.
        if (appendingParagraph && block.to === tr.startState.doc.length) {
          // Automatic formula formatting can change offsets in the same transaction.
          const start = tr.changes.mapPos(block.from, -1);
          const end = tr.changes.mapPos(block.to, -1);
          return {...block, from:start, to:end};
        }
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
  provide: field => [
    EditorView.decorations.from(field, value => value.decorations),
    // The last line may be outside CodeMirror's mounted viewport.
    EditorView.contentAttributes.compute(['doc'], ({doc}) =>
      doc.line(doc.lines).length === 0 ? {class:'studio-empty-last-line'} : {})
  ]
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

// Paragraph separators are hidden in preview. Skip them when navigating, but
// retain blank lines inside blocks such as fenced code, where they are content.
function adjacentPreviewLine(state, blocks, lineNumber, forward) {
  const step = forward ? 1 : -1;
  for (let number = lineNumber + step; number >= 1 && number <= state.doc.lines; number += step) {
    const line = state.doc.line(number);
    if (line.text.trim()) return line;
    const block = blockAt(blocks, line.from);
    if (!block) continue;
    const paragraphOrHeading = /^<(?:p|h[1-6])(?:>|\s)/.test(block.html);
    const blockStart = state.doc.lineAt(block.from).text.trim();
    const mathBlock = blockStart === '$$' || blockStart === '\\[';
    // A just-edited paragraph may still have its old, expanded parser range.
    // Its new empty lines are separators, not literal content inside a block.
    if (!paragraphOrHeading || mathBlock) return line;
  }
  return null;
}

// Keep wrapped-row motion native. Cross block boundaries using source positions
// so collapsed separators cannot become temporary rows or skip visible content.
export function moveRenderedLine(view, forward, extend = false) {
  const state = view.state;
  const preview = state.field(livePreview, false);
  if (!preview?.enabled || view.composing) return false;

  const plans = state.selection.ranges.map(range => {
    const line = state.doc.lineAt(range.head);
    const collapse = !extend && !range.empty;
    const boundary = view.moveToLineBoundary(range, forward, true).head;
    const wrapped = !collapse && (forward ? boundary < line.to : boundary > line.from);
    const adjacent = adjacentPreviewLine(state, preview.blocks, line.number, forward);
    return {range, line, collapse, wrapped, adjacent};
  });
  if (plans.every(plan => plan.wrapped) && !preview.pointerFrozen) return false;

  const left = view.contentDOM.getBoundingClientRect().left;
  for (const plan of plans) {
    const {range, line} = plan;
    const caretLeft = view.coordsAtPos(range.head)?.left;
    const fallbackLeft = left + (range.head - line.from) * view.defaultCharacterWidth;
    plan.goal = range.goalColumn ?? ((caretLeft ?? fallbackLeft) - left);
  }

  const targets = new Set();
  const reveal = position => {
    targets.add(state.doc.lineAt(position).from);
    preview.decorations.between(position, position, (from, to, decoration) => {
      if (decoration.spec.widget instanceof MarkdownBlock) targets.add(from);
    });
  };
  for (const {range, adjacent, collapse} of plans) {
    reveal(range.head);
    if (collapse) reveal(forward ? range.to : range.from);
    else if (adjacent) reveal(forward ? adjacent.from : adjacent.to);
  }
  view.dispatch({effects: [
    previewPointer.of({active:false, edit:true}),
    editingBlock.of(true),
    revealForNavigation.of([...targets])
  ]});

  try {
    const ranges = plans.map(({range, line, adjacent, collapse, wrapped, goal}) => {
      let head;
      if (collapse) head = forward ? range.to : range.from;
      else if (wrapped) head = view.moveVertically(range, forward).head;
      else if (!adjacent) head = forward ? line.to : line.from;
      else {
        const edge = forward ? adjacent.from : adjacent.to;
        const rect = view.coordsAtPos(edge, forward ? 1 : -1);
        const hit = rect ? view.posAtCoords({
          x: view.contentDOM.getBoundingClientRect().left + goal,
          y: (rect.top + rect.bottom) / 2
        }, false) : null;
        // A pending measurement must not move past the intended visible line.
        head = Math.max(adjacent.from, Math.min(adjacent.to, hit ?? edge));
        const block = blockAt(view.state.field(livePreview).blocks, head);
        const heading = block && previewHeading(view.state, block);
        if (heading) head = Math.max(heading.contentFrom, Math.min(heading.contentTo, head));
      }
      return extend
        ? EditorSelection.range(range.anchor, head, goal)
        : EditorSelection.cursor(head, forward ? 1 : -1, undefined, goal);
    });
    view.dispatch({
      selection: EditorSelection.create(ranges, state.selection.mainIndex),
      effects: revealForNavigation.of([]),
      scrollIntoView: true,
      userEvent: 'select'
    });
    return true;
  } finally {
    if (view.state.field(livePreview).revealed.length) {
      view.dispatch({effects: revealForNavigation.of([])});
    }
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
    const newParagraph = Boolean(line.text.trim()) && !literal(range);
    const heading = newParagraph && range.empty && parsedHeading(tree, line);
    if (heading && heading.contentFrom === heading.contentTo) {
      return {changes:{from:line.from, to:line.to, insert:''}, range:EditorSelection.cursor(line.from)};
    }
    // One Enter creates a new paragraph; an already blank line needs no extra separator.
    const insert = newParagraph ? '\n\n' : '\n';
    // At the start of a paragraph, the new editable paragraph is above the existing text.
    const insertBefore = newParagraph && range.empty && range.from === line.from;
    const caret = insertBefore ? range.from : range.from + insert.length;
    return {changes:{from:range.from,to:range.to,insert}, range:EditorSelection.cursor(caret)};
  });
  view.dispatch(state.update({...spec,effects:editingBlock.of(true),scrollIntoView:true,userEvent:'input'}));
  return true;
}
export const liveNavigation = Prec.high(keymap.of([
  {key:'Enter', run:view => previewNewline(view), shift:view => previewNewline(view, true)},
  {key:'ArrowUp', run:view => moveRenderedLine(view, false), shift:view => moveRenderedLine(view, false, true)},
  {key:'ArrowDown', run:view => moveRenderedLine(view, true), shift:view => moveRenderedLine(view, true, true)}
]));
