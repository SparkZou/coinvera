/* ------------------------------------------------------------------ *
 * Runtime i18n.  Source language is Chinese (the key); translations
 * live in ./locales/{en,ja,ko}.json.  `t()` resolves the active
 * language and falls back  lang -> en -> source  so an incomplete
 * dictionary degrades to English (the primary language) and never
 * breaks the UI.
 *
 * Call sites are generated at build time by i18n/transform.mjs, which
 * wraps every Chinese literal / JSX text that runs during render.
 * ------------------------------------------------------------------ */
import en from '@/locales/en.json'
import ja from '@/locales/ja.json'
import ko from '@/locales/ko.json'

export type Lang = 'en' | 'zh' | 'ja' | 'ko'

export const LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'zh', label: '简体中文', flag: '🇨🇳' },
  { id: 'ja', label: '日本語', flag: '🇯🇵' },
  { id: 'ko', label: '한국어', flag: '🇰🇷' },
]

const DICTS: Record<Exclude<Lang, 'zh'>, Record<string, string>> = {
  en: en as Record<string, string>,
  ja: ja as Record<string, string>,
  ko: ko as Record<string, string>,
}

const DEFAULT_LANG: Lang = 'en'

function read(): Lang {
  try {
    const v = localStorage.getItem('lang') as Lang | null
    if (v === 'en' || v === 'zh' || v === 'ja' || v === 'ko') return v
  } catch { /* SSR / blocked storage */ }
  return DEFAULT_LANG
}

let LANG: Lang = read()

export const getLang = (): Lang => LANG
export function setLang(l: Lang) {
  LANG = l
  try { localStorage.setItem('lang', l); document.documentElement.lang = l } catch { /* ignore */ }
}

function resolve(key: string): string {
  if (LANG === 'zh') return key
  const hit = DICTS[LANG]?.[key]
  if (hit) return hit
  const enHit = DICTS.en?.[key]           // fall back to primary language
  if (enHit) return enHit
  return key                               // last resort: source string
}

/** Interpolate {0}/{1} (from template literals) or {name} tokens. */
function interpolate(s: string, args?: unknown[] | Record<string, unknown>): string {
  if (args == null) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => {
    const v = Array.isArray(args) ? args[Number(k)] : (args as Record<string, unknown>)[k]
    return v == null ? m : String(v)
  })
}

export function t(key: string, args?: unknown[] | Record<string, unknown>): string {
  return interpolate(resolve(key), args)
}
