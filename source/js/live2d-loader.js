// GitLab Raw serves JS/CSS as text/plain + nosniff. Fetch the mirror
// files with CORS, then load scripts and styles with explicit types.
(() => {
  const entry = document.currentScript;
  if (screen.width < 768 || window.__giraffishLive2DLoading) return;
  const base = entry.dataset.assets;
  if (!base) return;
  window.__giraffishLive2DLoading = true;

  async function readAsset(name) {
    const response = await fetch(new URL(name, base), {
      mode: 'cors', credentials: 'omit'
    });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return response.arrayBuffer();
  }

  async function loadScript(name) {
    const bytes = await readAsset(name);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }));
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.dataset.live2dAsset = name;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Cannot load ${name}`));
        document.head.appendChild(script);
      });
    } finally { URL.revokeObjectURL(url); }
  }

  (async () => {
    const css = await readAsset('waifu.css');
    const style = document.createElement('style');
    style.dataset.live2dAsset = 'waifu.css';
    style.textContent = new TextDecoder().decode(css);
    document.head.appendChild(style);
    await loadScript('live2dcubismcore.min.js');
    await loadScript('live2d.min.js');
    await loadScript('waifu-tips.js'); // already bundles PixiJS 6
    window.initWidget({
      waifuPath: new URL('waifu-tips.json', base).href,
      cdnPath: base,
      tools: ['hitokoto', 'switch-model', 'switch-texture', 'photo', 'info', 'quit']
    });
  })().catch(error => {
    window.__giraffishLive2DLoading = false;
    console.error('[Live2D]', error);
  });
})();
