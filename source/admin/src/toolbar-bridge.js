// React owns CMS actions; WritingStudio owns the editor. Portals join their
// controls without moving React-managed nodes or duplicating CMS state.
const listeners = new Set();
const studios = new Set();
const studioCollections = new Set();
const notify = () => { for (const listener of listeners) listener(); };
export const currentToolbar = () => [...studios].at(-1);
export const usesStudioEditor = collection => studioCollections.has(collection.get('name'));
export let previewLinksEnabled = true;
export let editorLoadFailure = null;

export function subscribeToolbar(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function attachToolbar(studio) {
  studios.add(studio);
  notify();
  return () => { studios.delete(studio); notify(); };
}
export function setEditorLoadFailure(failure = null) {
  if (editorLoadFailure === failure) return;
  editorLoadFailure = failure;
  notify();
}
function hasStudioField(node) {
  return node?.widget === 'studio-markdown' || ['fields','files','types'].some(key => node?.[key]?.some(hasStudioField));
}
export function configureToolbar(config) {
  previewLinksEnabled = config.show_preview_links !== false;
  studioCollections.clear();
  for (const collection of config.collections || []) if (hasStudioField(collection)) studioCollections.add(collection.name);
}
