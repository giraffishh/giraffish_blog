import {installResponsiveViewport} from './responsive-layout.js';
import {codeStyles} from './code-theme.js';

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
export function button(label, action, className = '') {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

const paths = {
  swap: 'M3 7h17 M16 3l4 4-4 4 M21 17H4 M8 13l-4 4 4 4',
  source: 'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 4l-4 16',
  split: 'M3 4h18v16H3z M12 4v16',
  render: 'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h6',
  metadata: 'M4 3h16v18H4z M8 3v18 M11 8h6 M11 12h6 M11 16h4',
  search: 'M21 21l-6-6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  copy: 'M8 8h12v13H8z M16 8V3H3v13h5',
  markdown: 'M2 5h20v14H2z M5 15V9l3 3 3-3v6 M17 9v6 M14 12l3 3 3-3',
  external: 'M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7',
  refresh: 'M20 8a8 8 0 1 0 0 8 M20 3v5h-5',
  filter: 'M3 6h18 M6 12h12 M9 18h6'
};

// Keep the full accessible name when narrow layouts show only the icon.
export function compactAction(element, icon, label = element.textContent) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('studio-action-icon');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[icon]);
  svg.append(path);
  const text = document.createElement('span');
  text.className = 'studio-action-label';
  text.textContent = element.textContent;
  element.replaceChildren(svg, text);
  element.classList.add('studio-compact-action');
  element.setAttribute('aria-label', label);
  element.title = label;
  return element;
}

let initialized = false;
// Entrypoints call this once; importing UI helpers never changes the page.
export function initializeStudioUI() {
  if (initialized) return;
  initialized = true;
  const style = document.createElement('style');
  style.textContent = codeStyles;
  document.head.append(style);
  installResponsiveViewport();
}
