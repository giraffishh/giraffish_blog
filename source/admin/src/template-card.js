import previews from 'studio:template-previews';
import {populateRendered} from './rendered-document.js';

export function createTemplateCard(name, content, onInsert) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'studio-template';
  card.setAttribute('aria-label', '插入' + name);
  card.title = '插入' + name;
  const label = document.createElement('span');
  label.className = 'studio-template-name';
  label.textContent = name;
  const preview = document.createElement('div');
  preview.className = 'studio-template-preview studio-typography';
  preview.inert = true;
  preview.setAttribute('aria-hidden', 'true');
  if (name === '组图') {
    const gallery = document.createElement('div');
    gallery.className = 'studio-template-gallery';
    for (let i = 0; i < 2; i++) {
      const photo = document.createElement('span');
      photo.className = 'studio-template-photo';
      gallery.append(photo);
    }
    preview.append(gallery);
  } else {
    populateRendered(preview, previews[name]);
    // The whole card inserts a template; preview links and summaries are not controls.
    for (const node of preview.querySelectorAll('a, summary, [role=checkbox]')) {
      node.removeAttribute('href');
      node.removeAttribute('role');
      node.tabIndex = -1;
    }
  }
  card.append(label, preview);
  card.addEventListener('click', onInsert);
  return card;
}
