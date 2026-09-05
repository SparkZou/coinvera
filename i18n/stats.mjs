import fs from 'node:fs'
import path from 'node:path'
import { transform, hasCJK } from './transform.mjs'
import { isExcluded } from './config.mjs'
function walk(d, o = []) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p, o) : /\.(ts|tsx)$/.test(n) && o.push(p) } return o }
const rows = []; const byDir = {}
for (const f of walk('src')) {
  const rel = path.relative('.', f).replace(/\\/g, '/')
  if (isExcluded(rel)) continue
  const code = fs.readFileSync(f, 'utf8'); if (!hasCJK(code)) continue
  const s = new Set(); transform(code, f, s)
  rows.push([s.size, rel])
  const d = rel.split('/').slice(1, 3).join('/'); byDir[d] = (byDir[d] || 0) + s.size
}
rows.sort((a, b) => a[0] - b[0])
let total = 0; for (const [n, f] of rows) { total += n; console.log(String(n).padStart(5), f) }
console.log('TOTAL(dup across files)', total)
console.log('\n--- by dir ---')
for (const [d, n] of Object.entries(byDir).sort((a, b) => a[1] - b[1])) console.log(String(n).padStart(5), d)
