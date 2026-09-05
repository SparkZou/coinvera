import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Percent, Users, Crown, TrendingUp, Coins, Wallet, ArrowRight, ArrowDown,
  Check, X, ChevronLeft, ChevronRight, Network, HandCoins, Share2, Info,
} from 'lucide-react'
import {
  Button, Card, CardHeader, Badge, Stat, Table, Tabs, SearchBox, Modal,
  Select, PageHeader, CopyField, type Col,
} from '@/components/ui'
import { AreaChart } from '@/components/charts'
import { USER, REFERRALS, BROKER_STATS, type Referral } from '@/mock/account'
import { cn, usd, num, compact, seeded, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 返佣中心 — F-43 (现货经纪人) · F-44 (合约经纪人)
 * 三种模式：返佣 / 分佣 / 直客返佣
 * ------------------------------------------------------------------ */

const INVITE_LINK = `https://exchange.io/register?ref=${USER.inviteCode}`
const maskUid = (u: string) => u.slice(0, 3) + '****' + u.slice(-2)

/* ------------------------------ Tier ladder --------------------------- */
const TIERS = [
  { key: '青铜', spot: '20%', fut: '25%', need: '注册即得' },
  { key: '白银', spot: '25%', fut: '30%', need: '直属 ≥ 5 人' },
  { key: '黄金', spot: '30%', fut: '40%', need: '直属 ≥ 10 人 · 团队量 ≥ $1M' },
  { key: '铂金', spot: '40%', fut: '45%', need: '直属 ≥ 30 人 · 团队量 ≥ $5M' },
  { key: '钻石', spot: '50%', fut: '50%', need: '直属 ≥ 100 人 · 团队量 ≥ $20M' },
]
const CUR_TIER = 2                    // 黄金 (BROKER_STATS.tier = 'Gold')
const TEAM_VOL = REFERRALS.reduce((s, r) => s + r.tradedVol, 0)
const NEXT_VOL = 5_000_000
const NEXT_DIRECT = 30

/* --------------------------- 返佣模式 explainer ------------------------ */
const MODE_RATES = [
  { level: 'L1 直属', rebate: '30%', split: '30%', direct: '— ', tone: 'brand' as const },
  { level: 'L2 二级', rebate: '—', split: '10%', direct: '—', tone: 'info' as const },
  { level: 'L3 三级', rebate: '—', split: '5%', direct: '—', tone: 'muted' as const },
  { level: '直客让利', rebate: '—', split: '—', direct: '最高 20%', tone: 'up' as const },
]

/* ---------------------------- 12 月佣金趋势 ---------------------------- */
const MONTHS = ['8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月', '7月']
const rc = seeded(2026)
const SERIES = Array.from({ length: 12 }, (_, i) => +(900 + i * 260 + rc() * 900).toFixed(2))

/* ------------------------------ 返佣明细 ------------------------------ */
type Rebate = {
  ts: number; uid: string; level: 1 | 2 | 3
  kind: '现货' | '合约'
  fee: number
  mode: '返佣' | '分佣' | '直客返佣'
  rate: number
  amount: number
}
const rr = seeded(8899)
const REBATES: Rebate[] = Array.from({ length: 12 }, (_, i) => {
  const src = REFERRALS[Math.floor(rr() * REFERRALS.length)]
  const kind: Rebate['kind'] = rr() > 0.45 ? '合约' : '现货'
  const mode: Rebate['mode'] = src.level === 1
    ? (rr() > 0.6 ? '直客返佣' : '返佣')
    : '分佣'
  const rate = mode === '直客返佣' ? 0.20
    : mode === '返佣' ? (kind === '合约' ? BROKER_STATS.futuresRate : BROKER_STATS.spotRate)
    : src.level === 2 ? 0.10 : 0.05
  const fee = +(rr() * 900 + 12).toFixed(2)
  return {
    ts: Date.now() - i * (7_200_000 + Math.floor(rr() * 40_000_000)),
    uid: src.uid,
    level: src.level,
    kind, fee, mode, rate,
    amount: +(fee * rate).toFixed(2),
  }
})

/* ---------------------------- 6-box OTP input ------------------------- */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const setAt = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]; next[i] = d; onChange(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }
  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...value]
      if (next[i]) { next[i] = '' } else if (i > 0) { next[i - 1] = ''; refs.current[i - 1]?.focus() }
      onChange(next)
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }
  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          inputMode="numeric" maxLength={1} value={value[i] ?? ''}
          onChange={e => setAt(i, e.target.value)}
          onKeyDown={e => onKey(i, e)}
          onFocus={e => e.currentTarget.select()}
          className={cn(
            'flex-1 min-w-0 h-12 text-center text-lg font-semibold tnum rounded-lg',
            'bg-elevated border outline-none transition-colors focus:border-brand',
            value[i] ? 'border-brand text-ink' : 'border-line text-muted',
          )}
        />
      ))}
    </div>
  )
}

/* ------------------------- Mode diagrams (divs) ----------------------- */
const Node = ({ label, tone = 'muted', sub }: { label: string; tone?: 'brand' | 'up' | 'info' | 'muted'; sub?: string }) => (
  <div className={cn(
    'px-2.5 py-1.5 rounded-lg border text-center min-w-[64px]',
    tone === 'brand' ? 'border-brand/40 bg-brand/10 text-brand'
      : tone === 'up' ? 'border-up/40 bg-up/10 text-up'
      : tone === 'info' ? 'border-info/40 bg-info/10 text-info'
      : 'border-line bg-elevated text-muted',
  )}>
    <div className="text-2xs font-semibold whitespace-nowrap">{label}</div>
    {sub && <div className="text-2xs opacity-70 tnum mt-0.5">{sub}</div>}
  </div>
)

function DiagramRebate() {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Node label="下级用户" />
      <div className="flex flex-col items-center">
        <span className="text-2xs text-faint mb-0.5">手续费</span>
        <ArrowRight className="w-4 h-4 text-faint" />
        <span className="text-2xs text-brand mt-0.5 tnum">30%</span>
      </div>
      <Node label="你" tone="brand" sub="返佣" />
    </div>
  )
}

function DiagramSplit() {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <Node label="你" tone="brand" />
      <ArrowDown className="w-3.5 h-3.5 text-faint" />
      <div className="flex items-center gap-1.5">
        <Node label="L1" tone="brand" sub="30%" />
        <Node label="L2" tone="info" sub="10%" />
        <Node label="L3" sub="5%" />
      </div>
    </div>
  )
}

function DiagramDirect() {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Node label="你" tone="brand" sub="佣金" />
      <div className="flex flex-col items-center">
        <span className="text-2xs text-faint mb-0.5">让利</span>
        <ArrowRight className="w-4 h-4 text-faint" />
        <span className="text-2xs text-up mt-0.5 tnum">≤20%</span>
      </div>
      <Node label="直属客户" tone="up" sub="手续费返还" />
    </div>
  )
}

const MODES = [
  {
    id: '返佣', icon: HandCoins, tone: 'brand' as const, fn: 'F-43 · F-44',
    desc: '下级交易产生的手续费，按你的等级比例直接返还给你。最简单、结算最快的模式。',
    bullets: ['仅计算 L1 直属下级', '现货 30% / 合约 40%（黄金）', 'T+1 结算至币币账户'],
    diagram: <DiagramRebate />,
  },
  {
    id: '分佣', icon: Network, tone: 'info' as const, fn: 'F-44',
    desc: '团队多级结构，L1 / L2 / L3 各层按递减比例分配佣金，适合发展团队的经纪人。',
    bullets: ['L1 30% · L2 10% · L3 5%', '最多计算三级，跨级不穿透', '按笔实时计提，日终汇总'],
    diagram: <DiagramSplit />,
  },
  {
    id: '直客返佣', icon: Share2, tone: 'up' as const, fn: 'F-44',
    desc: '直属客户可额外获得手续费返还，这部分由你的佣金中让利，用于换取更高交易量。',
    bullets: ['让利比例由你设定，最高 20%', '从你的佣金中扣除，平台不承担', '可按客户单独配置'],
    diagram: <DiagramDirect />,
  },
]

const PAGE = 8

export default function Broker() {
  const [lv, setLv] = useState<'all' | '1' | '2' | '3'>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [wd, setWd] = useState(false)
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [amount, setAmount] = useState('')

  const subs = useMemo(() => REFERRALS.filter(r => {
    if (lv !== 'all' && String(r.level) !== lv) return false
    if (q && !r.uid.includes(q)) return false
    return true
  }), [lv, q])

  const pages = Math.max(1, Math.ceil(subs.length / PAGE))
  const cur = Math.min(page, pages)
  const slice = subs.slice((cur - 1) * PAGE, cur * PAGE)

  const nextTier = TIERS[CUR_TIER + 1]
  const volPct = Math.min(100, (TEAM_VOL / NEXT_VOL) * 100)
  const dirPct = Math.min(100, (BROKER_STATS.directCount / NEXT_DIRECT) * 100)
  const available = BROKER_STATS.totalCommission

  const subCols: Col<Referral>[] = [
    {
      key: 'uid', header: 'UID', cell: r => (
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-elevated grid place-items-center text-2xs text-muted font-semibold shrink-0">
            {r.uid.slice(-1)}
          </span>
          <span className="text-xs font-mono tnum">{maskUid(r.uid)}</span>
        </div>
      ),
    },
    {
      key: 'lv', header: '层级', cell: r => (
        <Badge tone={r.level === 1 ? 'brand' : r.level === 2 ? 'info' : 'muted'}>L{r.level}</Badge>
      ),
    },
    { key: 'reg', header: '注册时间', hideBelow: 'sm', cell: r => <span className="text-xs text-muted tnum">{r.registeredAt}</span> },
    {
      key: 'kyc', header: 'KYC', align: 'center', cell: r => r.kyc
        ? <Check className="w-3.5 h-3.5 text-up inline" />
        : <X className="w-3.5 h-3.5 text-faint inline" />,
    },
    {
      key: 'vol', header: '累计交易量', align: 'right',
      cell: r => <span className="text-xs tnum">${compact(r.tradedVol)}</span>,
    },
    {
      key: 'com', header: '累计贡献佣金', align: 'right',
      cell: r => <span className="text-xs tnum font-medium text-up">+{usd(r.commission)}</span>,
    },
  ]

  const rebCols: Col<Rebate>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-xs text-muted tnum">{fmtDateTime(r.ts)}</span> },
    { key: 'uid', header: '来源 UID', hideBelow: 'sm', cell: r => <span className="text-xs font-mono tnum">{maskUid(r.uid)}</span> },
    {
      key: 'lv', header: '层级', hideBelow: 'sm', cell: r =>
        <Badge tone={r.level === 1 ? 'brand' : r.level === 2 ? 'info' : 'muted'}>L{r.level}</Badge>,
    },
    {
      key: 'kind', header: '交易类型', cell: r =>
        <Badge tone={r.kind === '合约' ? 'info' : 'brand'}>{r.kind}</Badge>,
    },
    { key: 'fee', header: '手续费', align: 'right', hideBelow: 'md', cell: r => <span className="text-xs tnum text-muted">{usd(r.fee)}</span> },
    {
      key: 'mode', header: '返佣模式', cell: r =>
        <Badge tone={r.mode === '返佣' ? 'brand' : r.mode === '分佣' ? 'info' : 'up'}>{r.mode}</Badge>,
    },
    { key: 'rate', header: '返佣比例', align: 'right', hideBelow: 'md', cell: r => <span className="text-xs tnum">{num(r.rate * 100, 0)}%</span> },
    { key: 'amt', header: '返佣金额', align: 'right', cell: r => <span className="text-xs tnum font-medium text-up">+{usd(r.amount)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="返佣中心"
        sub="经纪人计划 · 返佣 / 分佣 / 直客返佣 三种模式"
        actions={
          <>
            <Link to="/account/invite">
              <Button variant="ghost" size="sm"><Share2 className="w-3.5 h-3.5" />邀请好友</Button>
            </Link>
            <Button size="sm" onClick={() => { setOtp(Array(6).fill('')); setAmount(''); setWd(true) }}>
              <Wallet className="w-3.5 h-3.5" />提取佣金
            </Button>
          </>
        }
      />

      {/* ============================ 经纪人等级 ============================ */}
      <Card className="mb-4">
        <div className="flex flex-col lg:flex-row">
          {/* tier ladder */}
          <div className="flex-1 min-w-0 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
                <Crown className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">黄金经纪人</span>
                  <Badge tone="brand">{BROKER_STATS.tier}</Badge>
                  <span className="text-2xs font-mono text-faint">F-43 · F-44</span>
                </div>
                <div className="text-2xs text-muted mt-0.5">
                  现货返佣 {num(BROKER_STATS.spotRate * 100, 0)}% · 合约返佣 {num(BROKER_STATS.futuresRate * 100, 0)}%
                </div>
              </div>
            </div>

            {/* ladder */}
            <div className="relative">
              <div className="h-1.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-700"
                  style={{ width: `${(CUR_TIER / (TIERS.length - 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {TIERS.map((t, i) => (
                  <div key={t.key} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-full -mt-[1.05rem] border-2 border-bg shrink-0',
                      i <= CUR_TIER ? 'bg-brand' : 'bg-line',
                    )} />
                    <span className={cn(
                      'text-2xs whitespace-nowrap',
                      i === CUR_TIER ? 'text-brand font-semibold' : i < CUR_TIER ? 'text-muted' : 'text-faint',
                    )}>
                      {t.key}
                    </span>
                    <span className="text-2xs text-faint tnum hidden sm:block">{t.spot}/{t.fut}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* next-tier requirements */}
            <div className="mt-5 rounded-lg bg-elevated border border-line p-3">
              <div className="flex items-center gap-1.5 text-xs mb-2.5">
                <span className="text-muted">升级至</span>
                <Badge tone="info">{nextTier.key}</Badge>
                <span className="text-2xs text-faint">现货 {nextTier.spot} / 合约 {nextTier.fut}</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { l: '直属下级', now: BROKER_STATS.directCount, need: NEXT_DIRECT, p: dirPct, fmt: (v: number) => String(v) },
                  { l: '团队交易量', now: TEAM_VOL, need: NEXT_VOL, p: volPct, fmt: (v: number) => '$' + compact(v) },
                ].map(row => (
                  <div key={row.l}>
                    <div className="flex items-center justify-between text-2xs mb-1">
                      <span className="text-muted">{row.l}</span>
                      <span className="tnum">
                        <b className="text-ink">{row.fmt(row.now)}</b>
                        <span className="text-faint"> / {row.fmt(row.need)}</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-line overflow-hidden">
                      <div className="h-full bg-info rounded-full transition-all duration-700" style={{ width: `${row.p}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* invite code */}
          <div className="lg:w-80 shrink-0 p-5 border-t lg:border-t-0 lg:border-l border-line">
            <div className="text-xs font-semibold mb-3">我的推广物料</div>

            <div className="text-2xs text-muted mb-1.5">邀请码</div>
            <div className="h-11 rounded-lg bg-elevated border border-line grid place-items-center mb-2">
              <span className="text-lg font-mono font-semibold tracking-[0.2em] tnum text-brand pl-1">
                {USER.inviteCode}
              </span>
            </div>
            <CopyField value={USER.inviteCode} />

            <div className="text-2xs text-muted mb-1.5 mt-3">邀请链接</div>
            <CopyField value={INVITE_LINK} />

            <div className="flex items-start gap-2 mt-3 text-2xs text-faint leading-relaxed">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              绑定关系永久有效。下级再邀请的用户自动成为你的 L2 / L3。
            </div>
          </div>
        </div>
      </Card>

      {/* =============================== Stats ============================== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <Stat label="累计返佣" value={usd(BROKER_STATS.totalCommission)} hint="全部层级" icon={<Coins className="w-4 h-4 text-brand" />} />
        <Stat label="本月返佣" value={usd(BROKER_STATS.monthCommission)} delta={18.42} hint="较上月" icon={<TrendingUp className="w-4 h-4 text-up" />} />
        <Stat label="直属下级" value={BROKER_STATS.directCount} hint="L1" icon={<Users className="w-4 h-4" />} />
        <Stat label="团队总人数" value={BROKER_STATS.totalCount} hint="L1 + L2 + L3" icon={<Network className="w-4 h-4" />} />
        <Stat label="现货返佣比例" value={`${num(BROKER_STATS.spotRate * 100, 0)}%`} hint="F-43 · 黄金" icon={<Percent className="w-4 h-4" />} />
        <Stat label="合约返佣比例" value={`${num(BROKER_STATS.futuresRate * 100, 0)}%`} hint="F-44 · 黄金" icon={<Percent className="w-4 h-4 text-info" />} />
      </div>

      {/* ========================== 三种返佣模式 =========================== */}
      <Card className="mb-4">
        <CardHeader
          title="返佣模式说明"
          sub="现货经纪人 (F-43) 与合约经纪人 (F-44) 均支持以下三种模式，可同时生效"
          right={<span className="text-2xs font-mono text-faint">F-43 · F-44</span>}
        />
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
          {MODES.map(m => (
            <div key={m.id} className="p-5">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'w-8 h-8 rounded-lg grid place-items-center shrink-0',
                  m.tone === 'brand' ? 'bg-brand/10 text-brand' : m.tone === 'info' ? 'bg-info/10 text-info' : 'bg-up/10 text-up',
                )}>
                  <m.icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold">{m.id}</span>
                <span className="text-2xs font-mono text-faint ml-auto">{m.fn}</span>
              </div>

              <div className="mt-3 rounded-lg bg-elevated border border-line">
                {m.diagram}
              </div>

              <p className="text-xs text-muted mt-3 leading-relaxed">{m.desc}</p>

              <ul className="mt-2.5 space-y-1.5">
                {m.bullets.map(b => (
                  <li key={b} className="flex gap-1.5 text-2xs text-faint leading-relaxed">
                    <Check className="w-3 h-3 text-up shrink-0 mt-0.5" />{b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* rates matrix */}
        <div className="border-t border-line overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-2xs text-muted">
                <th className="text-left font-medium px-4 py-2 border-b border-line">层级 / 模式</th>
                <th className="text-right font-medium px-4 py-2 border-b border-line">返佣</th>
                <th className="text-right font-medium px-4 py-2 border-b border-line">分佣</th>
                <th className="text-right font-medium px-4 py-2 border-b border-line">直客返佣</th>
              </tr>
            </thead>
            <tbody>
              {MODE_RATES.map(r => (
                <tr key={r.level} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2">
                    <Badge tone={r.tone}>{r.level}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right tnum text-xs">{r.rebate}</td>
                  <td className="px-4 py-2 text-right tnum text-xs">{r.split}</td>
                  <td className="px-4 py-2 text-right tnum text-xs">{r.direct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-line text-2xs text-faint leading-relaxed">
          上表为「黄金」等级比例。合约经纪人 (F-44) 的返佣基数为合约手续费（含 Taker/Maker），
          现货经纪人 (F-43) 的基数为币币手续费。资金费用与强平费不计入返佣基数。
        </div>
      </Card>

      {/* ============================= 佣金趋势 ============================= */}
      <Card className="mb-4">
        <CardHeader
          title="佣金趋势"
          sub="近 12 个月已结算佣金"
          right={
            <div className="flex items-center gap-3 text-2xs">
              <span className="text-muted">合计 <b className="text-ink tnum">{usd(SERIES.reduce((s, v) => s + v, 0))}</b></span>
              <Badge tone="up"><TrendingUp className="w-2.5 h-2.5" />+18.42%</Badge>
            </div>
          }
        />
        <div className="p-4">
          <AreaChart data={SERIES} tone="up" className="w-full" height={180} />
          <div className="flex mt-2">
            {MONTHS.map(m => (
              <div key={m} className="flex-1 text-center text-2xs text-faint truncate">{m}</div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
          {[
            { l: '最高月份', v: usd(Math.max(...SERIES)), s: '2026-07' },
            { l: '月均佣金', v: usd(SERIES.reduce((s, v) => s + v, 0) / SERIES.length), s: '近 12 个月' },
            { l: '待结算', v: usd(842.16), s: 'T+1 到账' },
          ].map(x => (
            <div key={x.l} className="p-3.5">
              <div className="text-2xs text-muted">{x.l}</div>
              <div className="text-sm font-semibold tnum mt-1">{x.v}</div>
              <div className="text-2xs text-faint mt-0.5">{x.s}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ============================= 下级列表 ============================= */}
      <Card className="mb-4">
        <CardHeader
          title="下级列表"
          sub={`团队共 ${REFERRALS.length} 人 — L1 ${REFERRALS.filter(r => r.level === 1).length} · L2 ${REFERRALS.filter(r => r.level === 2).length} · L3 ${REFERRALS.filter(r => r.level === 3).length}`}
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b border-line">
          <Tabs
            value={lv}
            onChange={v => { setLv(v); setPage(1) }}
            tabs={[
              { id: 'all', label: '全部', count: REFERRALS.length },
              { id: '1', label: 'L1 直属', count: REFERRALS.filter(r => r.level === 1).length },
              { id: '2', label: 'L2', count: REFERRALS.filter(r => r.level === 2).length },
              { id: '3', label: 'L3', count: REFERRALS.filter(r => r.level === 3).length },
            ]}
          />
          <div className="flex-1" />
          <SearchBox
            value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="按 UID 搜索…" className="w-full sm:w-56"
          />
        </div>

        {/* desktop */}
        <div className="hidden sm:block">
          <Table cols={subCols} rows={slice} empty="没有匹配的下级" />
        </div>

        {/* mobile */}
        <div className="sm:hidden divide-y divide-line/60">
          {slice.map((r, i) => (
            <div key={`${r.uid}-${i}`} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono tnum">{maskUid(r.uid)}</span>
                  <Badge tone={r.level === 1 ? 'brand' : r.level === 2 ? 'info' : 'muted'}>L{r.level}</Badge>
                  {r.kyc
                    ? <Check className="w-3.5 h-3.5 text-up" />
                    : <X className="w-3.5 h-3.5 text-faint" />}
                </div>
                <span className="text-xs tnum font-medium text-up shrink-0">+{usd(r.commission)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 text-2xs text-muted">
                <span className="tnum">{r.registeredAt}</span>
                <span className="tnum">交易量 <b className="text-ink">${compact(r.tradedVol)}</b></span>
              </div>
            </div>
          ))}
          {slice.length === 0 && <div className="py-12 text-center text-xs text-faint">没有匹配的下级</div>}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
          <span className="text-2xs text-faint tnum">共 {subs.length} 人 · 第 {cur} / {pages} 页</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'w-8 h-8 rounded-lg text-xs tnum transition-colors',
                  p === cur ? 'bg-brand text-brand-ink font-semibold' : 'text-muted hover:bg-elevated',
                )}
              >
                {p}
              </button>
            ))}
            <Button variant="outline" size="sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ============================= 返佣明细 ============================= */}
      <Card>
        <CardHeader
          title="返佣明细"
          sub="按笔计提 · T+1 结算至币币账户"
          right={<span className="text-2xs text-faint tnum">近 {REBATES.length} 笔</span>}
        />

        {/* desktop */}
        <div className="hidden sm:block">
          <Table cols={rebCols} rows={REBATES} dense />
        </div>

        {/* mobile */}
        <div className="sm:hidden divide-y divide-line/60">
          {REBATES.map((r, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge tone={r.kind === '合约' ? 'info' : 'brand'}>{r.kind}</Badge>
                  <Badge tone={r.mode === '返佣' ? 'brand' : r.mode === '分佣' ? 'info' : 'up'}>{r.mode}</Badge>
                  <Badge tone="muted">L{r.level}</Badge>
                </div>
                <span className="text-sm tnum font-medium text-up shrink-0">+{usd(r.amount)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 text-2xs text-muted tnum">
                <span>{fmtDateTime(r.ts)}</span>
                <span>手续费 {usd(r.fee)} × {num(r.rate * 100, 0)}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-line flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-2xs text-faint flex-1 leading-relaxed">
            返佣以 USDT 计价，来源交易的手续费币种将按结算时点汇率折算。
          </span>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setOtp(Array(6).fill('')); setAmount(''); setWd(true) }}>
            <Wallet className="w-3.5 h-3.5" />提取佣金
          </Button>
        </div>
      </Card>

      {/* ============================== 提取佣金 ============================== */}
      <Modal
        open={wd} onClose={() => setWd(false)} title="提取佣金"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setWd(false)}>取消</Button>
            <Button
              className="flex-1"
              disabled={otp.join('').length < 6 || !amount || +amount <= 0 || +amount > available}
              onClick={() => setWd(false)}
            >
              确认提取
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-elevated border border-line p-4 text-center">
            <div className="text-2xs text-muted">可提取余额</div>
            <div className="text-2xl font-semibold tnum mt-1 text-up">{usd(available)}</div>
            <div className="text-2xs text-faint mt-1">USDT · 已结算部分</div>
          </div>

          <Select
            label="提取到"
            options={[
              { value: 'spot', label: '币币账户 (Spot)' },
              { value: 'futures', label: '合约账户 (Futures)' },
            ]}
          />

          <div>
            <div className="text-xs text-muted mb-1.5">提取数量</div>
            <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand">
              <input
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                inputMode="decimal"
                placeholder="0.00"
                className="flex-1 min-w-0 bg-transparent outline-none text-sm tnum placeholder:text-faint"
              />
              <span className="text-xs text-muted shrink-0">USDT</span>
              <button
                onClick={() => setAmount(available.toFixed(2))}
                className="text-xs text-brand hover:underline shrink-0"
              >
                全部
              </button>
            </div>
            {!!amount && +amount > available && (
              <div className="text-2xs text-down mt-1">超出可提取余额</div>
            )}
          </div>

          <div>
            <div className="text-xs text-muted mb-1.5">二次验证 · 谷歌验证码</div>
            <OtpInput value={otp} onChange={setOtp} />
          </div>

          <div className="rounded-lg bg-elevated border border-line p-3 space-y-1.5 text-2xs">
            <div className="flex justify-between"><span className="text-muted">手续费</span><span className="tnum">免费</span></div>
            <div className="flex justify-between"><span className="text-muted">到账时间</span><span>实时</span></div>
            <div className="flex justify-between">
              <span className="text-muted">实际到账</span>
              <span className="tnum text-up font-medium">{amount ? usd(+amount) : usd(0)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
