import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// @ts-expect-error - plain ESM helper, no types
import { transform as i18nTransform } from './i18n/transform.mjs'
// @ts-expect-error - plain ESM helper, no types
import { isExcluded } from './i18n/config.mjs'

// Normalize to forward slashes — Vite ids use "/" even on Windows, but
// path.resolve() returns "\" there, so a raw startsWith never matches.
const SRC = path.resolve(__dirname, 'src').replace(/\\/g, '/')

/** Build-time i18n: wrap Chinese render-time literals in t(). Runs before JSX compile. */
function i18n(): Plugin {
  return {
    name: 'i18n-source-transform',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0].replace(/\\/g, '/')
      if (!file.startsWith(SRC)) return null
      if (!/\.(ts|tsx)$/.test(file)) return null
      const rel = path.relative(__dirname, file).replace(/\\/g, '/')
      if (isExcluded(rel)) return null
      if (!/[一-鿿]/.test(code)) return null
      const out = i18nTransform(code, file, null)
      if (!out.changed) return null
      return { code: out.code, map: null }
    },
  }
}

export default defineConfig({
  plugins: [i18n(), react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
