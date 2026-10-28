import { isIdentityCallback, waitForIdentityLogin } from './identity-callback.js';
window.CMS_MANUAL_INIT = true;
const load = src => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = src;
  script.onload = resolve;
  script.onerror = () => reject(new Error(`加载失败：${src}`));
  document.head.append(script);
});
async function start() {
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const callback = isIdentityCallback(location.hash) && !new URLSearchParams(location.hash.slice(1)).has('error');
  if (!demo) {
    await load('/admin/assets/identity.js');
    // The widget consumes callback fragments asynchronously in its iframe.
    // Do not let the CMS hash router replace them before login completes.
    if (callback) {
      await waitForIdentityLogin(window.netlifyIdentity);
      window.netlifyIdentity.close();
    }
  }
  await Promise.all([load('/admin/assets/decap/decap-cms.js'), load('/admin/assets/vditor/dist/index.min.js')]);
  await load('/admin/assets/entry.js');
}
start().catch(error => {
  const target = document.getElementById('studio-loading');
  if (!target) return;
  target.replaceChildren();
  const title = document.createElement('h1'); title.textContent = '编辑器暂时未能加载';
  const message = document.createElement('p'); message.textContent = `${error.message}。请检查网络后重试。`;
  const retry = document.createElement('button'); retry.textContent = '重新加载'; retry.onclick = () => location.reload();
  target.append(title, message, retry);
});
