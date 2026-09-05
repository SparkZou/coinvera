import React, { useMemo, useState } from 'react'
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Copy, UploadCloud, Image as ImageIcon,
  Send, Lock as LockIcon, Unlock as UnlockIcon, Gift as GiftIcon, AlertTriangle, Info,
  ChevronRight, ChevronDown, Eye, Users, Check, Download, Clock, Link2,
  FileText, Folder, Layers, Wallet, Trophy, Coins, X,
} from 'lucide-react'
import {
  ListPage, ConfigPage, ReviewQueue, ReportPage, StatusBadge, Sev, Mono, Money,
  ConflictNote, FilterBar,
  Card, CardHeader, Button, Input, Select, Badge, Table, Toggle, Modal, Stat, SearchBox,
  type Col,
} from './kit'
import { BarChart } from '@/components/charts'
import { TICKETS, BANNERS, GIFT_LOG, HOLDERS, ADMIN_USERS, COINS, type Ticket } from '@/mock/admin'
import { NOTICES, INBOX } from '@/mock/account'
import { cn, num, usd, compact, fmtDateTime, seeded } from '@/lib/utils'

/* ================================================================== *
 * g3 — 客服运营 (B-39…B-46) + 运营工具 (B-47…B-56)
 * 18 back-office pages. All data is local, deterministic mock data.
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * 0. Local helpers — form fields, progress bars, CSS-drawn thumbnails
 * ------------------------------------------------------------------ */
const R = seeded(20_260_713)
const rpick = <T,>(a: readonly T[]): T => a[Math.floor(R() * a.length)]
const rint = (a: number, b: number) => Math.floor(R() * (b - a + 1)) + a
const rfloat = (a: number, b: number, dp = 2) => +(R() * (b - a) + a).toFixed(dp)
const DAY = 86_400_000
const dayAgo = (n: number) => Date.now() - n * DAY
const dstr = (ts: number) => new Date(ts).toISOString().slice(0, 10)
const dtstr = (ts: number) => new Date(ts).toISOString().slice(0, 16).replace('T', ' ')
const parseTs = (s: string) => Date.parse(s.replace(' ', 'T')) || Date.now()

const FIELD = 'w-full h-10 px-3 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand'
const AREA = 'w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand resize-y'

/** Label + control row used across the ops forms. */
function Field({
  label, hint, children, required,
}: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="grid sm:grid-cols-[168px_1fr] gap-2 sm:gap-4 sm:items-start">
      <div className="pt-2">
        <div className="text-xs font-medium">
          {label}{required && <span className="text-down ml-0.5">*</span>}
        </div>
        {hint && <div className="text-2xs text-faint mt-0.5 leading-relaxed">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const TONE_BG: Record<string, string> = {
  brand: 'bg-brand', up: 'bg-up', info: 'bg-info', warn: 'bg-warn', down: 'bg-down',
}

/** Inline progress bar — 已读率 / 释放进度 / 解锁进度. */
function Bar({ v, tone = 'brand', w = 'w-24' }: { v: number; tone?: string; w?: string }) {
  const p = Math.max(0, Math.min(100, v))
  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-1.5 rounded-full bg-elevated overflow-hidden shrink-0', w)}>
        <div className={cn('h-full rounded-full transition-all', TONE_BG[tone] ?? 'bg-brand')} style={{ width: `${p}%` }} />
      </div>
      <span className="text-2xs text-muted tnum w-9 text-right">{p.toFixed(0)}%</span>
    </div>
  )
}

/** Page shell for the hand-composed pages (tree / grid / form). */
function PageShell({
  fnId, title, sub, actions, children,
}: { fnId?: string; title: string; sub?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      {fnId && <ConflictNote id={fnId} />}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

/** 二次验证码 — every destructive ops action asks for it. */
function TwoFa({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={value} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6 位谷歌验证码" inputMode="numeric"
        className={cn(FIELD, 'w-44 tnum tracking-[0.3em] font-mono')}
      />
      <span className="text-2xs text-faint">谷歌验证器 · 操作将记入管理员操作日志</span>
    </div>
  )
}

/** CSS-drawn image placeholder — no remote images anywhere in this prototype. */
const GRADS = [
  'from-brand/40 via-brand/20 to-info/25',
  'from-info/40 via-info/20 to-up/25',
  'from-up/30 via-up/10 to-brand/25',
  'from-down/30 via-warn/20 to-brand/20',
  'from-warn/40 via-warn/10 to-down/20',
  'from-info/30 via-brand/20 to-down/25',
]
function Thumb({
  grad, label, className, ratio = 'aspect-[16/6]',
}: { grad: string; label?: string; className?: string; ratio?: string }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border border-line bg-gradient-to-br grid place-items-center',
      grad, ratio, className,
    )}>
      {/* faux content blocks — reads as an image without being one */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[8%] top-[26%] h-1.5 w-[34%] rounded-full bg-ink/20" />
        <div className="absolute left-[8%] top-[46%] h-1 w-[22%] rounded-full bg-ink/10" />
        <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-ink/10" />
      </div>
      {label && (
        <span className="relative text-2xs font-medium text-ink/70 px-2 text-center leading-tight">{label}</span>
      )}
    </div>
  )
}

const TierBadge = ({ t }: { t: string }) => {
  const tone = t === '钻石' ? 'info' : t === '铂金' ? 'brand' : t === '黄金' ? 'warn' : t === '白银' ? 'up' : 'muted'
  return <Badge tone={tone as any}>{t}</Badge>
}

const COIN_OPTS = COINS.map(c => c.coin)
const OPS_COINS = ['PLT', ...COIN_OPTS]

/* ------------------------------------------------------------------ *
 * 1. Local datasets
 * ------------------------------------------------------------------ */

/* ---- B-39 公告 ---- */
type LangCode = 'zh' | 'en' | 'ja' | 'ko'
const LANGS: { code: LangCode; label: string }[] = [
  { code: 'zh', label: '中' }, { code: 'en', label: '英' },
  { code: 'ja', label: '日' }, { code: 'ko', label: '韩' },
]
type NoticeRow = {
  id: string; title: string; category: string; pinned: boolean
  ts: number; langs: LangCode[]; status: '已发布' | '草稿' | '定时发布'
}
const NOTICE_CATS = ['新币上线', '系统公告', '费率调整', '活动', '安全提示', '维护公告']
const EXTRA_NOTICES = [
  '关于 DOGE 充提暂停维护的公告', '现货交易手续费阶梯调整通知', '关于清理长期未使用 API Key 的公告',
  '合约资金费率结算周期调整为 8 小时', '新增韩语站点上线公告', '关于 XRP 链升级暂停充提的公告',
  '平台币 PLT 持仓奖励活动第 12 期开启', 'APP v1.5.0 版本更新说明', '关于打击市场操纵行为的声明',
  '新用户注册赠 20 USDT 活动规则', '关于杠杆交易利率调整的通知', '季度交易大赛报名开启',
  '关于账户安全与防钓鱼码设置的提醒', '每周系统维护窗口调整通知',
]
const NOTICE_ROWS: NoticeRow[] = [
  ...NOTICES.map((n, i) => ({
    id: n.id, title: n.title, category: n.category, pinned: !!n.pinned, ts: n.ts,
    langs: (i % 3 === 0 ? ['zh', 'en', 'ja', 'ko'] : i % 3 === 1 ? ['zh', 'en'] : ['zh', 'en', 'ja']) as LangCode[],
    status: '已发布' as const,
  })),
  ...EXTRA_NOTICES.map((title, i) => ({
    id: `N${100 + i}`,
    title,
    category: rpick(NOTICE_CATS),
    pinned: i === 1,
    ts: dayAgo(rint(1, 60)),
    langs: (R() > 0.55 ? ['zh', 'en', 'ja', 'ko'] : R() > 0.4 ? ['zh', 'en'] : ['zh']) as LangCode[],
    status: (i % 6 === 4 ? '草稿' : i % 6 === 5 ? '定时发布' : '已发布') as NoticeRow['status'],
  })),
]

/* ---- B-40 文章 ---- */
const ART_CATS = ['新手指南', '充值提现', '交易指南', '合约交易', 'API 文档', '安全中心', '费用说明']
const ART_AUTHORS = ['陈运营', '刘客服', '王审核', '张财务', 'admin']
const ART_TITLES = [
  '如何完成实名认证 (KYC Level 2)', '充值未到账怎么办？排查指南', 'USDT 各链充值须知：TRC20 / ERC20 / BEP20',
  '什么是限价单与市价单', '合约爆仓价格是如何计算的', '标记价格与指数价格的区别',
  '资金费率机制详解', '如何开启谷歌验证器 (2FA)', '防钓鱼码设置指南', 'API Key 创建与权限说明',
  'WebSocket 行情订阅入门', '手续费费率表与 VIP 等级', '平台币 PLT 抵扣手续费规则',
  '邀请返佣计划规则说明', '持仓奖励活动常见问题', '锁仓资产可以交易吗？',
  '提现审核需要多久', '如何找回丢失的谷歌验证器', '子账户功能使用说明', '杠杆交易利息如何计算',
  '交易大赛排名规则', '法币通道支持的国家与地区', '如何导出交易与资金流水', '账户被冻结的常见原因',
  '新手 7 日任务与奖励', '风险提示：谨防虚假客服诈骗',
]
type ArticleRow = {
  id: string; title: string; category: string; author: string
  views: number; ts: number; status: '已发布' | '草稿'; grad: string
}
const ARTICLES: ArticleRow[] = ART_TITLES.map((title, i) => ({
  id: `A${200 + i}`,
  title,
  category: ART_CATS[i % ART_CATS.length],
  author: rpick(ART_AUTHORS),
  views: rint(120, 48_000),
  ts: dayAgo(rint(0, 180)),
  status: (i % 7 === 3 ? '草稿' : '已发布') as ArticleRow['status'],
  grad: GRADS[i % GRADS.length],
}))

/* ---- B-41 文章分类 ---- */
type Cat = { id: string; name: string; slug: string; sort: number; count: number; visible: boolean; children: Cat[] }
const mkCat = (id: string, name: string, slug: string, sort: number, count: number, visible = true, children: Cat[] = []): Cat =>
  ({ id, name, slug, sort, count, visible, children })
const CATEGORY_TREE: Cat[] = [
  mkCat('c1', '帮助中心', 'help-center', 1, 0, true, [
    mkCat('c1-1', '新手指南', 'getting-started', 1, 12, true),
    mkCat('c1-2', '账户与安全', 'account-security', 2, 9, true),
    mkCat('c1-3', '充值与提现', 'deposit-withdraw', 3, 14, true),
    mkCat('c1-4', '常见问题 FAQ', 'faq', 4, 26, true),
  ]),
  mkCat('c2', '交易学院', 'academy', 2, 0, true, [
    mkCat('c2-1', '现货交易', 'spot', 1, 11, true),
    mkCat('c2-2', '合约交易', 'futures', 2, 18, true),
    mkCat('c2-3', '杠杆交易', 'margin', 3, 6, false),
  ]),
  mkCat('c3', '公告中心', 'announcements', 3, 0, true, [
    mkCat('c3-1', '新币上线', 'listing', 1, 21, true),
    mkCat('c3-2', '系统维护', 'maintenance', 2, 8, true),
    mkCat('c3-3', '费率调整', 'fee-change', 3, 5, true),
    mkCat('c3-4', '活动公告', 'campaign', 4, 17, true),
  ]),
  mkCat('c4', '开发者文档', 'developers', 4, 0, true, [
    mkCat('c4-1', 'REST API', 'rest-api', 1, 24, true),
    mkCat('c4-2', 'WebSocket', 'websocket', 2, 10, true),
    mkCat('c4-3', 'SDK 与示例', 'sdk', 3, 4, true),
  ]),
  mkCat('c5', '法律与合规', 'legal', 5, 0, true, [
    mkCat('c5-1', '用户协议', 'terms', 1, 3, true),
    mkCat('c5-2', '隐私政策', 'privacy', 2, 2, true),
    mkCat('c5-3', 'KYC / AML 政策', 'kyc-aml', 3, 4, true),
  ]),
]
CATEGORY_TREE.forEach(p => { p.count = p.children.reduce((s, c) => s + c.count, 0) })

/* ---- B-42 站内信 ---- */
type InboxRow = {
  id: string; title: string; kind: '系统' | '充提' | 'KYC' | '安全'
  target: string; sent: number; readRate: number; ts: number
  status: '已发送' | '草稿' | '定时发送' | '发送中'
}
const INBOX_TITLES = [
  ...INBOX.map(m => m.title),
  '系统维护公告：7 月 20 日 02:00–04:00 暂停交易',
  '您有一张 20 USDT 手续费抵扣券待领取',
  '关于近期虚假客服诈骗的安全提醒',
  '实名认证升级 Level 2，提现额度提升至 200 BTC/日',
  '持仓奖励第 11 期分红已发放，请查收',
  '您的 API Key 将于 7 日后到期，请及时更新',
  '合约资金费率结算规则调整通知',
  '邀请好友注册，双方各得 10 USDT',
  '风险提示：您的仓位保证金率已低于 20%',
  '新版本 APP 已发布，建议立即升级',
  '您的提现申请已进入人工审核队列',
]
const INBOX_TARGETS = ['全体用户', '指定 UID (2,418)', '用户分组：VIP≥3', '用户分组：已认证用户', '用户分组：近 30 日活跃', '指定 UID (86)']
const INBOX_ROWS: InboxRow[] = INBOX_TITLES.map((title, i) => {
  const sent = rint(86, 128_400)
  return {
    id: `IM${300 + i}`,
    title,
    kind: (['系统', '充提', 'KYC', '安全'] as const)[i % 4],
    target: rpick(INBOX_TARGETS),
    sent,
    readRate: rfloat(18, 94, 1),
    ts: dayAgo(rint(0, 40)),
    status: (i % 8 === 5 ? '草稿' : i % 8 === 6 ? '定时发送' : i % 8 === 7 ? '发送中' : '已发送') as InboxRow['status'],
  }
})

/* ---- B-43 / B-44 轮播图 ---- */
type BannerRow = {
  id: string; title: string; link: string; sort: number; platform: string
  status: string; start: string; end: string; grad: string; clicks: number
}
const EXTRA_BANNERS = [
  { id: 'BN6', title: '现货 0 手续费限时活动', link: '/activity/zero-fee', sort: 4, platform: 'PC',  status: '已发布', start: '2026-07-08', end: '2026-08-08' },
  { id: 'BN7', title: 'PLT 持仓奖励第 12 期',  link: '/ops/holding',      sort: 5, platform: 'PC',  status: '已发布', start: '2026-07-01', end: '2026-07-31' },
  { id: 'BN8', title: 'API 交易大赛 · 30 万奖池', link: '/activity/api',   sort: 6, platform: 'PC',  status: '已下架', start: '2026-05-01', end: '2026-06-01' },
  { id: 'BN9', title: '新手 7 日任务领 60 USDT', link: '/tasks',          sort: 3, platform: 'APP', status: '已发布', start: '2026-07-02', end: '2026-08-02' },
  { id: 'BN10', title: 'APP 独家：图案锁上线',    link: '/security',       sort: 4, platform: 'APP', status: '草稿',   start: '2026-07-18', end: '2026-08-18' },
  { id: 'BN11', title: '法币通道支持 HKD 入金',   link: '/fiat',           sort: 5, platform: 'APP', status: '已发布', start: '2026-06-20', end: '2026-09-20' },
]
const BANNER_ROWS: BannerRow[] = [...BANNERS, ...EXTRA_BANNERS].map((b, i) => ({
  ...b,
  grad: GRADS[i % GRADS.length],
  clicks: rint(1_200, 84_000),
}))

/* ---- B-45 工单会话 ---- */
const USER_MSGS: Record<Ticket['category'], string[]> = {
  '充提问题': [
    '我在 3 小时前通过 TRC20 充值了 500 USDT，链上已经 20/20 确认，但账户余额一直没有变化，麻烦帮忙查一下。',
    '这是 TXID：0x8f2a…c41d。我另外一笔提现也卡在「处理中」超过 6 小时了，一起看下可以吗？',
  ],
  '交易问题': [
    'BTC/USDT 永续我开的 20x 多头，系统显示强平价 89,412，但我自己按开仓价和维持保证金率算出来是 88,900，差了 500 多。',
    '如果强平价是按标记价格（指数价格）而不是最新成交价计算的，那我理解错了，麻烦确认一下计算口径。',
  ],
  '账户安全': [
    '我换了手机，谷歌验证器没有备份密钥，现在登录不了，请协助解绑 2FA。',
    '我可以提供身份证正反面和手持证件的人脸视频，按你们的流程走都可以，麻烦尽快，我有仓位在里面。',
  ],
  'KYC': [
    '我提交了三次实名认证都被驳回，提示「证件模糊」，但我用的是原图，肉眼看非常清晰。',
    '请问具体是哪一项不合格？是活体检测分数还是证件照本身？我需要一个明确的修改方向。',
  ],
  '其他': [
    '我的返佣佣金在经纪人页面显示「已结算 128.44 USDT」，但资金账户里没有到账，流水里也查不到。',
    '结算时间显示是昨天 02:00，已经超过 24 小时了。',
  ],
}
const CS_MSGS: Record<Ticket['category'], string[]> = {
  '充提问题': [
    '您好，工单已受理。经初查，该笔充值因链上扫描任务（每 10 秒）在昨日 14:20–14:50 出现故障未及时入账，我们正在人工补单。',
    '已手动补入 500 USDT，请刷新资产页面确认。提现单已重新提交审核，预计 30 分钟内到账。给您带来不便非常抱歉。',
  ],
  '交易问题': [
    '您好，永续合约的强平价、未实现盈亏均以「标记价格」计算，标记价格取自多家外部交易所的指数价格，而非本平台最新成交价，以防止插针恶意爆仓。',
    '按标记价格代入公式复核，强平价 89,412 是正确的。已将详细计算过程通过站内信发送给您，可在「帮助中心 → 合约交易」查看完整说明。',
  ],
  '账户安全': [
    '您好，2FA 解绑属于高风险操作，需要人工审核。请在工单中上传：① 证件正反面 ② 手持证件人脸视频 ③ 最近一次登录的 IP 与设备。',
    '资料已收到并通过审核，2FA 已解绑，账户将进入 24 小时提现冷静期（安全策略）。请尽快重新绑定验证器。',
  ],
  'KYC': [
    '您好，已调取您的三次提交记录。驳回原因为活体检测分数 68 分（低于 75 分阈值），系统提示文案不够准确，我们会反馈优化。',
    '建议在光线充足、无逆光环境下重新录制活体视频，并摘掉眼镜。已为您重置提交次数限制，可立即重新提交。',
  ],
  '其他': [
    '您好，已查询到该笔返佣。昨日 02:00 的返佣结算任务执行时长 8.4 秒但有 2 个批次超时重试，您的记录落在重试批次中。',
    '128.44 USDT 已补发至您的资金账户，流水类型「返佣」，请查收。',
  ],
}
type ChatMsg = { from: '用户' | '客服'; name: string; ts: number; text: string }
const threadFor = (t: Ticket): ChatMsg[] => {
  const i = TICKETS.findIndex(x => x.id === t.id)
  const u = USER_MSGS[t.category]
  const c = CS_MSGS[t.category]
  const base = parseTs(t.createdAt)
  const cs = t.assignee ?? '刘客服'
  const seq: ChatMsg[] = [
    { from: '用户', name: `UID ${t.uid}`, ts: base, text: u[0] },
    { from: '客服', name: cs, ts: base + 2.4 * 3_600_000, text: c[0] },
    { from: '用户', name: `UID ${t.uid}`, ts: base + 5.1 * 3_600_000, text: u[1] },
    { from: '客服', name: cs, ts: base + 7.8 * 3_600_000, text: c[1] },
  ]
  return seq.slice(0, 2 + (i % 3))
}

/* ---- B-46 媒体库 ---- */
type Media = {
  id: string; name: string; type: '轮播图' | '文章配图' | '图标' | '活动页'
  kb: number; w: number; h: number; ts: number; grad: string; url: string
}
const MEDIA: Media[] = Array.from({ length: 24 }, (_, i) => {
  const type = (['轮播图', '文章配图', '图标', '活动页'] as const)[i % 4]
  const [w, h] = type === '轮播图' ? [1920, 640] : type === '图标' ? [128, 128] : type === '活动页' ? [1200, 1600] : [1280, 720]
  return {
    id: `MD${400 + i}`,
    name: `${type === '轮播图' ? 'banner' : type === '图标' ? 'icon' : type === '活动页' ? 'campaign' : 'article'}-${2026}${String(rint(1, 7)).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}.${type === '图标' ? 'svg' : 'webp'}`,
    type,
    kb: type === '图标' ? rint(3, 24) : rint(84, 1_840),
    w, h,
    ts: dayAgo(rint(0, 90)),
    grad: GRADS[i % GRADS.length],
    url: `https://cdn.exchange.io/assets/${type}/${String(i + 1).padStart(3, '0')}`,
  }
})

/* ---- B-47/B-48 赠币 ---- */
const GIFT_ROWS = GIFT_LOG.map((g, i) => ({
  ...g,
  status: (i % 9 === 4 ? '处理中' : '已完成') as string,
  lockDays: g.locked ? [30, 60, 90, 180][i % 4] : 0,
}))
type GiftBatch = { batch: string; coin: string; users: number; total: number; reason: string; operator: string; ts: string; status: string }
const GIFT_BATCHES: GiftBatch[] = (() => {
  const m = new Map<string, GiftBatch>()
  GIFT_ROWS.forEach(g => {
    const cur = m.get(g.batch)
    if (cur) { cur.users += 1; cur.total += g.amount }
    else m.set(g.batch, { batch: g.batch, coin: g.coin, users: 1, total: g.amount, reason: g.reason, operator: g.operator, ts: g.ts, status: g.status })
  })
  return [...m.values()].sort((a, b) => (a.ts < b.ts ? 1 : -1))
})()

/* ---- B-49…B-53 持仓奖励 ---- */
type Tier = { id: string; from: number; to: number; apr: number }
const HOLD_TIERS: Tier[] = [
  { id: 'T1', from: 100,     to: 1_000,    apr: 3.0 },
  { id: 'T2', from: 1_000,   to: 10_000,   apr: 5.5 },
  { id: 'T3', from: 10_000,  to: 50_000,   apr: 8.0 },
  { id: 'T4', from: 50_000,  to: 200_000,  apr: 11.0 },
  { id: 'T5', from: 200_000, to: 1_000_000, apr: 14.5 },
]
type HoldActivity = {
  id: string; name: string; coin: string; snapshot: string
  users: number; totalHold: number; payout: number; apr: number
  status: '已结束' | '进行中' | '待开始'
}
const HOLD_ACTIVITIES: HoldActivity[] = Array.from({ length: 14 }, (_, i) => {
  const period = 14 - i
  const users = rint(1_800, 12_400)
  const totalHold = rfloat(4_800_000, 28_000_000, 2)
  const apr = rfloat(6, 15, 1)
  return {
    id: `HA${500 + i}`,
    name: `PLT 持仓奖励第 ${period} 期`,
    coin: i % 5 === 0 ? 'USDT' : 'PLT',
    snapshot: dtstr(dayAgo(i * 7 + 1)) + ':00',
    users,
    totalHold,
    payout: +(totalHold * (apr / 100) / 365 * 7).toFixed(2),
    apr,
    status: (i === 0 ? '进行中' : '已结束') as HoldActivity['status'],
  }
})
HOLD_ACTIVITIES.push({
  id: 'HA599', name: 'PLT 持仓奖励第 15 期', coin: 'PLT', snapshot: dtstr(dayAgo(-6)) + ':00',
  users: 0, totalHold: 0, payout: 0, apr: 12.0, status: '待开始',
})

const TOTAL_HOLD = HOLDERS.reduce((s, h) => s + h.amount, 0)
const TOTAL_LOCKED = HOLDERS.reduce((s, h) => s + h.lockedAmount, 0)
const TOP10_HOLD = [...HOLDERS].sort((a, b) => b.amount - a.amount).slice(0, 10)
const TOP10_SHARE = (TOP10_HOLD.reduce((s, h) => s + h.amount, 0) / TOTAL_HOLD) * 100
const TIER_NAMES = ['青铜', '白银', '黄金', '铂金', '钻石']
const TIER_STATS = TIER_NAMES.map(t => {
  const rows = HOLDERS.filter(h => h.tier === t)
  const amount = rows.reduce((s, h) => s + h.amount, 0)
  return {
    tier: t,
    users: rows.length,
    amount,
    share: TOTAL_HOLD ? (amount / TOTAL_HOLD) * 100 : 0,
    dividend: rows.reduce((s, h) => s + h.dividend30d, 0),
  }
})
const HOLD_30D = Array.from({ length: 30 }, (_, i) =>
  Math.floor(9_800_000 + i * 118_000 + R() * 1_600_000))

type Dividend = {
  id: string; batch: string; snapshot: string; coin: string; users: number
  totalHold: number; apr: number; payout: number; perUnit: number; status: string
}
const DIVIDENDS: Dividend[] = HOLD_ACTIVITIES.filter(a => a.status !== '待开始').map((a, i) => ({
  id: `DV${600 + i}`,
  batch: `DIV-2026-${String(14 - i).padStart(3, '0')}`,
  snapshot: a.snapshot,
  coin: a.coin,
  users: a.users,
  totalHold: a.totalHold,
  apr: a.apr,
  payout: a.payout,
  perUnit: +(a.payout / a.totalHold).toFixed(8),
  status: i === 0 ? '处理中' : '已完成',
}))

/* ---- B-54/B-55/B-56 锁仓 ---- */
type LockMode = '到期一次性' | '线性释放' | '分批释放'
type LockRec = {
  id: string; uid: string; coin: string; amount: number; released: number
  start: string; end: string; days: number; mode: LockMode
  source: '赠币' | '手动锁仓' | '活动奖励'
  status: '锁仓中' | '释放中' | '已释放'
}
const LOCK_RECS: LockRec[] = Array.from({ length: 24 }, (_, i) => {
  const days = [30, 60, 90, 180, 365][i % 5]
  const elapsed = rint(1, days + 20)
  const startTs = dayAgo(elapsed)
  const mode: LockMode = (['到期一次性', '线性释放', '分批释放'] as const)[i % 3]
  const amount = rfloat(500, 68_000, 2)
  const prog = Math.min(1, elapsed / days)
  const released =
    mode === '到期一次性' ? (prog >= 1 ? amount : 0)
    : mode === '线性释放' ? +(amount * prog).toFixed(2)
    : +(amount * (Math.floor(prog * 4) / 4)).toFixed(2)
  return {
    id: `LK${700 + i}`,
    uid: ADMIN_USERS[i % ADMIN_USERS.length].uid,
    coin: i % 4 === 0 ? 'USDT' : 'PLT',
    amount,
    released,
    start: dstr(startTs),
    end: dstr(startTs + days * DAY),
    days,
    mode,
    source: (['赠币', '手动锁仓', '活动奖励'] as const)[i % 3],
    status: (released >= amount ? '已释放' : released > 0 ? '释放中' : '锁仓中') as LockRec['status'],
  }
})

type GiftLockRow = {
  id: string; batch: string; uid: string; coin: string; amount: number
  lockDays: number; progress: number; available: number; remaining: number
  end: string; reason: string
}
const GIFT_LOCKS: GiftLockRow[] = GIFT_ROWS.filter(g => g.locked).map(g => {
  const startTs = parseTs(g.ts)
  const elapsed = Math.max(0, (Date.now() - startTs) / DAY)
  const progress = Math.min(100, (elapsed / g.lockDays) * 100)
  const available = +(g.amount * (progress / 100)).toFixed(2)
  return {
    id: g.id,
    batch: g.batch,
    uid: g.uid,
    coin: g.coin,
    amount: g.amount,
    lockDays: g.lockDays,
    progress,
    available,
    remaining: +(g.amount - available).toFixed(2),
    end: dstr(startTs + g.lockDays * DAY),
    reason: g.reason,
  }
})

/* ================================================================== *
 * B-39 公告管理
 * ================================================================== */
export function CmsNotices() {
  const [pin, setPin] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NOTICE_ROWS.map(n => [n.id, n.pinned])),
  )
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<LangCode>('zh')
  const [draft, setDraft] = useState<Record<LangCode, { title: string; body: string }>>({
    zh: { title: '', body: '' }, en: { title: '', body: '' },
    ja: { title: '', body: '' }, ko: { title: '', body: '' },
  })
  const [top, setTop] = useState(false)

  const cols: Col<NoticeRow>[] = [
    {
      key: 'title', header: '标题', cell: r => (
        <div className="flex items-center gap-2 max-w-[26rem]">
          {pin[r.id] && <Badge tone="brand">置顶</Badge>}
          <span className="truncate">{r.title}</span>
        </div>
      ),
    },
    { key: 'cat', header: '分类', cell: r => <Badge tone="info">{r.category}</Badge> },
    {
      key: 'pin', header: '置顶', align: 'center',
      cell: r => <Toggle checked={!!pin[r.id]} onChange={v => setPin(s => ({ ...s, [r.id]: v }))} />,
    },
    { key: 'ts', header: '发布时间', cell: r => <Mono className="text-muted">{fmtDateTime(r.ts)}</Mono> },
    {
      key: 'langs', header: '语言', cell: r => (
        <div className="flex gap-1">
          {LANGS.map(l => (
            <span
              key={l.code}
              title={r.langs.includes(l.code) ? '已翻译' : '未翻译'}
              className={cn(
                'w-5 h-5 grid place-items-center rounded text-2xs font-medium border',
                r.langs.includes(l.code)
                  ? 'border-up/30 bg-up/10 text-up'
                  : 'border-line bg-elevated text-faint',
              )}
            >
              {l.label}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    {
      key: 'act', header: '操作', align: 'right', cell: () => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost"><Pencil className="w-3.5 h-3.5" />编辑</Button>
          <Button size="sm" variant="ghost" className="text-down hover:text-down">
            <Trash2 className="w-3.5 h-3.5" />删除
          </Button>
        </div>
      ),
    },
  ]

  const done = LANGS.filter(l => draft[l.code].title.trim()).length

  return (
    <>
      <ListPage<NoticeRow>
        fnId="B-39"
        title="公告管理"
        sub="公告支持中/英/日/韩四语言包，未翻译语言前台回退至中文"
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索标题…', width: 'w-56' },
          { type: 'select', key: 'cat', label: '全部分类', options: NOTICE_CATS },
          { type: 'select', key: 'status', label: '全部状态', options: ['已发布', '草稿', '定时发布'] },
        ]}
        match={(r, s) =>
          (!s.q || r.title.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.cat || r.category === s.cat) &&
          (!s.status || r.status === s.status)
        }
        cols={cols}
        rows={NOTICE_ROWS}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" />发布公告</Button>
          </div>
        }
      />

      <Modal
        open={open} onClose={() => setOpen(false)} title="发布公告" width="max-w-2xl"
        footer={
          <div className="flex items-center gap-2">
            <span className="text-2xs text-faint">已填写 {done}/4 语言 · 未填写语言前台回退至中文</span>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setOpen(false)}>存为草稿</Button>
            <Button disabled={!draft.zh.title.trim()} onClick={() => setOpen(false)}>发布</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="分类" options={NOTICE_CATS.map(c => ({ value: c, label: c }))} defaultValue="新币上线" />
            <div>
              <div className="text-xs text-muted mb-1.5">定时发布</div>
              <input type="datetime-local" className={FIELD} defaultValue="2026-07-15T12:00" />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-elevated border border-line">
            <div>
              <div className="text-xs font-medium">置顶公告</div>
              <div className="text-2xs text-faint mt-0.5">置顶公告固定显示在公告列表与首页跑马灯</div>
            </div>
            <Toggle checked={top} onChange={setTop} />
          </div>

          {/* 多语言编辑器 — 语言包要求 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium">多语言内容</div>
              <span className="text-2xs text-faint">中文为必填主语言</span>
            </div>
            <div className="flex gap-1 p-0.5 bg-elevated rounded-lg mb-3">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'flex-1 px-3 py-1.5 rounded-md text-xs transition-colors flex items-center justify-center gap-1.5',
                    lang === l.code ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink',
                  )}
                >
                  {l.label}
                  {draft[l.code].title.trim()
                    ? <Check className="w-3 h-3 text-up" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-faint" />}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <Input
                label={`标题 (${LANGS.find(l => l.code === lang)!.label})`}
                value={draft[lang].title}
                placeholder={lang === 'zh' ? '关于上线 SUI/USDT 永续合约的公告' : 'Listing of SUI/USDT Perpetual'}
                onChange={e => setDraft(d => ({ ...d, [lang]: { ...d[lang], title: e.target.value } }))}
              />
              <div>
                <div className="text-xs text-muted mb-1.5">正文 ({LANGS.find(l => l.code === lang)!.label})</div>
                <textarea
                  rows={7}
                  value={draft[lang].body}
                  onChange={e => setDraft(d => ({ ...d, [lang]: { ...d[lang], body: e.target.value } }))}
                  placeholder="支持 Markdown。平台将于 2026-07-15 12:00 (UTC+8) 上线 …"
                  className={AREA}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-40 文章管理
 * ================================================================== */
export function CmsArticles() {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')

  const cols: Col<ArticleRow>[] = [
    {
      key: 'title', header: '标题', cell: r => (
        <div className="flex items-center gap-2.5 max-w-[24rem]">
          <div className={cn('w-9 h-6 rounded border border-line bg-gradient-to-br shrink-0', r.grad)} />
          <span className="truncate">{r.title}</span>
        </div>
      ),
    },
    { key: 'cat', header: '分类', cell: r => <Badge tone="info">{r.category}</Badge> },
    { key: 'author', header: '作者', cell: r => <span className="text-muted">{r.author}</span> },
    { key: 'views', header: '浏览量', align: 'right', cell: r => <span className="tnum">{num(r.views, 0)}</span> },
    { key: 'ts', header: '发布时间', cell: r => <Mono className="text-muted">{fmtDateTime(r.ts)}</Mono> },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    {
      key: 'act', header: '操作', align: 'right', cell: () => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" />预览</Button>
          <Button size="sm" variant="ghost"><Pencil className="w-3.5 h-3.5" />编辑</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage<ArticleRow>
        fnId="B-40"
        title="文章管理"
        sub="帮助中心 / 交易学院 / 开发者文档正文内容"
        stats={[
          { label: '文章总数', value: num(ARTICLES.length, 0), hint: `${ARTICLES.filter(a => a.status === '草稿').length} 篇草稿` },
          { label: '总浏览量', value: compact(ARTICLES.reduce((s, a) => s + a.views, 0)), delta: 8.4 },
          { label: '本月新增', value: '6', hint: '目标 10 篇' },
          { label: '平均阅读时长', value: '2m 41s', delta: 3.1 },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索标题…', width: 'w-56' },
          { type: 'select', key: 'cat', label: '全部分类', options: ART_CATS },
          { type: 'select', key: 'status', label: '全部状态', options: ['已发布', '草稿'] },
        ]}
        match={(r, s) =>
          (!s.q || r.title.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.cat || r.category === s.cat) &&
          (!s.status || r.status === s.status)
        }
        cols={cols}
        rows={ARTICLES}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" />新建文章</Button>
          </div>
        }
      />

      <Modal
        open={open} onClose={() => setOpen(false)} title="新建文章" width="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>存为草稿</Button>
            <Button onClick={() => setOpen(false)}>发布</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="标题" placeholder="如何完成实名认证 (KYC Level 2)" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="分类" options={ART_CATS.map(c => ({ value: c, label: c }))} />
            <Select label="作者" options={ART_AUTHORS.map(a => ({ value: a, label: a }))} />
          </div>

          <div>
            <div className="text-xs text-muted mb-1.5">封面图</div>
            <div className="flex items-center gap-3">
              <div className="w-32 h-20 rounded-lg border border-dashed border-line bg-elevated grid place-items-center text-faint hover:border-brand transition-colors cursor-pointer">
                <div className="text-center">
                  <ImageIcon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-2xs">点击上传</span>
                </div>
              </div>
              <div className="text-2xs text-faint leading-relaxed">
                建议 1280×720，JPG / PNG / WebP<br />单张不超过 2 MB
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="text-xs text-muted flex-1">正文</div>
              <div className="flex items-center gap-0.5">
                {['B', 'I', 'H2', '“”', '</>' ].map(t => (
                  <button
                    key={t}
                    className="h-6 min-w-6 px-1.5 rounded text-2xs text-muted hover:bg-elevated hover:text-ink transition-colors font-medium"
                  >
                    {t}
                  </button>
                ))}
                <button className="h-6 px-1.5 rounded text-muted hover:bg-elevated hover:text-ink transition-colors">
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button className="h-6 px-1.5 rounded text-muted hover:bg-elevated hover:text-ink transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              rows={10} value={body} onChange={e => setBody(e.target.value)}
              placeholder={'## 认证前准备\n\n请准备好证件原件，并在光线充足的环境下操作…'}
              className={cn(AREA, 'font-mono text-xs leading-relaxed')}
            />
            <div className="flex justify-between mt-1.5 text-2xs text-faint">
              <span>支持 Markdown</span>
              <span className="tnum">{body.length} 字符</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-41 文章分类配置 — nested tree
 * ================================================================== */
export function CmsCategories() {
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORY_TREE.map(c => [c.id, true])),
  )
  const [vis, setVis] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {}
    CATEGORY_TREE.forEach(p => {
      v[p.id] = p.visible
      p.children.forEach(c => { v[c.id] = c.visible })
    })
    return v
  })
  const [q, setQ] = useState('')
  const [add, setAdd] = useState(false)

  const tree = useMemo(() => {
    if (!q.trim()) return CATEGORY_TREE
    const k = q.toLowerCase()
    return CATEGORY_TREE
      .map(p => {
        const kids = p.children.filter(c => c.name.toLowerCase().includes(k) || c.slug.includes(k))
        const self = p.name.toLowerCase().includes(k) || p.slug.includes(k)
        return self ? p : kids.length ? { ...p, children: kids } : null
      })
      .filter(Boolean) as Cat[]
  }, [q])

  const totalCats = CATEGORY_TREE.length + CATEGORY_TREE.reduce((s, p) => s + p.children.length, 0)
  const totalArticles = CATEGORY_TREE.reduce((s, p) => s + p.count, 0)

  const Row = ({ c, child }: { c: Cat; child?: boolean }) => (
    <div
      className={cn(
        'grid grid-cols-[1fr_9rem_4rem_5rem_5rem_8rem] items-center gap-2 px-4 py-2.5 transition-colors hover:bg-elevated/60',
        child && 'bg-elevated/30',
      )}
    >
      <div className={cn('flex items-center gap-1.5 min-w-0', child && 'pl-7')}>
        {!child ? (
          <button
            onClick={() => setOpen(s => ({ ...s, [c.id]: !s[c.id] }))}
            className="w-5 h-5 grid place-items-center rounded text-muted hover:text-ink hover:bg-elevated transition-colors shrink-0"
          >
            {open[c.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3 h-3 border-l border-b border-line rounded-bl shrink-0 mr-1" />
        )}
        {child
          ? <FileText className="w-3.5 h-3.5 text-faint shrink-0" />
          : <Folder className="w-3.5 h-3.5 text-brand shrink-0" />}
        <span className={cn('truncate text-sm', !child && 'font-medium')}>{c.name}</span>
        {!child && <Badge tone="muted">{c.children.length} 子分类</Badge>}
      </div>
      <Mono className="text-muted truncate">{c.slug}</Mono>
      <span className="text-xs text-muted tnum text-center">{c.sort}</span>
      <span className="text-xs tnum text-center">{num(c.count, 0)}</span>
      <div className="flex justify-center">
        <Toggle checked={!!vis[c.id]} onChange={v => setVis(s => ({ ...s, [c.id]: v }))} />
      </div>
      <div className="flex items-center justify-end gap-1">
        {!child && (
          <Button size="sm" variant="ghost" onClick={() => setAdd(true)}>
            <Plus className="w-3.5 h-3.5" />子分类
          </Button>
        )}
        <Button size="sm" variant="ghost"><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="sm" variant="ghost" className="text-down hover:text-down"><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  )

  return (
    <PageShell
      fnId="B-41"
      title="文章分类配置"
      sub="两级分类树 — 顶级分类不直接挂文章，仅作为导航分组"
      actions={
        <>
          <SearchBox value={q} onChange={e => setQ(e.target.value)} placeholder="搜索分类 / 别名…" className="w-52" />
          <Button size="sm" variant="outline" onClick={() => setOpen(Object.fromEntries(CATEGORY_TREE.map(c => [c.id, true])))}>
            全部展开
          </Button>
          <Button size="sm" onClick={() => setAdd(true)}><Plus className="w-4 h-4" />新增分类</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="分类总数" value={num(totalCats, 0)} hint={`${CATEGORY_TREE.length} 个顶级分类`} />
        <Stat label="文章总数" value={num(totalArticles, 0)} hint="含草稿" />
        <Stat label="已隐藏分类" value={num(Object.values(vis).filter(v => !v).length, 0)} hint="前台不展示" />
        <Stat label="空分类" value="0" hint="无文章的分类" />
      </div>

      <Card>
        <div className="grid grid-cols-[1fr_9rem_4rem_5rem_5rem_8rem] gap-2 px-4 py-2 border-b border-line text-2xs text-muted font-medium">
          <span>分类名</span>
          <span>别名 (slug)</span>
          <span className="text-center">排序</span>
          <span className="text-center">文章数</span>
          <span className="text-center">显示</span>
          <span className="text-right">操作</span>
        </div>
        <div className="divide-y divide-line/60">
          {tree.length === 0 && <div className="py-16 text-center text-xs text-faint">没有匹配的分类</div>}
          {tree.map(p => (
            <div key={p.id} className="divide-y divide-line/60">
              <Row c={p} />
              {open[p.id] && p.children.map(c => <Row key={c.id} c={c} child />)}
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-line text-2xs text-faint">
          共 {tree.length} 个顶级分类 · 拖拽可调整排序（原型中以「排序」字段代替）
        </div>
      </Card>

      <Modal
        open={add} onClose={() => setAdd(false)} title="新增分类"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdd(false)}>取消</Button>
            <Button onClick={() => setAdd(false)}>确认新增</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="父分类"
            options={[{ value: '', label: '— 顶级分类 —' }, ...CATEGORY_TREE.map(c => ({ value: c.id, label: c.name }))]}
          />
          <Input label="分类名" placeholder="例如：合约交易" />
          <Input label="别名 (slug)" placeholder="futures" className="font-mono" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="排序" type="number" defaultValue={1} />
            <Select label="显示" options={[{ value: '1', label: '显示' }, { value: '0', label: '隐藏' }]} />
          </div>
          <div className="text-2xs text-faint leading-relaxed">
            别名用于前台 URL（/help/&lt;slug&gt;），创建后不建议修改，否则已发布链接将 404。
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}

/* ================================================================== *
 * B-42 站内信管理
 * ================================================================== */
export function CmsInbox() {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<'all' | 'uid' | 'cond'>('all')
  const [uids, setUids] = useState('')
  const [vip, setVip] = useState('')
  const [kyc, setKyc] = useState('')
  const [since, setSince] = useState('')

  const estimate = useMemo(() => {
    if (target === 'all') return ADMIN_USERS.length * 1_842
    if (target === 'uid') return uids.split(/[\s,;\n]+/).filter(Boolean).length
    const rows = ADMIN_USERS.filter(u =>
      (!vip || u.vip >= +vip.replace(/\D/g, '')) &&
      (!kyc || u.kyc === kyc) &&
      (!since || u.registeredAt.slice(0, 10) >= since),
    )
    return rows.length * 1_842
  }, [target, uids, vip, kyc, since])

  const cols: Col<InboxRow>[] = [
    { key: 'title', header: '标题', cell: r => <span className="block truncate max-w-[24rem]">{r.title}</span> },
    {
      key: 'kind', header: '类型',
      cell: r => <Badge tone={r.kind === '安全' ? 'down' : r.kind === '充提' ? 'up' : r.kind === 'KYC' ? 'warn' : 'info'}>{r.kind}</Badge>,
    },
    { key: 'target', header: '发送对象', cell: r => <span className="text-xs text-muted">{r.target}</span> },
    { key: 'sent', header: '发送数', align: 'right', cell: r => <span className="tnum">{num(r.sent, 0)}</span> },
    { key: 'read', header: '已读率', cell: r => <Bar v={r.readRate} tone="info" /> },
    { key: 'ts', header: '发送时间', cell: r => <Mono className="text-muted">{fmtDateTime(r.ts)}</Mono> },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
  ]

  const avgRead = INBOX_ROWS.reduce((s, r) => s + r.readRate, 0) / INBOX_ROWS.length

  return (
    <>
      <ListPage<InboxRow>
        fnId="B-42"
        title="站内信管理"
        sub="系统通知 / 群发运营消息 — 站内信不发送邮件与短信"
        stats={[
          { label: '本月发送', value: compact(INBOX_ROWS.reduce((s, r) => s + r.sent, 0)), delta: 14.2 },
          { label: '平均已读率', value: `${avgRead.toFixed(1)}%`, delta: -2.1 },
          { label: '待发送', value: num(INBOX_ROWS.filter(r => r.status === '定时发送').length, 0), hint: '定时任务' },
          { label: '草稿', value: num(INBOX_ROWS.filter(r => r.status === '草稿').length, 0) },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索标题…', width: 'w-56' },
          { type: 'select', key: 'kind', label: '全部类型', options: ['系统', '充提', 'KYC', '安全'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['已发送', '发送中', '定时发送', '草稿'] },
        ]}
        match={(r, s) =>
          (!s.q || r.title.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.kind || r.kind === s.kind) &&
          (!s.status || r.status === s.status)
        }
        cols={cols}
        rows={INBOX_ROWS}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
            <Button size="sm" onClick={() => setOpen(true)}><Send className="w-3.5 h-3.5" />群发站内信</Button>
          </div>
        }
      />

      <Modal
        open={open} onClose={() => setOpen(false)} title="群发站内信" width="max-w-2xl"
        footer={
          <div className="flex items-center gap-3">
            <span className="text-2xs text-faint">
              预计送达 <span className="text-ink tnum font-medium">{num(estimate, 0)}</span> 人
            </span>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setOpen(false)}>存为草稿</Button>
            <Button disabled={estimate === 0} onClick={() => setOpen(false)}>确认发送</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="类型" options={['系统', '充提', 'KYC', '安全'].map(k => ({ value: k, label: k }))} />
            <div>
              <div className="text-xs text-muted mb-1.5">定时发送</div>
              <input type="datetime-local" className={FIELD} defaultValue="2026-07-14T09:00" />
            </div>
          </div>

          <Input label="标题" placeholder="系统维护公告：7 月 20 日 02:00–04:00 暂停交易" />

          <div>
            <div className="text-xs text-muted mb-1.5">正文</div>
            <textarea rows={5} className={AREA} placeholder="尊敬的用户：为提升撮合性能，平台将于…" />
          </div>

          <div>
            <div className="text-xs text-muted mb-2">发送对象</div>
            <div className="flex gap-1 p-0.5 bg-elevated rounded-lg mb-3">
              {([['all', '全体用户'], ['uid', '指定 UID'], ['cond', '按条件筛选']] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTarget(k)}
                  className={cn(
                    'flex-1 px-3 py-1.5 rounded-md text-xs transition-colors',
                    target === k ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {target === 'all' && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-warn/5 border border-warn/30">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <p className="text-2xs text-muted leading-relaxed">
                  将向全体 <span className="tnum text-ink">{num(estimate, 0)}</span> 名注册用户发送。
                  全量群发会在 5 分钟内产生大量写入，建议避开撮合高峰期（UTC+8 20:00–24:00）。
                </p>
              </div>
            )}

            {target === 'uid' && (
              <div>
                <textarea
                  rows={4} value={uids} onChange={e => setUids(e.target.value)}
                  placeholder={'每行一个 UID，或用逗号分隔\n81243907\n81882441\n81004218'}
                  className={cn(AREA, 'font-mono text-xs')}
                />
                <div className="text-2xs text-faint mt-1.5 tnum">已识别 {num(estimate, 0)} 个 UID</div>
              </div>
            )}

            {target === 'cond' && (
              <div className="space-y-3 p-3 rounded-lg bg-elevated border border-line">
                <div className="grid sm:grid-cols-3 gap-3">
                  <Select
                    label="VIP 等级 ≥"
                    value={vip} onChange={e => setVip(e.target.value)}
                    options={[{ value: '', label: '不限' }, ...[0, 1, 2, 3, 4, 5].map(v => ({ value: `VIP${v}`, label: `VIP ${v}` }))]}
                  />
                  <Select
                    label="KYC 状态"
                    value={kyc} onChange={e => setKyc(e.target.value)}
                    options={[{ value: '', label: '不限' }, ...['未认证', '待审核', '已认证', '已驳回'].map(k => ({ value: k, label: k }))]}
                  />
                  <div>
                    <div className="text-xs text-muted mb-1.5">注册时间 ≥</div>
                    <input type="date" value={since} onChange={e => setSince(e.target.value)} className={FIELD} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-2xs text-muted pt-1 border-t border-line">
                  <Users className="w-3.5 h-3.5 text-brand" />
                  预计影响用户数
                  <span className="text-ink tnum font-semibold text-xs">{num(estimate, 0)}</span>
                  <span className="text-faint">（按当前筛选条件实时估算）</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-43 / B-44 首页轮播图
 * ================================================================== */
function BannerManager({ platform, fnId }: { platform: 'PC' | 'APP'; fnId: string }) {
  const [rows, setRows] = useState<BannerRow[]>(
    () => BANNER_ROWS.filter(b => b.platform === platform).sort((a, b) => a.sort - b.sort),
  )
  const [add, setAdd] = useState(false)
  const [edit, setEdit] = useState<BannerRow | null>(null)
  const [preview, setPreview] = useState(0)

  const move = (i: number, d: -1 | 1) => {
    setRows(rs => {
      const j = i + d
      if (j < 0 || j >= rs.length) return rs
      const n = [...rs]
      const t = n[i]; n[i] = n[j]; n[j] = t
      return n.map((b, k) => ({ ...b, sort: k + 1 }))
    })
    setPreview(0)
  }
  const remove = (id: string) => setRows(rs => rs.filter(b => b.id !== id).map((b, k) => ({ ...b, sort: k + 1 })))

  const live = rows.filter(b => b.status === '已发布')
  const shown = live[preview] ?? live[0]

  return (
    <PageShell
      fnId={fnId}
      title={`${platform === 'PC' ? 'PC' : 'APP'} 首页轮播图`}
      sub={`${platform === 'PC' ? '桌面端 1920×640' : '移动端 750×360'} · 拖拽或使用上下箭头调整播放顺序`}
      actions={<Button size="sm" onClick={() => setAdd(true)}><Plus className="w-4 h-4" />新增轮播图</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="轮播图总数" value={num(rows.length, 0)} hint={`${live.length} 张生效中`} />
        <Stat label="总点击量" value={compact(rows.reduce((s, b) => s + b.clicks, 0))} delta={6.8} />
        <Stat label="平均点击率" value="3.42%" delta={-0.4} />
        <Stat label="轮播间隔" value="5s" hint="前台自动播放" />
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Sortable cards */}
        <div className="space-y-2">
          {rows.map((b, i) => (
            <Card
              key={b.id}
              className="flex items-center gap-3 p-3 hover:border-brand/30 transition-colors cursor-grab active:cursor-grabbing"
            >
              <div className="flex flex-col items-center gap-0.5 text-faint shrink-0">
                <button
                  onClick={() => move(i, -1)} disabled={i === 0}
                  className="w-6 h-6 grid place-items-center rounded hover:bg-elevated hover:text-ink transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <span className="text-2xs tnum text-muted font-medium">{b.sort}</span>
                <button
                  onClick={() => move(i, 1)} disabled={i === rows.length - 1}
                  className="w-6 h-6 grid place-items-center rounded hover:bg-elevated hover:text-ink transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <Thumb
                grad={b.grad}
                className={platform === 'PC' ? 'w-40 shrink-0' : 'w-28 shrink-0'}
                ratio={platform === 'PC' ? 'aspect-[16/6]' : 'aspect-[25/12]'}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{b.title}</span>
                  <StatusBadge s={b.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-2xs text-muted">
                  <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /><Mono>{b.link}</Mono></span>
                  <span className="flex items-center gap-1 tnum"><Clock className="w-3 h-3" />{b.start} → {b.end}</span>
                  <span className="tnum">点击 {compact(b.clicks)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setEdit(b)}><Pencil className="w-3.5 h-3.5" />编辑</Button>
                <Button size="sm" variant="ghost" className="text-down hover:text-down" onClick={() => remove(b.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
          {rows.length === 0 && (
            <Card className="py-16 text-center text-xs text-faint">暂无轮播图，点击右上角新增</Card>
          )}
        </div>

        {/* Live preview */}
        <Card className="self-start">
          <CardHeader
            title="预览"
            sub={platform === 'PC' ? '桌面端首页首屏' : '移动端首页首屏'}
            right={<Badge tone="brand">{live.length} 张生效</Badge>}
          />
          <div className="p-4">
            {platform === 'APP' ? (
              /* CSS phone frame */
              <div className="mx-auto w-[220px] rounded-[2rem] border-4 border-line bg-bg p-2 shadow-2xl">
                <div className="relative rounded-[1.5rem] bg-surface overflow-hidden h-[400px] border border-line">
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-bg z-10" />
                  <div className="pt-7 px-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-2 w-12 rounded-full bg-elevated" />
                      <div className="h-2 w-6 rounded-full bg-elevated" />
                    </div>
                    {shown ? (
                      <Thumb grad={shown.grad} label={shown.title} ratio="aspect-[25/12]" />
                    ) : (
                      <div className="aspect-[25/12] rounded-lg border border-dashed border-line grid place-items-center text-2xs text-faint">
                        无生效轮播图
                      </div>
                    )}
                    <div className="flex justify-center gap-1 mt-1.5">
                      {live.map((_, i) => (
                        <button
                          key={i} onClick={() => setPreview(i)}
                          className={cn('h-1 rounded-full transition-all', i === preview ? 'w-3.5 bg-brand' : 'w-1 bg-line')}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-3">
                      {['充值', '交易', '合约', '返佣'].map(t => (
                        <div key={t} className="text-center">
                          <div className="w-7 h-7 mx-auto rounded-lg bg-elevated" />
                          <div className="text-[8px] text-faint mt-1">{t}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="h-2 w-10 rounded-full bg-elevated" />
                          <div className="h-2 w-8 rounded-full bg-elevated" />
                          <div className={cn('h-2 w-8 rounded-full', i % 2 ? 'bg-down/30' : 'bg-up/30')} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop frame */
              <div className="rounded-lg border border-line overflow-hidden bg-bg">
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-line bg-elevated">
                  <span className="w-2 h-2 rounded-full bg-down/50" />
                  <span className="w-2 h-2 rounded-full bg-warn/50" />
                  <span className="w-2 h-2 rounded-full bg-up/50" />
                  <div className="flex-1 mx-2 h-3 rounded-full bg-surface" />
                </div>
                <div className="p-2.5">
                  {shown ? (
                    <Thumb grad={shown.grad} label={shown.title} ratio="aspect-[16/6]" />
                  ) : (
                    <div className="aspect-[16/6] rounded-lg border border-dashed border-line grid place-items-center text-2xs text-faint">
                      无生效轮播图
                    </div>
                  )}
                  <div className="flex justify-center gap-1 mt-2">
                    {live.map((_, i) => (
                      <button
                        key={i} onClick={() => setPreview(i)}
                        className={cn('h-1.5 rounded-full transition-all', i === preview ? 'w-5 bg-brand' : 'w-1.5 bg-line')}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Order strip */}
            <div className="mt-4">
              <div className="text-2xs text-muted mb-2">播放顺序</div>
              <div className="flex gap-1.5 overflow-x-auto scroll-thin pb-1">
                {live.map((b, i) => (
                  <button
                    key={b.id}
                    onClick={() => setPreview(i)}
                    className={cn(
                      'shrink-0 w-16 rounded border transition-all',
                      i === preview ? 'border-brand' : 'border-line opacity-60 hover:opacity-100',
                    )}
                  >
                    <div className={cn('aspect-[16/6] rounded-t bg-gradient-to-br', b.grad)} />
                    <div className="text-[9px] text-faint tnum py-0.5">#{i + 1}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={add || !!edit}
        onClose={() => { setAdd(false); setEdit(null) }}
        title={edit ? '编辑轮播图' : '新增轮播图'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setAdd(false); setEdit(null) }}>取消</Button>
            <Button onClick={() => { setAdd(false); setEdit(null) }}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="标题" defaultValue={edit?.title ?? ''} placeholder="SUI/USDT 永续合约上线" />
          <div>
            <div className="text-xs text-muted mb-1.5">
              图片 <span className="text-faint">（{platform === 'PC' ? '1920×640' : '750×360'}，≤ 2 MB）</span>
            </div>
            <div className="rounded-lg border border-dashed border-line bg-elevated p-4 grid place-items-center hover:border-brand transition-colors cursor-pointer">
              {edit
                ? <Thumb grad={edit.grad} className="w-full" ratio={platform === 'PC' ? 'aspect-[16/6]' : 'aspect-[25/12]'} />
                : (
                  <div className="text-center py-6 text-faint">
                    <UploadCloud className="w-6 h-6 mx-auto mb-1.5" />
                    <div className="text-xs">拖拽图片到此处，或点击上传</div>
                  </div>
                )}
            </div>
          </div>
          <Input label="跳转链接" defaultValue={edit?.link ?? ''} placeholder="/notices/N1 或 https://…" className="font-mono" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="排序" type="number" defaultValue={edit?.sort ?? rows.length + 1} />
            <Select
              label="状态"
              defaultValue={edit?.status ?? '草稿'}
              options={['已发布', '草稿', '已下架'].map(s => ({ value: s, label: s }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted mb-1.5">生效开始</div>
              <input type="date" className={FIELD} defaultValue={edit?.start ?? '2026-07-14'} />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">生效结束</div>
              <input type="date" className={FIELD} defaultValue={edit?.end ?? '2026-08-14'} />
            </div>
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}

export function BannerPc() { return <BannerManager platform="PC" fnId="B-43" /> }
export function BannerApp() { return <BannerManager platform="APP" fnId="B-44" /> }

/* ================================================================== *
 * B-45 工单管理 — ReviewQueue + 会话
 * ================================================================== */
export function Tickets() {
  const [reply, setReply] = useState('')
  const [assignee, setAssignee] = useState('')
  const [sent, setSent] = useState<Record<string, string[]>>({})

  const ASSIGNEES = ['刘客服', '陈运营', '王审核', '李风控', '张财务']

  return (
    <ReviewQueue<Ticket>
      fnId="B-45"
      title="工单管理"
      sub="客服工单队列 — 优先级「紧急」需 30 分钟内首次响应 (SLA)"
      items={TICKETS}
      pending={t => t.status === '待处理'}
      approveLabel="标记已解决"
      rejectLabel="关闭工单"
      renderRow={t => (
        <div>
          <div className="flex items-center gap-2">
            <Mono className="text-brand">{t.id}</Mono>
            <Sev s={t.priority === '紧急' ? '严重' : t.priority} />
            <div className="flex-1" />
            <StatusBadge s={t.status} />
          </div>
          <div className="text-xs mt-1 truncate">{t.subject}</div>
          <div className="flex items-center gap-2 mt-1 text-2xs text-faint">
            <span className="tnum">UID {t.uid}</span>
            <span>·</span>
            <span>{t.category}</span>
            <span>·</span>
            <span className="tnum">{t.createdAt.slice(5, 16)}</span>
          </div>
        </div>
      )}
      renderDetail={t => {
        const thread = [
          ...threadFor(t),
          ...(sent[t.id] ?? []).map((text, i) => ({
            from: '客服' as const, name: t.assignee ?? '刘客服', ts: Date.now() - (sent[t.id].length - 1 - i) * 60_000, text,
          })),
        ]
        return (
          <div className="space-y-4">
            {/* 工单信息 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold">{t.subject}</h2>
                <Sev s={t.priority === '紧急' ? '严重' : t.priority} />
                <StatusBadge s={t.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3 rounded-lg bg-elevated border border-line">
                {[
                  ['工单号', <Mono key="a" className="text-brand">{t.id}</Mono>],
                  ['用户 UID', <Mono key="b">{t.uid}</Mono>],
                  ['分类', <span key="c">{t.category}</span>],
                  ['创建时间', <Mono key="d" className="text-muted">{t.createdAt}</Mono>],
                  ['最后回复', <Mono key="e" className="text-muted">{t.lastReply}</Mono>],
                  ['处理人', <span key="f">{t.assignee ?? <span className="text-faint">未分配</span>}</span>],
                ].map(([k, v], i) => (
                  <div key={i}>
                    <div className="text-2xs text-faint mb-0.5">{k as string}</div>
                    <div className="text-xs">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 会话 */}
            <div>
              <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
                会话记录
                <span className="text-2xs text-faint tnum">({thread.length} 条)</span>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto scroll-thin pr-1">
                {thread.map((m, i) => (
                  <div key={i} className={cn('flex gap-2', m.from === '客服' && 'flex-row-reverse')}>
                    <div className={cn(
                      'w-7 h-7 rounded-full grid place-items-center text-2xs font-semibold shrink-0',
                      m.from === '客服' ? 'bg-brand/10 text-brand' : 'bg-elevated text-muted',
                    )}>
                      {m.from === '客服' ? 'CS' : 'U'}
                    </div>
                    <div className={cn('max-w-[78%] min-w-0', m.from === '客服' && 'text-right')}>
                      <div className={cn('flex items-center gap-2 mb-1', m.from === '客服' && 'justify-end')}>
                        <span className="text-2xs font-medium">{m.name}</span>
                        <span className="text-2xs text-faint tnum">{fmtDateTime(m.ts)}</span>
                      </div>
                      <div className={cn(
                        'inline-block text-left px-3 py-2 rounded-xl text-xs leading-relaxed',
                        m.from === '客服'
                          ? 'bg-brand/10 text-ink rounded-tr-sm'
                          : 'bg-elevated text-ink rounded-tl-sm border border-line',
                      )}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 回复 */}
            <div className="space-y-2">
              <div className="grid sm:grid-cols-[1fr_180px] gap-2">
                <textarea
                  rows={3} value={reply} onChange={e => setReply(e.target.value)}
                  placeholder="输入回复内容，将同时通过站内信通知用户…"
                  className={AREA}
                />
                <div className="space-y-2">
                  <Select
                    label="分配处理人"
                    value={assignee || (t.assignee ?? '')}
                    onChange={e => setAssignee(e.target.value)}
                    options={[{ value: '', label: '未分配' }, ...ASSIGNEES.map(a => ({ value: a, label: a }))]}
                  />
                  <Button
                    className="w-full" size="md" disabled={!reply.trim()}
                    onClick={() => {
                      setSent(s => ({ ...s, [t.id]: [...(s[t.id] ?? []), reply.trim()] }))
                      setReply('')
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />发送回复
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['已为您手动补单，请刷新查看', '请提供 TXID 以便进一步核查', '资料已收到，正在人工审核中'].map(q => (
                  <button
                    key={q} onClick={() => setReply(q)}
                    className="px-2 py-1 rounded-md text-2xs bg-elevated text-muted hover:text-ink border border-line transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }}
    />
  )
}

/* ================================================================== *
 * B-46 图片上传 / 媒体库
 * ================================================================== */
export function Upload() {
  const [state, setState] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  const rows = useMemo(() => MEDIA.filter(m =>
    (!state.type || m.type === state.type) &&
    (!state.q || m.name.toLowerCase().includes(state.q.toLowerCase())) &&
    (!state.since || dstr(m.ts) >= state.since),
  ), [state])

  const usedGb = 2.4, totalGb = 50
  const copy = (m: Media) => {
    navigator.clipboard?.writeText(m.url)
    setCopied(m.id)
    setTimeout(() => setCopied(c => (c === m.id ? null : c)), 1400)
  }

  return (
    <PageShell fnId="B-46" title="图片上传 / 媒体库" sub="轮播图、文章配图与活动页素材统一托管于对象存储 CDN">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false) }}
        className={cn(
          'rounded-xl border-2 border-dashed p-6 mb-4 text-center transition-colors cursor-pointer',
          drag ? 'border-brand bg-brand/5' : 'border-line bg-surface hover:border-brand/50',
        )}
      >
        <UploadCloud className={cn('w-8 h-8 mx-auto mb-2', drag ? 'text-brand' : 'text-faint')} />
        <div className="text-sm font-medium">拖拽图片到此处上传</div>
        <div className="text-2xs text-faint mt-1">
          支持 JPG / PNG / WebP / SVG，单张 ≤ 2 MB，可批量上传 20 张 · 上传后自动生成 WebP 与缩略图
        </div>
        <Button size="sm" variant="outline" className="mt-3"><Plus className="w-3.5 h-3.5" />选择文件</Button>
      </div>

      {/* Storage */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <span className="text-xs font-medium">存储用量</span>
          </div>
          <span className="text-2xs text-muted tnum">
            <span className="text-ink font-semibold">{usedGb.toFixed(1)} GB</span> / {totalGb} GB
          </span>
        </div>
        <div className="h-2 rounded-full bg-elevated overflow-hidden">
          <div className="h-full rounded-full bg-brand" style={{ width: `${(usedGb / totalGb) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-2xs text-faint">
          <span className="tnum">文件 {num(MEDIA.length, 0)} 个</span>
          <span className="tnum">本月上传 6 个</span>
          <span className="tnum">CDN 月流量 184 GB</span>
          <span>已启用 4.8% · 距离扩容阈值 (80%) 尚远</span>
        </div>
      </Card>

      <FilterBar
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索文件名…', width: 'w-52' },
          { type: 'select', key: 'type', label: '全部类型', options: ['轮播图', '文章配图', '图标', '活动页'] },
          { type: 'date', key: 'since', label: '上传时间' },
        ]}
        state={state}
        onChange={(k, v) => setState(s => ({ ...s, [k]: v }))}
        actions={<span className="text-2xs text-faint tnum">{rows.length} / {MEDIA.length} 个文件</span>}
      />

      {rows.length === 0 ? (
        <Card className="py-16 text-center text-xs text-faint">没有匹配的素材</Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {rows.map(m => (
            <Card key={m.id} className="overflow-hidden group">
              <div className="relative">
                <div className={cn(
                  'relative aspect-[4/3] bg-gradient-to-br grid place-items-center overflow-hidden',
                  m.grad,
                )}>
                  <ImageIcon className="w-6 h-6 text-ink/20" />
                  <div className="absolute inset-0 opacity-50">
                    <div className="absolute left-[10%] bottom-[18%] h-1 w-[40%] rounded-full bg-ink/20" />
                    <div className="absolute left-[10%] bottom-[8%] h-1 w-[24%] rounded-full bg-ink/10" />
                  </div>
                  <Badge tone="muted" className="absolute top-1.5 left-1.5">{m.type}</Badge>
                  <div className="absolute inset-0 bg-bg/80 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center gap-1">
                    <Button size="sm" variant="subtle" onClick={() => copy(m)}>
                      {copied === m.id ? <Check className="w-3.5 h-3.5 text-up" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === m.id ? '已复制' : '复制链接'}
                    </Button>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-down hover:text-down">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <div className="text-2xs font-medium truncate" title={m.name}>{m.name}</div>
                <div className="flex items-center justify-between mt-1 text-2xs text-faint tnum">
                  <span>{m.w}×{m.h}</span>
                  <span>{m.kb >= 1024 ? `${(m.kb / 1024).toFixed(1)} MB` : `${m.kb} KB`}</span>
                </div>
                <div className="text-2xs text-faint tnum mt-0.5">{dstr(m.ts)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}

/* ================================================================== *
 * B-47 赠币工具
 * ================================================================== */
const GIFT_REASONS = ['新用户注册奖励', '交易大赛奖励', '邀请活动', '补偿', '空投', '市场推广', '客诉补偿']

export function Gift() {
  const [mode, setMode] = useState<'uid' | 'cond'>('uid')
  const [uids, setUids] = useState('81243907\n81882441\n81004218')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kyc, setKyc] = useState('')
  const [vip, setVip] = useState('')
  const [coin, setCoin] = useState('PLT')
  const [amount, setAmount] = useState('20')
  const [reason, setReason] = useState(GIFT_REASONS[0])
  const [locked, setLocked] = useState(false)
  const [lockDays, setLockDays] = useState('30')
  const [release, setRelease] = useState('一次性')
  const [otp, setOtp] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [okMsg, setOkMsg] = useState(false)

  const targets = useMemo(() => {
    if (mode === 'uid') return uids.split(/[\s,;\n]+/).filter(Boolean).length
    return ADMIN_USERS.filter(u =>
      (!from || u.registeredAt.slice(0, 10) >= from) &&
      (!to || u.registeredAt.slice(0, 10) <= to) &&
      (!kyc || u.kyc === kyc) &&
      (!vip || u.vip >= +vip.replace(/\D/g, '')),
    ).length
  }, [mode, uids, from, to, kyc, vip])

  const amt = +amount || 0
  const total = amt * targets
  const canRun = targets > 0 && amt > 0 && otp.length === 6

  return (
    <PageShell
      fnId="B-47"
      title="赠币工具"
      sub="直接向用户余额发放币种 — 高风险操作，需二次验证且不可撤销"
    >
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <Card>
            <CardHeader title="赠币配置" sub="发放前请确认影响范围与总发放量" />
            <div className="p-4 space-y-5">
              {/* 赠送对象 */}
              <Field label="赠送对象" required hint="指定 UID 精确发放，或按条件批量筛选">
                <div className="space-y-3">
                  <div className="flex gap-1 p-0.5 bg-elevated rounded-lg w-fit">
                    {([['uid', '指定 UID'], ['cond', '按条件筛选']] as const).map(([k, l]) => (
                      <button
                        key={k} onClick={() => setMode(k)}
                        className={cn(
                          'px-4 py-1.5 rounded-md text-xs transition-colors',
                          mode === k ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink',
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  {mode === 'uid' ? (
                    <textarea
                      rows={4} value={uids} onChange={e => setUids(e.target.value)}
                      placeholder={'每行一个 UID'}
                      className={cn(AREA, 'font-mono text-xs')}
                    />
                  ) : (
                    <div className="space-y-3 p-3 rounded-lg bg-elevated border border-line">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted mb-1.5">注册时间 起</div>
                          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={FIELD} />
                        </div>
                        <div>
                          <div className="text-xs text-muted mb-1.5">注册时间 止</div>
                          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={FIELD} />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Select
                          label="KYC 状态" value={kyc} onChange={e => setKyc(e.target.value)}
                          options={[{ value: '', label: '不限' }, ...['未认证', '待审核', '已认证', '已驳回'].map(k => ({ value: k, label: k }))]}
                        />
                        <Select
                          label="VIP 等级 ≥" value={vip} onChange={e => setVip(e.target.value)}
                          options={[{ value: '', label: '不限' }, ...[0, 1, 2, 3, 4, 5].map(v => ({ value: `VIP${v}`, label: `VIP ${v}` }))]}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand/5 border border-brand/30">
                    <Users className="w-4 h-4 text-brand shrink-0" />
                    <span className="text-xs text-muted">预计影响用户数</span>
                    <span className="text-sm font-semibold tnum text-ink">{num(targets, 0)}</span>
                    <span className="text-2xs text-faint">人</span>
                  </div>
                </div>
              </Field>

              <div className="border-t border-line" />

              <Field label="赠送币种" required>
                <div className="w-full sm:w-52">
                  <Select value={coin} onChange={e => setCoin(e.target.value)}
                          options={OPS_COINS.map(c => ({ value: c, label: c }))} />
                </div>
              </Field>

              <Field label="赠送数量" required hint="每位用户获得的数量">
                <div className="w-full sm:w-52">
                  <Input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)} suffix={coin}
                  />
                </div>
              </Field>

              <Field label="赠送原因" required hint="将写入用户资金流水与管理员操作日志">
                <div className="w-full sm:w-52">
                  <Select value={reason} onChange={e => setReason(e.target.value)}
                          options={GIFT_REASONS.map(x => ({ value: x, label: x }))} />
                </div>
              </Field>

              <div className="border-t border-line" />

              <Field label="是否锁仓" hint="锁仓可防止空投用户立即抛售">
                <div className="space-y-3">
                  <Toggle checked={locked} onChange={setLocked} label={locked ? '锁仓发放' : '不锁仓（余额立即可用）'} />
                  {locked && (
                    <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-lg bg-elevated border border-line animate-fade-in">
                      <Input
                        label="锁仓天数" type="number" value={lockDays}
                        onChange={e => setLockDays(e.target.value)} suffix="天"
                      />
                      <Select
                        label="解锁方式" value={release} onChange={e => setRelease(e.target.value)}
                        options={[
                          { value: '一次性', label: '到期一次性解锁' },
                          { value: '线性释放', label: '线性释放（按日）' },
                        ]}
                      />
                      <div className="sm:col-span-2 text-2xs text-faint leading-relaxed">
                        锁仓期间余额计入总资产、可用于交易与持仓奖励快照，但不可提现。
                        {release === '线性释放'
                          ? ` 线性释放：每日解锁 ${(100 / (+lockDays || 1)).toFixed(2)}%。`
                          : ` 到期日 ${dstr(Date.now() + (+lockDays || 0) * DAY)} 一次性全部解锁。`}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              <Field label="二次验证" required>
                <TwoFa value={otp} onChange={setOtp} />
              </Field>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 border-t border-line">
              <Button disabled={!canRun} onClick={() => setConfirm(true)}>
                <GiftIcon className="w-4 h-4" />执行赠币
              </Button>
              {okMsg && <span className="text-xs text-up">✓ 赠币批次已提交，正在异步发放</span>}
              <div className="flex-1" />
              <span className="text-2xs text-faint">
                总发放量 <span className="text-ink tnum">{num(total, 2)} {coin}</span>
              </span>
            </div>
          </Card>

          {/* 最近赠币批次 */}
          <Card>
            <CardHeader
              title="最近赠币批次"
              sub="最近 30 天"
              right={<Button size="sm" variant="ghost"><Download className="w-3.5 h-3.5" />导出</Button>}
            />
            <Table
              dense
              rows={GIFT_BATCHES.slice(0, 8)}
              cols={[
                { key: 'batch', header: '批次号', cell: (b: GiftBatch) => <Mono className="text-brand">{b.batch}</Mono> },
                { key: 'coin', header: '币种', cell: (b: GiftBatch) => <Badge tone="info">{b.coin}</Badge> },
                { key: 'users', header: '人数', align: 'right', cell: (b: GiftBatch) => <span className="tnum">{num(b.users, 0)}</span> },
                { key: 'total', header: '发放总量', align: 'right', cell: (b: GiftBatch) => <Money v={b.total} /> },
                { key: 'reason', header: '原因', cell: (b: GiftBatch) => <span className="text-xs text-muted">{b.reason}</span> },
                { key: 'op', header: '操作人', cell: (b: GiftBatch) => <Mono className="text-muted">{b.operator}</Mono> },
                { key: 'ts', header: '时间', cell: (b: GiftBatch) => <Mono className="text-muted">{b.ts.slice(0, 16)}</Mono> },
                { key: 'st', header: '状态', cell: (b: GiftBatch) => <StatusBadge s={b.status} /> },
              ] as Col<GiftBatch>[]}
            />
          </Card>
        </div>

        {/* Side: guard rails */}
        <div className="space-y-4">
          <Card className="border-warn/30 bg-warn/5">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warn" />
                <span className="text-xs font-semibold text-warn">高风险操作</span>
              </div>
              <ul className="space-y-1.5 text-2xs text-muted leading-relaxed">
                <li>· 赠币直接增加用户可用余额，等同于平台负债增加，不可撤销。</li>
                <li>· 大额批次（&gt; 10,000 USDT 等值）需财务二次复核。</li>
                <li>· 每次执行都会写入管理员操作日志与账本流水（类型：赠币）。</li>
                <li>· 赠币不会自动对冲，请同步通知风控与财务。</li>
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="本次发放摘要" />
            <div className="p-4 space-y-2.5 text-xs">
              {[
                ['影响用户数', `${num(targets, 0)} 人`],
                ['单人数量', `${num(amt, 2)} ${coin}`],
                ['总发放量', `${num(total, 2)} ${coin}`],
                ['锁仓', locked ? `${lockDays} 天 · ${release}` : '不锁仓'],
                ['赠送原因', reason],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-muted">{k}</span>
                  <span className="tnum font-medium">{v}</span>
                </div>
              ))}
              <div className="pt-2.5 border-t border-line flex items-center justify-between">
                <span className="text-muted">预估成本 (USD)</span>
                <span className="tnum font-semibold text-brand">
                  {usd(total * (coin === 'BTC' ? 97_842 : coin === 'ETH' ? 3_412 : coin === 'PLT' ? 0.42 : 1))}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirm} onClose={() => setConfirm(false)} title="确认执行赠币"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>取消</Button>
            <Button
              variant="down"
              onClick={() => { setConfirm(false); setOkMsg(true); setOtp('') }}
            >
              确认发放
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-down/5 border border-down/30">
            <AlertTriangle className="w-4 h-4 text-down shrink-0 mt-0.5" />
            <p className="text-xs text-down leading-relaxed">
              此操作将直接增加用户余额，且<span className="font-semibold">不可撤销</span>。请再次确认影响范围。
            </p>
          </div>
          <div className="space-y-2 text-xs">
            {[
              ['影响用户数', `${num(targets, 0)} 人`],
              ['赠送币种', coin],
              ['单人数量', `${num(amt, 2)} ${coin}`],
              ['总发放量', `${num(total, 2)} ${coin}`],
              ['是否锁仓', locked ? `锁仓 ${lockDays} 天（${release}）` : '不锁仓'],
              ['赠送原因', reason],
              ['操作人', 'admin'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1.5 border-b border-line/60">
                <span className="text-muted">{k}</span>
                <span className="tnum font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}

/* ================================================================== *
 * B-48 赠送记录
 * ================================================================== */
export function GiftLog() {
  type G = typeof GIFT_ROWS[number]
  const lockedPct = (GIFT_ROWS.filter(g => g.locked).length / GIFT_ROWS.length) * 100
  const monthTotal = GIFT_ROWS.reduce((s, g) => s + g.amount, 0)

  const cols: Col<G>[] = [
    { key: 'batch', header: '批次号', cell: g => <Mono className="text-brand">{g.batch}</Mono> },
    { key: 'ts', header: '时间', cell: g => <Mono className="text-muted">{g.ts.slice(0, 16)}</Mono> },
    { key: 'uid', header: 'UID', cell: g => <Mono>{g.uid}</Mono> },
    { key: 'coin', header: '币种', cell: g => <Badge tone="info">{g.coin}</Badge> },
    { key: 'amount', header: '数量', align: 'right', cell: g => <Money v={g.amount} /> },
    { key: 'reason', header: '原因', cell: g => <span className="text-xs text-muted">{g.reason}</span> },
    {
      key: 'locked', header: '是否锁仓',
      cell: g => g.locked
        ? <Badge tone="warn"><LockIcon className="w-2.5 h-2.5" />锁仓 {g.lockDays} 天</Badge>
        : <Badge tone="muted">否</Badge>,
    },
    { key: 'op', header: '操作人', cell: g => <Mono className="text-muted">{g.operator}</Mono> },
    { key: 'status', header: '状态', cell: g => <StatusBadge s={g.status} /> },
  ]

  return (
    <ListPage<G>
      fnId="B-48"
      title="赠送记录"
      sub="所有赠币明细 — 与用户资金流水（类型：赠币）一一对应"
      stats={[
        { label: '本月赠币总额', value: `${num(monthTotal, 2)}`, hint: '折合 USD ' + usd(monthTotal * 0.9), delta: 18.2 },
        { label: '赠币人数', value: num(new Set(GIFT_ROWS.map(g => g.uid)).size, 0), hint: '去重 UID' },
        { label: '锁仓比例', value: `${lockedPct.toFixed(1)}%`, hint: `${GIFT_ROWS.filter(g => g.locked).length} / ${GIFT_ROWS.length} 笔` },
        { label: '批次数', value: num(GIFT_BATCHES.length, 0), hint: '最近 30 天' },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '搜索 UID / 批次号…', width: 'w-52' },
        { type: 'select', key: 'coin', label: '全部币种', options: [...new Set(GIFT_ROWS.map(g => g.coin))] },
        { type: 'select', key: 'reason', label: '全部原因', options: [...new Set(GIFT_ROWS.map(g => g.reason))] },
        { type: 'select', key: 'locked', label: '是否锁仓', options: ['锁仓', '不锁仓'] },
      ]}
      match={(g, s) =>
        (!s.q || g.uid.includes(s.q) || g.batch.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.coin || g.coin === s.coin) &&
        (!s.reason || g.reason === s.reason) &&
        (!s.locked || (s.locked === '锁仓' ? g.locked : !g.locked))
      }
      cols={cols}
      rows={GIFT_ROWS}
    />
  )
}

/* ================================================================== *
 * B-49 持仓奖励规则设置
 * ================================================================== */
export function HoldingRules() {
  const [tiers, setTiers] = useState<Tier[]>(HOLD_TIERS)
  const [edit, setEdit] = useState<Tier | null>(null)
  const [form, setForm] = useState({ from: '', to: '', apr: '' })

  const openEdit = (t: Tier) => {
    setEdit(t)
    setForm({ from: String(t.from), to: String(t.to), apr: String(t.apr) })
  }
  const save = () => {
    if (!edit) return
    setTiers(ts => ts.map(t => (t.id === edit.id
      ? { ...t, from: +form.from || 0, to: +form.to || 0, apr: +form.apr || 0 }
      : t)))
    setEdit(null)
  }

  return (
    <div>
      <ConfigPage
        fnId="B-49"
        title="持仓奖励规则设置"
        sub="按快照持币量向持币用户发放分红 — 快照后新增持仓不计入当期"
        sections={[
          {
            title: '活动配置',
            desc: '快照时间以 UTC+8 计，快照后 1 小时内完成分红发放',
            fields: [
              { type: 'toggle', key: 'on', label: '活动开关', value: true, hint: '关闭后不再执行快照与分红' },
              { type: 'select', key: 'coin', label: '奖励币种', value: 'PLT', options: OPS_COINS },
              { type: 'select', key: 'holdCoin', label: '持仓币种', value: 'PLT', options: OPS_COINS, hint: '用于计算持币量的币种' },
              { type: 'text', key: 'cron', label: '快照时间 (cron)', value: '0 0 4 * * *', hint: '每日 04:00 快照，对应定时任务「持仓奖励分红」' },
              { type: 'number', key: 'min', label: '最低持币量门槛', value: 100, suffix: 'PLT', hint: '低于门槛不参与分红' },
              { type: 'number', key: 'apr', label: '年化收益率', value: 12, suffix: '%', hint: '「按持币量比例」模式下的统一年化' },
              { type: 'select', key: 'mode', label: '分红方式', value: '阶梯年化', options: ['按持币量比例', '阶梯年化'], hint: '阶梯模式使用下方阶梯配置表' },
            ],
          },
          {
            title: '活动周期',
            fields: [
              { type: 'text', key: 'start', label: '活动开始时间', value: '2026-07-01 00:00' },
              { type: 'text', key: 'end', label: '活动结束时间', value: '2026-12-31 23:59' },
              { type: 'toggle', key: 'renew', label: '到期自动续期', value: true, hint: '按周为一期自动滚动' },
              { type: 'textarea', key: 'desc', label: '活动说明', value: '持有 PLT 即可参与每日分红，锁仓部分同样计入快照持币量。' },
            ],
          },
          {
            title: '风控限制',
            fields: [
              { type: 'number', key: 'cap', label: '单用户单日上限', value: 5_000, suffix: 'PLT' },
              { type: 'toggle', key: 'exSub', label: '排除子账户', value: true },
              { type: 'toggle', key: 'exMm', label: '排除做市商账户', value: true, hint: '做市商持仓不参与分红' },
              { type: 'toggle', key: 'exLock', label: '锁仓资产计入快照', value: true, hint: '关闭后仅可用余额计入' },
            ],
          },
        ]}
      />

      <div className="max-w-3xl mt-4">
        <Card>
          <CardHeader
            title="阶梯配置"
            sub="「阶梯年化」模式下，按用户快照持币量所处区间适用对应年化"
            right={<Badge tone="brand">{tiers.length} 档</Badge>}
          />
          <Table
            dense
            rows={tiers}
            cols={[
              { key: 'tier', header: '档位', cell: (t: Tier, i: number) => <span className="tnum font-medium">T{i + 1}</span> },
              {
                key: 'range', header: '持币区间', cell: (t: Tier) => (
                  <span className="tnum">{num(t.from, 0)} – {num(t.to, 0)} PLT</span>
                ),
              },
              {
                key: 'apr', header: '年化', align: 'right',
                cell: (t: Tier) => <span className="tnum text-up font-medium">{t.apr.toFixed(1)}%</span>,
              },
              {
                key: 'daily', header: '日化', align: 'right',
                cell: (t: Tier) => <span className="tnum text-muted">{(t.apr / 365).toFixed(4)}%</span>,
              },
              {
                key: 'act', header: '操作', align: 'right',
                cell: (t: Tier) => (
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />编辑
                  </Button>
                ),
              },
            ] as Col<Tier>[]}
          />
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-line">
            <span className="text-2xs text-faint">区间需连续且不重叠，最高档上限为持币量上限</span>
            <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5" />新增档位</Button>
          </div>
        </Card>
      </div>

      <Modal
        open={!!edit} onClose={() => setEdit(null)} title={`编辑阶梯 ${edit?.id ?? ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEdit(null)}>取消</Button>
            <Button onClick={save}>保存</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="区间下限" type="number" value={form.from}
                   onChange={e => setForm(f => ({ ...f, from: e.target.value }))} suffix="PLT" />
            <Input label="区间上限" type="number" value={form.to}
                   onChange={e => setForm(f => ({ ...f, to: e.target.value }))} suffix="PLT" />
          </div>
          <Input label="年化收益率" type="number" value={form.apr}
                 onChange={e => setForm(f => ({ ...f, apr: e.target.value }))} suffix="%" />
          <div className="text-2xs text-faint">
            对应日化 {((+form.apr || 0) / 365).toFixed(4)}% · 修改将于下一次快照 (每日 04:00) 生效。
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-50 持仓奖励活动记录
 * ================================================================== */
export function HoldingLog() {
  const [detail, setDetail] = useState<HoldActivity | null>(null)

  const cols: Col<HoldActivity>[] = [
    { key: 'name', header: '活动名', cell: a => <span className="font-medium">{a.name}</span> },
    { key: 'coin', header: '奖励币种', cell: a => <Badge tone="info">{a.coin}</Badge> },
    { key: 'snap', header: '快照时间', cell: a => <Mono className="text-muted">{a.snapshot}</Mono> },
    { key: 'users', header: '参与人数', align: 'right', cell: a => <span className="tnum">{num(a.users, 0)}</span> },
    { key: 'hold', header: '总持币量', align: 'right', cell: a => <span className="tnum">{compact(a.totalHold)}</span> },
    { key: 'apr', header: '年化', align: 'right', cell: a => <span className="tnum text-up">{a.apr.toFixed(1)}%</span> },
    { key: 'payout', header: '发放总额', align: 'right', cell: a => <Money v={a.payout} /> },
    { key: 'status', header: '状态', cell: a => <StatusBadge s={a.status} /> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: a => (
        <Button size="sm" variant="ghost" onClick={() => setDetail(a)}>
          <Eye className="w-3.5 h-3.5" />查看明细
        </Button>
      ),
    },
  ]

  const rows = detail
    ? TOP10_HOLD.map((h, i) => ({
      uid: h.uid,
      hold: h.amount,
      share: (h.amount / TOTAL_HOLD) * 100,
      payout: +(detail.payout * (h.amount / TOTAL_HOLD)).toFixed(4),
      tier: h.tier,
      status: i === 0 && detail.status === '进行中' ? '处理中' : '已完成',
    }))
    : []

  return (
    <>
      <ListPage<HoldActivity>
        fnId="B-50"
        title="持仓奖励活动记录"
        sub="每期活动的快照结果与分红发放情况"
        stats={[
          { label: '活动期数', value: num(HOLD_ACTIVITIES.length, 0), hint: '含 1 期待开始' },
          { label: '累计发放', value: compact(HOLD_ACTIVITIES.reduce((s, a) => s + a.payout, 0)), hint: 'PLT 等值' },
          { label: '累计参与人次', value: compact(HOLD_ACTIVITIES.reduce((s, a) => s + a.users, 0)) },
          { label: '平均年化', value: `${(HOLD_ACTIVITIES.reduce((s, a) => s + a.apr, 0) / HOLD_ACTIVITIES.length).toFixed(1)}%`, delta: 1.2 },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索活动名…', width: 'w-52' },
          { type: 'select', key: 'coin', label: '全部币种', options: ['PLT', 'USDT'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['进行中', '已结束', '待开始'] },
        ]}
        match={(a, s) =>
          (!s.q || a.name.includes(s.q)) &&
          (!s.coin || a.coin === s.coin) &&
          (!s.status || a.status === s.status)
        }
        cols={cols}
        rows={HOLD_ACTIVITIES}
      />

      <Modal
        open={!!detail} onClose={() => setDetail(null)} width="max-w-3xl"
        title={detail ? `${detail.name} · 分红明细` : ''}
        footer={
          <div className="flex items-center gap-2">
            <span className="text-2xs text-faint">仅展示 Top 10，完整明细请导出 CSV</span>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setDetail(null)}>关闭</Button>
            <Button><Download className="w-3.5 h-3.5" />导出全部明细</Button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['快照时间', detail.snapshot],
                ['参与人数', `${num(detail.users, 0)} 人`],
                ['总持币量', `${compact(detail.totalHold)} ${detail.coin}`],
                ['发放总额', `${num(detail.payout, 2)} ${detail.coin}`],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-elevated border border-line">
                  <div className="text-2xs text-faint">{k}</div>
                  <div className="text-xs font-medium tnum mt-1">{v}</div>
                </div>
              ))}
            </div>
            <Table
              dense
              rows={rows}
              cols={[
                { key: 'uid', header: 'UID', cell: (r: any) => <Mono>{r.uid}</Mono> },
                { key: 'tier', header: '等级', cell: (r: any) => <TierBadge t={r.tier} /> },
                { key: 'hold', header: '快照持币量', align: 'right', cell: (r: any) => <Money v={r.hold} /> },
                { key: 'share', header: '占比', align: 'right', cell: (r: any) => <span className="tnum text-muted">{r.share.toFixed(3)}%</span> },
                { key: 'payout', header: '分红', align: 'right', cell: (r: any) => <span className="tnum text-up">+{num(r.payout, 4)}</span> },
                { key: 'status', header: '状态', cell: (r: any) => <StatusBadge s={r.status} /> },
              ] as Col<any>[]}
            />
          </div>
        )}
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-51 持币用户管理
 * ================================================================== */
export function Holders() {
  type H = typeof HOLDERS[number]
  const maxHold = Math.max(...TOP10_HOLD.map(h => h.amount))

  const cols: Col<H>[] = [
    { key: 'uid', header: 'UID', cell: h => <Mono>{h.uid}</Mono> },
    { key: 'amount', header: '持币量', align: 'right', cell: h => <Money v={h.amount} /> },
    {
      key: 'locked', header: '锁仓量', align: 'right',
      cell: h => (
        <span className="tnum text-warn">
          {num(h.lockedAmount, 2)}
          <span className="text-faint text-2xs ml-1">({((h.lockedAmount / h.amount) * 100).toFixed(0)}%)</span>
        </span>
      ),
    },
    {
      key: 'share', header: '占比', align: 'right',
      cell: h => <span className="tnum text-muted">{((h.amount / TOTAL_HOLD) * 100).toFixed(3)}%</span>,
    },
    { key: 'div', header: '30 日分红', align: 'right', cell: h => <span className="tnum text-up">+{num(h.dividend30d, 2)}</span> },
    { key: 'tier', header: '等级', cell: h => <TierBadge t={h.tier} /> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: () => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" />持仓明细</Button>
          <Button size="sm" variant="ghost"><LockIcon className="w-3.5 h-3.5" />锁仓</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <ListPage<H>
        fnId="B-51"
        title="持币用户管理"
        sub="PLT 平台币持有人 — 快照持币量决定分红权重"
        stats={[
          { label: '总持币人数', value: num(HOLDERS.length, 0), delta: 4.8, hint: '≥ 100 PLT 门槛' },
          { label: '总持币量', value: compact(TOTAL_HOLD), hint: `锁仓 ${compact(TOTAL_LOCKED)}` },
          { label: '平均持币', value: compact(TOTAL_HOLD / HOLDERS.length), delta: -1.4 },
          { label: '前 10 大户占比', value: `${TOP10_SHARE.toFixed(1)}%`, hint: '集中度偏高' },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索 UID…', width: 'w-48' },
          { type: 'select', key: 'tier', label: '全部等级', options: TIER_NAMES },
          { type: 'select', key: 'lock', label: '锁仓情况', options: ['含锁仓', '无锁仓'] },
        ]}
        match={(h, s) =>
          (!s.q || h.uid.includes(s.q)) &&
          (!s.tier || h.tier === s.tier) &&
          (!s.lock || (s.lock === '含锁仓' ? h.lockedAmount > 0 : h.lockedAmount === 0))
        }
        cols={cols}
        rows={[...HOLDERS].sort((a, b) => b.amount - a.amount)}
      />

      <Card className="mt-4">
        <CardHeader
          title="持币分布 · Top 10"
          sub={`前 10 名合计持有 ${TOP10_SHARE.toFixed(1)}% 流通量`}
          right={<Badge tone="warn">集中度监控</Badge>}
        />
        <div className="p-4 space-y-2.5">
          {TOP10_HOLD.map((h, i) => (
            <div key={h.uid} className="flex items-center gap-3">
              <span className="w-5 text-2xs text-faint tnum text-right">#{i + 1}</span>
              <Mono className="w-24 shrink-0">{h.uid}</Mono>
              <TierBadge t={h.tier} />
              <div className="flex-1 h-4 rounded bg-elevated overflow-hidden relative min-w-0">
                <div
                  className="h-full rounded bg-brand/60"
                  style={{ width: `${(h.amount / maxHold) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded bg-warn/60"
                  style={{ width: `${(h.lockedAmount / maxHold) * 100}%` }}
                  title="锁仓部分"
                />
              </div>
              <span className="w-24 text-right text-xs tnum">{num(h.amount, 0)}</span>
              <span className="w-14 text-right text-2xs text-muted tnum">
                {((h.amount / TOTAL_HOLD) * 100).toFixed(2)}%
              </span>
            </div>
          ))}
          <div className="flex items-center gap-4 pt-2 border-t border-line text-2xs text-faint">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand/60" />持币量</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-warn/60" />其中锁仓</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ================================================================== *
 * B-52 持币量统计
 * ================================================================== */
export function HoldingStats() {
  return (
    <ReportPage
      fnId="B-52"
      title="持币量统计"
      sub="PLT 平台币持仓规模、分层结构与分红成本"
      stats={[
        { label: '当前总持币量', value: compact(TOTAL_HOLD), delta: 6.2, hint: 'PLT' },
        { label: '持币人数', value: num(HOLDERS.length, 0), delta: 4.8 },
        { label: '锁仓占比', value: `${((TOTAL_LOCKED / TOTAL_HOLD) * 100).toFixed(1)}%`, hint: compact(TOTAL_LOCKED) + ' PLT' },
        { label: '30 日分红成本', value: compact(HOLDERS.reduce((s, h) => s + h.dividend30d, 0)), delta: 11.4 },
      ]}
      chart={HOLD_30D}
      chartLabel="持币量趋势"
      chartTone="brand"
      chartType="bar"
      cols={[
        { key: 'tier', header: '等级', cell: (r: any) => <TierBadge t={r.tier} /> },
        { key: 'users', header: '人数', align: 'right', cell: (r: any) => <span className="tnum">{num(r.users, 0)}</span> },
        { key: 'amount', header: '持币量', align: 'right', cell: (r: any) => <span className="tnum">{num(r.amount, 2)}</span> },
        {
          key: 'share', header: '占比', align: 'right',
          cell: (r: any) => (
            <div className="flex items-center justify-end gap-2">
              <div className="w-16 h-1.5 rounded-full bg-elevated overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${r.share}%` }} />
              </div>
              <span className="tnum text-muted w-12 text-right">{r.share.toFixed(2)}%</span>
            </div>
          ),
        },
        { key: 'div', header: '分红总额 (30d)', align: 'right', cell: (r: any) => <span className="tnum text-up">+{num(r.dividend, 2)}</span> },
        {
          key: 'avg', header: '人均持币', align: 'right',
          cell: (r: any) => <span className="tnum text-muted">{r.users ? num(r.amount / r.users, 2) : '—'}</span>,
        },
      ] as Col<any>[]}
      rows={[...TIER_STATS].sort((a, b) => b.amount - a.amount)}
    />
  )
}

/* ================================================================== *
 * B-53 历史分红明细
 * ================================================================== */
export function DividendHistory() {
  const [sel, setSel] = useState<Dividend | null>(null)

  const cols: Col<Dividend>[] = [
    {
      key: 'batch', header: '分红批次',
      cell: d => (
        <button onClick={() => setSel(d)} className="text-brand hover:underline">
          <Mono>{d.batch}</Mono>
        </button>
      ),
    },
    { key: 'snap', header: '快照时间', cell: d => <Mono className="text-muted">{d.snapshot}</Mono> },
    { key: 'coin', header: '币种', cell: d => <Badge tone="info">{d.coin}</Badge> },
    { key: 'users', header: '参与人数', align: 'right', cell: d => <span className="tnum">{num(d.users, 0)}</span> },
    { key: 'hold', header: '总持币量', align: 'right', cell: d => <span className="tnum">{compact(d.totalHold)}</span> },
    { key: 'apr', header: '年化', align: 'right', cell: d => <span className="tnum text-up">{d.apr.toFixed(1)}%</span> },
    { key: 'payout', header: '发放总额', align: 'right', cell: d => <Money v={d.payout} /> },
    { key: 'unit', header: '单位分红', align: 'right', cell: d => <span className="tnum text-muted">{d.perUnit.toFixed(8)}</span> },
    { key: 'status', header: '状态', cell: d => <StatusBadge s={d.status} /> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: d => <Button size="sm" variant="ghost" onClick={() => setSel(d)}><Eye className="w-3.5 h-3.5" />明细</Button>,
    },
  ]

  const detailRows = sel
    ? [...HOLDERS].sort((a, b) => b.amount - a.amount).slice(0, 12).map(h => ({
      uid: h.uid,
      tier: h.tier,
      hold: h.amount,
      share: (h.amount / TOTAL_HOLD) * 100,
      payout: +(h.amount * sel.perUnit * (TOTAL_HOLD / sel.totalHold) * (sel.totalHold / TOTAL_HOLD)).toFixed(6),
      status: '已到账',
    }))
    : []

  return (
    <>
      <ListPage<Dividend>
        fnId="B-53"
        title="历史分红明细"
        sub="点击批次号查看该期每位用户的分红明细"
        stats={[
          { label: '累计分红批次', value: num(DIVIDENDS.length, 0) },
          { label: '累计发放总额', value: compact(DIVIDENDS.reduce((s, d) => s + d.payout, 0)), hint: 'PLT 等值' },
          { label: '平均年化', value: `${(DIVIDENDS.reduce((s, d) => s + d.apr, 0) / DIVIDENDS.length).toFixed(1)}%` },
          { label: '最近一期', value: DIVIDENDS[0]?.batch ?? '—', hint: DIVIDENDS[0]?.status },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索批次号…', width: 'w-52' },
          { type: 'select', key: 'coin', label: '全部币种', options: ['PLT', 'USDT'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['已完成', '处理中'] },
        ]}
        match={(d, s) =>
          (!s.q || d.batch.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.coin || d.coin === s.coin) &&
          (!s.status || d.status === s.status)
        }
        cols={cols}
        rows={DIVIDENDS}
      />

      <Modal
        open={!!sel} onClose={() => setSel(null)} width="max-w-3xl"
        title={sel ? `${sel.batch} · 用户分红明细` : ''}
        footer={
          <div className="flex items-center gap-2">
            <span className="text-2xs text-faint">
              仅展示前 12 名，共 {sel ? num(sel.users, 0) : 0} 人
            </span>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setSel(null)}>关闭</Button>
            <Button><Download className="w-3.5 h-3.5" />导出 CSV</Button>
          </div>
        }
      >
        {sel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['快照时间', sel.snapshot],
                ['年化', `${sel.apr.toFixed(1)}%`],
                ['单位分红', sel.perUnit.toFixed(8)],
                ['发放总额', `${num(sel.payout, 2)} ${sel.coin}`],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg bg-elevated border border-line">
                  <div className="text-2xs text-faint">{k}</div>
                  <div className="text-xs font-medium tnum mt-1 truncate">{v}</div>
                </div>
              ))}
            </div>
            <Table
              dense
              rows={detailRows}
              cols={[
                { key: 'uid', header: 'UID', cell: (r: any) => <Mono>{r.uid}</Mono> },
                { key: 'tier', header: '等级', cell: (r: any) => <TierBadge t={r.tier} /> },
                { key: 'hold', header: '快照持币量', align: 'right', cell: (r: any) => <Money v={r.hold} /> },
                { key: 'share', header: '占比', align: 'right', cell: (r: any) => <span className="tnum text-muted">{r.share.toFixed(3)}%</span> },
                { key: 'payout', header: '分红', align: 'right', cell: (r: any) => <span className="tnum text-up">+{num(r.payout, 6)}</span> },
                { key: 'status', header: '状态', cell: (r: any) => <StatusBadge s={r.status} /> },
              ] as Col<any>[]}
            />
          </div>
        )}
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-54 锁仓工具
 * ================================================================== */
export function Lock() {
  const [uid, setUid] = useState('81243907')
  const [coin, setCoin] = useState('PLT')
  const [amount, setAmount] = useState('10000')
  const [days, setDays] = useState('90')
  const [mode, setMode] = useState<LockMode>('分批释放')
  const [reason, setReason] = useState('活动奖励')
  const [otp, setOtp] = useState('')
  const [ok, setOk] = useState(false)
  const [early, setEarly] = useState<LockRec | null>(null)

  const amt = +amount || 0
  const d = +days || 0

  /** 释放计划预览 — the schedule the ledger will actually book. */
  const plan = useMemo(() => {
    const rows: { i: number; date: string; pct: number; qty: number; cum: number }[] = []
    if (!amt || !d) return rows
    if (mode === '到期一次性') {
      rows.push({ i: 1, date: dstr(Date.now() + d * DAY), pct: 100, qty: amt, cum: amt })
    } else if (mode === '线性释放') {
      const n = Math.min(6, Math.max(2, Math.round(d / 30) || 2))
      for (let i = 1; i <= n; i++) {
        const qty = +(amt / n).toFixed(2)
        rows.push({
          i, date: dstr(Date.now() + (d * i / n) * DAY),
          pct: +(100 / n).toFixed(2), qty, cum: +(qty * i).toFixed(2),
        })
      }
    } else {
      for (let i = 1; i <= 4; i++) {
        const qty = +(amt / 4).toFixed(2)
        rows.push({
          i, date: dstr(Date.now() + (d * i / 4) * DAY),
          pct: 25, qty, cum: +(qty * i).toFixed(2),
        })
      }
    }
    return rows
  }, [amt, d, mode])

  const active = LOCK_RECS.filter(r => r.status !== '已释放').slice(0, 10)
  const canRun = !!uid.trim() && amt > 0 && d > 0 && otp.length === 6

  return (
    <PageShell fnId="B-54" title="锁仓工具" sub="将用户余额锁定至指定期限 — 锁仓资产可交易、可参与快照，但不可提现">
      <div className="grid xl:grid-cols-[1fr_380px] gap-4">
        <Card>
          <CardHeader title="新建锁仓" sub="锁仓将立即冻结用户对应数量的可提现余额" />
          <div className="p-4 space-y-5">
            <Field label="锁仓对象 (UID)" required>
              <div className="w-full sm:w-64">
                <Input value={uid} onChange={e => setUid(e.target.value)} placeholder="81243907" className="font-mono" />
              </div>
            </Field>

            <Field label="币种" required>
              <div className="w-full sm:w-52">
                <Select value={coin} onChange={e => setCoin(e.target.value)}
                        options={OPS_COINS.map(c => ({ value: c, label: c }))} />
              </div>
            </Field>

            <Field label="锁仓数量" required hint="不得超过用户当前可用余额">
              <div className="w-full sm:w-52">
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} suffix={coin} />
              </div>
            </Field>

            <Field label="锁仓期限" required>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-32">
                  <Input type="number" value={days} onChange={e => setDays(e.target.value)} suffix="天" />
                </div>
                <div className="flex gap-1">
                  {[30, 60, 90, 180, 365].map(p => (
                    <button
                      key={p} onClick={() => setDays(String(p))}
                      className={cn(
                        'px-2 h-8 rounded-md text-2xs border transition-colors tnum',
                        +days === p ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:text-ink',
                      )}
                    >
                      {p}D
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field label="解锁方式" required>
              <div className="grid sm:grid-cols-3 gap-2">
                {(['到期一次性', '线性释放', '分批释放'] as const).map(m => (
                  <button
                    key={m} onClick={() => setMode(m)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg border text-left transition-colors',
                      mode === m ? 'border-brand bg-brand/5' : 'border-line hover:border-faint',
                    )}
                  >
                    <div className={cn('text-xs font-medium', mode === m && 'text-brand')}>{m}</div>
                    <div className="text-2xs text-faint mt-0.5 leading-tight">
                      {m === '到期一次性' ? '到期日 100% 解锁'
                        : m === '线性释放' ? '按周期等额解锁'
                        : '4 期各 25% 解锁'}
                    </div>
                  </button>
                ))}
              </div>
            </Field>

            {/* 释放计划预览 */}
            <Field label="释放计划预览" hint="按当前参数计算的解锁排期">
              <div className="rounded-lg border border-line overflow-hidden">
                {plan.length === 0 ? (
                  <div className="py-6 text-center text-2xs text-faint">请填写锁仓数量与期限</div>
                ) : (
                  <>
                    <div className="px-4 pt-4 pb-2">
                      <div className="relative h-1 rounded-full bg-elevated">
                        <div className="absolute inset-y-0 left-0 w-full rounded-full bg-brand/20" />
                        {plan.map(p => (
                          <span
                            key={p.i}
                            className="absolute -top-1 w-3 h-3 rounded-full bg-brand border-2 border-surface -translate-x-1/2"
                            style={{ left: `${(p.cum / amt) * 100}%` }}
                            title={`${p.date} · ${p.pct}%`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-2xs text-faint tnum">
                        <span>今天</span>
                        <span>{dstr(Date.now() + d * DAY)}（到期）</span>
                      </div>
                    </div>
                    <Table
                      dense
                      rows={plan}
                      cols={[
                        { key: 'i', header: '期数', cell: (p: any) => <span className="tnum">第 {p.i} 期</span> },
                        { key: 'date', header: '解锁日期', cell: (p: any) => <Mono className="text-muted">{p.date}</Mono> },
                        { key: 'pct', header: '比例', align: 'right', cell: (p: any) => <span className="tnum">{p.pct}%</span> },
                        { key: 'qty', header: '解锁数量', align: 'right', cell: (p: any) => <span className="tnum">{num(p.qty, 2)} {coin}</span> },
                        { key: 'cum', header: '累计解锁', align: 'right', cell: (p: any) => <span className="tnum text-muted">{num(p.cum, 2)}</span> },
                      ] as Col<any>[]}
                    />
                  </>
                )}
              </div>
            </Field>

            <Field label="锁仓原因" required>
              <div className="w-full sm:w-52">
                <Select value={reason} onChange={e => setReason(e.target.value)}
                        options={['活动奖励', '赠币锁仓', '团队/顾问份额', '风控冻结', '其他'].map(x => ({ value: x, label: x }))} />
              </div>
            </Field>

            <Field label="二次验证" required>
              <TwoFa value={otp} onChange={setOtp} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-line">
            <Button disabled={!canRun} onClick={() => { setOk(true); setOtp('') }}>
              <LockIcon className="w-4 h-4" />执行锁仓
            </Button>
            {ok && <span className="text-xs text-up">✓ 锁仓已生效 · 已写入用户资产锁仓记录</span>}
            <div className="flex-1" />
            <span className="text-2xs text-faint">
              锁定 <span className="text-ink tnum">{num(amt, 2)} {coin}</span> · {d} 天
            </span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-info/30 bg-info/5">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-info" />
                <span className="text-xs font-semibold text-info">锁仓资产的账务口径</span>
              </div>
              <ul className="space-y-1.5 text-2xs text-muted leading-relaxed">
                <li>· 锁仓量从「可用余额」划入「锁仓余额」，用户总资产不变。</li>
                <li>· 锁仓余额可用于现货 / 合约交易与持仓奖励快照，但不可提现。</li>
                <li>· 若交易导致余额低于锁仓量，系统将拒绝下单（占用校验）。</li>
                <li>· 提前解锁需风控 + 财务双人复核，并记入管理员操作日志。</li>
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="锁仓概览" />
            <div className="p-4 space-y-2.5 text-xs">
              {[
                ['锁仓中记录', `${LOCK_RECS.filter(r => r.status === '锁仓中').length} 笔`],
                ['释放中记录', `${LOCK_RECS.filter(r => r.status === '释放中').length} 笔`],
                ['已释放记录', `${LOCK_RECS.filter(r => r.status === '已释放').length} 笔`],
                ['当前锁定总量', `${compact(LOCK_RECS.reduce((s, r) => s + (r.amount - r.released), 0))}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-muted">{k}</span>
                  <span className="tnum font-medium">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="当前锁仓中的记录"
          sub="包含锁仓中与释放中的记录"
          right={<Button size="sm" variant="ghost"><Download className="w-3.5 h-3.5" />导出</Button>}
        />
        <Table
          dense
          rows={active}
          cols={[
            { key: 'uid', header: 'UID', cell: (r: LockRec) => <Mono>{r.uid}</Mono> },
            { key: 'coin', header: '币种', cell: (r: LockRec) => <Badge tone="info">{r.coin}</Badge> },
            { key: 'amount', header: '锁仓量', align: 'right', cell: (r: LockRec) => <Money v={r.amount} /> },
            { key: 'released', header: '已释放', align: 'right', cell: (r: LockRec) => <span className="tnum text-up">{num(r.released, 2)}</span> },
            {
              key: 'left', header: '剩余', align: 'right',
              cell: (r: LockRec) => <span className="tnum text-warn">{num(r.amount - r.released, 2)}</span>,
            },
            { key: 'mode', header: '解锁方式', cell: (r: LockRec) => <Badge tone="muted">{r.mode}</Badge> },
            { key: 'end', header: '到期时间', cell: (r: LockRec) => <Mono className="text-muted">{r.end}</Mono> },
            { key: 'status', header: '状态', cell: (r: LockRec) => <StatusBadge s={r.status} /> },
            {
              key: 'act', header: '操作', align: 'right',
              cell: (r: LockRec) => (
                <Button size="sm" variant="ghost" onClick={() => setEarly(r)}>
                  <UnlockIcon className="w-3.5 h-3.5" />提前解锁
                </Button>
              ),
            },
          ] as Col<LockRec>[]}
        />
      </Card>

      <Modal
        open={!!early} onClose={() => setEarly(null)} title="提前解锁"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEarly(null)}>取消</Button>
            <Button variant="down" disabled={otp.length !== 6} onClick={() => { setEarly(null); setOtp('') }}>
              确认提前解锁
            </Button>
          </div>
        }
      >
        {early && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warn/5 border border-warn/30">
              <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
              <p className="text-xs text-muted leading-relaxed">
                提前解锁将立即释放剩余锁仓量至用户可用余额，用户可随时提现。此操作需风控与财务双人复核。
              </p>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['UID', early.uid],
                ['币种', early.coin],
                ['剩余锁仓量', `${num(early.amount - early.released, 2)} ${early.coin}`],
                ['原到期时间', early.end],
                ['解锁方式', early.mode],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1.5 border-b border-line/60">
                  <span className="text-muted">{k}</span>
                  <span className="tnum font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">二次验证</div>
              <TwoFa value={otp} onChange={setOtp} />
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}

/* ================================================================== *
 * B-55 解锁工具
 * ================================================================== */
export function Unlock() {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [one, setOne] = useState<LockRec | null>(null)
  const [bulk, setBulk] = useState(false)
  const [otp, setOtp] = useState('')
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  const rows = useMemo(
    () => LOCK_RECS.filter(r => r.status !== '已释放' && !doneIds.has(r.id)),
    [doneIds],
  )
  const toggle = (id: string) => setSel(s => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const allOn = rows.length > 0 && rows.every(r => sel.has(r.id))

  const selRows = rows.filter(r => sel.has(r.id))
  const selTotal = selRows.reduce((s, r) => s + (r.amount - r.released), 0)
  const target = one ? [one] : selRows
  const targetTotal = one ? one.amount - one.released : selTotal

  const finish = () => {
    setDoneIds(d => new Set([...d, ...target.map(t => t.id)]))
    setSel(new Set())
    setOne(null)
    setBulk(false)
    setOtp('')
  }

  const cols: Col<LockRec>[] = [
    {
      key: 'sel',
      width: '2.5rem',
      header: (
        <button
          onClick={() => setSel(allOn ? new Set() : new Set(rows.map(r => r.id)))}
          className={cn(
            'w-4 h-4 rounded border grid place-items-center transition-colors',
            allOn ? 'bg-brand border-brand' : 'border-line hover:border-faint',
          )}
        >
          {allOn && <Check className="w-3 h-3 text-brand-ink" />}
        </button>
      ),
      cell: r => (
        <button
          onClick={() => toggle(r.id)}
          className={cn(
            'w-4 h-4 rounded border grid place-items-center transition-colors',
            sel.has(r.id) ? 'bg-brand border-brand' : 'border-line hover:border-faint',
          )}
        >
          {sel.has(r.id) && <Check className="w-3 h-3 text-brand-ink" />}
        </button>
      ),
    },
    { key: 'uid', header: 'UID', cell: r => <Mono>{r.uid}</Mono> },
    { key: 'coin', header: '币种', cell: r => <Badge tone="info">{r.coin}</Badge> },
    { key: 'amount', header: '锁仓量', align: 'right', cell: r => <Money v={r.amount} /> },
    { key: 'released', header: '已释放', align: 'right', cell: r => <span className="tnum text-up">{num(r.released, 2)}</span> },
    {
      key: 'left', header: '待释放', align: 'right',
      cell: r => <span className="tnum text-warn font-medium">{num(r.amount - r.released, 2)}</span>,
    },
    { key: 'start', header: '锁仓开始', cell: r => <Mono className="text-muted">{r.start}</Mono> },
    {
      key: 'end', header: '到期时间',
      cell: r => (
        <div className="flex items-center gap-1.5">
          <Mono className="text-muted">{r.end}</Mono>
          {dstr(Date.now()) >= r.end && <Badge tone="up">已到期</Badge>}
        </div>
      ),
    },
    { key: 'prog', header: '释放进度', cell: r => <Bar v={(r.released / r.amount) * 100} tone="up" /> },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: r => (
        <Button size="sm" variant="outline" onClick={() => setOne(r)}>
          <UnlockIcon className="w-3.5 h-3.5" />立即解锁
        </Button>
      ),
    },
  ]

  return (
    <>
      <ListPage<LockRec>
        fnId="B-55"
        title="解锁工具"
        sub="到期自动解锁由定时任务执行；此处用于人工提前解锁与补偿性解锁"
        stats={[
          {
            label: '待解锁记录', value: num(rows.length, 0),
            hint: `${rows.filter(r => dstr(Date.now()) >= r.end).length} 笔已到期`,
          },
          { label: '待释放总量', value: compact(rows.reduce((s, r) => s + (r.amount - r.released), 0)) },
          { label: '累计已释放', value: compact(LOCK_RECS.reduce((s, r) => s + r.released, 0)), delta: 9.4 },
          {
            label: '已选中', value: num(sel.size, 0),
            hint: sel.size ? `待释放 ${num(selTotal, 2)}` : '勾选后可批量解锁',
          },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索 UID…', width: 'w-44' },
          { type: 'select', key: 'coin', label: '全部币种', options: ['PLT', 'USDT'] },
          { type: 'select', key: 'mode', label: '解锁方式', options: ['到期一次性', '线性释放', '分批释放'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['锁仓中', '释放中'] },
        ]}
        match={(r, s) =>
          (!s.q || r.uid.includes(s.q)) &&
          (!s.coin || r.coin === s.coin) &&
          (!s.mode || r.mode === s.mode) &&
          (!s.status || r.status === s.status)
        }
        cols={cols}
        rows={rows}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
            <Button size="sm" variant="danger" disabled={sel.size === 0} onClick={() => setBulk(true)}>
              <UnlockIcon className="w-3.5 h-3.5" />批量解锁 ({sel.size})
            </Button>
          </div>
        }
      />

      <Modal
        open={!!one || bulk}
        onClose={() => { setOne(null); setBulk(false); setOtp('') }}
        title={one ? '立即解锁' : `批量解锁 ${sel.size} 笔`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setOne(null); setBulk(false); setOtp('') }}>取消</Button>
            <Button variant="down" disabled={otp.length !== 6 || target.length === 0} onClick={finish}>
              确认解锁
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warn/5 border border-warn/30">
            <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              解锁后剩余锁仓量将立即进入用户可用余额并可提现，操作不可撤销。
            </p>
          </div>

          <div className="rounded-lg border border-line overflow-hidden max-h-52 overflow-y-auto scroll-thin">
            <Table
              dense
              rows={target}
              cols={[
                { key: 'uid', header: 'UID', cell: (r: LockRec) => <Mono>{r.uid}</Mono> },
                { key: 'coin', header: '币种', cell: (r: LockRec) => <span className="text-xs">{r.coin}</span> },
                {
                  key: 'left', header: '待释放', align: 'right',
                  cell: (r: LockRec) => <span className="tnum text-warn">{num(r.amount - r.released, 2)}</span>,
                },
                { key: 'end', header: '到期', cell: (r: LockRec) => <Mono className="text-muted">{r.end}</Mono> },
              ] as Col<LockRec>[]}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-elevated border border-line text-xs">
            <span className="text-muted">合计释放</span>
            <span className="tnum font-semibold">{num(targetTotal, 2)}</span>
          </div>

          <div>
            <div className="text-xs text-muted mb-1.5">二次验证</div>
            <TwoFa value={otp} onChange={setOtp} />
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ================================================================== *
 * B-56 赠币锁仓
 * ================================================================== */
export function GiftLock() {
  const totalGift = GIFT_LOCKS.reduce((s, g) => s + g.amount, 0)
  const totalLocked = GIFT_LOCKS.reduce((s, g) => s + g.remaining, 0)

  const cols: Col<GiftLockRow>[] = [
    { key: 'batch', header: '批次', cell: g => <Mono className="text-brand">{g.batch}</Mono> },
    { key: 'uid', header: 'UID', cell: g => <Mono>{g.uid}</Mono> },
    { key: 'coin', header: '币种', cell: g => <Badge tone="info">{g.coin}</Badge> },
    { key: 'amount', header: '赠送量', align: 'right', cell: g => <Money v={g.amount} /> },
    { key: 'days', header: '锁仓天数', align: 'right', cell: g => <span className="tnum">{g.lockDays} 天</span> },
    { key: 'prog', header: '解锁进度', cell: g => <Bar v={g.progress} tone="up" /> },
    { key: 'avail', header: '可用量', align: 'right', cell: g => <span className="tnum text-up">{num(g.available, 2)}</span> },
    { key: 'left', header: '剩余锁仓', align: 'right', cell: g => <span className="tnum text-warn">{num(g.remaining, 2)}</span> },
    {
      key: 'end', header: '到期时间',
      cell: g => (
        <div className="flex items-center gap-1.5">
          <Mono className="text-muted">{g.end}</Mono>
          {g.progress >= 100
            ? <Badge tone="up">已解锁</Badge>
            : <Badge tone="warn">{Math.ceil(g.lockDays * (1 - g.progress / 100))} 天后</Badge>}
        </div>
      ),
    },
    { key: 'reason', header: '赠送原因', cell: g => <span className="text-xs text-muted">{g.reason}</span> },
  ]

  return (
    <div>
      <ListPage<GiftLockRow>
        fnId="B-56"
        title="赠币锁仓"
        sub="来源于赠币工具且勾选了「锁仓」的余额"
        stats={[
          {
            label: '锁仓赠币笔数', value: num(GIFT_LOCKS.length, 0),
            hint: `占赠币总数 ${((GIFT_LOCKS.length / GIFT_ROWS.length) * 100).toFixed(0)}%`,
          },
          { label: '赠币锁仓总量', value: num(totalGift, 2), hint: '含已解锁部分' },
          {
            label: '当前仍锁定', value: num(totalLocked, 2),
            hint: `${((totalLocked / totalGift) * 100).toFixed(1)}% 未释放`,
          },
          {
            label: '平均锁仓期',
            value: `${(GIFT_LOCKS.reduce((s, g) => s + g.lockDays, 0) / GIFT_LOCKS.length).toFixed(0)} 天`,
          },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '搜索 UID / 批次…', width: 'w-52' },
          { type: 'select', key: 'coin', label: '全部币种', options: [...new Set(GIFT_LOCKS.map(g => g.coin))] },
          { type: 'select', key: 'state', label: '解锁状态', options: ['锁仓中', '已解锁'] },
        ]}
        match={(g, s) =>
          (!s.q || g.uid.includes(s.q) || g.batch.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.coin || g.coin === s.coin) &&
          (!s.state || (s.state === '已解锁' ? g.progress >= 100 : g.progress < 100))
        }
        cols={cols}
        rows={GIFT_LOCKS}
      />

      <Card className="mt-4 border-info/30 bg-info/5">
        <div className="flex items-start gap-3 px-4 py-3">
          <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-info mb-1">赠币锁仓说明</div>
            <p className="text-xs text-muted leading-relaxed">
              赠币锁仓用于防止空投用户立即抛售；锁仓期间余额可用于交易但不可提现。
              锁仓量计入用户总资产与持仓奖励快照，解锁按赠币时选择的方式（到期一次性 / 线性释放）
              由定时任务「持仓/锁仓释放」每日 04:00 自动执行。
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
