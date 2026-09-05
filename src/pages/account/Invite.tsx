import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserPlus, Share2, Send, MessageCircle, Gift, Users, BadgeCheck,
  TrendingUp, ArrowRight, Check, Percent, Coins, Link2,
} from 'lucide-react'
import {
  Button, Card, CardHeader, Badge, Stat, Table, PageHeader, CopyField, type Col,
} from '@/components/ui'
import { USER, REFERRALS, BROKER_STATS, type Referral } from '@/mock/account'
import { cn, usd, num, compact } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 邀请好友 — F-11 / F-42
 * 邀请码 · 邀请链接 · 二维码 · 分享 · 返佣说明 · 邀请记录
 * ------------------------------------------------------------------ */

const INVITE_LINK = `https://exchange.io/register?ref=${USER.inviteCode}`

/* ------------------- Deterministic CSS/SVG "QR code" ------------------ */
function FakeQr({ text, size = 150 }: { text: string; size?: number }) {
  const N = 25
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  let s = h >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }

  const g: boolean[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => rnd() > 0.52))
  const clear = (r0: number, c0: number) => {
    for (let r = -1; r < 8; r++) for (let c = -1; c < 8; c++) {
      const rr = r0 + r, cc = c0 + c
      if (rr >= 0 && rr < N && cc >= 0 && cc < N) g[rr][cc] = false
    }
  }
  const finder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const edge = r === 0 || r === 6 || c === 0 || c === 6
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
      g[r0 + r][c0 + c] = edge || core
    }
  }
  clear(0, 0); clear(0, N - 7); clear(N - 7, 0)
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0)
  for (let i = 8; i < N - 8; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0 }
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const edge = r === 0 || r === 4 || c === 0 || c === 4
    const core = r === 2 && c === 2
    g[N - 9 + r][N - 9 + c] = edge || core
  }
  /* knock out the centre for the logo badge */
  for (let r = 10; r < 15; r++) for (let c = 10; c < 15; c++) g[r][c] = false

  return (
    <div className="relative p-3 rounded-xl bg-surface border border-line shrink-0" style={{ width: size + 24 }}>
      <svg viewBox={`0 0 ${N} ${N}`} width={size} height={size} shapeRendering="crispEdges" className="block">
        {g.map((row, r) => row.map((on, c) => on
          ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="rgb(var(--ink))" />
          : null,
        ))}
      </svg>
      <span className="absolute inset-0 grid place-items-center pointer-events-none">
        <span className="w-8 h-8 rounded-lg bg-brand text-brand-ink grid place-items-center text-xs font-bold shadow">
          HK
        </span>
      </span>
    </div>
  )
}

const maskUid = (u: string) => u.slice(0, 3) + '****' + u.slice(-2)

const SHARE = [
  { id: 'wechat', label: '微信', icon: MessageCircle },
  { id: 'tg', label: 'Telegram', icon: Send },
  { id: 'x', label: 'X', icon: Share2 },
  { id: 'copy', label: '复制链接', icon: Link2 },
]

const STEPS = [
  { n: 1, icon: Share2, title: '分享邀请链接', desc: '把你的专属邀请码或链接发给好友，也可以让对方扫描二维码。' },
  { n: 2, icon: BadgeCheck, title: '好友注册并完成 KYC', desc: '好友通过你的链接注册，并完成 Lv1 实名认证后即建立绑定关系（永久有效）。' },
  { n: 3, icon: Coins, title: '获得 30% 手续费返佣', desc: '好友每一笔现货 / 合约交易，你都可获得其手续费的 30%，T+1 结算至币币账户。' },
]

export default function Invite() {
  const [shared, setShared] = useState<string | null>(null)

  const share = (id: string) => {
    if (id === 'copy') navigator.clipboard?.writeText(INVITE_LINK)
    setShared(id)
    window.setTimeout(() => setShared(null), 1400)
  }

  const l1 = REFERRALS.filter(r => r.level === 1)
  const kycCount = REFERRALS.filter(r => r.kyc).length
  const monthRebate = BROKER_STATS.monthCommission

  const cols: Col<Referral>[] = [
    {
      key: 'uid', header: 'UID', cell: r => (
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand/10 text-brand grid place-items-center text-2xs font-semibold shrink-0">
            {r.uid.slice(-1)}
          </span>
          <span className="text-xs font-mono tnum">{maskUid(r.uid)}</span>
        </div>
      ),
    },
    { key: 'reg', header: '注册时间', hideBelow: 'sm', cell: r => <span className="text-xs text-muted tnum">{r.registeredAt}</span> },
    {
      key: 'kyc', header: 'KYC 状态', cell: r => r.kyc
        ? <Badge tone="up"><Check className="w-2.5 h-2.5" />已认证</Badge>
        : <Badge tone="muted">未认证</Badge>,
    },
    {
      key: 'vol', header: '累计交易量', align: 'right', hideBelow: 'sm',
      cell: r => <span className="text-xs tnum">${compact(r.tradedVol)}</span>,
    },
    {
      key: 'com', header: '我获得的返佣', align: 'right',
      cell: r => <span className="text-xs tnum font-medium text-up">+{usd(r.commission)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="邀请好友"
        sub="分享邀请链接，赚取好友交易手续费的 30%"
        actions={
          <Link to="/broker">
            <Button variant="outline" size="sm"><Percent className="w-3.5 h-3.5" />返佣中心</Button>
          </Link>
        }
      />

      {/* ================================ Hero ================================ */}
      <Card className="mb-4 overflow-hidden">
        <div className="relative">
          {/* decorative wash — token colours only */}
          <div className="absolute inset-0 bg-brand/5 pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row gap-6 p-5 sm:p-6">
            {/* left — codes */}
            <div className="flex-1 min-w-0">
              <Badge tone="brand"><Gift className="w-2.5 h-2.5" />邀请返佣计划 · F-11</Badge>

              <h2 className="text-lg sm:text-xl font-semibold mt-3">
                邀请好友交易，赚取 <span className="text-brand tnum">30%</span> 手续费返佣
              </h2>
              <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-md">
                好友完成实名认证后即永久绑定，返佣按 T+1 自动结算至你的币币账户，上不封顶。
              </p>

              <div className="mt-5 grid sm:grid-cols-2 gap-3 max-w-xl">
                <div>
                  <div className="text-2xs text-muted mb-1.5">我的邀请码</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-12 rounded-lg bg-elevated border border-line grid place-items-center">
                      <span className="text-xl font-mono font-semibold tracking-[0.25em] tnum text-brand pl-1">
                        {USER.inviteCode}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <CopyField value={USER.inviteCode} />
                  </div>
                </div>

                <div>
                  <div className="text-2xs text-muted mb-1.5">邀请链接</div>
                  <div className="h-12 rounded-lg bg-elevated border border-line flex items-center px-3">
                    <span className="text-xs font-mono text-muted truncate">{INVITE_LINK}</span>
                  </div>
                  <div className="mt-2">
                    <CopyField value={INVITE_LINK} />
                  </div>
                </div>
              </div>

              {/* share */}
              <div className="mt-5">
                <div className="text-2xs text-muted mb-2">分享到</div>
                <div className="flex flex-wrap gap-2">
                  {SHARE.map(s => (
                    <button
                      key={s.id}
                      onClick={() => share(s.id)}
                      className={cn(
                        'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs transition-colors',
                        shared === s.id
                          ? 'border-up bg-up/10 text-up'
                          : 'border-line bg-elevated text-muted hover:text-ink hover:border-brand',
                      )}
                    >
                      {shared === s.id ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                      {shared === s.id ? '已分享' : s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* right — QR */}
            <div className="flex flex-col items-center gap-2 shrink-0 self-center">
              <FakeQr text={INVITE_LINK} size={150} />
              <div className="text-2xs text-faint text-center leading-relaxed">
                扫码注册 · 自动填入邀请码<br />
                <span className="font-mono text-muted">{USER.inviteCode}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ================================ Stats =============================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat
          label="累计邀请人数" value={BROKER_STATS.totalCount}
          hint={`直属 ${BROKER_STATS.directCount} 人`} icon={<Users className="w-4 h-4" />}
        />
        <Stat
          label="已完成 KYC 人数" value={kycCount}
          hint={`转化率 ${num((kycCount / BROKER_STATS.totalCount) * 100, 1)}%`}
          icon={<BadgeCheck className="w-4 h-4 text-up" />}
        />
        <Stat
          label="累计返佣" value={usd(BROKER_STATS.totalCommission)}
          hint="已结算至币币账户" icon={<Coins className="w-4 h-4 text-brand" />}
        />
        <Stat
          label="本月返佣" value={usd(monthRebate)} delta={18.42}
          hint="较上月" icon={<TrendingUp className="w-4 h-4 text-up" />}
        />
      </div>

      {/* ============================ 奖励说明 3 步 ============================ */}
      <Card className="mb-4">
        <CardHeader title="邀请奖励说明" sub="三步开始赚取返佣 — 关系一经绑定永久有效" />
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative p-5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
                  <s.icon className="w-5 h-5" />
                </span>
                <span className="text-3xl font-semibold tnum text-line select-none leading-none">
                  0{s.n}
                </span>
              </div>
              <div className="text-sm font-semibold mt-3">{s.title}</div>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{s.desc}</p>

              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 text-faint bg-surface" />
              )}
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-line flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-2xs text-faint flex-1 leading-relaxed">
            返佣比例随经纪人等级提升：普通用户 30%，黄金经纪人现货 30% / 合约 40%，最高可达 50%。
          </span>
          <Link to="/broker" className="text-2xs text-brand hover:underline shrink-0 flex items-center gap-1">
            想要更高返佣比例？申请成为经纪人 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </Card>

      {/* ============================== 邀请记录 ============================== */}
      <Card>
        <CardHeader
          title="我的邀请记录"
          sub={`直属好友 (L1) ${l1.length} 人 — 多级团队与分佣明细请前往返佣中心`}
          right={<Link to="/broker" className="text-2xs text-brand hover:underline">查看团队 →</Link>}
        />

        {/* desktop */}
        <div className="hidden sm:block">
          <Table cols={cols} rows={l1} empty="还没有邀请记录，分享链接开始赚取返佣" />
        </div>

        {/* mobile cards */}
        <div className="sm:hidden divide-y divide-line/60">
          {l1.map((r, i) => (
            <div key={`${r.uid}-${i}`} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-brand/10 text-brand grid place-items-center text-2xs font-semibold shrink-0">
                    {r.uid.slice(-1)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-mono tnum">{maskUid(r.uid)}</div>
                    <div className="text-2xs text-faint tnum mt-0.5">{r.registeredAt}</div>
                  </div>
                </div>
                {r.kyc
                  ? <Badge tone="up"><Check className="w-2.5 h-2.5" />已认证</Badge>
                  : <Badge tone="muted">未认证</Badge>}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-line/60">
                <span className="text-2xs text-muted">交易量 <b className="text-ink tnum">${compact(r.tradedVol)}</b></span>
                <span className="text-xs tnum font-medium text-up">+{usd(r.commission)}</span>
              </div>
            </div>
          ))}
          {l1.length === 0 && <div className="py-12 text-center text-xs text-faint">还没有邀请记录</div>}
        </div>

        <div className="px-4 py-3 border-t border-line flex items-center justify-between">
          <span className="text-2xs text-faint tnum">
            共 {l1.length} 位直属好友 · 累计返佣 {usd(l1.reduce((s, r) => s + r.commission, 0))}
          </span>
          <Link to="/broker">
            <Button variant="ghost" size="sm">
              <UserPlus className="w-3.5 h-3.5" />升级为经纪人
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
