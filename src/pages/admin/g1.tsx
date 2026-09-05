import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowRight, Download, Plus, Layers, ShieldCheck, Wallet,
  Users as UsersIcon, TrendingUp, Landmark, RefreshCw, Info,
} from 'lucide-react'

import {
  ListPage, ConfigPage, ReviewQueue, ConflictNote, StatusBadge, Mono, HealthDot,
  Card, CardHeader, Button, Input, Select, Badge, Table, Toggle, Modal, Stat,
  type Col,
} from './kit'
import { BarChart, AreaChart, Sparkline } from '@/components/charts'
import {
  COINS, PAIRS, FUTURES_PAIRS, MARGIN_TIERS, ADMIN_USERS, KYC_QUEUE,
  DEPOSITS, WITHDRAWALS, STAFF, RECON, SERIES, KPI, SYSTEM_HEALTH,
  type AdminCoin, type AdminPair, type WalletTx,
} from '@/mock/admin'
import { SPOT_ORDERS, type SpotOrder } from '@/mock/account'
import { TICKERS } from '@/mock/market'
import { cn, num, usd, compact, fmtDateTime, shortAddr, seeded } from '@/lib/utils'

/* ==================================================================== *
 *  G1 — 交易配置 (B-01…B-14) + 财务管理 (B-15…B-21) + Dashboard
 * ==================================================================== */

/* -------------------------------------------------------------------- *
 * 0. Shared local primitives
 * -------------------------------------------------------------------- */

const dp = (p: number) => (p >= 1000 ? 2 : p >= 1 ? 4 : 6)
const coinDp = (c: string) => (c === 'BTC' ? 5 : c === 'ETH' ? 4 : c === 'SOL' ? 3 : 2)

/** Round coin bubble used in every coin/pair table. */
function CoinIcon({ coin, size = 'md' }: { coin: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'rounded-full bg-elevated border border-line grid place-items-center font-semibold text-muted shrink-0',
        size === 'sm' ? 'w-5 h-5 text-2xs' : 'w-7 h-7 text-2xs',
      )}
    >
      {coin.slice(0, 2)}
    </span>
  )
}

function Progress({
  v, tone = 'brand', showPct = true,
}: { v: number; tone?: 'brand' | 'up' | 'down' | 'warn' | 'info'; showPct?: boolean }) {
  const fill = { brand: 'bg-brand', up: 'bg-up', down: 'bg-down', warn: 'bg-warn', info: 'bg-info' }[tone]
  const pct = Math.max(0, Math.min(100, v * 100))
  return (
    <div className="flex items-center gap-2 min-w-[6.5rem]">
      <div className="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', fill)} style={{ width: `${pct}%` }} />
      </div>
      {showPct && <span className="text-2xs text-muted tnum w-8 text-right">{pct.toFixed(0)}%</span>}
    </div>
  )
}

/** Warning strip — used by the tools that mutate the ledger directly. */
function DangerNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-down/30 bg-down/5">
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-down shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-down mb-0.5">{title}</div>
          <p className="text-xs text-muted leading-relaxed">{children}</p>
        </div>
      </div>
    </Card>
  )
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-info/30 bg-info/5">
      <div className="flex items-start gap-3 px-4 py-3">
        <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p className="text-xs text-muted leading-relaxed">{children}</p>
      </div>
    </Card>
  )
}

/** Accounting table rows — 资产负债表 / 现金流量表 / 利润表 all share this. */
function AcctTable({
  rows, total, totalLabel, dpv = 2,
}: {
  rows: { label: string; value: number; hint?: string; indent?: boolean; sign?: boolean }[]
  total: number
  totalLabel: string
  dpv?: number
}) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(r => (
          <tr key={r.label} className="border-b border-line/60">
            <td className={cn('px-4 py-2', r.indent && 'pl-8')}>
              <div className="text-xs">{r.label}</div>
              {r.hint && <div className="text-2xs text-faint mt-0.5">{r.hint}</div>}
            </td>
            <td className="px-4 py-2 text-right">
              <span className={cn('tnum text-sm', r.sign && (r.value >= 0 ? 'text-up' : 'text-down'))}>
                {r.sign && r.value >= 0 ? '+' : ''}{num(r.value, dpv)}
              </span>
            </td>
          </tr>
        ))}
        <tr className="bg-elevated/60">
          <td className="px-4 py-2.5 text-xs font-semibold">{totalLabel}</td>
          <td className="px-4 py-2.5 text-right tnum text-sm font-semibold">{num(total, dpv)}</td>
        </tr>
      </tbody>
    </table>
  )
}

/* -------------------------------------------------------------------- *
 * 1. Dashboard — 运营总览
 * -------------------------------------------------------------------- */

export function Dashboard() {
  const hotPairs = TICKERS.slice(0, 8)
  const pendingKyc = KYC_QUEUE.filter(k => k.status === '待审核').slice(0, 5)
  const pendingWd = WITHDRAWALS.filter(w => w.status === '待审核').slice(0, 5)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">运营总览</h1>
        <p className="text-xs text-muted mt-0.5">
          数据截至 {fmtDateTime(Date.now())} · 撮合、清算、风控实时指标
        </p>
      </div>

      {/* ---- 6 KPI tiles ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat
          label="24h 成交额" value={usd(KPI.turnover24h)} delta={KPI.turnoverDelta}
          hint="现货 + 合约" icon={<TrendingUp className="w-4 h-4" />}
        />
        <Stat
          label="24h 新增用户" value={num(KPI.newUsers24h, 0)} delta={KPI.newUsersDelta}
          hint={`活跃 ${num(KPI.activeUsers24h, 0)}`} icon={<UsersIcon className="w-4 h-4" />}
        />
        <Stat
          label="待审核提币" value={num(KPI.pendingWithdrawals, 0)}
          hint="需人工审核" icon={<Wallet className="w-4 h-4" />}
        />
        <Stat
          label="待审核 KYC" value={num(KPI.pendingKyc, 0)}
          hint="合规部处理中" icon={<ShieldCheck className="w-4 h-4" />}
        />
        <Stat
          label="平台总资产" value={usd(KPI.platformAssets)}
          hint="自有资金" icon={<Landmark className="w-4 h-4" />}
        />
        <Stat
          label="保险基金余额" value={usd(KPI.insuranceFund)} delta={KPI.insuranceFundDelta}
          hint="F-41 穿仓兜底" icon={<Layers className="w-4 h-4" />}
        />
      </div>

      {/* ---- Trend charts ---- */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="成交额趋势"
            sub="近 30 日 · 现货 + 合约（USDT）"
            right={<span className="text-2xs text-up tnum">+{KPI.turnoverDelta.toFixed(1)}%</span>}
          />
          <div className="p-4">
            <AreaChart data={SERIES.turnover30d} tone="brand" height={200} className="w-full" />
            <div className="flex justify-between mt-2 text-2xs text-faint tnum">
              <span>30 日前</span>
              <span>峰值 {compact(Math.max(...SERIES.turnover30d))}</span>
              <span>今日</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="注册趋势"
            sub="近 30 日 · 新增注册用户"
            right={<span className="text-2xs text-down tnum">{KPI.newUsersDelta.toFixed(1)}%</span>}
          />
          <div className="p-4">
            <BarChart data={SERIES.register30d} tone="info" height={200} />
            <div className="flex justify-between mt-2 text-2xs text-faint tnum">
              <span>30 日前</span>
              <span>累计 {num(SERIES.register30d.reduce((s, v) => s + v, 0), 0)}</span>
              <span>今日</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ---- Hot pairs + system health ---- */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="热门交易对"
            sub="按 24h 成交额排序"
            right={<Link to="/admin/trade/pairs" className="text-2xs text-brand hover:underline">币对配置 →</Link>}
          />
          <Table
            dense
            rows={hotPairs}
            cols={[
              {
                key: 'sym', header: '币对',
                cell: t => (
                  <div className="flex items-center gap-2">
                    <CoinIcon coin={t.base} size="sm" />
                    <span className="font-medium">{t.symbol}</span>
                    {t.tags?.includes('hot') && <Badge tone="warn">HOT</Badge>}
                  </div>
                ),
              },
              { key: 'p', header: '最新价', align: 'right', cell: t => <span className="tnum">{num(t.price, dp(t.price))}</span> },
              {
                key: 'c', header: '24h 涨跌', align: 'right',
                cell: t => (
                  <span className={cn('tnum font-medium', t.change >= 0 ? 'text-up' : 'text-down')}>
                    {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
                  </span>
                ),
              },
              { key: 'v', header: '24h 额', align: 'right', hideBelow: 'sm', cell: t => <span className="tnum text-muted">{compact(t.turnover)}</span> },
              {
                key: 's', header: '走势', align: 'right', width: '84px',
                cell: t => <Sparkline data={t.sparkline} up={t.change >= 0} className="w-20 h-6 ml-auto" />,
              },
            ] as Col<(typeof hotPairs)[number]>[]}
          />
        </Card>

        <Card>
          <CardHeader title="系统健康" sub="6 个核心服务" right={<Badge tone="warn">1 项告警</Badge>} />
          <div className="divide-y divide-line/60">
            {SYSTEM_HEALTH.map(s => (
              <div key={s.name} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="mt-1.5"><HealthDot status={s.status} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{s.name}</div>
                  <div className={cn('text-2xs mt-0.5 leading-relaxed', s.status === 'warn' ? 'text-warn' : 'text-faint')}>
                    {s.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-line">
            <p className="text-2xs text-muted leading-relaxed">
              钱包服务由 <span className="text-warn">第三方托管服务</span> 提供（合同 Article I 已排除 wallet services），
              链上扫描任务失败需由甲方侧排查。
            </p>
          </div>
        </Card>
      </div>

      {/* ---- 待办面板 ---- */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="待审核实名认证"
            sub={`${KPI.pendingKyc} 笔待处理`}
            right={<Link to="/admin/users/kyc-review" className="text-2xs text-brand hover:underline">全部 →</Link>}
          />
          <div className="divide-y divide-line/60">
            {pendingKyc.map(k => (
              <Link
                key={k.id} to="/admin/users/kyc-review"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{k.realName}</span>
                    <Badge tone="info">L{k.level}</Badge>
                    <span className="text-2xs text-faint">{k.country}</span>
                  </div>
                  <div className="text-2xs text-faint mt-0.5 tnum">
                    UID {k.uid} · {k.docType} · 提交于 {k.submittedAt.slice(0, 10)}
                  </div>
                </div>
                <span className="text-2xs text-muted tnum shrink-0">活体 {k.faceScore}</span>
                <span className="text-2xs text-brand shrink-0 flex items-center gap-0.5">
                  去处理 <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="待审核提币"
            sub={`${KPI.pendingWithdrawals} 笔待处理`}
            right={<Link to="/admin/wallet/withdrawals" className="text-2xs text-brand hover:underline">全部 →</Link>}
          />
          <div className="divide-y divide-line/60">
            {pendingWd.map(w => (
              <Link
                key={w.id} to="/admin/wallet/withdrawals"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated transition-colors"
              >
                <CoinIcon coin={w.coin} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tnum">
                      {num(w.amount, w.coin === 'USDT' ? 2 : 6)} {w.coin}
                    </span>
                    {w.riskFlags.slice(0, 1).map(f => <Badge key={f} tone="down">{f}</Badge>)}
                  </div>
                  <div className="text-2xs text-faint mt-0.5 tnum">
                    UID {w.uid} · {w.chain} · {w.ts.slice(5, 16)}
                  </div>
                </div>
                <span
                  className={cn(
                    'text-2xs tnum shrink-0 font-medium',
                    w.riskScore >= 70 ? 'text-down' : w.riskScore >= 40 ? 'text-warn' : 'text-up',
                  )}
                >
                  风控 {w.riskScore}
                </span>
                <span className="text-2xs text-brand shrink-0 flex items-center gap-0.5">
                  去处理 <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ==================================================================== *
 * 2. 交易配置 — 币币交易 (B-01 … B-03)
 * ==================================================================== */

/* -------------------------- B-01 币种配置 --------------------------- */
export function Coins() {
  const [sw, setSw] = useState<Record<string, { dep: boolean; wd: boolean }>>(
    () => Object.fromEntries(COINS.map(c => [c.id, { dep: c.depositOn, wd: c.withdrawOn }])),
  )
  const [addOpen, setAddOpen] = useState(false)

  const cols: Col<AdminCoin>[] = [
    {
      key: 'coin', header: '币种',
      cell: c => (
        <div className="flex items-center gap-2.5">
          <CoinIcon coin={c.coin} />
          <div>
            <div className="text-sm font-medium">{c.coin}</div>
            <div className="text-2xs text-faint">{c.name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'chains', header: '支持链',
      cell: c => (
        <div className="flex flex-wrap gap-1">
          {c.chains.map(ch => <Badge key={ch} tone="info">{ch}</Badge>)}
        </div>
      ),
    },
    {
      key: 'dep', header: '充值开关', align: 'center',
      cell: c => (
        <div className="flex justify-center">
          <Toggle
            checked={sw[c.id].dep}
            onChange={v => setSw(s => ({ ...s, [c.id]: { ...s[c.id], dep: v } }))}
          />
        </div>
      ),
    },
    {
      key: 'wd', header: '提现开关', align: 'center',
      cell: c => (
        <div className="flex justify-center">
          <Toggle
            checked={sw[c.id].wd}
            onChange={v => setSw(s => ({ ...s, [c.id]: { ...s[c.id], wd: v } }))}
          />
        </div>
      ),
    },
    { key: 'fee', header: '提现手续费', align: 'right', cell: c => <span className="tnum">{num(c.withdrawFee, coinDp(c.coin))}</span> },
    { key: 'min', header: '最小提现', align: 'right', cell: c => <span className="tnum">{num(c.minWithdraw, coinDp(c.coin))}</span> },
    { key: 'cfm', header: '到账确认数', align: 'right', hideBelow: 'md', cell: c => <span className="tnum text-muted">{c.confirms}</span> },
    { key: 'prec', header: '精度', align: 'right', hideBelow: 'md', cell: c => <span className="tnum text-muted">{c.precision}</span> },
    { key: 'st', header: '状态', align: 'center', cell: c => <StatusBadge s={c.status} /> },
    {
      key: 'op', header: '操作', align: 'right',
      cell: () => <Button size="sm" variant="ghost" className="text-brand">编辑</Button>,
    },
  ]

  return (
    <>
      <ListPage<AdminCoin>
        title="币种配置"
        sub="B-01 · 币币交易 — 上下线、充提开关、手续费与链上确认数"
        stats={[
          { label: '已配置币种', value: COINS.length, hint: '含 8 条链' },
          { label: '已上线', value: COINS.filter(c => c.status === '上线').length },
          { label: '充值开放', value: COINS.filter(c => sw[c.id].dep).length },
          { label: '提现开放', value: COINS.filter(c => sw[c.id].wd).length },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索币种 / 名称', width: 'w-56' },
          { type: 'select', key: 'status', label: '全部状态', options: ['上线', '下线', '维护'] },
          { type: 'select', key: 'chain', label: '全部链', options: ['TRC20', 'ERC20', 'BEP20', 'Bitcoin', 'Solana'] },
        ]}
        match={(c, s) =>
          (!s.q || `${c.coin} ${c.name}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.status || c.status === s.status) &&
          (!s.chain || c.chains.includes(s.chain))
        }
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" />新增币种</Button>
          </div>
        }
        cols={cols}
        rows={COINS}
      />

      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} title="新增币种" width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={() => setAddOpen(false)}>提交审核</Button>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="币种符号" placeholder="如 ARB" defaultValue="" />
          <Input label="币种全称" placeholder="如 Arbitrum" defaultValue="" />
          <Select
            label="所属链"
            options={[
              { value: 'ERC20', label: 'ERC20' }, { value: 'TRC20', label: 'TRC20' },
              { value: 'BEP20', label: 'BEP20' }, { value: 'Arbitrum', label: 'Arbitrum' },
            ]}
            defaultValue="ERC20"
          />
          <Input label="合约地址" placeholder="0x…" defaultValue="" />
          <Input label="提现手续费" type="number" defaultValue="1" suffix="币" />
          <Input label="最小提现额" type="number" defaultValue="10" suffix="币" />
          <Input label="到账确认数" type="number" defaultValue="12" suffix="块" />
          <Input label="精度" type="number" defaultValue="6" suffix="位" />
        </div>
        <div className="mt-4 flex items-center gap-6">
          <Toggle checked onChange={() => {}} label="开启充值" />
          <Toggle checked onChange={() => {}} label="开启提现" />
        </div>
        <p className="text-2xs text-faint mt-4 leading-relaxed">
          新增币种需钱包服务同步生成充值地址池（第三方托管），上线前请确认链上扫描任务已覆盖该链。
        </p>
      </Modal>
    </>
  )
}

/* -------------------------- B-02 币对配置 --------------------------- */
export function Pairs() {
  const [addOpen, setAddOpen] = useState(false)

  const cols: Col<AdminPair>[] = [
    {
      key: 'sym', header: '币对',
      cell: p => (
        <div className="flex items-center gap-2.5">
          <CoinIcon coin={p.symbol.split('/')[0]} />
          <div>
            <div className="text-sm font-medium">{p.symbol}</div>
            <div className="text-2xs text-faint">现货 · {p.id}</div>
          </div>
        </div>
      ),
    },
    { key: 'tick', header: '最小变动价位', align: 'right', cell: p => <Mono className="text-muted">{p.tickSize}</Mono> },
    { key: 'minq', header: '最小下单量', align: 'right', cell: p => <span className="tnum">{p.minQty}</span> },
    { key: 'mk', header: 'Maker 费率', align: 'right', cell: p => <span className="tnum">{(p.makerFee * 100).toFixed(3)}%</span> },
    { key: 'tk', header: 'Taker 费率', align: 'right', cell: p => <span className="tnum">{(p.takerFee * 100).toFixed(3)}%</span> },
    {
      key: 'lim', header: '涨跌幅限制', align: 'right', hideBelow: 'md',
      cell: p => <span className="tnum text-muted">±{p.priceLimit}%</span>,
    },
    { key: 'st', header: '状态', align: 'center', cell: p => <StatusBadge s={p.status} /> },
    {
      key: 'op', header: '操作', align: 'right',
      cell: p => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" className="text-brand">编辑</Button>
          <Button size="sm" variant="ghost">{p.status === '交易中' ? '暂停' : '恢复'}</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage<AdminPair>
        title="币对配置"
        sub="B-02 · 币币交易 — 交易对参数、费率与涨跌幅限制"
        stats={[
          { label: '现货币对', value: PAIRS.length },
          { label: '交易中', value: PAIRS.filter(p => p.status === '交易中').length },
          { label: '已暂停', value: PAIRS.filter(p => p.status !== '交易中').length },
          { label: '默认费率', value: '0.100%', hint: 'Maker = Taker' },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索币对', width: 'w-56' },
          { type: 'select', key: 'status', label: '全部状态', options: ['交易中', '暂停', '仅撤单'] },
        ]}
        match={(p, s) =>
          (!s.q || p.symbol.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.status || p.status === s.status)
        }
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" />新增币对</Button>
          </div>
        }
        cols={cols}
        rows={PAIRS}
      />

      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} title="新增币对" width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={() => setAddOpen(false)}>创建币对</Button>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="基础货币"
            options={COINS.map(c => ({ value: c.coin, label: c.coin }))}
            defaultValue="BTC"
          />
          <Select
            label="计价货币"
            options={[{ value: 'USDT', label: 'USDT' }, { value: 'BTC', label: 'BTC' }]}
            defaultValue="USDT"
          />
          <Input label="最小变动价位 (tickSize)" defaultValue="0.1" />
          <Input label="最小下单量" defaultValue="0.0001" />
          <Input label="Maker 费率" type="number" defaultValue="0.1" suffix="%" />
          <Input label="Taker 费率" type="number" defaultValue="0.1" suffix="%" />
          <Input label="涨跌幅限制" type="number" defaultValue="10" suffix="%" />
          <Select
            label="初始状态"
            options={[{ value: '交易中', label: '交易中' }, { value: '暂停', label: '暂停' }]}
            defaultValue="暂停"
          />
        </div>
        <p className="text-2xs text-faint mt-4 leading-relaxed">
          新币对创建后默认进入「暂停」状态，需在撮合引擎完成订单簿初始化并做市商注入流动性后手动开放交易。
        </p>
      </Modal>
    </>
  )
}

/* ------------------------ B-03 币币订单管理 ------------------------- */
type SpotRow = SpotOrder & { uid: string; time: string; date: string }

const SPOT_ROWS: SpotRow[] = SPOT_ORDERS.map((o, i) => ({
  ...o,
  uid: ADMIN_USERS[i % ADMIN_USERS.length].uid,
  time: fmtDateTime(o.ts),
  date: fmtDateTime(o.ts).slice(0, 10),
}))

const SPOT_STATUS: Record<SpotOrder['status'], { label: string; tone: 'info' | 'warn' | 'up' | 'muted' }> = {
  open: { label: '委托中', tone: 'info' },
  partial: { label: '部分成交', tone: 'warn' },
  filled: { label: '已成交', tone: 'up' },
  cancelled: { label: '已撤单', tone: 'muted' },
}

export function SpotOrders() {
  const [cancelTarget, setCancelTarget] = useState<SpotRow | null>(null)
  const [cancelled, setCancelled] = useState<Set<string>>(() => new Set())

  const symbols = useMemo(() => Array.from(new Set(SPOT_ROWS.map(o => o.symbol))), [])

  const cols: Col<SpotRow>[] = [
    { key: 'id', header: '订单号', cell: o => <Mono>{o.id}</Mono> },
    { key: 'ts', header: '时间', hideBelow: 'md', cell: o => <span className="text-2xs text-muted tnum">{o.time}</span> },
    { key: 'uid', header: 'UID', cell: o => <span className="tnum text-muted">{o.uid}</span> },
    { key: 'sym', header: '币对', cell: o => <span className="font-medium">{o.symbol}</span> },
    {
      key: 'side', header: '方向', align: 'center',
      cell: o => (
        <span className={cn('font-medium', o.side === 'buy' ? 'text-up' : 'text-down')}>
          {o.side === 'buy' ? '买入' : '卖出'}
        </span>
      ),
    },
    { key: 'type', header: '类型', align: 'center', cell: o => <Badge>{o.type === 'limit' ? '限价' : '市价'}</Badge> },
    { key: 'price', header: '价格', align: 'right', cell: o => <span className="tnum">{num(o.price, dp(o.price))}</span> },
    { key: 'amt', header: '数量', align: 'right', cell: o => <span className="tnum">{num(o.amount, o.price > 1000 ? 5 : 2)}</span> },
    {
      key: 'fill', header: '已成交', align: 'right', width: '140px',
      cell: o => <div className="flex justify-end"><Progress v={o.amount ? o.filled / o.amount : 0} tone={o.filled >= o.amount ? 'up' : 'brand'} /></div>,
    },
    {
      key: 'st', header: '状态', align: 'center',
      cell: o => {
        if (cancelled.has(o.id)) return <Badge tone="muted">已撤单</Badge>
        const s = SPOT_STATUS[o.status]
        return <Badge tone={s.tone}>{s.label}</Badge>
      },
    },
    {
      key: 'op', header: '操作', align: 'right',
      cell: o => {
        const live = (o.status === 'open' || o.status === 'partial') && !cancelled.has(o.id)
        return live
          ? <Button size="sm" variant="danger" onClick={() => setCancelTarget(o)}>强制撤单</Button>
          : <span className="text-2xs text-faint">—</span>
      },
    },
  ]

  const openCount = SPOT_ROWS.filter(o => (o.status === 'open' || o.status === 'partial') && !cancelled.has(o.id)).length

  return (
    <>
      <ListPage<SpotRow>
        title="币币订单管理"
        sub="B-03 · 全站现货委托 — 支持强制撤单（操作将记入管理员操作日志）"
        stats={[
          { label: '订单总数', value: SPOT_ROWS.length },
          { label: '未完成委托', value: openCount, hint: '可强制撤单' },
          { label: '已成交', value: SPOT_ROWS.filter(o => o.status === 'filled').length },
          { label: '成交额（样本）', value: usd(SPOT_ROWS.reduce((s, o) => s + o.filled * o.price, 0)) },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '订单号 / UID', width: 'w-52' },
          { type: 'select', key: 'symbol', label: '全部币对', options: symbols },
          { type: 'select', key: 'status', label: '全部状态', options: ['委托中', '部分成交', '已成交', '已撤单'] },
          { type: 'date', key: 'date' },
        ]}
        match={(o, s) =>
          (!s.q || `${o.id} ${o.uid}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.symbol || o.symbol === s.symbol) &&
          (!s.status || SPOT_STATUS[o.status].label === s.status) &&
          (!s.date || o.date === s.date)
        }
        cols={cols}
        rows={SPOT_ROWS}
      />

      <Modal
        open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="强制撤单确认"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>取消</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (cancelTarget) setCancelled(c => new Set(c).add(cancelTarget.id))
                setCancelTarget(null)
              }}
            >
              确认强制撤单
            </Button>
          </div>
        }
      >
        {cancelTarget && (
          <div className="space-y-3">
            <DangerNote title="该操作将立即撤销用户委托">
              撤单后冻结资金将实时解冻并回滚至用户可用余额，操作不可撤销，且会通过站内信通知用户。
            </DangerNote>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><div className="text-faint mb-0.5">订单号</div><Mono>{cancelTarget.id}</Mono></div>
              <div><div className="text-faint mb-0.5">UID</div><span className="tnum">{cancelTarget.uid}</span></div>
              <div><div className="text-faint mb-0.5">币对 / 方向</div>
                <span>{cancelTarget.symbol} · </span>
                <span className={cancelTarget.side === 'buy' ? 'text-up' : 'text-down'}>
                  {cancelTarget.side === 'buy' ? '买入' : '卖出'}
                </span>
              </div>
              <div><div className="text-faint mb-0.5">未成交数量</div>
                <span className="tnum">{num(cancelTarget.amount - cancelTarget.filled, 4)}</span>
              </div>
            </div>
            <Input label="操作原因（必填，记入操作日志）" placeholder="如：用户申诉 / 异常订单 / 风控要求" />
          </div>
        )}
      </Modal>
    </>
  )
}

/* ==================================================================== *
 * 3. 交易配置 — 杠杆交易 (B-04 / B-05) ⚠️ 合同冲突
 * ==================================================================== */

type MarginRule = {
  id: string; symbol: string; maxLev: number; dailyRate: number
  borrowCap: number; liqLine: number; status: '启用' | '停用'
}

const MARGIN_RULES: MarginRule[] = PAIRS.slice(0, 10).map((p, i) => ({
  id: `MR${i + 1}`,
  symbol: p.symbol,
  maxLev: [10, 10, 5, 5, 5, 3, 3, 3, 3, 3][i],
  dailyRate: [0.0002, 0.0002, 0.00025, 0.0003, 0.0003, 0.00045, 0.00045, 0.0005, 0.0006, 0.0006][i],
  borrowCap: [5_000_000, 3_000_000, 1_200_000, 800_000, 800_000, 400_000, 400_000, 250_000, 200_000, 120_000][i],
  liqLine: [1.1, 1.1, 1.15, 1.15, 1.15, 1.2, 1.2, 1.25, 1.25, 1.3][i],
  status: i === 9 ? '停用' : '启用',
}))

/* -------------------------- B-04 杠杆规则配置 ----------------------- */
export function MarginRules() {
  const cols: Col<MarginRule>[] = [
    {
      key: 'sym', header: '币对',
      cell: m => (
        <div className="flex items-center gap-2.5">
          <CoinIcon coin={m.symbol.split('/')[0]} />
          <div>
            <div className="text-sm font-medium">{m.symbol}</div>
            <div className="text-2xs text-faint">全仓杠杆</div>
          </div>
        </div>
      ),
    },
    {
      key: 'lev', header: '最大杠杆', align: 'right',
      cell: m => <span className="tnum font-semibold text-brand">{m.maxLev}×</span>,
    },
    {
      key: 'rate', header: '日利率', align: 'right',
      cell: m => (
        <div>
          <div className="tnum">{(m.dailyRate * 100).toFixed(4)}%</div>
          <div className="text-2xs text-faint tnum">年化 {(m.dailyRate * 365 * 100).toFixed(2)}%</div>
        </div>
      ),
    },
    { key: 'cap', header: '可借上限', align: 'right', cell: m => <span className="tnum">{compact(m.borrowCap)} USDT</span> },
    {
      key: 'liq', header: '强平线', align: 'right',
      cell: m => <span className="tnum text-down">风险率 ≤ {m.liqLine.toFixed(2)}</span>,
    },
    { key: 'st', header: '状态', align: 'center', cell: m => <StatusBadge s={m.status} /> },
    { key: 'op', header: '操作', align: 'right', cell: () => <Button size="sm" variant="ghost" className="text-brand">编辑</Button> },
  ]

  return (
    <ListPage<MarginRule>
      fnId="B-04"
      title="杠杆规则配置"
      sub={
        <span>
          B-04 · <span className="text-warn font-medium">杠杆（借贷）交易是独立的第三套交易系统</span> —
          除现货撮合与合约撮合外，另需借贷账本、利息计提、风险率引擎与强平通道。本页为范围确认用原型。
        </span>
      }
      stats={[
        { label: '已配置币对', value: MARGIN_RULES.length },
        { label: '最高杠杆', value: `${Math.max(...MARGIN_RULES.map(m => m.maxLev))}×` },
        { label: '可借总额度', value: usd(MARGIN_RULES.reduce((s, m) => s + m.borrowCap, 0)) },
        { label: '启用中', value: MARGIN_RULES.filter(m => m.status === '启用').length },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '搜索币对', width: 'w-52' },
        { type: 'select', key: 'status', label: '全部状态', options: ['启用', '停用'] },
      ]}
      match={(m, s) =>
        (!s.q || m.symbol.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.status || m.status === s.status)
      }
      cols={cols}
      rows={MARGIN_RULES}
    />
  )
}

/* -------------------------- B-05 杠杆订单管理 ----------------------- */
type MarginOrder = {
  id: string; uid: string; symbol: string; borrowCoin: string
  borrowed: number; repaid: number; dailyRate: number; interest: number
  riskRate: number; status: '借贷中' | '已还清' | '风险预警' | '已强平'
  ts: string
}

const rm = seeded(60415)
const MARGIN_ORDERS: MarginOrder[] = Array.from({ length: 24 }, (_, i) => {
  const rule = MARGIN_RULES[i % MARGIN_RULES.length]
  const borrowCoin = rm() > 0.35 ? 'USDT' : rule.symbol.split('/')[0]
  const borrowed = +(rm() * (borrowCoin === 'USDT' ? 180_000 : 12) + 10).toFixed(borrowCoin === 'USDT' ? 2 : 4)
  const status: MarginOrder['status'] =
    i < 3 ? '风险预警' : i < 5 ? '已强平' : rm() > 0.45 ? '借贷中' : '已还清'
  const repaid = status === '已还清' ? borrowed : status === '已强平' ? borrowed : +(borrowed * rm() * 0.6).toFixed(4)
  const riskRate =
    status === '风险预警' ? +(rule.liqLine + rm() * 0.06).toFixed(3)
    : status === '已强平' ? rule.liqLine
    : +(1.6 + rm() * 2.4).toFixed(3)
  return {
    id: `M${74_000 + i * 13}`,
    uid: ADMIN_USERS[(i * 3) % ADMIN_USERS.length].uid,
    symbol: rule.symbol,
    borrowCoin,
    borrowed,
    repaid,
    dailyRate: rule.dailyRate,
    interest: +(borrowed * rule.dailyRate * (rm() * 40 + 1)).toFixed(borrowCoin === 'USDT' ? 2 : 6),
    riskRate,
    status,
    ts: fmtDateTime(Date.now() - Math.floor(rm() * 30) * 86_400_000),
  }
})

const MO_TONE: Record<MarginOrder['status'], 'info' | 'up' | 'warn' | 'down'> = {
  借贷中: 'info', 已还清: 'up', 风险预警: 'warn', 已强平: 'down',
}

export function MarginOrders() {
  const cols: Col<MarginOrder>[] = [
    { key: 'id', header: '订单号', cell: m => <Mono>{m.id}</Mono> },
    { key: 'uid', header: 'UID', cell: m => <span className="tnum text-muted">{m.uid}</span> },
    { key: 'sym', header: '币对', cell: m => <span className="font-medium">{m.symbol}</span> },
    {
      key: 'bc', header: '借贷币种', align: 'center',
      cell: m => (
        <div className="flex items-center justify-center gap-1.5">
          <CoinIcon coin={m.borrowCoin} size="sm" />
          <span className="text-xs">{m.borrowCoin}</span>
        </div>
      ),
    },
    { key: 'amt', header: '借贷数量', align: 'right', cell: m => <span className="tnum">{num(m.borrowed, m.borrowCoin === 'USDT' ? 2 : 4)}</span> },
    {
      key: 'rep', header: '已还', align: 'right', width: '140px',
      cell: m => (
        <div className="flex justify-end">
          <Progress v={m.borrowed ? m.repaid / m.borrowed : 0} tone={m.repaid >= m.borrowed ? 'up' : 'brand'} />
        </div>
      ),
    },
    { key: 'rate', header: '日利率', align: 'right', hideBelow: 'md', cell: m => <span className="tnum text-muted">{(m.dailyRate * 100).toFixed(4)}%</span> },
    { key: 'int', header: '累计利息', align: 'right', cell: m => <span className="tnum text-warn">{num(m.interest, m.borrowCoin === 'USDT' ? 2 : 6)}</span> },
    {
      key: 'risk', header: '风险率', align: 'right',
      cell: m => (
        <span
          className={cn(
            'tnum font-semibold',
            m.riskRate <= 1.2 ? 'text-down' : m.riskRate <= 1.6 ? 'text-warn' : 'text-up',
          )}
        >
          {m.riskRate.toFixed(3)}
        </span>
      ),
    },
    { key: 'st', header: '状态', align: 'center', cell: m => <Badge tone={MO_TONE[m.status]}>{m.status}</Badge> },
  ]

  return (
    <ListPage<MarginOrder>
      fnId="B-05"
      title="杠杆订单管理"
      sub={
        <span>
          B-05 · 借贷订单与利息计提。风险率 = 总资产 / 总负债，跌破币对强平线即触发逐级强平。
          <span className="text-warn"> 该系统与 B-04 同属未确认范围。</span>
        </span>
      }
      stats={[
        { label: '借贷订单', value: MARGIN_ORDERS.length },
        { label: '借贷中', value: MARGIN_ORDERS.filter(m => m.status === '借贷中').length },
        { label: '风险预警', value: MARGIN_ORDERS.filter(m => m.status === '风险预警').length, hint: '接近强平线' },
        {
          label: '累计应收利息',
          value: usd(MARGIN_ORDERS.filter(m => m.borrowCoin === 'USDT').reduce((s, m) => s + m.interest, 0)),
        },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '订单号 / UID', width: 'w-52' },
        { type: 'select', key: 'symbol', label: '全部币对', options: Array.from(new Set(MARGIN_ORDERS.map(m => m.symbol))) },
        { type: 'select', key: 'status', label: '全部状态', options: ['借贷中', '已还清', '风险预警', '已强平'] },
      ]}
      match={(m, s) =>
        (!s.q || `${m.id} ${m.uid}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.symbol || m.symbol === s.symbol) &&
        (!s.status || m.status === s.status)
      }
      cols={cols}
      rows={MARGIN_ORDERS}
    />
  )
}

/* ==================================================================== *
 * 4. 交易配置 — 合约交易 (B-06 / B-07)
 * ==================================================================== */

type FuturesCoin = {
  id: string; coin: string; name: string; settle: string
  linear: boolean; inverse: boolean; sources: string[]
  maxLev: number; status: '上线' | '下线' | '维护'
}

const INDEX_SOURCES = ['Binance', 'OKX', 'Coinbase', 'Bitstamp', 'Kraken']

const FUTURES_COINS: FuturesCoin[] = [
  { id: 'FC1', coin: 'BTC', name: 'Bitcoin',  settle: 'USDT / BTC', linear: true, inverse: true,  sources: INDEX_SOURCES,            maxLev: 125, status: '上线' },
  { id: 'FC2', coin: 'ETH', name: 'Ethereum', settle: 'USDT / ETH', linear: true, inverse: true,  sources: INDEX_SOURCES,            maxLev: 100, status: '上线' },
  { id: 'FC3', coin: 'SOL', name: 'Solana',   settle: 'USDT',       linear: true, inverse: false, sources: ['Binance', 'OKX', 'Coinbase'], maxLev: 75, status: '上线' },
  { id: 'FC4', coin: 'BNB', name: 'BNB',      settle: 'USDT',       linear: true, inverse: false, sources: ['Binance', 'OKX'],       maxLev: 50, status: '上线' },
  { id: 'FC5', coin: 'XRP', name: 'XRP',      settle: 'USDT',       linear: true, inverse: false, sources: ['Binance', 'OKX', 'Bitstamp'], maxLev: 50, status: '上线' },
  { id: 'FC6', coin: 'DOGE', name: 'Dogecoin', settle: 'USDT',      linear: true, inverse: false, sources: ['Binance', 'OKX'],       maxLev: 25, status: '上线' },
  { id: 'FC7', coin: 'ADA', name: 'Cardano',  settle: 'USDT',       linear: true, inverse: false, sources: ['Binance', 'Kraken'],    maxLev: 25, status: '维护' },
  { id: 'FC8', coin: 'SUI', name: 'Sui',      settle: 'USDT',       linear: true, inverse: false, sources: ['Binance', 'OKX'],       maxLev: 20, status: '下线' },
]

/* ------------------------ B-06 合约币种配置 ------------------------- */
export function FuturesCoins() {
  const cols: Col<FuturesCoin>[] = [
    {
      key: 'coin', header: '标的币种',
      cell: c => (
        <div className="flex items-center gap-2.5">
          <CoinIcon coin={c.coin} />
          <div>
            <div className="text-sm font-medium">{c.coin}</div>
            <div className="text-2xs text-faint">{c.name}</div>
          </div>
        </div>
      ),
    },
    { key: 'settle', header: '结算币种', cell: c => <Mono className="text-muted">{c.settle}</Mono> },
    {
      key: 'dir', header: '合约方向', align: 'center',
      cell: c => (
        <div className="flex items-center justify-center gap-1">
          <Badge tone={c.linear ? 'up' : 'muted'}>正向 USDT</Badge>
          <Badge tone={c.inverse ? 'up' : 'muted'}>反向 币本位</Badge>
        </div>
      ),
    },
    {
      key: 'src', header: '指数价格来源', hideBelow: 'md',
      cell: c => (
        <div className="flex flex-wrap gap-1">
          {c.sources.map(s => <Badge key={s} tone="info">{s}</Badge>)}
        </div>
      ),
    },
    { key: 'lev', header: '最高杠杆', align: 'right', cell: c => <span className="tnum font-semibold">{c.maxLev}×</span> },
    { key: 'st', header: '状态', align: 'center', cell: c => <StatusBadge s={c.status} /> },
    { key: 'op', header: '操作', align: 'right', cell: () => <Button size="sm" variant="ghost" className="text-brand">编辑</Button> },
  ]

  return (
    <ListPage<FuturesCoin>
      title="合约币种配置"
      sub="B-06 · 合约标的币种 — 结算币种、正向/反向支持与指数价格来源（F-37 每秒聚合一次）"
      stats={[
        { label: '标的币种', value: FUTURES_COINS.length },
        { label: '支持反向合约', value: FUTURES_COINS.filter(c => c.inverse).length, hint: '币本位保证金' },
        { label: '指数来源', value: INDEX_SOURCES.length, hint: '多交易所聚合' },
        { label: '最高杠杆', value: `${Math.max(...FUTURES_COINS.map(c => c.maxLev))}×` },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '搜索币种', width: 'w-52' },
        { type: 'select', key: 'status', label: '全部状态', options: ['上线', '下线', '维护'] },
      ]}
      match={(c, s) =>
        (!s.q || `${c.coin} ${c.name}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.status || c.status === s.status)
      }
      cols={cols}
      rows={FUTURES_COINS}
    />
  )
}

/* ------------------------ B-07 合约币对配置 ------------------------- */
/** 梯度保证金 Modal — 功能点 F-38。 */
function MarginTierModal({ pair, onClose }: { pair: AdminPair | null; onClose: () => void }) {
  return (
    <Modal
      open={!!pair} onClose={onClose}
      title={pair ? `梯度保证金 · ${pair.symbol}` : ''}
      width="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs text-faint">功能点 F-38 · 阶梯维持保证金率制度</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>关闭</Button>
            <Button onClick={onClose}>保存梯度</Button>
          </div>
        </div>
      }
    >
      <p className="text-xs text-muted leading-relaxed mb-3">
        持仓名义价值越大，起始保证金率（IMR）与维持保证金率（MMR）越高，可选最高杠杆越低。
        强平引擎按当前档位的 MMR 计算保证金率，跌破即触发 <span className="text-down">逐级部分平仓（F-39）</span>。
      </p>

      <Table<(typeof MARGIN_TIERS)[number]>
        dense
        rows={MARGIN_TIERS}
        cols={[
          {
            key: 'tier', header: '档位',
            cell: t => <Badge tone={t.tier <= 2 ? 'up' : t.tier <= 5 ? 'warn' : 'down'}>第 {t.tier} 档</Badge>,
          },
          {
            key: 'range', header: '仓位区间（名义价值 USDT）', align: 'right',
            cell: t => <span className="tnum">{compact(t.from)} – {compact(t.to)}</span>,
          },
          { key: 'imr', header: '起始保证金率 IMR', align: 'right', cell: t => <span className="tnum">{(t.imr * 100).toFixed(2)}%</span> },
          { key: 'mmr', header: '维持保证金率 MMR', align: 'right', cell: t => <span className="tnum text-warn">{(t.mmr * 100).toFixed(2)}%</span> },
          {
            key: 'lev', header: '最高杠杆', align: 'right',
            cell: t => <span className="tnum font-semibold text-brand">{t.maxLev}×</span>,
          },
        ]}
      />

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <Input label="资金费率上限" type="number" defaultValue="0.75" suffix="%" />
        <Input label="强平手续费率" type="number" defaultValue="0.5" suffix="%" />
      </div>
      <p className="text-2xs text-faint mt-3 leading-relaxed">
        强平后头寸盈余计入 <span className="text-brand">保险基金（F-41）</span>；保险基金不足以覆盖穿仓损失时，
        启动自动减仓 ADL 分摊机制（F-42）。
      </p>
    </Modal>
  )
}

export function FuturesPairs() {
  const [tierPair, setTierPair] = useState<AdminPair | null>(null)

  const cols: Col<AdminPair>[] = [
    {
      key: 'sym', header: '合约',
      cell: p => (
        <div className="flex items-center gap-2.5">
          <CoinIcon coin={p.symbol.slice(0, 3)} />
          <div>
            <div className="text-sm font-medium">{p.symbol}</div>
            <div className="text-2xs text-faint">正向 USDT 保证金 · {p.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'lev', header: '最大杠杆', align: 'right',
      cell: p => (
        <span className={cn('tnum font-bold', p.maxLeverage >= 100 ? 'text-brand' : p.maxLeverage >= 50 ? 'text-warn' : 'text-ink')}>
          {p.maxLeverage}×
        </span>
      ),
    },
    { key: 'mk', header: 'Maker', align: 'right', cell: p => <span className="tnum">{(p.makerFee * 100).toFixed(3)}%</span> },
    { key: 'tk', header: 'Taker', align: 'right', cell: p => <span className="tnum">{(p.takerFee * 100).toFixed(3)}%</span> },
    { key: 'tick', header: '最小变动价位', align: 'right', hideBelow: 'md', cell: p => <Mono className="text-muted">{p.tickSize}</Mono> },
    { key: 'fund', header: '资金费率上限', align: 'right', hideBelow: 'md', cell: () => <span className="tnum text-muted">±0.750%</span> },
    { key: 'st', header: '状态', align: 'center', cell: p => <StatusBadge s={p.status} /> },
    {
      key: 'op', header: '操作', align: 'right',
      cell: p => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => setTierPair(p)}>
            <Layers className="w-3.5 h-3.5" />梯度保证金
          </Button>
          <Button size="sm" variant="ghost" className="text-brand">编辑</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage<AdminPair>
        title="合约币对配置"
        sub="B-07 · 永续合约参数 — 最大杠杆 125×，每个币对可独立配置梯度保证金（F-38）"
        stats={[
          { label: '永续合约', value: FUTURES_PAIRS.length },
          { label: '最高杠杆', value: `${Math.max(...FUTURES_PAIRS.map(p => p.maxLeverage))}×`, hint: 'BTC 永续' },
          { label: '梯度档位', value: MARGIN_TIERS.length, hint: 'F-38' },
          { label: '未平仓合约', value: usd(KPI.openInterest) },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索合约', width: 'w-52' },
          { type: 'select', key: 'lev', label: '全部杠杆', options: ['≥100×', '50–99×', '<50×'] },
        ]}
        match={(p, s) =>
          (!s.q || p.symbol.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.lev ||
            (s.lev === '≥100×' && p.maxLeverage >= 100) ||
            (s.lev === '50–99×' && p.maxLeverage >= 50 && p.maxLeverage < 100) ||
            (s.lev === '<50×' && p.maxLeverage < 50))
        }
        cols={cols}
        rows={FUTURES_PAIRS}
      />

      <MarginTierModal pair={tierPair} onClose={() => setTierPair(null)} />
    </>
  )
}

/* ==================================================================== *
 * 5. 手续费管理 (B-08 / B-09 / B-10)
 * ==================================================================== */

type VipTier = {
  level: string; volume30d: number; holding: number
  spotMaker: number; spotTaker: number; futMaker: number; futTaker: number
}

const VIP_TIERS: VipTier[] = [
  { level: 'VIP 0', volume30d: 0,           holding: 0,      spotMaker: 0.100, spotTaker: 0.100, futMaker: 0.020, futTaker: 0.050 },
  { level: 'VIP 1', volume30d: 1_000_000,   holding: 50,     spotMaker: 0.090, spotTaker: 0.095, futMaker: 0.018, futTaker: 0.045 },
  { level: 'VIP 2', volume30d: 5_000_000,   holding: 200,    spotMaker: 0.080, spotTaker: 0.090, futMaker: 0.016, futTaker: 0.042 },
  { level: 'VIP 3', volume30d: 20_000_000,  holding: 1_000,  spotMaker: 0.070, spotTaker: 0.085, futMaker: 0.014, futTaker: 0.040 },
  { level: 'VIP 4', volume30d: 80_000_000,  holding: 5_000,  spotMaker: 0.050, spotTaker: 0.075, futMaker: 0.010, futTaker: 0.035 },
  { level: 'VIP 5', volume30d: 200_000_000, holding: 20_000, spotMaker: 0.020, spotTaker: 0.060, futMaker: 0.000, futTaker: 0.030 },
]

/* --------------------------- B-08 费率设置 -------------------------- */
export function FeeRates() {
  return (
    <div>
      <ConfigPage
        title="费率设置"
        sub="B-08 · 默认费率与 VIP 等级费率 — 用户等级按 30 日成交额与平台币持仓量取高者判定"
        sections={[
          {
            title: '默认费率（VIP 0 基准）',
            desc: '新用户与未达标用户适用；单个币对可在币对配置中覆盖',
            fields: [
              { type: 'number', key: 'spotMaker', label: '现货 Maker 费率', value: 0.1, suffix: '%', hint: '挂单方，提供流动性' },
              { type: 'number', key: 'spotTaker', label: '现货 Taker 费率', value: 0.1, suffix: '%', hint: '吃单方，消耗流动性' },
              { type: 'number', key: 'futMaker', label: '合约 Maker 费率', value: 0.02, suffix: '%' },
              { type: 'number', key: 'futTaker', label: '合约 Taker 费率', value: 0.05, suffix: '%' },
            ],
          },
          {
            title: '等级判定与结算',
            fields: [
              { type: 'select', key: 'basis', label: '等级判定依据', value: '30 日成交额与持仓量取高', options: ['30 日成交额与持仓量取高', '仅 30 日成交额', '仅平台币持仓量'] },
              { type: 'select', key: 'cycle', label: '等级刷新周期', value: '每日 00:00 (UTC+8)', options: ['每日 00:00 (UTC+8)', '每周一 00:00', '每月 1 日 00:00'] },
              { type: 'toggle', key: 'negMaker', label: '允许负 Maker 费率', value: false, hint: 'VIP 5 挂单返还手续费，需财务确认成本' },
              { type: 'toggle', key: 'brokerOverride', label: '经纪人费率可覆盖 VIP 费率', value: true, hint: '影响 F-43 / F-44 返佣基数' },
            ],
          },
        ]}
      />

      <div className="max-w-3xl mt-4">
        <Card>
          <CardHeader
            title="VIP 等级费率表"
            sub="VIP 0 – VIP 5 · 现货与合约"
            right={<Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出</Button>}
          />
          <Table<VipTier>
            dense
            rows={VIP_TIERS}
            cols={[
              {
                key: 'lv', header: '等级',
                cell: t => <Badge tone={t.level === 'VIP 5' ? 'brand' : 'muted'}>{t.level}</Badge>,
              },
              { key: 'vol', header: '30 日成交额 ≥', align: 'right', cell: t => <span className="tnum text-muted">{compact(t.volume30d)}</span> },
              { key: 'hold', header: '持仓量 ≥', align: 'right', hideBelow: 'sm', cell: t => <span className="tnum text-muted">{num(t.holding, 0)} PLT</span> },
              { key: 'sm', header: '现货 Maker', align: 'right', cell: t => <span className="tnum">{t.spotMaker.toFixed(3)}%</span> },
              { key: 'st', header: '现货 Taker', align: 'right', cell: t => <span className="tnum">{t.spotTaker.toFixed(3)}%</span> },
              {
                key: 'fm', header: '合约 Maker', align: 'right',
                cell: t => (
                  <span className={cn('tnum', t.futMaker === 0 && 'text-up font-medium')}>
                    {t.futMaker.toFixed(3)}%
                  </span>
                ),
              },
              { key: 'ft', header: '合约 Taker', align: 'right', cell: t => <span className="tnum">{t.futTaker.toFixed(3)}%</span> },
            ]}
          />
          <div className="px-4 py-3 border-t border-line">
            <p className="text-2xs text-muted leading-relaxed">
              费率调整需提前 7 日发布公告（见 客服运营 → 公告管理）。手续费收入实时计入
              <Link to="/admin/finance/pnl" className="text-brand hover:underline"> 利润表 </Link>
              「交易手续费」科目。
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* -------------------------- B-09 手续费折扣 ------------------------- */
type FeeDiscountRow = {
  id: string; name: string; tiers: string; rate: number
  start: string; end: string; users: number; status: '启用' | '未开始' | '已结束' | '停用'
}

const FEE_DISCOUNTS: FeeDiscountRow[] = [
  { id: 'FD1', name: '新用户 30 天手续费 8 折',    tiers: 'VIP 0 – VIP 1', rate: 0.80, start: '2026-07-01', end: '2026-07-31', users: 4_218, status: '启用' },
  { id: 'FD2', name: '合约交易大赛 · Maker 5 折',   tiers: '全部等级',      rate: 0.50, start: '2026-07-12', end: '2026-07-26', users: 1_842, status: '启用' },
  { id: 'FD3', name: '平台币抵扣叠加 9 折',         tiers: 'VIP 2 – VIP 5', rate: 0.90, start: '2026-06-01', end: '2026-12-31', users: 882,   status: '启用' },
  { id: 'FD4', name: 'SUI 永续上线周 · 免 Maker',   tiers: '全部等级',      rate: 0.00, start: '2026-07-15', end: '2026-07-22', users: 0,     status: '未开始' },
  { id: 'FD5', name: '做市商专项费率',              tiers: '定向白名单',    rate: 0.20, start: '2026-05-01', end: '2027-05-01', users: 12,    status: '启用' },
  { id: 'FD6', name: '618 现货手续费 7 折',         tiers: '全部等级',      rate: 0.70, start: '2026-06-14', end: '2026-06-20', users: 12_408, status: '已结束' },
  { id: 'FD7', name: '邀请返佣叠加折扣',            tiers: 'VIP 1 – VIP 3', rate: 0.85, start: '2026-04-01', end: '2026-06-30', users: 3_120, status: '已结束' },
  { id: 'FD8', name: 'API 高频用户折扣',            tiers: '定向白名单',    rate: 0.60, start: '2026-03-01', end: '2026-09-01', users: 46,    status: '停用' },
  { id: 'FD9', name: '韩国区市场推广 9 折',         tiers: '全部等级',      rate: 0.90, start: '2026-08-01', end: '2026-08-31', users: 0,     status: '未开始' },
  { id: 'FD10', name: '老用户回归 7 折',            tiers: 'VIP 0 – VIP 2', rate: 0.70, start: '2026-07-05', end: '2026-08-05', users: 2_204, status: '启用' },
]

export function FeeDiscount() {
  const cols: Col<FeeDiscountRow>[] = [
    {
      key: 'name', header: '活动名',
      cell: d => (
        <div>
          <div className="text-sm font-medium">{d.name}</div>
          <div className="text-2xs text-faint tnum">{d.id} · 覆盖 {num(d.users, 0)} 人</div>
        </div>
      ),
    },
    { key: 'tiers', header: '适用等级', cell: d => <Badge tone="info">{d.tiers}</Badge> },
    {
      key: 'rate', header: '折扣率', align: 'right',
      cell: d => (
        <span className={cn('tnum font-semibold', d.rate === 0 ? 'text-up' : 'text-brand')}>
          {d.rate === 0 ? '免手续费' : `${(d.rate * 10).toFixed(1)} 折`}
        </span>
      ),
    },
    { key: 'start', header: '生效时间', align: 'right', cell: d => <span className="tnum text-muted">{d.start}</span> },
    { key: 'end', header: '结束时间', align: 'right', cell: d => <span className="tnum text-muted">{d.end}</span> },
    { key: 'st', header: '状态', align: 'center', cell: d => <StatusBadge s={d.status} /> },
    {
      key: 'op', header: '操作', align: 'right',
      cell: d => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" className="text-brand">编辑</Button>
          <Button size="sm" variant="ghost">{d.status === '启用' ? '停用' : '启用'}</Button>
        </div>
      ),
    },
  ]

  return (
    <ListPage<FeeDiscountRow>
      title="手续费折扣"
      sub="B-09 · 折扣活动叠加规则：VIP 费率 × 活动折扣 × 平台币抵扣，最低不低于 Taker 成本价"
      stats={[
        { label: '折扣活动', value: FEE_DISCOUNTS.length },
        { label: '进行中', value: FEE_DISCOUNTS.filter(d => d.status === '启用').length },
        { label: '覆盖用户', value: num(FEE_DISCOUNTS.filter(d => d.status === '启用').reduce((s, d) => s + d.users, 0), 0) },
        { label: '本月折让成本', value: usd(128_442.18), hint: '计入利润表' },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '搜索活动名', width: 'w-56' },
        { type: 'select', key: 'status', label: '全部状态', options: ['启用', '未开始', '已结束', '停用'] },
      ]}
      match={(d, s) =>
        (!s.q || d.name.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.status || d.status === s.status)
      }
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
          <Button size="sm"><Plus className="w-3.5 h-3.5" />新增活动</Button>
        </div>
      }
      cols={cols}
      rows={FEE_DISCOUNTS}
    />
  )
}

/* ---------------------- B-10 平台币抵扣手续费 ----------------------- */
export function PlatformToken() {
  return (
    <ConfigPage
      fnId="B-10"
      title="平台币抵扣手续费"
      sub="B-10 · 本页隐含平台需发行自有平台币（PLT）— 涉及代币合约、发行分配、做市与合规，属独立子系统"
      sections={[
        {
          title: '抵扣开关',
          desc: '用户可在个人中心选择使用平台币抵扣交易手续费',
          fields: [
            { type: 'toggle', key: 'enabled', label: '是否开启抵扣', value: true, hint: '关闭后所有用户手续费按原费率结算' },
            { type: 'select', key: 'scope', label: '适用交易类型', value: '现货 + 合约', options: ['现货 + 合约', '仅现货', '仅合约'] },
            { type: 'toggle', key: 'autoBuy', label: '余额不足时自动买入', value: false, hint: '需接入平台币交易对，且用户授权' },
          ],
        },
        {
          title: '抵扣参数',
          fields: [
            { type: 'number', key: 'discount', label: '抵扣比例', value: 25, suffix: '%', hint: '使用平台币抵扣时，手续费享 25% 折扣' },
            { type: 'select', key: 'coin', label: '抵扣币种', value: 'PLT', options: ['PLT', 'USDT', 'BNB'], hint: '⚠️ PLT = 平台自有币，尚未发行' },
            { type: 'number', key: 'rate', label: '兑换比率 (1 PLT = ? USDT)', value: 4.82, suffix: 'USDT', hint: '低于市价 3% 时自动暂停抵扣' },
            { type: 'select', key: 'priceSrc', label: '兑换价来源', value: '平台内盘均价', options: ['平台内盘均价', '固定价格', '外部指数'] },
            { type: 'number', key: 'dailyCap', label: '单用户日抵扣上限', value: 500, suffix: 'USDT' },
          ],
        },
        {
          title: '销毁与回购',
          desc: '抵扣消耗的平台币处理方式 — 影响代币经济模型，须与甲方确认',
          fields: [
            { type: 'select', key: 'burn', label: '抵扣后处理', value: '直接销毁', options: ['直接销毁', '回流手续费账户', '注入保险基金'] },
            { type: 'toggle', key: 'burnPub', label: '公开销毁记录', value: true, hint: '在公告页展示每季度销毁量' },
          ],
        },
      ]}
    />
  )
}

/* ==================================================================== *
 * 6. 充币提币 (B-11 … B-14)
 * ==================================================================== */

/* --------------------------- B-11 充币明细 -------------------------- */
export function Deposits() {
  const cols: Col<WalletTx>[] = [
    { key: 'id', header: '订单号', cell: d => <Mono>{d.id}</Mono> },
    { key: 'ts', header: '时间', hideBelow: 'md', cell: d => <span className="text-2xs text-muted tnum">{d.ts}</span> },
    { key: 'uid', header: 'UID', cell: d => <span className="tnum text-muted">{d.uid}</span> },
    {
      key: 'coin', header: '币种',
      cell: d => (
        <div className="flex items-center gap-1.5">
          <CoinIcon coin={d.coin} size="sm" />
          <span className="text-xs font-medium">{d.coin}</span>
        </div>
      ),
    },
    { key: 'chain', header: '链', cell: d => <Badge tone="info">{d.chain}</Badge> },
    {
      key: 'amt', header: '数量', align: 'right',
      cell: d => <span className="tnum font-medium text-up">+{num(d.amount, d.coin === 'USDT' ? 2 : 6)}</span>,
    },
    {
      key: 'cfm', header: '确认数', align: 'right',
      cell: d => {
        const [a, b] = d.confirms.split('/').map(Number)
        const done = a >= b
        return (
          <span className={cn('tnum text-2xs', done ? 'text-up' : 'text-warn')}>{d.confirms}</span>
        )
      },
    },
    { key: 'addr', header: '地址', hideBelow: 'lg', cell: d => <Mono className="text-muted">{shortAddr(d.addr)}</Mono> },
    { key: 'txid', header: 'TxID', hideBelow: 'lg', cell: d => <Mono className="text-info">{shortAddr(d.txid, 10, 6)}</Mono> },
    { key: 'st', header: '状态', align: 'center', cell: d => <StatusBadge s={d.status} /> },
  ]

  return (
    <ListPage<WalletTx>
      title="充币明细"
      sub="B-11 · 链上充值到账明细 — 由「充值链上扫描」定时任务每 10 秒扫描一次（当前该任务失败，见系统健康）"
      stats={[
        { label: '充值笔数', value: DEPOSITS.length },
        { label: '处理中', value: DEPOSITS.filter(d => d.status === '处理中').length, hint: '等待确认数' },
        {
          label: 'USDT 充值合计',
          value: usd(DEPOSITS.filter(d => d.coin === 'USDT').reduce((s, d) => s + d.amount, 0)),
        },
        { label: '失败', value: DEPOSITS.filter(d => d.status === '失败').length },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '订单号 / UID / TxID', width: 'w-56' },
        { type: 'select', key: 'coin', label: '全部币种', options: ['USDT', 'BTC', 'ETH', 'SOL'] },
        { type: 'select', key: 'status', label: '全部状态', options: ['处理中', '已完成', '失败'] },
        { type: 'date', key: 'date' },
      ]}
      match={(d, s) =>
        (!s.q || `${d.id} ${d.uid} ${d.txid}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.coin || d.coin === s.coin) &&
        (!s.status || d.status === s.status) &&
        (!s.date || d.ts.startsWith(s.date))
      }
      cols={cols}
      rows={DEPOSITS}
    />
  )
}

/* --------------------------- B-12 提币明细 -------------------------- */
const KYC_TONE: Record<string, 'up' | 'warn' | 'down' | 'muted'> = {
  已认证: 'up', 待审核: 'warn', 已驳回: 'down', 未认证: 'muted',
}

function RiskGauge({ score }: { score: number }) {
  const tone = score >= 70 ? 'bg-down' : score >= 40 ? 'bg-warn' : 'bg-up'
  const text = score >= 70 ? 'text-down' : score >= 40 ? 'text-warn' : 'text-up'
  const label = score >= 70 ? '高风险 · 建议人工复核' : score >= 40 ? '中风险 · 需核对地址' : '低风险'
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-muted">风控评分</span>
        <span className={cn('text-lg font-semibold tnum', text)}>{score}<span className="text-xs text-faint"> / 100</span></span>
      </div>
      <div className="h-2 rounded-full bg-elevated overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <div className="flex justify-between mt-1 text-2xs text-faint tnum">
        <span>0</span><span className={text}>{label}</span><span>100</span>
      </div>
    </div>
  )
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-line/60">
      <span className="text-xs text-muted shrink-0">{k}</span>
      <span className="text-xs text-right min-w-0">{v}</span>
    </div>
  )
}

export function Withdrawals() {
  const DAILY_QUOTA = 200_000

  return (
    <ReviewQueue<WalletTx>
      title="提币明细 / 提币审核"
      sub="B-12 · 待审核提币逐笔人工复核 — 风控评分 ≥ 70 强制双人复核（F-47 自动风控策略 + 人工审核）"
      items={WITHDRAWALS}
      pending={w => w.status === '待审核'}
      renderRow={(w, selected) => (
        <div className="flex items-start gap-2.5">
          <CoinIcon coin={w.coin} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-medium tnum', selected && 'text-brand')}>
                {num(w.amount, w.coin === 'USDT' ? 2 : 6)} {w.coin}
              </span>
              <span
                className={cn(
                  'ml-auto text-2xs tnum font-semibold shrink-0',
                  w.riskScore >= 70 ? 'text-down' : w.riskScore >= 40 ? 'text-warn' : 'text-up',
                )}
              >
                {w.riskScore}
              </span>
            </div>
            <div className="text-2xs text-faint tnum mt-0.5">UID {w.uid} · {w.chain} · {w.ts.slice(5, 16)}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {w.riskFlags.map(f => <Badge key={f} tone="down">{f}</Badge>)}
              {w.riskFlags.length === 0 && <Badge tone="muted">无风险标记</Badge>}
              {w.status !== '待审核' && <StatusBadge s={w.status} />}
            </div>
          </div>
        </div>
      )}
      renderDetail={w => {
        const user = ADMIN_USERS.find(u => u.uid === w.uid)
        const used24h = WITHDRAWALS
          .filter(x => x.uid === w.uid && x.status === '已完成' && x.coin === 'USDT')
          .reduce((s, x) => s + x.amount, 0)
        const net = w.amount - w.fee

        return (
          <div className="space-y-4">
            {/* header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <CoinIcon coin={w.coin} />
                <div>
                  <div className="text-lg font-semibold tnum">
                    {num(w.amount, w.coin === 'USDT' ? 2 : 6)} <span className="text-sm text-muted">{w.coin}</span>
                  </div>
                  <div className="text-2xs text-faint tnum">{w.id} · 提交于 {w.ts}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge s={w.status} />
                <Badge tone={KYC_TONE[user?.kyc ?? '未认证']}>KYC {user?.kyc ?? '未认证'}</Badge>
                <Badge tone="brand">VIP {user?.vip ?? 0}</Badge>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* left: tx info */}
              <div>
                <div className="text-xs font-semibold mb-2">提币信息</div>
                <KV k="提币地址" v={<Mono className="text-ink break-all">{shortAddr(w.addr, 12, 10)}</Mono>} />
                <KV k="链 / 网络" v={<Badge tone="info">{w.chain}</Badge>} />
                <KV k="提币数量" v={<span className="tnum">{num(w.amount, w.coin === 'USDT' ? 2 : 6)} {w.coin}</span>} />
                <KV k="手续费" v={<span className="tnum text-warn">-{num(w.fee, w.coin === 'USDT' ? 2 : 6)} {w.coin}</span>} />
                <KV k="实际到账" v={<span className="tnum font-semibold text-up">{num(net, w.coin === 'USDT' ? 2 : 6)} {w.coin}</span>} />
                <KV k="TxID" v={w.status === '已完成' ? <Mono className="text-info">{shortAddr(w.txid, 10, 8)}</Mono> : <span className="text-faint">待广播</span>} />
              </div>

              {/* right: user + risk */}
              <div>
                <div className="text-xs font-semibold mb-2">用户与额度</div>
                <KV k="UID" v={<span className="tnum">{w.uid}</span>} />
                <KV k="注册国家" v={user?.country ?? '—'} />
                <KV k="账户状态" v={<StatusBadge s={user?.status ?? '正常'} />} />
                <KV k="账户总资产" v={<span className="tnum">{usd(user?.assets ?? 0)}</span>} />
                <div className="pt-2.5">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-muted">24h 已提现额度</span>
                    <span className="text-xs tnum">
                      {compact(used24h)} <span className="text-faint">/ {compact(DAILY_QUOTA)} USDT</span>
                    </span>
                  </div>
                  <Progress
                    v={used24h / DAILY_QUOTA}
                    tone={used24h / DAILY_QUOTA > 0.8 ? 'down' : used24h / DAILY_QUOTA > 0.5 ? 'warn' : 'up'}
                    showPct={false}
                  />
                </div>
              </div>
            </div>

            {/* risk panel */}
            <Card className="p-4">
              <RiskGauge score={w.riskScore} />
              <div className="mt-3">
                <div className="text-xs text-muted mb-1.5">命中风险标记</div>
                <div className="flex flex-wrap gap-1.5">
                  {['大额提现', '新地址', '首次提现', '24h 内多笔'].map(f => (
                    <Badge key={f} tone={w.riskFlags.includes(f) ? 'down' : 'muted'}>
                      {w.riskFlags.includes(f) ? '● ' : '○ '}{f}
                    </Badge>
                  ))}
                </div>
              </div>
              {w.riskScore >= 70 && (
                <div className="mt-3">
                  <DangerNote title="高风险提币 — 需双人复核">
                    风控评分 {w.riskScore} ≥ 70，已触发「大额提现」风控规则（见 风控安全 → 风控警报器 A-1）。
                    通过前请电话回访用户并核对提币地址归属。
                  </DangerNote>
                </div>
              )}
            </Card>

            <p className="text-2xs text-faint leading-relaxed">
              审核通过后由热钱包签名广播上链 —— 钱包服务属第三方托管（合同 Article I 已排除 wallet services），
              本系统仅负责风控判定、审批流与账本扣减。
            </p>
          </div>
        )
      }}
      approveLabel="通过并放币"
      rejectLabel="驳回"
    />
  )
}

/* ------------------------- B-13 提币免审配置 ------------------------ */
export function NoAudit() {
  return (
    <ConfigPage
      title="提币免审配置"
      sub="B-13 · 满足全部条件的提币单自动放行，不进入人工审核队列；任一条件不满足即转人工"
      sections={[
        {
          title: '免审额度',
          desc: '按 USDT 等值计算，跨币种合并统计',
          fields: [
            { type: 'toggle', key: 'enabled', label: '开启提币免审', value: true, hint: '关闭后全部提币需人工审核' },
            { type: 'number', key: 'single', label: '单笔免审额度阈值', value: 2000, suffix: 'USDT', hint: '单笔 ≤ 此金额方可免审' },
            { type: 'number', key: 'daily', label: '24h 免审总额上限', value: 10000, suffix: 'USDT', hint: '同一 UID 24h 内免审累计上限' },
            { type: 'number', key: 'count', label: '24h 免审笔数上限', value: 5, suffix: '笔' },
          ],
        },
        {
          title: '免审前置条件',
          fields: [
            { type: 'select', key: 'kycLevel', label: '免审 KYC 等级要求', value: 'Level 2（含人脸）', options: ['无要求', 'Level 1（证件）', 'Level 2（含人脸）', 'Level 3（含地址证明）'] },
            { type: 'toggle', key: 'whitelist', label: '仅白名单地址可免审', value: true, hint: '地址需已完成 24h 冷却期' },
            { type: 'number', key: 'cooldown', label: '新地址冷却期', value: 24, suffix: '小时', hint: '新增提币地址后需等待，期间不可免审' },
            { type: 'number', key: 'riskCap', label: '风控评分上限', value: 40, suffix: '分', hint: '评分高于此值强制人工审核' },
            { type: 'toggle', key: 'accountAge', label: '要求账户注册满 7 天', value: true },
            { type: 'toggle', key: 'no2faChange', label: '要求 48h 内未修改安全设置', value: true, hint: '防止盗号后立即提币' },
          ],
        },
      ]}
    />
  )
}

/* ------------------------- B-14 提币说明设置 ------------------------ */
export function WithdrawNotes() {
  return (
    <ConfigPage
      title="提币说明设置"
      sub="B-14 · 提币页面文案与风险提示 — 四语言（中/英/日/韩），日韩文案由甲方提供（F-09）"
      sections={[
        {
          title: '提币说明文案',
          desc: '展示于提币表单上方，支持换行；变量：{coin} {minAmount} {fee} {confirms}',
          fields: [
            {
              type: 'textarea', key: 'zh', label: '简体中文',
              value: '最小提币数量为 {minAmount} {coin}，手续费 {fee} {coin}。\n提币申请提交后将进入风控审核，通常 30 分钟内完成；大额提币需人工复核，最长 24 小时。\n请务必核对提币地址与所选主网一致，转错网络将导致资产永久丢失。',
            },
            {
              type: 'textarea', key: 'en', label: 'English',
              value: 'Minimum withdrawal: {minAmount} {coin}. Network fee: {fee} {coin}.\nWithdrawals are reviewed by our risk engine and usually complete within 30 minutes. Large withdrawals require manual review (up to 24h).\nEnsure the address matches the selected network — sending to the wrong network results in permanent loss.',
            },
            {
              type: 'textarea', key: 'ja', label: '日本語', value: '（甲方提供 / To be provided by client）',
              hint: '日文文案待甲方提供',
            },
            {
              type: 'textarea', key: 'ko', label: '한국어', value: '（甲方提供 / To be provided by client）',
              hint: '韩文文案待甲方提供',
            },
          ],
        },
        {
          title: '风险提示文案',
          desc: '提币确认弹窗中以高亮样式展示，用户须勾选确认',
          fields: [
            {
              type: 'textarea', key: 'riskZh', label: '风险提示（中）',
              value: '平台不会以任何理由要求您向陌生地址转账。若您正在被他人指导操作提币，请立即停止 —— 这极可能是诈骗。\n提币一经上链不可撤销、不可追回。',
            },
            {
              type: 'textarea', key: 'riskEn', label: '风险提示（EN）',
              value: 'We will never ask you to transfer funds to an unknown address. If someone is instructing you to withdraw, stop now — this is almost certainly a scam.\nOn-chain transfers are irreversible.',
            },
            { type: 'toggle', key: 'forceAck', label: '强制勾选确认', value: true, hint: '未勾选不可提交提币申请' },
          ],
        },
      ]}
    />
  )
}

/* ==================================================================== *
 * 7. 财务管理 — 财务报表 (B-15 / B-16 / B-17)
 * ==================================================================== */

const AS_OF = '2026-07-13'

/* ------------------------- B-15 资产负债表 -------------------------- */
const BS_ASSETS = [
  { label: '用户托管数字资产 — 热钱包',   value: 3_284_118.42, hint: '可即时提取，约 5% 总量' },
  { label: '用户托管数字资产 — 冷钱包',   value: 62_418_220.00, hint: '多签冷存储，第三方托管' },
  { label: '平台自有资产',               value: 8_412_882.10, hint: '手续费收入积累' },
  { label: '保险基金',                   value: 1_284_421.88, hint: 'F-41 穿仓兜底专项' },
  { label: '应收手续费（未结算）',        value: 182_442.30, hint: 'T+1 结算' },
]
const BS_LIAB = [
  { label: '用户存款负债',               value: 65_702_338.42, hint: '= 热钱包 + 冷钱包托管资产' },
  { label: '应付返佣',                   value: 428_182.44, hint: '经纪人未结算佣金 F-43/F-44' },
  { label: '应付提现（处理中）',          value: 1_182_400.00, hint: '已审核未上链' },
  { label: '其他应付款',                 value: 84_220.16 },
]
const BS_EQUITY = [
  { label: '实收资本',                   value: 5_000_000.00 },
  { label: '保险基金储备',               value: 1_000_000.00 },
  { label: '留存收益',                   value: 2_184_943.68 },
]

export function BalanceSheet() {
  const totalAssets = BS_ASSETS.reduce((s, r) => s + r.value, 0)
  const totalLiab = BS_LIAB.reduce((s, r) => s + r.value, 0)
  const totalEquity = BS_EQUITY.reduce((s, r) => s + r.value, 0)
  const totalLE = totalLiab + totalEquity
  const balanced = Math.abs(totalAssets - totalLE) < 0.01

  return (
    <div className="space-y-4">
      <ConflictNote id="B-15" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">资产负债表</h1>
          <p className="text-xs text-muted mt-0.5">
            B-15 · 截至 {AS_OF} · 单位 USDT（多币种按当日指数价折算）· 权责发生制
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="h-9"
            options={[
              { value: '2026-07', label: '2026 年 7 月' },
              { value: '2026-06', label: '2026 年 6 月' },
              { value: '2026-05', label: '2026 年 5 月' },
            ]}
            defaultValue="2026-07"
          />
          <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="资产总计" value={usd(totalAssets)} hint="Total Assets" />
        <Stat label="负债合计" value={usd(totalLiab)} hint="Total Liabilities" />
        <Stat label="所有者权益" value={usd(totalEquity)} hint="Owner's Equity" />
        <Stat
          label="资产负债率"
          value={`${((totalLiab / totalAssets) * 100).toFixed(2)}%`}
          hint="负债 / 资产"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* ---- 资产 ---- */}
        <Card className="overflow-hidden">
          <CardHeader
            title="资产"
            sub="Assets"
            right={<span className="text-xs font-semibold tnum">{num(totalAssets)}</span>}
          />
          <AcctTable rows={BS_ASSETS} total={totalAssets} totalLabel="资产总计" />
        </Card>

        {/* ---- 负债与权益 ---- */}
        <Card className="overflow-hidden">
          <CardHeader
            title="负债与所有者权益"
            sub="Liabilities & Equity"
            right={<span className="text-xs font-semibold tnum">{num(totalLE)}</span>}
          />
          <div className="px-4 py-2 bg-elevated/40 border-b border-line text-2xs font-semibold text-muted">负债</div>
          <AcctTable rows={BS_LIAB} total={totalLiab} totalLabel="负债合计" />
          <div className="px-4 py-2 bg-elevated/40 border-y border-line text-2xs font-semibold text-muted">所有者权益</div>
          <AcctTable rows={BS_EQUITY} total={totalEquity} totalLabel="所有者权益合计" />
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-line bg-elevated/60">
            <span className="text-xs font-semibold">负债与所有者权益总计</span>
            <span className="text-sm font-semibold tnum">{num(totalLE)}</span>
          </div>
        </Card>
      </div>

      <Card className={cn(balanced ? 'border-up/30 bg-up/5' : 'border-down/30 bg-down/5')}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className={cn('w-2 h-2 rounded-full shrink-0', balanced ? 'bg-up' : 'bg-down')} />
          <span className={cn('text-xs font-semibold', balanced ? 'text-up' : 'text-down')}>
            {balanced ? '试算平衡 ✓' : '试算不平 ✗'}
          </span>
          <span className="text-xs text-muted tnum">
            资产 {num(totalAssets)} = 负债 {num(totalLiab)} + 所有者权益 {num(totalEquity)}
          </span>
          <span className="text-2xs text-faint tnum ml-auto">
            差额 {num(totalAssets - totalLE, 2)}
          </span>
        </div>
      </Card>

      <InfoNote>
        用户托管资产同时列示于资产端（受托保管）与负债端（对用户的返还义务），二者必须恒等 ——
        差异即为账实不符，由 <Link to="/admin/finance/recon-tool" className="text-brand hover:underline">平账工具</Link> 逐币种核对。
        当前 ETH 存在 -0.0062 差异，尚未平账。
      </InfoNote>
    </div>
  )
}

/* -------------------------- B-16 现金流量表 ------------------------- */
const CF_OP = [
  { label: '交易手续费收入',   value: 1_284_822.44, sign: true },
  { label: '提现手续费收入',   value: 82_441.20, sign: true },
  { label: '资金费用净额',     value: 182_004.88, sign: true, hint: 'F-34 多空双方资金费差额' },
  { label: '返佣支出',         value: -418_220.10, sign: true, hint: 'F-43 / F-44 经纪人结算' },
  { label: '第三方服务费',     value: -64_180.00, sign: true, hint: 'KYC / 行情 / 短信通道' },
]
const CF_INV = [
  { label: '购置服务器与硬件', value: -184_200.00, sign: true },
  { label: '冷钱包托管保证金', value: -500_000.00, sign: true, hint: '第三方托管服务商保证金' },
]
const CF_FIN = [
  { label: '保险基金注资',     value: 300_000.00, sign: true },
  { label: '股东分红',         value: -400_000.00, sign: true },
]

export function Cashflow() {
  const op = CF_OP.reduce((s, r) => s + r.value, 0)
  const inv = CF_INV.reduce((s, r) => s + r.value, 0)
  const fin = CF_FIN.reduce((s, r) => s + r.value, 0)
  const net = op + inv + fin

  const netFlow30d = SERIES.deposit30d.map((d, i) => d - SERIES.withdraw30d[i])

  return (
    <div className="space-y-4">
      <ConflictNote id="B-16" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">现金流量表</h1>
          <p className="text-xs text-muted mt-0.5">B-16 · 2026 年 7 月 · 单位 USDT · 间接法编制</p>
        </div>
        <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="经营活动现金流" value={usd(op)} delta={8.4} hint="核心业务造血能力" />
        <Stat label="投资活动现金流" value={usd(inv)} hint="基础设施投入" />
        <Stat label="筹资活动现金流" value={usd(fin)} hint="注资与分红" />
        <Stat label="本期净现金流" value={usd(net)} delta={net >= 0 ? 4.2 : -4.2} hint="经营 + 投资 + 筹资" />
      </div>

      <Card>
        <CardHeader
          title="净现金流趋势"
          sub="近 30 日 · 充值流入 − 提现流出（USDT）"
          right={
            <span className={cn('text-2xs tnum font-medium', netFlow30d[netFlow30d.length - 1] >= 0 ? 'text-up' : 'text-down')}>
              今日 {compact(netFlow30d[netFlow30d.length - 1])}
            </span>
          }
        />
        <div className="p-4">
          <AreaChart data={netFlow30d} tone="brand" height={180} className="w-full" />
          <div className="flex justify-between mt-2 text-2xs text-faint tnum">
            <span>30 日前</span>
            <span>30 日累计 {compact(netFlow30d.reduce((s, v) => s + v, 0))}</span>
            <span>今日</span>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <CardHeader title="一、经营活动产生的现金流量" sub="Operating Activities" />
          <AcctTable rows={CF_OP} total={op} totalLabel="经营活动现金流量净额" />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="二、投资活动产生的现金流量" sub="Investing Activities" />
          <AcctTable rows={CF_INV} total={inv} totalLabel="投资活动现金流量净额" />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="三、筹资活动产生的现金流量" sub="Financing Activities" />
          <AcctTable rows={CF_FIN} total={fin} totalLabel="筹资活动现金流量净额" />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <span className="text-xs font-semibold">四、现金及现金等价物净增加额</span>
          <span className="text-2xs text-faint">= 经营 {num(op)} + 投资 {num(inv)} + 筹资 {num(fin)}</span>
          <span className={cn('ml-auto text-lg font-semibold tnum', net >= 0 ? 'text-up' : 'text-down')}>
            {net >= 0 ? '+' : ''}{num(net)}
          </span>
        </div>
      </Card>

      <InfoNote>
        用户充值 / 提现属受托资产变动，不计入平台现金流量表的经营活动 —— 仅在
        <Link to="/admin/finance/balance-sheet" className="text-brand hover:underline"> 资产负债表 </Link>
        的「用户存款负债」科目内对冲反映。上图的净流入用于监控挤兑与热钱包备付率。
      </InfoNote>
    </div>
  )
}

/* ---------------------------- B-17 利润表 --------------------------- */
const PL_REVENUE = [
  { label: '交易手续费',           value: 1_284_822.44, hint: '现货 + 合约 Maker/Taker' },
  { label: '提现手续费',           value: 82_441.20 },
  { label: '资金费用',             value: 182_004.88, hint: 'F-34 平台抽成部分' },
  { label: '清算收益',             value: 48_221.60, hint: '强平头寸盈余（F-41）' },
]
const PL_COST = [
  { label: '返佣支出',             value: 418_220.10, hint: '经纪人佣金 F-43/F-44' },
  { label: '保险基金补贴',         value: 62_400.00, hint: '穿仓损失兜底' },
  { label: '第三方服务费',         value: 64_180.00, hint: 'KYC / 行情 / 短信 / WAF' },
  { label: '服务器与带宽成本',     value: 128_442.18 },
  { label: '人力与运营成本',       value: 220_000.00 },
]
const MONTHLY_PROFIT = [382_118, 421_882, 398_204, 512_440, 468_220, 588_112, 704_248, 0, 0, 0, 0, 0].slice(0, 7)
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月']

export function Pnl() {
  const revenue = PL_REVENUE.reduce((s, r) => s + r.value, 0)
  const cost = PL_COST.reduce((s, r) => s + r.value, 0)
  const profit = revenue - cost
  const margin = (profit / revenue) * 100

  return (
    <div className="space-y-4">
      <ConflictNote id="B-17" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">利润表</h1>
          <p className="text-xs text-muted mt-0.5">B-17 · 2026 年 7 月 · 单位 USDT</p>
        </div>
        <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="营业收入" value={usd(revenue)} delta={9.8} hint="含手续费与资金费用" />
        <Stat label="成本费用" value={usd(cost)} delta={3.1} hint="返佣为最大单项" />
        <Stat label="净利润" value={usd(profit)} delta={18.4} hint="收入 − 成本费用" />
        <Stat label="净利率" value={`${margin.toFixed(2)}%`} hint="净利润 / 营业收入" />
      </div>

      <Card>
        <CardHeader
          title="月度净利润"
          sub="2026 年 1–7 月 · USDT"
          right={<span className="text-2xs text-up tnum">环比 +19.8%</span>}
        />
        <div className="p-4">
          <BarChart data={MONTHLY_PROFIT} labels={MONTH_LABELS} tone="up" height={190} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <CardHeader
            title="一、营业收入"
            sub="Revenue"
            right={<span className="text-xs font-semibold tnum text-up">{num(revenue)}</span>}
          />
          <AcctTable rows={PL_REVENUE} total={revenue} totalLabel="营业收入合计" />
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="二、成本费用"
            sub="Costs & Expenses"
            right={<span className="text-xs font-semibold tnum text-down">{num(cost)}</span>}
          />
          <AcctTable rows={PL_COST} total={cost} totalLabel="成本费用合计" />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <span className="text-xs font-semibold">三、净利润</span>
          <span className="text-2xs text-faint tnum">
            = 营业收入 {num(revenue)} − 成本费用 {num(cost)}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Badge tone="up">净利率 {margin.toFixed(2)}%</Badge>
            <span className="text-lg font-semibold tnum text-up">+{num(profit)}</span>
          </div>
        </div>
      </Card>

      <InfoNote>
        手续费收入按成交实时计提，返佣按 T+1 于每日 02:00 由「返佣结算」定时任务落账（见 系统配置 → 定时任务）。
        清算收益与保险基金补贴为同一资金池的双向流动，净额反映强平引擎的实际盈亏。
      </InfoNote>
    </div>
  )
}

/* ==================================================================== *
 * 8. 财务小工具 (B-18 … B-21)
 * ==================================================================== */

const ACCOUNTS = ['平台自有账户', '手续费归集账户', '保险基金账户', '返佣池账户', '用户账户 (UID)']

/* --------------------------- B-18 转账工具 -------------------------- */
export function TransferTool() {
  const [form, setForm] = useState({
    from: '平台自有账户',
    to: '用户账户 (UID)',
    uid: '81243907',
    coin: 'USDT',
    amount: '1000',
    reason: '',
    otp: '',
  })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); setDone(false) }
  const valid = !!form.amount && +form.amount > 0 && form.reason.trim().length >= 4 && form.otp.length === 6

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">转账工具</h1>
          <p className="text-xs text-muted mt-0.5">B-18 · 管理员手动划转 — 用于补偿、活动发放、账户间调拨</p>
        </div>
        {done && <span className="text-xs text-up">✓ 转账已执行</span>}
      </div>

      <DangerNote title="该操作直接写入用户账本（ledger），不可回滚">
        转账将生成一条 <Mono className="text-down">ADMIN_TRANSFER</Mono> 类型的账本流水，实时改变用户可用余额，
        并同步计入 <Link to="/admin/finance/balance-sheet" className="text-brand hover:underline">资产负债表</Link> 的用户存款负债科目。
        每笔操作强制留痕（操作人 / IP / 原因 / 二次验证），记入管理员操作日志且不可删除。
      </DangerNote>

      <Card>
        <CardHeader title="划转信息" sub="来源账户余额不足时将直接失败，不会产生负余额" />
        <div className="p-4 space-y-4">
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <Select
              label="从账户"
              value={form.from}
              onChange={e => set('from', e.target.value)}
              options={ACCOUNTS.map(a => ({ value: a, label: a }))}
            />
            <div className="hidden sm:flex items-center justify-center h-10 text-faint">
              <ArrowRight className="w-4 h-4" />
            </div>
            <Select
              label="到账户"
              value={form.to}
              onChange={e => set('to', e.target.value)}
              options={ACCOUNTS.map(a => ({ value: a, label: a }))}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="UID（目标为用户账户时必填）"
              value={form.uid}
              onChange={e => set('uid', e.target.value)}
              placeholder="81243907"
            />
            <Select
              label="币种"
              value={form.coin}
              onChange={e => set('coin', e.target.value)}
              options={COINS.map(c => ({ value: c.coin, label: c.coin }))}
            />
            <Input
              label="数量"
              type="number"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              suffix={form.coin}
            />
          </div>

          <div>
            <div className="text-xs text-muted mb-1.5">转账原因（必填，≥ 4 字，记入操作日志）</div>
            <textarea
              rows={3}
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              placeholder="如：工单 T-5003 系统故障补偿 / 交易大赛奖励发放 / 保险基金注资"
              className="w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand resize-y"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <Input
              label="二次验证码（谷歌验证器）"
              value={form.otp}
              onChange={e => set('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 位动态码"
              maxLength={6}
            />
            <div className="text-2xs text-faint leading-relaxed">
              单笔 &gt; 50,000 USDT 需财务主管二次授权（双人复核）。
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-line">
          <Button disabled={!valid} onClick={() => setConfirmOpen(true)}>
            <Wallet className="w-4 h-4" />执行转账
          </Button>
          <Button variant="ghost" onClick={() => setForm({ ...form, amount: '', reason: '', otp: '' })}>重置</Button>
          <div className="flex-1" />
          <Link to="/admin/finance/transfer-log" className="text-2xs text-brand hover:underline">查看转账记录 →</Link>
        </div>
      </Card>

      <Modal
        open={confirmOpen} onClose={() => setConfirmOpen(false)} title="确认执行转账"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
            <Button variant="danger" onClick={() => { setConfirmOpen(false); setDone(true) }}>
              确认并写入账本
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <DangerNote title="此操作不可撤销">
            请再次确认目标 UID 与数量。错误的转账只能通过反向调账修正，且会在
            <Link to="/admin/finance/adjust-log" className="text-brand hover:underline"> 调账记录 </Link>
            中永久留痕。
          </DangerNote>
          <div className="rounded-lg border border-line bg-elevated/60 p-3 space-y-1.5">
            <KV k="从账户" v={form.from} />
            <KV k="到账户" v={<span>{form.to}{form.to.includes('UID') ? ` · ${form.uid}` : ''}</span>} />
            <KV k="币种 / 数量" v={<span className="tnum font-semibold text-brand">{form.amount} {form.coin}</span>} />
            <KV k="原因" v={<span className="text-muted">{form.reason || '—'}</span>} />
            <KV k="操作人" v={<span>admin · 系统管理员</span>} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* --------------------------- B-19 转账记录 -------------------------- */
type TransferRow = {
  id: string; ts: string; operator: string; from: string; to: string
  uid: string; coin: string; amount: number; reason: string
  status: '已完成' | '处理中' | '失败'
}

const rt = seeded(88231)
const REASONS = ['交易大赛奖励发放', '系统故障补偿', '保险基金注资', '返佣池补充', '客诉赔付', '空投活动发放', '手续费归集']
const TRANSFER_LOG: TransferRow[] = Array.from({ length: 26 }, (_, i) => {
  const toUser = rt() > 0.35
  const coin = rt() > 0.3 ? 'USDT' : rt() > 0.5 ? 'BTC' : 'ETH'
  return {
    id: `TR${41_000 + i * 7}`,
    ts: fmtDateTime(Date.now() - Math.floor(rt() * 30) * 86_400_000 - Math.floor(rt() * 86_400_000)),
    operator: STAFF[Math.floor(rt() * STAFF.length)].user,
    from: toUser ? '平台自有账户' : '手续费归集账户',
    to: toUser ? '用户账户' : ACCOUNTS[Math.floor(rt() * 4)],
    uid: toUser ? ADMIN_USERS[Math.floor(rt() * ADMIN_USERS.length)].uid : '—',
    coin,
    amount: +(rt() * (coin === 'USDT' ? 20_000 : 2) + 1).toFixed(coin === 'USDT' ? 2 : 5),
    reason: REASONS[Math.floor(rt() * REASONS.length)],
    status: (i < 2 ? '处理中' : rt() > 0.06 ? '已完成' : '失败') as TransferRow['status'],
  }
})

export function TransferLog() {
  const cols: Col<TransferRow>[] = [
    { key: 'ts', header: '时间', cell: t => <span className="text-2xs text-muted tnum">{t.ts}</span> },
    {
      key: 'op', header: '操作人',
      cell: t => (
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-elevated border border-line grid place-items-center text-2xs text-muted">
            {t.operator.slice(0, 1).toUpperCase()}
          </span>
          <Mono>{t.operator}</Mono>
        </div>
      ),
    },
    { key: 'from', header: '来源', cell: t => <span className="text-xs text-muted">{t.from}</span> },
    {
      key: 'to', header: '目标',
      cell: t => (
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 text-faint" />
          <span className="text-xs">{t.to}</span>
        </div>
      ),
    },
    { key: 'uid', header: 'UID', cell: t => <span className="tnum text-muted">{t.uid}</span> },
    {
      key: 'coin', header: '币种', align: 'center',
      cell: t => (
        <div className="flex items-center justify-center gap-1.5">
          <CoinIcon coin={t.coin} size="sm" />
          <span className="text-xs">{t.coin}</span>
        </div>
      ),
    },
    {
      key: 'amt', header: '数量', align: 'right',
      cell: t => <span className="tnum font-medium">{num(t.amount, t.coin === 'USDT' ? 2 : 5)}</span>,
    },
    { key: 'reason', header: '原因', hideBelow: 'lg', cell: t => <span className="text-xs text-muted">{t.reason}</span> },
    { key: 'st', header: '状态', align: 'center', cell: t => <StatusBadge s={t.status} /> },
  ]

  return (
    <ListPage<TransferRow>
      title="转账记录"
      sub="B-19 · 管理员划转流水 — 与操作日志双向可追溯，不可删除、不可修改"
      stats={[
        { label: '转账笔数', value: TRANSFER_LOG.length, hint: '近 30 日' },
        {
          label: 'USDT 划转合计',
          value: usd(TRANSFER_LOG.filter(t => t.coin === 'USDT' && t.status === '已完成').reduce((s, t) => s + t.amount, 0)),
        },
        { label: '处理中', value: TRANSFER_LOG.filter(t => t.status === '处理中').length },
        { label: '失败', value: TRANSFER_LOG.filter(t => t.status === '失败').length, hint: '余额不足 / 账户冻结' },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '流水号 / UID / 操作人', width: 'w-56' },
        { type: 'select', key: 'operator', label: '全部操作人', options: Array.from(new Set(TRANSFER_LOG.map(t => t.operator))) },
        { type: 'select', key: 'coin', label: '全部币种', options: ['USDT', 'BTC', 'ETH'] },
        { type: 'select', key: 'status', label: '全部状态', options: ['已完成', '处理中', '失败'] },
      ]}
      match={(t, s) =>
        (!s.q || `${t.id} ${t.uid} ${t.operator}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.operator || t.operator === s.operator) &&
        (!s.coin || t.coin === s.coin) &&
        (!s.status || t.status === s.status)
      }
      cols={cols}
      rows={TRANSFER_LOG}
    />
  )
}

/* --------------------------- B-20 平账工具 -------------------------- */
export function ReconTool() {
  const [fixTarget, setFixTarget] = useState<(typeof RECON)[number] | null>(null)
  const [fixed, setFixed] = useState<Set<string>>(() => new Set())

  const rows = RECON.map(r => ({ ...r, resolved: fixed.has(r.coin) }))
  const diffCount = rows.filter(r => r.status === '差异' && !r.resolved).length
  const okCount = rows.length - diffCount

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">平账工具</h1>
          <p className="text-xs text-muted mt-0.5">
            B-20 · 账面余额（用户余额总和）vs 链上余额（热钱包 + 冷钱包）逐币种核对
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline"><RefreshCw className="w-3.5 h-3.5" />立即重新对账</Button>
          <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出对账单</Button>
        </div>
      </div>

      {/* ---- Summary banner ---- */}
      <Card className={cn(diffCount ? 'border-down/30 bg-down/5' : 'border-up/30 bg-up/5')}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <span className={cn('w-2 h-2 rounded-full shrink-0', diffCount ? 'bg-down' : 'bg-up')} />
          <div className="min-w-0">
            <div className={cn('text-sm font-semibold', diffCount ? 'text-down' : 'text-up')}>
              {okCount}/{rows.length} 币种账实相符
              {diffCount > 0 && <span>，{diffCount} 币种存在差异</span>}
            </div>
            <p className="text-2xs text-muted mt-0.5">
              最近一次对账 {AS_OF} 03:00:22 · 耗时 22.1s ·
              {diffCount > 0
                ? ' 存在差异的币种已在下表高亮，请财务复核后执行平账'
                : ' 全部币种账实相符，无需处理'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xs text-faint">账实相符</div>
              <div className="text-lg font-semibold tnum text-up">{okCount}</div>
            </div>
            <div className="text-right">
              <div className="text-2xs text-faint">存在差异</div>
              <div className={cn('text-lg font-semibold tnum', diffCount ? 'text-down' : 'text-faint')}>{diffCount}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* ---- Recon table (hand-rolled so the 差异 row can be highlighted) ---- */}
      <Card className="overflow-hidden">
        <CardHeader
          title="资产对账明细"
          sub="账面余额 − 链上合计 = 差额；差额必须为 0"
          right={<span className="text-2xs text-faint tnum">{rows.length} 个币种</span>}
        />
        <div className="w-full overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-2xs text-muted">
                {['币种', '账面余额', '热钱包', '冷钱包', '链上合计', '差额', '状态', '操作'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'font-medium px-3 py-2 border-b border-line whitespace-nowrap',
                      i === 0 ? 'text-left' : i >= 6 ? 'text-center' : 'text-right',
                      i === 7 && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const bad = r.status === '差异' && !r.resolved
                const d = coinDp(r.coin)
                return (
                  <tr
                    key={r.coin}
                    className={cn(
                      'border-b border-line/60 transition-colors',
                      bad ? 'bg-down/5 hover:bg-down/10' : 'hover:bg-elevated',
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <CoinIcon coin={r.coin} />
                        <div>
                          <div className="text-sm font-medium">{r.coin}</div>
                          <div className="text-2xs text-faint">
                            {r.coin === 'USDT' ? '多链合计' : r.coin}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tnum">{num(r.ledgerBalance, d)}</td>
                    <td className="px-3 py-2.5 text-right tnum text-muted">{num(r.hotWallet, d)}</td>
                    <td className="px-3 py-2.5 text-right tnum text-muted">{num(r.coldWallet, d)}</td>
                    <td className="px-3 py-2.5 text-right tnum">{num(r.chainBalance, d)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          'tnum font-semibold',
                          r.resolved ? 'text-up' : r.diff === 0 ? 'text-up' : 'text-down',
                        )}
                      >
                        {r.resolved ? num(0, d) : (r.diff > 0 ? '+' : '') + num(r.diff, d)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge s={r.resolved ? '平' : r.status} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {bad ? (
                        <Button size="sm" variant="danger" onClick={() => setFixTarget(r)}>平账</Button>
                      ) : r.resolved ? (
                        <span className="text-2xs text-up">已平账</span>
                      ) : (
                        <span className="text-2xs text-faint">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-line text-2xs text-faint">
          共 {rows.length} 条 · 单位为各币种原生单位（非 USDT 折算）
        </div>
      </Card>

      <InfoNote>
        对账任务每日 03:00 自动执行（见 <Link to="/admin/sys/cron" className="text-brand hover:underline">定时任务 → 资产对账</Link>），
        全量拉取用户余额账本与链上 UTXO / 合约余额比对。差额 ≠ 0 时同步触发风控警报「账本不平」（严重级）。
        平账操作会生成一条调账流水，记入 <Link to="/admin/finance/adjust-log" className="text-brand hover:underline">调账记录</Link>，并需财务主管审批。
      </InfoNote>

      {/* ---- 平账 Modal ---- */}
      <Modal
        open={!!fixTarget} onClose={() => setFixTarget(null)}
        title={fixTarget ? `平账 · ${fixTarget.coin}` : ''}
        width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFixTarget(null)}>取消</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (fixTarget) setFixed(f => new Set(f).add(fixTarget.coin))
                setFixTarget(null)
              }}
            >
              提交平账（需审批）
            </Button>
          </div>
        }
      >
        {fixTarget && (
          <div className="space-y-3">
            <DangerNote title="平账将直接调整账面余额">
              平账不改变链上资产，仅修正账面记录并生成一条不可删除的调账流水。
              提交后需财务主管审批方可生效。请先确认差异原因（漏记提币 / 链上手续费 / 空投到账 / 重放交易）。
            </DangerNote>

            <div className="rounded-lg border border-line bg-elevated/60 p-3 space-y-1">
              <KV k="账面余额" v={<span className="tnum">{num(fixTarget.ledgerBalance, coinDp(fixTarget.coin))}</span>} />
              <KV k="链上合计" v={<span className="tnum">{num(fixTarget.chainBalance, coinDp(fixTarget.coin))}</span>} />
              <KV
                k="差额"
                v={
                  <span className="tnum font-semibold text-down">
                    {(fixTarget.diff > 0 ? '+' : '')}{num(fixTarget.diff, coinDp(fixTarget.coin))} {fixTarget.coin}
                  </span>
                }
              />
            </div>

            <Select
              label="调整方向"
              defaultValue={fixTarget.diff < 0 ? 'down' : 'up'}
              options={[
                { value: 'down', label: `调减账面余额 ${num(Math.abs(fixTarget.diff), coinDp(fixTarget.coin))} ${fixTarget.coin}（账面 > 链上）` },
                { value: 'up', label: `调增账面余额 ${num(Math.abs(fixTarget.diff), coinDp(fixTarget.coin))} ${fixTarget.coin}（账面 < 链上）` },
              ]}
            />

            <div>
              <div className="text-xs text-muted mb-1.5">差异原因（必填）</div>
              <textarea
                rows={3}
                defaultValue="链上 Gas 费用未计入账本：2026-07-12 批量提币交易实际消耗 0.0062 ETH 矿工费，账面按预估值扣减，产生差额。"
                className="w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand resize-y"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="二次验证码" placeholder="6 位动态码" maxLength={6} />
              <Select
                label="审批人"
                options={STAFF.filter(s => s.dept === '财务部' || s.role === '超级管理员').map(s => ({ value: s.user, label: `${s.name} (${s.user})` }))}
                defaultValue="finance1"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* --------------------------- B-21 调账记录 -------------------------- */
type AdjustRow = {
  id: string; ts: string; operator: string; coin: string
  before: number; after: number; diff: number; reason: string
  approver: string; status: '已完成' | '待审批' | '已驳回'
}

const ra = seeded(31_415)
const ADJ_REASONS = [
  '链上 Gas 费用未计入账本',
  '第三方托管服务对账差异',
  '重复入账冲正',
  '空投到账未记账',
  '链重组导致确认回滚',
  '热钱包归集手续费',
  '提币失败资金回滚',
]

const ADJUST_LOG: AdjustRow[] = [
  {
    id: 'ADJ2041', ts: '2026-07-13 09:41:02', operator: 'finance1', coin: 'ETH',
    before: 2_418.8821, after: 2_418.8759, diff: -0.0062,
    reason: '链上 Gas 费用未计入账本（当前对账差异，待审批）',
    approver: '—', status: '待审批',
  },
  ...Array.from({ length: 17 }, (_, i) => {
    const coin = ['USDT', 'BTC', 'ETH', 'SOL', 'DOGE'][Math.floor(ra() * 5)]
    const d = coinDp(coin)
    const before = +(ra() * (coin === 'USDT' ? 4_000_000 : coin === 'DOGE' ? 8_000_000 : 2_000) + 100).toFixed(d)
    const diff = +((ra() - 0.45) * (coin === 'USDT' ? 40 : 0.05)).toFixed(d)
    return {
      id: `ADJ${2024 - i}`,
      ts: fmtDateTime(Date.now() - (i + 2) * 86_400_000 - Math.floor(ra() * 40_000_000)),
      operator: ra() > 0.5 ? 'finance1' : 'admin',
      coin,
      before,
      after: +(before + diff).toFixed(d),
      diff,
      reason: ADJ_REASONS[Math.floor(ra() * ADJ_REASONS.length)],
      approver: ra() > 0.12 ? '张财务' : '系统管理员',
      status: (ra() > 0.08 ? '已完成' : '已驳回') as AdjustRow['status'],
    }
  }),
]

export function AdjustLog() {
  const cols: Col<AdjustRow>[] = [
    { key: 'ts', header: '时间', cell: a => <span className="text-2xs text-muted tnum">{a.ts}</span> },
    { key: 'id', header: '调账单号', hideBelow: 'md', cell: a => <Mono>{a.id}</Mono> },
    { key: 'op', header: '操作人', cell: a => <Mono>{a.operator}</Mono> },
    {
      key: 'coin', header: '币种',
      cell: a => (
        <div className="flex items-center gap-1.5">
          <CoinIcon coin={a.coin} size="sm" />
          <span className="text-xs font-medium">{a.coin}</span>
        </div>
      ),
    },
    { key: 'before', header: '调整前', align: 'right', cell: a => <span className="tnum text-muted">{num(a.before, coinDp(a.coin))}</span> },
    { key: 'after', header: '调整后', align: 'right', cell: a => <span className="tnum">{num(a.after, coinDp(a.coin))}</span> },
    {
      key: 'diff', header: '差额', align: 'right',
      cell: a => (
        <span className={cn('tnum font-semibold', a.diff >= 0 ? 'text-up' : 'text-down')}>
          {a.diff >= 0 ? '+' : ''}{num(a.diff, coinDp(a.coin))}
        </span>
      ),
    },
    { key: 'reason', header: '原因', hideBelow: 'lg', cell: a => <span className="text-xs text-muted">{a.reason}</span> },
    { key: 'appr', header: '审批人', align: 'center', cell: a => <span className="text-xs text-muted">{a.approver}</span> },
    { key: 'st', header: '状态', align: 'center', cell: a => <StatusBadge s={a.status} /> },
  ]

  return (
    <ListPage<AdjustRow>
      title="调账记录"
      sub="B-21 · 所有账面余额调整的完整审计轨迹 — 不可删除、不可修改，供外部审计调阅"
      stats={[
        { label: '调账笔数', value: ADJUST_LOG.length, hint: '近 90 日' },
        { label: '待审批', value: ADJUST_LOG.filter(a => a.status === '待审批').length, hint: 'ETH -0.0062 待处理' },
        { label: '已驳回', value: ADJUST_LOG.filter(a => a.status === '已驳回').length },
        {
          label: 'USDT 净调整',
          value: num(ADJUST_LOG.filter(a => a.coin === 'USDT' && a.status === '已完成').reduce((s, a) => s + a.diff, 0), 2),
        },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '调账单号 / 操作人', width: 'w-56' },
        { type: 'select', key: 'coin', label: '全部币种', options: ['USDT', 'BTC', 'ETH', 'SOL', 'DOGE'] },
        { type: 'select', key: 'status', label: '全部状态', options: ['已完成', '待审批', '已驳回'] },
        { type: 'date', key: 'date' },
      ]}
      match={(a, s) =>
        (!s.q || `${a.id} ${a.operator}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.coin || a.coin === s.coin) &&
        (!s.status || a.status === s.status) &&
        (!s.date || a.ts.startsWith(s.date))
      }
      cols={cols}
      rows={ADJUST_LOG}
    />
  )
}
