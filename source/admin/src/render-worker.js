import { DocumentAnalysis } from './document.js';
import { articleRecord } from './article-record.js';
const document = new DocumentAnalysis();
self.onmessage = ({
  data: {
    id,
    text,
    preview,
    kind,
    articleId,
    data
  }
}) => {
  try {
    if (kind === 'article') {
      self.postMessage({id, article:articleRecord(articleId, data)});
      return;
    }
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
