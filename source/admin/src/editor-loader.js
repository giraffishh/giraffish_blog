let pending;
export function loadEditor() {
  return pending ||= import('./studio.js').catch(error => {
    pending = null;
    throw error;
  });
}
export function warmEditor() {
  const warm = () => loadEditor().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(warm, {timeout:2500});
  else setTimeout(warm, 1500);
}
