// Merge hand-authored translation chunks into src/locales/{en,ja,ko}.json.
//
//   i18n/translations/<lang>/*.json   { "<zh source>": "<translation>", ... }
//
// Output locale files contain the full source key set (from source.json);
// values come from the chunks, "" when untranslated.  Reports coverage and
// flags any chunk key that does not match a real source string (typos).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOC = path.join(root, 'src', 'locales')
const TR = path.join(root, 'i18n', 'translations')

const source = JSON.parse(fs.readFileSync(path.join(LOC, 'source.json'), 'utf8'))
const sourceSet = new Set(source)
const priority = JSON.parse(fs.readFileSync(path.join(LOC, 'priority.json'), 'utf8'))
const prioritySet = new Set(priority)

for (const lang of ['en', 'ja', 'ko']) {
  const dir = path.join(TR, lang)
  const merged = {}
  let unmatched = []
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const obj = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      for (const [k, v] of Object.entries(obj)) {
        if (!v) continue
        if (!sourceSet.has(k)) { unmatched.push([f, k]); continue }
        merged[k] = v
      }
    }
  }
  const out = {}
  for (const k of source) out[k] = merged[k] || ''
  fs.writeFileSync(path.join(LOC, `${lang}.json`), JSON.stringify(out, null, 2) + '\n')

  const total = source.length
  const done = Object.values(out).filter(Boolean).length
  const prioDone = priority.filter((k) => out[k]).length
  console.log(`\n[${lang}] ${done}/${total} total · priority ${prioDone}/${prioritySet.size} (${(prioDone / prioritySet.size * 100).toFixed(1)}%)`)
  if (unmatched.length) {
    console.log(`  ⚠ ${unmatched.length} unmatched keys (typos / stale):`)
    for (const [f, k] of unmatched.slice(0, 20)) console.log(`    ${f}: ${JSON.stringify(k)}`)
    if (unmatched.length > 20) console.log(`    …and ${unmatched.length - 20} more`)
  }
}
