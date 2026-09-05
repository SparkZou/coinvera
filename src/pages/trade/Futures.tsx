import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { X, Settings2, ShieldAlert, Zap, Layers, Timer } from 'lucide-react'
import {
  bySymbol, orderbook, trades, type Trade,
} from '@/mock/market'
import {
  USER, BALANCES, POSITIONS, FUTURES_ORDERS, type Position, type FuturesOrder,
} from '@/mock/account'
import { cn, num, usd, pct, compact, priceDp, fmtDateTime, seeded } from '@/lib/utils'
import {
  Button, Badge, Modal, PercentSlider, Table, TabsUnderline, Toggle, type Col,
} from '@/components/ui'
import { AreaChart } from '@/components/charts'
import {
  TickerBar, ChartPanel, OrderBook, TradeFeed, Panel, Seg, KV, Toast, InfoTip,
  RiskBar, riskTone, symSeed, MarketPicker, StatCell, useIsDesktop,
} from './parts'

/* ================================================================== *
 * 合约交易 (Futures / Perpetual) — F-25 … F-42
 *  F-25 合约交易主界面      F-26 正向 USDT 合约    F-27 反向 币本位合约
 *  F-28 行情图表/深度        F-29 杠杆 1–125×       F-30 保证金模式 逐仓/全仓
 *  F-31 GTC/IOC/FOK          F-32 止盈止损          F-33 单向/双向持仓
 *  F-34 标记价格             F-35 调整保证金        F-36 指数价格(多所聚合)
 *  F-37 资金费率 + 倒计时    F-38 梯度保证金        F-39 逐级部分平仓
 *  F-40 未实现盈亏每分钟结算 F-41 保险基金          F-42 ADL 穿仓分摊
 * ================================================================== */

type Dir = 'usdt' | 'coin'
type Side = 'buy' | 'sell'
type OType = 'limit' | 'market' | 'stop'
type Tif = 'GTC' | 'IOC' | 'FOK'
type MarginMode = 'cross' | 'isolated'
type PosMode = 'oneway' | 'hedge'
type BTab = 'pos' | 'open' | 'hist' | 'fills' | 'funding'

const MMR = 0.005                     // 维持保证金率 (Tier 1)
const CONTRACT_USD = 100              // 币本位: 1 张 = 100 USD
const FUNDING_MS = 8 * 3600 * 1000

/** 梯度保证金 — F-38 */
const TIERS = [
  { tier: 1, from: 0,           to: 50_000,      imr: 0.008,  mmr: 0.004,  lev: 125 },
  { tier: 2, from: 50_000,      to: 250_000,     imr: 0.01,   mmr: 0.005,  lev: 100 },
  { tier: 3, from: 250_000,     to: 1_000_000,   imr: 0.02,   mmr: 0.01,   lev: 50 },
  { tier: 4, from: 1_000_000,   to: 5_000_000,   imr: 0.05,   mmr: 0.025,  lev: 20 },
  { tier: 5, from: 5_000_000,   to: 20_000_000,  imr: 0.10,   mmr: 0.05,   lev: 10 },
  { tier: 6, from: 20_000_000,  to: 50_000_000,  imr: 0.125,  mmr: 0.0625, lev: 8 },
  { tier: 7, from: 50_000_000,  to: 100_000_000, imr: 0.25,   mmr: 0.125,  lev: 4 },
  { tier: 8, from: 100_000_000, to: 200_000_000, imr: 0.50,   mmr: 0.25,   lev: 2 },
  { tier: 9, from: 200_000_000, to: Infinity,    imr: 1.00,   mmr: 0.50,   lev: 1 },
]

const LEV_PRESETS = [1, 5, 10, 25, 50, 75, 100, 125]
const INSURANCE_FUND = 128_442_918.42

const futBal = (coin: string) =>
  BALANCES.find(b => b.account === 'futures' && b.coin === coin)?.free ?? 0

const estLiq = (entry: number, lev: number, long: boolean) =>
  long ? entry * (1 - 1 / lev + MMR) : entry * (1 + 1 / lev - MMR)

export default function Futures() {
  const params = useParams()
  const sym = (params.symbol ?? 'BTC-USDT').replace('-', '/')
  const t = bySymbol(sym)
  const seed = symSeed(sym)
  const dp = priceDp(t.price)
  const amtDp = t.price >= 1000 ? 3 : t.price >= 1 ? 2 : 0
  const up = t.change >= 0
  const desktop = useIsDesktop()

  /* ------------------------------ market data ----------------------------- */
  const book = useMemo(() => orderbook(t.price, seed, 34), [t.price, seed])
  const feed = useMemo(() => trades(t.price, seed + 1, 150), [t.price, seed])

  /** 标记价格 (F-34) / 指数价格 (F-36) / 资金费率 (F-37) — deterministic per symbol. */
  const { mark, index, funding, oi } = useMemo(() => {
    const r = seeded(seed + 99)
    return {
      mark: t.price * (1 + (r() - 0.45) * 0.0006),
      index: t.price * (1 + (r() - 0.55) * 0.0006),
      funding: (r() - 0.35) * 0.0006,               // ~ -0.021% … +0.039%
      oi: t.volume * (0.18 + r() * 0.12),
    }
  }, [t.price, t.volume, seed])

  /* ------------------------- funding countdown (F-37) --------------------- */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.ceil(now / FUNDING_MS) * FUNDING_MS - now
  const pad = (n: number) => String(n).padStart(2, '0')
  const countdown = `${pad(Math.floor(left / 3.6e6))}:${pad(Math.floor(left / 6e4) % 60)}:${pad(Math.floor(left / 1000) % 60)}`

  /* -------------------------------- controls ------------------------------ */
  const [dir, setDir] = useState<Dir>('usdt')                // F-26 / F-27
  const [lev, setLev] = useState(20)                         // F-29
  const [mmode, setMmode] = useState<MarginMode>('cross')    // F-30
  const [pmode, setPmode] = useState<PosMode>('oneway')      // F-33
  const [side, setSide] = useState<Side>('buy')
  const [price, setPrice] = useState(t.price.toFixed(dp))

  const [levOpen, setLevOpen] = useState(false)
  const [mmOpen, setMmOpen] = useState(false)
  const [tierOpen, setTierOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [toast, setToast] = useState<{ msg: string; tone: 'up' | 'down' | 'brand' } | null>(null)

  useEffect(() => { setPrice(t.price.toFixed(dp)) }, [sym])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(id)
  }, [toast])

  const marginCoin = dir === 'usdt' ? t.quote : t.base
  const sizeUnit = dir === 'usdt' ? t.base : '张'

  /* -------------------------- positions & orders -------------------------- */
  const [positions, setPositions] = useState<Position[]>(() => POSITIONS.map(p => ({ ...p })))
  const [orders, setOrders] = useState<FuturesOrder[]>(() => FUTURES_ORDERS.filter(o => o.status === 'open'))
  const hist = useMemo(() => FUTURES_ORDERS.filter(o => o.status !== 'open'), [])
  const fills = useMemo(() => FUTURES_ORDERS.filter(o => o.filled > 0), [])

  const fundingRows = useMemo(() => {
    const r = seeded(seed + 404)
    return Array.from({ length: 14 }, (_, i) => {
      const p = POSITIONS[Math.floor(r() * POSITIONS.length)]
      const rate = (r() - 0.4) * 0.0006
      const notional = p.size * p.mark
      return {
        ts: Date.now() - i * FUNDING_MS,
        symbol: p.symbol,
        side: p.side,
        notional,
        rate,
        fee: -notional * rate * (p.side === 'long' ? 1 : -1),
      }
    })
  }, [seed])

  /* --------------------------------- risk --------------------------------- */
  const risk = useMemo(() => {
    const wallet = futBal('USDT')
    const margin = positions.reduce((s, p) => s + p.margin, 0)
    const pnl = positions.reduce((s, p) => s + p.pnl, 0)
    const notional = positions.reduce((s, p) => s + p.size * p.mark, 0)
    const maint = notional * MMR
    const equity = wallet + margin + pnl
    const ratio = equity > 0 ? Math.min(1, maint / equity) : 1
    const worst = positions.reduce((m, p) => Math.max(m, p.marginRatio), 0)
    return { wallet, margin, pnl, notional, maint, equity, ratio, worst }
  }, [positions])

  const adlLit = Math.max(1, Math.min(5, Math.round(risk.worst * 5)))   // F-42

  /* -------------------------------- actions ------------------------------- */
  const place = (o: FuturesOrder, label: string) => {
    setOrders(prev => [o, ...prev])
    setToast({ msg: label, tone: o.side === 'buy' ? 'up' : 'down' })
    setSheet(false)
  }
  const cancel = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id))
    setToast({ msg: `委托 ${id} 已撤销`, tone: 'brand' })
  }
  const closePos = (p: Position) => {
    setPositions(prev => prev.filter(x => x.id !== p.id))
    setToast({
      msg: `${p.symbol} ${p.side === 'long' ? '多头' : '空头'}已市价平仓 · 盈亏 ${p.pnl >= 0 ? '+' : ''}${num(p.pnl, 2)} USDT`,
      tone: p.pnl >= 0 ? 'up' : 'down',
    })
  }
  const patchPos = (id: string, patch: Partial<Position>) =>
    setPositions(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))

  const form = (
    <OrderForm
      symbol={sym} base={t.base} quote={t.quote} last={t.price} mark={mark} dp={dp} amtDp={amtDp}
      dir={dir} lev={lev} mmode={mmode} pmode={pmode}
      side={side} setSide={setSide} price={price} setPrice={setPrice}
      marginCoin={marginCoin} sizeUnit={sizeUnit}
      onLev={() => setLevOpen(true)} onMm={() => setMmOpen(true)} onPmode={setPmode}
      onTier={() => setTierOpen(true)} onPlace={place}
    />
  )

  /* ------------------------------ ticker extras --------------------------- */
  const extras = (
    <>
      <StatCell
        label={<span data-fn="F-34">标记价格</span>}
        value={<span className="text-ink">{num(mark, dp)}</span>}
      />
      <StatCell
        label={<span data-fn="F-36">指数价格</span>}
        tip="指数价格由多家主流交易所行情按权重聚合，每秒更新一次，用于计算标记价格与强平价格，可有效防止插针操纵。"
        value={<span className="text-ink">{num(index, dp)}</span>}
      />
      <StatCell
        label={<span data-fn="F-37" className="flex items-center gap-1">资金费率 / 倒计时</span>}
        value={
          <span className="flex items-center gap-1.5">
            <span className={funding >= 0 ? 'text-up' : 'text-down'}>{(funding * 100).toFixed(4)}%</span>
            <span className="text-faint">|</span>
            <span className="text-warn tnum">{countdown}</span>
          </span>
        }
      />
      <StatCell label="持仓量 (OI)" value={compact(oi)} className="hidden 2xl:flex" />
      <div className="px-3 flex flex-col justify-center border-l border-line" data-fn="F-26">
        <div className="text-2xs text-faint mb-1">合约类型</div>
        <Seg
          size="xs"
          value={dir}
          onChange={setDir}
          items={[
            { id: 'usdt', label: <span data-fn="F-26">正向 USDT</span> },
            { id: 'coin', label: <span data-fn="F-27">反向 币本位</span> },
          ]}
        />
      </div>
    </>
  )

  return (
    <div className="lg:h-[calc(100vh-3.5rem)] flex flex-col bg-bg">
      {/* ============================== DESKTOP ============================== */}
      {desktop && <>
      <TickerBar sym={sym} kind="futures" extras={extras} />

      <div className="flex flex-1 min-h-0" data-fn="F-25">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-1 min-h-0">
            <ChartPanel
              price={t.price} seed={seed} asks={book.asks} bids={book.bids}
              className="flex-1 min-w-0 border-r border-line"
              right={<Badge tone="muted" className="mr-1"><span data-fn="F-28">永续 · {dir === 'usdt' ? 'USDT 保证金' : '币本位保证金'}</span></Badge>}
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

          <div className="h-[264px] shrink-0 border-t border-line">
            <BottomPanel
              symbol={sym} positions={positions} orders={orders} hist={hist} fills={fills}
              funding={fundingRows} onCancel={cancel} onClose={closePos} onPatch={patchPos}
              risk={risk}
            />
          </div>
        </div>

        <aside className="w-[336px] xl:w-[364px] shrink-0 border-l border-line bg-surface overflow-y-auto scroll-thin">
          {form}
          <RiskPanel
            risk={risk} adlLit={adlLit} onTier={() => setTierOpen(true)} seed={seed}
          />
        </aside>
      </div>
      </>}

      {/* ============================== MOBILE =============================== */}
      {!desktop && <>
      <div className="pb-20">
        <MobileHeader
          sym={sym} mark={mark} index={index} funding={funding} countdown={countdown}
          dir={dir} setDir={setDir} lev={lev} mmode={mmode}
          onLev={() => setLevOpen(true)} onMm={() => setMmOpen(true)}
        />
        <MobileBody
          sym={sym} seed={seed} book={book} feed={feed}
          positions={positions} orders={orders} hist={hist} fills={fills} funding={fundingRows}
          onCancel={cancel} onClose={closePos} onPatch={patchPos}
          onPick={p => setPrice(p.toFixed(dp))}
          risk={risk} adlLit={adlLit} onTier={() => setTierOpen(true)}
        />
      </div>

      <div className="fixed bottom-14 inset-x-0 z-30 flex gap-2 px-3 py-2.5 bg-surface/95 backdrop-blur border-t border-line">
        <Button variant="up" className="flex-1" onClick={() => { setSide('buy'); setSheet(true) }}>
          {pmode === 'hedge' ? '开多' : '买入 / 做多'}
        </Button>
        <Button variant="down" className="flex-1" onClick={() => { setSide('sell'); setSheet(true) }}>
          {pmode === 'hedge' ? '开空' : '卖出 / 做空'}
        </Button>
      </div>
      </>}

      <Modal
        open={sheet} onClose={() => setSheet(false)}
        title={<span className="text-sm">{t.base} 永续 · {lev}× · {mmode === 'cross' ? '全仓' : '逐仓'}</span>}
      >
        {form}
      </Modal>

      {/* ------------------------------ modals ------------------------------ */}
      <LeverageModal open={levOpen} onClose={() => setLevOpen(false)} lev={lev} setLev={setLev} onTier={() => { setLevOpen(false); setTierOpen(true) }} base={t.base} price={t.price} />
      <MarginModeModal open={mmOpen} onClose={() => setMmOpen(false)} mode={mmode} setMode={setMmode} />
      <TierModal open={tierOpen} onClose={() => setTierOpen(false)} symbol={sym} />

      <Toast msg={toast?.msg ?? null} tone={toast?.tone} />
    </div>
  )
}

/* ================================================================== *
 * Order form — F-29/30/31/32/33 all live here.
 * ================================================================== */
function OrderForm({
  symbol, base, quote, last, mark, dp, amtDp, dir, lev, mmode, pmode,
  side, setSide, price, setPrice, marginCoin, sizeUnit,
  onLev, onMm, onPmode, onTier, onPlace,
}: {
  symbol: string; base: string; quote: string; last: number; mark: number
  dp: number; amtDp: number
  dir: Dir; lev: number; mmode: MarginMode; pmode: PosMode
  side: Side; setSide: (s: Side) => void
  price: string; setPrice: (v: string) => void
  marginCoin: string; sizeUnit: string
  onLev: () => void; onMm: () => void; onPmode: (m: PosMode) => void; onTier: () => void
  onPlace: (o: FuturesOrder, label: string) => void
}) {
  const [otype, setOtype] = useState<OType>('limit')
  const [tif, setTif] = useState<Tif>('GTC')
  const [amount, setAmount] = useState('')
  const [slider, setSlider] = useState(0)
  const [trigger, setTrigger] = useState('')
  const [reduceOnly, setReduceOnly] = useState(false)
  const [tpsl, setTpsl] = useState(false)
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')

  const avail = futBal(marginCoin)
  const p = otype === 'market' ? last : (parseFloat(price) || 0)
  const amt = parseFloat(amount) || 0

  const notionalUsd = dir === 'usdt' ? p * amt : amt * CONTRACT_USD
  const cost = dir === 'usdt'
    ? notionalUsd / lev
    : (p > 0 ? (amt * CONTRACT_USD) / p / lev : 0)
  const maxSize = dir === 'usdt'
    ? (p > 0 ? (avail * lev) / p : 0)
    : (p > 0 ? (avail * p * lev) / CONTRACT_USD : 0)
  const feeRate = otype === 'limit' ? USER.makerFee : USER.takerFee
  const fee = notionalUsd * feeRate
  const liq = p > 0 ? estLiq(p, lev, side === 'buy') : 0

  const setPctAmt = (v: number) => {
    setSlider(v)
    setAmount(maxSize > 0 ? (maxSize * v / 100).toFixed(dir === 'usdt' ? amtDp : 0) : '')
  }
  const onAmount = (v: string) => {
    setAmount(v)
    const a = parseFloat(v) || 0
    setSlider(maxSize > 0 ? Math.min(100, Math.round((a / maxSize) * 100)) : 0)
  }

  const valid = amt > 0 && (otype === 'market' || p > 0) && (otype !== 'stop' || !!parseFloat(trigger))
  const longLabel = pmode === 'hedge' ? '开多' : '买入 / 做多'
  const shortLabel = pmode === 'hedge' ? '开空' : '卖出 / 做空'

  const submit = () => {
    if (!valid) return
    onPlace(
      {
        id: `F${Math.floor(Date.now() / 1000) % 10_000_000}`,
        ts: Date.now(),
        symbol, side,
        type: otype === 'stop' ? 'stop' : otype,
        reduceOnly,
        price: p, amount: amt, filled: 0,
        status: 'open',
        tif,
      },
      `${side === 'buy' ? longLabel : shortLabel} ${num(amt, dir === 'usdt' ? amtDp : 0)} ${sizeUnit} · ${lev}× ${mmode === 'cross' ? '全仓' : '逐仓'}`,
    )
    setAmount(''); setSlider(0); setTp(''); setSl(''); setTrigger('')
  }

  return (
    <div className="p-3 space-y-3">
      {/* margin mode / leverage / position mode */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          data-fn="F-30"
          onClick={onMm}
          className="h-8 rounded-lg bg-elevated border border-line text-2xs font-medium
                     hover:border-brand transition-colors flex items-center justify-center gap-1"
        >
          <Layers className="w-3 h-3 text-muted" />
          {mmode === 'cross' ? '全仓' : '逐仓'}
        </button>
        <button
          data-fn="F-29"
          onClick={onLev}
          className="h-8 rounded-lg bg-elevated border border-line text-2xs font-semibold tnum
                     hover:border-brand transition-colors flex items-center justify-center gap-1"
        >
          <Zap className={cn('w-3 h-3', lev >= 75 ? 'text-down' : lev >= 25 ? 'text-warn' : 'text-muted')} />
          {lev}×
        </button>
      </div>

      <div className="flex items-center justify-between" data-fn="F-33">
        <span className="text-2xs text-muted flex items-center gap-1">
          持仓模式
          <InfoTip text="单向持仓：同一合约仅持有一个方向的仓位。双向持仓：可同时持有多头与空头仓位，分别计算盈亏与保证金。" />
        </span>
        <Seg
          size="xs"
          value={pmode}
          onChange={onPmode}
          items={[{ id: 'oneway', label: '单向' }, { id: 'hedge', label: '双向持仓' }]}
        />
      </div>

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
            {s === 'buy' ? longLabel : shortLabel}
          </button>
        ))}
      </div>

      {/* order type */}
      <div className="flex items-center justify-between gap-2">
        <Seg
          value={otype}
          onChange={v => setOtype(v)}
          items={[
            { id: 'limit', label: '限价' },
            { id: 'market', label: '市价' },
            { id: 'stop', label: '计划委托' },
          ]}
        />
        <span className="text-2xs text-faint">
          {otype === 'limit' ? 'Maker' : 'Taker'} {(feeRate * 100).toFixed(3)}%
        </span>
      </div>

      {otype === 'stop' && (
        <Field
          label="触发价"
          suffix={quote}
          value={trigger}
          onChange={setTrigger}
          right={<span className="text-2xs text-faint">标记价 {num(mark, dp)}</span>}
        />
      )}

      <Field
        label="价格"
        suffix={quote}
        value={otype === 'market' ? '' : price}
        onChange={setPrice}
        disabled={otype === 'market'}
        placeholder={otype === 'market' ? '以最优市价成交' : ''}
        right={otype !== 'market' && (
          <button onClick={() => setPrice(last.toFixed(dp))} className="text-2xs text-brand hover:brightness-125">
            最新价
          </button>
        )}
      />

      <Field label="数量" suffix={sizeUnit} value={amount} onChange={onAmount} placeholder="0.00" />

      <PercentSlider value={slider} onChange={setPctAmt} tone={side === 'buy' ? 'up' : 'down'} />

      {/* TIF + reduce-only */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" data-fn="F-31">
          <span className="text-2xs text-muted flex items-center gap-1">
            有效期
            <InfoTip text="GTC 撤销前有效 · IOC 立即成交并取消剩余 · FOK 全部成交否则取消。" />
          </span>
          <Seg
            size="xs"
            value={tif}
            onChange={setTif}
            items={[{ id: 'GTC', label: 'GTC' }, { id: 'IOC', label: 'IOC' }, { id: 'FOK', label: 'FOK' }]}
          />
        </div>
        <label className="flex items-center gap-1.5 text-2xs text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reduceOnly}
            onChange={e => setReduceOnly(e.target.checked)}
            className="w-3 h-3 accent-current"
          />
          只减仓
        </label>
      </div>

      {/* TP / SL — F-32 */}
      <div className="rounded-lg border border-line bg-elevated/40 p-2.5 space-y-2.5" data-fn="F-32">
        <label className="flex items-center gap-1.5 text-2xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={tpsl}
            onChange={e => setTpsl(e.target.checked)}
            className="w-3 h-3 accent-current"
          />
          <span className="font-medium">止盈止损</span>
          <InfoTip text="止盈止损将随本次委托一并提交，成交后自动挂出对应的条件平仓单，按标记价格触发。" />
        </label>
        {tpsl && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="止盈触发价" suffix={quote} value={tp} onChange={setTp} compact />
            <Field label="止损触发价" suffix={quote} value={sl} onChange={setSl} compact />
          </div>
        )}
      </div>

      {/* summary */}
      <div className="space-y-1.5">
        <KV k="可用保证金" v={<>{num(avail, marginCoin === 'USDT' ? 2 : 5)} <span className="text-faint">{marginCoin}</span></>} />
        <KV k="最大可开" v={<>{num(maxSize, dir === 'usdt' ? amtDp : 0)} <span className="text-faint">{sizeUnit}</span></>} />
        <KV k="委托价值" v={<>{num(notionalUsd, 2)} <span className="text-faint">{dir === 'usdt' ? quote : 'USD'}</span></>} />
        <KV
          k={<>保证金 ({lev}× · {mmode === 'cross' ? '全仓' : '逐仓'})</>}
          v={<>{num(cost, marginCoin === 'USDT' ? 2 : 6)} <span className="text-faint">{marginCoin}</span></>}
        />
        <KV k="预估强平价" v={liq > 0 ? num(liq, dp) : '--'} tone="text-warn" />
        <KV k={`手续费 (${(feeRate * 100).toFixed(3)}%)`} v={<>{num(fee, 4)} <span className="text-faint">{quote}</span></>} tone="text-muted" />
      </div>

      <Button variant={side === 'buy' ? 'up' : 'down'} className="w-full" disabled={!valid} onClick={submit}>
        {side === 'buy' ? longLabel : shortLabel}
      </Button>

      <button onClick={onTier} className="w-full text-2xs text-info hover:brightness-125 flex items-center justify-center gap-1" data-fn="F-38">
        <Settings2 className="w-3 h-3" /> 查看梯度保证金与最高杠杆
      </button>
    </div>
  )
}

function Field({
  label, value, onChange, suffix, disabled, placeholder, right, compact: cmp,
}: {
  label: string; value: string; onChange: (v: string) => void
  suffix: string; disabled?: boolean; placeholder?: string
  right?: React.ReactNode; compact?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-muted">{label}</span>
        {right}
      </div>
      <div className={cn(
        'flex items-center gap-1.5 px-2.5 rounded-lg bg-elevated border transition-colors',
        cmp ? 'h-8' : 'h-9',
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

/* ================================================================== *
 * Risk panel — F-39 / F-40 / F-41 / F-42
 * ================================================================== */
type Risk = ReturnType<typeof useRiskType>
// helper only for typing
function useRiskType() {
  return { wallet: 0, margin: 0, pnl: 0, notional: 0, maint: 0, equity: 0, ratio: 0, worst: 0 }
}

function RiskPanel({
  risk, adlLit, onTier, seed, className,
}: { risk: Risk; adlLit: number; onTier: () => void; seed: number; className?: string }) {
  const fundTrend = useMemo(() => {
    const r = seeded(seed + 777)
    let v = 100
    return Array.from({ length: 28 }, () => { v += r() * 3 - 0.9; return v })
  }, [seed])

  return (
    <div className={cn('border-t border-line p-3 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-warn" /> 风险指标
        </div>
        <button onClick={onTier} className="text-2xs text-info hover:brightness-125">梯度保证金</button>
      </div>

      {/* margin ratio */}
      <div data-fn="F-30">
        <div className="flex items-center justify-between text-2xs mb-1">
          <span className="text-muted flex items-center gap-1">
            保证金率
            <InfoTip text="保证金率 = 维持保证金 / 账户权益。达到 100% 时触发强制平仓。" />
          </span>
          <span className={cn('tnum font-semibold', riskTone(risk.ratio))}>{(risk.ratio * 100).toFixed(2)}%</span>
        </div>
        <RiskBar v={risk.ratio} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5">
        <KV k="账户权益" v={num(risk.equity, 2)} />
        <KV k="仓位保证金" v={num(risk.margin, 2)} />
        <KV k="维持保证金" v={num(risk.maint, 2)} tone="text-warn" />
        <KV k="未实现盈亏" v={<span className={risk.pnl >= 0 ? 'text-up' : 'text-down'}>{risk.pnl >= 0 ? '+' : ''}{num(risk.pnl, 2)}</span>} />
      </div>

      {/* insurance fund — F-41 */}
      <div className="rounded-lg border border-line bg-elevated/40 p-2.5" data-fn="F-41">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-2xs text-muted flex items-center gap-1">
              保险基金池
              <InfoTip text="保险基金用于承接强平仓位的穿仓损失。基金充足时，穿仓不会分摊给盈利用户。" />
            </div>
            <div className="text-sm font-semibold tnum mt-0.5">{num(INSURANCE_FUND, 2)} <span className="text-2xs text-faint">USDT</span></div>
          </div>
          <AreaChart data={fundTrend} tone="up" height={34} className="w-20 shrink-0" />
        </div>
      </div>

      {/* ADL — F-42 */}
      <div data-fn="F-42">
        <div className="flex items-center justify-between text-2xs mb-1.5">
          <span className="text-muted flex items-center gap-1">
            ADL 穿仓分摊指示灯
            <InfoTip text="自动减仓队列 (ADL) 指示灯：亮灯越多，代表您的持仓在穿仓分摊队列中排位越靠前。等级由盈利率与有效杠杆共同决定。" />
          </span>
          <span className={cn('tnum font-semibold', adlLit >= 4 ? 'text-down' : adlLit >= 3 ? 'text-warn' : 'text-up')}>
            {adlLit}/5
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= adlLit
                  ? (adlLit >= 4 ? 'bg-down' : adlLit >= 3 ? 'bg-warn' : 'bg-up')
                  : 'bg-line',
              )}
            />
          ))}
        </div>
      </div>

      {/* F-39 / F-40 notes */}
      <div className="space-y-1.5 pt-1 border-t border-line">
        <div className="flex gap-1.5 text-2xs text-faint leading-relaxed" data-fn="F-39">
          <ShieldAlert className="w-3 h-3 mt-0.5 shrink-0 text-warn" />
          <span>强平采用<span className="text-muted">逐级部分平仓</span>机制：优先按档位分批减仓，仅在风险仍未解除时才全额接管仓位。</span>
        </div>
        <div className="flex gap-1.5 text-2xs text-faint leading-relaxed" data-fn="F-40">
          <Timer className="w-3 h-3 mt-0.5 shrink-0 text-info" />
          <span>未实现盈亏<span className="text-muted">每分钟结算</span>一次，并实时计入账户权益与保证金率。</span>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== *
 * Modals
 * ================================================================== */
function LeverageModal({
  open, onClose, lev, setLev, onTier, base, price,
}: {
  open: boolean; onClose: () => void; lev: number; setLev: (v: number) => void
  onTier: () => void; base: string; price: number
}) {
  const [v, setV] = useState(lev)
  useEffect(() => { if (open) setV(lev) }, [open, lev])

  const tier = TIERS.find(t => t.lev <= v) ?? TIERS[0]
  const maxNotional = TIERS.filter(t => t.lev >= v).slice(-1)[0]?.to ?? 50_000
  const danger = v >= 75

  return (
    <Modal
      open={open} onClose={onClose}
      title={<span data-fn="F-29">调整杠杆倍数</span>}
      footer={
        <Button className="w-full" onClick={() => { setLev(v); onClose() }}>确认 · {v}×</Button>
      }
    >
      <div className="space-y-4">
        <div className="text-center">
          <div className={cn('text-3xl font-semibold tnum', danger ? 'text-down' : v >= 25 ? 'text-warn' : 'text-ink')}>
            {v}×
          </div>
          <div className="text-2xs text-muted mt-1">最高支持 125 倍杠杆</div>
        </div>

        <input
          type="range" min={1} max={125} value={v}
          onChange={e => setV(+e.target.value)}
          className="w-full accent-current cursor-pointer"
          style={{ accentColor: `rgb(var(--${danger ? 'down' : v >= 25 ? 'warn' : 'brand'}))` }}
        />

        <div className="grid grid-cols-4 gap-1.5">
          {LEV_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setV(p)}
              className={cn(
                'h-8 rounded-lg border text-xs font-semibold tnum transition-colors',
                v === p ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-ink hover:border-faint',
              )}
            >
              {p}×
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-line bg-elevated/50 p-3 space-y-1.5">
          <KV k="当前档位" v={`Tier ${tier.tier}`} />
          <KV k="起始保证金率" v={`${(100 / v).toFixed(2)}%`} />
          <KV k="维持保证金率" v={`${(tier.mmr * 100).toFixed(2)}%`} tone="text-warn" />
          <KV k="该档位最大仓位" v={`${compact(maxNotional)} USDT`} />
          <KV k={`1 ${base} 所需保证金`} v={`${num(price / v, 2)} USDT`} tone="text-muted" />
        </div>

        {danger && (
          <div className="flex gap-2 rounded-lg border border-down/30 bg-down/10 p-2.5 text-2xs text-down leading-relaxed">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>高杠杆将显著提高强平风险：{v}× 下价格反向波动约 {(100 / v).toFixed(2)}% 即触发强制平仓。请谨慎使用。</span>
          </div>
        )}

        <button onClick={onTier} className="w-full text-2xs text-info hover:brightness-125">
          查看完整梯度保证金表 →
        </button>
      </div>
    </Modal>
  )
}

function MarginModeModal({
  open, onClose, mode, setMode,
}: { open: boolean; onClose: () => void; mode: MarginMode; setMode: (m: MarginMode) => void }) {
  const [v, setV] = useState(mode)
  useEffect(() => { if (open) setV(mode) }, [open, mode])
  const opts: { id: MarginMode; label: string; desc: string }[] = [
    { id: 'cross', label: '全仓保证金', desc: '账户内全部可用余额作为该仓位的保证金，可有效降低强平概率；但爆仓时将损失全部账户权益。' },
    { id: 'isolated', label: '逐仓保证金', desc: '该仓位的保证金独立计算，风险与损失限定在已分配的保证金内，可单独追加保证金。' },
  ]
  return (
    <Modal
      open={open} onClose={onClose}
      title={<span data-fn="F-30">保证金模式</span>}
      footer={<Button className="w-full" onClick={() => { setMode(v); onClose() }}>确认</Button>}
    >
      <div className="space-y-2.5">
        {opts.map(o => (
          <button
            key={o.id}
            onClick={() => setV(o.id)}
            className={cn(
              'w-full text-left rounded-xl border p-3 transition-colors',
              v === o.id ? 'border-brand bg-brand/5' : 'border-line hover:border-faint',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{o.label}</span>
              <span className={cn(
                'w-3.5 h-3.5 rounded-full border-2 transition-colors',
                v === o.id ? 'border-brand bg-brand' : 'border-line',
              )} />
            </div>
            <p className="text-2xs text-muted mt-1.5 leading-relaxed">{o.desc}</p>
          </button>
        ))}
        <p className="text-2xs text-faint leading-relaxed pt-1">
          切换保证金模式仅对新开仓位生效；已有仓位需先平仓。
        </p>
      </div>
    </Modal>
  )
}

function TierModal({ open, onClose, symbol }: { open: boolean; onClose: () => void; symbol: string }) {
  const cols: Col<typeof TIERS[number]>[] = [
    { key: 'tier', header: '档位', cell: r => <span className="tnum">Tier {r.tier}</span> },
    { key: 'range', header: `仓位价值 (USDT)`, align: 'right', cell: r => (
      <span className="tnum">{compact(r.from)} – {r.to === Infinity ? '∞' : compact(r.to)}</span>
    ) },
    { key: 'imr', header: '起始保证金率', align: 'right', cell: r => `${(r.imr * 100).toFixed(2)}%` },
    { key: 'mmr', header: '维持保证金率', align: 'right', cell: r => <span className="text-warn">{(r.mmr * 100).toFixed(2)}%</span> },
    { key: 'lev', header: '最高杠杆', align: 'right', cell: r => <span className="font-semibold">{r.lev}×</span> },
  ]
  return (
    <Modal
      open={open} onClose={onClose} width="max-w-2xl"
      title={<span data-fn="F-38">梯度保证金 · {symbol} 永续</span>}
    >
      <Table dense cols={cols} rows={TIERS} />
      <p className="text-2xs text-faint leading-relaxed mt-3">
        仓位价值越高，所需的起始/维持保证金率越高、可用杠杆越低。系统按仓位名义价值自动匹配档位；
        跨档位时按对应档位的维持保证金率计算强平价格，强平时采用<span className="text-muted">逐级部分平仓</span>。
      </p>
    </Modal>
  )
}

function AdjustMarginModal({
  pos, onClose, onPatch,
}: { pos: Position | null; onClose: () => void; onPatch: (id: string, p: Partial<Position>) => void }) {
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [v, setV] = useState('')
  if (!pos) return null

  const avail = futBal('USDT')
  const delta = (parseFloat(v) || 0) * (mode === 'add' ? 1 : -1)
  const nextMargin = Math.max(1, pos.margin + delta)
  const nextRatio = Math.max(0.001, Math.min(1, pos.marginRatio * (pos.margin / nextMargin)))
  const long = pos.side === 'long'
  const nextLiq = long
    ? pos.liq - (delta / pos.size)
    : pos.liq + (delta / pos.size)

  return (
    <Modal
      open={!!pos} onClose={onClose}
      title={<span data-fn="F-35">调整保证金 · {pos.symbol}</span>}
      footer={
        <Button
          className="w-full"
          disabled={!parseFloat(v)}
          onClick={() => {
            onPatch(pos.id, { margin: nextMargin, marginRatio: nextRatio, liq: nextLiq, mode: 'isolated' })
            onClose()
          }}
        >
          确认调整
        </Button>
      }
    >
      <div className="space-y-3">
        <Seg
          className="w-full"
          value={mode}
          onChange={setMode}
          items={[{ id: 'add', label: '增加保证金' }, { id: 'remove', label: '减少保证金' }]}
        />
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs text-muted">调整数量</span>
            <button
              className="text-2xs text-brand"
              onClick={() => setV(String(mode === 'add' ? Math.floor(avail) : Math.floor(pos.margin * 0.3)))}
            >
              最大
            </button>
          </div>
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand">
            <input
              inputMode="decimal"
              value={v}
              placeholder="0.00"
              onChange={e => setV(e.target.value.replace(/[^\d.]/g, ''))}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm tnum placeholder:text-faint"
            />
            <span className="text-2xs text-muted">USDT</span>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-elevated/50 p-3 space-y-1.5">
          <KV k="可用余额" v={`${num(avail, 2)} USDT`} />
          <KV k="当前保证金" v={`${num(pos.margin, 2)} USDT`} />
          <KV k="调整后保证金" v={`${num(nextMargin, 2)} USDT`} tone="text-brand" />
          <KV k="当前强平价" v={num(pos.liq, priceDp(pos.liq))} />
          <KV k="调整后强平价" v={num(nextLiq, priceDp(pos.liq))} tone="text-warn" />
          <KV
            k="调整后保证金率"
            v={`${(nextRatio * 100).toFixed(2)}%`}
            tone={riskTone(nextRatio)}
          />
        </div>
        <p className="text-2xs text-faint leading-relaxed">
          增加保证金可降低强平价格与保证金率；减少保证金将提高强平风险。逐仓模式下仅影响该仓位。
        </p>
      </div>
    </Modal>
  )
}

function TpSlModal({
  pos, onClose, onPatch,
}: { pos: Position | null; onClose: () => void; onPatch: (id: string, p: Partial<Position>) => void }) {
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  useEffect(() => {
    setTp(pos?.tp ? String(pos.tp) : '')
    setSl(pos?.sl ? String(pos.sl) : '')
  }, [pos])
  if (!pos) return null

  const dp = priceDp(pos.mark)
  const long = pos.side === 'long'
  const tpv = parseFloat(tp) || 0
  const slv = parseFloat(sl) || 0
  const tpPnl = tpv ? (tpv - pos.entry) * pos.size * (long ? 1 : -1) : 0
  const slPnl = slv ? (slv - pos.entry) * pos.size * (long ? 1 : -1) : 0

  return (
    <Modal
      open={!!pos} onClose={onClose}
      title={<span data-fn="F-32">设置止盈止损 · {pos.symbol}</span>}
      footer={
        <Button
          className="w-full"
          onClick={() => {
            onPatch(pos.id, { tp: tpv || undefined, sl: slv || undefined })
            onClose()
          }}
        >
          确认
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-line bg-elevated/50 p-3 space-y-1.5">
          <KV k="方向 / 杠杆" v={<span className={long ? 'text-up' : 'text-down'}>{long ? '多' : '空'} · {pos.leverage}×</span>} />
          <KV k="开仓价" v={num(pos.entry, dp)} />
          <KV k="标记价" v={num(pos.mark, dp)} />
        </div>

        <div>
          <div className="text-2xs text-muted mb-1">止盈触发价 (按标记价触发)</div>
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-elevated border border-line focus-within:border-up">
            <input
              inputMode="decimal" value={tp} placeholder="0.00"
              onChange={e => setTp(e.target.value.replace(/[^\d.]/g, ''))}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm tnum placeholder:text-faint"
            />
            <span className="text-2xs text-muted">USDT</span>
          </div>
          {!!tpv && <div className="text-2xs text-up tnum mt-1">预计收益 +{num(Math.abs(tpPnl), 2)} USDT</div>}
        </div>

        <div>
          <div className="text-2xs text-muted mb-1">止损触发价 (按标记价触发)</div>
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-elevated border border-line focus-within:border-down">
            <input
              inputMode="decimal" value={sl} placeholder="0.00"
              onChange={e => setSl(e.target.value.replace(/[^\d.]/g, ''))}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm tnum placeholder:text-faint"
            />
            <span className="text-2xs text-muted">USDT</span>
          </div>
          {!!slv && <div className="text-2xs text-down tnum mt-1">预计亏损 -{num(Math.abs(slPnl), 2)} USDT</div>}
        </div>
      </div>
    </Modal>
  )
}

/* ================================================================== *
 * Bottom panel — 持仓 / 当前委托 / 历史委托 / 成交记录 / 资金费用
 * ================================================================== */
type FundingRow = {
  ts: number; symbol: string; side: 'long' | 'short'
  notional: number; rate: number; fee: number
}

function BottomPanel({
  symbol, positions, orders, hist, fills, funding, onCancel, onClose, onPatch, risk,
}: {
  symbol: string
  positions: Position[]; orders: FuturesOrder[]; hist: FuturesOrder[]; fills: FuturesOrder[]
  funding: FundingRow[]
  onCancel: (id: string) => void
  onClose: (p: Position) => void
  onPatch: (id: string, p: Partial<Position>) => void
  risk: Risk
}) {
  const [tab, setTab] = useState<BTab>('pos')
  const [onlyCur, setOnlyCur] = useState(false)
  const [adj, setAdj] = useState<Position | null>(null)
  const [tps, setTps] = useState<Position | null>(null)

  const f = <T extends { symbol: string }>(rows: T[]) => onlyCur ? rows.filter(r => r.symbol === symbol) : rows

  const posCols: Col<Position>[] = [
    { key: 'sym', header: '合约', cell: r => (
      <div className="flex items-center gap-1.5">
        <span className={cn('w-0.5 h-4 rounded-full', r.side === 'long' ? 'bg-up' : 'bg-down')} />
        <span className="font-medium">{r.symbol}</span>
        <Badge tone="muted">永续</Badge>
      </div>
    ) },
    { key: 'side', header: '方向', cell: r => (
      <span className={r.side === 'long' ? 'text-up' : 'text-down'}>{r.side === 'long' ? '多' : '空'}</span>
    ) },
    { key: 'lev', header: '杠杆', align: 'right', cell: r => <span className="tnum">{r.leverage}×</span> },
    { key: 'mode', header: '模式', cell: r => (
      <span className="text-muted">{r.mode === 'cross' ? '全仓' : '逐仓'}</span>
    ) },
    { key: 'size', header: '数量', align: 'right', cell: r => num(r.size, r.mark > 1000 ? 3 : 1) },
    { key: 'entry', header: '开仓价', align: 'right', cell: r => num(r.entry, priceDp(r.entry)) },
    { key: 'mark', header: '标记价', align: 'right', cell: r => <span data-fn="F-34">{num(r.mark, priceDp(r.mark))}</span> },
    { key: 'liq', header: '强平价', align: 'right', cell: r => <span className="text-warn">{num(r.liq, priceDp(r.liq))}</span> },
    { key: 'margin', header: '保证金', align: 'right', hideBelow: 'lg', cell: r => num(r.margin, 2) },
    { key: 'pnl', header: '未实现盈亏', align: 'right', cell: r => (
      <div className={cn('tnum', r.pnl >= 0 ? 'text-up' : 'text-down')}>
        <div>{r.pnl >= 0 ? '+' : ''}{num(r.pnl, 2)}</div>
        <div className="text-2xs opacity-80">{pct(r.pnlPct)}</div>
      </div>
    ) },
    { key: 'mr', header: '保证金率', align: 'right', width: '108px', cell: r => (
      <div className="w-[92px] ml-auto">
        <div className={cn('text-2xs tnum font-semibold mb-1', riskTone(r.marginRatio))}>
          {(r.marginRatio * 100).toFixed(2)}%
          {r.marginRatio > 0.8 && <span className="ml-1 text-down">⚠</span>}
        </div>
        <RiskBar v={r.marginRatio} />
      </div>
    ) },
    { key: 'tpsl', header: '止盈/止损', align: 'right', hideBelow: 'lg', cell: r => (
      <span className="tnum text-2xs">
        <span className={r.tp ? 'text-up' : 'text-faint'}>{r.tp ? num(r.tp, priceDp(r.tp)) : '--'}</span>
        <span className="text-faint"> / </span>
        <span className={r.sl ? 'text-down' : 'text-faint'}>{r.sl ? num(r.sl, priceDp(r.sl)) : '--'}</span>
      </span>
    ) },
    { key: 'act', header: '操作', align: 'right', width: '190px', cell: r => (
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => onClose(r)}
          className="px-2 py-1 rounded-md text-2xs border border-line text-muted hover:border-down hover:text-down transition-colors"
        >
          平仓
        </button>
        <button
          data-fn="F-35"
          onClick={() => setAdj(r)}
          className="px-2 py-1 rounded-md text-2xs border border-line text-muted hover:border-brand hover:text-brand transition-colors"
        >
          调整保证金
        </button>
        <button
          data-fn="F-32"
          onClick={() => setTps(r)}
          className="px-2 py-1 rounded-md text-2xs border border-line text-muted hover:border-info hover:text-info transition-colors"
        >
          止盈止损
        </button>
      </div>
    ) },
  ]

  const sideCell = (s: 'buy' | 'sell') => (
    <span className={s === 'buy' ? 'text-up' : 'text-down'}>{s === 'buy' ? '买入/开多' : '卖出/开空'}</span>
  )
  const typeLabel = (t: FuturesOrder['type']) =>
    t === 'limit' ? '限价' : t === 'market' ? '市价' : t === 'stop' ? '计划委托' : '止盈委托'

  const openCols: Col<FuturesOrder>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-muted tnum text-2xs">{fmtDateTime(r.ts)}</span> },
    { key: 'sym', header: '合约', cell: r => <span className="font-medium">{r.symbol}</span> },
    { key: 'type', header: '类型', cell: r => <span className="text-muted">{typeLabel(r.type)}</span> },
    { key: 'side', header: '方向', cell: r => sideCell(r.side) },
    { key: 'price', header: '委托价', align: 'right', cell: r => num(r.price, priceDp(r.price)) },
    { key: 'amt', header: '数量', align: 'right', cell: r => num(r.amount, r.price > 1000 ? 3 : 1) },
    { key: 'tif', header: 'TIF', hideBelow: 'md', cell: r => <Badge tone="muted"><span data-fn="F-31">{r.tif}</span></Badge> },
    { key: 'ro', header: '只减仓', hideBelow: 'lg', cell: r => (
      r.reduceOnly ? <Badge tone="info">是</Badge> : <span className="text-faint text-2xs">否</span>
    ) },
    { key: 'st', header: '状态', cell: r => <Badge tone="info">未成交</Badge> },
    { key: 'act', header: '操作', align: 'right', cell: r => (
      <button
        onClick={() => onCancel(r.id)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-2xs text-muted
                   border border-line hover:border-down hover:text-down transition-colors"
      >
        <X className="w-3 h-3" /> 撤单
      </button>
    ) },
  ]

  const histCols: Col<FuturesOrder>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-muted tnum text-2xs">{fmtDateTime(r.ts)}</span> },
    { key: 'sym', header: '合约', cell: r => <span className="font-medium">{r.symbol}</span> },
    { key: 'type', header: '类型', cell: r => <span className="text-muted">{typeLabel(r.type)}</span> },
    { key: 'side', header: '方向', cell: r => sideCell(r.side) },
    { key: 'price', header: '委托价', align: 'right', cell: r => num(r.price, priceDp(r.price)) },
    { key: 'amt', header: '数量', align: 'right', cell: r => num(r.amount, r.price > 1000 ? 3 : 1) },
    { key: 'filled', header: '成交量', align: 'right', hideBelow: 'md', cell: r => num(r.filled, r.price > 1000 ? 3 : 1) },
    { key: 'tif', header: 'TIF', hideBelow: 'lg', cell: r => <span className="text-muted text-2xs">{r.tif}</span> },
    { key: 'st', header: '状态', cell: r => (
      <Badge tone={r.status === 'filled' ? 'up' : r.status === 'triggered' ? 'warn' : 'muted'}>
        {r.status === 'filled' ? '完全成交' : r.status === 'triggered' ? '已触发' : '已撤销'}
      </Badge>
    ) },
  ]

  const fillCols: Col<FuturesOrder>[] = [
    { key: 'ts', header: '成交时间', cell: r => <span className="text-muted tnum text-2xs">{fmtDateTime(r.ts)}</span> },
    { key: 'sym', header: '合约', cell: r => <span className="font-medium">{r.symbol}</span> },
    { key: 'side', header: '方向', cell: r => sideCell(r.side) },
    { key: 'price', header: '成交价', align: 'right', cell: r => num(r.price, priceDp(r.price)) },
    { key: 'amt', header: '成交量', align: 'right', cell: r => num(r.filled, r.price > 1000 ? 3 : 1) },
    { key: 'val', header: '成交额', align: 'right', cell: r => num(r.price * r.filled, 2) },
    { key: 'role', header: '角色', hideBelow: 'md', cell: r => (
      <Badge tone={r.type === 'limit' ? 'brand' : 'muted'}>{r.type === 'limit' ? 'Maker' : 'Taker'}</Badge>
    ) },
    { key: 'fee', header: '手续费', align: 'right', hideBelow: 'md', cell: r => (
      <span className="text-muted">
        {num(r.price * r.filled * (r.type === 'limit' ? USER.makerFee : USER.takerFee), 4)} USDT
      </span>
    ) },
  ]

  const fundCols: Col<FundingRow>[] = [
    { key: 'ts', header: '结算时间', cell: r => <span className="text-muted tnum text-2xs">{fmtDateTime(r.ts)}</span> },
    { key: 'sym', header: '合约', cell: r => <span className="font-medium">{r.symbol}</span> },
    { key: 'side', header: '方向', cell: r => (
      <span className={r.side === 'long' ? 'text-up' : 'text-down'}>{r.side === 'long' ? '多' : '空'}</span>
    ) },
    { key: 'notional', header: '仓位价值', align: 'right', cell: r => num(r.notional, 2) },
    { key: 'rate', header: '资金费率', align: 'right', cell: r => (
      <span className={r.rate >= 0 ? 'text-up' : 'text-down'}>{(r.rate * 100).toFixed(4)}%</span>
    ) },
    { key: 'fee', header: '资金费用 (USDT)', align: 'right', cell: r => (
      <span className={r.fee >= 0 ? 'text-up' : 'text-down'}>{r.fee >= 0 ? '+' : ''}{num(r.fee, 4)}</span>
    ) },
  ]

  const tabs: [BTab, string][] = [
    ['pos', `持仓 (${f(positions).length})`],
    ['open', `当前委托 (${f(orders).length})`],
    ['hist', '历史委托'],
    ['fills', '成交记录'],
    ['funding', '资金费用记录'],
  ]

  return (
    <>
      <Panel
        title={
          <div className="flex items-center gap-1">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap',
                  tab === id ? 'bg-elevated text-ink font-semibold' : 'text-muted hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
        right={
          <div className="flex items-center gap-3">
            <span className="text-2xs text-muted">
              未实现盈亏{' '}
              <span className={cn('tnum font-semibold', risk.pnl >= 0 ? 'text-up' : 'text-down')}>
                {risk.pnl >= 0 ? '+' : ''}{num(risk.pnl, 2)} USDT
              </span>
            </span>
            <label className="flex items-center gap-1.5 text-2xs text-muted cursor-pointer select-none">
              <input
                type="checkbox" checked={onlyCur}
                onChange={e => setOnlyCur(e.target.checked)}
                className="w-3 h-3 accent-current"
              />
              仅当前合约
            </label>
          </div>
        }
        bodyClass="overflow-auto scroll-thin"
      >
        {tab === 'pos' && <Table dense cols={posCols} rows={f(positions)} empty="暂无持仓" />}
        {tab === 'open' && <Table dense cols={openCols} rows={f(orders)} empty="暂无未成交委托" />}
        {tab === 'hist' && <Table dense cols={histCols} rows={f(hist)} empty="暂无历史委托" />}
        {tab === 'fills' && <Table dense cols={fillCols} rows={f(fills)} empty="暂无成交记录" />}
        {tab === 'funding' && <Table dense cols={fundCols} rows={f(funding)} empty="暂无资金费用记录" />}
      </Panel>

      <AdjustMarginModal pos={adj} onClose={() => setAdj(null)} onPatch={onPatch} />
      <TpSlModal pos={tps} onClose={() => setTps(null)} onPatch={onPatch} />
    </>
  )
}

/* ================================================================== *
 * Mobile
 * ================================================================== */
function MobileHeader({
  sym, mark, index, funding, countdown, dir, setDir, lev, mmode, onLev, onMm,
}: {
  sym: string; mark: number; index: number; funding: number; countdown: string
  dir: Dir; setDir: (d: Dir) => void; lev: number; mmode: MarginMode
  onLev: () => void; onMm: () => void
}) {
  const t = bySymbol(sym)
  const up = t.change >= 0
  const dp = priceDp(t.price)
  return (
    <div className="bg-surface border-b border-line px-3 py-2.5">
      <div className="flex items-center justify-between">
        <MarketPicker sym={sym} kind="futures" />
        <div className="text-right">
          <div className={cn('text-lg font-semibold tnum leading-tight', up ? 'text-up' : 'text-down')}>
            {num(t.price, dp)}
          </div>
          <div className={cn('text-2xs tnum', up ? 'text-up' : 'text-down')}>{pct(t.change)}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2.5">
        <Seg
          size="xs" value={dir} onChange={setDir}
          items={[
            { id: 'usdt', label: <span data-fn="F-26">正向 USDT</span> },
            { id: 'coin', label: <span data-fn="F-27">反向 币本位</span> },
          ]}
        />
        <button
          data-fn="F-30" onClick={onMm}
          className="h-7 px-2 rounded-lg bg-elevated border border-line text-2xs hover:border-brand transition-colors"
        >
          {mmode === 'cross' ? '全仓' : '逐仓'}
        </button>
        <button
          data-fn="F-29" onClick={onLev}
          className="h-7 px-2 rounded-lg bg-elevated border border-line text-2xs font-semibold tnum hover:border-brand transition-colors"
        >
          {lev}×
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2.5">
        <div data-fn="F-34">
          <div className="text-2xs text-faint">标记价格</div>
          <div className="text-2xs tnum mt-0.5">{num(mark, dp)}</div>
        </div>
        <div data-fn="F-36">
          <div className="text-2xs text-faint flex items-center gap-1">
            指数价格 <InfoTip text="指数价格由多家主流交易所行情按权重聚合，每秒更新一次。" />
          </div>
          <div className="text-2xs tnum mt-0.5">{num(index, dp)}</div>
        </div>
        <div data-fn="F-37">
          <div className="text-2xs text-faint">资金费率 / 倒计时</div>
          <div className="text-2xs tnum mt-0.5 flex items-center gap-1">
            <span className={funding >= 0 ? 'text-up' : 'text-down'}>{(funding * 100).toFixed(4)}%</span>
            <span className="text-warn">{countdown}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileBody({
  sym, seed, book, feed, positions, orders, hist, fills, funding,
  onCancel, onClose, onPatch, onPick, risk, adlLit, onTier,
}: {
  sym: string; seed: number
  book: { asks: any[]; bids: any[] }; feed: Trade[]
  positions: Position[]; orders: FuturesOrder[]; hist: FuturesOrder[]; fills: FuturesOrder[]
  funding: FundingRow[]
  onCancel: (id: string) => void
  onClose: (p: Position) => void
  onPatch: (id: string, p: Partial<Position>) => void
  onPick: (p: number) => void
  risk: Risk; adlLit: number; onTier: () => void
}) {
  const t = bySymbol(sym)
  const [tab, setTab] = useState<'chart' | 'book' | 'trades' | 'risk'>('chart')
  return (
    <>
      <div className="px-3 bg-surface border-b border-line">
        <TabsUnderline
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'chart', label: '图表' },
            { id: 'book', label: '订单簿' },
            { id: 'trades', label: '成交' },
            { id: 'risk', label: '风险' },
          ]}
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
      {tab === 'risk' && (
        <div className="bg-surface border-b border-line">
          <RiskPanel risk={risk} adlLit={adlLit} onTier={onTier} seed={seed} className="border-t-0" />
        </div>
      )}

      <div className="min-h-[300px] bg-surface">
        <BottomPanel
          symbol={sym} positions={positions} orders={orders} hist={hist} fills={fills}
          funding={funding} onCancel={onCancel} onClose={onClose} onPatch={onPatch} risk={risk}
        />
      </div>
    </>
  )
}
