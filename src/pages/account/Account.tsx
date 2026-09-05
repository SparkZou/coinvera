import { t } from '@/lib/i18n'
import { Link } from 'react-router-dom'
import {
  Shield, BadgeCheck, KeyRound, ScrollText, UserPlus, Percent,
  Wallet, ListOrdered, ChevronRight, Mail, Smartphone, Calendar,
  Crown, Copy, Check, TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { Card, CardHeader, Button, Badge, PageHeader, Stat } from '@/components/ui'
import { USER, BROKER_STATS, totalUsd, openSpotOrders, LOGIN_LOGS } from '@/mock/account'
import { cn, num, usd, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 个人中心 — hub for 安全 / KYC / API / 日志 / 邀请 / 返佣
 * ------------------------------------------------------------------ */

/** Security score ring — pure SVG. */
function ScoreRing({ score }: { score: number }) {
  const R = 42, C = 2 * Math.PI * R
  const len = (score / 100) * C
  const tone = score >= 80 ? 'rgb(var(--up))' : score >= 50 ? 'rgb(var(--warn))' : 'rgb(var(--down))'
  return (
    <div className="relative w-[110px] h-[110px] shrink-0">
      <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
        <circle cx="55" cy="55" r={R} fill="none" stroke="rgb(var(--line))" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={R} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${len} ${C - len}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-xl font-semibold tnum leading-none">{score}</div>
          <div className="text-2xs text-faint mt-1">安全评分</div>
        </div>
      </div>
    </div>
  )
}

const NAV = [
  { to: '/account/security', icon: Shield, title: '安全设置', sub: '密码 · 2FA · 设备 · 防钓鱼码', fn: 'F-04 · F-07 · F-08' },
  { to: '/account/kyc', icon: BadgeCheck, title: '实名认证', sub: 'KYC 三级认证 · 人脸识别', fn: 'F-06' },
  { to: '/account/api', icon: KeyRound, title: 'API 管理', sub: '密钥 · 权限 · IP 白名单', fn: 'F-17' },
  { to: '/account/logs', icon: ScrollText, title: '操作日志', sub: '登录与安全操作记录', fn: 'F-10' },
  { to: '/account/invite', icon: UserPlus, title: '邀请好友', sub: '邀请码 · 邀请链接 · 奖励', fn: 'F-42' },
  { to: '/broker', icon: Percent, title: '返佣中心', sub: '返佣 · 分佣 · 直客返佣', fn: 'F-43 · F-44' },
  { to: '/assets', icon: Wallet, title: '我的资产', sub: '币币 · 合约 · 法币账户', fn: 'F-45' },
  { to: '/orders', icon: ListOrdered, title: '订单管理', sub: '当前委托 · 历史 · 成交', fn: 'F-21 · F-24' },
]

const mask = (s: string, head = 2, tail = 2) =>
  s.length <= head + tail ? s : s.slice(0, head) + '***' + s.slice(-tail)

export default function Account() {
  const [copied, setCopied] = useState(false)

  /* 安全评分: 密码(20) + 手机(20) + 邮箱(15) + 2FA(25) + 防钓鱼(10) + 资金密码(10) */
  const score = 20 + (USER.smsAuth ? 20 : 0) + (USER.emailAuth ? 15 : 0)
    + (USER.google2fa ? 25 : 0) + (USER.antiPhishing ? 10 : 0)

  const emailMasked = USER.email.replace(/^(.{2}).*(@.*)$/, '$1***$2')
  const lastLogin = LOGIN_LOGS[0]

  return (
    <div>
      <PageHeader
        title="个人中心"
        sub="账户资料 · 安全状态 · 快捷入口"
        actions={
          <Link to="/account/security"><Button variant="outline" size="sm"><Shield className="w-3.5 h-3.5" />安全设置</Button></Link>
        }
      />

      {/* ------------------------------- Profile ------------------------------- */}
      <Card className="mb-4">
        <div className="flex flex-col lg:flex-row gap-6 p-5">
          {/* identity */}
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand grid place-items-center text-2xl font-semibold">
                {USER.nickname.slice(0, 1)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface border border-line grid place-items-center">
                <Crown className="w-3 h-3 text-brand" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">{USER.nickname}</h2>
                <Badge tone="brand"><Crown className="w-2.5 h-2.5" />VIP {USER.vipLevel}</Badge>
                <Badge tone={USER.kyc === 'verified' ? 'up' : 'warn'}>
                  <BadgeCheck className="w-2.5 h-2.5" />
                  {USER.kyc === 'verified' ? `已认证 Lv${USER.kycLevel}` : '未认证'}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-muted">UID</span>
                <span className="text-xs font-mono tnum">{USER.uid}</span>
                <button
                  onClick={() => { navigator.clipboard?.writeText(USER.uid); setCopied(true); setTimeout(() => setCopied(false), 1400) }}
                  className="text-faint hover:text-brand transition-colors"
                  title="复制 UID"
                >
                  {copied ? <Check className="w-3 h-3 text-up" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 text-2xs text-muted">
                <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-faint" />{emailMasked}</span>
                <span className="flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-faint" />{USER.phone}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-faint" />注册于 {USER.registeredAt}</span>
              </div>

              {lastLogin && (
                <div className="text-2xs text-faint mt-2 tnum">
                  上次登录 {fmtDateTime(lastLogin.ts)} · {lastLogin.ip} · {lastLogin.location}
                </div>
              )}
            </div>
          </div>

          {/* security score */}
          <div className="flex items-center gap-5 lg:border-l lg:border-line lg:pl-6 shrink-0">
            <ScoreRing score={score} />
            <div className="space-y-1.5">
              {[
                ['登录密码', true],
                ['手机绑定', USER.smsAuth],
                ['邮箱绑定', USER.emailAuth],
                ['谷歌验证器', USER.google2fa],
                ['防钓鱼码', !!USER.antiPhishing],
                ['资金密码', false],
              ].map(([label, on]) => (
                <div key={label as string} className="flex items-center gap-2 text-2xs">
                  <span className={cn(
                    'w-3.5 h-3.5 rounded-full grid place-items-center shrink-0',
                    on ? 'bg-up/10 text-up' : 'bg-line text-faint',
                  )}>
                    <Check className="w-2.5 h-2.5" />
                  </span>
                  <span className={on ? 'text-muted' : 'text-faint'}>{label as string}</span>
                  {!on && <Link to="/account/security" className="text-brand hover:underline ml-auto">去设置</Link>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* -------------------------------- Stats -------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="总资产估值" value={usd(totalUsd())} hint="币币 + 合约 + 法币" icon={<Wallet className="w-4 h-4" />} />
        <Stat label="当前委托" value={openSpotOrders().length} hint="币币未完成订单" icon={<ListOrdered className="w-4 h-4" />} />
        <Stat
          label="累计返佣" value={usd(BROKER_STATS.totalCommission)}
          hint={`${BROKER_STATS.tier} 经纪人`} icon={<TrendingUp className="w-4 h-4 text-up" />}
        />
        <Stat label="邀请人数" value={BROKER_STATS.totalCount} hint={`直属 ${BROKER_STATS.directCount} 人`} icon={<UserPlus className="w-4 h-4" />} />
      </div>

      {/* ------------------------------- Fee tier ------------------------------- */}
      <Card className="mb-4">
        <CardHeader
          title="手续费等级"
          sub={`当前 VIP ${USER.vipLevel} — 按 30 日交易量与平台币持仓量升级`}
          right={<Link to="/coverage" className="text-2xs text-brand hover:underline">费率说明</Link>}
        />
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line">
          <div className="p-4">
            <div className="text-2xs text-muted">Maker 费率</div>
            <div className="text-xl font-semibold tnum mt-1.5 text-up">{(USER.makerFee * 100).toFixed(3)}%</div>
            <div className="text-2xs text-faint mt-1">挂单成交 · 提供流动性</div>
          </div>
          <div className="p-4">
            <div className="text-2xs text-muted">Taker 费率</div>
            <div className="text-xl font-semibold tnum mt-1.5">{(USER.takerFee * 100).toFixed(3)}%</div>
            <div className="text-2xs text-faint mt-1">吃单成交 · 消耗流动性</div>
          </div>
          <div className="p-4">
            <div className="text-2xs text-muted">升级进度 · VIP {USER.vipLevel + 1}</div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-xl font-semibold tnum">{num(68.4, 1)}%</span>
              <span className="text-2xs text-faint tnum">30d 量 $1.37M / $2M</span>
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden mt-2.5">
              <div className="h-full bg-brand rounded-full" style={{ width: '68.4%' }} />
            </div>
          </div>
        </div>
      </Card>

      {/* -------------------------------- Nav grid ------------------------------ */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {NAV.map(n => (
          <Link key={n.to} to={n.to}>
            <Card className="p-4 h-full hover:border-brand/50 transition-colors group">
              <div className="flex items-start justify-between">
                <span className="w-9 h-9 rounded-lg bg-elevated grid place-items-center text-muted group-hover:text-brand transition-colors">
                  <n.icon className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-faint group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-sm font-semibold mt-3">{t(n.title)}</div>
              <div className="text-2xs text-muted mt-1 leading-relaxed">{t(n.sub)}</div>
              <div className="text-2xs text-faint font-mono mt-2">{n.fn}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
