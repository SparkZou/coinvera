import React, { useMemo, useState } from 'react'
import {
  AlertTriangle, Ban, Check, Download, KeyRound, LogOut, Pencil,
  ShieldCheck, Smartphone, Snowflake, Unlock, Wallet,
} from 'lucide-react'
import {
  ListPage, ConfigPage, ReviewQueue, ReportPage,
  StatusBadge, Mono, Money,
  Card, CardHeader, Button, Badge, Table, Modal, Stat, Select,
  type Col,
} from './kit'
import { AreaChart } from '@/components/charts'
import {
  ADMIN_USERS, KYC_QUEUE, SERIES, COINS, FUTURES_PAIRS,
  type AdminUser, type KycApp,
} from '@/mock/admin'
import { REFERRALS, BROKER_STATS, SPOT_ORDERS, POSITIONS, LEDGER } from '@/mock/account'
import { TICKERS } from '@/mock/market'
import { cn, num, usd, compact, fmtDateTime, seeded } from '@/lib/utils'

/* ================================================================== *
 * g2 — 用户管理 (6) · 业务报表 (7) · 增值服务/经纪人 (4)
 * B-22 … B-38.  All data derived deterministically from the mocks.
 * ================================================================== */

const days = (n: number) => Date.now() - n * 86_400_000
const iso = (ts: number) => new Date(ts).toISOString().slice(0, 19).replace('T', ' ')
const isoDay = (ts: number) => new Date(ts).toISOString().slice(0, 10)
const pctStr = (v: number, dp = 1) => `${v.toFixed(dp)}%`

/* ------------------------------ tiny primitives ---------------------------- */

/** Horizontal meter — margin ratio, allocation, KYC completion … */
function Meter({
  value, tone, className,
}: { value: number; tone: 'brand' | 'up' | 'down' | 'warn' | 'info'; className?: string }) {
  const fill = { brand: 'bg-brand', up: 'bg-up', down: 'bg-down', warn: 'bg-warn', info: 'bg-info' }[tone]
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-line overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', fill)}
           style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  )
}

function CheckBox({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className={cn(
        'w-4 h-4 rounded border grid place-items-center shrink-0 transition-colors',
        on ? 'bg-brand border-brand' : 'border-line hover:border-faint',
      )}
    >
      {on && <Check className="w-3 h-3 text-brand-ink" />}
    </button>
  )
}

/** Minimal CSV export — proves the button is not a prop. */
function exportCsv(name: string, header: string[], rows: (string | number)[][]) {
  const body = [header, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ================================================================== *
 * DERIVED DATASETS
 * ================================================================== */

/* ---- B-25 用户交易汇总 ---- */
type TradeSum = {
  uid: string; vip: number; spot30d: number; futures30d: number
  trades: number; fee: number; makerPct: number; lastTrade: string
}
const rT = seeded(8801)
const TRADE_SUM: TradeSum[] = ADMIN_USERS.map(u => {
  const spot30d = +(rT() * 4_800_000 + 2_000).toFixed(2)
  const futures30d = +(rT() * 13_500_000 + 5_000).toFixed(2)
  const trades = Math.floor(rT() * 4_200 + 12)
  return {
    uid: u.uid, vip: u.vip, spot30d, futures30d, trades,
    fee: +((spot30d * 0.001 + futures30d * 0.0004) * (1 - u.vip * 0.06)).toFixed(2),
    makerPct: +(rT() * 62 + 18).toFixed(1),
    lastTrade: u.lastLogin,
  }
})

/* ---- B-26 用户持仓汇总 ---- */
type PosSum = {
  id: string; uid: string; symbol: string; side: '多' | '空'; leverage: number
  size: number; notional: number; pnl: number; marginRatio: number; liq: number
}
const rP = seeded(6402)
const POS_SUM: PosSum[] = Array.from({ length: 42 }, (_, i) => {
  const t = POSITIONS[i % POSITIONS.length]
  const u = ADMIN_USERS[(i * 5 + 3) % ADMIN_USERS.length]
  const big = t.entry > 1_000
  const size = +(t.size * (0.3 + rP() * 2.6)).toFixed(big ? 3 : 1)
  const mark = t.mark * (1 + (rP() - 0.5) * 0.04)
  const notional = size * mark
  const side: '多' | '空' = rP() > 0.44 ? '多' : '空'
  const leverage = [5, 10, 20, 25, 50, 75, 100][Math.floor(rP() * 7)]
  const marginRatio = +(rP() * 0.94 + 0.04).toFixed(3)
  return {
    id: `PS${i + 1}`, uid: u.uid, symbol: `${t.symbol.replace('/', '')} 永续`, side, leverage,
    size, notional: +notional.toFixed(2),
    pnl: +((rP() - 0.42) * notional * 0.14).toFixed(2),
    marginRatio,
    liq: +(side === '多' ? mark * (1 - 0.92 / leverage) : mark * (1 + 0.92 / leverage)).toFixed(2),
  }
})
const AT_RISK = POS_SUM.filter(p => p.marginRatio > 0.8)

/* ---- B-27 用户流水汇总 ---- */
type LedgerSum = {
  uid: string; deposit: number; withdraw: number; net: number
  fee: number; rebate: number; assets: number; lastAt: string
}
const rL = seeded(3312)
const LEDGER_SUM: LedgerSum[] = ADMIN_USERS.map((u, i) => {
  const deposit = +(rL() * 620_000 + 500).toFixed(2)
  const withdraw = +(deposit * rL() * 0.92).toFixed(2)
  return {
    uid: u.uid, deposit, withdraw, net: +(deposit - withdraw).toFixed(2),
    fee: +(rL() * 12_000 + 20).toFixed(2),
    rebate: +(rL() * 4_200).toFixed(2),
    assets: u.assets,
    lastAt: fmtDateTime(LEDGER[i % LEDGER.length].ts),
  }
})
const LED_TOTAL = LEDGER_SUM.reduce(
  (s, l) => ({
    deposit: s.deposit + l.deposit, withdraw: s.withdraw + l.withdraw,
    fee: s.fee + l.fee, rebate: s.rebate + l.rebate,
  }),
  { deposit: 0, withdraw: 0, fee: 0, rebate: 0 },
)

/* ---- 报表：币币交易 (B-28) ---- */
const rS = seeded(1201)
const SPOT_REPORT = TICKERS.map(t => {
  const trades = Math.floor(t.turnover / (t.price * 45) + rS() * 1_200)
  const maker = +(t.turnover * (0.38 + rS() * 0.24)).toFixed(2)
  return {
    symbol: t.symbol, turnover: t.turnover, trades, maker,
    taker: +(t.turnover - maker).toFixed(2),
    fee: +(t.turnover * 0.00085).toFixed(2),
  }
})
const SPOT_TOTAL = SPOT_REPORT.reduce(
  (s, r) => ({ turnover: s.turnover + r.turnover, trades: s.trades + r.trades, fee: s.fee + r.fee }),
  { turnover: 0, trades: 0, fee: 0 },
)

/* ---- 报表：合约持仓 (B-29) ---- */
const rF = seeded(2402)
const FUT_POS_REPORT = FUTURES_PAIRS.map(p => {
  const oi = +(rF() * 4_200_000 + 380_000).toFixed(2)
  const longShare = 0.36 + rF() * 0.3
  const long = +(oi * longShare).toFixed(2)
  return {
    symbol: p.symbol, oi, long, short: +(oi - long).toFixed(2),
    ratio: +(longShare / (1 - longShare)).toFixed(3),
    funding: +((rF() - 0.42) * 0.00035).toFixed(6),
    maxLev: p.maxLeverage,
  }
})
const OI_TOTAL = FUT_POS_REPORT.reduce((s, r) => s + r.oi, 0)
const OI_LONG = FUT_POS_REPORT.reduce((s, r) => s + r.long, 0)
const OI_30D = SERIES.turnover30d.map(v => Math.round(v * 0.42 + 6_800_000))

/* ---- 报表：合约平仓 (B-30) ---- */
const rFC = seeded(5502)
const FUT_CLOSE_REPORT = FUTURES_PAIRS.map(p => {
  const closed = +(rFC() * 3_100_000 + 240_000).toFixed(2)
  const liq = +(closed * (0.02 + rFC() * 0.06)).toFixed(2)
  const bankrupt = +(liq * rFC() * 0.09).toFixed(2)
  return {
    symbol: p.symbol, closed, manual: +(closed - liq).toFixed(2), liq,
    liqCount: Math.floor(rFC() * 180 + 4), bankrupt,
    insurance: +(bankrupt * (0.6 + rFC() * 0.5)).toFixed(2),
  }
})
const CLOSE_30D = SERIES.turnover30d.map(v => Math.round(v * 0.28 + 2_400_000))
const CLOSE_TOTAL = FUT_CLOSE_REPORT.reduce(
  (s, r) => ({
    closed: s.closed + r.closed, liq: s.liq + r.liq,
    liqCount: s.liqCount + r.liqCount, insurance: s.insurance + r.insurance,
  }),
  { closed: 0, liq: 0, liqCount: 0, insurance: 0 },
)

/* ---- 报表：注册 (B-31) ---- */
const rR = seeded(7301)
const CHANNELS = ['自然流量', '经纪人邀请', 'Google Ads', 'Twitter', 'APP 商店', 'KOL 推广']
const REG_REPORT = SERIES.register30d.map((total, i) => {
  const email = Math.round(total * (0.5 + rR() * 0.28))
  return {
    date: isoDay(days(29 - i)),
    total, email, phone: total - email,
    channel: CHANNELS[Math.floor(rR() * CHANNELS.length)],
    kycRate: +(rR() * 42 + 34).toFixed(1),
  }
}).reverse()
const REG_7 = SERIES.register30d.slice(-7).reduce((s, v) => s + v, 0)
const REG_30 = SERIES.register30d.reduce((s, v) => s + v, 0)

/* ---- 报表：登录 (B-32) ---- */
const rLg = seeded(6603)
const LOGIN_REPORT = SERIES.login7d.map((logins, i) => {
  const uniq = Math.round(logins * (0.52 + rLg() * 0.22))
  return {
    date: isoDay(days(6 - i)),
    logins, uniq,
    fails: Math.floor(logins * (0.01 + rLg() * 0.05)),
    twoFa: +(rLg() * 26 + 62).toFixed(1),
    badIp: Math.floor(rLg() * 24 + 2),
  }
}).reverse()
const LOGIN_TODAY = LOGIN_REPORT[0]

/* ---- 报表：充值 / 提币 (B-33 / B-34) ---- */
const rD = seeded(4404)
const DEP_REPORT = COINS.map(c => {
  const amount = +(rD() * 2_400_000 + 40_000).toFixed(2)
  const count = Math.floor(rD() * 1_400 + 30)
  const users = Math.floor(count * (0.42 + rD() * 0.35))
  return { coin: c.coin, chains: c.chains.join(' / '), amount, count, users, avg: +(amount / count).toFixed(2) }
})
const DEP_TOTAL = DEP_REPORT.reduce(
  (s, r) => ({ amount: s.amount + r.amount, count: s.count + r.count, users: s.users + r.users }),
  { amount: 0, count: 0, users: 0 },
)
const rW = seeded(8804)
const WD_REPORT = COINS.map(c => {
  const amount = +(rW() * 1_700_000 + 26_000).toFixed(2)
  const count = Math.floor(rW() * 900 + 18)
  const users = Math.floor(count * (0.4 + rW() * 0.34))
  return {
    coin: c.coin, chains: c.chains.join(' / '), amount, count, users,
    fee: +(count * c.withdrawFee * (c.coin === 'USDT' ? 1 : 96_000 * 0.00002)).toFixed(2),
    pending: Math.floor(rW() * 6),
    rejected: Math.floor(rW() * 12),
  }
})
const WD_TOTAL = WD_REPORT.reduce(
  (s, r) => ({
    amount: s.amount + r.amount, count: s.count + r.count, users: s.users + r.users,
    pending: s.pending + r.pending, rejected: s.rejected + r.rejected, fee: s.fee + r.fee,
  }),
  { amount: 0, count: 0, users: 0, pending: 0, rejected: 0, fee: 0 },
)

/* ---- 经纪人 (B-35 … B-38) ---- */
export type BrokerTier = '青铜' | '白银' | '黄金' | '铂金' | '钻石'
const TIER_DEF: {
  tier: BrokerTier; volReq: number; teamReq: number
  spot: number; futures: number; direct: number
}[] = [
  { tier: '青铜', volReq: 0,           teamReq: 0,   spot: 0.20, futures: 0.25, direct: 0.10 },
  { tier: '白银', volReq: 1_000_000,   teamReq: 10,  spot: 0.25, futures: 0.30, direct: 0.15 },
  { tier: '黄金', volReq: 5_000_000,   teamReq: 30,  spot: 0.30, futures: 0.40, direct: 0.25 },
  { tier: '铂金', volReq: 20_000_000,  teamReq: 80,  spot: 0.40, futures: 0.45, direct: 0.35 },
  { tier: '钻石', volReq: 100_000_000, teamReq: 250, spot: 0.50, futures: 0.50, direct: 0.50 },
]
const tierTone = (t: string) =>
  t === '钻石' ? 'info' : t === '铂金' ? 'brand' : t === '黄金' ? 'warn' : t === '白银' ? 'muted' : 'muted'

type Broker = {
  uid: string; tier: BrokerTier; direct: number; team: number
  spotRate: number; futuresRate: number; teamVol: number
  month: number; total: number; status: '正常' | '停用'
  position: number; margin: number
}
const rB = seeded(9110)
const L1_UIDS = REFERRALS.filter(r => r.level === 1).map(r => r.uid)
const BROKER_UIDS = Array.from(new Set([...L1_UIDS, ...ADMIN_USERS.slice(0, 12).map(u => u.uid)]))
const BROKERS: Broker[] = BROKER_UIDS.map((uid, i) => {
  const teamVol = +(rB() * 60_000_000).toFixed(2)
  const def = [...TIER_DEF].reverse().find(t => teamVol >= t.volReq) ?? TIER_DEF[0]
  const direct = Math.floor(rB() * 34 + 1)
  const total = +(rB() * 68_000 + 400).toFixed(2)
  const position = +(rB() * 4_200_000 + 40_000).toFixed(2)
  return {
    uid, tier: def.tier, direct,
    team: direct + Math.floor(rB() * 180),
    spotRate: def.spot, futuresRate: def.futures, teamVol,
    month: +(total * (0.06 + rB() * 0.22)).toFixed(2), total,
    status: (i % 11 === 7 ? '停用' : '正常') as Broker['status'],
    position, margin: +(position / (4 + rB() * 16)).toFixed(2),
  }
}).sort((a, b) => b.total - a.total)

const BROKER_TOTAL = BROKERS.reduce(
  (s, b) => ({ month: s.month + b.month, total: s.total + b.total, team: s.team + b.team }),
  { month: 0, total: 0, team: 0 },
)

/** F-44 — 三种返佣模式并存 */
const MODES = ['返佣', '分佣', '直客返佣'] as const
type CommRow = {
  id: string; ts: string; broker: string; from: string; level: 'L1' | 'L2' | 'L3'
  kind: '现货' | '合约'; fee: number; mode: typeof MODES[number]; rate: number; amount: number
}
const rC = seeded(4477)
const COMMISSIONS: CommRow[] = Array.from({ length: 60 }, (_, i) => {
  const b = BROKERS[i % BROKERS.length]
  const ref = REFERRALS[(i * 3) % REFERRALS.length]
  const kind: '现货' | '合约' = rC() > 0.45 ? '合约' : '现货'
  const fee = +(rC() * 1_900 + 4).toFixed(2)
  const mode = MODES[Math.floor(rC() * 3)]
  const rate =
    mode === '直客返佣' ? [0.5, 0.3, 0.15][ref.level - 1]
    : mode === '分佣'   ? [0.1, 0.05, 0.02][ref.level - 1]
    : (kind === '合约' ? b.futuresRate : b.spotRate) * [1, 0.4, 0.15][ref.level - 1]
  return {
    id: `RC${8000 + i}`,
    ts: iso(days(Math.floor(rC() * 30))),
    broker: b.uid, from: ref.uid,
    level: `L${ref.level}` as CommRow['level'],
    kind, fee, mode, rate: +rate.toFixed(4),
    amount: +(fee * rate).toFixed(2),
  }
}).sort((a, b) => (a.ts < b.ts ? 1 : -1))
const COMM_MONTHLY = Array.from({ length: 12 }, () => Math.round(rC() * 42_000 + 14_000))

/* ================================================================== *
 * B-22 用户管理
 * ================================================================== */

const SEC_ITEMS = ['谷歌验证器', '短信验证', '邮箱验证', '资金密码', '防钓鱼码', '提币白名单']

function UserDetail({ u, onAction }: { u: AdminUser; onAction: (a: string) => void }) {
  const rr = seeded(Number(u.uid))
  const alloc = useMemo(() => {
    const raw = ['USDT', 'BTC', 'ETH', 'SOL', '其他'].map(coin => ({ coin, w: rr() + 0.12 }))
    const sum = raw.reduce((s, a) => s + a.w, 0)
    return raw.map(a => ({ coin: a.coin, share: (a.w / sum) * 100, value: u.assets * (a.w / sum) }))
  }, [u.uid])

  const sec = useMemo(() => {
    const r2 = seeded(Number(u.uid) + 7)
    return SEC_ITEMS.map(name => ({ name, on: r2() > 0.38 }))
  }, [u.uid])

  const orders = useMemo(() => {
    const start = Number(u.uid) % (SPOT_ORDERS.length - 5)
    return SPOT_ORDERS.slice(start, start + 5)
  }, [u.uid])

  const ACTIONS: { label: string; icon: React.ReactNode; danger?: boolean }[] = [
    { label: '冻结账户', icon: <Snowflake className="w-3.5 h-3.5" />, danger: true },
    { label: '解冻账户', icon: <Unlock className="w-3.5 h-3.5" /> },
    { label: '限制提现', icon: <Ban className="w-3.5 h-3.5" />, danger: true },
    { label: '重置密码', icon: <KeyRound className="w-3.5 h-3.5" /> },
    { label: '强制下线', icon: <LogOut className="w-3.5 h-3.5" /> },
    { label: '解绑谷歌验证', icon: <Smartphone className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* profile */}
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {([
          ['UID', <Mono key="u">{u.uid}</Mono>],
          ['邮箱', u.email],
          ['手机', u.phone],
          ['国家 / 地区', u.country],
          ['KYC 状态', <StatusBadge key="k" s={u.kyc} />],
          ['账户状态', <StatusBadge key="s" s={u.status} />],
          ['VIP 等级', `VIP ${u.vip}`],
          ['邀请人', u.inviter ? <Mono key="i">{u.inviter}</Mono> : <span key="i" className="text-faint">—</span>],
          ['注册时间', <span key="r" className="tnum">{u.registeredAt}</span>],
          ['最后登录', <span key="l" className="tnum">{u.lastLogin}</span>],
        ] as [string, React.ReactNode][]).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1 border-b border-line/60">
            <span className="text-xs text-muted shrink-0">{k}</span>
            <span className="text-xs text-right truncate">{v}</span>
          </div>
        ))}
      </div>

      {/* assets */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-semibold">资产分布</span>
          <span className="text-sm font-semibold tnum">{usd(u.assets)}</span>
        </div>
        <div className="space-y-2">
          {alloc.map(a => (
            <div key={a.coin} className="flex items-center gap-3">
              <span className="text-xs w-12 shrink-0">{a.coin}</span>
              <Meter value={a.share} tone="brand" />
              <span className="text-2xs text-muted tnum w-12 text-right shrink-0">{pctStr(a.share)}</span>
              <span className="text-2xs tnum w-24 text-right shrink-0">{usd(a.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* security */}
      <div>
        <div className="text-xs font-semibold mb-2">安全设置状态</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sec.map(s => (
            <div key={s.name} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-elevated">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', s.on ? 'bg-up' : 'bg-faint')} />
              <span className="text-2xs truncate">{s.name}</span>
              <span className={cn('text-2xs ml-auto shrink-0', s.on ? 'text-up' : 'text-faint')}>
                {s.on ? '已开启' : '未开启'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* recent orders */}
      <div>
        <div className="text-xs font-semibold mb-2">近期订单</div>
        <div className="rounded-lg border border-line overflow-hidden">
          <Table
            dense
            rows={orders}
            cols={[
              { key: 'ts', header: '时间', cell: o => <span className="text-2xs text-muted tnum">{fmtDateTime(o.ts)}</span> },
              { key: 'sym', header: '交易对', cell: o => <span className="text-xs">{o.symbol}</span> },
              {
                key: 'side', header: '方向',
                cell: o => <span className={cn('text-xs', o.side === 'buy' ? 'text-up' : 'text-down')}>{o.side === 'buy' ? '买入' : '卖出'}</span>,
              },
              { key: 'px', header: '价格', align: 'right', cell: o => <span className="text-xs">{num(o.price, 2)}</span> },
              { key: 'amt', header: '数量', align: 'right', cell: o => <span className="text-xs">{num(o.amount, 4)}</span> },
              {
                key: 'st', header: '状态', align: 'right',
                cell: o => (
                  <Badge tone={o.status === 'filled' ? 'up' : o.status === 'cancelled' ? 'muted' : 'warn'}>
                    {{ filled: '已成交', cancelled: '已撤销', open: '挂单中', partial: '部分成交' }[o.status]}
                  </Badge>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* admin actions */}
      <div>
        <div className="text-xs font-semibold mb-2">管理操作</div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map(a => (
            <Button
              key={a.label} size="sm" variant={a.danger ? 'danger' : 'outline'}
              onClick={() => onAction(a.label)}
            >
              {a.icon}{a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Users() {
  const [sel, setSel] = useState<AdminUser | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [batch, setBatch] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const toggle = (id: string) =>
    setPicked(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  /** Any cell opens the detail modal — effectively a row click. */
  const clk = (u: AdminUser, node: React.ReactNode) => (
    <div className="cursor-pointer" onClick={() => setSel(u)}>{node}</div>
  )

  const cols: Col<AdminUser>[] = [
    {
      key: 'pick', header: '', width: '36px',
      cell: u => <CheckBox on={picked.has(u.id)} onClick={() => toggle(u.id)} />,
    },
    { key: 'uid', header: 'UID', cell: u => clk(u, <Mono className="font-semibold">{u.uid}</Mono>) },
    { key: 'email', header: '邮箱', cell: u => clk(u, <span className="text-xs">{u.email}</span>) },
    { key: 'phone', header: '手机', hideBelow: 'lg', cell: u => clk(u, <span className="text-xs text-muted tnum">{u.phone}</span>) },
    { key: 'country', header: '国家', hideBelow: 'md', cell: u => clk(u, <span className="text-xs">{u.country}</span>) },
    { key: 'kyc', header: 'KYC', cell: u => clk(u, <StatusBadge s={u.kyc} />) },
    { key: 'vip', header: 'VIP', align: 'center', cell: u => clk(u, <span className="text-xs tnum">VIP {u.vip}</span>) },
    { key: 'assets', header: '总资产 (USD)', align: 'right', cell: u => clk(u, <Money v={u.assets} />) },
    { key: 'status', header: '状态', cell: u => clk(u, <StatusBadge s={u.status} />) },
    { key: 'reg', header: '注册时间', hideBelow: 'lg', cell: u => clk(u, <span className="text-2xs text-muted tnum">{u.registeredAt}</span>) },
    { key: 'last', header: '最后登录', hideBelow: 'lg', cell: u => clk(u, <span className="text-2xs text-muted tnum">{u.lastLogin}</span>) },
    {
      key: 'op', header: '操作', align: 'right',
      cell: u => <Button size="sm" variant="ghost" onClick={() => setSel(u)}>详情</Button>,
    },
  ]

  const stats = [
    { label: '用户总数', value: num(ADMIN_USERS.length, 0), hint: '全部注册用户' },
    { label: '已实名', value: num(ADMIN_USERS.filter(u => u.kyc === '已认证').length, 0), hint: 'KYC 通过' },
    { label: '受限 / 冻结', value: num(ADMIN_USERS.filter(u => u.status !== '正常').length, 0), hint: '需要关注' },
    { label: '用户总资产', value: usd(ADMIN_USERS.reduce((s, u) => s + u.assets, 0), 0), hint: '账面合计' },
  ]

  return (
    <>
      <ListPage<AdminUser>
        fnId="B-22"
        title="用户管理"
        sub="点击任意行查看用户详情、资产分布与管理操作"
        stats={stats}
        cols={cols}
        rows={ADMIN_USERS}
        perPage={12}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索 UID / 邮箱', width: 'w-56' },
          { type: 'select', key: 'kyc', label: '全部 KYC', options: ['未认证', '待审核', '已认证', '已驳回'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['正常', '冻结', '限制提现'] },
          { type: 'select', key: 'country', label: '全部国家', width: 'w-32', options: [...new Set(ADMIN_USERS.map(u => u.country))] },
        ]}
        match={(u, s) =>
          (!s.q || u.uid.includes(s.q) || u.email.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.kyc || u.kyc === s.kyc) &&
          (!s.status || u.status === s.status) &&
          (!s.country || u.country === s.country)
        }
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={!picked.size} onClick={() => setBatch(true)}>
              批量操作{picked.size > 0 && ` (${picked.size})`}
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => exportCsv(
                'users',
                ['UID', '邮箱', '手机', '国家', 'KYC', 'VIP', '总资产', '状态', '注册时间', '最后登录'],
                ADMIN_USERS.map(u => [u.uid, u.email, u.phone, u.country, u.kyc, u.vip, u.assets, u.status, u.registeredAt, u.lastLogin]),
              )}
            >
              <Download className="w-3.5 h-3.5" />导出 CSV
            </Button>
          </div>
        }
      />

      {/* detail */}
      <Modal
        open={!!sel} onClose={() => { setSel(null); setToast(null) }}
        title={sel ? `用户详情 · ${sel.uid}` : ''} width="max-w-3xl"
        footer={
          <div className="flex items-center gap-3">
            {toast
              ? <span className="text-xs text-up">✓ 已执行「{toast}」· 操作已记入管理员操作日志</span>
              : <span className="text-2xs text-faint">所有管理操作均需二次确认并记入操作日志</span>}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => { setSel(null); setToast(null) }}>关闭</Button>
          </div>
        }
      >
        {sel && <UserDetail u={sel} onAction={a => setToast(a)} />}
      </Modal>

      {/* batch */}
      <Modal
        open={batch} onClose={() => setBatch(false)} title={`批量操作 · 已选 ${picked.size} 个用户`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBatch(false)}>取消</Button>
            <Button onClick={() => { setBatch(false); setPicked(new Set()) }}>确认执行</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="操作类型"
            options={['批量冻结', '批量解冻', '批量限制提现', '批量解除限制', '批量导出所选'].map(o => ({ value: o, label: o }))}
          />
          <div className="rounded-lg bg-elevated p-3 max-h-40 overflow-y-auto scroll-thin">
            <div className="flex flex-wrap gap-1.5">
              {[...picked].map(id => {
                const u = ADMIN_USERS.find(x => x.id === id)!
                return <Badge key={id} tone="brand"><Mono>{u.uid}</Mono></Badge>
              })}
            </div>
          </div>
          <p className="text-2xs text-faint">批量操作将逐条写入管理员操作日志，并向用户发送站内信通知。</p>
        </div>
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-23 实名认证审核  —— showcase page
 * ================================================================== */

/** A CSS-drawn ID document. No images, no network. */
function IdDoc({ app, back }: { app: KycApp; back?: boolean }) {
  const blurred = app.riskFlags.includes('证件模糊')
  return (
    <div className="rounded-xl border border-line bg-elevated p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">{back ? '证件反面' : '证件正面'}</span>
        <Badge tone={blurred ? 'warn' : 'info'}>{blurred ? '清晰度偏低' : '已上传'}</Badge>
      </div>

      <div className="relative aspect-[1.58/1] rounded-lg overflow-hidden border border-line
                      bg-gradient-to-br from-surface via-elevated to-surface">
        {/* security tint + guilloche */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand/10 via-transparent to-info/10" />
        <div className="absolute -right-8 -bottom-10 w-32 h-32 rounded-full border border-brand/20" />
        <div className="absolute -right-4 -bottom-6 w-24 h-24 rounded-full border border-brand/20" />
        <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-brand/10 border border-brand/20" />

        <div className={cn('relative h-full p-3 flex flex-col', blurred && 'blur-sm')}>
          {/* header strip */}
          <div className="flex items-center justify-between pb-1.5 border-b border-line">
            <span className="text-2xs font-semibold tracking-wide">
              {back ? 'ISSUING AUTHORITY' : app.country.toUpperCase()} · {app.docType}
            </span>
            <span className="w-6 h-2 rounded-sm bg-brand/40" />
          </div>

          {!back ? (
            <div className="flex gap-3 pt-2.5 flex-1">
              {/* portrait */}
              <div className="w-1/4 min-w-[52px] rounded bg-gradient-to-b from-line to-elevated
                              border border-line grid place-items-end overflow-hidden">
                <div className="w-full flex flex-col items-center">
                  <span className="w-1/2 aspect-square rounded-full bg-faint/40 mb-0.5" />
                  <span className="w-4/5 h-1/3 rounded-t-full bg-faint/40" />
                </div>
              </div>
              {/* fields */}
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div>
                  <div className="text-[7px] text-faint uppercase tracking-widest">Name</div>
                  <div className="text-2xs font-semibold truncate">{app.realName}</div>
                </div>
                <div>
                  <div className="text-[7px] text-faint uppercase tracking-widest">Document No.</div>
                  <div className="text-2xs font-mono tracking-wider truncate">{app.docNo}</div>
                </div>
                <div className="flex gap-3">
                  <div className="min-w-0">
                    <div className="text-[7px] text-faint uppercase tracking-widest">DOB</div>
                    <div className="text-2xs tnum">19{70 + (app.docNo.length * 3) % 30}-0{1 + app.id.length % 8}-1{app.id.length % 9}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[7px] text-faint uppercase tracking-widest">Expiry</div>
                    <div className="text-2xs tnum">2031-05-1{app.id.length % 9}</div>
                  </div>
                </div>
                <div className="space-y-0.5 pt-0.5">
                  <span className="block h-1 w-full rounded-full bg-line" />
                  <span className="block h-1 w-3/4 rounded-full bg-line" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between pt-2.5">
              <div className="space-y-1">
                <span className="block h-1 w-5/6 rounded-full bg-line" />
                <span className="block h-1 w-2/3 rounded-full bg-line" />
                <span className="block h-1 w-3/4 rounded-full bg-line" />
              </div>
              {/* MRZ */}
              <div className="rounded bg-surface/60 border border-line px-1.5 py-1 space-y-0.5">
                <div className="text-[7px] font-mono tracking-[0.2em] text-muted truncate">
                  P&lt;{app.country.slice(0, 3).toUpperCase()}{app.realName.replace(/[^A-Za-z]/g, '') || 'XXX'}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                </div>
                <div className="text-[7px] font-mono tracking-[0.2em] text-muted truncate">
                  {app.docNo}&lt;{4 + app.id.length}&lt;&lt;90121{app.id.length % 9}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KycDetail({ app }: { app: KycApp }) {
  const low = app.faceScore < 80
  const fields: [string, React.ReactNode][] = [
    ['真实姓名', app.realName],
    ['证件类型', app.docType],
    ['证件号', <Mono key="d">{app.docNo}</Mono>],
    ['国家 / 地区', app.country],
    ['认证等级', <Badge key="l" tone="brand">Level {app.level}</Badge>],
    ['提交时间', <span key="t" className="tnum">{app.submittedAt}</span>],
    ['UID', <Mono key="u">{app.uid}</Mono>],
    ['当前状态', <StatusBadge key="s" s={app.status} />],
  ]

  return (
    <div className="space-y-4">
      {/* documents */}
      <div className="grid sm:grid-cols-2 gap-3">
        <IdDoc app={app} />
        <IdDoc app={app} back />
      </div>

      {/* face compare */}
      <Card className="bg-elevated/50">
        <CardHeader
          title="人脸比对 / 活体检测"
          right={<Badge tone={low ? 'warn' : 'up'}>{low ? '需人工复核' : '自动通过阈值'}</Badge>}
        />
        <div className="p-4 flex flex-col sm:flex-row items-center gap-5">
          {/* avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-line
                            bg-gradient-to-b from-elevated to-surface grid place-items-end">
              <div className="w-full flex flex-col items-center">
                <span className="w-8 h-8 rounded-full bg-faint/40 mb-0.5" />
                <span className="w-14 h-7 rounded-t-full bg-faint/40" />
              </div>
            </div>
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full grid place-items-center border-2 border-surface',
              low ? 'bg-warn' : 'bg-up',
            )}>
              <ShieldCheck className="w-3 h-3 text-white" />
            </span>
          </div>

          {/* gauge */}
          <div className="flex-1 w-full">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs text-muted">活体检测分数</span>
              <span className={cn('text-lg font-semibold tnum', low ? 'text-warn' : 'text-up')}>
                {num(app.faceScore, 1)}
                <span className="text-xs text-faint font-normal"> / 100</span>
              </span>
            </div>
            <div className="relative">
              <Meter value={app.faceScore} tone={low ? 'warn' : 'up'} className="h-2" />
              {/* 80 threshold marker */}
              <span className="absolute -top-0.5 w-px h-3 bg-faint" style={{ left: '80%' }} />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-2xs text-faint">
              <span>0</span>
              <span className={cn(low && 'text-warn')}>阈值 80</span>
              <span>100</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
              <div className="flex justify-between text-2xs">
                <span className="text-muted">证件照相似度</span>
                <span className="tnum">{num(Math.min(99.4, app.faceScore + 3.2), 1)}%</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span className="text-muted">动作活体</span>
                <span className={cn('tnum', low ? 'text-warn' : 'text-up')}>{low ? '可疑' : '通过'}</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span className="text-muted">证件 OCR 一致性</span>
                <span className="tnum text-up">通过</span>
              </div>
              <div className="flex justify-between text-2xs">
                <span className="text-muted">重复证件检测</span>
                <span className={cn('tnum', app.riskFlags.includes('同一证件多次提交') ? 'text-warn' : 'text-up')}>
                  {app.riskFlags.includes('同一证件多次提交') ? '命中' : '未命中'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* fields */}
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
        {fields.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1.5 border-b border-line/60">
            <span className="text-xs text-muted shrink-0">{k}</span>
            <span className="text-xs text-right truncate">{v}</span>
          </div>
        ))}
      </div>

      {/* risk flags */}
      <div>
        <div className="text-xs font-semibold mb-2">风险标记</div>
        {app.riskFlags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {app.riskFlags.map(f => (
              <Badge key={f} tone="warn"><AlertTriangle className="w-3 h-3" />{f}</Badge>
            ))}
          </div>
        ) : (
          <Badge tone="up"><Check className="w-3 h-3" />未命中任何风险规则</Badge>
        )}
      </div>

      {/* vendor note */}
      <Card className="border-info/30 bg-info/5">
        <div className="flex items-start gap-3 px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-info mb-0.5">第三方服务依赖</div>
            <p className="text-xs text-muted leading-relaxed">
              人脸识别 / 活体检测由第三方 KYC 服务商提供（Sumsub / Jumio），需甲方提供账号。
              本原型中的证件影像与活体分数为占位演示数据；正式环境将直接嵌入服务商 SDK 的
              审核结果（含证件真伪、OCR、活体分数、重复证件命中）。
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function KycReview() {
  return (
    <ReviewQueue<KycApp>
      fnId="B-23"
      title="实名认证审核"
      sub="证件影像 · 人脸比对 · 活体检测分数 · 风险标记"
      items={KYC_QUEUE}
      pending={k => k.status === '待审核'}
      renderRow={k => (
        <div>
          <div className="flex items-center justify-between gap-2">
            <Mono className="font-semibold">{k.uid}</Mono>
            <div className="flex items-center gap-1">
              {k.riskFlags.map(f => <span key={f} title={f} className="w-1.5 h-1.5 rounded-full bg-warn" />)}
              {k.faceScore < 80 && <span title="活体分数偏低" className="w-1.5 h-1.5 rounded-full bg-down" />}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-2xs text-muted">
            <span className="truncate">{k.realName}</span>
            <span className="text-faint">·</span>
            <span>{k.docType}</span>
            <span className="text-faint">·</span>
            <span>Lv{k.level}</span>
          </div>
          <div className="text-2xs text-faint tnum mt-0.5">{k.submittedAt}</div>
        </div>
      )}
      renderDetail={k => <KycDetail app={k} />}
    />
  )
}

/* ================================================================== *
 * B-24 实名认证设置
 * ================================================================== */

export function KycConfig() {
  return (
    <ConfigPage
      fnId="B-24"
      title="实名认证设置"
      sub="认证等级、审核方式、第三方服务商与受理范围"
      sections={[
        {
          title: '认证等级配置',
          desc: '不同等级对应不同的提现额度与所需材料',
          fields: [
            { type: 'number', key: 'l1.daily', label: 'Lv1 · 24h 提现额度', value: 20_000, suffix: 'USDT', hint: '仅需姓名 + 证件号' },
            { type: 'number', key: 'l1.single', label: 'Lv1 · 单笔限额', value: 5_000, suffix: 'USDT' },
            { type: 'text', key: 'l1.docs', label: 'Lv1 · 所需材料', value: '姓名 / 证件号 / 国家' },
            { type: 'number', key: 'l2.daily', label: 'Lv2 · 24h 提现额度', value: 200_000, suffix: 'USDT', hint: '证件正反面 + 活体检测' },
            { type: 'number', key: 'l2.single', label: 'Lv2 · 单笔限额', value: 50_000, suffix: 'USDT' },
            { type: 'text', key: 'l2.docs', label: 'Lv2 · 所需材料', value: '证件正面 / 证件反面 / 人脸活体' },
            { type: 'number', key: 'l3.daily', label: 'Lv3 · 24h 提现额度', value: 2_000_000, suffix: 'USDT', hint: '机构 / 高净值：需地址证明与资金来源' },
            { type: 'number', key: 'l3.single', label: 'Lv3 · 单笔限额', value: 500_000, suffix: 'USDT' },
            { type: 'text', key: 'l3.docs', label: 'Lv3 · 所需材料', value: '地址证明 / 资金来源说明 / 视频面签' },
          ],
        },
        {
          title: '审核方式',
          desc: '自动审核依赖服务商返回的置信度分数',
          fields: [
            { type: 'select', key: 'mode', label: '审核模式', value: '混合（自动 + 人工复核）', options: ['全自动', '全人工', '混合（自动 + 人工复核）'] },
            { type: 'number', key: 'auto.threshold', label: '自动通过分数阈值', value: 80, suffix: '分', hint: '低于阈值转人工队列' },
            { type: 'number', key: 'auto.reject', label: '自动驳回分数阈值', value: 40, suffix: '分' },
            { type: 'toggle', key: 'dupe', label: '同一证件重复提交拦截', value: true },
            { type: 'number', key: 'retry', label: '驳回后可重新提交次数', value: 3, suffix: '次/月' },
            { type: 'toggle', key: 'sla', label: '超时未审核自动升级', value: true, hint: '24h 未处理升级至风控主管' },
          ],
        },
        {
          title: '第三方服务商',
          desc: '⚠️ 人脸识别 / 活体检测由第三方提供，需甲方提供账号',
          fields: [
            { type: 'select', key: 'vendor', label: '服务商', value: 'Sumsub', options: ['Sumsub', 'Jumio', 'Onfido', 'ShuftiPro'] },
            { type: 'text', key: 'apikey', label: 'API Key', value: 'sbx_9f2a4c…（甲方提供）' },
            { type: 'text', key: 'secret', label: 'API Secret', value: '••••••••••••••••' },
            { type: 'text', key: 'webhook', label: 'Webhook 回调地址', value: 'https://api.exchange.io/kyc/callback' },
            { type: 'toggle', key: 'sandbox', label: '沙箱模式', value: true, hint: '上线前请切换为生产环境' },
          ],
        },
        {
          title: '支持的证件类型',
          fields: [
            { type: 'toggle', key: 'doc.id', label: '身份证', value: true },
            { type: 'toggle', key: 'doc.passport', label: '护照', value: true },
            { type: 'toggle', key: 'doc.driver', label: '驾照', value: true },
            { type: 'toggle', key: 'doc.residence', label: '居留许可', value: false },
          ],
        },
        {
          title: '支持的国家 / 地区',
          desc: '受制裁地区将在注册环节直接拦截',
          fields: [
            { type: 'textarea', key: 'allow', label: '允许受理', value: '新加坡, 香港, 日本, 韩国, 越南, 马来西亚, 新西兰, 澳大利亚' },
            { type: 'textarea', key: 'deny', label: '禁止受理', value: '美国, 朝鲜, 伊朗, 叙利亚, 古巴, 俄罗斯（受制裁地区）' },
            { type: 'toggle', key: 'geoip', label: '注册时 GeoIP 校验', value: true },
          ],
        },
      ]}
    />
  )
}

/* ================================================================== *
 * B-25 用户交易汇总
 * ================================================================== */

export function UserTradeSummary() {
  const [sort, setSort] = useState<'vol' | 'fee' | 'trades'>('vol')

  const rows = useMemo(() => {
    const key = (t: TradeSum) =>
      sort === 'vol' ? t.spot30d + t.futures30d : sort === 'fee' ? t.fee : t.trades
    return [...TRADE_SUM].sort((a, b) => key(b) - key(a))
  }, [sort])

  const totals = TRADE_SUM.reduce(
    (s, t) => ({
      spot: s.spot + t.spot30d, futures: s.futures + t.futures30d,
      trades: s.trades + t.trades, fee: s.fee + t.fee,
    }),
    { spot: 0, futures: 0, trades: 0, fee: 0 },
  )

  const cols: Col<TradeSum>[] = [
    { key: 'uid', header: 'UID', cell: t => <Mono className="font-semibold">{t.uid}</Mono> },
    { key: 'spot', header: '30d 现货成交额', align: 'right', cell: t => <span className="tnum">{usd(t.spot30d, 0)}</span> },
    { key: 'fut', header: '30d 合约成交额', align: 'right', cell: t => <span className="tnum">{usd(t.futures30d, 0)}</span> },
    { key: 'trades', header: '总成交笔数', align: 'right', cell: t => <span className="tnum">{num(t.trades, 0)}</span> },
    { key: 'fee', header: '手续费贡献', align: 'right', cell: t => <span className="tnum text-brand">{usd(t.fee)}</span> },
    {
      key: 'maker', header: 'Maker 占比', align: 'right', hideBelow: 'md',
      cell: t => (
        <div className="flex items-center justify-end gap-2">
          <Meter value={t.makerPct} tone="info" className="w-16" />
          <span className="tnum text-xs w-11 text-right">{pctStr(t.makerPct)}</span>
        </div>
      ),
    },
    { key: 'last', header: '最后交易时间', align: 'right', hideBelow: 'lg', cell: t => <span className="text-2xs text-muted tnum">{t.lastTrade}</span> },
    {
      key: 'vip', header: 'VIP', align: 'center',
      cell: t => <Badge tone={t.vip >= 4 ? 'brand' : t.vip >= 2 ? 'info' : 'muted'}>VIP {t.vip}</Badge>,
    },
  ]

  return (
    <ListPage<TradeSum>
      fnId="B-25"
      title="用户交易汇总"
      sub="近 30 天口径 · 默认按成交额降序"
      stats={[
        { label: '30d 现货成交额', value: usd(totals.spot, 0), delta: 12.4 },
        { label: '30d 合约成交额', value: usd(totals.futures, 0), delta: 18.2 },
        { label: '总成交笔数', value: num(totals.trades, 0), hint: '全部用户' },
        { label: '手续费收入', value: usd(totals.fee, 0), delta: 8.6 },
      ]}
      cols={cols}
      rows={rows}
      perPage={12}
      filters={[
        { type: 'search', key: 'q', placeholder: '搜索 UID', width: 'w-48' },
        { type: 'select', key: 'vip', label: '全部 VIP', options: ['VIP 0', 'VIP 1', 'VIP 2', 'VIP 3', 'VIP 4', 'VIP 5'] },
      ]}
      match={(t, s) =>
        (!s.q || t.uid.includes(s.q)) &&
        (!s.vip || `VIP ${t.vip}` === s.vip)
      }
      actions={
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 p-0.5 bg-elevated rounded-lg">
            {([['vol', '成交额'], ['fee', '手续费'], ['trades', '笔数']] as const).map(([k, l]) => (
              <button
                key={k} onClick={() => setSort(k)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs transition-colors',
                  sort === k ? 'bg-surface text-ink font-medium shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {l} ↓
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
        </div>
      }
    />
  )
}

/* ================================================================== *
 * B-26 用户持仓汇总
 * ================================================================== */

export function UserPositionSummary() {
  const cols: Col<PosSum>[] = [
    { key: 'uid', header: 'UID', cell: p => <Mono className="font-semibold">{p.uid}</Mono> },
    { key: 'sym', header: '合约', cell: p => <span className="text-xs font-medium">{p.symbol}</span> },
    {
      key: 'side', header: '方向',
      cell: p => <Badge tone={p.side === '多' ? 'up' : 'down'}>{p.side === '多' ? '多头' : '空头'}</Badge>,
    },
    { key: 'lev', header: '杠杆', align: 'center', cell: p => <span className="tnum text-xs">{p.leverage}x</span> },
    { key: 'size', header: '持仓量', align: 'right', cell: p => <span className="tnum">{num(p.size, 3)}</span> },
    { key: 'notional', header: '名义价值', align: 'right', cell: p => <span className="tnum">{usd(p.notional, 0)}</span> },
    { key: 'pnl', header: '未实现盈亏', align: 'right', cell: p => <Money v={p.pnl} sign /> },
    {
      key: 'mr', header: '保证金率', align: 'right',
      cell: p => {
        const v = p.marginRatio * 100
        const tone = v > 80 ? 'down' : v > 60 ? 'warn' : 'up'
        return (
          <div className="flex items-center justify-end gap-2">
            <Meter value={v} tone={tone} className="w-16" />
            <span className={cn(
              'tnum text-xs w-12 text-right',
              tone === 'down' ? 'text-down' : tone === 'warn' ? 'text-warn' : 'text-muted',
            )}>
              {pctStr(v)}
            </span>
          </div>
        )
      },
    },
    { key: 'liq', header: '强平价', align: 'right', cell: p => <span className="tnum text-warn">{num(p.liq, 2)}</span> },
  ]

  return (
    <ListPage<PosSum>
      fnId="B-26"
      title="用户持仓汇总"
      sub={
        AT_RISK.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-1 rounded-lg bg-warn/10 text-warn">
            <AlertTriangle className="w-3.5 h-3.5" />
            风险预警：{AT_RISK.length} 个仓位保证金率超过 80%，名义价值合计 {usd(AT_RISK.reduce((s, p) => s + p.notional, 0), 0)}
          </span>
        ) : '全部仓位保证金率健康'
      }
      stats={[
        { label: '总持仓名义价值', value: usd(POS_SUM.reduce((s, p) => s + p.notional, 0), 0), hint: `${POS_SUM.length} 个仓位` },
        { label: '多头 / 空头', value: `${POS_SUM.filter(p => p.side === '多').length} / ${POS_SUM.filter(p => p.side === '空').length}`, hint: '仓位数' },
        { label: '未实现盈亏合计', value: <Money v={POS_SUM.reduce((s, p) => s + p.pnl, 0)} sign dp={0} />, hint: '用户侧' },
        { label: '强平预警仓位', value: num(AT_RISK.length, 0), hint: '保证金率 > 80%' },
      ]}
      cols={cols}
      rows={POS_SUM}
      perPage={12}
      filters={[
        { type: 'search', key: 'q', placeholder: '搜索 UID / 合约', width: 'w-52' },
        { type: 'select', key: 'side', label: '全部方向', options: ['多', '空'] },
        { type: 'select', key: 'risk', label: '全部风险', width: 'w-40', options: ['仅风险预警 (>80%)', '仅健康 (≤60%)'] },
      ]}
      match={(p, s) =>
        (!s.q || p.uid.includes(s.q) || p.symbol.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.side || p.side === s.side) &&
        (!s.risk ||
          (s.risk.startsWith('仅风险') ? p.marginRatio > 0.8 : p.marginRatio <= 0.6))
      }
    />
  )
}

/* ================================================================== *
 * B-27 用户流水汇总
 * ================================================================== */

export function UserLedgerSummary() {
  const cols: Col<LedgerSum>[] = [
    { key: 'uid', header: 'UID', cell: l => <Mono className="font-semibold">{l.uid}</Mono> },
    { key: 'dep', header: '累计充值', align: 'right', cell: l => <span className="tnum text-up">{usd(l.deposit, 0)}</span> },
    { key: 'wd', header: '累计提现', align: 'right', cell: l => <span className="tnum text-down">{usd(l.withdraw, 0)}</span> },
    { key: 'net', header: '净入金', align: 'right', cell: l => <Money v={l.net} sign dp={0} /> },
    { key: 'fee', header: '交易手续费', align: 'right', cell: l => <span className="tnum">{usd(l.fee)}</span> },
    { key: 'rebate', header: '返佣收入', align: 'right', hideBelow: 'md', cell: l => <span className="tnum text-brand">{usd(l.rebate)}</span> },
    { key: 'assets', header: '当前资产', align: 'right', cell: l => <span className="tnum font-medium">{usd(l.assets, 0)}</span> },
    { key: 'last', header: '最后活动', align: 'right', hideBelow: 'lg', cell: l => <span className="text-2xs text-muted tnum">{l.lastAt}</span> },
  ]

  const retained = LED_TOTAL.fee - LED_TOTAL.rebate

  return (
    <ListPage<LedgerSum>
      fnId="B-27"
      title="用户流水汇总"
      sub="按用户聚合的充值 / 提现 / 手续费 / 返佣，全周期口径"
      stats={[
        { label: '总充值', value: usd(LED_TOTAL.deposit, 0), delta: 9.1 },
        { label: '总提现', value: usd(LED_TOTAL.withdraw, 0), delta: 4.7 },
        { label: '净入金', value: <Money v={LED_TOTAL.deposit - LED_TOTAL.withdraw} sign dp={0} />, hint: '充值 − 提现' },
        { label: '平台留存', value: usd(retained, 0), hint: '手续费 − 返佣支出' },
      ]}
      cols={cols}
      rows={LEDGER_SUM}
      perPage={12}
      filters={[
        { type: 'search', key: 'q', placeholder: '搜索 UID', width: 'w-48' },
        { type: 'select', key: 'net', label: '全部净入金', width: 'w-40', options: ['净流入 (>0)', '净流出 (<0)'] },
      ]}
      match={(l, s) =>
        (!s.q || l.uid.includes(s.q)) &&
        (!s.net || (s.net.startsWith('净流入') ? l.net > 0 : l.net < 0))
      }
    />
  )
}

/* ================================================================== *
 * B-28 … B-34  业务报表
 * ================================================================== */

export function ReportSpot() {
  const cols: Col<typeof SPOT_REPORT[number]>[] = [
    { key: 'symbol', header: '交易对', cell: r => <span className="text-xs font-medium">{r.symbol}</span> },
    { key: 'turnover', header: '成交额 (USDT)', align: 'right', cell: r => <span className="tnum">{num(r.turnover, 0)}</span> },
    { key: 'trades', header: '成交笔数', align: 'right', cell: r => <span className="tnum">{num(r.trades, 0)}</span> },
    { key: 'maker', header: 'Maker 量', align: 'right', cell: r => <span className="tnum text-info">{compact(r.maker)}</span> },
    { key: 'taker', header: 'Taker 量', align: 'right', cell: r => <span className="tnum text-warn">{compact(r.taker)}</span> },
    {
      key: 'ratio', header: 'Maker 占比', align: 'right', hideBelow: 'md',
      cell: r => (
        <div className="flex items-center justify-end gap-2">
          <Meter value={(r.maker / r.turnover) * 100} tone="info" className="w-14" />
          <span className="tnum text-xs w-11 text-right">{pctStr((r.maker / r.turnover) * 100)}</span>
        </div>
      ),
    },
    { key: 'fee', header: '手续费', align: 'right', cell: r => <span className="tnum text-brand">{usd(r.fee)}</span> },
  ]

  return (
    <ReportPage
      fnId="B-28"
      title="币币交易统计"
      sub="现货撮合成交额、笔数与手续费收入"
      stats={[
        { label: '24h 成交额', value: usd(SPOT_TOTAL.turnover, 0), delta: 12.4 },
        { label: '24h 成交笔数', value: num(SPOT_TOTAL.trades, 0), delta: 6.8 },
        { label: '活跃交易对', value: num(SPOT_REPORT.length, 0), hint: `共 ${TICKERS.length} 个上线交易对` },
        { label: '手续费收入', value: usd(SPOT_TOTAL.fee, 0), delta: 9.2 },
      ]}
      chart={SERIES.turnover30d}
      chartLabel="现货成交额趋势"
      chartType="bar"
      chartTone="brand"
      cols={cols}
      rows={SPOT_REPORT}
    />
  )
}

export function ReportFuturesPosition() {
  const cols: Col<typeof FUT_POS_REPORT[number]>[] = [
    { key: 'symbol', header: '合约', cell: r => <span className="text-xs font-medium">{r.symbol}</span> },
    { key: 'oi', header: '持仓量 (USDT)', align: 'right', cell: r => <span className="tnum">{num(r.oi, 0)}</span> },
    { key: 'long', header: '多头', align: 'right', cell: r => <span className="tnum text-up">{compact(r.long)}</span> },
    { key: 'short', header: '空头', align: 'right', cell: r => <span className="tnum text-down">{compact(r.short)}</span> },
    {
      key: 'ratio', header: '多空比', align: 'right',
      cell: r => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 rounded-full bg-down overflow-hidden">
            <div className="h-full bg-up" style={{ width: `${(r.long / r.oi) * 100}%` }} />
          </div>
          <span className="tnum text-xs w-10 text-right">{num(r.ratio, 2)}</span>
        </div>
      ),
    },
    {
      key: 'funding', header: '资金费率', align: 'right',
      cell: r => (
        <span className={cn('tnum', r.funding >= 0 ? 'text-up' : 'text-down')}>
          {(r.funding * 100).toFixed(4)}%
        </span>
      ),
    },
    { key: 'lev', header: '最高杠杆', align: 'right', hideBelow: 'md', cell: r => <span className="tnum text-muted">{r.maxLev}x</span> },
  ]

  const ratio = OI_LONG / (OI_TOTAL - OI_LONG)

  return (
    <ReportPage
      fnId="B-29"
      title="合约持仓统计"
      sub="未平仓合约 (Open Interest) 与多空结构"
      stats={[
        { label: '未平仓合约价值 (OI)', value: usd(OI_TOTAL, 0), delta: 5.4 },
        { label: '多空比', value: num(ratio, 3), hint: `多 ${pctStr((OI_LONG / OI_TOTAL) * 100)} / 空 ${pctStr(100 - (OI_LONG / OI_TOTAL) * 100)}` },
        { label: '平均杠杆', value: `${num(FUT_POS_REPORT.reduce((s, r) => s + r.maxLev, 0) / FUT_POS_REPORT.length / 4, 1)}x`, hint: '按名义价值加权' },
        { label: '保证金总额', value: usd(OI_TOTAL / 12.4, 0), hint: '全平台占用保证金' },
      ]}
      chart={OI_30D}
      chartLabel="未平仓合约价值趋势"
      chartType="area"
      chartTone="info"
      cols={cols}
      rows={FUT_POS_REPORT}
    />
  )
}

export function ReportFuturesClose() {
  const cols: Col<typeof FUT_CLOSE_REPORT[number]>[] = [
    { key: 'symbol', header: '合约', cell: r => <span className="text-xs font-medium">{r.symbol}</span> },
    { key: 'closed', header: '平仓量 (USDT)', align: 'right', cell: r => <span className="tnum">{num(r.closed, 0)}</span> },
    { key: 'manual', header: '主动平仓', align: 'right', cell: r => <span className="tnum text-up">{compact(r.manual)}</span> },
    { key: 'liq', header: '强平', align: 'right', cell: r => <span className="tnum text-down">{compact(r.liq)}</span> },
    { key: 'liqCount', header: '强平笔数', align: 'right', cell: r => <span className="tnum">{num(r.liqCount, 0)}</span> },
    {
      key: 'bankrupt', header: '穿仓', align: 'right',
      cell: r => <span className={cn('tnum', r.bankrupt > 0 ? 'text-down' : 'text-faint')}>{num(r.bankrupt, 2)}</span>,
    },
    { key: 'ins', header: '保险基金消耗', align: 'right', cell: r => <span className="tnum text-warn">{usd(r.insurance)}</span> },
  ]

  const profitable = +(CLOSE_TOTAL.closed * 0.463).toFixed(2)

  return (
    <ReportPage
      fnId="B-30"
      title="合约平仓统计"
      sub="主动平仓 / 强制平仓 / 穿仓与保险基金消耗"
      stats={[
        { label: '24h 平仓量', value: usd(CLOSE_TOTAL.closed, 0), delta: -3.1 },
        { label: '盈利平仓', value: usd(profitable, 0), hint: `占比 46.3%` },
        { label: '亏损平仓', value: usd(CLOSE_TOTAL.closed - profitable, 0), hint: '占比 53.7%' },
        { label: '强平笔数', value: num(CLOSE_TOTAL.liqCount, 0), hint: `保险基金消耗 ${usd(CLOSE_TOTAL.insurance, 0)}` },
      ]}
      chart={CLOSE_30D}
      chartLabel="合约平仓量趋势"
      chartType="bar"
      chartTone="info"
      cols={cols}
      rows={FUT_CLOSE_REPORT}
    />
  )
}

export function ReportRegister() {
  const cols: Col<typeof REG_REPORT[number]>[] = [
    { key: 'date', header: '日期', cell: r => <span className="text-xs tnum">{r.date}</span> },
    { key: 'total', header: '注册数', align: 'right', cell: r => <span className="tnum font-medium">{num(r.total, 0)}</span> },
    { key: 'email', header: '邮箱注册', align: 'right', cell: r => <span className="tnum text-info">{num(r.email, 0)}</span> },
    { key: 'phone', header: '手机注册', align: 'right', cell: r => <span className="tnum text-brand">{num(r.phone, 0)}</span> },
    { key: 'channel', header: '来源渠道', cell: r => <Badge tone="muted">{r.channel}</Badge> },
    {
      key: 'kyc', header: 'KYC 完成率', align: 'right',
      cell: r => (
        <div className="flex items-center justify-end gap-2">
          <Meter value={r.kycRate} tone={r.kycRate >= 60 ? 'up' : 'warn'} className="w-16" />
          <span className="tnum text-xs w-11 text-right">{pctStr(r.kycRate)}</span>
        </div>
      ),
    },
  ]

  const kycAvg = REG_REPORT.reduce((s, r) => s + r.kycRate, 0) / REG_REPORT.length

  return (
    <ReportPage
      fnId="B-31"
      title="注册统计"
      sub="新增注册用户与注册 → 实名转化"
      stats={[
        { label: '今日注册', value: num(REG_REPORT[0].total, 0), delta: -4.2 },
        { label: '7 日注册', value: num(REG_7, 0), delta: 6.9 },
        { label: '30 日注册', value: num(REG_30, 0), delta: 14.8 },
        { label: '转化率 (注册 → KYC)', value: pctStr(kycAvg), hint: '30 日均值' },
      ]}
      chart={SERIES.register30d}
      chartLabel="每日注册数"
      chartType="bar"
      chartTone="up"
      cols={cols}
      rows={REG_REPORT}
    />
  )
}

export function ReportLogin() {
  const cols: Col<typeof LOGIN_REPORT[number]>[] = [
    { key: 'date', header: '日期', cell: r => <span className="text-xs tnum">{r.date}</span> },
    { key: 'logins', header: '登录次数', align: 'right', cell: r => <span className="tnum font-medium">{num(r.logins, 0)}</span> },
    { key: 'uniq', header: '独立用户', align: 'right', cell: r => <span className="tnum">{num(r.uniq, 0)}</span> },
    { key: 'fails', header: '失败次数', align: 'right', cell: r => <span className="tnum text-down">{num(r.fails, 0)}</span> },
    { key: 'badIp', header: '异常 IP', align: 'right', cell: r => <span className="tnum text-warn">{num(r.badIp, 0)}</span> },
    {
      key: 'twoFa', header: '2FA 使用率', align: 'right',
      cell: r => (
        <div className="flex items-center justify-end gap-2">
          <Meter value={r.twoFa} tone={r.twoFa >= 75 ? 'up' : 'warn'} className="w-16" />
          <span className="tnum text-xs w-11 text-right">{pctStr(r.twoFa)}</span>
        </div>
      ),
    },
  ]

  return (
    <ReportPage
      fnId="B-32"
      title="登录统计"
      sub="登录次数、独立用户、失败与异常 IP"
      stats={[
        { label: '今日登录', value: num(LOGIN_TODAY.logins, 0), delta: 3.4 },
        { label: '独立用户', value: num(LOGIN_TODAY.uniq, 0), delta: 2.1 },
        { label: '失败次数', value: num(LOGIN_REPORT.reduce((s, r) => s + r.fails, 0), 0), hint: '近 7 日累计' },
        { label: '异常 IP', value: num(LOGIN_REPORT.reduce((s, r) => s + r.badIp, 0), 0), hint: '已触发风控规则' },
      ]}
      chart={SERIES.login7d}
      chartLabel="每日登录次数"
      chartType="bar"
      chartTone="info"
      cols={cols}
      rows={LOGIN_REPORT}
    />
  )
}

export function ReportDeposit() {
  const cols: Col<typeof DEP_REPORT[number]>[] = [
    { key: 'coin', header: '币种', cell: r => <span className="text-xs font-semibold">{r.coin}</span> },
    { key: 'chains', header: '链', hideBelow: 'md', cell: r => <span className="text-2xs text-muted">{r.chains}</span> },
    { key: 'amount', header: '充值额 (USD)', align: 'right', cell: r => <span className="tnum">{num(r.amount, 0)}</span> },
    { key: 'count', header: '笔数', align: 'right', cell: r => <span className="tnum">{num(r.count, 0)}</span> },
    { key: 'users', header: '人数', align: 'right', cell: r => <span className="tnum">{num(r.users, 0)}</span> },
    { key: 'avg', header: '平均充值', align: 'right', cell: r => <span className="tnum text-up">{usd(r.avg)}</span> },
    {
      key: 'share', header: '金额占比', align: 'right', hideBelow: 'md',
      cell: r => (
        <div className="flex items-center justify-end gap-2">
          <Meter value={(r.amount / DEP_TOTAL.amount) * 100} tone="up" className="w-16" />
          <span className="tnum text-xs w-11 text-right">{pctStr((r.amount / DEP_TOTAL.amount) * 100)}</span>
        </div>
      ),
    },
  ]

  return (
    <ReportPage
      fnId="B-33"
      title="充值统计"
      sub="按币种拆分的链上充值与法币入金"
      stats={[
        { label: '24h 充值额', value: usd(DEP_TOTAL.amount, 0), delta: 9.1 },
        { label: '充值人数', value: num(DEP_TOTAL.users, 0), delta: 5.2 },
        { label: '平均充值', value: usd(DEP_TOTAL.amount / DEP_TOTAL.count), hint: `${num(DEP_TOTAL.count, 0)} 笔` },
        { label: '首充人数', value: num(Math.round(DEP_TOTAL.users * 0.184), 0), hint: '占比 18.4%' },
      ]}
      chart={SERIES.deposit30d}
      chartLabel="每日充值额"
      chartType="area"
      chartTone="up"
      cols={cols}
      rows={DEP_REPORT}
    />
  )
}

export function ReportWithdraw() {
  const cols: Col<typeof WD_REPORT[number]>[] = [
    { key: 'coin', header: '币种', cell: r => <span className="text-xs font-semibold">{r.coin}</span> },
    { key: 'chains', header: '链', hideBelow: 'md', cell: r => <span className="text-2xs text-muted">{r.chains}</span> },
    { key: 'amount', header: '提币额 (USD)', align: 'right', cell: r => <span className="tnum">{num(r.amount, 0)}</span> },
    { key: 'count', header: '笔数', align: 'right', cell: r => <span className="tnum">{num(r.count, 0)}</span> },
    { key: 'users', header: '人数', align: 'right', cell: r => <span className="tnum">{num(r.users, 0)}</span> },
    { key: 'fee', header: '手续费收入', align: 'right', cell: r => <span className="tnum text-brand">{usd(r.fee)}</span> },
    {
      key: 'pending', header: '待审核', align: 'right',
      cell: r => r.pending > 0
        ? <Badge tone="warn">{r.pending}</Badge>
        : <span className="text-faint text-xs">—</span>,
    },
  ]

  const rejectRate = (WD_TOTAL.rejected / WD_TOTAL.count) * 100

  return (
    <ReportPage
      fnId="B-34"
      title="提币统计"
      sub="按币种拆分的链上提币、审核队列与驳回率"
      stats={[
        { label: '24h 提币额', value: usd(WD_TOTAL.amount, 0), delta: 4.7 },
        { label: '提币人数', value: num(WD_TOTAL.users, 0), delta: -1.8 },
        { label: '待审核', value: num(WD_TOTAL.pending, 0), hint: '需财务人工放行' },
        { label: '驳回率', value: pctStr(rejectRate, 2), hint: `${WD_TOTAL.rejected} / ${WD_TOTAL.count} 笔` },
      ]}
      chart={SERIES.withdraw30d}
      chartLabel="每日提币额"
      chartType="area"
      chartTone="brand"
      cols={cols}
      rows={WD_REPORT}
    />
  )
}

/* ================================================================== *
 * B-35 经纪人管理
 * ================================================================== */

export function BrokerManage() {
  const [edit, setEdit] = useState<Broker | null>(null)
  const [spot, setSpot] = useState(0)
  const [fut, setFut] = useState(0)
  const [saved, setSaved] = useState<string | null>(null)

  const openEdit = (b: Broker) => {
    setEdit(b); setSpot(b.spotRate * 100); setFut(b.futuresRate * 100); setSaved(null)
  }

  const cols: Col<Broker>[] = [
    { key: 'uid', header: '经纪人 UID', cell: b => <Mono className="font-semibold">{b.uid}</Mono> },
    { key: 'tier', header: '等级', cell: b => <Badge tone={tierTone(b.tier) as any}>{b.tier}</Badge> },
    { key: 'direct', header: '直属下级', align: 'right', cell: b => <span className="tnum">{num(b.direct, 0)}</span> },
    { key: 'team', header: '团队人数', align: 'right', cell: b => <span className="tnum">{num(b.team, 0)}</span> },
    { key: 'vol', header: '团队交易额', align: 'right', hideBelow: 'lg', cell: b => <span className="tnum text-muted">{usd(b.teamVol, 0)}</span> },
    { key: 'sr', header: '现货返佣', align: 'right', cell: b => <span className="tnum text-info">{pctStr(b.spotRate * 100, 0)}</span> },
    { key: 'fr', header: '合约返佣', align: 'right', cell: b => <span className="tnum text-warn">{pctStr(b.futuresRate * 100, 0)}</span> },
    { key: 'month', header: '本月返佣', align: 'right', cell: b => <span className="tnum">{usd(b.month)}</span> },
    { key: 'total', header: '累计返佣', align: 'right', cell: b => <span className="tnum font-medium text-brand">{usd(b.total)}</span> },
    { key: 'status', header: '状态', cell: b => <StatusBadge s={b.status} /> },
    {
      key: 'op', header: '操作', align: 'right',
      cell: b => <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-3.5 h-3.5" />调整比例</Button>,
    },
  ]

  return (
    <>
      <ListPage<Broker>
        fnId="B-35"
        title="经纪人管理"
        sub="经纪人等级、团队规模与返佣比例"
        stats={[
          { label: '经纪人总数', value: num(BROKERS.length, 0), hint: `${BROKERS.filter(b => b.status === '正常').length} 个正常` },
          { label: '团队总人数', value: num(BROKER_TOTAL.team, 0), hint: `直属 ${num(BROKER_STATS.directCount, 0)}` },
          { label: '本月返佣支出', value: usd(BROKER_TOTAL.month, 0), delta: 11.2 },
          { label: '累计返佣支出', value: usd(BROKER_TOTAL.total, 0), hint: `平台累计 ${usd(BROKER_STATS.totalCommission, 0)}` },
        ]}
        cols={cols}
        rows={BROKERS}
        perPage={12}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索经纪人 UID', width: 'w-52' },
          { type: 'select', key: 'tier', label: '全部等级', options: ['青铜', '白银', '黄金', '铂金', '钻石'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['正常', '停用'] },
        ]}
        match={(b, s) =>
          (!s.q || b.uid.includes(s.q)) &&
          (!s.tier || b.tier === s.tier) &&
          (!s.status || b.status === s.status)
        }
      />

      <Modal
        open={!!edit} onClose={() => setEdit(null)}
        title={edit ? `调整返佣比例 · ${edit.uid}` : ''}
        footer={
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-up">✓ {saved}</span>}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setEdit(null)}>取消</Button>
            <Button onClick={() => setSaved('已保存，次日 02:00 返佣结算任务生效')}>保存</Button>
          </div>
        }
      >
        {edit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-elevated p-3">
                <div className="text-2xs text-muted">当前等级</div>
                <div className="mt-1"><Badge tone={tierTone(edit.tier) as any}>{edit.tier}</Badge></div>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <div className="text-2xs text-muted">团队交易额</div>
                <div className="text-sm font-semibold tnum mt-1">{usd(edit.teamVol, 0)}</div>
              </div>
            </div>

            {([
              ['现货返佣比例', spot, setSpot, 'info'],
              ['合约返佣比例', fut, setFut, 'warn'],
            ] as [string, number, (v: number) => void, 'info' | 'warn'][]).map(([label, val, set, tone]) => (
              <div key={label}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-muted">{label}</span>
                  <span className={cn('text-sm font-semibold tnum', tone === 'info' ? 'text-info' : 'text-warn')}>
                    {pctStr(val, 0)}
                  </span>
                </div>
                <input
                  type="range" min={0} max={50} step={5} value={val}
                  onChange={e => set(+e.target.value)}
                  className="w-full accent-brand cursor-pointer"
                />
                <div className="flex justify-between text-2xs text-faint tnum mt-0.5">
                  <span>0%</span><span>25%</span><span>50%</span>
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-line bg-elevated p-3">
              <div className="text-2xs text-muted mb-1">按上月手续费口径估算</div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs">预计次月返佣支出</span>
                <span className="text-sm font-semibold tnum text-brand">
                  {usd(edit.month * ((spot + fut) / ((edit.spotRate + edit.futuresRate) * 100)))}
                </span>
              </div>
            </div>

            <p className="text-2xs text-faint">
              比例上限受等级约束（{edit.tier} 上限 {pctStr(Math.max(edit.spotRate, edit.futuresRate) * 100, 0)}）。
              超出上限需风控与财务双人复核。
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-36 经纪人返佣汇总  (F-44 — 返佣 / 分佣 / 直客返佣 三模式)
 * ================================================================== */

const MODE_TONE: Record<string, 'brand' | 'info' | 'up'> = {
  '返佣': 'brand', '分佣': 'info', '直客返佣': 'up',
}

export function BrokerCommission() {
  const cols: Col<CommRow>[] = [
    { key: 'ts', header: '时间', cell: c => <span className="text-2xs text-muted tnum">{c.ts}</span> },
    { key: 'broker', header: '经纪人 UID', cell: c => <Mono className="font-semibold">{c.broker}</Mono> },
    { key: 'from', header: '来源 UID', cell: c => <Mono className="text-muted">{c.from}</Mono> },
    {
      key: 'level', header: '层级', align: 'center',
      cell: c => <Badge tone={c.level === 'L1' ? 'brand' : c.level === 'L2' ? 'info' : 'muted'}>{c.level}</Badge>,
    },
    {
      key: 'kind', header: '交易类型',
      cell: c => <Badge tone={c.kind === '合约' ? 'warn' : 'muted'}>{c.kind}</Badge>,
    },
    { key: 'fee', header: '手续费', align: 'right', cell: c => <span className="tnum">{usd(c.fee)}</span> },
    { key: 'mode', header: '返佣模式', cell: c => <Badge tone={MODE_TONE[c.mode]}>{c.mode}</Badge> },
    { key: 'rate', header: '返佣比例', align: 'right', cell: c => <span className="tnum">{pctStr(c.rate * 100, 1)}</span> },
    { key: 'amount', header: '返佣金额', align: 'right', cell: c => <span className="tnum font-medium text-brand">{usd(c.amount)}</span> },
  ]

  const total = COMMISSIONS.reduce((s, c) => s + c.amount, 0)
  const byMode = MODES.map(m => ({
    mode: m,
    n: COMMISSIONS.filter(c => c.mode === m).length,
    amt: COMMISSIONS.filter(c => c.mode === m).reduce((s, c) => s + c.amount, 0),
  }))

  return (
    <div>
      <ListPage<CommRow>
        fnId="B-36"
        title="经纪人返佣汇总"
        sub="逐笔返佣流水 · 支持返佣 / 分佣 / 直客返佣三种模式并存 (F-44)"
        stats={[
          { label: '本期返佣支出', value: usd(total, 0), delta: 11.2 },
          { label: '返佣笔数', value: num(COMMISSIONS.length, 0), hint: '近 30 日' },
          { label: '平均返佣比例', value: pctStr((COMMISSIONS.reduce((s, c) => s + c.rate, 0) / COMMISSIONS.length) * 100), hint: '加权前口径' },
          { label: '产生返佣的手续费', value: usd(COMMISSIONS.reduce((s, c) => s + c.fee, 0), 0), hint: '返佣基数' },
        ]}
        cols={cols}
        rows={COMMISSIONS}
        perPage={12}
        dense
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索经纪人 / 来源 UID', width: 'w-56' },
          { type: 'select', key: 'mode', label: '全部模式', width: 'w-32', options: [...MODES] },
          { type: 'select', key: 'level', label: '全部层级', width: 'w-28', options: ['L1', 'L2', 'L3'] },
          { type: 'select', key: 'kind', label: '全部类型', width: 'w-28', options: ['现货', '合约'] },
        ]}
        match={(c, s) =>
          (!s.q || c.broker.includes(s.q) || c.from.includes(s.q)) &&
          (!s.mode || c.mode === s.mode) &&
          (!s.level || c.level === s.level) &&
          (!s.kind || c.kind === s.kind)
        }
      />

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 mt-4">
        <Card>
          <CardHeader title="月度返佣支出" sub="近 12 个月 · 单位 USDT" />
          <div className="p-4">
            <AreaChart data={COMM_MONTHLY} tone="brand" height={180} className="w-full" />
            <div className="flex justify-between mt-2 text-2xs text-faint">
              {['1月', '3月', '5月', '7月', '9月', '11月'].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="三种返佣模式" sub="F-44 · 合同要求三者并存" />
          <div className="p-4 space-y-3">
            {byMode.map(m => (
              <div key={m.mode}>
                <div className="flex items-center justify-between mb-1">
                  <Badge tone={MODE_TONE[m.mode]}>{m.mode}</Badge>
                  <span className="text-xs tnum font-medium">{usd(m.amt)}</span>
                </div>
                <Meter value={(m.amt / total) * 100} tone={MODE_TONE[m.mode]} />
                <div className="flex justify-between mt-1 text-2xs text-faint tnum">
                  <span>{m.n} 笔</span>
                  <span>{pctStr((m.amt / total) * 100)}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 space-y-1.5 border-t border-line text-2xs text-muted leading-relaxed">
              <p><span className="text-brand font-medium">返佣</span> — 按下级手续费的固定比例返还给上级经纪人。</p>
              <p><span className="text-info font-medium">分佣</span> — 多层级按 L1/L2/L3 递减比例逐级分配。</p>
              <p><span className="text-up font-medium">直客返佣</span> — 直接下级用户自身获得手续费折返（返给用户本人）。</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== *
 * B-37 经纪人持仓汇总（持仓返佣）
 * ================================================================== */

type BrokerPos = {
  uid: string; tier: BrokerTier; position: number; margin: number
  base: number; rate: number; payout: number; team: number
}
const BROKER_POS: BrokerPos[] = BROKERS.map(b => {
  const base = +(b.margin * 0.75).toFixed(2)
  const rate = b.futuresRate * 0.05
  return {
    uid: b.uid, tier: b.tier, position: b.position, margin: b.margin,
    base, rate: +rate.toFixed(4), payout: +(base * rate).toFixed(2), team: b.team,
  }
})

export function BrokerPosition() {
  const cols: Col<BrokerPos>[] = [
    { key: 'uid', header: '经纪人 UID', cell: b => <Mono className="font-semibold">{b.uid}</Mono> },
    { key: 'tier', header: '等级', cell: b => <Badge tone={tierTone(b.tier) as any}>{b.tier}</Badge> },
    { key: 'team', header: '团队人数', align: 'right', hideBelow: 'md', cell: b => <span className="tnum text-muted">{num(b.team, 0)}</span> },
    { key: 'pos', header: '团队总持仓', align: 'right', cell: b => <span className="tnum">{usd(b.position, 0)}</span> },
    { key: 'margin', header: '团队总保证金', align: 'right', cell: b => <span className="tnum">{usd(b.margin, 0)}</span> },
    { key: 'base', header: '持仓返佣基数', align: 'right', cell: b => <span className="tnum text-info">{usd(b.base, 0)}</span> },
    { key: 'rate', header: '返佣比例', align: 'right', cell: b => <span className="tnum">{pctStr(b.rate * 100, 2)}</span> },
    { key: 'payout', header: '本期持仓返佣', align: 'right', cell: b => <span className="tnum font-medium text-brand">{usd(b.payout)}</span> },
  ]

  const t = BROKER_POS.reduce(
    (s, b) => ({ pos: s.pos + b.position, margin: s.margin + b.margin, base: s.base + b.base, payout: s.payout + b.payout }),
    { pos: 0, margin: 0, base: 0, payout: 0 },
  )

  return (
    <div>
      <ListPage<BrokerPos>
        fnId="B-37"
        title="经纪人持仓汇总"
        sub="团队合约持仓规模与持仓返佣（按保证金占用计提）"
        stats={[
          { label: '团队总持仓', value: usd(t.pos, 0), hint: `${BROKER_POS.length} 个经纪人` },
          { label: '团队总保证金', value: usd(t.margin, 0), hint: '合约账户占用' },
          { label: '持仓返佣基数', value: usd(t.base, 0), hint: '保证金 × 计提系数 75%' },
          { label: '本期持仓返佣', value: usd(t.payout, 0), delta: 6.4 },
        ]}
        cols={cols}
        rows={BROKER_POS}
        perPage={12}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索经纪人 UID', width: 'w-52' },
          { type: 'select', key: 'tier', label: '全部等级', options: ['青铜', '白银', '黄金', '铂金', '钻石'] },
        ]}
        match={(b, s) => (!s.q || b.uid.includes(s.q)) && (!s.tier || b.tier === s.tier)}
      />

      <Card className="mt-4 border-info/30 bg-info/5">
        <div className="flex items-start gap-3 px-4 py-3">
          <Wallet className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-info mb-1">什么是「持仓返佣」</div>
            <p className="text-xs text-muted leading-relaxed">
              常规返佣按<span className="text-ink">成交手续费</span>计提，只有下级交易时经纪人才有收益。
              持仓返佣则按下级团队在合约账户中<span className="text-ink">持续占用的保证金</span>计提：
              每个结算周期（每日 02:00 的返佣结算任务）取团队保证金快照 × 计提系数 (75%) 得到返佣基数，
              再乘以经纪人等级对应的持仓返佣比例，得出本期持仓返佣。
            </p>
            <p className="text-xs text-muted leading-relaxed mt-1.5">
              作用是激励经纪人拉动<span className="text-ink">长期留存的持仓资金</span>而非高频刷量。
              该模式与返佣 / 分佣 / 直客返佣可叠加发放，结算口径需在签约前与甲方确认。
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ================================================================== *
 * B-38 经纪人角色管理
 * ================================================================== */

type TierRow = typeof TIER_DEF[number] & { count: number }
const TIER_ROWS: TierRow[] = TIER_DEF.map(t => ({
  ...t,
  count: BROKERS.filter(b => b.tier === t.tier).length,
}))

export function BrokerRoles() {
  const [edit, setEdit] = useState<TierRow | null>(null)
  const [saved, setSaved] = useState(false)
  const maxCount = Math.max(...TIER_ROWS.map(t => t.count), 1)

  const cols: Col<TierRow>[] = [
    {
      key: 'tier', header: '等级名',
      cell: t => (
        <div className="flex items-center gap-2">
          <Badge tone={tierTone(t.tier) as any}>{t.tier}</Badge>
        </div>
      ),
    },
    {
      key: 'req', header: '晋升条件',
      cell: t => (
        <span className="text-xs text-muted tnum">
          团队交易额 ≥ {compact(t.volReq)} · 团队人数 ≥ {t.teamReq}
        </span>
      ),
    },
    { key: 'spot', header: '现货返佣', align: 'right', cell: t => <span className="tnum text-info">{pctStr(t.spot * 100, 0)}</span> },
    { key: 'fut', header: '合约返佣', align: 'right', cell: t => <span className="tnum text-warn">{pctStr(t.futures * 100, 0)}</span> },
    { key: 'direct', header: '直客返佣', align: 'right', cell: t => <span className="tnum text-up">{pctStr(t.direct * 100, 0)}</span> },
    {
      key: 'count', header: '人数', align: 'right',
      cell: t => (
        <div className="flex items-center justify-end gap-2">
          <Meter value={(t.count / maxCount) * 100} tone="brand" className="w-14" />
          <span className="tnum text-xs w-8 text-right">{t.count}</span>
        </div>
      ),
    },
    {
      key: 'op', header: '操作', align: 'right',
      cell: t => (
        <Button size="sm" variant="ghost" onClick={() => { setEdit(t); setSaved(false) }}>
          <Pencil className="w-3.5 h-3.5" />编辑
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* tier ladder */}
      <Card className="mb-4">
        <CardHeader title="等级阶梯" sub="青铜 → 白银 → 黄金 → 铂金 → 钻石 · 每级对应团队交易额与人数门槛" />
        <div className="p-4">
          <div className="flex items-end gap-2 sm:gap-3">
            {TIER_ROWS.map((t, i) => {
              const tone = tierTone(t.tier)
              return (
                <div key={t.tier} className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'rounded-t-lg border border-b-0 border-line px-2 pt-2 pb-2 flex flex-col items-center gap-1',
                      tone === 'info' ? 'bg-info/10' : tone === 'brand' ? 'bg-brand/10' : tone === 'warn' ? 'bg-warn/10' : 'bg-elevated',
                    )}
                    style={{ height: `${64 + i * 26}px` }}
                  >
                    <span className="text-2xs text-faint tnum mt-auto">{t.count} 人</span>
                    <span className={cn(
                      'text-xs font-semibold truncate',
                      tone === 'info' ? 'text-info' : tone === 'brand' ? 'text-brand' : tone === 'warn' ? 'text-warn' : 'text-muted',
                    )}>
                      {t.tier}
                    </span>
                  </div>
                  <div className="border-t border-line pt-1.5 text-center">
                    <div className="text-2xs text-muted tnum truncate">≥ {compact(t.volReq)}</div>
                    <div className="text-2xs text-faint tnum truncate">≥ {t.teamReq} 人</div>
                    <div className="text-2xs tnum mt-0.5 truncate">
                      <span className="text-info">{pctStr(t.spot * 100, 0)}</span>
                      <span className="text-faint"> / </span>
                      <span className="text-warn">{pctStr(t.futures * 100, 0)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line text-2xs text-faint">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-info" />现货返佣</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-warn" />合约返佣</span>
            <span className="ml-auto">晋升每日结算后自动评定，降级需连续 2 个周期低于门槛</span>
          </div>
        </div>
      </Card>

      <ListPage<TierRow>
        fnId="B-38"
        title="经纪人角色管理"
        sub="等级门槛与各模式返佣比例；修改后于次日 02:00 返佣结算任务生效"
        cols={cols}
        rows={TIER_ROWS}
        perPage={10}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索等级', width: 'w-44' },
        ]}
        match={(t, s) => !s.q || t.tier.includes(s.q)}
      />

      <Modal
        open={!!edit} onClose={() => setEdit(null)}
        title={edit ? `编辑等级 · ${edit.tier}` : ''}
        footer={
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-up">✓ 已保存</span>}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setEdit(null)}>取消</Button>
            <Button onClick={() => setSaved(true)}>保存</Button>
          </div>
        }
      >
        {edit && (
          <div className="space-y-3">
            {([
              ['团队交易额门槛 (USDT)', compact(edit.volReq)],
              ['团队人数门槛', String(edit.teamReq)],
              ['现货返佣比例', pctStr(edit.spot * 100, 0)],
              ['合约返佣比例', pctStr(edit.futures * 100, 0)],
              ['直客返佣比例', pctStr(edit.direct * 100, 0)],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label} className="grid grid-cols-[140px_1fr] items-center gap-3">
                <span className="text-xs text-muted">{label}</span>
                <input
                  defaultValue={val}
                  className="w-full h-9 px-3 rounded-lg bg-elevated border border-line text-sm tnum
                             outline-none focus:border-brand"
                />
              </div>
            ))}
            <div className="rounded-lg bg-elevated p-3 text-2xs text-muted leading-relaxed">
              当前 <span className="text-ink tnum">{edit.count}</span> 名经纪人处于该等级。
              调整门槛会在下一个结算周期重新评定所有经纪人等级，可能导致升降级与返佣比例变化。
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
