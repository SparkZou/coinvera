import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, XCircle, Ban, ExternalLink } from 'lucide-react'
import {
  Card, Button, Badge, Select, Tabs, TabsUnderline, Table, Modal, PageHeader, type Col,
} from '@/components/ui'
import {
  SPOT_ORDERS, FUTURES_ORDERS, openSpotOrders, histSpotOrders,
  type SpotOrder, type FuturesOrder,
} from '@/mock/account'
import { cn, num, usd, priceDp, seeded, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * F-21 币币订单管理 · F-24 合约订单管理
 * 当前委托 / 历史委托 / 成交记录
 * ------------------------------------------------------------------ */

type Fill = {
  id: string; ts: number; symbol: string; side: 'buy' | 'sell'
  price: number; qty: number; fee: number; role: 'Maker' | 'Taker'
  market: 'spot' | 'futures'
}

const rf = seeded(31337)
const FILLS: Fill[] = [
  ...SPOT_ORDERS.filter(o => o.filled > 0).map(o => ({
    id: 'T' + o.id.slice(1), ts: o.ts + 42_000, symbol: o.symbol, side: o.side,
    price: o.price, qty: o.filled, fee: o.filled * o.price * (rf() > 0.5 ? 0.0008 : 0.001),
    role: (rf() > 0.5 ? 'Maker' : 'Taker') as Fill['role'], market: 'spot' as const,
  })),
  ...FUTURES_ORDERS.filter(o => o.filled > 0).map(o => ({
    id: 'T' + o.id.slice(1), ts: o.ts + 27_000, symbol: o.symbol, side: o.side,
    price: o.price, qty: o.filled, fee: o.filled * o.price * (rf() > 0.5 ? 0.0002 : 0.0005),
    role: (rf() > 0.5 ? 'Maker' : 'Taker') as Fill['role'], market: 'futures' as const,
  })),
].sort((a, b) => b.ts - a.ts)

const ORD_ST: Record<string, { label: string; tone: 'up' | 'down' | 'warn' | 'info' | 'muted' | 'brand' }> = {
  open: { label: '未成交', tone: 'info' },
  partial: { label: '部分成交', tone: 'warn' },
  filled: { label: '已完成', tone: 'up' },
  cancelled: { label: '已撤销', tone: 'muted' },
  triggered: { label: '已触发', tone: 'brand' },
}
const TYPE_LABEL: Record<string, string> = {
  limit: '限价', market: '市价', stop: '止损', take_profit: '止盈',
}

const Side = ({ s }: { s: 'buy' | 'sell' }) => (
  <span className={cn('text-xs font-medium', s === 'buy' ? 'text-up' : 'text-down')}>
    {s === 'buy' ? '买入' : '卖出'}
  </span>
)

function Progress({ v }: { v: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-14 h-1 rounded-full bg-line overflow-hidden hidden md:block">
        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.min(100, v * 100)}%` }} />
      </div>
      <span className="tnum text-2xs text-muted w-9 text-right">{(v * 100).toFixed(0)}%</span>
    </div>
  )
}

type Market = 'spot' | 'futures'
type Sub = 'open' | 'hist' | 'fills'

export default function Orders() {
  const [market, setMarket] = useState<Market>('spot')
  const [sub, setSub] = useState<Sub>('open')

  const [symbol, setSymbol] = useState('all')
  const [side, setSide] = useState('all')
  const [st, setSt] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [cancelled, setCancelled] = useState<string[]>([])
  const [cancelAll, setCancelAll] = useState(false)

  const symbols = useMemo(
    () => Array.from(new Set([...SPOT_ORDERS, ...FUTURES_ORDERS].map(o => o.symbol))).sort(),
    [],
  )

  const iso = (ts: number) => new Date(ts).toISOString().slice(0, 10)
  const inRange = <T extends { ts: number; symbol: string; side: string }>(o: T) =>
    (symbol === 'all' || o.symbol === symbol) &&
    (side === 'all' || o.side === side) &&
    (!from || iso(o.ts) >= from) &&
    (!to || iso(o.ts) <= to)

  /* ------------------------------ spot rows ------------------------------ */
  const spotOpen = useMemo(
    () => openSpotOrders().filter(o => !cancelled.includes(o.id)).filter(inRange).sort((a, b) => b.ts - a.ts),
    [cancelled, symbol, side, from, to],
  )
  const spotHist = useMemo(
    () => [
      ...histSpotOrders(),
      ...SPOT_ORDERS.filter(o => cancelled.includes(o.id)).map(o => ({ ...o, status: 'cancelled' as const })),
    ]
      .filter(inRange)
      .filter(o => st === 'all' || o.status === st)
      .sort((a, b) => b.ts - a.ts),
    [cancelled, symbol, side, st, from, to],
  )

  /* ---------------------------- futures rows ----------------------------- */
  const futOpen = useMemo(
    () => FUTURES_ORDERS.filter(o => o.status === 'open').filter(o => !cancelled.includes(o.id)).filter(inRange).sort((a, b) => b.ts - a.ts),
    [cancelled, symbol, side, from, to],
  )
  const futHist = useMemo(
    () => FUTURES_ORDERS
      .filter(o => o.status !== 'open' || cancelled.includes(o.id))
      .map(o => (cancelled.includes(o.id) ? { ...o, status: 'cancelled' as const } : o))
      .filter(inRange)
      .filter(o => st === 'all' || o.status === st)
      .sort((a, b) => b.ts - a.ts),
    [cancelled, symbol, side, st, from, to],
  )

  const fills = useMemo(
    () => FILLS.filter(f => f.market === market).filter(inRange),
    [market, symbol, side, from, to],
  )

  const openRows = market === 'spot' ? spotOpen : futOpen
  const openCount = openRows.length

  const reset = () => { setSymbol('all'); setSide('all'); setSt('all'); setFrom(''); setTo('') }
  const doCancelAll = () => {
    setCancelled(c => [...c, ...openRows.map(o => o.id)])
    setCancelAll(false)
  }

  /* -------------------------------- columns ------------------------------- */
  const spotCols = (open: boolean): Col<SpotOrder>[] => [
    { key: 'ts', header: '时间', cell: o => <span className="text-xs text-muted tnum">{fmtDateTime(o.ts)}</span> },
    {
      key: 'sym', header: '交易对',
      cell: o => (
        <Link to={`/trade/spot/${o.symbol.replace('/', '-')}`} className="text-sm font-medium hover:text-brand transition-colors">
          {o.symbol}
        </Link>
      ),
    },
    { key: 'side', header: '方向', cell: o => <Side s={o.side} /> },
    { key: 'type', header: '类型', hideBelow: 'md', cell: o => <span className="text-xs text-muted">{TYPE_LABEL[o.type]}</span> },
    { key: 'px', header: '价格', align: 'right', cell: o => <span className="tnum text-sm">{o.type === 'market' ? <span className="text-faint">市价</span> : num(o.price, priceDp(o.price))}</span> },
    { key: 'amt', header: '数量', align: 'right', cell: o => <span className="tnum text-sm">{num(o.amount, o.price > 1000 ? 5 : 2)}</span> },
    { key: 'fill', header: '已成交', align: 'right', hideBelow: 'sm', cell: o => <Progress v={o.amount ? o.filled / o.amount : 0} /> },
    { key: 'total', header: '成交额', align: 'right', hideBelow: 'lg', cell: o => <span className="tnum text-xs text-muted">{usd(o.filled * o.price)}</span> },
    { key: 'st', header: '状态', align: 'center', cell: o => <Badge tone={ORD_ST[o.status].tone}>{ORD_ST[o.status].label}</Badge> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: o => open
        ? (
          <button
            onClick={() => setCancelled(c => [...c, o.id])}
            className="text-2xs text-down hover:underline"
          >
            撤单
          </button>
        )
        : <span className="text-2xs text-faint font-mono">{o.id}</span>,
    },
  ]

  const futCols = (open: boolean): Col<FuturesOrder>[] => [
    { key: 'ts', header: '时间', cell: o => <span className="text-xs text-muted tnum">{fmtDateTime(o.ts)}</span> },
    {
      key: 'sym', header: '合约',
      cell: o => (
        <Link to={`/trade/futures/${o.symbol.replace('/', '-')}`} className="text-sm font-medium hover:text-brand transition-colors">
          {o.symbol} <span className="text-2xs text-faint">永续</span>
        </Link>
      ),
    },
    { key: 'side', header: '方向', cell: o => <Side s={o.side} /> },
    { key: 'type', header: '类型', hideBelow: 'md', cell: o => <span className="text-xs text-muted">{TYPE_LABEL[o.type]}</span> },
    { key: 'tif', header: 'TIF', hideBelow: 'lg', cell: o => <Badge tone={o.tif === 'GTC' ? 'muted' : o.tif === 'IOC' ? 'info' : 'warn'}>{o.tif}</Badge> },
    {
      key: 'ro', header: '只减仓', align: 'center', hideBelow: 'lg',
      cell: o => o.reduceOnly
        ? <Badge tone="brand">是</Badge>
        : <span className="text-2xs text-faint">否</span>,
    },
    { key: 'px', header: '价格', align: 'right', cell: o => <span className="tnum text-sm">{o.type === 'market' ? <span className="text-faint">市价</span> : num(o.price, priceDp(o.price))}</span> },
    { key: 'amt', header: '数量', align: 'right', cell: o => <span className="tnum text-sm">{num(o.amount, o.price > 1000 ? 3 : 1)}</span> },
    { key: 'st', header: '状态', align: 'center', cell: o => <Badge tone={ORD_ST[o.status].tone}>{ORD_ST[o.status].label}</Badge> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: o => open
        ? <button onClick={() => setCancelled(c => [...c, o.id])} className="text-2xs text-down hover:underline">撤单</button>
        : <span className="text-2xs text-faint font-mono">{o.id}</span>,
    },
  ]

  const fillCols: Col<Fill>[] = [
    { key: 'ts', header: '成交时间', cell: f => <span className="text-xs text-muted tnum">{fmtDateTime(f.ts)}</span> },
    {
      key: 'sym', header: market === 'spot' ? '交易对' : '合约',
      cell: f => <span className="text-sm font-medium">{f.symbol}</span>,
    },
    { key: 'side', header: '方向', cell: f => <Side s={f.side} /> },
    { key: 'role', header: '角色', hideBelow: 'md', cell: f => <Badge tone={f.role === 'Maker' ? 'up' : 'info'}>{f.role}</Badge> },
    { key: 'px', header: '成交价', align: 'right', cell: f => <span className="tnum text-sm">{num(f.price, priceDp(f.price))}</span> },
    { key: 'qty', header: '成交量', align: 'right', cell: f => <span className="tnum text-sm">{num(f.qty, f.price > 1000 ? 5 : 2)}</span> },
    { key: 'val', header: '成交额', align: 'right', hideBelow: 'sm', cell: f => <span className="tnum text-sm">{usd(f.qty * f.price)}</span> },
    { key: 'fee', header: '手续费', align: 'right', cell: f => <span className="tnum text-xs text-muted">{usd(f.fee, 4)}</span> },
    { key: 'id', header: '成交号', align: 'right', hideBelow: 'lg', cell: f => <span className="text-2xs text-faint font-mono">{f.id}</span> },
  ]

  /* --------------------------------- render -------------------------------- */
  const emptyText = sub === 'open' ? '当前没有未完成的委托' : sub === 'hist' ? '没有匹配的历史委托' : '没有匹配的成交记录'

  return (
    <div>
      <PageHeader
        title="订单管理"
        sub="F-21 币币订单 · F-24 合约订单 — 当前委托 / 历史委托 / 成交记录"
        actions={
          <>
            <Link to="/assets"><Button variant="ghost" size="sm">资产</Button></Link>
            <Link to={market === 'spot' ? '/trade/spot/BTC-USDT' : '/trade/futures/BTC-USDT'}>
              <Button variant="outline" size="sm">去交易<ExternalLink className="w-3 h-3" /></Button>
            </Link>
          </>
        }
      />

      <TabsUnderline
        className="mb-4"
        value={market} onChange={m => { setMarket(m); setSymbol('all'); setSt('all') }}
        tabs={[{ id: 'spot', label: '币币订单' }, { id: 'futures', label: '合约订单' }]}
      />

      <Card>
        {/* sub tabs + filters */}
        <div className="px-4 py-3 border-b border-line space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={sub} onChange={setSub}
              tabs={[
                { id: 'open', label: '当前委托', count: openCount },
                { id: 'hist', label: '历史委托' },
                { id: 'fills', label: '成交记录' },
              ]}
            />
            <div className="flex-1" />
            {sub === 'open' && openCount > 0 && (
              <Button variant="danger" size="sm" onClick={() => setCancelAll(true)}>
                <Ban className="w-3.5 h-3.5" />全部撤单
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
            <Select
              value={symbol} onChange={e => setSymbol(e.target.value)}
              options={[{ value: 'all', label: '全部交易对' }, ...symbols.map(s => ({ value: s, label: s }))]}
            />
            <Select
              value={side} onChange={e => setSide(e.target.value)}
              options={[{ value: 'all', label: '全部方向' }, { value: 'buy', label: '买入' }, { value: 'sell', label: '卖出' }]}
            />
            {sub === 'hist' ? (
              <Select
                value={st} onChange={e => setSt(e.target.value)}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'filled', label: '已完成' },
                  { value: 'cancelled', label: '已撤销' },
                  ...(market === 'futures' ? [{ value: 'triggered', label: '已触发' }] : []),
                ]}
              />
            ) : <div className="hidden lg:block" />}
            <input
              type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="h-10 px-3 rounded-lg bg-elevated border border-line text-sm tnum outline-none
                         focus:border-brand [color-scheme:light] dark:[color-scheme:dark]"
            />
            <input
              type="date" value={to} onChange={e => setTo(e.target.value)}
              className="h-10 px-3 rounded-lg bg-elevated border border-line text-sm tnum outline-none
                         focus:border-brand [color-scheme:light] dark:[color-scheme:dark]"
            />
            <Button variant="subtle" size="md" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" />重置
            </Button>
          </div>
        </div>

        {/* desktop tables */}
        <div className="hidden sm:block">
          {sub === 'fills'
            ? <Table cols={fillCols} rows={fills} empty={emptyText} />
            : market === 'spot'
              ? <Table cols={spotCols(sub === 'open')} rows={sub === 'open' ? spotOpen : spotHist} empty={emptyText} />
              : <Table cols={futCols(sub === 'open')} rows={sub === 'open' ? futOpen : futHist} empty={emptyText} />}
        </div>

        {/* mobile cards */}
        <div className="sm:hidden divide-y divide-line/60">
          {sub === 'fills' && fills.map(f => (
            <div key={f.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.symbol}</span>
                  <Side s={f.side} />
                  <Badge tone={f.role === 'Maker' ? 'up' : 'info'}>{f.role}</Badge>
                </div>
                <span className="text-2xs text-faint tnum">{fmtDateTime(f.ts).slice(5)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-2xs">
                <div><div className="text-faint">成交价</div><div className="tnum mt-0.5">{num(f.price, priceDp(f.price))}</div></div>
                <div><div className="text-faint">成交量</div><div className="tnum mt-0.5">{num(f.qty, 4)}</div></div>
                <div className="text-right"><div className="text-faint">成交额</div><div className="tnum mt-0.5">{usd(f.qty * f.price)}</div></div>
              </div>
            </div>
          ))}

          {sub !== 'fills' && (market === 'spot' ? (sub === 'open' ? spotOpen : spotHist) : []).map(o => (
            <div key={o.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{o.symbol}</span>
                  <Side s={o.side} />
                  <span className="text-2xs text-faint">{TYPE_LABEL[o.type]}</span>
                </div>
                <Badge tone={ORD_ST[o.status].tone}>{ORD_ST[o.status].label}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-2xs">
                <div><div className="text-faint">价格</div><div className="tnum mt-0.5">{o.type === 'market' ? '市价' : num(o.price, priceDp(o.price))}</div></div>
                <div><div className="text-faint">数量</div><div className="tnum mt-0.5">{num(o.amount, 4)}</div></div>
                <div className="text-right"><div className="text-faint">已成交</div><div className="tnum mt-0.5">{((o.filled / (o.amount || 1)) * 100).toFixed(0)}%</div></div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-2xs text-faint tnum">{fmtDateTime(o.ts)}</span>
                {sub === 'open' && (
                  <button onClick={() => setCancelled(c => [...c, o.id])} className="text-2xs text-down">撤单</button>
                )}
              </div>
            </div>
          ))}

          {sub !== 'fills' && (market === 'futures' ? (sub === 'open' ? futOpen : futHist) : []).map(o => (
            <div key={o.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{o.symbol}</span>
                  <Side s={o.side} />
                  <Badge tone={o.tif === 'GTC' ? 'muted' : o.tif === 'IOC' ? 'info' : 'warn'}>{o.tif}</Badge>
                  {o.reduceOnly && <Badge tone="brand">只减仓</Badge>}
                </div>
                <Badge tone={ORD_ST[o.status].tone}>{ORD_ST[o.status].label}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-2xs">
                <div><div className="text-faint">类型</div><div className="mt-0.5">{TYPE_LABEL[o.type]}</div></div>
                <div><div className="text-faint">价格</div><div className="tnum mt-0.5">{o.type === 'market' ? '市价' : num(o.price, priceDp(o.price))}</div></div>
                <div className="text-right"><div className="text-faint">数量</div><div className="tnum mt-0.5">{num(o.amount, 3)}</div></div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-2xs text-faint tnum">{fmtDateTime(o.ts)}</span>
                {sub === 'open' && (
                  <button onClick={() => setCancelled(c => [...c, o.id])} className="text-2xs text-down">撤单</button>
                )}
              </div>
            </div>
          ))}

          {((sub === 'fills' && fills.length === 0) ||
            (sub !== 'fills' && (market === 'spot' ? (sub === 'open' ? spotOpen : spotHist) : (sub === 'open' ? futOpen : futHist)).length === 0)) && (
            <div className="py-12 text-center text-xs text-faint">{emptyText}</div>
          )}
        </div>
      </Card>

      <p className="text-2xs text-faint mt-4 leading-relaxed">
        撤单为原型内的本地状态变更；生产环境下撤单请求经撮合引擎确认后，通过 WebSocket 私有频道推送订单状态更新。
        成交记录中的手续费按 VIP 等级的 Maker / Taker 费率实时计算。
      </p>

      <Modal
        open={cancelAll} onClose={() => setCancelAll(false)} title="全部撤单"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelAll(false)}>取消</Button>
            <Button variant="down" className="flex-1" onClick={doCancelAll}>确认撤销 {openCount} 笔</Button>
          </div>
        }
      >
        <div className="flex gap-3">
          <XCircle className="w-5 h-5 text-down shrink-0 mt-0.5" />
          <div className="text-sm">
            将撤销当前筛选条件下的
            <b className="text-down tnum mx-1">{openCount}</b>
            笔{market === 'spot' ? '币币' : '合约'}未完成委托，已成交部分不受影响。
            <p className="text-xs text-muted mt-2">此操作不可撤销。</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
