import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  bySymbol, orderbook, trades, type Trade,
} from '@/mock/market'
import {
  USER, BALANCES, openSpotOrders, histSpotOrders, SPOT_ORDERS, type SpotOrder,
} from '@/mock/account'
import { cn, num, usd, pct, compact, priceDp, fmtDateTime } from '@/lib/utils'
import {
  Button, Badge, Modal, PercentSlider, Table, TabsUnderline, type Col,
} from '@/components/ui'
import {
  TickerBar, ChartPanel, OrderBook, TradeFeed, Panel, Seg, KV, Toast, symSeed, MarketPicker,
  useIsDesktop,
} from './parts'

/* ================================================================== *
 * 币币交易 (Spot) — F-18 行情图表 / F-19 订单簿 / F-20 最近成交
 *                   F-21 限价·市价下单 / F-22 当前委托 / F-23 历史委托
 *                   F-24 成交记录
 * ================================================================== */

type Side = 'buy' | 'sell'
type OType = 'limit' | 'market'
type BookTab = 'open' | 'hist' | 'fills'

const spotBal = (coin: string) =>
  BALANCES.find(b => b.account === 'spot' && b.coin === coin)?.free ?? 0

export default function Spot() {
  const params = useParams()
  const sym = (params.symbol ?? 'BTC-USDT').replace('-', '/')
  const t = bySymbol(sym)
  const seed = symSeed(sym)
  const dp = priceDp(t.price)
  const amtDp = t.price >= 1000 ? 5 : t.price >= 1 ? 3 : 0
  const up = t.change >= 0
  const desktop = useIsDesktop()

  /* ------------------------------ market data ----------------------------- */
  const book = useMemo(() => orderbook(t.price, seed, 34), [t.price, seed])
  const feed = useMemo(() => trades(t.price, seed + 1, 150), [t.price, seed])

  /* ------------------------------- order form ----------------------------- */
  const [side, setSide] = useState<Side>('buy')
  const [price, setPrice] = useState(t.price.toFixed(dp))
  const [sheet, setSheet] = useState(false)          // mobile order sheet
  const [toast, setToast] = useState<{ msg: string; tone: 'up' | 'down' | 'brand' } | null>(null)

  useEffect(() => { setPrice(t.price.toFixed(dp)) }, [sym])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(id)
  }, [toast])

  /* --------------------------------- orders ------------------------------- */
  const [open, setOpen] = useState<SpotOrder[]>(() => openSpotOrders())
  const hist = useMemo(() => histSpotOrders(), [])
  const fills = useMemo(() => SPOT_ORDERS.filter(o => o.filled > 0), [])

  const place = (o: SpotOrder) => {
    setOpen(prev => [o, ...prev])
    setToast({
      msg: `${o.side === 'buy' ? '买入' : '卖出'}委托已提交 · ${num(o.amount, amtDp)} ${t.base}`,
      tone: o.side === 'buy' ? 'up' : 'down',
    })
    setSheet(false)
  }
  const cancel = (id: string) => {
    setOpen(prev => prev.filter(o => o.id !== id))
    setToast({ msg: `委托 ${id} 已撤销`, tone: 'brand' })
  }

  const form = (
    <OrderForm
      symbol={sym} base={t.base} quote={t.quote} last={t.price} dp={dp} amtDp={amtDp}
      side={side} setSide={setSide} price={price} setPrice={setPrice} onPlace={place}
    />
  )

  return (
    <div className="lg:h-[calc(100vh-3.5rem)] flex flex-col bg-bg">
      {/* ============================== DESKTOP ============================== */}
      {desktop && <>
      <TickerBar sym={sym} kind="spot" />

      <div className="flex flex-1 min-h-0">
        {/* centre: chart + book/feed, bottom tables */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-1 min-h-0">
            <ChartPanel
              price={t.price} seed={seed} asks={book.asks} bids={book.bids}
              className="flex-1 min-w-0 border-r border-line"
            />
            <div className="w-[268px] xl:w-[296px] shrink-0 flex flex-col border-r border-line">
              <OrderBook
                asks={book.asks} bids={book.bids} last={t.price} up={up}
                base={t.base} quote={t.quote}
                onPick={p => setPrice(p.toFixed(dp))}
                className="flex-[1.35] min-h-0 border-b border-line"
              />
              <TradeFeed
                rows={feed} base={t.base} quote={t.quote}
                onPick={p => setPrice(p.toFixed(dp))}
                className="flex-1 min-h-0"
              />
            </div>
          </div>

          <div className="h-[252px] shrink-0 border-t border-line">
            <OrdersPanel
              symbol={sym} open={open} hist={hist} fills={fills} onCancel={cancel} dp={dp} amtDp={amtDp}
            />
          </div>
        </div>

        {/* right: order form */}
        <aside className="w-[324px] xl:w-[348px] shrink-0 border-l border-line bg-surface overflow-y-auto scroll-thin">
          {form}
        </aside>
      </div>
      </>}

      {/* ============================== MOBILE =============================== */}
      {!desktop && <>
      <div className="pb-20">
        <MobileHeader sym={sym} />
        <MobileBody
          sym={sym} seed={seed} book={book} feed={feed} dp={dp} amtDp={amtDp}
          open={open} hist={hist} fills={fills} onCancel={cancel}
          onPick={p => setPrice(p.toFixed(dp))}
        />
      </div>

      {/* mobile buy/sell bar — sits above the app's bottom tab bar */}
      <div className="fixed bottom-14 inset-x-0 z-30 flex gap-2 px-3 py-2.5 bg-surface/95 backdrop-blur border-t border-line">
        <Button variant="up" className="flex-1" onClick={() => { setSide('buy'); setSheet(true) }}>
          买入 {t.base}
        </Button>
        <Button variant="down" className="flex-1" onClick={() => { setSide('sell'); setSheet(true) }}>
          卖出 {t.base}
        </Button>
      </div>
      </>}

      <Modal
        open={sheet}
        onClose={() => setSheet(false)}
        title={<span className="text-sm">{sym} · {side === 'buy' ? '买入' : '卖出'}</span>}
        width="max-w-md"
      >
        {form}
      </Modal>

      <Toast msg={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Order form — F-21 (限价 / 市价 / 滑块 / 手续费 / 可用余额)
 * ------------------------------------------------------------------ */
function OrderForm({
  symbol, base, quote, last, dp, amtDp, side, setSide, price, setPrice, onPlace,
}: {
  symbol: string; base: string; quote: string; last: number; dp: number; amtDp: number
  side: Side; setSide: (s: Side) => void
  price: string; setPrice: (p: string) => void
  onPlace: (o: SpotOrder) => void
}) {
  const [otype, setOtype] = useState<OType>('limit')
  const [amount, setAmount] = useState('')
  const [slider, setSlider] = useState(0)

  const availQuote = spotBal(quote)
  const availBase = spotBal(base)

  const p = otype === 'market' ? last : (parseFloat(price) || 0)
  const amt = parseFloat(amount) || 0
  const total = p * amt
  const feeRate = otype === 'limit' ? USER.makerFee : USER.takerFee
  const fee = total * feeRate
  const maxAmt = side === 'buy' ? (p > 0 ? availQuote / p : 0) : availBase

  const setPctAmt = (v: number) => {
    setSlider(v)
    setAmount(maxAmt > 0 ? (maxAmt * v / 100).toFixed(amtDp) : '')
  }
  const onAmount = (v: string) => {
    setAmount(v)
    const a = parseFloat(v) || 0
    setSlider(maxAmt > 0 ? Math.min(100, Math.round((a / maxAmt) * 100)) : 0)
  }

  const valid = amt > 0 && (otype === 'market' || p > 0)

  const submit = () => {
    if (!valid) return
    onPlace({
      id: `S${Math.floor(Date.now() / 1000) % 10_000_000}`,
      ts: Date.now(),
      symbol, side, type: otype,
      price: p, amount: amt, filled: 0,
      status: 'open',
    })
    setAmount(''); setSlider(0)
  }

  return (
    <div className="p-3 space-y-3" data-fn="F-21">
      {/* buy / sell */}
      <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-elevated border border-line">
        {(['buy', 'sell'] as Side[]).map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn(
              'h-8 rounded-md text-xs font-semibold transition-colors',
              side === s
                ? (s === 'buy' ? 'bg-up text-white' : 'bg-down text-white')
                : 'text-muted hover:text-ink',
            )}
          >
            {s === 'buy' ? '买入' : '卖出'} {base}
          </button>
        ))}
      </div>

      {/* order type */}
      <div className="flex items-center justify-between">
        <Seg
          value={otype}
          onChange={v => { setOtype(v); if (v === 'market') setSlider(0) }}
          items={[{ id: 'limit', label: '限价单' }, { id: 'market', label: '市价单' }]}
        />
        <span className="text-2xs text-faint">
          {otype === 'limit' ? 'Maker' : 'Taker'} {(feeRate * 100).toFixed(3)}%
        </span>
      </div>

      {/* price */}
      <Field
        label="价格"
        suffix={quote}
        value={otype === 'market' ? '' : price}
        onChange={setPrice}
        disabled={otype === 'market'}
        placeholder={otype === 'market' ? '以最优市价成交' : ''}
        right={otype === 'limit' && (
          <button onClick={() => setPrice(last.toFixed(dp))} className="text-2xs text-brand hover:brightness-125">
            最新价
          </button>
        )}
      />

      {/* amount */}
      <Field label="数量" suffix={base} value={amount} onChange={onAmount} placeholder="0.00" />

      <PercentSlider value={slider} onChange={setPctAmt} tone={side === 'buy' ? 'up' : 'down'} />

      {/* summary */}
      <div className="space-y-1.5 pt-0.5">
        <KV
          k="可用余额"
          v={<>{num(side === 'buy' ? availQuote : availBase, side === 'buy' ? 2 : amtDp)}{' '}
            <span className="text-faint">{side === 'buy' ? quote : base}</span></>}
        />
        <KV k="预计成交额" v={<>{num(total, 2)} <span className="text-faint">{quote}</span></>} />
        <KV
          k={`手续费 (${otype === 'limit' ? 'Maker' : 'Taker'} ${(feeRate * 100).toFixed(3)}%)`}
          v={<>{num(fee, 4)} <span className="text-faint">{quote}</span></>}
          tone="text-muted"
        />
      </div>

      <Button
        variant={side === 'buy' ? 'up' : 'down'}
        className="w-full"
        disabled={!valid}
        onClick={submit}
      >
        {side === 'buy' ? '买入' : '卖出'} {base}
      </Button>

      {/* balances */}
      <div className="pt-2 border-t border-line space-y-1.5">
        <div className="text-2xs text-faint mb-1.5">现货账户</div>
        <KV k={quote} v={num(availQuote, 2)} />
        <KV k={base} v={num(availBase, amtDp)} />
        <KV k="估值" v={usd(availQuote + availBase * last)} tone="text-muted" />
      </div>

      <div className="text-2xs text-faint leading-relaxed pt-1">
        限价单以指定价格或更优价格成交；市价单立即以对手方最优价成交，可能产生滑点。
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, suffix, disabled, placeholder, right,
}: {
  label: string; value: string; onChange: (v: string) => void
  suffix: string; disabled?: boolean; placeholder?: string; right?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-muted">{label}</span>
        {right}
      </div>
      <div className={cn(
        'flex items-center gap-2 h-9 px-2.5 rounded-lg bg-elevated border transition-colors',
        disabled ? 'border-line opacity-60' : 'border-line focus-within:border-brand',
      )}>
        <input
          inputMode="decimal"
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? '0.00'}
          onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm tnum placeholder:text-faint placeholder:text-xs"
        />
        <span className="text-2xs text-muted shrink-0">{suffix}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Bottom tables — F-22 当前委托 / F-23 历史委托 / F-24 成交记录
 * ------------------------------------------------------------------ */
function OrdersPanel({
  symbol, open, hist, fills, onCancel, dp, amtDp,
}: {
  symbol: string
  open: SpotOrder[]; hist: SpotOrder[]; fills: SpotOrder[]
  onCancel: (id: string) => void
  dp: number; amtDp: number
}) {
  const [tab, setTab] = useState<BookTab>('open')
  const [onlyCur, setOnlyCur] = useState(false)

  const f = <T extends { symbol: string }>(rows: T[]) => onlyCur ? rows.filter(r => r.symbol === symbol) : rows

  const sideCell = (s: 'buy' | 'sell') => (
    <span className={s === 'buy' ? 'text-up' : 'text-down'}>{s === 'buy' ? '买入' : '卖出'}</span>
  )
  const d = (p: number) => priceDp(p)

  const openCols: Col<SpotOrder>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-muted tnum text-2xs">{fmtDateTime(r.ts)}</span> },
    { key: 'sym', header: '交易对', cell: r => <span className="font-medium">{r.symbol}</span> },
    { key: 'type', header: '类型', cell: r => <span className="text-muted">{r.type === 'limit' ? '限价' : '市价'}</span> },
    { key: 'side', header: '方向', cell: r => sideCell(r.side) },
    { key: 'price', header: '委托价', align: 'right', cell: r => num(r.price, d(r.price)) },
    { key: 'amt', header: '数量', align: 'right', cell: r => num(r.amount, r.price > 1000 ? 5 : 2) },
    { key: 'filled', header: '已成交', align: 'right', hideBelow: 'md',
      cell: r => (
        <span className="tnum">
          {num(r.filled, r.price > 1000 ? 5 : 2)}
          <span className="text-faint"> ({((r.filled / r.amount) * 100 || 0).toFixed(0)}%)</span>
        </span>
      ) },
    { key: 'total', header: '委托额', align: 'right', hideBelow: 'lg', cell: r => num(r.price * r.amount, 2) },
    { key: 'st', header: '状态', cell: r => (
      <Badge tone={r.status === 'partial' ? 'warn' : 'info'}>{r.status === 'partial' ? '部分成交' : '未成交'}</Badge>
    ) },
    { key: 'act', header: '操作', align: 'right', cell: r => (
      <button
        data-fn="F-22"
        onClick={() => onCancel(r.id)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-2xs text-muted
                   border border-line hover:border-down hover:text-down transition-colors"
      >
        <X className="w-3 h-3" /> 撤单
      </button>
    ) },
  ]

  const histCols: Col<SpotOrder>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-muted tnum text-2xs">{fmtDateTime(r.ts)}</span> },
    { key: 'sym', header: '交易对', cell: r => <span className="font-medium">{r.symbol}</span> },
    { key: 'type', header: '类型', cell: r => <span className="text-muted">{r.type === 'limit' ? '限价' : '市价'}</span> },
    { key: 'side', header: '方向', cell: r => sideCell(r.side) },
    { key: 'price', header: '委托价', align: 'right', cell: r => num(r.price, d(r.price)) },
    { key: 'amt', header: '数量', align: 'right', cell: r => num(r.amount, r.price > 1000 ? 5 : 2) },
    { key: 'filled', header: '成交量', align: 'right', hideBelow: 'md', cell: r => num(r.filled, r.price > 1000 ? 5 : 2) },
    { key: 'total', header: '成交额', align: 'right', hideBelow: 'lg', cell: r => num(r.price * r.filled, 2) },
    { key: 'st', header: '状态', cell: r => (
      <Badge tone={r.status === 'filled' ? 'up' : 'muted'}>{r.status === 'filled' ? '完全成交' : '已撤销'}</Badge>
    ) },
  ]

  const fillCols: Col<SpotOrder>[] = [
    { key: 'ts', header: '成交时间', cell: r => <span className="text-muted tnum text-2xs">{fmtDateTime(r.ts)}</span> },
    { key: 'sym', header: '交易对', cell: r => <span className="font-medium">{r.symbol}</span> },
    { key: 'side', header: '方向', cell: r => sideCell(r.side) },
    { key: 'price', header: '成交价', align: 'right', cell: r => num(r.price, d(r.price)) },
    { key: 'amt', header: '成交量', align: 'right', cell: r => num(r.filled, r.price > 1000 ? 5 : 2) },
    { key: 'total', header: '成交额', align: 'right', cell: r => num(r.price * r.filled, 2) },
    { key: 'role', header: '角色', hideBelow: 'md', cell: r => (
      <Badge tone={r.type === 'limit' ? 'brand' : 'muted'}>{r.type === 'limit' ? 'Maker' : 'Taker'}</Badge>
    ) },
    { key: 'fee', header: '手续费', align: 'right', hideBelow: 'md', cell: r => (
      <span className="text-muted">
        {num(r.price * r.filled * (r.type === 'limit' ? USER.makerFee : USER.takerFee), 4)} USDT
      </span>
    ) },
  ]

  return (
    <Panel
      title={
        <div className="flex items-center gap-1">
          {([
            ['open', `当前委托 (${f(open).length})`],
            ['hist', '历史委托'],
            ['fills', '成交记录'],
          ] as [BookTab, string][]).map(([id, label]) => (
            <button
              key={id}
              data-fn={id === 'open' ? 'F-22' : id === 'hist' ? 'F-23' : 'F-24'}
              onClick={() => setTab(id)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs transition-colors',
                tab === id ? 'bg-elevated text-ink font-semibold' : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
      right={
        <label className="flex items-center gap-1.5 text-2xs text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyCur}
            onChange={e => setOnlyCur(e.target.checked)}
            className="w-3 h-3 accent-current"
          />
          仅当前交易对
        </label>
      }
      bodyClass="overflow-auto scroll-thin"
    >
      {tab === 'open' && <Table dense cols={openCols} rows={f(open)} empty="暂无未成交委托" />}
      {tab === 'hist' && <Table dense cols={histCols} rows={f(hist)} empty="暂无历史委托" />}
      {tab === 'fills' && <Table dense cols={fillCols} rows={f(fills)} empty="暂无成交记录" />}
    </Panel>
  )
}

/* ------------------------------------------------------------------ *
 * Mobile — a different layout, not a squeezed desktop.
 * ------------------------------------------------------------------ */
function MobileHeader({ sym }: { sym: string }) {
  const t = bySymbol(sym)
  const up = t.change >= 0
  const dp = priceDp(t.price)
  return (
    <div className="bg-surface border-b border-line px-3 py-2.5">
      <div className="flex items-center justify-between">
        <MarketPicker sym={sym} kind="spot" />
        <div className="text-right">
          <div className={cn('text-lg font-semibold tnum leading-tight', up ? 'text-up' : 'text-down')}>
            {num(t.price, dp)}
          </div>
          <div className={cn('text-2xs tnum', up ? 'text-up' : 'text-down')}>{pct(t.change)}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2.5">
        {[
          ['24h 高', num(t.high, dp)],
          ['24h 低', num(t.low, dp)],
          [`量 (${t.base})`, compact(t.volume)],
          [`额 (${t.quote})`, compact(t.turnover)],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="text-2xs text-faint truncate">{k}</div>
            <div className="text-2xs tnum mt-0.5">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileBody({
  sym, seed, book, feed, dp, amtDp, open, hist, fills, onCancel, onPick,
}: {
  sym: string; seed: number
  book: { asks: any[]; bids: any[] }; feed: Trade[]
  dp: number; amtDp: number
  open: SpotOrder[]; hist: SpotOrder[]; fills: SpotOrder[]
  onCancel: (id: string) => void
  onPick: (p: number) => void
}) {
  const t = bySymbol(sym)
  const [tab, setTab] = useState<'chart' | 'book' | 'trades'>('chart')
  return (
    <>
      <div className="px-3 bg-surface border-b border-line">
        <TabsUnderline
          value={tab}
          onChange={setTab}
          tabs={[{ id: 'chart', label: '图表' }, { id: 'book', label: '订单簿' }, { id: 'trades', label: '成交' }]}
        />
      </div>

      {tab === 'chart' && (
        <div className="h-[340px] bg-surface border-b border-line flex flex-col">
          <ChartPanel price={t.price} seed={seed} asks={book.asks} bids={book.bids} className="flex-1 min-h-0" />
        </div>
      )}
      {tab === 'book' && (
        <div className="h-[520px] bg-surface border-b border-line flex flex-col">
          <OrderBook
            asks={book.asks} bids={book.bids} last={t.price} up={t.change >= 0}
            base={t.base} quote={t.quote} onPick={onPick} rowsBoth={11} className="flex-1 min-h-0"
          />
        </div>
      )}
      {tab === 'trades' && (
        <div className="h-[520px] bg-surface border-b border-line flex flex-col">
          <TradeFeed rows={feed} base={t.base} quote={t.quote} className="flex-1 min-h-0" />
        </div>
      )}

      <div className="min-h-[280px] bg-surface">
        <OrdersPanel symbol={sym} open={open} hist={hist} fills={fills} onCancel={onCancel} dp={dp} amtDp={amtDp} />
      </div>
    </>
  )
}
