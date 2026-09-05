import { t } from '@/lib/i18n'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Info, Star } from 'lucide-react'
import { cn, num, pct, compact, priceDp, fmtTime } from '@/lib/utils'
import {
  TICKERS, MARKET_GROUPS, bySymbol, klines, INTERVALS, INTERVAL_SEC,
  type Interval, type Level, type Trade,
} from '@/mock/market'
import { CandleChart, DepthChart, Sparkline } from '@/components/charts'
import { SearchBox, Badge } from '@/components/ui'

/* ================================================================== *
 * Shared terminal parts — used by both Spot.tsx and Futures.tsx.
 * ================================================================== */

/* ------------------------------- primitives ------------------------------- */

/** Flush panel with a 36px header strip — the building block of the terminal grid. */
export function Panel({
  title, right, children, className, bodyClass, pad,
}: {
  title?: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClass?: string
  pad?: boolean
}) {
  return (
    <section className={cn('flex flex-col min-h-0 bg-surface', className)}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-2 h-9 px-3 border-b border-line shrink-0">
          <div className="text-xs font-semibold truncate">{title}</div>
          {right && <div className="flex items-center gap-1 shrink-0">{right}</div>}
        </header>
      )}
      <div className={cn('flex-1 min-h-0', pad && 'p-3', bodyClass)}>{children}</div>
    </section>
  )
}

/** Dense segmented control — the terminal's workhorse toggle. */
export function Seg<T extends string>({
  value, onChange, items, className, tone = 'plain', size = 'sm',
}: {
  value: T
  onChange: (v: T) => void
  items: { id: T; label: React.ReactNode }[]
  className?: string
  tone?: 'plain' | 'brand'
  size?: 'xs' | 'sm'
}) {
  const active = tone === 'brand'
    ? 'bg-brand/10 text-brand font-semibold'
    : 'bg-line/70 text-ink font-semibold'
  return (
    <div className={cn(
      'inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated border border-line',
      className,
    )}>
      {items.map(i => (
        <button
          key={i.id}
          type="button"
          onClick={() => onChange(i.id)}
          className={cn(
            'rounded-md transition-colors whitespace-nowrap',
            size === 'xs' ? 'px-1.5 py-0.5 text-2xs' : 'px-2.5 py-1 text-2xs',
            value === i.id ? active : 'text-muted hover:text-ink',
          )}
        >
          {t(i.label)}
        </button>
      ))}
    </div>
  )
}

/** Label/value cell for the ticker bar. */
export function StatCell({
  label, value, className, tip,
}: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
  tip?: string
}) {
  return (
    <div className={cn('px-3 py-0.5 flex flex-col justify-center', className)}>
      <div className="text-2xs text-faint whitespace-nowrap flex items-center gap-1">
        {label}
        {tip && <InfoTip text={tip} />}
      </div>
      <div className="text-xs tnum mt-0.5 whitespace-nowrap font-medium">{value}</div>
    </div>
  )
}

/** Hover tooltip — opens downward so it survives inside clipped rows. */
export function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('relative inline-flex group align-middle', className)}>
      <Info className="w-3 h-3 text-faint hover:text-info cursor-help" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:block z-50
                       w-56 rounded-lg border border-line bg-surface p-2 text-2xs text-muted leading-relaxed shadow-2xl normal-case">
        {text}
      </span>
    </span>
  )
}

/** Key → value row used all over the order forms and risk panels. */
export function KV({
  k, v, tone, className,
}: { k: React.ReactNode; v: React.ReactNode; tone?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 text-2xs', className)}>
      <span className="text-muted flex items-center gap-1">{k}</span>
      <span className={cn('tnum font-medium', tone ?? 'text-ink')}>{v}</span>
    </div>
  )
}

/** Toast — order placed / cancelled feedback. */
export function Toast({ msg, tone = 'up' }: { msg: string | null; tone?: 'up' | 'down' | 'brand' }) {
  if (!msg) return null
  const tones = { up: 'border-up/40 text-up', down: 'border-down/40 text-down', brand: 'border-brand/40 text-brand' }
  return (
    <div className={cn(
      'fixed z-50 bottom-20 lg:bottom-6 right-4 lg:right-6 px-3.5 py-2.5 rounded-xl',
      'bg-surface border shadow-2xl text-xs font-medium animate-fade-in', tones[tone],
    )}>
      {msg}
    </div>
  )
}

/* ------------------------------ market picker ----------------------------- */

export function MarketPicker({
  sym, kind, className,
}: { sym: string; kind: 'spot' | 'futures'; className?: string }) {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [group, setGroup] = useState(MARKET_GROUPS[1].id)
  const [favs, setFavs] = useState<string[]>(MARKET_GROUPS[0].symbols)
  const box = useRef<HTMLDivElement>(null)
  const t = bySymbol(sym)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const rows = useMemo(() => {
    const g = MARKET_GROUPS.find(x => x.id === group)
    const allow = group === 'fav' ? favs : (g?.symbols ?? [])
    return TICKERS
      .filter(x => allow.includes(x.symbol))
      .filter(x => !q || x.symbol.toLowerCase().includes(q.toLowerCase()))
  }, [group, q, favs])

  const go = (s: string) => {
    setOpen(false); setQ('')
    nav(`/trade/${kind}/${s.replace('/', '-')}`)
  }

  return (
    <div ref={box} className={cn('relative shrink-0', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-full px-2 -ml-1 rounded-lg hover:bg-elevated transition-colors"
      >
        <span className="text-base font-semibold tracking-tight">
          {t.base}<span className="text-muted font-medium">/{t.quote}</span>
        </span>
        {kind === 'futures' && <Badge tone="warn">永续</Badge>}
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-[400px] card shadow-2xl animate-fade-in overflow-hidden">
          <div className="p-2.5 border-b border-line">
            <SearchBox
              autoFocus
              placeholder="搜索币对 / Search"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 px-2.5 py-2 border-b border-line">
            {MARKET_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={cn(
                  'px-2 py-1 rounded-md text-2xs transition-colors',
                  group === g.id ? 'bg-elevated text-ink font-semibold' : 'text-muted hover:text-ink',
                )}
              >
                {t(g.label)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_84px_60px_56px] gap-2 px-3 py-1.5 text-2xs text-faint border-b border-line">
            <span>交易对</span>
            <span className="text-right">最新价</span>
            <span className="text-right">24h</span>
            <span className="text-right">趋势</span>
          </div>

          <div className="max-h-[340px] overflow-y-auto scroll-thin">
            {rows.length === 0 && (
              <div className="py-10 text-center text-xs text-faint">未找到匹配的交易对</div>
            )}
            {rows.map(r => {
              const up = r.change >= 0
              const fav = favs.includes(r.symbol)
              return (
                <div
                  key={r.symbol}
                  onClick={() => go(r.symbol)}
                  className={cn(
                    'grid grid-cols-[1fr_84px_60px_56px] gap-2 items-center px-3 py-1.5 cursor-pointer transition-colors',
                    r.symbol === sym ? 'bg-elevated' : 'hover:bg-elevated',
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setFavs(f => f.includes(r.symbol) ? f.filter(x => x !== r.symbol) : [...f, r.symbol])
                      }}
                      className="shrink-0"
                    >
                      <Star className={cn('w-3 h-3', fav ? 'text-brand fill-brand' : 'text-faint hover:text-muted')} />
                    </button>
                    <span className="text-xs font-medium truncate">
                      {r.base}<span className="text-faint">/{r.quote}</span>
                    </span>
                    {r.tags?.includes('hot') && <Badge tone="down">HOT</Badge>}
                    {r.tags?.includes('new') && <Badge tone="info">NEW</Badge>}
                  </span>
                  <span className="text-right text-xs tnum">{num(r.price, priceDp(r.price))}</span>
                  <span className={cn('text-right text-xs tnum', up ? 'text-up' : 'text-down')}>{pct(r.change)}</span>
                  <Sparkline data={r.sparkline} up={up} className="w-full h-5" />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------- ticker bar ------------------------------ */

export function TickerBar({
  sym, kind, extras, className,
}: { sym: string; kind: 'spot' | 'futures'; extras?: React.ReactNode; className?: string }) {
  const t = bySymbol(sym)
  const up = t.change >= 0
  const dp = priceDp(t.price)
  // The futures bar carries mark / index / funding as well — drop the softer
  // stats earlier so nothing ever overflows the terminal header.
  const hiLo = kind === 'futures' ? 'hidden xl:flex' : ''
  const volTo = kind === 'futures' ? 'hidden 2xl:flex' : 'hidden xl:flex'
  return (
    <div className={cn('flex items-stretch bg-surface border-b border-line px-3 py-1.5', className)}>
      <MarketPicker sym={sym} kind={kind} />

      <div className="flex items-center px-4 ml-2 border-l border-line">
        <div>
          <div className={cn('text-[1.35rem] leading-tight font-semibold tnum', up ? 'text-up' : 'text-down')}>
            {num(t.price, dp)}
          </div>
          <div className="text-2xs text-muted tnum leading-tight">${num(t.price, dp)}</div>
        </div>
      </div>

      <div className="flex items-stretch border-l border-line">
        <StatCell
          label="24h 涨跌"
          value={<span className={up ? 'text-up' : 'text-down'}>{pct(t.change)}</span>}
        />
        <StatCell label="24h 最高" value={num(t.high, dp)} className={hiLo} />
        <StatCell label="24h 最低" value={num(t.low, dp)} className={hiLo} />
        <StatCell label={`24h 量 (${t.base})`} value={compact(t.volume)} className={volTo} />
        <StatCell label={`24h 额 (${t.quote})`} value={compact(t.turnover)} className={volTo} />
        {extras}
      </div>
    </div>
  )
}

/* ------------------------------- chart panel ------------------------------ */

export function ChartPanel({
  price, seed, asks, bids, className, right,
}: {
  price: number
  seed: number
  asks: Level[]
  bids: Level[]
  className?: string
  right?: React.ReactNode
}) {
  const [iv, setIv] = useState<Interval>('15m')
  const [view, setView] = useState<'candle' | 'depth'>('candle')
  const data = useMemo(() => klines(price, seed, 240, INTERVAL_SEC[iv]), [price, seed, iv])

  return (
    <Panel
      className={className}
      title={
        <div className="flex items-center gap-1" data-fn="F-18">
          {INTERVALS.map(i => (
            <button
              key={i}
              onClick={() => setIv(i)}
              className={cn(
                'px-1.5 py-1 rounded-md text-2xs tnum transition-colors',
                iv === i ? 'bg-elevated text-brand font-semibold' : 'text-muted hover:text-ink',
              )}
            >
              {i}
            </button>
          ))}
        </div>
      }
      right={
        <>
          {right}
          <Seg
            value={view}
            onChange={setView}
            items={[{ id: 'candle', label: 'K 线' }, { id: 'depth', label: '深度图' }]}
          />
        </>
      }
      bodyClass="relative"
    >
      {view === 'candle'
        ? <CandleChart data={data} />
        : (
          <div className="w-full h-full p-3 pb-5">
            <DepthChart asks={asks} bids={bids} />
          </div>
        )}
    </Panel>
  )
}

/* -------------------------------- order book ------------------------------ */

type BookMode = 'both' | 'bids' | 'asks'

/** Re-bucket raw levels at the selected tick size and re-accumulate. */
function aggregate(levels: Level[], dp: number, side: 'ask' | 'bid'): Level[] {
  const step = Math.pow(10, -dp)
  const map = new Map<number, number>()
  for (const l of levels) {
    const raw = side === 'ask' ? Math.ceil(l.price / step) : Math.floor(l.price / step)
    const key = +(raw * step).toFixed(10)
    map.set(key, (map.get(key) ?? 0) + l.size)
  }
  const arr: Level[] = [...map.entries()].map(([price, size]) => ({ price, size, total: 0 }))
  // accumulate outward from the mid
  arr.sort((a, b) => side === 'ask' ? a.price - b.price : b.price - a.price)
  let run = 0
  for (const l of arr) { run += l.size; l.total = run }
  return side === 'ask' ? arr.reverse() : arr   // asks render high → low
}

export function OrderBook({
  asks, bids, last, up, onPick, base, quote, className, rowsBoth = 13,
}: {
  asks: Level[]
  bids: Level[]
  last: number
  up: boolean
  onPick: (p: number) => void
  base: string
  quote: string
  className?: string
  rowsBoth?: number
}) {
  const bd = priceDp(last)
  const dpOpts = [bd, Math.max(0, bd - 1), Math.max(0, bd - 2)]
    .filter((v, i, a) => a.indexOf(v) === i)
  const [dp, setDp] = useState(bd)
  const [mode, setMode] = useState<BookMode>('both')

  useEffect(() => { setDp(bd) }, [bd])

  const sizeDp = last > 1000 ? 4 : last > 1 ? 1 : 0
  const aAll = useMemo(() => aggregate(asks, dp, 'ask'), [asks, dp])
  const bAll = useMemo(() => aggregate(bids, dp, 'bid'), [bids, dp])

  const n = mode === 'both' ? rowsBoth : rowsBoth * 2 + 1
  const aRows = aAll.slice(Math.max(0, aAll.length - n))     // closest to mid
  const bRows = bAll.slice(0, n)
  const max = Math.max(
    aRows.length ? aRows[0].total : 0,
    bRows.length ? bRows[bRows.length - 1].total : 0,
    1,
  )

  const bestAsk = aAll.length ? aAll[aAll.length - 1].price : last
  const bestBid = bAll.length ? bAll[0].price : last
  const mid = (bestAsk + bestBid) / 2
  const spread = bestAsk - bestBid

  const Row = ({ l, side }: { l: Level; side: 'ask' | 'bid' }) => (
    <button
      onClick={() => onPick(l.price)}
      className="relative w-full grid grid-cols-[1.05fr_1fr_1fr] items-center px-3 h-[19px] group hover:bg-elevated transition-colors"
    >
      <span
        className={cn('depth-bar', side === 'ask' ? 'bg-down/10' : 'bg-up/10')}
        style={{ width: `${Math.min(100, (l.total / max) * 100)}%` }}
      />
      <span className={cn('relative text-left text-2xs tnum font-medium', side === 'ask' ? 'text-down' : 'text-up')}>
        {num(l.price, dp)}
      </span>
      <span className="relative text-right text-2xs tnum text-ink/85">{num(l.size, sizeDp)}</span>
      <span className="relative text-right text-2xs tnum text-muted group-hover:text-ink">{num(l.total, sizeDp)}</span>
    </button>
  )

  return (
    <Panel
      className={className}
      title={<span data-fn="F-19">订单簿</span>}
      right={
        <>
          <Seg
            size="xs"
            value={mode}
            onChange={setMode}
            items={[
              { id: 'both', label: '全部' },
              { id: 'bids', label: <span className="text-up">买盘</span> },
              { id: 'asks', label: <span className="text-down">卖盘</span> },
            ]}
          />
          <div className="relative" title="价格精度">
            <select
              value={dp}
              onChange={e => setDp(+e.target.value)}
              className="h-6 pl-1.5 pr-5 rounded-md bg-elevated border border-line text-2xs tnum text-muted
                         outline-none focus:border-brand appearance-none cursor-pointer hover:text-ink"
            >
              {dpOpts.map(o => (
                <option key={o} value={o}>{o === 0 ? '1' : (1 / Math.pow(10, o)).toFixed(o)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-faint pointer-events-none" />
          </div>
        </>
      }
      bodyClass="flex flex-col"
    >
      <div className="grid grid-cols-[1.05fr_1fr_1fr] px-3 py-1 text-2xs text-faint border-b border-line/60 shrink-0">
        <span>价格({quote})</span>
        <span className="text-right">数量({base})</span>
        <span className="text-right">累计({base})</span>
      </div>

      {mode !== 'bids' && (
        <div className="flex-1 min-h-0 flex flex-col justify-end overflow-hidden">
          {aRows.map((l, i) => <Row key={`a${i}`} l={l} side="ask" />)}
        </div>
      )}

      {/* spread / last */}
      <div className="flex items-center justify-between px-3 py-1.5 border-y border-line bg-elevated/40 shrink-0">
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-sm font-semibold tnum', up ? 'text-up' : 'text-down')}>{num(last, dp)}</span>
          <span className="text-2xs text-faint tnum">≈${num(last, dp)}</span>
        </div>
        <div className="text-right leading-tight">
          <div className="text-2xs text-muted tnum">中间价 {num(mid, dp)}</div>
          <div className="text-2xs text-faint tnum">价差 {num(spread, dp)}</div>
        </div>
      </div>

      {mode !== 'asks' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {bRows.map((l, i) => <Row key={`b${i}`} l={l} side="bid" />)}
        </div>
      )}
    </Panel>
  )
}

/* -------------------------------- trade feed ------------------------------ */

export function TradeFeed({
  rows, base, quote, className, onPick,
}: {
  rows: Trade[]
  base: string
  quote: string
  className?: string
  onPick?: (p: number) => void
}) {
  const dp = rows.length ? priceDp(rows[0].price) : 2
  const sizeDp = rows.length && rows[0].price > 1000 ? 4 : 2
  return (
    <Panel
      className={className}
      title={<span data-fn="F-20">最近成交</span>}
      right={<span className="text-2xs text-faint tnum">{rows.length} 条</span>}
      bodyClass="flex flex-col"
    >
      <div className="grid grid-cols-[1fr_1fr_.9fr] px-3 py-1 text-2xs text-faint border-b border-line/60 shrink-0">
        <span>价格({quote})</span>
        <span className="text-right">数量({base})</span>
        <span className="text-right">时间</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
        {rows.map((r, i) => (
          <button
            key={i}
            onClick={() => onPick?.(r.price)}
            className="w-full grid grid-cols-[1fr_1fr_.9fr] px-3 h-[19px] items-center hover:bg-elevated transition-colors"
          >
            <span className={cn('text-left text-2xs tnum font-medium', r.side === 'buy' ? 'text-up' : 'text-down')}>
              {num(r.price, dp)}
            </span>
            <span className="text-right text-2xs tnum text-ink/85">{num(r.size, sizeDp)}</span>
            <span className="text-right text-2xs tnum text-faint">{fmtTime(r.ts)}</span>
          </button>
        ))}
      </div>
    </Panel>
  )
}

/* ------------------------------ misc helpers ------------------------------ */

/** lg breakpoint — desktop terminal vs. the (separate) mobile design. */
export function useIsDesktop() {
  const [d, setD] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e: MediaQueryListEvent) => setD(e.matches)
    mq.addEventListener('change', h)
    setD(mq.matches)
    return () => mq.removeEventListener('change', h)
  }, [])
  return d
}

/** Deterministic per-symbol seed so every pair gets its own (stable) book. */
export function symSeed(sym: string) {
  let s = 7
  for (let i = 0; i < sym.length; i++) s = (s * 31 + sym.charCodeAt(i)) >>> 0
  return (s % 9000) + 11
}

/** A colored 0..1 meter — margin ratio, risk gauges. */
export function RiskBar({ v, className }: { v: number; className?: string }) {
  const tone = v > 0.8 ? 'bg-down' : v >= 0.5 ? 'bg-warn' : 'bg-up'
  return (
    <div className={cn('h-1 w-full rounded-full bg-line overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, v * 100)}%` }} />
    </div>
  )
}

export const riskTone = (v: number) => v > 0.8 ? 'text-down' : v >= 0.5 ? 'text-warn' : 'text-up'
