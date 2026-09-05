import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi } from 'lightweight-charts'
import { usePrefs } from '@/lib/prefs'
import { cn, num, priceDp } from '@/lib/utils'
import type { Candle, Level } from '@/mock/market'

/* ------------------------------------------------------------------ *
 * Candlestick + volume — TradingView Lightweight Charts (MIT).
 * This is the same engine the production build will use.
 * ------------------------------------------------------------------ */
export function CandleChart({ data, className }: { data: Candle[]; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const { theme } = usePrefs()

  useEffect(() => {
    if (!box.current) return
    const css = getComputedStyle(document.documentElement)
    const v = (n: string) => `rgb(${css.getPropertyValue(n).trim().split(' ').join(',')})`

    const c = createChart(box.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: v('--muted'),
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: v('--line'), style: 1 },
        horzLines: { color: v('--line'), style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: v('--faint'), width: 1, style: 2, labelBackgroundColor: v('--elevated') },
        horzLine: { color: v('--faint'), width: 1, style: 2, labelBackgroundColor: v('--elevated') },
      },
      rightPriceScale: { borderColor: v('--line'), scaleMargins: { top: 0.08, bottom: 0.26 } },
      timeScale: { borderColor: v('--line'), timeVisible: true, secondsVisible: false },
      handleScale: { axisPressedMouseMove: { time: true, price: false } },
      autoSize: true,
    })
    chart.current = c

    const candles = c.addCandlestickSeries({
      upColor: v('--up'), downColor: v('--down'),
      borderUpColor: v('--up'), borderDownColor: v('--down'),
      wickUpColor: v('--up'), wickDownColor: v('--down'),
    })
    candles.setData(data as any)

    const vol = c.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    vol.setData(
      data.map(d => ({
        time: d.time,
        value: d.value,
        color: d.close >= d.open ? `rgba(${css.getPropertyValue('--up').trim().split(' ').join(',')},0.35)`
                                 : `rgba(${css.getPropertyValue('--down').trim().split(' ').join(',')},0.35)`,
      })) as any,
    )

    c.timeScale().fitContent()
    return () => { c.remove(); chart.current = null }
  }, [data, theme])

  return <div ref={box} className={cn('w-full h-full', className)} />
}

/* ------------------------------------------------------------------ *
 * Depth chart — cumulative bid/ask curve. Hand-rolled SVG.
 * ------------------------------------------------------------------ */
export function DepthChart({
  asks, bids, className,
}: { asks: Level[]; bids: Level[]; className?: string }) {
  const a = [...asks].reverse()          // ascending price
  const b = [...bids]                    // descending price
  if (!a.length || !b.length) return null

  const maxTotal = Math.max(a[a.length - 1].total, b[b.length - 1].total)
  const lo = b[b.length - 1].price
  const hi = a[a.length - 1].price
  const W = 100, H = 100

  const x = (p: number) => ((p - lo) / (hi - lo)) * W
  const y = (t: number) => H - (t / maxTotal) * H * 0.94

  const bidPath = [...b].reverse()
  const bidLine = bidPath.map(l => `${x(l.price)},${y(l.total)}`).join(' L ')
  const askLine = a.map(l => `${x(l.price)},${y(l.total)}`).join(' L ')

  const mid = (a[0].price + b[0].price) / 2

  return (
    <div className={cn('relative w-full h-full', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id="bidFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--up))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--up))" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="askFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--down))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--down))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <path d={`M ${x(bidPath[0].price)},${H} L ${bidLine} L ${x(bidPath[bidPath.length - 1].price)},${H} Z`} fill="url(#bidFill)" />
        <path d={`M ${bidLine}`} fill="none" stroke="rgb(var(--up))" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />

        <path d={`M ${x(a[0].price)},${H} L ${askLine} L ${x(a[a.length - 1].price)},${H} Z`} fill="url(#askFill)" />
        <path d={`M ${askLine}`} fill="none" stroke="rgb(var(--down))" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />

        <line x1={x(mid)} y1="0" x2={x(mid)} y2={H} stroke="rgb(var(--faint))" strokeWidth="0.5"
              strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-2xs text-faint tnum pointer-events-none">
        <span>{num(lo, priceDp(lo))}</span>
        <span className="text-muted">{num(mid, priceDp(mid))}</span>
        <span>{num(hi, priceDp(hi))}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Sparkline — 24h mini trend in the market list.
 * ------------------------------------------------------------------ */
export function Sparkline({
  data, up, className,
}: { data: number[]; up: boolean; className?: string }) {
  const W = 100, H = 28
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / span) * H * 0.85 - H * 0.075}`)
  const stroke = up ? 'rgb(var(--up))' : 'rgb(var(--down))'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn('overflow-visible', className)}>
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.2"
                strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* ------------------------------------------------------------------ *
 * Bar chart — admin reports.
 * ------------------------------------------------------------------ */
export function BarChart({
  data, labels, tone = 'brand', className, height = 160,
}: { data: number[]; labels?: string[]; tone?: 'brand' | 'up' | 'info'; className?: string; height?: number }) {
  const max = Math.max(...data, 1)
  const fill = { brand: 'bg-brand', up: 'bg-up', info: 'bg-info' }[tone]
  return (
    <div className={className}>
      {/* items-stretch (not items-end) so each column inherits the row's explicit
          height — otherwise the bars' percentage heights resolve against auto and collapse. */}
      <div className="flex items-stretch gap-1" style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="flex-1 min-w-0 flex flex-col justify-end group relative">
            <div
              className={cn('rounded-t transition-all group-hover:brightness-125', fill)}
              style={{ height: `${(v / max) * 100}%`, opacity: 0.35 + (v / max) * 0.65 }}
            />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                            transition-opacity text-2xs tnum bg-elevated border border-line rounded px-1.5 py-0.5
                            pointer-events-none whitespace-nowrap z-10">
              {v.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex gap-1 mt-1.5">
          {labels.map((l, i) => (
            <div key={i} className="flex-1 text-center text-2xs text-faint truncate">{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

/* Area/line chart for admin trend cards. */
export function AreaChart({
  data, tone = 'brand', className, height = 64,
}: { data: number[]; tone?: 'brand' | 'up' | 'down' | 'info'; className?: string; height?: number }) {
  const W = 200, H = 60
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / span) * H * 0.85 - 4}`)
  const color = { brand: 'var(--brand)', up: 'var(--up)', down: 'var(--down)', info: 'var(--info)' }[tone]
  const gid = `ag-${tone}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="0.3" />
          <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts.join(' ')} ${W},${H}`} fill={`url(#${gid})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={`rgb(${color})`} strokeWidth="1.5"
                strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
