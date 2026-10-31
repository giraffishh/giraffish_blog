// GitLab Raw serves JS/CSS as text/plain + nosniff. Read the immutable,
// CORS-enabled mirror files, verify SRI, then load them with explicit types.
(() => {
  const entry = document.currentScript;
  if (screen.width < 768 || window.__giraffishLive2DLoading) return;
  const base = entry.dataset.assets;
  if (!base) return;
  const integrity = {
  "waifu.css": "sha256-VncW8rE7tYjJ0oO4bbRrJlPllkjBJMZJm9h0cZx0+Dc=",
  "live2dcubismcore.min.js": "sha256-Ja6TjLT+KCzhibNXvMl+YD0eH37Hi/BBUNQBwjzceS8=",
  "live2d.min.js": "sha256-ITXHawpj0PbJxI33RtDuxurRMZmbpvlnhIhHLpXh7dY=",
  "waifu-tips.js": "sha256-s+QrpEtxRS4Tv92mXohsSK/CMYSLEGE/RQtHFQ6/cnY="
};
  window.__giraffishLive2DLoading = true;

  async function readAsset(name) {
    const response = await fetch(new URL(name, base), {
      mode: 'cors', credentials: 'omit', integrity: integrity[name]
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
