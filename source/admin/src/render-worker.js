import { DocumentAnalysis } from './document.js';
const document = new DocumentAnalysis();
self.onmessage = ({
  data: {
    id,
    text,
    preview
  }
}) => {
  try {
    self.postMessage({
      id,
      ...document.analyze(text, preview)
    });
  } catch (error) {
    self.postMessage({
      id,
      error: error.message
    });
  }
};
