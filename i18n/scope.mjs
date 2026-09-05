import fs from 'node:fs'
import path from 'node:path'
import { transform, hasCJK } from './transform.mjs'
import { isExcluded } from './config.mjs'

function walk(d, o = []) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p, o) : /\.(ts|tsx)$/.test(n) && o.push(p) } return o }

// A file is "deep admin" if it is one of the big back-office page bundles.
const DEEP_ADMIN = /src\/pages\/admin\/(g1|g2|g3|g4)\.tsx$/

const front = new Set()
const adminDeep = new Set()
for (const f of walk('src')) {
  const rel = path.relative('.', f).replace(/\\/g, '/')
  if (isExcluded(rel)) continue
  const code = fs.readFileSync(f, 'utf8'); if (!hasCJK(code)) continue
  const s = new Set(); transform(code, f, s)
  const target = DEEP_ADMIN.test(rel) ? adminDeep : front
  for (const k of s) target.add(k)
}
// admin-only = in adminDeep but not shared with front
const adminOnly = [...adminDeep].filter(k => !front.has(k))
const frontKeys = [...front].sort((a, b) => a.localeCompare(b, 'zh'))
fs.writeFileSync('src/locales/priority.json', JSON.stringify(frontKeys, null, 2) + '\n')
fs.writeFileSync('src/locales/admin-only.json', JSON.stringify([...adminOnly].sort((a, b) => a.localeCompare(b, 'zh')), null, 2) + '\n')
console.log('priority (front + shared):', frontKeys.length)
console.log('admin-only (deep back-office):', adminOnly.length)
