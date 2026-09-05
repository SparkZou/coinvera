// Walks src/, runs the i18n transform in collect-only mode, and writes:
//   src/locales/source.json      — sorted list of every source (zh) key
//   src/locales/{en,ja,ko}.json  — translation maps (existing values kept,
//                                   new keys added as "" placeholders,
//                                   stale keys pruned)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform, hasCJK } from './transform.mjs'
import { isExcluded } from './config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'src')
const LOC = path.join(SRC, 'locales')

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

const sink = new Set()
let files = 0
for (const file of walk(SRC)) {
  const rel = path.relative(root, file)
  if (isExcluded(rel)) continue
  const code = fs.readFileSync(file, 'utf8')
  if (!hasCJK(code)) continue
  try {
    transform(code, file, sink)
    files++
  } catch (e) {
    console.error('extract failed:', rel, e.message)
  }
}

const keys = [...sink].sort((a, b) => a.localeCompare(b, 'zh'))
fs.mkdirSync(LOC, { recursive: true })
fs.writeFileSync(path.join(LOC, 'source.json'), JSON.stringify(keys, null, 2) + '\n')

for (const lang of ['en', 'ja', 'ko']) {
  const f = path.join(LOC, `${lang}.json`)
  let cur = {}
  if (fs.existsSync(f)) cur = JSON.parse(fs.readFileSync(f, 'utf8'))
  const next = {}
  let translated = 0
  for (const k of keys) {
    next[k] = cur[k] || ''
    if (next[k]) translated++
  }
  fs.writeFileSync(f, JSON.stringify(next, null, 2) + '\n')
  console.log(`${lang}.json: ${translated}/${keys.length} translated`)
}

console.log(`\nScanned ${files} files, ${keys.length} unique source strings.`)
