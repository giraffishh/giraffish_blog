import { markdown, inspectDocument } from './document.js';

self.onmessage = ({ data: { id, text, preview } }) => {
  try {
    self.postMessage({ id, html: preview ? markdown.render(text) : undefined, ...inspectDocument(text) });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
