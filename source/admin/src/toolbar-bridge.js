// React owns CMS actions; WritingStudio owns the editor. Portals join their
// controls without moving React-managed nodes or duplicating CMS state.
const listeners = new Set();
const studios = new Set();
export const currentToolbar = () => [...studios].at(-1);
export function subscribeToolbar(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function attachToolbar(studio) {
  studios.add(studio);
  for (const listener of listeners) listener();
  return () => {
    studios.delete(studio);
    for (const listener of listeners) listener();
  };
}

export let previewLinksEnabled = true;
export function configureToolbar(config) {
  previewLinksEnabled = config.show_preview_links !== false;
}
