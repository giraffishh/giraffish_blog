import { isIdentityCallback, waitForIdentityLogin } from './identity-callback.js';
window.CMS_MANUAL_INIT = true;
const loadScript = src => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = src;
  script.onload = resolve;
  script.onerror = () => reject(new Error(`加载失败：${src}`));
  document.head.append(script);
});
async function start() {
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const callback = isIdentityCallback(location.hash) && !new URLSearchParams(location.hash.slice(1)).has('error');
  const configPromise = fetch('/admin/assets/config.json', {signal:AbortSignal.timeout(15000)}).then(response => {
    if (!response.ok) throw new Error('无法加载后台配置');
    return response.json();
  });
  // A user may spend minutes completing a callback; report config failures when
  // startup resumes instead of leaving an unhandled rejection in the meantime.
  configPromise.catch(() => {});
  // Core imports create the hash router. Delay them on auth callbacks until
  // Identity has consumed the fragment; normal visits load in parallel.
  const identity = demo ? Promise.resolve() : loadScript(__IDENTITY_URL__);
  if (callback && !demo) {
    await identity;
    const login = document.createElement('button');
    login.textContent = '登录';
    login.onclick = () => window.netlifyIdentity.open('login');
    document.getElementById('studio-loading')?.replaceChildren(login);
    await waitForIdentityLogin(window.netlifyIdentity);
    window.netlifyIdentity.close();
  }
  // The HTML preloads CMS and entry modules while Identity initializes. Execute
  // the backend only afterwards so its init listener sees the identity widget.
  await identity;
  const [, config] = await Promise.all([import('./cms.js'), configPromise]);
  const {initialize} = await import('./entry.js');
  await initialize(config);
}
start().catch(error => {
  const target = document.getElementById('studio-loading');
  if (!target) return;
  const title = document.createElement('h1'); title.textContent = '编辑器暂时未能加载';
  const message = document.createElement('p'); message.textContent = `${error.message}。请检查网络后重试。`;
  const retry = document.createElement('button'); retry.textContent = '重新加载'; retry.onclick = () => location.reload();
  target.replaceChildren(title, message, retry);
});
