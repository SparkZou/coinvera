// List module-scope Chinese strings (front-office only) that are NOT yet in en.json.
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import { isExcluded } from './config.mjs'
const traverse = _traverse.default || _traverse
const HAN = /[一-鿿]/
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'))
const has = (k) => en[k] && en[k].length
const SKIP = /src\/(pages\/admin\/(g1|g2|g3|g4)|mock\/(admin|funcList))/
function walk(d, o = []) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p, o) : /\.(ts|tsx)$/.test(n) && o.push(p) } return o }
const missing = new Map()
for (const f of walk('src')) {
  const rel = path.relative('.', f).replace(/\\/g, '/')
  if (isExcluded(rel) || SKIP.test(rel)) continue
  const code = fs.readFileSync(f, 'utf8'); if (!HAN.test(code)) continue
  const isTsx = /\.(tsx|jsx)$/.test(f)
  let ast; try { ast = parse(code, { sourceType: 'module', plugins: isTsx ? ['typescript', 'jsx'] : ['typescript'] }) } catch { continue }
  traverse(ast, {
    StringLiteral(p) {
      const v = p.node.value
      if (!HAN.test(v)) return
      if (p.getFunctionParent()) return
      const par = p.parentPath
      if (par.isObjectProperty() && par.node.key === p.node && !par.node.computed) return
      if (!has(v)) { if (!missing.has(v)) missing.set(v, rel) }
    },
  })
}
const arr = [...missing.keys()]
fs.writeFileSync('i18n/missing.json', JSON.stringify(arr, null, 2) + '\n')
console.log(`missing: ${arr.length}`)
arr.forEach(k => console.log(k))
