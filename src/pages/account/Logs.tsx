import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert, AlertTriangle, ChevronLeft, ChevronRight, Download,
  Check, X, RotateCcw,
} from 'lucide-react'
import {
  Button, Card, CardHeader, Badge, Table, Select, SearchBox, TabsUnderline,
  PageHeader, type Col,
} from '@/components/ui'
import { LOGIN_LOGS, type LoginLog } from '@/mock/account'
import { cn, seeded, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 操作日志 — F-10
 * 登录日志 + 安全操作日志 · 时间范围 / 状态 / 关键词筛选 · 分页
 * ------------------------------------------------------------------ */

type OpLog = {
  ts: number
  action: string
  detail: string
  ip: string
  device: string
  result: '成功' | '失败'
}

const ACTIONS: { a: string; d: string }[] = [
  { a: '修改登录密码', d: '密码强度：强 · 24h 内禁止提现已生效' },
  { a: '绑定谷歌验证器', d: 'TOTP · 密钥已生成并激活' },
  { a: '修改防钓鱼码', d: 'HX-9271 → HX-9271' },
  { a: '创建 API Key', d: 'Trading Bot · 读取 + 现货交易' },
  { a: '添加提现地址', d: 'USDT · TRC20 · TNV9o8…j6M5on' },
  { a: '关闭二次验证', d: '提现二次验证 · 验证码校验未通过' },
  { a: '移除受信任设备', d: 'Windows PC · Chrome 129' },
  { a: '设置资金密码', d: '6 位数字 · 已启用' },
  { a: '更换手机号', d: '+64 21 *** 892' },
  { a: '开启提现二次验证', d: '方式：短信验证码' },
  { a: '删除 API Key', d: 'Legacy Grid Bot' },
  { a: '编辑 API 白名单', d: 'Portfolio Tracker · +1 IP' },
  { a: '修改邮箱', d: 'de***@exchange.io' },
  { a: '重置登录密码', d: '通过邮箱验证重置' },
]

const IPS = ['203.118.24.18', '203.118.24.18', '119.28.44.201', '203.118.24.18', '45.32.118.9']
const DEVS = ['Chrome 131 · macOS', 'iOS App 1.4.2', 'Chrome 131 · Win', 'Safari 18 · iPadOS', 'Unknown']

const rnd = seeded(31337)
const OP_LOGS: OpLog[] = ACTIONS.map((x, i) => ({
  ts: Date.now() - (i * 2 + 1) * 43_200_000 - Math.floor(rnd() * 20_000_000),
  action: x.a,
  detail: x.d,
  ip: IPS[Math.floor(rnd() * IPS.length)],
  device: DEVS[Math.floor(rnd() * DEVS.length)],
  result: (x.a === '关闭二次验证' ? '失败' : '成功') as OpLog['result'],
}))

const dayOf = (ts: number) => new Date(ts).toISOString().slice(0, 10)
const PAGE = 8

export default function Logs() {
  const [tab, setTab] = useState<'login' | 'ops'>('login')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const reset = () => { setFrom(''); setTo(''); setStatus('all'); setQ(''); setPage(1) }
  const switchTab = (t: 'login' | 'ops') => { setTab(t); setPage(1) }

  const inRange = (ts: number) => {
    const d = dayOf(ts)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const failed = LOGIN_LOGS.filter(l => l.status === '失败')

  const loginRows = useMemo(() => LOGIN_LOGS.filter(l => {
    if (!inRange(l.ts)) return false
    if (status !== 'all' && l.status !== (status === 'ok' ? '成功' : '失败')) return false
    if (q && !`${l.ip} ${l.location} ${l.device}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [from, to, status, q])

  const opRows = useMemo(() => OP_LOGS.filter(l => {
    if (!inRange(l.ts)) return false
    if (status !== 'all' && l.result !== (status === 'ok' ? '成功' : '失败')) return false
    if (q && !`${l.action} ${l.detail} ${l.ip} ${l.device}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [from, to, status, q])

  const rows: (LoginLog | OpLog)[] = tab === 'login' ? loginRows : opRows
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const cur = Math.min(page, pages)
  const slice = rows.slice((cur - 1) * PAGE, cur * PAGE)

  const loginCols: Col<LoginLog>[] = [
    { key: 'ts', header: '时间', width: '24%', cell: r => <span className="text-xs text-muted tnum">{fmtDateTime(r.ts)}</span> },
    { key: 'ip', header: 'IP 地址', cell: r => <span className="text-xs font-mono tnum">{r.ip}</span> },
    { key: 'loc', header: '地点', cell: r => <span className="text-xs text-muted">{r.location}</span> },
    { key: 'dev', header: '设备', hideBelow: 'sm', cell: r => <span className="text-xs text-muted">{r.device}</span> },
    {
      key: 'st', header: '状态', align: 'right', cell: r => (
        <Badge tone={r.status === '成功' ? 'up' : 'down'}>
          {r.status === '成功' ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}{r.status}
        </Badge>
      ),
    },
  ]

  const opCols: Col<OpLog>[] = [
    { key: 'ts', header: '时间', width: '20%', cell: r => <span className="text-xs text-muted tnum">{fmtDateTime(r.ts)}</span> },
    {
      key: 'act', header: '操作', cell: r => (
        <div className="min-w-0">
          <div className="text-xs font-medium">{r.action}</div>
          <div className="text-2xs text-faint mt-0.5 truncate">{r.detail}</div>
        </div>
      ),
    },
    { key: 'ip', header: 'IP 地址', hideBelow: 'sm', cell: r => <span className="text-xs font-mono tnum">{r.ip}</span> },
    { key: 'dev', header: '设备', hideBelow: 'md', cell: r => <span className="text-xs text-muted">{r.device}</span> },
    {
      key: 'res', header: '结果', align: 'right', cell: r => (
        <Badge tone={r.result === '成功' ? 'up' : 'down'}>
          {r.result === '成功' ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}{r.result}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="操作日志"
        sub="登录记录与安全操作审计 · 保留 180 天"
        actions={
          <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
        }
      />

      {/* --------------------- 登录失败告警 --------------------- */}
      {tab === 'login' && failed.length > 0 && (
        <Card className="mb-4 border-warn/40 bg-warn/5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5">
            <span className="flex items-center gap-2 shrink-0">
              <ShieldAlert className="w-4 h-4 text-warn" />
              <Badge tone="warn">安全告警</Badge>
            </span>
            <p className="text-xs text-muted flex-1 leading-relaxed">
              检测到 <b className="text-warn tnum">{failed.length}</b> 次登录失败
              （<b className="text-ink">{failed[0].location}</b>，
              <b className="text-ink font-mono tnum">{failed[0].ip}</b>）。
              如非本人操作，请立即修改密码并检查安全设置。
            </p>
            <Link to="/account/security" className="shrink-0">
              <Button size="sm">立即修改密码</Button>
            </Link>
          </div>
        </Card>
      )}

      <Card>
        <div className="px-4 pt-1">
          <TabsUnderline
            value={tab} onChange={switchTab}
            tabs={[
              { id: 'login', label: <span className="flex items-center gap-1.5">登录日志 <span className="text-2xs text-faint tnum">{LOGIN_LOGS.length}</span></span> },
              { id: 'ops', label: <span className="flex items-center gap-1.5">安全操作日志 <span className="text-2xs text-faint tnum">{OP_LOGS.length}</span></span> },
            ]}
          />
        </div>

        {/* ------------------------------ Filters ----------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b border-line">
          <div className="flex items-center gap-2">
            <input
              type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
              className="h-9 px-2.5 rounded-lg bg-elevated border border-line text-xs tnum outline-none focus:border-brand text-muted w-full sm:w-36"
            />
            <span className="text-faint text-xs shrink-0">→</span>
            <input
              type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
              className="h-9 px-2.5 rounded-lg bg-elevated border border-line text-xs tnum outline-none focus:border-brand text-muted w-full sm:w-36"
            />
          </div>

          <div className="w-full sm:w-32">
            <Select
              className="h-9"
              value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'ok', label: '成功' },
                { value: 'fail', label: '失败' },
              ]}
            />
          </div>

          <SearchBox
            value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder={tab === 'login' ? '搜索 IP / 地点 / 设备…' : '搜索操作 / IP / 设备…'}
            className="flex-1"
          />

          <Button variant="ghost" size="sm" className="shrink-0" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" />重置
          </Button>
        </div>

        {/* ------------------------------- Table ------------------------------ */}
        {tab === 'login'
          ? <Table cols={loginCols} rows={slice as LoginLog[]} empty="该时间范围内没有登录记录" />
          : <Table cols={opCols} rows={slice as OpLog[]} empty="该时间范围内没有安全操作记录" />}

        {/* ----------------------------- Pagination --------------------------- */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
          <span className="text-2xs text-faint tnum">
            共 {rows.length} 条 · 第 {cur} / {pages} 页
          </span>
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

      {/* ------------------------------ Footnote ------------------------------ */}
      <div className="flex items-start gap-2 mt-4 text-2xs text-faint leading-relaxed">
        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
        日志由服务端异步落库，最长延迟 30 秒。IP 归属地基于 GeoIP 库推断，仅供参考。
        如需 180 天以上的审计记录，请通过工单向合规团队申请。
      </div>
    </div>
  )
}
