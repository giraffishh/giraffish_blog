export function clampRatio(value) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));
}

export function modeAtRatio(value) {
  const ratio = clampRatio(value);
  return ratio <= 4 ? 'render' : ratio >= 96 ? 'source' : 'split';
}
