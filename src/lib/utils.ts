export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/** Deterministic PRNG so the prototype looks identical on every reload. */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export function num(v: number, dp = 2) {
  return v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

export function usd(v: number, dp = 2) {
  return '$' + num(v, dp)
}

export function pct(v: number, dp = 2) {
  return (v >= 0 ? '+' : '') + v.toFixed(dp) + '%'
}

export function compact(v: number) {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(2) + 'K'
  return v.toFixed(2)
}

/** Price decimals by magnitude — mirrors how real exchanges tick. */
export function priceDp(p: number) {
  if (p >= 1000) return 2
  if (p >= 1) return 4
  if (p >= 0.01) return 5
  return 8
}

export function shortAddr(a: string, head = 8, tail = 6) {
  return a.length <= head + tail ? a : `${a.slice(0, head)}…${a.slice(-tail)}`
}

export function timeAgo(ts: number) {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60) return `${d}s`
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

export function fmtTime(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function fmtDateTime(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
