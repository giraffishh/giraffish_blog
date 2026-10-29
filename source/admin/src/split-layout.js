export const DEFAULT_SOURCE_FIRST = true;

export function clampRatio(value) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));
}

export function dividerRatio(mode, ratio, sourceFirst = DEFAULT_SOURCE_FIRST) {
  if (mode === 'split') return clampRatio(ratio);
  return (mode === 'render') !== sourceFirst ? 100 : 0;
}

export function modeAtRatio(value, sourceFirst = DEFAULT_SOURCE_FIRST) {
  const ratio = clampRatio(value);
  return ratio <= 4 ? (sourceFirst ? 'render' : 'source') : ratio >= 96 ? (sourceFirst ? 'source' : 'render') : 'split';
}