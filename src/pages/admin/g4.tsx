import React, { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Plus, Play, Download, Upload, Pencil, Trash2, Ban, KeyRound,
  ChevronUp, ChevronDown, Check, Clock, Shield, Activity, History, Globe,
  Smartphone, RotateCcw, Repeat, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Users, Megaphone, Headphones, Gift, Code2, HelpCircle, LayoutGrid, Zap, Link2,
} from 'lucide-react'
import {
  ListPage, ConfigPage, PermissionTree, ConflictNote,
  StatusBadge, Sev, Mono, Money, HealthDot,
  Card, CardHeader, Button, Input, Select, Badge, Table, Toggle, Modal, Stat,
  type Col,
} from './kit'
import { PercentSlider, Tabs } from '@/components/ui'
import { BarChart, Sparkline } from '@/components/charts'
import {
  STAFF, ROLES, PERM_TREE, CRON_JOBS, I18N_KEYS, HEDGE, RISK_ALERTS,
  WAF_BLOCKED, WAF_IPS, APP_RELEASES, PAYMENT_ORDERS, ADMIN_USERS, COINS,
  type Staff as StaffRow, type I18nKey, type CronJob,
} from '@/mock/admin'
import { API_KEYS, CHAINS } from '@/mock/account'
import { cn, num, usd, compact, fmtDateTime, shortAddr, seeded } from '@/lib/utils'

/* ================================================================== *
 * g4 — 系统配置 (B-57…B-73) + 风控/安全 (F-50…F-53)
 * 20 back-office pages. All data mocked, all interactions local.
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * Shared local primitives
 * ------------------------------------------------------------------ */

type Tone = 'brand' | 'up' | 'warn' | 'down' | 'info'
const TONE_BG: Record<Tone, string> = {
  brand: 'bg-brand', up: 'bg-up', warn: 'bg-warn', down: 'bg-down', info: 'bg-info',
}

/** Thin progress bar. `v` is a 0..1 ratio. */
function Bar({ v, tone = 'brand', className }: { v: number; tone?: Tone; className?: string }) {
  const w = Math.max(0, Math.min(100, v * 100))
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-elevated overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', TONE_BG[tone])} style={{ width: `${w}%` }} />
    </div>
  )
}

/** Page-level banner. Used for the "wallet service failed" / "out of scope" callouts. */
function Note({
  tone = 'warn', title, children, right,
}: { tone?: 'warn' | 'down' | 'info'; title: React.ReactNode; children?: React.ReactNode; right?: React.ReactNode }) {
  const box = tone === 'warn' ? 'border-warn/30 bg-warn/5'
            : tone === 'down' ? 'border-down/30 bg-down/5'
            : 'border-info/30 bg-info/5'
  const ic = tone === 'warn' ? 'text-warn' : tone === 'down' ? 'text-down' : 'text-info'
  return (
    <Card className={cn('mb-4', box)}>
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', ic)} />
        <div className="min-w-0 flex-1">
          <div className={cn('text-xs font-semibold mb-0.5', ic)}>{title}</div>
          {children && <div className="text-xs text-muted leading-relaxed">{children}</div>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </Card>
  )
}

/** Click-to-edit table cell. Empty value renders a 缺失 badge. */
function EditCell({
  value, onSave, width = 'w-32',
}: { value: string; onSave: (v: string) => void; width?: string }) {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(value)
  if (edit) {
    return (
      <input
        autoFocus value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { onSave(v.trim()); setEdit(false) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(v.trim()); setEdit(false) }
          if (e.key === 'Escape') setEdit(false)
        }}
        className={cn('h-7 px-2 rounded bg-elevated border border-brand text-xs outline-none tnum', width)}
      />
    )
  }
  return (
    <button
      onClick={() => { setV(value); setEdit(true) }}
      className={cn(
        'h-7 px-2 -mx-2 rounded text-left text-xs hover:bg-elevated transition-colors truncate',
        width, !value && 'text-faint',
      )}
      title="点击编辑"
    >
      {value || <Badge tone="warn">缺失</Badge>}
    </button>
  )
}

/** Overlapping initial-avatars for the role cards. */
function Avatars({ names }: { names: string[] }) {
  return (
    <div className="flex items-center">
      {names.slice(0, 5).map((n, i) => (
        <span
          key={i}
          className={cn(
            'w-6 h-6 rounded-full grid place-items-center text-2xs font-semibold shrink-0',
            'bg-brand/20 text-brand ring-2 ring-surface',
            i > 0 && '-ml-2',
          )}
        >
          {n.slice(0, 1)}
        </span>
      ))}
      {names.length > 5 && (
        <span className="-ml-2 w-6 h-6 rounded-full grid place-items-center text-2xs bg-elevated text-muted ring-2 ring-surface">
          +{names.length - 5}
        </span>
      )}
    </div>
  )
}

const Yes = () => <Check className="w-3.5 h-3.5 text-up inline" />
const No = () => <span className="text-down text-xs">✗</span>

const UIDS = ADMIN_USERS.map(u => u.uid)
const PRICES: Record<string, number> = { BTC: 97_842.31, ETH: 3_412.88, SOL: 218.42, BNB: 692.15, USDT: 1 }
const LANGS = [
  { id: 'zh' as const, label: '中文' },
  { id: 'en' as const, label: 'English' },
  { id: 'ja' as const, label: '日本語' },
  { id: 'ko' as const, label: '한국어' },
]

/* ================================================================== *
 * B-57 员工管理
 * ================================================================== */
export function Staff() {
  const [rows, setRows] = useState<StaffRow[]>(STAFF)
  const [open, setOpen] = useState(false)
  const [pwd, setPwd] = useState<StaffRow | null>(null)
  const [edit, setEdit] = useState<StaffRow | null>(null)
  const [form, setForm] = useState({ user: '', name: '', role: ROLES[3].name, dept: '运营部', pass: '', twoFa: true })

  const noTwoFa = rows.filter(s => s.status === '启用' && !s.twoFa)

  const submit = () => {
    if (edit) {
      setRows(rs => rs.map(r => r.id === edit.id
        ? { ...r, user: form.user, name: form.name, role: form.role, dept: form.dept, twoFa: form.twoFa }
        : r))
    } else {
      setRows(rs => [{
        id: `S${rs.length + 1}`, user: form.user || `staff${rs.length + 1}`, name: form.name || '未命名',
        role: form.role, dept: form.dept, status: '启用', lastLogin: '—', twoFa: form.twoFa,
      }, ...rs])
    }
    setOpen(false); setEdit(null)
  }

  const cols: Col<StaffRow>[] = [
    { key: 'user', header: '用户名', cell: r => <Mono>{r.user}</Mono> },
    { key: 'name', header: '姓名', cell: r => r.name },
    { key: 'role', header: '角色', cell: r => <Badge tone={r.role === '超级管理员' ? 'brand' : 'info'}>{r.role}</Badge> },
    { key: 'dept', header: '部门', cell: r => <span className="text-muted text-xs">{r.dept}</span> },
    { key: 'fa', header: '2FA', align: 'center', cell: r => (r.twoFa ? <Yes /> : <No />) },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    { key: 'last', header: '最后登录', hideBelow: 'md', cell: r => <span className="text-2xs text-muted tnum">{r.lastLogin}</span> },
    {
      key: 'act', header: '操作', align: 'right', cell: r => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => {
            setEdit(r); setForm({ user: r.user, name: r.name, role: r.role, dept: r.dept, pass: '', twoFa: r.twoFa }); setOpen(true)
          }}>
            <Pencil className="w-3.5 h-3.5" />编辑
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRows(rs => rs.map(x =>
            x.id === r.id ? { ...x, status: x.status === '启用' ? '停用' : '启用' } : x))}>
            <Ban className="w-3.5 h-3.5" />{r.status === '启用' ? '停用' : '启用'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPwd(r)}>
            <KeyRound className="w-3.5 h-3.5" />重置密码
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {noTwoFa.length > 0 && (
        <Note tone="warn" title={`${noTwoFa.length} 名员工未启用双因素认证`}>
          {noTwoFa.map(s => s.name).join('、')} — 后台账户强制 2FA 是上线前的合规要求，请在员工编辑中开启「强制 2FA」。
        </Note>
      )}
      <ListPage
        title="员工管理" sub="B-57 · 后台账户与所属角色"
        stats={[
          { label: '员工总数', value: rows.length, hint: '含停用' },
          { label: '启用中', value: rows.filter(r => r.status === '启用').length },
          { label: '已启用 2FA', value: `${rows.filter(r => r.twoFa).length}/${rows.length}` },
          { label: '角色数', value: ROLES.length },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '用户名 / 姓名' },
          { type: 'select', key: 'role', label: '全部角色', options: ROLES.map(r => r.name) },
          { type: 'select', key: 'status', label: '全部状态', options: ['启用', '停用'] },
        ]}
        match={(r, s) =>
          (!s.q || (r.user + r.name).toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.role || r.role === s.role) &&
          (!s.status || r.status === s.status)
        }
        actions={
          <Button size="sm" onClick={() => {
            setEdit(null); setForm({ user: '', name: '', role: ROLES[3].name, dept: '运营部', pass: '', twoFa: true }); setOpen(true)
          }}>
            <Plus className="w-3.5 h-3.5" />新增员工
          </Button>
        }
        cols={cols} rows={rows} perPage={10}
      />

      <Modal
        open={open} onClose={() => setOpen(false)} title={edit ? `编辑员工 · ${edit.user}` : '新增员工'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={submit}>{edit ? '保存' : '创建'}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="用户名" value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} placeholder="finance2" />
          <Input label="姓名" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="张三" />
          <Select
            label="角色" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={ROLES.map(r => ({ value: r.name, label: `${r.name} — ${r.desc}` }))}
          />
          <Select
            label="部门" value={form.dept}
            onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}
            options={['技术部', '财务部', '风控部', '合规部', '运营部', '客服部'].map(d => ({ value: d, label: d }))}
          />
          <Input
            label="初始密码" type="text" value={form.pass}
            onChange={e => setForm(f => ({ ...f, pass: e.target.value }))}
            placeholder="首次登录后强制修改" suffix="≥12 位"
          />
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xs font-medium">强制双因素认证</div>
              <div className="text-2xs text-faint mt-0.5">登录后台必须绑定 Google Authenticator</div>
            </div>
            <Toggle checked={form.twoFa} onChange={v => setForm(f => ({ ...f, twoFa: v }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!pwd} onClose={() => setPwd(null)} title="重置密码"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPwd(null)}>关闭</Button>
            <Button variant="danger" onClick={() => setPwd(null)}>确认重置</Button>
          </div>
        }
      >
        <p className="text-sm text-muted mb-3">
          将为 <span className="text-ink font-medium">{pwd?.name}（{pwd?.user}）</span> 生成一次性密码，
          该员工下次登录后必须立即修改。操作将记入管理员操作日志。
        </p>
        <div className="rounded-lg bg-elevated border border-line px-3 py-2.5">
          <div className="text-2xs text-faint mb-1">临时密码</div>
          <Mono className="text-sm">Tmp-{pwd?.user ?? ''}-8Q2xM4</Mono>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-58 角色管理
 * ================================================================== */
const ROLE_MEMBERS: Record<string, string[]> = {
  超级管理员: ['系统管理员'],
  财务: ['张财务', '李出纳', '周会计'],
  风控: ['李风控', '赵风控'],
  'KYC 审核员': ['王审核', '孙审核', '钱审核', '吴审核'],
  运营: ['陈运营', '郑运营', '冯运营', '卫运营', '蒋运营'],
  客服: ['刘客服', '沈客服', '韩客服', '杨客服', '朱客服', '秦客服', '尤客服', '许客服'],
}

export function Roles() {
  const [rows, setRows] = useState(ROLES)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', desc: '' })

  const cols: Col<(typeof ROLES)[number]>[] = [
    { key: 'name', header: '角色名', cell: r => <span className="font-medium">{r.name}</span> },
    { key: 'desc', header: '描述', cell: r => <span className="text-xs text-muted">{r.desc}</span> },
    { key: 'members', header: '成员数', align: 'right', cell: r => <span className="tnum">{r.members}</span> },
    { key: 'perms', header: '权限数', align: 'right', cell: r => <Badge tone="brand">{r.perms}</Badge> },
    {
      key: 'act', header: '操作', align: 'right', cell: r => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost"><Shield className="w-3.5 h-3.5" />编辑权限</Button>
          <Button
            size="sm" variant="ghost" disabled={r.name === '超级管理员'}
            onClick={() => setRows(rs => rs.filter(x => x.id !== r.id))}
          >
            <Trash2 className="w-3.5 h-3.5" />删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <ListPage
        title="角色管理" sub="B-58 · RBAC 角色定义，权限明细在「权限管理」中按角色配置"
        stats={[
          { label: '角色数', value: rows.length },
          { label: '已分配成员', value: rows.reduce((s, r) => s + r.members, 0) },
          { label: '权限点总数', value: 128, hint: '模块 × 页面 × 操作' },
          { label: '最小权限角色', value: 'KYC 审核员', hint: '6 个权限点' },
        ]}
        filters={[{ type: 'search', key: 'q', placeholder: '角色名 / 描述' }]}
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />新增角色</Button>}
        cols={cols} rows={rows}
      />

      <div className="mt-6">
        <div className="text-sm font-semibold mb-3">角色成员分布</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.name}</div>
                  <div className="text-2xs text-muted mt-0.5 truncate">{r.desc}</div>
                </div>
                <Badge tone="brand">{r.perms} 权限</Badge>
              </div>
              <Avatars names={ROLE_MEMBERS[r.name] ?? ['—']} />
              <div className="flex items-center justify-between mt-3">
                <span className="text-2xs text-faint tnum">{r.members} 名成员</span>
                <button className="text-2xs text-brand hover:underline">编辑权限 →</button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        open={open} onClose={() => setOpen(false)} title="新增角色"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              disabled={!form.name.trim()}
              onClick={() => {
                setRows(rs => [...rs, { id: `R${rs.length + 1}`, name: form.name, desc: form.desc, members: 0, perms: 0 }])
                setForm({ name: '', desc: '' }); setOpen(false)
              }}
            >
              创建
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="角色名" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="市场" />
          <Input label="描述" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="活动、公告、Banner" />
          <p className="text-2xs text-faint">创建后请前往「权限管理」为该角色勾选权限点。</p>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-59 权限管理 — showcase: PermissionTree + 角色 loader + 全选/全不选
 * ================================================================== */
export function Permissions() {
  const [role, setRole] = useState(ROLES[1].name)
  const [seq, setSeq] = useState(0)     // remount token — "loads" the role's template
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  /** The tree owns its own checked-set; drive it through its module checkboxes. */
  const applyAll = (on: boolean) => {
    let pass = 0
    const step = () => {
      const root = box.current
      if (!root || pass++ > 3) return
      let acted = false
      root.querySelectorAll<HTMLButtonElement>('.card > div:first-child > button').forEach(btn => {
        const st = btn.classList.contains('bg-brand') ? 'all'
                 : btn.classList.contains('bg-brand/20') ? 'some' : 'none'
        if (on ? st !== 'all' : st !== 'none') { btn.click(); acted = true }
      })
      if (acted) requestAnimationFrame(step)
    }
    step()
    setDirty(true); setSaved(false)
  }

  const total = PERM_TREE.reduce((s, m) => s + m.children.reduce((t, p) => t + p.ops.length, 0), 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">权限管理</h1>
          <p className="text-xs text-muted mt-0.5">B-59 · 模块 → 页面 → 操作三级权限树，共 {total} 个权限点</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-up">✓ 已保存</span>}
          {dirty && !saved && <span className="text-xs text-warn">有未保存的更改</span>}
          <Button size="sm" disabled={!dirty} onClick={() => { setDirty(false); setSaved(true) }}>
            <Check className="w-3.5 h-3.5" />保存权限
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-56">
            <Select
              label="角色" value={role}
              onChange={e => { setRole(e.target.value); setSeq(s => s + 1); setDirty(false); setSaved(false) }}
              options={ROLES.map(r => ({ value: r.name, label: r.name }))}
            />
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Button size="sm" variant="outline" onClick={() => applyAll(true)}>全选</Button>
            <Button size="sm" variant="outline" onClick={() => applyAll(false)}>全不选</Button>
            <Button size="sm" variant="ghost" onClick={() => { setSeq(s => s + 1); setDirty(false); setSaved(false) }}>
              <RotateCcw className="w-3.5 h-3.5" />重置为已保存
            </Button>
          </div>
          <div className="flex-1" />
          <p className="text-2xs text-faint max-w-xs pb-1">
            当前编辑：<span className="text-ink">{role}</span> —
            {ROLES.find(r => r.name === role)?.desc}。父级复选框支持半选（indeterminate）状态。
          </p>
        </div>
      </Card>

      <div ref={box} onClickCapture={() => { setDirty(true); setSaved(false) }}>
        <PermissionTree key={`${role}-${seq}`} tree={PERM_TREE} />
      </div>
    </div>
  )
}

/* ================================================================== *
 * B-60 管理员操作日志
 * ================================================================== */
type SysLogRow = {
  id: string; ts: string; date: string; op: string; type: string
  target: string; ip: string; detail: string; result: '成功' | '失败'; high: boolean
}

const HIGH_OPS = ['平账', '赠币', '冻结账户', '调整费率']
const CFG_KEYS = [
  'trade.spot_enabled', 'withdraw.daily_limit_usd', 'fee.vip3.maker',
  'system.maintenance_mode', 'kyc.required_for_withdraw', 'funding.interval_hours',
]
const OPERATORS = ['admin', 'finance1', 'risk1', 'kyc1', 'ops1', 'cs1']
const LOG_TYPES = ['登录', '审核通过', '审核驳回', '修改配置', '赠币', '平账', '冻结账户', '调整费率']

const SYS_LOGS: SysLogRow[] = (() => {
  const rd = seeded(600_057)
  const detail = (t: string, target: string) => {
    switch (t) {
      case '登录': return '管理后台登录成功 · Chrome 131 · macOS'
      case '审核通过': return `提币申请 W${9000 + Math.floor(rd() * 30)} 审核通过 · ${num(rd() * 40_000 + 500, 2)} USDT`
      case '审核驳回': return 'KYC 申请驳回 · 证件模糊，要求重新提交'
      case '修改配置': return `${target} 由 false 改为 true`
      case '赠币': return `发放 ${num(rd() * 300 + 20, 2)} USDT · 新用户注册奖励`
      case '平账': return 'ETH 账面差异 -0.0062 手工平账 · 已生成调账凭证'
      case '冻结账户': return '风控命中：同 IP 多账户 + 新地址大额提现'
      case '调整费率': return 'VIP3 Maker 费率 0.010% → 0.008%'
      default: return '—'
    }
  }
  return Array.from({ length: 42 }, (_, i) => {
    const type = LOG_TYPES[Math.floor(rd() * LOG_TYPES.length)]
    const isCfg = type === '修改配置' || type === '调整费率'
    const target = isCfg ? CFG_KEYS[Math.floor(rd() * CFG_KEYS.length)] : UIDS[Math.floor(rd() * UIDS.length)]
    const ts = Date.now() - Math.floor(rd() * 9 * 86_400_000) - i * 900_000
    const s = fmtDateTime(ts)
    return {
      id: `SL${1000 + i}`, ts: s, date: s.slice(0, 10),
      op: OPERATORS[Math.floor(rd() * OPERATORS.length)],
      type, target, detail: detail(type, target),
      ip: `${Math.floor(rd() * 120 + 40)}.${Math.floor(rd() * 255)}.${Math.floor(rd() * 90 + 10)}.${Math.floor(rd() * 250 + 2)}`,
      result: (rd() > 0.06 ? '成功' : '失败') as SysLogRow['result'],
      high: HIGH_OPS.includes(type),
    }
  }).sort((a, b) => (a.ts < b.ts ? 1 : -1))
})()

export function SysLogs() {
  const cols: Col<SysLogRow>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-2xs text-muted tnum">{r.ts}</span> },
    { key: 'op', header: '操作人', cell: r => <Mono>{r.op}</Mono> },
    {
      key: 'type', header: '操作类型', cell: r => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{r.type}</span>
          {r.high && <Badge tone="warn">高危</Badge>}
        </div>
      ),
    },
    { key: 'target', header: '目标', cell: r => <Mono className="text-muted">{r.target}</Mono> },
    { key: 'ip', header: 'IP', hideBelow: 'md', cell: r => <Mono className="text-muted">{r.ip}</Mono> },
    {
      key: 'detail', header: '详情', hideBelow: 'lg',
      cell: r => <span className="text-2xs text-muted">{r.detail}</span>,
    },
    { key: 'result', header: '结果', align: 'right', cell: r => <StatusBadge s={r.result === '成功' ? '已完成' : '失败'} /> },
  ]

  return (
    <ListPage
      title="管理员操作日志" sub="B-60 · 所有后台写操作留痕，高危操作单独标记，日志不可删除"
      stats={[
        { label: '日志条数', value: SYS_LOGS.length, hint: '近 10 天' },
        { label: '高危操作', value: SYS_LOGS.filter(l => l.high).length, hint: '平账 / 赠币 / 冻结 / 调费率' },
        { label: '失败操作', value: SYS_LOGS.filter(l => l.result === '失败').length },
        { label: '活跃操作人', value: new Set(SYS_LOGS.map(l => l.op)).size },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '目标 / 详情 / IP' },
        { type: 'select', key: 'op', label: '全部操作人', options: OPERATORS },
        { type: 'select', key: 'type', label: '全部类型', options: LOG_TYPES },
        { type: 'date', key: 'from' },
        { type: 'date', key: 'to' },
      ]}
      match={(r, s) =>
        (!s.q || `${r.target} ${r.detail} ${r.ip} ${r.op}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.op || r.op === s.op) &&
        (!s.type || r.type === s.type) &&
        (!s.from || r.date >= s.from) &&
        (!s.to || r.date <= s.to)
      }
      cols={cols} rows={SYS_LOGS} perPage={12} dense
    />
  )
}

/* ================================================================== *
 * B-61 多语言配置
 * ================================================================== */
type LangId = 'zh' | 'en' | 'ja' | 'ko'

function downloadJson(name: string, data: unknown) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  } catch { /* prototype — no-op */ }
}

export function I18n() {
  const [data, setData] = useState<I18nKey[]>(I18N_KEYS)
  const [importOpen, setImportOpen] = useState(false)

  const save = (key: string, lang: LangId, v: string) =>
    setData(d => d.map(r => (r.key === key ? { ...r, [lang]: v } : r)))

  const pctOf = (lang: LangId) =>
    Math.round((data.filter(r => r[lang].trim() !== '').length / data.length) * 100)

  const modules = Array.from(new Set(data.map(d => d.module)))

  const langCol = (lang: LangId, header: string): Col<I18nKey> => ({
    key: lang, header,
    cell: r => <EditCell value={r[lang]} onSave={v => save(r.key, lang, v)} width="w-28" />,
  })

  const cols: Col<I18nKey>[] = [
    { key: 'module', header: '模块', cell: r => <Badge tone="info">{r.module}</Badge> },
    { key: 'key', header: 'Key', cell: r => <Mono>{r.key}</Mono> },
    langCol('zh', '中文'),
    langCol('en', 'English'),
    langCol('ja', '日本語'),
    langCol('ko', '한국어'),
    {
      key: 'done', header: '完成度', align: 'right', width: '110px',
      cell: r => {
        const n = (['zh', 'en', 'ja', 'ko'] as LangId[]).filter(l => r[l].trim() !== '').length
        return (
          <div className="flex items-center justify-end gap-2">
            <Bar v={n / 4} tone={n === 4 ? 'up' : n >= 2 ? 'warn' : 'down'} className="w-12" />
            <span className="text-2xs text-muted tnum w-8">{n}/4</span>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <ListPage
        title="多语言配置" sub="B-61 · 单元格点击即可编辑，缺失翻译会在前端回退到英文"
        stats={[
          { label: '总条目', value: data.length, hint: `${modules.length} 个模块` },
          { label: '中文完成度', value: `${pctOf('zh')}%` },
          { label: '英文完成度', value: `${pctOf('en')}%` },
          { label: '日文完成度', value: `${pctOf('ja')}%`, hint: '缺失将回退英文' },
          { label: '韩文完成度', value: `${pctOf('ko')}%`, hint: '缺失将回退英文' },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: 'Key / 译文' },
          { type: 'select', key: 'module', label: '全部模块', options: modules },
          { type: 'select', key: 'missing', label: '全部状态', options: ['仅缺失'] },
        ]}
        match={(r, s) =>
          (!s.q || `${r.key} ${r.zh} ${r.en} ${r.ja} ${r.ko}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.module || r.module === s.module) &&
          (!s.missing || !r.zh || !r.en || !r.ja || !r.ko)
        }
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-3.5 h-3.5" />导入语言包
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadJson('i18n.json', data)}>
              <Download className="w-3.5 h-3.5" />导出 JSON
            </Button>
          </div>
        }
        cols={cols} rows={data} perPage={12} dense
      />

      <Modal
        open={importOpen} onClose={() => setImportOpen(false)} title="导入语言包 (JSON)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>取消</Button>
            <Button onClick={() => setImportOpen(false)}>解析并合并</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid place-items-center h-28 rounded-lg border border-dashed border-line bg-elevated text-xs text-faint">
            拖拽 .json 文件到此处，或点击选择
          </div>
          <Select
            label="导入语言" defaultValue="ja"
            options={LANGS.map(l => ({ value: l.id, label: l.label }))}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs">覆盖已有译文</span>
            <Toggle checked={false} onChange={() => {}} />
          </div>
          <p className="text-2xs text-faint">格式：<Mono>{'{ "trade.buy": "買い", ... }'}</Mono></p>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-62 多语言模板
 * ================================================================== */
type TplRow = {
  id: string; name: string; kind: '邮件模板' | '短信模板' | '站内信模板' | '推送模板'
  scene: string; langs: LangId[]; status: string
  body: Record<LangId, string>
}

const TEMPLATES: TplRow[] = [
  {
    id: 'T1', name: '注册验证码', kind: '短信模板', scene: '注册验证码', langs: ['zh', 'en', 'ja', 'ko'], status: '启用',
    body: {
      zh: '【交易所】您的注册验证码为 {{code}}，10 分钟内有效，请勿泄露。',
      en: 'Your verification code is {{code}}. Valid for 10 minutes. Do not share it.',
      ja: '認証コードは {{code}} です。10 分間有効です。',
      ko: '인증번호는 {{code}} 입니다. 10분간 유효합니다.',
    },
  },
  {
    id: 'T2', name: '提现确认', kind: '邮件模板', scene: '提现确认', langs: ['zh', 'en', 'ja'], status: '启用',
    body: {
      zh: '您正在提现 {{amount}} {{coin}} 至地址 {{address}}。确认码：{{code}}。若非本人操作请立即冻结账户。',
      en: 'You are withdrawing {{amount}} {{coin}} to {{address}}. Confirmation code: {{code}}.',
      ja: '{{address}} 宛に {{amount}} {{coin}} を出金します。確認コード：{{code}}。',
      ko: '',
    },
  },
  {
    id: 'T3', name: 'KYC 审核通过', kind: '站内信模板', scene: 'KYC通过', langs: ['zh', 'en', 'ja', 'ko'], status: '启用',
    body: {
      zh: '尊敬的 {{nickname}}，您的实名认证（Level {{level}}）已通过审核，提现额度已提升至 {{limit}} USDT/日。',
      en: 'Hi {{nickname}}, your Level {{level}} verification is approved. Daily withdrawal limit is now {{limit}} USDT.',
      ja: '{{nickname}} 様、本人確認（レベル {{level}}）が承認されました。',
      ko: '{{nickname}} 님, 실명인증(레벨 {{level}})이 승인되었습니다.',
    },
  },
  {
    id: 'T4', name: '强平通知', kind: '推送模板', scene: '强平通知', langs: ['zh', 'en'], status: '启用',
    body: {
      zh: '您的 {{symbol}} {{side}} 仓位已于 {{price}} 被强制平仓，保证金率低于维持保证金要求。',
      en: 'Your {{symbol}} {{side}} position was liquidated at {{price}} — margin ratio below maintenance.',
      ja: '', ko: '',
    },
  },
  {
    id: 'T5', name: '登录异常提醒', kind: '邮件模板', scene: '安全提醒', langs: ['zh', 'en', 'ja', 'ko'], status: '启用',
    body: {
      zh: '检测到您的账户于 {{time}} 在 {{location}}（IP {{ip}}）登录，若非本人操作请立即修改密码。',
      en: 'New login at {{time}} from {{location}} (IP {{ip}}). If this was not you, change your password.',
      ja: '{{time}} に {{location}}（IP {{ip}}）からログインがありました。',
      ko: '{{time}} 에 {{location}}(IP {{ip}})에서 로그인이 감지되었습니다.',
    },
  },
  {
    id: 'T6', name: '充值到账', kind: '推送模板', scene: '充值到账', langs: ['zh', 'en', 'ko'], status: '启用',
    body: {
      zh: '您的 {{amount}} {{coin}} 充值已到账（{{confirms}} 确认）。',
      en: 'Deposit of {{amount}} {{coin}} credited ({{confirms}} confirmations).',
      ja: '',
      ko: '{{amount}} {{coin}} 입금이 완료되었습니다.',
    },
  },
  {
    id: 'T7', name: '资金费率结算', kind: '站内信模板', scene: '资金费用', langs: ['zh', 'en'], status: '停用',
    body: {
      zh: '本期资金费率 {{rate}}，您的 {{symbol}} 仓位{{direction}} {{amount}} USDT。',
      en: 'Funding rate {{rate}}. Your {{symbol}} position {{direction}} {{amount}} USDT.',
      ja: '', ko: '',
    },
  },
  {
    id: 'T8', name: '找回密码', kind: '邮件模板', scene: '找回密码', langs: ['zh', 'en', 'ja', 'ko'], status: '启用',
    body: {
      zh: '点击链接重置密码：{{link}}，30 分钟内有效。',
      en: 'Reset your password: {{link}} — valid for 30 minutes.',
      ja: 'パスワード再設定：{{link}}（30 分間有効）',
      ko: '비밀번호 재설정: {{link}} (30분간 유효)',
    },
  },
]

export function I18nTemplate() {
  const [rows, setRows] = useState(TEMPLATES)
  const [edit, setEdit] = useState<TplRow | null>(null)
  const [tab, setTab] = useState<LangId>('zh')
  const [draft, setDraft] = useState<Record<LangId, string>>({ zh: '', en: '', ja: '', ko: '' })

  const openEdit = (r: TplRow) => { setEdit(r); setDraft({ ...r.body }); setTab('zh') }

  const cols: Col<TplRow>[] = [
    { key: 'name', header: '模板名', cell: r => <span className="font-medium text-xs">{r.name}</span> },
    { key: 'kind', header: '类型', cell: r => <Badge tone="info">{r.kind}</Badge> },
    { key: 'scene', header: '触发场景', cell: r => <span className="text-xs text-muted">{r.scene}</span> },
    {
      key: 'langs', header: '已翻译语言', cell: r => (
        <div className="flex flex-wrap gap-1">
          {LANGS.map(l => (
            <Badge key={l.id} tone={r.body[l.id].trim() ? 'up' : 'muted'}>{l.label}</Badge>
          ))}
        </div>
      ),
    },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    {
      key: 'act', header: '操作', align: 'right', cell: r => (
        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
          <Pencil className="w-3.5 h-3.5" />编辑
        </Button>
      ),
    },
  ]

  return (
    <div>
      <ListPage
        title="多语言模板" sub="B-62 · 邮件 / 短信 / 站内信 / 推送 模板的多语言文案"
        stats={[
          { label: '模板总数', value: rows.length },
          { label: '启用中', value: rows.filter(r => r.status === '启用').length },
          { label: '四语齐全', value: rows.filter(r => LANGS.every(l => r.body[l.id].trim())).length },
          { label: '待补译', value: rows.filter(r => LANGS.some(l => !r.body[l.id].trim())).length, hint: '缺 ja / ko 居多' },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '模板名 / 场景' },
          { type: 'select', key: 'kind', label: '全部类型', options: ['邮件模板', '短信模板', '站内信模板', '推送模板'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['启用', '停用'] },
        ]}
        match={(r, s) =>
          (!s.q || `${r.name}${r.scene}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.kind || r.kind === s.kind) &&
          (!s.status || r.status === s.status)
        }
        actions={<Button size="sm"><Plus className="w-3.5 h-3.5" />新增模板</Button>}
        cols={cols} rows={rows}
      />

      <Modal
        open={!!edit} onClose={() => setEdit(null)} title={`编辑模板 · ${edit?.name ?? ''}`} width="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-2xs text-faint">
              可用变量：<Mono>{'{{code}} {{amount}} {{coin}} {{nickname}} {{link}}'}</Mono>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEdit(null)}>取消</Button>
              <Button onClick={() => {
                if (edit) setRows(rs => rs.map(r => (r.id === edit.id ? { ...r, body: { ...draft } } : r)))
                setEdit(null)
              }}>
                保存
              </Button>
            </div>
          </div>
        }
      >
        <Tabs
          tabs={LANGS.map(l => ({ id: l.id, label: l.label }))}
          value={tab} onChange={setTab} className="mb-3"
        />
        <textarea
          value={draft[tab]}
          onChange={e => setDraft(d => ({ ...d, [tab]: e.target.value }))}
          rows={7}
          placeholder={`请输入 ${LANGS.find(l => l.id === tab)?.label} 文案，变量使用 {{var}} 占位`}
          className="w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand resize-y"
        />
        <div className="mt-3 rounded-lg border border-line bg-elevated px-3 py-2.5">
          <div className="text-2xs text-faint mb-1">渲染预览</div>
          <div className="text-xs">
            {(draft[tab] || '（未翻译，前端将回退到 English）')
              .replace(/\{\{code\}\}/g, '824193')
              .replace(/\{\{amount\}\}/g, '2,000.00')
              .replace(/\{\{coin\}\}/g, 'USDT')}
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-63 KV 配置
 * ================================================================== */
type KvRow = {
  key: string; value: string; type: 'string' | 'number' | 'bool' | 'json'
  group: string; desc: string; updated: string
}

const KV_ROWS: KvRow[] = (() => {
  const base: Omit<KvRow, 'updated'>[] = [
    { key: 'system.maintenance_mode', value: 'false', type: 'bool', group: '系统', desc: '全站维护模式开关，开启后仅管理员可访问' },
    { key: 'system.announcement_top', value: 'N1', type: 'string', group: '系统', desc: '顶部滚动公告 ID' },
    { key: 'trade.spot_enabled', value: 'true', type: 'bool', group: '交易', desc: '现货交易总开关' },
    { key: 'trade.futures_enabled', value: 'true', type: 'bool', group: '交易', desc: '合约交易总开关' },
    { key: 'trade.max_leverage', value: '125', type: 'number', group: '交易', desc: '全站最大可用杠杆倍数' },
    { key: 'trade.price_limit_pct', value: '10', type: 'number', group: '交易', desc: '限价单相对指数价的最大偏离 (%)' },
    { key: 'withdraw.daily_limit_usd', value: '200000', type: 'number', group: '提币', desc: '单账户每日提币上限 (USD)' },
    { key: 'withdraw.auto_approve_threshold', value: '5000', type: 'number', group: '提币', desc: '低于该金额自动放行，高于则进人工审核' },
    { key: 'withdraw.whitelist_only', value: 'false', type: 'bool', group: '提币', desc: '仅允许提币至白名单地址' },
    { key: 'kyc.required_for_withdraw', value: 'true', type: 'bool', group: '合规', desc: '未完成 KYC 不可提币' },
    { key: 'kyc.level2_daily_limit', value: '1000000', type: 'number', group: '合规', desc: 'Level 2 每日提币额度 (USD)' },
    { key: 'funding.interval_hours', value: '8', type: 'number', group: '合约', desc: '资金费率结算周期（小时）' },
    { key: 'funding.rate_cap', value: '0.0075', type: 'number', group: '合约', desc: '单期资金费率上下限' },
    { key: 'insurance_fund.min_balance', value: '500000', type: 'number', group: '合约', desc: '保险基金告警下限 (USDT)' },
    { key: 'matching.max_orders_per_user', value: '200', type: 'number', group: '撮合', desc: '单用户最大挂单数' },
    { key: 'matching.self_trade_prevention', value: 'CANCEL_TAKER', type: 'string', group: '撮合', desc: '自成交防护策略' },
    { key: 'ws.max_connections', value: '50000', type: 'number', group: '网关', desc: 'WebSocket 网关最大并发连接数' },
    { key: 'ws.heartbeat_sec', value: '30', type: 'number', group: '网关', desc: '心跳间隔（秒）' },
    { key: 'risk.alert_webhook', value: '{"slack":"#risk-alerts","pagerduty":true}', type: 'json', group: '风控', desc: '风控告警推送通道' },
  ]
  const rd = seeded(63_063)
  return base.map(b => ({ ...b, updated: fmtDateTime(Date.now() - Math.floor(rd() * 30 * 86_400_000)) }))
})()

export function Kv() {
  const [rows, setRows] = useState(KV_ROWS)
  const groups = Array.from(new Set(KV_ROWS.map(r => r.group)))

  const cols: Col<KvRow>[] = [
    { key: 'key', header: 'Key', cell: r => <Mono>{r.key}</Mono> },
    {
      key: 'value', header: 'Value',
      cell: r => (
        <EditCell
          value={r.value} width="w-44"
          onSave={v => setRows(rs => rs.map(x => (x.key === r.key ? { ...x, value: v, updated: fmtDateTime(Date.now()) } : x)))}
        />
      ),
    },
    {
      key: 'type', header: '类型',
      cell: r => <Badge tone={r.type === 'bool' ? 'up' : r.type === 'number' ? 'info' : r.type === 'json' ? 'warn' : 'muted'}>{r.type}</Badge>,
    },
    { key: 'group', header: '分组', cell: r => <span className="text-xs text-muted">{r.group}</span> },
    { key: 'desc', header: '说明', hideBelow: 'lg', cell: r => <span className="text-2xs text-muted">{r.desc}</span> },
    { key: 'updated', header: '最后修改', align: 'right', hideBelow: 'md', cell: r => <span className="text-2xs text-faint tnum">{r.updated}</span> },
  ]

  return (
    <ListPage
      title="KV 配置" sub="B-63 · 运行时配置中心，值改动即时生效（灰度 30s 内推送到各节点）"
      stats={[
        { label: '配置项', value: rows.length },
        { label: '分组', value: groups.length },
        { label: '开关类', value: rows.filter(r => r.type === 'bool').length },
        { label: '维护模式', value: rows.find(r => r.key === 'system.maintenance_mode')?.value === 'true' ? '开启' : '关闭' },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: 'Key / 说明' },
        { type: 'select', key: 'group', label: '全部分组', options: groups },
        { type: 'select', key: 'type', label: '全部类型', options: ['string', 'number', 'bool', 'json'] },
      ]}
      match={(r, s) =>
        (!s.q || `${r.key} ${r.desc}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.group || r.group === s.group) &&
        (!s.type || r.type === s.type)
      }
      actions={
        <div className="flex gap-2">
          <Button size="sm"><Plus className="w-3.5 h-3.5" />新增配置</Button>
          <Button size="sm" variant="outline" onClick={() => downloadJson('kv-config.json', rows)}>
            <Download className="w-3.5 h-3.5" />导出
          </Button>
        </div>
      }
      cols={cols} rows={rows} perPage={12} dense
    />
  )
}

/* ================================================================== *
 * B-64 钱包设置 ⚠️ 合同范围待澄清 — 第三方托管服务对接配置
 * ================================================================== */
export function WalletConfig() {
  const [confirms, setConfirms] = useState<Record<string, number>>(
    () => Object.fromEntries(COINS.map(c => [c.coin, c.confirms])),
  )

  return (
    <div>
      <ConfigPage
        fnId="B-64"
        title="钱包设置"
        sub="B-64 · 本页为第三方托管服务（Cobo / Fireblocks）的对接与参数配置界面 — 平台不自建钱包、不托管私钥"
        sections={[
          {
            title: '托管服务商',
            desc: '私钥托管、签名、地址生成由服务商负责；本平台仅通过 API 发起指令并接收 Webhook 回调。',
            fields: [
              { type: 'select', key: 'vendor', label: '托管服务商', value: 'Cobo', options: ['Cobo', 'Fireblocks', '自建', '其他'], hint: '选择「自建」将超出当前合同范围' },
              { type: 'text', key: 'endpoint', label: 'API Endpoint', value: 'https://api.custody.cobo.com/v1', hint: '服务商提供' },
              { type: 'text', key: 'apikey', label: 'API Key', value: 'ck_live_9f2a••••••••4c81' },
              { type: 'text', key: 'webhook', label: 'Webhook URL', value: 'https://api.exchange.io/hooks/custody', hint: '接收充值到账 / 提币广播回调' },
              { type: 'number', key: 'timeout', label: '请求超时', value: 5000, suffix: 'ms', hint: '超时会导致「充值链上扫描」任务失败（见定时任务）' },
              { type: 'toggle', key: 'sandbox', label: '沙箱环境', value: false },
            ],
          },
          {
            title: '热钱包阈值',
            desc: '热钱包用于日常提币出款，余额上限越低越安全，但补充频率越高。',
            fields: [
              { type: 'number', key: 'hotMax', label: '热钱包余额上限', value: 1_000_000, suffix: 'USDT' },
              { type: 'toggle', key: 'autoRefill', label: '低于阈值自动从冷钱包补充', value: true, hint: '需服务商多签审批，非即时' },
              { type: 'number', key: 'refillAt', label: '自动补充触发阈值', value: 200_000, suffix: 'USDT' },
              { type: 'number', key: 'alertAt', label: '告警阈值', value: 120_000, suffix: 'USDT', hint: '低于该值触发风控警报器 (F-52)' },
            ],
          },
          {
            title: '归集设置',
            desc: '用户充值地址上的零散余额定期归集到热钱包，减少提币时的 UTXO / gas 成本。',
            fields: [
              { type: 'toggle', key: 'sweep', label: '自动归集', value: true },
              { type: 'number', key: 'sweepAt', label: '归集阈值', value: 100, suffix: 'USDT', hint: '单地址余额高于该值才归集' },
              { type: 'text', key: 'sweepAddr', label: '归集地址', value: CHAINS.USDT[0].addr },
              { type: 'select', key: 'sweepCron', label: '归集周期', value: '每 6 小时', options: ['每小时', '每 6 小时', '每日 03:00', '手动'] },
            ],
          },
        ]}
      />

      <div className="max-w-3xl mt-4">
        <Card>
          <CardHeader
            title="每条链的确认数配置"
            sub="充值到账所需的区块确认数 — 由托管服务商回调上报，此处配置的是平台入账门槛"
            right={<Badge tone="warn">依赖第三方</Badge>}
          />
          <Table
            dense
            cols={[
              { key: 'coin', header: '币种', cell: (c: (typeof COINS)[number]) => <span className="font-medium text-xs">{c.coin}</span> },
              {
                key: 'chains', header: '链', cell: (c: (typeof COINS)[number]) => (
                  <div className="flex flex-wrap gap-1">{c.chains.map(ch => <Badge key={ch} tone="info">{ch}</Badge>)}</div>
                ),
              },
              {
                key: 'addr', header: '归集地址', hideBelow: 'lg',
                cell: (c: (typeof COINS)[number]) => (
                  <Mono className="text-muted">{CHAINS[c.coin] ? shortAddr(CHAINS[c.coin][0].addr, 6, 4) : '—'}</Mono>
                ),
              },
              {
                key: 'confirms', header: '确认数', align: 'right',
                cell: (c: (typeof COINS)[number]) => (
                  <input
                    type="number" value={confirms[c.coin]}
                    onChange={e => setConfirms(s => ({ ...s, [c.coin]: +e.target.value }))}
                    className="w-16 h-7 px-2 rounded bg-elevated border border-line text-xs text-right tnum outline-none focus:border-brand"
                  />
                ),
              },
              {
                key: 'min', header: '最小充值', align: 'right',
                cell: (c: (typeof COINS)[number]) => <span className="tnum text-xs">{num(c.minWithdraw, c.precision > 6 ? 4 : 2)}</span>,
              },
              { key: 'status', header: '状态', align: 'right', cell: (c: (typeof COINS)[number]) => <StatusBadge s={c.status} /> },
            ]}
            rows={COINS}
          />
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== *
 * B-65 APP 版本发布
 * ================================================================== */
type ReleaseRow = (typeof APP_RELEASES)[number]

export function AppRelease() {
  const [rows, setRows] = useState<ReleaseRow[]>(APP_RELEASES)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<LangId>('zh')
  const [form, setForm] = useState({
    version: '1.5.1', platform: 'iOS', build: '20260714', force: false, rollout: 20, minVer: '1.3.0',
    notes: { zh: '', en: '', ja: '', ko: '' } as Record<LangId, string>,
  })

  const cols: Col<ReleaseRow>[] = [
    { key: 'v', header: '版本号', cell: r => <Mono className="font-semibold">{r.version}</Mono> },
    {
      key: 'p', header: '平台',
      cell: r => <Badge tone={r.platform === 'iOS' ? 'info' : 'up'}>{r.platform}</Badge>,
    },
    { key: 'b', header: 'Build', cell: r => <Mono className="text-muted">{r.build}</Mono> },
    { key: 'size', header: '大小', align: 'right', cell: r => <span className="text-xs tnum">{r.size}</span> },
    {
      key: 'force', header: '强制更新', align: 'center',
      cell: r => (
        <Toggle
          checked={r.force}
          onChange={v => setRows(rs => rs.map(x => (x.id === r.id ? { ...x, force: v } : x)))}
        />
      ),
    },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    { key: 'notes', header: '更新说明', hideBelow: 'lg', cell: r => <span className="text-2xs text-muted">{r.notes}</span> },
    { key: 'ts', header: '发布时间', hideBelow: 'md', cell: r => <span className="text-2xs text-faint tnum">{r.ts}</span> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: r => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost"><Pencil className="w-3.5 h-3.5" />编辑</Button>
          <Button
            size="sm" variant="ghost"
            onClick={() => setRows(rs => rs.map(x => (x.id === r.id ? { ...x, status: x.status === '已下架' ? '已发布' : '已下架' } : x)))}
          >
            {r.status === '已下架' ? '重新上架' : '下架'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <ListPage
        title="APP 版本发布" sub="B-65 · iOS / Android 安装包发布、灰度与强制更新策略"
        stats={[
          { label: '线上版本', value: '1.4.2', hint: 'iOS + Android' },
          { label: '灰度中', value: rows.filter(r => r.status === '灰度中').length, hint: '1.5.0 · 20%' },
          { label: '强制更新', value: rows.filter(r => r.force).length },
          { label: '历史版本', value: rows.length },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '版本号 / Build' },
          { type: 'select', key: 'platform', label: '全部平台', options: ['iOS', 'Android'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['已发布', '灰度中', '已下架'] },
        ]}
        match={(r, s) =>
          (!s.q || `${r.version}${r.build}`.includes(s.q)) &&
          (!s.platform || r.platform === s.platform) &&
          (!s.status || r.status === s.status)
        }
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />发布新版本</Button>}
        cols={cols} rows={rows}
      />

      <Modal
        open={open} onClose={() => setOpen(false)} title="发布新版本" width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => {
              setRows(rs => [{
                id: `V${rs.length + 1}`, version: form.version, platform: form.platform,
                build: form.build, size: '49.4 MB', force: form.force,
                status: form.rollout < 100 ? '灰度中' : '已发布',
                notes: form.notes.zh || '（未填写更新说明）', ts: fmtDateTime(Date.now()),
              }, ...rs])
              setOpen(false)
            }}>
              发布
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="版本号" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
            <Select
              label="平台" value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              options={[{ value: 'iOS', label: 'iOS' }, { value: 'Android', label: 'Android' }]}
            />
            <Input label="Build" value={form.build} onChange={e => setForm(f => ({ ...f, build: e.target.value }))} />
            <Input label="最低支持版本" value={form.minVer} onChange={e => setForm(f => ({ ...f, minVer: e.target.value }))} />
          </div>

          <div>
            <div className="text-xs text-muted mb-1.5">安装包</div>
            <div className="grid place-items-center h-24 rounded-lg border border-dashed border-line bg-elevated">
              <div className="text-center">
                <Upload className="w-4 h-4 text-faint mx-auto mb-1" />
                <div className="text-2xs text-faint">拖拽 .ipa / .apk 到此处上传</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium">强制更新</div>
              <div className="text-2xs text-faint mt-0.5">低于最低支持版本的客户端将无法进入</div>
            </div>
            <Toggle checked={form.force} onChange={v => setForm(f => ({ ...f, force: v }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">灰度比例</span>
              <span className="text-xs tnum text-brand">{form.rollout}%</span>
            </div>
            <PercentSlider value={form.rollout} onChange={v => setForm(f => ({ ...f, rollout: v }))} />
          </div>

          <div>
            <div className="text-xs text-muted mb-1.5">更新说明</div>
            <Tabs tabs={LANGS.map(l => ({ id: l.id, label: l.label }))} value={tab} onChange={setTab} size="sm" className="mb-2" />
            <textarea
              rows={4} value={form.notes[tab]}
              onChange={e => setForm(f => ({ ...f, notes: { ...f.notes, [tab]: e.target.value } }))}
              placeholder="本次更新内容…"
              className="w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand resize-y"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-66 APP 版本升级记录
 * ================================================================== */
type UpgradeRow = {
  id: string; ts: string; date: string; uid: string; from: string; to: string
  platform: 'iOS' | 'Android'; device: string; os: string; way: 'OTA' | '商店'; result: '成功' | '失败'
}

const UPGRADES: UpgradeRow[] = (() => {
  const rd = seeded(660_066)
  const iosDev = ['iPhone 15 Pro', 'iPhone 14', 'iPhone 13 mini', 'iPhone SE 3', 'iPad Air 5']
  const andDev = ['Samsung S24', 'Xiaomi 14', 'Pixel 8', 'OPPO Find X7', 'vivo X100']
  const froms = ['1.3.8', '1.4.0', '1.4.1', '1.4.2']
  return Array.from({ length: 36 }, (_, i) => {
    const platform: UpgradeRow['platform'] = rd() > 0.45 ? 'Android' : 'iOS'
    const from = froms[Math.floor(rd() * froms.length)]
    const to = from === '1.4.2' ? '1.5.0' : '1.4.2'
    const ts = fmtDateTime(Date.now() - Math.floor(rd() * 7 * 86_400_000) - i * 600_000)
    return {
      id: `UG${i + 1}`, ts, date: ts.slice(0, 10),
      uid: UIDS[Math.floor(rd() * UIDS.length)],
      from, to, platform,
      device: platform === 'iOS' ? iosDev[Math.floor(rd() * iosDev.length)] : andDev[Math.floor(rd() * andDev.length)],
      os: platform === 'iOS' ? `iOS ${rd() > 0.5 ? '18.1' : '17.5'}` : `Android ${rd() > 0.5 ? '14' : '13'}`,
      way: (rd() > 0.35 ? 'OTA' : '商店') as UpgradeRow['way'],
      result: (rd() > 0.07 ? '成功' : '失败') as UpgradeRow['result'],
    }
  }).sort((a, b) => (a.ts < b.ts ? 1 : -1))
})()

export function AppVersionLog() {
  const ok = UPGRADES.filter(u => u.result === '成功').length
  const ota = UPGRADES.filter(u => u.way === 'OTA').length
  const coverage = 0.684

  const cols: Col<UpgradeRow>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-2xs text-muted tnum">{r.ts}</span> },
    { key: 'uid', header: 'UID', cell: r => <Mono>{r.uid}</Mono> },
    {
      key: 'ver', header: '版本变化',
      cell: r => (
        <span className="text-xs tnum">
          <span className="text-muted">{r.from}</span>
          <span className="text-faint mx-1">→</span>
          <span className="text-brand font-medium">{r.to}</span>
        </span>
      ),
    },
    { key: 'platform', header: '平台', cell: r => <Badge tone={r.platform === 'iOS' ? 'info' : 'up'}>{r.platform}</Badge> },
    { key: 'device', header: '设备型号', hideBelow: 'md', cell: r => <span className="text-xs">{r.device}</span> },
    { key: 'os', header: '系统版本', hideBelow: 'lg', cell: r => <span className="text-2xs text-muted">{r.os}</span> },
    { key: 'way', header: '升级方式', cell: r => <Badge tone={r.way === 'OTA' ? 'brand' : 'muted'}>{r.way}</Badge> },
    { key: 'result', header: '结果', align: 'right', cell: r => <StatusBadge s={r.result === '成功' ? '已完成' : '失败'} /> },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-muted">最新版本覆盖率</div>
          <div className="text-xl font-semibold tnum mt-2">{(coverage * 100).toFixed(1)}%</div>
          <Bar v={coverage} tone="brand" className="mt-2" />
          <div className="text-2xs text-faint mt-1.5">1.4.2 · 目标 90%</div>
        </Card>
        <Stat label="待升级用户" value={num(1_342, 0)} hint="仍停留在 1.3.x" />
        <Stat label="升级成功率" value={`${((ok / UPGRADES.length) * 100).toFixed(1)}%`} delta={1.4} />
        <Stat label="OTA 占比" value={`${((ota / UPGRADES.length) * 100).toFixed(1)}%`} hint="其余走应用商店" />
      </div>

      <ListPage
        title="APP 版本升级记录" sub="B-66 · 客户端上报的升级事件，用于评估灰度进度与失败机型"
        filters={[
          { type: 'search', key: 'q', placeholder: 'UID / 设备型号' },
          { type: 'select', key: 'platform', label: '全部平台', options: ['iOS', 'Android'] },
          { type: 'select', key: 'way', label: '全部方式', options: ['OTA', '商店'] },
          { type: 'select', key: 'result', label: '全部结果', options: ['成功', '失败'] },
          { type: 'date', key: 'date' },
        ]}
        match={(r, s) =>
          (!s.q || `${r.uid}${r.device}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.platform || r.platform === s.platform) &&
          (!s.way || r.way === s.way) &&
          (!s.result || r.result === s.result) &&
          (!s.date || r.date === s.date)
        }
        cols={cols} rows={UPGRADES} perPage={12} dense
      />
    </div>
  )
}

/* ================================================================== *
 * B-67 APP 首页功能入口
 * ================================================================== */
type EntryRow = { id: string; name: string; link: string; icon: string; show: boolean }

const ENTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  币币交易: Repeat, 合约交易: TrendingUp, 充值: ArrowDownToLine, 提现: ArrowUpFromLine,
  邀请返佣: Users, 公告: Megaphone, 客服: Headphones, 活动中心: Gift, API: Code2, 帮助中心: HelpCircle,
}
const EntryIcon = ({ name, className }: { name: string; className?: string }) => {
  const C = ENTRY_ICONS[name] ?? LayoutGrid
  return <C className={className} />
}

const DEFAULT_ENTRIES: EntryRow[] = [
  { id: 'E1', name: '币币交易', link: '/trade/spot', icon: 'spot', show: true },
  { id: 'E2', name: '合约交易', link: '/trade/futures', icon: 'futures', show: true },
  { id: 'E3', name: '充值', link: '/assets/deposit', icon: 'deposit', show: true },
  { id: 'E4', name: '提现', link: '/assets/withdraw', icon: 'withdraw', show: true },
  { id: 'E5', name: '邀请返佣', link: '/broker', icon: 'broker', show: true },
  { id: 'E6', name: '公告', link: '/notices', icon: 'notice', show: true },
  { id: 'E7', name: '客服', link: '/support/tickets', icon: 'cs', show: true },
  { id: 'E8', name: '活动中心', link: '/activity', icon: 'act', show: true },
  { id: 'E9', name: 'API', link: '/account/api', icon: 'api', show: false },
  { id: 'E10', name: '帮助中心', link: '/help', icon: 'help', show: false },
]

export function AppEntries() {
  const [rows, setRows] = useState(DEFAULT_ENTRIES)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', link: '', show: true })

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    setRows(rs => {
      const n = [...rs]
      const t = n[i]; n[i] = n[j]; n[j] = t
      return n
    })
  }

  const visible = rows.filter(r => r.show)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">APP 首页功能入口</h1>
          <p className="text-xs text-muted mt-0.5">B-67 · 配置金刚区入口的顺序、跳转与显隐，右侧为实时预览</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRows(DEFAULT_ENTRIES)}>
            <RotateCcw className="w-3.5 h-3.5" />恢复默认
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" />新增入口</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Entry tiles */}
        <Card>
          <CardHeader
            title="入口列表"
            sub={`${visible.length} / ${rows.length} 个入口显示中 · 拖拽排序（原型内使用上移 / 下移）`}
            right={<Badge tone="brand">首页金刚区</Badge>}
          />
          <div className="p-3 grid sm:grid-cols-2 gap-2">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg border transition-colors',
                  r.show ? 'border-line bg-elevated' : 'border-line bg-surface opacity-60',
                )}
              >
                <span className="text-2xs text-faint tnum w-4 text-center cursor-grab">{i + 1}</span>
                <span className="w-9 h-9 rounded-xl grid place-items-center bg-brand/10 text-brand shrink-0">
                  <EntryIcon name={r.name} className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{r.name}</div>
                  <Mono className="text-faint block truncate">{r.link}</Mono>
                </div>
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, -1)} disabled={i === 0}
                    className="text-faint hover:text-ink disabled:opacity-30 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)} disabled={i === rows.length - 1}
                    className="text-faint hover:text-ink disabled:opacity-30 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Toggle
                  checked={r.show}
                  onChange={v => setRows(rs => rs.map(x => (x.id === r.id ? { ...x, show: v } : x)))}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Phone preview */}
        <div>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-3.5 h-3.5 text-muted" />
              <span className="text-xs font-semibold">APP 首页预览</span>
            </div>
            <div className="mx-auto w-[240px] rounded-[2rem] border-4 border-line bg-bg overflow-hidden shadow-2xl">
              <div className="h-7 bg-elevated grid place-items-center">
                <div className="w-16 h-1.5 rounded-full bg-line" />
              </div>
              <div className="px-3 pb-4 pt-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold">资产总览</div>
                  <div className="w-6 h-6 rounded-full bg-elevated" />
                </div>
                <div className="rounded-xl bg-elevated p-3 mb-3">
                  <div className="text-2xs text-faint">总资产估值 (USD)</div>
                  <div className="text-base font-semibold tnum mt-0.5">{usd(184_921.44)}</div>
                  <div className="text-2xs text-up tnum mt-0.5">+2.84% 今日</div>
                </div>
                <div className="grid grid-cols-4 gap-y-3 gap-x-1">
                  {visible.map(e => (
                    <div key={e.id} className="flex flex-col items-center gap-1">
                      <span className="w-9 h-9 rounded-xl grid place-items-center bg-brand/10 text-brand">
                        <EntryIcon name={e.name} className="w-4 h-4" />
                      </span>
                      <span className="text-[9px] text-muted text-center leading-tight">{e.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-elevated h-16 grid place-items-center text-2xs text-faint">
                  行情列表
                </div>
              </div>
            </div>
            <p className="text-2xs text-faint mt-3 text-center">仅显示「显示」开关打开的入口，顺序与左侧一致</p>
          </Card>
        </div>
      </div>

      <Modal
        open={open} onClose={() => setOpen(false)} title="新增入口"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              disabled={!form.name.trim()}
              onClick={() => {
                setRows(rs => [...rs, { id: `E${rs.length + 1}`, name: form.name, link: form.link || '/', icon: 'custom', show: form.show }])
                setForm({ name: '', link: '', show: true }); setOpen(false)
              }}
            >
              新增
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="理财" />
          <Input
            label="跳转链接" value={form.link} suffix={<Link2 className="w-3.5 h-3.5" />}
            onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="/earn"
          />
          <div>
            <div className="text-xs text-muted mb-1.5">图标</div>
            <div className="flex gap-2">
              {[LayoutGrid, Gift, Zap, Globe].map((C, i) => (
                <span key={i} className={cn(
                  'w-9 h-9 rounded-xl grid place-items-center border cursor-pointer transition-colors',
                  i === 0 ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted hover:border-faint',
                )}>
                  <C className="w-4 h-4" />
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium">立即显示</span>
            <Toggle checked={form.show} onChange={v => setForm(f => ({ ...f, show: v }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-68 API 参数配置
 * ================================================================== */
export function ApiConfig() {
  return (
    <ConfigPage
      title="API 参数配置"
      sub="B-68 · 开放 API 的限流、签名与默认权限。修改后 60s 内对全部网关节点生效。"
      sections={[
        {
          title: '限流设置',
          desc: '超过限制的请求返回 429，并在响应头返回 X-RateLimit-Reset。',
          fields: [
            { type: 'number', key: 'rest', label: 'REST 每分钟请求数', value: 1200, suffix: 'req/min', hint: '按 API Key 维度计数' },
            { type: 'number', key: 'ws', label: 'WS 每秒订阅数', value: 10, suffix: 'sub/s' },
            { type: 'number', key: 'order', label: '下单频率上限', value: 50, suffix: 'order/s', hint: '与撮合引擎 matching.max_orders_per_user 联动' },
            { type: 'number', key: 'weight', label: 'IP 权重上限', value: 6000, suffix: 'weight/min' },
          ],
        },
        {
          title: 'API 权限默认值',
          desc: '用户创建 API Key 时的默认勾选项；提现权限默认关闭，需二次验证后方可开启。',
          fields: [
            { type: 'toggle', key: 'pRead', label: '读取（行情 / 账户）', value: true },
            { type: 'toggle', key: 'pTrade', label: '交易（下单 / 撤单）', value: false },
            { type: 'toggle', key: 'pWithdraw', label: '提现', value: false, hint: '开启后必须绑定 IP 白名单' },
          ],
        },
        {
          title: '签名与时效',
          fields: [
            { type: 'select', key: 'algo', label: '签名算法', value: 'HMAC-SHA256', options: ['HMAC-SHA256', 'Ed25519', 'RSA-2048'] },
            { type: 'number', key: 'recv', label: '时间戳窗口 (recvWindow)', value: 5000, suffix: 'ms', hint: '超过窗口的请求视为重放攻击并拒绝' },
            { type: 'number', key: 'expire', label: 'API Key 有效期', value: 90, suffix: '天', hint: '到期前 7 天站内信提醒' },
            { type: 'toggle', key: 'forceIp', label: '强制 IP 白名单', value: false, hint: '开启后所有具备交易 / 提现权限的 Key 必须绑定 IP' },
          ],
        },
      ]}
    />
  )
}

/* ================================================================== *
 * B-69 API 白名单
 * ================================================================== */
type ApiRow = {
  id: string; uid: string; key: string; label: string
  ips: string[]; perms: string[]; status: '启用' | '停用'; lastCall: string
}

const API_ROWS: ApiRow[] = (() => {
  const rd = seeded(690_069)
  const labels = ['Trading Bot', 'Portfolio Tracker', 'Market Maker', 'Arb Bot v2', '量化策略-A', '风控同步', 'Grid Bot', '对冲脚本']
  const mk = (i: number): ApiRow => {
    const canWithdraw = rd() > 0.72
    const canTrade = rd() > 0.3
    const hasIp = rd() > 0.4
    return {
      id: `AK${i + 1}`,
      uid: UIDS[Math.floor(rd() * UIDS.length)],
      key: `${['aK92mZ', 'bR41vN', 'cT77kQ', 'dP18wS', 'eF63hY'][Math.floor(rd() * 5)]}••••••••${Math.floor(rd() * 9000 + 1000)}`,
      label: labels[Math.floor(rd() * labels.length)],
      ips: hasIp
        ? Array.from({ length: rd() > 0.6 ? 2 : 1 }, () =>
            `${Math.floor(rd() * 200 + 20)}.${Math.floor(rd() * 255)}.${Math.floor(rd() * 255)}.${Math.floor(rd() * 250 + 2)}`)
        : [],
      perms: ['读取', ...(canTrade ? ['交易'] : []), ...(canWithdraw ? ['提现'] : [])],
      status: (rd() > 0.12 ? '启用' : '停用') as ApiRow['status'],
      lastCall: fmtDateTime(Date.now() - Math.floor(rd() * 3 * 86_400_000)),
    }
  }
  const rows = Array.from({ length: 14 }, (_, i) => mk(i))
  // Seed the first two from the real user-facing API keys so front/back office agree.
  API_KEYS.forEach((k, i) => {
    rows[i] = { ...rows[i], label: k.label, key: k.key, ips: k.ips, perms: k.perms }
  })
  return rows
})()

const risky = (r: ApiRow) => r.perms.includes('提现') && r.ips.length === 0 && r.status === '启用'

export function ApiWhitelist() {
  const [rows, setRows] = useState(API_ROWS)
  const [edit, setEdit] = useState<ApiRow | null>(null)
  const [ipText, setIpText] = useState('')
  const flagged = rows.filter(risky)

  const cols: Col<ApiRow>[] = [
    { key: 'uid', header: 'UID', cell: r => <Mono>{r.uid}</Mono> },
    {
      key: 'key', header: 'API Key',
      cell: r => (
        <div className="flex items-center gap-1.5">
          <Mono className={cn(risky(r) && 'text-down')}>{r.key}</Mono>
          {risky(r) && <AlertTriangle className="w-3 h-3 text-down" />}
        </div>
      ),
    },
    { key: 'label', header: '备注', cell: r => <span className="text-xs text-muted">{r.label}</span> },
    {
      key: 'ips', header: 'IP 白名单',
      cell: r => (
        r.ips.length === 0
          ? <Badge tone={r.perms.includes('提现') ? 'down' : 'muted'}>未绑定</Badge>
          : <div className="flex flex-wrap gap-1">{r.ips.map(ip => <Badge key={ip} tone="info"><Mono>{ip}</Mono></Badge>)}</div>
      ),
    },
    {
      key: 'perms', header: '权限',
      cell: r => (
        <div className="flex gap-1">
          {r.perms.map(p => (
            <Badge key={p} tone={p === '提现' ? 'warn' : p === '交易' ? 'brand' : 'muted'}>{p}</Badge>
          ))}
        </div>
      ),
    },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    { key: 'last', header: '最后调用', hideBelow: 'lg', cell: r => <span className="text-2xs text-faint tnum">{r.lastCall}</span> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: r => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => { setEdit(r); setIpText(r.ips.join('\n')) }}>
            <Pencil className="w-3.5 h-3.5" />编辑 IP
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={() => setRows(rs => rs.map(x => (x.id === r.id ? { ...x, status: x.status === '启用' ? '停用' : '启用' } : x)))}
          >
            <Ban className="w-3.5 h-3.5" />{r.status === '启用' ? '禁用' : '启用'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {flagged.length > 0 && (
        <Note tone="down" title={`${flagged.length} 个具备提现权限的 API Key 未绑定 IP 白名单`}>
          提现权限 + 无 IP 限制 = 密钥泄露即资金损失。建议在「API 参数配置 (B-68)」中开启「强制 IP 白名单」，
          并通知以下用户补充绑定：{flagged.map(f => f.uid).join('、')}。
        </Note>
      )}

      <ListPage
        title="API 白名单" sub="B-69 · 用户 API Key 的 IP 绑定与权限管理"
        stats={[
          { label: 'API Key 总数', value: rows.length },
          { label: '具备提现权限', value: rows.filter(r => r.perms.includes('提现')).length },
          { label: '未绑定 IP', value: rows.filter(r => r.ips.length === 0).length },
          { label: '高风险', value: flagged.length, hint: '提现权限 + 无 IP 限制' },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: 'UID / 备注 / IP' },
          { type: 'select', key: 'perm', label: '全部权限', options: ['读取', '交易', '提现'] },
          { type: 'select', key: 'ip', label: '全部绑定状态', options: ['已绑定', '未绑定'] },
          { type: 'select', key: 'status', label: '全部状态', options: ['启用', '停用'] },
        ]}
        match={(r, s) =>
          (!s.q || `${r.uid}${r.label}${r.ips.join(' ')}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.perm || r.perms.includes(s.perm)) &&
          (!s.ip || (s.ip === '已绑定' ? r.ips.length > 0 : r.ips.length === 0)) &&
          (!s.status || r.status === s.status)
        }
        cols={cols} rows={rows} perPage={10}
      />

      <Modal
        open={!!edit} onClose={() => setEdit(null)} title={`编辑 IP 白名单 · ${edit?.label ?? ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEdit(null)}>取消</Button>
            <Button onClick={() => {
              if (edit) {
                const ips = ipText.split('\n').map(s => s.trim()).filter(Boolean)
                setRows(rs => rs.map(x => (x.id === edit.id ? { ...x, ips } : x)))
              }
              setEdit(null)
            }}>
              保存
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-xs text-muted">
            每行一个 IP 或 CIDR，最多 10 条。留空表示不限制来源 IP
            {edit?.perms.includes('提现') && <span className="text-down">（该 Key 具备提现权限，强烈建议绑定）</span>}。
          </div>
          <textarea
            rows={5} value={ipText} onChange={e => setIpText(e.target.value)}
            placeholder={'203.118.24.18\n10.0.0.0/24'}
            className="w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm font-mono outline-none focus:border-brand resize-y"
          />
          <div className="rounded-lg border border-line bg-elevated px-3 py-2">
            <div className="text-2xs text-faint mb-1">当前权限</div>
            <div className="flex gap-1">
              {edit?.perms.map(p => <Badge key={p} tone={p === '提现' ? 'warn' : 'muted'}>{p}</Badge>)}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-70 支付订单 ⚠️ 合同范围待澄清 — 第三方法币通道
 * ================================================================== */
type PayRow = (typeof PAYMENT_ORDERS)[number] & { date?: string }

export function PaymentOrders() {
  const rows: PayRow[] = useMemo(
    () => PAYMENT_ORDERS.map(o => ({ ...o, date: o.ts.slice(0, 10) })),
    [],
  )
  const done = rows.filter(o => o.status === '已完成')
  const total = rows.reduce((s, o) => s + o.amount, 0)

  const cols: Col<PayRow>[] = [
    { key: 'id', header: '订单号', cell: r => <Mono>{r.id}</Mono> },
    { key: 'ts', header: '时间', cell: r => <span className="text-2xs text-muted tnum">{r.ts}</span> },
    { key: 'uid', header: 'UID', cell: r => <Mono>{r.uid}</Mono> },
    {
      key: 'ch', header: '支付渠道',
      cell: r => (
        <Badge tone={r.channel === 'Stripe' ? 'brand' : r.channel === 'Wise' ? 'info' : r.channel === 'Banxa' ? 'up' : 'muted'}>
          {r.channel}
        </Badge>
      ),
    },
    { key: 'fiat', header: '法币', cell: r => <span className="text-xs">{r.fiat}</span> },
    { key: 'amt', header: '法币金额', align: 'right', cell: r => <Money v={r.amount} /> },
    { key: 'rate', header: '汇率', align: 'right', cell: r => <span className="tnum text-xs text-muted">{num(r.rate, 4)}</span> },
    { key: 'coin', header: '到账币种', cell: r => <span className="text-xs font-medium">{r.coin}</span> },
    { key: 'qty', header: '到账数量', align: 'right', cell: r => <Money v={r.amount * r.rate} /> },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: r => (
        <Button size="sm" variant="ghost" disabled={r.status === '已完成'}>
          {r.status === '失败' ? '重试' : '查看'}
        </Button>
      ),
    },
  ]

  return (
    <ListPage
      fnId="B-70"
      title="支付订单" sub="B-70 · 法币入金订单（Stripe / Wise / Banxa / 银联）— 通道由第三方支付服务商提供"
      stats={[
        { label: '24h 法币入金', value: usd(total), hint: `${rows.length} 笔` },
        { label: '成功率', value: `${((done.length / rows.length) * 100).toFixed(1)}%`, delta: -1.2 },
        { label: '平均金额', value: usd(total / rows.length) },
        { label: '渠道数', value: new Set(rows.map(r => r.channel)).size, hint: 'Stripe / Wise / Banxa / 银联' },
      ]}
      filters={[
        { type: 'search', key: 'q', placeholder: '订单号 / UID' },
        { type: 'select', key: 'channel', label: '全部渠道', options: ['Stripe', 'Wise', 'Banxa', '银联'] },
        { type: 'select', key: 'fiat', label: '全部法币', options: ['USD', 'HKD', 'SGD'] },
        { type: 'select', key: 'status', label: '全部状态', options: ['已完成', '处理中', '失败'] },
        { type: 'date', key: 'date' },
      ]}
      match={(r, s) =>
        (!s.q || `${r.id}${r.uid}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.channel || r.channel === s.channel) &&
        (!s.fiat || r.fiat === s.fiat) &&
        (!s.status || r.status === s.status) &&
        (!s.date || r.date === s.date)
      }
      cols={cols} rows={rows} perPage={12} dense
    />
  )
}

/* ================================================================== *
 * B-71 定时任务
 * ================================================================== */
const WALLET_ERR =
  'WalletServiceTimeout: custody.cobo.com/v1/deposits/scan 请求超时 (5000ms) — upstream 504'

/** Deterministic per-job run history + duration series. */
function cronSeries(job: CronJob) {
  const rd = seeded(job.name.length * 7919 + job.id.charCodeAt(1) * 131 + 17)
  const spark = Array.from({ length: 20 }, () => Math.round(job.durationMs * (0.7 + rd() * 0.6)))
  const history = Array.from({ length: 10 }, (_, i) => {
    const failed = job.status === '失败' ? i < 7 : rd() > 0.93
    return {
      ts: fmtDateTime(Date.now() - (i + 1) * 600_000),
      ms: Math.round(job.durationMs * (0.7 + rd() * 0.6)),
      ok: !failed,
      msg: failed
        ? (job.name === '充值链上扫描' ? WALLET_ERR : 'ExecutionError: 上游依赖不可用')
        : '执行完成',
    }
  })
  return { spark, history }
}

export function Cron() {
  const [jobs, setJobs] = useState(CRON_JOBS)
  const [hist, setHist] = useState<CronJob | null>(null)
  const [ran, setRan] = useState<string | null>(null)

  const failed = jobs.filter(j => j.status === '失败')

  const cols: Col<CronJob>[] = [
    { key: 'name', header: '任务名', cell: r => <span className="text-xs font-medium">{r.name}</span> },
    { key: 'expr', header: 'cron 表达式', cell: r => <Mono className="text-muted">{r.expr}</Mono> },
    { key: 'desc', header: '说明', hideBelow: 'lg', cell: r => <span className="text-2xs text-muted">{r.desc}</span> },
    { key: 'last', header: '上次执行', hideBelow: 'md', cell: r => <span className="text-2xs text-faint tnum">{r.lastRun}</span> },
    { key: 'next', header: '下次执行', hideBelow: 'lg', cell: r => <span className="text-2xs text-faint tnum">{r.nextRun}</span> },
    {
      key: 'ms', header: '耗时', align: 'right',
      cell: r => (
        <div className="flex items-center justify-end gap-2">
          <Sparkline data={cronSeries(r).spark} up={r.status !== '失败'} className="w-14 h-4" />
          <span className="tnum text-xs">{num(r.durationMs, 0)}<span className="text-faint ml-0.5">ms</span></span>
        </div>
      ),
    },
    { key: 'status', header: '状态', cell: r => <StatusBadge s={r.status} /> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: r => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setHist(r)}>
            <History className="w-3.5 h-3.5" />执行历史
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setRan(r.name); setTimeout(() => setRan(null), 1800) }}>
            <Play className="w-3.5 h-3.5" />立即执行
          </Button>
          <Toggle
            checked={r.status !== '已停用'}
            onChange={v => setJobs(js => js.map(x =>
              x.id === r.id ? { ...x, status: v ? (x.name === '充值链上扫描' ? '失败' : '运行中') : '已停用' } : x))}
          />
        </div>
      ),
    },
  ]

  const h = hist ? cronSeries(hist).history : []

  return (
    <div>
      {failed.length > 0 && (
        <Note
          tone="down"
          title={`${failed.length} 个任务执行失败：${failed.map(f => f.name).join('、')} — 依赖第三方钱包服务`}
          right={<Button size="sm" variant="danger" onClick={() => setHist(failed[0])}>查看执行历史</Button>}
        >
          「充值链上扫描」通过托管服务商 API 拉取链上到账事件，连续 7 次调用超时（{WALLET_ERR}）。
          充值到账将出现延迟。此依赖对应合同待澄清项 B-64（钱包设置）—— 托管服务的 SLA 与故障责任需在签约前明确。
        </Note>
      )}
      {ran && (
        <Note tone="info" title={`已触发「${ran}」立即执行`}>任务已提交到调度器，执行结果将写入「定时任务执行日志 (B-72)」。</Note>
      )}

      <ListPage
        title="定时任务" sub="B-71 · 调度器中的全部任务，可手动触发或临时停用"
        stats={[
          { label: '任务总数', value: jobs.length },
          { label: '运行中', value: jobs.filter(j => j.status === '运行中').length },
          { label: '失败', value: failed.length, hint: failed.length ? '充值链上扫描' : '—' },
          { label: '已停用', value: jobs.filter(j => j.status === '已停用').length },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '任务名 / 说明' },
          { type: 'select', key: 'status', label: '全部状态', options: ['运行中', '失败', '已停用'] },
        ]}
        match={(r, s) =>
          (!s.q || `${r.name}${r.desc}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.status || r.status === s.status)
        }
        cols={cols} rows={jobs} perPage={10} dense
      />

      <Modal open={!!hist} onClose={() => setHist(null)} title={`执行历史 · ${hist?.name ?? ''}`} width="max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Mono className="text-muted">{hist?.expr}</Mono>
          {hist && <StatusBadge s={hist.status} />}
        </div>
        <Table
          dense
          cols={[
            { key: 'ts', header: '时间', cell: (r: (typeof h)[number]) => <span className="text-2xs tnum text-muted">{r.ts}</span> },
            { key: 'ms', header: '耗时', align: 'right', cell: (r: (typeof h)[number]) => <span className="tnum text-xs">{num(r.ms, 0)} ms</span> },
            { key: 'ok', header: '结果', cell: (r: (typeof h)[number]) => <StatusBadge s={r.ok ? '已完成' : '失败'} /> },
            {
              key: 'msg', header: '输出',
              cell: (r: (typeof h)[number]) => (
                <span className={cn('text-2xs', r.ok ? 'text-muted' : 'text-down')}>{r.msg}</span>
              ),
            },
          ]}
          rows={h}
        />
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * B-72 定时任务执行日志
 * ================================================================== */
type CronLogRow = {
  id: string; ts: string; date: string; job: string; ms: number
  result: '成功' | '失败'; output: string; error: string
}

const CRON_LOGS: CronLogRow[] = (() => {
  const rd = seeded(720_072)
  const outputs: Record<string, string[]> = {
    资金费率结算: ['结算 4,218 个仓位 · 净收 12,842.40 USDT', '结算 3,918 个仓位 · 净付 -2,104.88 USDT'],
    未实现盈亏结算: ['刷新 4,218 个仓位 UPL', '刷新 4,102 个仓位 UPL'],
    指数价格聚合: ['聚合 5 家交易所 · 12 个指数', '聚合 5 家交易所 · 12 个指数（1 家超时，已剔除）'],
    K线聚合: ['写入 7 个周期 · 1,284 根 K 线', '写入 7 个周期 · 1,102 根 K 线'],
    返佣结算: ['结算 842 位经纪人 · 42,188.42 USDT', '结算 780 位经纪人 · 38,104.10 USDT'],
    资产对账: ['6 个币种对账完成 · 1 个差异 (ETH -0.0062)', '6 个币种对账完成 · 全部平账'],
    持仓奖励分红: ['分红 26 个持币地址 · 8,412.00 PLT'],
    充值链上扫描: ['扫描 8 条链 · 新增 12 笔充值'],
    风控警报扫描: ['扫描 4,218 个仓位 · 触发 3 条告警', '扫描 4,102 个仓位 · 无告警'],
    历史数据归档: ['归档 90 天前成交 1.2M 行'],
  }
  return Array.from({ length: 44 }, (_, i) => {
    const job = CRON_JOBS[Math.floor(rd() * CRON_JOBS.length)]
    const isWallet = job.name === '充值链上扫描'
    const fail = isWallet ? rd() > 0.35 : rd() > 0.94
    const ts = fmtDateTime(Date.now() - Math.floor(rd() * 2 * 86_400_000) - i * 300_000)
    const outs = outputs[job.name] ?? ['执行完成']
    return {
      id: `CL${2000 + i}`, ts, date: ts.slice(0, 10), job: job.name,
      ms: Math.round(job.durationMs * (0.6 + rd() * 0.8)),
      result: (fail ? '失败' : '成功') as CronLogRow['result'],
      output: fail ? '—' : outs[Math.floor(rd() * outs.length)],
      error: fail
        ? (isWallet ? WALLET_ERR : `TaskError: ${job.name} 上游依赖不可用 (retry 3/3)`)
        : '',
    }
  }).sort((a, b) => (a.ts < b.ts ? 1 : -1))
})()

export function CronLogs() {
  const fails = CRON_LOGS.filter(l => l.result === '失败')

  const cols: Col<CronLogRow>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-2xs text-muted tnum">{r.ts}</span> },
    { key: 'job', header: '任务名', cell: r => <span className="text-xs font-medium">{r.job}</span> },
    { key: 'ms', header: '耗时', align: 'right', cell: r => <span className="tnum text-xs">{num(r.ms, 0)} ms</span> },
    { key: 'result', header: '结果', cell: r => <StatusBadge s={r.result === '成功' ? '已完成' : '失败'} /> },
    { key: 'out', header: '输出摘要', hideBelow: 'md', cell: r => <span className="text-2xs text-muted">{r.output}</span> },
    {
      key: 'err', header: '错误信息', hideBelow: 'lg',
      cell: r => (r.error ? <Mono className="text-down">{r.error}</Mono> : <span className="text-faint text-2xs">—</span>),
    },
  ]

  return (
    <div>
      {fails.filter(f => f.job === '充值链上扫描').length > 0 && (
        <Note tone="warn" title="充值链上扫描连续失败 — 第三方托管服务超时">
          近 48 小时共 {fails.filter(f => f.job === '充值链上扫描').length} 次失败，
          错误固定为 <Mono className="text-down">504 Gateway Timeout</Mono>。
          需与托管服务商确认 SLA（对应待澄清项 B-64）。
        </Note>
      )}
      <ListPage
        title="定时任务执行日志" sub="B-72 · 保留 30 天，失败任务自动重试 3 次后告警"
        stats={[
          { label: '执行次数', value: CRON_LOGS.length, hint: '近 48 小时' },
          { label: '失败次数', value: fails.length },
          { label: '成功率', value: `${(((CRON_LOGS.length - fails.length) / CRON_LOGS.length) * 100).toFixed(1)}%` },
          { label: '平均耗时', value: `${num(CRON_LOGS.reduce((s, l) => s + l.ms, 0) / CRON_LOGS.length, 0)} ms` },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '输出 / 错误信息' },
          { type: 'select', key: 'job', label: '全部任务', options: CRON_JOBS.map(j => j.name) },
          { type: 'select', key: 'result', label: '全部结果', options: ['成功', '失败'] },
          { type: 'date', key: 'date' },
        ]}
        match={(r, s) =>
          (!s.q || `${r.output}${r.error}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.job || r.job === s.job) &&
          (!s.result || r.result === s.result) &&
          (!s.date || r.date === s.date)
        }
        cols={cols} rows={CRON_LOGS} perPage={12} dense
      />
    </div>
  )
}

/* ================================================================== *
 * B-73 系统语言设置
 * ================================================================== */
const SAMPLE_TS = new Date('2026-07-13T14:28:05')

export function SysLanguage() {
  const [cfg, setCfg] = useState({
    def: '中文',
    en: true, zh: true, ja: true, ko: false,
    autoDetect: true,
    admin: '中文',
    tz: 'UTC+8 (香港)',
    dateFmt: 'YYYY-MM-DD HH:mm:ss',
    numFmt: '1,234.56 (千分位 + 小数点)',
  })
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = <K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) => {
    setCfg(c => ({ ...c, [k]: v })); setDirty(true); setSaved(false)
  }

  const fmtNumber = (v: number) => {
    const base = num(v, 2)
    if (cfg.numFmt.startsWith('1.234,56')) return base.replace(/,/g, '§').replace('.', ',').replace(/§/g, '.')
    if (cfg.numFmt.startsWith('1 234.56')) return base.replace(/,/g, ' ')
    return base
  }
  const fmtDate = () => {
    const d = SAMPLE_TS
    const p = (n: number) => String(n).padStart(2, '0')
    const Y = d.getFullYear(), M = p(d.getMonth() + 1), D = p(d.getDate())
    const h = p(d.getHours()), m = p(d.getMinutes()), s = p(d.getSeconds())
    if (cfg.dateFmt.startsWith('DD/MM/YYYY')) return `${D}/${M}/${Y} ${h}:${m}`
    if (cfg.dateFmt.startsWith('MM/DD/YYYY')) return `${M}/${D}/${Y} ${h}:${m}`
    if (cfg.dateFmt.startsWith('YYYY年')) return `${Y}年${M}月${D}日 ${h}:${m}`
    return `${Y}-${M}-${D} ${h}:${m}:${s}`
  }
  const priceLabel: Record<string, string> = {
    中文: '最新价格', English: 'Last Price', 日本語: '最終価格', 한국어: '최종 가격',
  }

  const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="grid sm:grid-cols-[200px_1fr] gap-2 sm:gap-4 sm:items-center">
      <div>
        <div className="text-xs font-medium">{label}</div>
        {hint && <div className="text-2xs text-faint mt-0.5">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">系统语言设置</h1>
          <p className="text-xs text-muted mt-0.5">B-73 · 前台可用语言、后台语言、时区与数字/日期格式</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-up">✓ 已保存</span>}
          <Button size="sm" disabled={!dirty} onClick={() => { setDirty(false); setSaved(true) }}>保存修改</Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="语言" sub="未启用的语言不会出现在前台语言切换器中" />
          <div className="p-4 space-y-4">
            <Row label="默认语言" hint="用户首次访问且未匹配到浏览器语言时使用">
              <Select
                value={cfg.def} onChange={e => set('def', e.target.value)}
                options={LANGS.map(l => ({ value: l.label, label: l.label }))}
              />
            </Row>
            <Row label="启用的语言">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Toggle checked={cfg.zh} onChange={v => set('zh', v)} label="中文" />
                <Toggle checked={cfg.en} onChange={v => set('en', v)} label="English" />
                <Toggle checked={cfg.ja} onChange={v => set('ja', v)} label="日本語" />
                <Toggle checked={cfg.ko} onChange={v => set('ko', v)} label="한국어" />
              </div>
            </Row>
            <Row label="自动检测浏览器语言" hint="根据 Accept-Language 头自动切换">
              <Toggle checked={cfg.autoDetect} onChange={v => set('autoDetect', v)} />
            </Row>
            <Row label="后台管理语言" hint="仅影响管理后台界面">
              <Select
                value={cfg.admin} onChange={e => set('admin', e.target.value)}
                options={[{ value: '中文', label: '中文' }, { value: 'English', label: 'English' }]}
              />
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader title="区域格式" sub="影响前台所有价格、数量与时间的渲染" />
          <div className="p-4 space-y-4">
            <Row label="时区">
              <Select
                value={cfg.tz} onChange={e => set('tz', e.target.value)}
                options={['UTC+0 (UTC)', 'UTC+8 (香港)', 'UTC+9 (东京)', 'UTC+12 (奥克兰)'].map(o => ({ value: o, label: o }))}
              />
            </Row>
            <Row label="日期格式">
              <Select
                value={cfg.dateFmt} onChange={e => set('dateFmt', e.target.value)}
                options={['YYYY-MM-DD HH:mm:ss', 'YYYY年MM月DD日 HH:mm', 'DD/MM/YYYY HH:mm', 'MM/DD/YYYY HH:mm'].map(o => ({ value: o, label: o }))}
              />
            </Row>
            <Row label="数字格式" hint="千分位分隔符与小数点">
              <Select
                value={cfg.numFmt} onChange={e => set('numFmt', e.target.value)}
                options={['1,234.56 (千分位 + 小数点)', '1.234,56 (欧陆格式)', '1 234.56 (空格分隔)'].map(o => ({ value: o, label: o }))}
              />
            </Row>
          </div>
        </Card>

        <Card className="border-brand/30">
          <CardHeader title="预览" sub={`语言：${cfg.def} · 时区：${cfg.tz}`} right={<Badge tone="brand">实时</Badge>} />
          <div className="p-4">
            <div className="rounded-xl border border-line bg-elevated p-4 max-w-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">BTC/USDT</span>
                <Badge tone="up">+2.84%</Badge>
              </div>
              <div className="text-2xs text-faint mt-2">{priceLabel[cfg.def] ?? '最新价格'}</div>
              <div className="text-2xl font-semibold tnum text-up mt-0.5">{fmtNumber(97_842.31)}</div>
              <div className="flex items-center gap-1.5 mt-3 text-2xs text-faint">
                <Clock className="w-3 h-3" />
                <span className="tnum">{fmtDate()}</span>
                <span>· {cfg.tz.split(' ')[0]}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 gap-2 text-2xs">
                <div>
                  <div className="text-faint">24h 成交额</div>
                  <div className="tnum mt-0.5">{fmtNumber(42_184_922.44)}</div>
                </div>
                <div>
                  <div className="text-faint">24h 成交量</div>
                  <div className="tnum mt-0.5">{fmtNumber(1_284.4218)}</div>
                </div>
              </div>
            </div>
            <p className="text-2xs text-faint mt-3">
              启用语言：{[cfg.zh && '中文', cfg.en && 'English', cfg.ja && '日本語', cfg.ko && '한국어'].filter(Boolean).join(' · ') || '（无）'}
              {!cfg.ko && ' — 韩语翻译完成度不足，暂未启用（见 B-61）'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== *
 * F-50 / F-51 流动性对冲 · 策略性对冲 ⚠️ 超出合同范围
 * ================================================================== */
const VENUES = [
  { name: 'Binance', status: 'ok' as const, latency: 42, api: '正常', pairs: 12 },
  { name: 'OKX', status: 'ok' as const, latency: 68, api: '正常', pairs: 8 },
  { name: 'Bybit', status: 'warn' as const, latency: 214, api: '限流中 (429)', pairs: 6 },
]

export function RiskHedge() {
  const [strat, setStrat] = useState({ liquidity: true, strategy: false, autoAt: 50_000, maxExposure: 2_000_000 })

  const usdOf = (coin: string, qty: number) => Math.abs(qty) * (PRICES[coin] ?? 1)
  const grossUsd = HEDGE.reduce((s, h) => s + usdOf(h.coin, h.netExposure), 0)
  const hedgedUsd = HEDGE.reduce((s, h) => s + usdOf(h.coin, h.hedged), 0)
  const pnl = HEDGE.reduce((s, h) => s + h.pnl24h, 0)

  const cols: Col<(typeof HEDGE)[number]>[] = [
    { key: 'coin', header: '币种', cell: r => <span className="text-xs font-semibold">{r.coin}</span> },
    {
      key: 'net', header: '净敞口', align: 'right',
      cell: r => (
        <div>
          <Money v={r.netExposure} dp={r.coin === 'BTC' ? 4 : 3} sign />
          <div className="text-2xs text-faint tnum">{usd(usdOf(r.coin, r.netExposure), 0)}</div>
        </div>
      ),
    },
    { key: 'hedged', header: '已对冲量', align: 'right', cell: r => <span className="tnum text-xs">{num(r.hedged, 3)}</span> },
    {
      key: 'ratio', header: '对冲比例', width: '160px',
      cell: r => (
        <div className="flex items-center gap-2">
          <Bar v={r.hedgeRatio} tone={r.hedgeRatio >= 0.95 ? 'up' : r.hedgeRatio > 0 ? 'warn' : 'down'} className="w-20" />
          <span className="text-2xs tnum text-muted w-10">{(r.hedgeRatio * 100).toFixed(1)}%</span>
        </div>
      ),
    },
    { key: 'venue', header: '对冲场所', cell: r => (r.venue === '—' ? <span className="text-faint text-xs">—</span> : <Badge tone="info">{r.venue}</Badge>) },
    { key: 'pnl', header: '24h 对冲盈亏', align: 'right', cell: r => <Money v={r.pnl24h} sign /> },
    { key: 'status', header: '状态', align: 'right', cell: r => <StatusBadge s={r.status} /> },
  ]

  return (
    <div>
      <Card className="mb-4 border-warn/30 bg-warn/5">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge tone="warn">超出合同范围</Badge>
              <span className="text-xs font-semibold text-warn">F-50 流动性对冲 / F-51 策略性对冲</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              ⚠️ 超出合同范围 — 本模块属量化交易系统范畴（平台做对手盘 + 外部交易所对冲），非 Web 开发。
              需引入量化工程师，建议列为独立阶段单独报价。
            </p>
            <p className="text-2xs text-faint leading-relaxed mt-1.5">
              下方为该模块「若实施」的功能界面示意，用于确认需求边界，当前不包含在报价内。
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">流动性对冲 / 策略性对冲</h1>
          <p className="text-xs text-muted mt-0.5">F-50 / F-51 · 平台净敞口与外部交易所对冲执行</p>
        </div>
        <Badge tone="brand">示意界面 · 非交付范围</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="总净敞口" value={usd(grossUsd, 0)} hint={`限额 ${usd(strat.maxExposure, 0)}`} />
        <Stat label="已对冲比例" value={`${((hedgedUsd / grossUsd) * 100).toFixed(1)}%`} delta={3.2} />
        <Stat
          label="24h 对冲盈亏"
          value={<span className={pnl >= 0 ? 'text-up' : 'text-down'}>{pnl >= 0 ? '+' : ''}{usd(pnl)}</span>}
          hint="含资金费率"
        />
        <Stat label="外部交易所连接" value={`${VENUES.filter(v => v.status === 'ok').length}/${VENUES.length}`} hint="Bybit 限流中" />
      </div>

      <Card className="mb-4">
        <CardHeader
          title="币种敞口与对冲执行"
          sub="净敞口 = 用户持仓净额 − 平台已在外部交易所建立的反向头寸"
          right={<span className="text-2xs text-faint tnum">{HEDGE.length} 个币种</span>}
        />
        <Table cols={cols} rows={HEDGE} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="对冲策略开关" sub="量化引擎参数 — 需由量化工程师配置" />
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">流动性对冲 (F-50)</div>
                <div className="text-2xs text-faint mt-0.5">高频订单全额对冲，平台不承担方向性风险</div>
              </div>
              <Toggle checked={strat.liquidity} onChange={v => setStrat(s => ({ ...s, liquidity: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">策略性对冲 (F-51)</div>
                <div className="text-2xs text-faint mt-0.5">按趋势判断保留部分敞口以获取正向收益 — 高风险</div>
              </div>
              <Toggle checked={strat.strategy} onChange={v => setStrat(s => ({ ...s, strategy: v }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <Input
                label="自动对冲阈值" type="number" value={strat.autoAt} suffix="USD"
                onChange={e => setStrat(s => ({ ...s, autoAt: +e.target.value }))}
              />
              <Input
                label="最大敞口限额" type="number" value={strat.maxExposure} suffix="USD"
                onChange={e => setStrat(s => ({ ...s, maxExposure: +e.target.value }))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-2xs mb-1">
                <span className="text-muted">当前敞口占限额</span>
                <span className="tnum text-warn">{((grossUsd / strat.maxExposure) * 100).toFixed(1)}%</span>
              </div>
              <Bar v={grossUsd / strat.maxExposure} tone="warn" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="外部交易所连接状态" sub="对冲订单通过各所 API 执行" right={<Activity className="w-3.5 h-3.5 text-muted" />} />
          <div className="divide-y divide-line/60">
            {VENUES.map(v => (
              <div key={v.name} className="flex items-center gap-3 px-4 py-3">
                <HealthDot status={v.status} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{v.name}</div>
                  <div className="text-2xs text-faint mt-0.5">{v.pairs} 个对冲交易对</div>
                </div>
                <div className="text-right">
                  <div className={cn('text-xs tnum', v.latency > 150 ? 'text-warn' : 'text-muted')}>{v.latency} ms</div>
                  <div className={cn('text-2xs mt-0.5', v.status === 'ok' ? 'text-up' : 'text-warn')}>{v.api}</div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 text-2xs text-faint leading-relaxed">
              需为每家交易所申请机构 API 账户并预置对冲保证金；接入与合规成本由甲方承担。
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== *
 * F-52 风控警报器
 * ================================================================== */
type AlertEvent = { id: string; ts: string; rule: string; severity: string; detail: string }

const ALERT_FEED: AlertEvent[] = (() => {
  const rd = seeded(520_052)
  const active = RISK_ALERTS.filter(a => a.enabled)
  return Array.from({ length: 8 }, (_, i) => {
    const a = active[Math.floor(rd() * active.length)]
    const detail: Record<string, string> = {
      大额提现: `UID ${UIDS[Math.floor(rd() * UIDS.length)]} 提现 ${num(rd() * 200_000 + 100_000, 2)} USDT`,
      异常下单频率: `UID ${UIDS[Math.floor(rd() * UIDS.length)]} 1 分钟内 ${Math.floor(rd() * 800 + 520)} 单`,
      自成交检测: `UID ${UIDS[Math.floor(rd() * UIDS.length)]} BTC/USDT 疑似对敲 3 笔`,
      价格偏离: `SOL/USDT 成交价偏离指数价 ${(rd() * 3 + 3).toFixed(2)}%`,
      穿仓风险: `保险基金 24h 消耗 ${(rd() * 6 + 10).toFixed(1)}%`,
      账本不平: `ETH 账面 2,418.8821 ≠ 链上 2,418.8759（差异 -0.0062）`,
      新地址大额提现: `UID ${UIDS[Math.floor(rd() * UIDS.length)]} 首次使用地址提现 ${num(rd() * 40_000 + 10_000, 2)} USDT`,
      '同 IP 多账户': '同一 IP 登录 7 个账户',
    }
    return {
      id: `AE${i + 1}`,
      ts: fmtDateTime(Date.now() - i * 2_700_000 - Math.floor(rd() * 900_000)),
      rule: a.rule, severity: a.severity,
      detail: detail[a.rule] ?? '触发风控规则',
    }
  })
})()

export function RiskAlerts() {
  const [rules, setRules] = useState(RISK_ALERTS)
  const [edit, setEdit] = useState<(typeof RISK_ALERTS)[number] | null>(null)
  const [handled, setHandled] = useState<Record<string, boolean>>({})

  const triggers = rules.reduce((s, r) => s + r.triggers24h, 0)
  const critical = rules.filter(r => r.severity === '严重').length
  const open = ALERT_FEED.filter(a => !handled[a.id]).length

  const cols: Col<(typeof RISK_ALERTS)[number]>[] = [
    {
      key: 'rule', header: '规则名',
      cell: r => (
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs font-medium', r.severity === '严重' && 'text-down')}>{r.rule}</span>
          {r.severity === '严重' && <Zap className="w-3 h-3 text-down" />}
        </div>
      ),
    },
    { key: 'cond', header: '触发条件', cell: r => <Mono className="text-muted">{r.condition}</Mono> },
    { key: 'sev', header: '严重级别', cell: r => <Sev s={r.severity} /> },
    {
      key: 'n', header: '24h 触发次数', align: 'right',
      cell: r => (
        <span className={cn('tnum text-xs', r.triggers24h > 0 && r.severity === '严重' && 'text-down font-semibold')}>
          {r.triggers24h}
        </span>
      ),
    },
    { key: 'last', header: '最近触发', hideBelow: 'md', cell: r => <span className="text-2xs text-faint tnum">{r.lastTrigger}</span> },
    {
      key: 'on', header: '启用', align: 'center',
      cell: r => (
        <Toggle
          checked={r.enabled}
          onChange={v => setRules(rs => rs.map(x => (x.id === r.id ? { ...x, enabled: v } : x)))}
        />
      ),
    },
    {
      key: 'act', header: '操作', align: 'right',
      cell: r => (
        <Button size="sm" variant="ghost" onClick={() => setEdit(r)}>
          <Pencil className="w-3.5 h-3.5" />编辑规则
        </Button>
      ),
    },
  ]

  const sevTone = (s: string) => (s === '严重' ? 'bg-down' : s === '高' ? 'bg-warn' : s === '中' ? 'bg-info' : 'bg-line')

  return (
    <div>
      {rules.some(r => r.severity === '严重' && r.triggers24h > 0) && (
        <Note tone="down" title="存在未处理的「严重」级别告警">
          账本不平（ETH 差异 -0.0062）与自成交检测在过去 24 小时内均有触发。
          严重级别告警会同时推送到 Slack <Mono>#risk-alerts</Mono> 与 PagerDuty。
        </Note>
      )}

      <ListPage
        title="风控警报器" sub="F-52 · 超出配置阈值的订单 / 仓位 / 资金行为将触发告警"
        stats={[
          { label: '24h 总触发', value: triggers },
          { label: '严重级别规则', value: critical, hint: '账本不平 · 穿仓风险 · 自成交' },
          { label: '启用规则数', value: `${rules.filter(r => r.enabled).length}/${rules.length}` },
          { label: '未处理告警', value: open, hint: '需人工确认' },
        ]}
        filters={[
          { type: 'search', key: 'q', placeholder: '规则名 / 条件' },
          { type: 'select', key: 'sev', label: '全部级别', options: ['严重', '高', '中', '低'] },
          { type: 'select', key: 'on', label: '全部状态', options: ['启用', '停用'] },
        ]}
        match={(r, s) =>
          (!s.q || `${r.rule}${r.condition}`.toLowerCase().includes(s.q.toLowerCase())) &&
          (!s.sev || r.severity === s.sev) &&
          (!s.on || (s.on === '启用' ? r.enabled : !r.enabled))
        }
        actions={<Button size="sm"><Plus className="w-3.5 h-3.5" />新增规则</Button>}
        cols={cols} rows={rules} perPage={10}
      />

      <Card className="mt-6">
        <CardHeader
          title="最近告警时间线"
          sub="风控引擎每 5 分钟扫描一次（定时任务 J9）"
          right={<Badge tone={open ? 'down' : 'up'}>{open} 条待处理</Badge>}
        />
        <div className="p-4">
          <div className="relative pl-5">
            <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-line" />
            <div className="space-y-4">
              {ALERT_FEED.map(a => (
                <div key={a.id} className="relative">
                  <span className={cn(
                    'absolute -left-5 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-surface',
                    sevTone(a.severity),
                    handled[a.id] && 'opacity-40',
                  )} />
                  <div className={cn('flex flex-wrap items-center gap-2', handled[a.id] && 'opacity-50')}>
                    <span className="text-xs font-medium">{a.rule}</span>
                    <Sev s={a.severity} />
                    <span className="text-2xs text-faint tnum">{a.ts}</span>
                    <div className="flex-1" />
                    {handled[a.id]
                      ? <Badge tone="up">已处理</Badge>
                      : (
                        <Button size="sm" variant="outline" onClick={() => setHandled(h => ({ ...h, [a.id]: true }))}>
                          <Check className="w-3.5 h-3.5" />处理
                        </Button>
                      )}
                  </div>
                  <div className="text-2xs text-muted mt-1">{a.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={!!edit} onClose={() => setEdit(null)} title={`编辑规则 · ${edit?.rule ?? ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEdit(null)}>取消</Button>
            <Button onClick={() => setEdit(null)}>保存规则</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="规则名" defaultValue={edit?.rule} />
          <Input label="触发条件" defaultValue={edit?.condition} />
          <Select
            label="严重级别" defaultValue={edit?.severity}
            options={['低', '中', '高', '严重'].map(o => ({ value: o, label: o }))}
          />
          <Select
            label="通知渠道" defaultValue="Slack + PagerDuty"
            options={['站内信', 'Slack', 'Slack + PagerDuty', 'Slack + PagerDuty + 短信'].map(o => ({ value: o, label: o }))}
          />
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-xs font-medium">自动处置</div>
              <div className="text-2xs text-faint mt-0.5">命中后自动冻结账户 / 拦截订单</div>
            </div>
            <Toggle checked={edit?.severity === '严重'} onChange={() => {}} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== *
 * F-53 WAF 防御盾 ⚠️ 第三方服务
 * ================================================================== */
const RESTRICTED = ['伊拉克', '古巴', '伊朗', '朝鲜', '苏丹', '叙利亚', '中国大陆', '克里米亚地区']

export function RiskWaf() {
  const [rules, setRules] = useState({ level: '严格', rate: 600, captcha: true })
  const [geo, setGeo] = useState<Record<string, boolean>>(
    () => Object.fromEntries(RESTRICTED.map(c => [c, true])),
  )
  const [ips, setIps] = useState(WAF_IPS)

  const blocked = WAF_BLOCKED.map(w => w.blocked)
  const total = blocked.reduce((s, v) => s + v, 0)
  const peak = Math.max(...blocked)
  const blackholed = ips.filter(i => i.action === '黑洞化').length

  const cols: Col<(typeof WAF_IPS)[number]>[] = [
    { key: 'ip', header: 'IP', cell: r => <Mono>{r.ip}</Mono> },
    { key: 'country', header: '国家', cell: r => <Badge tone="muted">{r.country}</Badge> },
    { key: 'req', header: '请求数', align: 'right', cell: r => <span className="tnum text-xs">{compact(r.requests)}</span> },
    { key: 'reason', header: '原因', cell: r => <span className="text-xs text-muted">{r.reason}</span> },
    {
      key: 'action', header: '处置',
      cell: r => (
        <Badge tone={r.action === '黑洞化' ? 'down' : r.action === '拦截' ? 'warn' : 'info'}>{r.action}</Badge>
      ),
    },
    { key: 'ts', header: '时间', hideBelow: 'md', cell: r => <span className="text-2xs text-faint tnum">{r.ts}</span> },
    {
      key: 'act', header: '操作', align: 'right',
      cell: r => (
        <Button
          size="sm" variant="ghost"
          onClick={() => setIps(list => list.filter(x => x.ip !== r.ip))}
        >
          解封
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Note tone="info" title="WAF / DDoS 防护为第三方服务（Cloudflare / AWS Shield），非自研模块">
        订阅费用由甲方承担。本页为对接与监控界面 —— 拦截规则在服务商控制台生效，此处仅同步配置与展示拦截数据。
      </Note>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">WAF 防御盾</h1>
          <p className="text-xs text-muted mt-0.5">F-53 · 流量攻击拦截与黑洞化处理（对接 Cloudflare）</p>
        </div>
        <div className="flex items-center gap-2">
          <HealthDot status="warn" />
          <span className="text-xs text-warn">当前威胁等级：高</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="24h 拦截请求" value={compact(total)} delta={182.4} hint="较昨日" />
        <Stat label="黑洞化 IP 数" value={blackholed} hint={`共 ${ips.length} 个恶意 IP`} />
        <Stat label="峰值 QPS" value={compact(peak / 3.6)} hint="16:00–18:00" />
        <Stat label="当前威胁等级" value={<span className="text-warn">高</span>} hint="CC 攻击进行中" />
      </div>

      <Note tone="warn" title="检测到 16:00–18:00 存在 CC 攻击峰值">
        该时段拦截量达 {compact(peak)} req/h，为日常均值的 {(peak / (total / 24) ).toFixed(1)} 倍，
        攻击源集中在 {Array.from(new Set(ips.filter(i => i.reason === 'CC 攻击').map(i => i.country))).join(' / ') || 'RU / VN'}。
        已自动触发速率限制与人机验证，源站未受影响。
      </Note>

      <Card className="mb-4">
        <CardHeader
          title="24h 拦截趋势"
          sub="按小时聚合的被拦截请求数"
          right={<span className="text-2xs text-faint tnum">峰值 {compact(peak)} / h</span>}
        />
        <div className="p-4">
          <BarChart
            data={blocked}
            labels={WAF_BLOCKED.map(w => (Number(w.hour.slice(0, 2)) % 3 === 0 ? w.hour : ''))}
            tone="info"
            height={200}
          />
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <Card>
          <CardHeader
            title="恶意 IP 拦截记录"
            sub="黑洞化的 IP 在服务商侧丢弃流量，不会到达源站"
            right={<span className="text-2xs text-faint tnum">{ips.length} 条</span>}
          />
          <Table cols={cols} rows={ips} dense empty="没有被拦截的 IP" />
        </Card>

        <Card>
          <CardHeader title="防护规则" sub="同步到 Cloudflare 控制台" right={<Shield className="w-3.5 h-3.5 text-muted" />} />
          <div className="p-4 space-y-4">
            <div>
              <Select
                label="CC 防护等级" value={rules.level}
                onChange={e => setRules(r => ({ ...r, level: e.target.value }))}
                options={['关闭', '宽松', '标准', '严格', '攻击模式'].map(o => ({ value: o, label: o }))}
              />
              <div className="text-2xs text-faint mt-1">当前为「攻击进行中」推荐等级</div>
            </div>

            <Input
              label="速率限制" type="number" value={rules.rate} suffix="req/min/IP"
              onChange={e => setRules(r => ({ ...r, rate: +e.target.value }))}
            />

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">人机验证 (Turnstile)</div>
                <div className="text-2xs text-faint mt-0.5">可疑流量弹出验证挑战</div>
              </div>
              <Toggle checked={rules.captcha} onChange={v => setRules(r => ({ ...r, captcha: v }))} />
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Globe className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs font-medium">地区封禁</span>
                <Badge tone="warn">合同第九条</Badge>
              </div>
              <div className="text-2xs text-faint mb-2">受限国家/地区的访问将在边缘节点直接拒绝</div>
              <div className="flex flex-wrap gap-1.5">
                {RESTRICTED.map(c => (
                  <button
                    key={c}
                    onClick={() => setGeo(g => ({ ...g, [c]: !g[c] }))}
                    className={cn(
                      'px-2 py-1 rounded-md text-2xs border transition-colors',
                      geo[c]
                        ? 'bg-down/10 border-down/30 text-down'
                        : 'bg-elevated border-line text-muted hover:text-ink',
                    )}
                  >
                    {geo[c] ? '⛔ ' : ''}{c}
                  </button>
                ))}
              </div>
              <div className="text-2xs text-faint mt-2 tnum">
                已封禁 {Object.values(geo).filter(Boolean).length}/{RESTRICTED.length} 个地区
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

