import { renderBlocks, inspectDocument } from './document.js';
self.onmessage = ({data:{id,text,preview}}) => {
  try {
    self.postMessage({id,blocks:preview?renderBlocks(text):undefined,...inspectDocument(text)});
  } catch(error) { self.postMessage({id,error:error.message}); }
};
