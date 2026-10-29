// One parser worker per tab. Replace queued edits rather than parsing obsolete
// revisions, and retain a small in-memory result cache across editor unmounts.
const queue = new Map();
const cache = new Map();
let worker, running, sequence = 0, cacheSize = 0;
const maxCacheSize = 3_000_000;

function remember(text, result) {
  if (result.error) return;
  const cost = text.length + (result.blocks || []).reduce((sum, block) => sum + block.html.length, 0);
  const previous = cache.get(text);
  if (previous) { cacheSize -= previous.cost; cache.delete(text); }
  if (cost > maxCacheSize) return;
  cache.set(text, {result, cost});
  cacheSize += cost;
  while (cache.size > 3 || cacheSize > maxCacheSize) {
    const [key, oldest] = cache.entries().next().value;
    cache.delete(key);
    cacheSize -= oldest.cost;
  }
}

function failWorker() {
  worker?.terminate();
  worker = null;
  const jobs = [running, ...queue.values()];
  running = null;
  queue.clear();
  for (const job of jobs) if (job && !job.owner?.destroyed) job.done({error:'解析器加载失败，请重试'});
}

function pump() {
  if (running || !queue.size) return;
  try {
    if (!worker) {
      worker = new Worker('/admin/assets/render-worker.js', {type:'module'});
      worker.onmessage = ({data}) => {
        const job = running;
        if (!job || data.id !== job.sequence) return;
        running = null;
        if (job.kind === 'document') remember(job.text, data);
        try { if (!job.owner?.destroyed) job.done(data); }
        finally { pump(); }
      };
      worker.onerror = failWorker;
      worker.onmessageerror = failWorker;
    }
    // A newly opened/edited document should not wait behind media indexing.
    let next = queue.entries().next().value;
    for (const entry of queue) if (entry[1].kind === 'document') { next = entry; break; }
    const [key, job] = next;
    queue.delete(key);
    running = job;
    job.sequence = ++sequence;
    worker.postMessage({id:job.sequence, kind:job.kind, text:job.text, preview:job.preview, articleId:job.articleId, data:job.data});
  } catch { failWorker(); }
}
export class DocumentRenderer {
  constructor(onResult) { this.onResult = onResult; }
  request(id, text, preview) {
    const hit = cache.get(text);
    const done = result => this.onResult({...result, id});
    if (hit && (!preview || hit.result.blocks)) {
      cache.delete(text); cache.set(text, hit);
      queue.delete(this);
      queueMicrotask(() => { if (!this.destroyed) done(hit.result); });
      return;
    }
    queue.set(this, {kind:'document', owner:this, id, text, preview, done});
    pump();
  }
  destroy() { this.destroyed = true; queue.delete(this); }
}

export function requestArticleRecord(articleId, data) {
  return new Promise((resolve, reject) => {
    const key = {};
    queue.set(key, {kind:'article', articleId, data, done:result => result.error ? reject(new Error(result.error)) : resolve(result.article)});
    pump();
  });
}
