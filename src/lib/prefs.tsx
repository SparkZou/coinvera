import React, { createContext, useContext, useEffect, useState } from 'react'
import { t as translate, getLang, setLang as setI18nLang, LANGS, type Lang } from '@/lib/i18n'

/* ------------------------------------------------------------------ *
 * Theme (dark / light) + Language (English / 中文 / 日本語 / 한국어)
 * Default language is English; the full dictionary lives in
 * src/locales and is resolved by @/lib/i18n.
 * ------------------------------------------------------------------ */

export type Theme = 'dark' | 'light'
export { LANGS, type Lang }

type Ctx = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, args?: unknown[] | Record<string, unknown>) => string
}

const PrefsCtx = createContext<Ctx>(null!)

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => {
      try { return (localStorage.getItem('theme') as Theme) || 'dark' } catch { return 'dark' }
    },
  )
  const [lang, setLangState] = useState<Lang>(() => getLang())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
    try { localStorage.setItem('theme', theme) } catch { /* ignore */ }
  }, [theme])

  // Language change reloads the page so module-scope data (wrapped at import)
  // re-evaluates in the new language along with the render-time strings.
  const setLang = (l: Lang) => {
    setI18nLang(l)
    setLangState(l)
    try { window.location.reload() } catch { /* SSR */ }
  }

  return (
    <PrefsCtx.Provider
      value={{
        theme, setTheme, lang, setLang, t: translate,
        toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      }}
    >
      {/* Remount the tree on language change so every render-time t() re-evaluates. */}
      <React.Fragment key={lang}>{children}</React.Fragment>
    </PrefsCtx.Provider>
  )
}

export const usePrefs = () => useContext(PrefsCtx)
