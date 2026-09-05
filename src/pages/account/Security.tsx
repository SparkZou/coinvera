import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Lock, Smartphone, Mail, ShieldCheck, Fingerprint, KeyRound,
  AlertTriangle, Check, Trash2, Laptop, Tablet, Monitor, Info,
  ScrollText, ShieldAlert,
} from 'lucide-react'
import {
  Button, Card, CardHeader, Badge, Modal, Toggle, Select, Input,
  Table, PageHeader, CopyField, type Col,
} from '@/components/ui'
import { USER, LOGIN_LOGS, type LoginLog } from '@/mock/account'
import { cn, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 安全设置 — F-04 (账户安全) · F-07 (谷歌验证器) · F-08 (二次验证)
 *            · F-10 (操作日志 · 登录记录)
 *
 * ⚠ 合同冲突页：Article I 明确排除短信/邮件验证与二次验证服务。
 * ------------------------------------------------------------------ */

/* --------------------------- SVG arc gauge --------------------------- */
function ScoreGauge({ score }: { score: number }) {
  const R = 56, CX = 70, CY = 70, SWEEP = 260, START = 90 + (360 - SWEEP) / 2
  const rad = (d: number) => (d * Math.PI) / 180
  const pt = (d: number) => [CX + R * Math.cos(rad(d)), CY + R * Math.sin(rad(d))]
  const [x0, y0] = pt(START)
  const [x1, y1] = pt(START + SWEEP)
  const d = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  const tone = score >= 80 ? 'rgb(var(--up))' : score >= 50 ? 'rgb(var(--warn))' : 'rgb(var(--down))'
  const label = score >= 80 ? '高' : score >= 50 ? '中' : '低'

  return (
    <div className="relative w-[140px] h-[140px] shrink-0">
      <svg viewBox="0 0 140 140" className="w-full h-full">
        <path d={d} fill="none" stroke="rgb(var(--line))" strokeWidth="9" strokeLinecap="round" />
        <path
          d={d} fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round"
          pathLength={100} strokeDasharray={`${score} ${100 - score}`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-3xl font-semibold tnum leading-none">{score}</div>
          <div className="text-2xs text-faint mt-1.5">安全等级 · {label}</div>
        </div>
      </div>
    </div>
  )
}

/* --------------------------- 6-box OTP input -------------------------- */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setAt = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[i] = d
    onChange(next)
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

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    if (!digits.length) return
    e.preventDefault()
    onChange(Array.from({ length: 6 }, (_, i) => digits[i] ?? ''))
    refs.current[Math.min(digits.length, 5)]?.focus()
  }

  return (
    <div className="flex gap-2" onPaste={onPaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ''}
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

/* ------------------- Deterministic CSS/SVG "QR code" ------------------ */
function FakeQr({ text, size = 168 }: { text: string; size?: number }) {
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

  return (
    <div className="p-3 rounded-xl bg-surface border border-line shrink-0" style={{ width: size + 24 }}>
      <svg viewBox={`0 0 ${N} ${N}`} width={size} height={size} shapeRendering="crispEdges" className="block">
        {g.map((row, r) => row.map((on, c) => on
          ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="rgb(var(--ink))" />
          : null,
        ))}
      </svg>
    </div>
  )
}

/* ------------------------------- Devices ------------------------------ */
type Device = { id: string; name: string; os: string; ip: string; last: string; current?: boolean; icon: any }
const DEVICES: Device[] = [
  { id: 'D1', name: 'MacBook Pro 16"', os: 'macOS 15.2 · Chrome 131', ip: '203.118.24.18', last: '正在使用', current: true, icon: Laptop },
  { id: 'D2', name: 'iPhone 15 Pro', os: 'iOS 18.2 · App 1.4.2', ip: '203.118.24.18', last: '2 小时前', icon: Smartphone },
  { id: 'D3', name: 'Windows PC', os: 'Windows 11 · Chrome 131', ip: '119.28.44.201', last: '2 天前', icon: Monitor },
  { id: 'D4', name: 'iPad Air', os: 'iPadOS 18.1 · Safari', ip: '203.118.24.18', last: '12 天前', icon: Tablet },
]

const GA_SECRET = 'JBSWY3DPEHPK3PXP7QK4MZ2A'
const GA_URI = `otpauth://totp/HKEX:${USER.email}?secret=${GA_SECRET}&issuer=HKEX`

const METHODS = [
  { value: 'ga', label: '谷歌验证器' },
  { value: 'sms', label: '短信验证码' },
  { value: 'email', label: '邮箱验证码' },
]

type ModalId = null | 'pwd' | 'phone' | 'email' | 'ga' | 'phish' | 'fund' | 'device'

export default function Security() {
  const [modal, setModal] = useState<ModalId>(null)
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [devices, setDevices] = useState(DEVICES)
  const [killing, setKilling] = useState<Device | null>(null)

  /* F-08 — 二次验证设置 */
  const [loginV, setLoginV] = useState(true)
  const [loginM, setLoginM] = useState('ga')
  const [wdV, setWdV] = useState(true)
  const [wdM, setWdM] = useState('sms')

  const [fundPwdSet, setFundPwdSet] = useState(false)
  const [phish, setPhish] = useState(USER.antiPhishing)

  const open = (m: Exclude<ModalId, null>) => { setOtp(Array(6).fill('')); setModal(m) }
  const close = () => setModal(null)

  /* 登录密码 20 · 手机 15 · 邮箱 15 · 谷歌验证器 25 · 防钓鱼码 10 · 资金密码 15 */
  const FACTORS = [
    { label: '登录密码', on: true, w: 20 },
    { label: '手机绑定', on: USER.smsAuth, w: 15 },
    { label: '邮箱绑定', on: USER.emailAuth, w: 15 },
    { label: '谷歌验证器', on: USER.google2fa, w: 25 },
    { label: '防钓鱼码', on: !!phish, w: 10 },
    { label: '资金密码', on: fundPwdSet, w: 15 },
  ]
  const score = FACTORS.reduce((s, f) => s + (f.on ? f.w : 0), 0)
  const emailMasked = USER.email.replace(/^(.{2}).*(@.*)$/, '$1***$2')

  const ROWS = [
    {
      id: 'pwd' as const, icon: Lock, title: '登录密码', fn: 'F-04',
      desc: '用于登录账户，建议每 3 个月更换一次',
      status: <span className="text-xs text-muted">上次修改 3 个月前</span>,
      tone: 'warn' as const, action: '修改',
    },
    {
      id: 'phone' as const, icon: Smartphone, title: '手机绑定', fn: 'F-04',
      desc: '用于登录验证、提现验证与安全通知',
      status: <span className="text-xs text-muted tnum">已绑定 {USER.phone}</span>,
      tone: 'up' as const, action: '更换',
    },
    {
      id: 'email' as const, icon: Mail, title: '邮箱绑定', fn: 'F-04',
      desc: '用于接收账户与资金变动通知',
      status: <span className="text-xs text-muted">已绑定 {emailMasked}</span>,
      tone: 'up' as const, action: '更换',
    },
    {
      id: 'ga' as const, icon: ShieldCheck, title: '谷歌验证器', fn: 'F-07',
      desc: '动态口令 (TOTP)，安全强度最高的验证方式',
      status: <Badge tone="up"><Check className="w-2.5 h-2.5" />已开启</Badge>,
      tone: 'up' as const, action: '管理',
    },
    {
      id: 'phish' as const, icon: Fingerprint, title: '防钓鱼码', fn: 'F-04',
      desc: '平台发出的邮件将带有此专属码，用于辨别钓鱼邮件',
      status: <span className="text-xs font-mono text-brand">{phish}</span>,
      tone: 'up' as const, action: '修改',
    },
    {
      id: 'fund' as const, icon: KeyRound, title: '资金密码', fn: 'F-04',
      desc: '提现、划转与 API 提现时的二次资金校验',
      status: fundPwdSet
        ? <Badge tone="up"><Check className="w-2.5 h-2.5" />已设置</Badge>
        : <Badge tone="warn"><AlertTriangle className="w-2.5 h-2.5" />未设置</Badge>,
      tone: fundPwdSet ? ('up' as const) : ('down' as const),
      action: fundPwdSet ? '修改' : '立即设置',
    },
  ]

  const logCols: Col<LoginLog>[] = [
    { key: 'ts', header: '时间', width: '30%', cell: r => <span className="tnum text-xs text-muted">{fmtDateTime(r.ts)}</span> },
    { key: 'ip', header: 'IP 地址', cell: r => <span className="tnum text-xs font-mono">{r.ip}</span> },
    { key: 'loc', header: '地点', hideBelow: 'sm', cell: r => <span className="text-xs text-muted">{r.location}</span> },
    { key: 'dev', header: '设备', hideBelow: 'md', cell: r => <span className="text-xs text-muted">{r.device}</span> },
    {
      key: 'st', header: '状态', align: 'right', cell: r =>
        <Badge tone={r.status === '成功' ? 'up' : 'down'}>{r.status}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="安全设置"
        sub="登录与资金安全 · 双重验证 · 设备与登录记录"
        actions={
          <Link to="/account/logs">
            <Button variant="outline" size="sm"><ScrollText className="w-3.5 h-3.5" />操作日志</Button>
          </Link>
        }
      />

      {/* ------------------------- 安全等级 score panel ------------------------ */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-5">
          <ScoreGauge score={score} />

          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold">账户安全等级</span>
              <Badge tone={score >= 80 ? 'up' : 'warn'}>{score} / 100</Badge>
              <span className="text-2xs text-faint ml-auto hidden sm:block">开启全部验证项可达 100 分</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              {FACTORS.map(f => (
                <div key={f.label} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    'w-4 h-4 rounded-full grid place-items-center shrink-0',
                    f.on ? 'bg-up/10 text-up' : 'bg-line text-faint',
                  )}>
                    {f.on ? <Check className="w-2.5 h-2.5" /> : <span className="w-1 h-1 rounded-full bg-faint" />}
                  </span>
                  <span className={f.on ? 'text-ink' : 'text-faint'}>{f.label}</span>
                  <span className="text-2xs text-faint tnum ml-auto">+{f.w}</span>
                  <div className="w-16 h-1 rounded-full bg-line overflow-hidden shrink-0">
                    <div className={cn('h-full rounded-full', f.on ? 'bg-up' : 'bg-line')} style={{ width: f.on ? '100%' : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* --------------------- ⚠ 合同 / 功能表冲突提示 ---------------------- */}
      <Card className="mb-4 border-warn/40 bg-warn/5">
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 text-warn" />
            <Badge tone="warn">待澄清 · 合同冲突</Badge>
          </div>
          <div className="min-w-0 text-xs leading-relaxed text-muted">
            <p className="text-ink font-medium mb-1">短信 / 邮件 / 二次验证通道不在合同交付范围内</p>
            <p>
              合同 Article I 明确排除 <b className="text-warn font-mono">“SMS email verification services”</b> 与
              <b className="text-warn font-mono"> “secondary verification services”</b>，
              而《功能列表》F-07 / F-08 却包含谷歌验证器与二次验证设置。
            </p>
            <p className="mt-1">
              本页交付 <b className="text-ink">业务逻辑层与界面层</b>（校验流程、开关策略、绑定/解绑状态机）；
              短信、邮件通道与谷歌验证服务须由甲方提供第三方服务商账号（如 Twilio / AWS SES），
              费用与账号归属由甲方承担。请于签约前书面确认。
            </p>
            <Link to="/coverage" className="inline-flex items-center gap-1 text-brand hover:underline mt-1.5">
              查看全部待澄清事项 →
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* ------------------------------ 设置项列表 ---------------------------- */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="账户安全" sub="密码 · 绑定 · 验证器 · 资金密码" right={<span className="text-2xs font-mono text-faint">F-04 · F-07</span>} />
            <div className="divide-y divide-line/60">
              {ROWS.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                  <span className={cn(
                    'w-9 h-9 rounded-lg grid place-items-center shrink-0',
                    r.tone === 'up' ? 'bg-up/10 text-up' : r.tone === 'warn' ? 'bg-warn/10 text-warn' : 'bg-down/10 text-down',
                  )}>
                    <r.icon className="w-4 h-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.title}</span>
                      <span className="text-2xs font-mono text-faint">{r.fn}</span>
                    </div>
                    <div className="text-2xs text-muted mt-0.5 leading-relaxed">{r.desc}</div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {r.status}
                    <Button
                      size="sm"
                      variant={r.action === '立即设置' ? 'primary' : 'outline'}
                      onClick={() => open(r.id)}
                    >
                      {r.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* --------------------- F-08 二次验证设置 sub-panel -------------------- */}
          <Card>
            <CardHeader
              title="二次验证设置"
              sub="为高风险操作开启二次校验，并指定校验方式"
              right={<span className="text-2xs font-mono text-faint">F-08</span>}
            />
            <div className="divide-y divide-line/60">
              {[
                { k: 'login', title: '登录二次验证', desc: '登录时要求输入动态口令', on: loginV, setOn: setLoginV, m: loginM, setM: setLoginM },
                { k: 'wd', title: '提现二次验证', desc: '提现与添加提币地址时要求二次校验', on: wdV, setOn: setWdV, m: wdM, setM: setWdM },
              ].map(row => (
                <div key={row.k} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{row.title}</div>
                    <div className="text-2xs text-muted mt-0.5">{row.desc}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={cn('w-full sm:w-36 transition-opacity', !row.on && 'opacity-40 pointer-events-none')}>
                      <Select
                        options={METHODS}
                        value={row.m}
                        onChange={e => row.setM(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <Toggle checked={row.on} onChange={row.setOn} />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-line flex items-start gap-2 text-2xs text-faint leading-relaxed">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              关闭提现二次验证后，24 小时内提现将进入人工审核队列。选择短信/邮箱方式需甲方提供通道账号（见上方提示）。
            </div>
          </Card>
        </div>

        {/* ------------------------------ 设备管理 ------------------------------ */}
        <Card className="h-fit">
          <CardHeader
            title="设备管理"
            sub={`${devices.length} 台受信任设备`}
            right={<span className="text-2xs font-mono text-faint">F-04</span>}
          />
          <div className="divide-y divide-line/60">
            {devices.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-8 h-8 rounded-lg bg-elevated grid place-items-center text-muted shrink-0">
                  <d.icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{d.name}</span>
                    {d.current && <Badge tone="up">当前设备</Badge>}
                  </div>
                  <div className="text-2xs text-muted mt-0.5 truncate">{d.os}</div>
                  <div className="text-2xs text-faint mt-0.5 tnum font-mono">{d.ip} · {d.last}</div>
                </div>
                {!d.current && (
                  <button
                    onClick={() => setKilling(d)}
                    className="text-faint hover:text-down transition-colors shrink-0"
                    title="移除设备"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-line">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setDevices(devices.filter(d => d.current))}>
              移除全部其他设备
            </Button>
          </div>
        </Card>
      </div>

      {/* ----------------------------- 近期登录活动 ---------------------------- */}
      <Card className="mt-4">
        <CardHeader
          title="近期登录活动"
          sub="仅展示最近 4 条 — 完整记录见操作日志"
          right={<Link to="/account/logs" className="text-2xs text-brand hover:underline">查看全部 →</Link>}
        />
        <Table cols={logCols} rows={LOGIN_LOGS} />
      </Card>

      {/* ================================ Modals =============================== */}

      {/* 修改登录密码 */}
      <Modal
        open={modal === 'pwd'} onClose={close} title="修改登录密码"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close}>取消</Button>
            <Button className="flex-1" onClick={close}>确认修改</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="当前密码" type="password" placeholder="请输入当前登录密码" />
          <Input label="新密码" type="password" placeholder="8–32 位，含大小写字母与数字" />
          <Input label="确认新密码" type="password" placeholder="再次输入新密码" />
          <div>
            <div className="text-xs text-muted mb-1.5">谷歌验证码</div>
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          <div className="flex items-start gap-2 text-2xs text-warn bg-warn/10 rounded-lg p-2.5 leading-relaxed">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            为保障资金安全，修改密码后 24 小时内禁止提现。
          </div>
        </div>
      </Modal>

      {/* 更换手机 / 更换邮箱 */}
      <Modal
        open={modal === 'phone' || modal === 'email'} onClose={close}
        title={modal === 'phone' ? '更换手机号' : '更换邮箱'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close}>取消</Button>
            <Button className="flex-1" onClick={close}>确认更换</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-xs text-muted bg-elevated rounded-lg px-3 py-2">
            当前绑定：<span className="text-ink font-medium">{modal === 'phone' ? USER.phone : emailMasked}</span>
          </div>
          <Input
            label={modal === 'phone' ? '新手机号' : '新邮箱地址'}
            placeholder={modal === 'phone' ? '+852 0000 0000' : 'name@example.com'}
            suffix={<button className="text-brand hover:underline">发送验证码</button>}
          />
          <div>
            <div className="text-xs text-muted mb-1.5">{modal === 'phone' ? '短信验证码' : '邮箱验证码'}</div>
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          <div className="flex items-start gap-2 text-2xs text-warn bg-warn/10 rounded-lg p-2.5 leading-relaxed">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            短信 / 邮件通道由甲方提供的第三方服务商（Twilio / AWS SES）发送，不含在本合同交付范围内。
          </div>
        </div>
      </Modal>

      {/* F-07 谷歌验证器 */}
      <Modal
        open={modal === 'ga'} onClose={close} title="谷歌验证器 (Google Authenticator)" width="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={close}>解绑验证器</Button>
            <Button className="flex-1" disabled={otp.join('').length < 6} onClick={close}>
              绑定 / 确认
            </Button>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex flex-col items-center gap-2 shrink-0 self-center sm:self-start">
            <FakeQr text={GA_URI} size={150} />
            <span className="text-2xs text-faint">用验证器 App 扫码</span>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="text-xs font-medium mb-1">1 · 手动添加密钥</div>
              <div className="text-2xs text-muted mb-1.5">无法扫码时，可在 App 中手动输入以下密钥</div>
              <CopyField value={GA_SECRET} />
            </div>

            <div>
              <div className="text-xs font-medium mb-1">2 · 输入 6 位动态口令</div>
              <div className="text-2xs text-muted mb-2">口令每 30 秒刷新一次</div>
              <OtpInput value={otp} onChange={setOtp} />
            </div>

            <div className="flex items-center gap-2 text-2xs">
              <Badge tone="up"><Check className="w-2.5 h-2.5" />当前已开启</Badge>
              <span className="text-faint">绑定于 2025-01-18</span>
            </div>

            <div className="flex items-start gap-2 text-2xs text-warn bg-warn/10 rounded-lg p-2.5 leading-relaxed">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              请将密钥离线备份。更换手机后需用密钥恢复，否则将无法登录。
            </div>
          </div>
        </div>
      </Modal>

      {/* 防钓鱼码 */}
      <Modal
        open={modal === 'phish'} onClose={close} title="修改防钓鱼码"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close}>取消</Button>
            <Button className="flex-1" onClick={close}>保存</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-xs text-muted leading-relaxed">
            设置后，平台发送的所有邮件都会带上该防钓鱼码。收到不含此码的邮件，即为钓鱼邮件。
          </div>
          <Input
            label="防钓鱼码"
            value={phish}
            onChange={e => setPhish(e.target.value.slice(0, 20))}
            placeholder="4–20 位字母与数字"
          />
          <div>
            <div className="text-xs text-muted mb-1.5">谷歌验证码</div>
            <OtpInput value={otp} onChange={setOtp} />
          </div>
        </div>
      </Modal>

      {/* 资金密码 */}
      <Modal
        open={modal === 'fund'} onClose={close} title={fundPwdSet ? '修改资金密码' : '设置资金密码'}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close}>取消</Button>
            <Button className="flex-1" onClick={() => { setFundPwdSet(true); close() }}>确认</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="资金密码" type="password" placeholder="6 位数字" inputMode="numeric" />
          <Input label="确认资金密码" type="password" placeholder="再次输入" inputMode="numeric" />
          <div>
            <div className="text-xs text-muted mb-1.5">谷歌验证码</div>
            <OtpInput value={otp} onChange={setOtp} />
          </div>
          <div className="text-2xs text-faint leading-relaxed">
            资金密码用于提现、内部划转与 API 提现的最终校验，不可与登录密码相同。
          </div>
        </div>
      </Modal>

      {/* 移除设备 */}
      <Modal
        open={!!killing} onClose={() => setKilling(null)} title="移除设备"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setKilling(null)}>取消</Button>
            <Button
              variant="danger" className="flex-1"
              onClick={() => { setDevices(devices.filter(d => d.id !== killing?.id)); setKilling(null) }}
            >
              确认移除
            </Button>
          </div>
        }
      >
        <div className="text-sm leading-relaxed">
          确认移除 <b>{killing?.name}</b>？该设备上的登录态将立即失效，下次登录需重新完成二次验证。
        </div>
      </Modal>
    </div>
  )
}
