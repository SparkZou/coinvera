// ------------------------------------------------------------------ //
//  Build-time i18n extraction + transform (shared by Vite plugin and  //
//  the extract CLI).                                                   //
//                                                                      //
//  Wraps every Chinese-containing string literal / JSX text /          //
//  template literal that executes *inside a function* (i.e. at render   //
//  time) with a call to `t('<source>')`.  The source language (zh) is  //
//  the key; `t` resolves it to the active language at render time and   //
//  falls back to the source string when a translation is missing, so   //
//  the app never breaks on an incomplete dictionary.                    //
//                                                                      //
//  Module-scope literals are deliberately left alone (they would be     //
//  frozen at import time and could not react to a language switch);     //
//  those few UI arrays are converted to render-time `t()` by hand.      //
// ------------------------------------------------------------------ //
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import _generate from '@babel/generator'
import _types from '@babel/types'

const traverse = _traverse.default || _traverse
const generate = _generate.default || _generate
const bt = _types.default || _types

const HAN = /[㐀-䶿一-鿿豈-﫿]/
export const hasCJK = (s) => typeof s === 'string' && HAN.test(s)

// Collapse internal whitespace so "  行情\n   报价 " keys stably.
const norm = (s) => s.replace(/\s+/g, ' ').trim()

const I18N_MODULE = '@/lib/i18n'
// Collision-proof local name: the codebase uses `t` as a map/cell param in
// ~100 places, so the injected translator is bound as `$t`.
const FN = '$t'

function isTArg(path) {
  const p = path.parentPath
  return (
    p &&
    p.isCallExpression() &&
    p.node.callee &&
    p.node.callee.type === 'Identifier' &&
    p.node.callee.name === FN &&
    p.node.arguments[0] === path.node
  )
}

/**
 * @param {string} code  source
 * @param {string} id    file path (decides jsx/ts parser plugins)
 * @param {Set<string>} sink  collects every source string wrapped
 * @param {{moduleScope?: boolean}} [opts]  also wrap module-scope literals
 *        (data arrays). Requires a reload on language change so they
 *        re-evaluate. Used for front-office files whose data is fully
 *        translated; off for admin/mock-admin/funcList and for extraction.
 * @returns {{ code: string, changed: boolean }}
 */
export function transform(code, id, sink, opts = {}) {
  const moduleScope = !!opts.moduleScope
  const isTsx = id.endsWith('.tsx') || id.endsWith('.jsx')
  const plugins = isTsx ? ['typescript', 'jsx'] : ['typescript']

  let ast
  try {
    ast = parse(code, { sourceType: 'module', plugins })
  } catch {
    return { code, changed: false }
  }

  let changed = false
  let hasImport = false

  const record = (raw) => {
    const key = norm(raw)
    if (!key) return null
    if (sink) sink.add(key)
    return key
  }
  const call = (key) => bt.callExpression(bt.identifier(FN), [bt.stringLiteral(key)])

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === I18N_MODULE) {
        for (const s of path.node.specifiers) {
          if (s.type === 'ImportSpecifier' && s.local.name === FN) hasImport = true
        }
      }
    },

    StringLiteral(path) {
      if (!hasCJK(path.node.value)) return
      if (!moduleScope && !path.getFunctionParent()) return   // module scope → skip unless opted in
      if (isTArg(path)) return
      const p = path.parentPath
      if (p.isImportDeclaration() || p.isExportDeclaration()) return
      // object property KEY (not value)
      if (p.isObjectProperty() && p.node.key === path.node && !p.node.computed) return
      if (p.isTSLiteralType && p.isTSLiteralType()) return

      const key = record(path.node.value)
      if (key == null) return

      if (p.isJSXAttribute() && p.node.value === path.node) {
        path.replaceWith(bt.jsxExpressionContainer(call(key)))
      } else {
        path.replaceWith(call(key))
      }
      changed = true
      path.skip()
    },

    JSXText(path) {
      const raw = path.node.value
      if (!hasCJK(raw)) return
      const key = record(raw)
      if (key == null) return
      const lead = /^\s/.test(raw) ? ' ' : ''
      const tail = /\s$/.test(raw) ? ' ' : ''
      const parts = []
      if (lead) parts.push(bt.jsxText(lead))
      parts.push(bt.jsxExpressionContainer(call(key)))
      if (tail) parts.push(bt.jsxText(tail))
      path.replaceWithMultiple(parts)
      changed = true
    },

    TemplateLiteral(path) {
      if (path.parentPath.isTaggedTemplateExpression()) return
      if (!moduleScope && !path.getFunctionParent()) return
      if (isTArg(path)) return
      const quasis = path.node.quasis
      const exprs = path.node.expressions
      const cooked = quasis.map((q) => (q.value.cooked ?? q.value.raw))
      if (!cooked.some((c) => hasCJK(c))) return
      // Rebuild "a {0} b {1}" keeping placeholders for expressions.
      let keyRaw = ''
      for (let i = 0; i < cooked.length; i++) {
        keyRaw += cooked[i]
        if (i < exprs.length) keyRaw += `{${i}}`
      }
      const key = record(keyRaw)
      if (key == null) return
      const args = [bt.stringLiteral(key)]
      if (exprs.length) args.push(bt.arrayExpression(exprs))
      path.replaceWith(bt.callExpression(bt.identifier(FN), args))
      changed = true
      path.skip()
    },
  })

  if (!changed) return { code, changed: false }

  if (!hasImport) {
    ast.program.body.unshift(
      bt.importDeclaration(
        [bt.importSpecifier(bt.identifier(FN), bt.identifier('t'))],
        bt.stringLiteral(I18N_MODULE),
      ),
    )
  }

  const out = generate(ast, { retainLines: false, compact: false, comments: true, jsescOption: { minimal: true } }, code)
  return { code: out.code, changed: true }
}
