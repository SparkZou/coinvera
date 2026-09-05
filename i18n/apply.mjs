// Apply index-aligned translation chunks to the locale files.
//
//   i18n/staging/<lang>/*.json   { "start": <int>, "items": ["...", ...] }
//
// items[i] is the translation of priority[start + i]  (priority.json order is
// stable).  Empty strings are treated as "not translated".  Also merges any
// object-form chunks in i18n/translations/<lang>/*.json (keyed by zh source),
// handy for shared strings.  Writes src/locales/{en,ja,ko}.json over the full
// source key set and reports coverage + errors.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOC = path.join(root, 'src', 'locales')

const source = JSON.parse(fs.readFileSync(path.join(LOC, 'source.json'), 'utf8'))
const sourceSet = new Set(source)
const priority = JSON.parse(fs.readFileSync(path.join(LOC, 'priority.json'), 'utf8'))

for (const lang of ['en', 'ja', 'ko']) {
  const merged = {}
  const errors = []
  const extra = new Set()

  // object-form (keyed by zh source) FIRST. Keys not in the extracted set
  // are "data-dictionary" strings (module-scope data wrapped by hand at the
  // render site, e.g. funcList / market groups). Priority staging below
  // overrides any shared key so UI wording always wins over data wording.
  const odir = path.join(root, 'i18n', 'translations', lang)
  if (fs.existsSync(odir)) {
    for (const f of fs.readdirSync(odir).filter((x) => x.endsWith('.json'))) {
      const obj = JSON.parse(fs.readFileSync(path.join(odir, f), 'utf8'))
      for (const [k, v] of Object.entries(obj)) {
        if (!v) continue
        merged[k] = v
        if (!sourceSet.has(k)) extra.add(k)
      }
    }
  }

  // index-aligned staging (priority UI strings) — wins over object-form.
  const sdir = path.join(root, 'i18n', 'staging', lang)
  if (fs.existsSync(sdir)) {
    for (const f of fs.readdirSync(sdir).filter((x) => x.endsWith('.json'))) {
      const { start, items } = JSON.parse(fs.readFileSync(path.join(sdir, f), 'utf8'))
      if (typeof start !== 'number' || !Array.isArray(items)) { errors.push(`${f}: bad shape`); continue }
      items.forEach((v, i) => {
        if (!v) return
        const key = priority[start + i]
        if (key === undefined) { errors.push(`${f}: index ${start + i} out of range`); return }
        merged[key] = v
      })
    }
  }

  const out = {}
  for (const k of source) out[k] = merged[k] || ''
  for (const k of extra) out[k] = merged[k]
  fs.writeFileSync(path.join(LOC, `${lang}.json`), JSON.stringify(out, null, 2) + '\n')

  const done = Object.values(out).filter(Boolean).length
  const prioDone = priority.filter((k) => out[k]).length
  console.log(`[${lang}] total ${done}/${source.length} · priority ${prioDone}/${priority.length} (${(prioDone / priority.length * 100).toFixed(1)}%)`)
  if (errors.length) { console.log(`  ⚠ ${errors.length} issue(s):`); errors.slice(0, 15).forEach((e) => console.log('    ' + e)) }
}
