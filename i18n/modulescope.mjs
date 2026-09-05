// Report Chinese string literals that live at MODULE scope (data arrays) —
// exactly the strings the render-time transform skips. These are the ones
// that must be translated via object-form dicts + wrapped at render sites.
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import { isExcluded } from './config.mjs'
const traverse = _traverse.default || _traverse
const HAN = /[一-鿿]/
function walk(d, o = []) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p, o) : /\.(ts|tsx)$/.test(n) && o.push(p) } return o }

const byFile = {}
for (const f of walk('src')) {
  const rel = path.relative('.', f).replace(/\\/g, '/')
  if (isExcluded(rel)) continue
  const code = fs.readFileSync(f, 'utf8'); if (!HAN.test(code)) continue
  const isTsx = /\.(tsx|jsx)$/.test(f)
  let ast; try { ast = parse(code, { sourceType: 'module', plugins: isTsx ? ['typescript', 'jsx'] : ['typescript'] }) } catch { continue }
  const hits = new Set()
  traverse(ast, {
    StringLiteral(p) {
      if (!HAN.test(p.node.value)) return
      if (p.getFunctionParent()) return           // in-render → handled by transform
      const par = p.parentPath
      if (par.isObjectProperty() && par.node.key === p.node && !par.node.computed) return
      hits.add(p.node.value)
    },
    TemplateLiteral(p) {
      if (p.getFunctionParent()) return
      const raw = p.node.quasis.map(q => q.value.cooked || '').join('{}')
      if (HAN.test(raw)) hits.add('`' + raw + '`')
    },
  })
  if (hits.size) byFile[rel] = [...hits]
}
let total = 0
for (const [f, hits] of Object.entries(byFile).sort((a, b) => a[1].length - b[1].length)) {
  total += hits.length
  console.log(`\n### ${f} (${hits.length})`)
  hits.forEach(h => console.log('  ' + h))
}
console.log(`\nTOTAL module-scope Chinese strings: ${total} in ${Object.keys(byFile).length} files`)
