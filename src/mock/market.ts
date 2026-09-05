import { seeded } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * Market data — deterministic mock. Mirrors the shape the real
 * WebSocket feed will push in Phase 1 (ticker / depth / kline / trade).
 * ------------------------------------------------------------------ */

export type Ticker = {
  symbol: string          // BTC/USDT
  base: string
  quote: string
  price: number
  change: number          // 24h %
  high: number
  low: number
  volume: number          // 24h base volume
  turnover: number        // 24h quote volume
  sparkline: number[]
  tags?: ('hot' | 'new')[]
}

const COINS: [string, number, number][] = [
  // base, price, 24h change
  ['BTC', 97_842.31, 2.34], ['ETH', 3_412.88, -1.12], ['SOL', 218.42, 5.67],
  ['BNB', 692.15, 0.84], ['XRP', 2.4183, -3.21], ['DOGE', 0.38412, 8.92],
  ['ADA', 1.0234, -0.45], ['AVAX', 42.318, 3.11], ['LINK', 24.882, 1.94],
  ['TON', 5.6712, -2.08], ['DOT', 8.4127, 0.32], ['MATIC', 0.5821, -4.17],
  ['LTC', 108.42, 1.28], ['SHIB', 0.00002418, 6.44], ['UNI', 14.281, -1.83],
  ['ATOM', 7.8412, 2.05], ['NEAR', 6.2184, 4.38], ['APT', 11.842, -2.61],
  ['ARB', 0.9184, 3.72], ['OP', 2.1841, -1.05], ['FIL', 5.8214, 0.91],
  ['INJ', 28.412, 7.18], ['SUI', 4.8213, 9.24], ['SEI', 0.4821, -5.12],
]

function spark(seed: number, up: boolean): number[] {
  const r = seeded(seed)
  const out: number[] = []
  let v = 50
  for (let i = 0; i < 32; i++) {
    v += (r() - (up ? 0.42 : 0.58)) * 8
    out.push(Math.max(5, Math.min(95, v)))
  }
  return out
}

export const TICKERS: Ticker[] = COINS.map(([base, price, change], i) => {
  const r = seeded(i * 977 + 13)
  const vol = (r() * 90_000 + 4_000) * (base === 'BTC' ? 0.6 : 30)
  return {
    symbol: `${base}/USDT`,
    base,
    quote: 'USDT',
    price,
    change,
    high: price * (1 + Math.abs(change) / 100 + r() * 0.01),
    low: price * (1 - Math.abs(change) / 100 - r() * 0.01),
    volume: vol,
    turnover: vol * price,
    sparkline: spark(i * 31 + 7, change >= 0),
    tags: i < 3 ? ['hot'] : i >= 21 ? ['new'] : undefined,
  }
})

export const bySymbol = (s: string) => TICKERS.find(t => t.symbol === s) ?? TICKERS[0]

/** Markets are grouped into 市场 (multi-market support per Function List). */
export const MARKET_GROUPS = [
  { id: 'fav',  label: '自选',  symbols: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] },
  { id: 'usdt', label: 'USDT',  symbols: TICKERS.map(t => t.symbol) },
  { id: 'btc',  label: 'BTC',   symbols: ['ETH/USDT', 'SOL/USDT', 'BNB/USDT'] },
  { id: 'hot',  label: '热门',  symbols: TICKERS.filter(t => t.tags?.includes('hot')).map(t => t.symbol) },
  { id: 'new',  label: '新币',  symbols: TICKERS.filter(t => t.tags?.includes('new')).map(t => t.symbol) },
]

/* -------------------------------- Order book ------------------------------- */
export type Level = { price: number; size: number; total: number }

export function orderbook(mid: number, seed = 1, depth = 22): { asks: Level[]; bids: Level[] } {
  const r = seeded(seed)
  const tick = mid > 1000 ? 0.1 : mid > 1 ? 0.0001 : 0.00000001
  const mk = (dir: 1 | -1) => {
    const out: Level[] = []
    let total = 0
    for (let i = 0; i < depth; i++) {
      const price = mid + dir * tick * (i + 1) * (1 + Math.floor(r() * 3))
      const size = +(r() * (mid > 1000 ? 2.4 : 4000) + 0.02).toFixed(mid > 1000 ? 4 : 1)
      total += size
      out.push({ price, size, total })
    }
    return out
  }
  return { asks: mk(1).reverse(), bids: mk(-1) }
}

/* ---------------------------------- Trades --------------------------------- */
export type Trade = { ts: number; price: number; size: number; side: 'buy' | 'sell' }

export function trades(mid: number, seed = 2, n = 40): Trade[] {
  const r = seeded(seed)
  const now = Date.now()
  return Array.from({ length: n }, (_, i) => {
    const side = r() > 0.5 ? 'buy' : 'sell'
    return {
      ts: now - i * (3_000 + Math.floor(r() * 12_000)),
      price: mid * (1 + (r() - 0.5) * 0.0016),
      size: +(r() * (mid > 1000 ? 0.9 : 2400) + 0.001).toFixed(mid > 1000 ? 5 : 2),
      side: side as 'buy' | 'sell',
    }
  })
}

/* ---------------------------------- Klines --------------------------------- */
export type Candle = { time: number; open: number; high: number; low: number; close: number; value: number }

export function klines(mid: number, seed = 3, n = 240, stepSec = 900): Candle[] {
  const r = seeded(seed)
  const out: Candle[] = []
  // Walk backwards from mid so the last close === current price.
  const closes: number[] = [mid]
  for (let i = 1; i < n; i++) {
    closes.unshift(closes[0] / (1 + (r() - 0.495) * 0.014))
  }
  const startSec = Math.floor(Date.now() / 1000 / stepSec) * stepSec - (n - 1) * stepSec
  for (let i = 0; i < n; i++) {
    const close = closes[i]
    const open = i === 0 ? close / (1 + (r() - 0.5) * 0.01) : closes[i - 1]
    const wick = Math.abs(close - open) + close * (r() * 0.004 + 0.0008)
    out.push({
      time: startSec + i * stepSec,
      open,
      close,
      high: Math.max(open, close) + wick * r(),
      low: Math.min(open, close) - wick * r(),
      value: r() * 900 + 60,
    })
  }
  return out
}

export const INTERVALS = ['1m', '5m', '15m', '1H', '4H', '1D', '1W'] as const
export type Interval = typeof INTERVALS[number]
export const INTERVAL_SEC: Record<Interval, number> = {
  '1m': 60, '5m': 300, '15m': 900, '1H': 3600, '4H': 14400, '1D': 86400, '1W': 604800,
}
