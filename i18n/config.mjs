// Files under src/ that the i18n transform must NOT touch.
export const EXCLUDE = [
  'src/lib/i18n.ts',
  'src/lib/prefs.tsx',
  'src/lib/utils.ts',
  'src/main.tsx',
]

export function isExcluded(rel) {
  const p = rel.replace(/\\/g, '/')
  if (p.includes('/locales/')) return true
  return EXCLUDE.some((e) => p.endsWith(e))
}
