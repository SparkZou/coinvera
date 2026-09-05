import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CandlestickChart, Eye, EyeOff, Mail, Phone, KeyRound, Gift, ArrowLeft,
  Check, AlertTriangle, LoaderCircle, ArrowRight, ShieldCheck, Zap, Users,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 注册 — Function List F-01 (手机注册 + 邮箱注册)
 *   · 密码强度实时校验
 *   · 邀请码 (支持 /register?ref=HKX8Q2 自动填充)
 *   · 6 位验证码 + 60s 重发倒计时
 * ------------------------------------------------------------------ */

type Mode = 'email' | 'phone'

/* ------------------------------ Strength ------------------------------ */
function score(p: string) {
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (p.length >= 12) s++
  return Math.min(s, 4)
}

const LEVELS = [
  { label: '太弱', tone: 'down' as const, bar: 'bg-down', text: 'text-down' },
  { label: '弱', tone: 'down' as const, bar: 'bg-down', text: 'text-down' },
  { label: '中等', tone: 'warn' as const, bar: 'bg-warn', text: 'text-warn' },
  { label: '较强', tone: 'up' as const, bar: 'bg-up', text: 'text-up' },
  { label: '强', tone: 'up' as const, bar: 'bg-up', text: 'text-up' },
]

export default function Register() {
  const nav = useNavigate()
  const [params] = useSearchParams()

  const [mode, setMode] = useState<Mode>('email')
  const [account, setAccount] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [invite, setInvite] = useState(params.get('ref') ?? '')
  const [code, setCode] = useState<string[]>(Array(6).fill(''))
  const [left, setLeft] = useState(0)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const referred = Boolean(params.get('ref'))

  /* Countdown */
  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => setLeft(l => l - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])

  const s = useMemo(() => score(pw), [pw])
  const lv = LEVELS[s]
  const match = pw2.length > 0 && pw === pw2
  const mismatch = pw2.length > 0 && pw !== pw2
  const filled = code.every(c => c !== '')

  const rules = [
    { ok: pw.length >= 8, t: '至少 8 位字符' },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), t: '包含大小写字母' },
    { ok: /\d/.test(pw), t: '包含数字' },
    { ok: /[^A-Za-z0-9]/.test(pw), t: '包含符号 (推荐)' },
  ]

  const canSubmit = account.trim() && s >= 2 && match && filled && agree && !busy

  const send = () => {
    if (!account.trim()) { setErr(mode === 'email' ? '请先输入邮箱地址' : '请先输入手机号'); return }
    setErr('')
    setLeft(60)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    window.setTimeout(() => { setBusy(false); setDone(true) }, 900)
  }

  /* ------------------------------ Success ------------------------------ */
  if (done) {
    return (
      <div className="w-full max-w-md">
        <Card className="p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-up/10 grid place-items-center mx-auto mb-5">
            <Check className="w-8 h-8 text-up" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-semibold">注册成功</h1>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            账户 <b className="text-ink break-all">{account}</b> 已创建。
            <br />请完成实名认证 (KYC) 后开启交易与提现。
          </p>

          <div className="mt-6 rounded-lg bg-elevated border border-line p-4 text-left space-y-2.5">
            <div className="text-xs font-medium mb-1">接下来</div>
            {[
              { icon: ShieldCheck, t: '绑定谷歌验证器', d: '开启二次验证，提升账户安全等级' },
              { icon: Zap, t: '完成实名认证', d: 'Level 2 可解锁法币通道与更高提现额度' },
              { icon: Gift, t: '领取新手礼包', d: '首次交易返还手续费，最高 50 USDT' },
            ].map(x => (
              <div key={x.t} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-brand/10 text-brand grid place-items-center shrink-0">
                  <x.icon className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs">{x.t}</div>
                  <div className="text-2xs text-faint">{x.d}</div>
                </div>
              </div>
            ))}
          </div>

          {invite && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-2xs text-muted">
              <Gift className="w-3 h-3 text-brand" />
              已绑定邀请码 <b className="text-brand tnum">{invite}</b>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => nav('/login')}>前往登录</Button>
            <Button className="flex-1" onClick={() => nav('/account/kyc')}>去实名认证</Button>
          </div>
        </Card>
      </div>
    )
  }

  /* ------------------------------- Form ------------------------------- */
  return (
    <div className="w-full max-w-4xl">
      <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />返回首页
      </Link>

      <Card className="overflow-hidden grid md:grid-cols-[0.85fr_1fr] shadow-2xl">
        {/* --------------------------- Brand panel --------------------------- */}
        <aside className="relative hidden md:flex flex-col justify-between p-8 border-r border-line overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(80% 60% at 20% 10%, rgb(var(--brand) / 0.18), transparent 60%),' +
                'radial-gradient(70% 70% at 90% 95%, rgb(var(--up) / 0.10), transparent 60%)',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand grid place-items-center">
                <CandlestickChart className="w-5 h-5 text-brand-ink" />
              </div>
              <span className="font-bold text-lg tracking-tight">EXCHANGE</span>
            </div>
            <h2 className="mt-8 text-2xl font-bold leading-snug tracking-tight">
              两分钟开户，
              <br />即刻交易全球资产
            </h2>
            <p className="mt-3 text-xs text-muted leading-relaxed">
              240+ 交易对、125× 永续合约与三级返佣体系 — 一个账户，全部搞定。
            </p>
          </div>

          {referred && (
            <div className="relative mt-8 rounded-xl border border-brand/40 bg-brand/[0.06] p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Gift className="w-4 h-4 text-brand" />
                <span className="text-xs font-semibold text-brand">好友邀请</span>
              </div>
              <p className="text-2xs text-muted leading-relaxed">
                您通过邀请码 <b className="text-ink tnum">{params.get('ref')}</b> 注册，
                首月交易手续费可享 <b className="text-ink">20% 折扣</b>。
              </p>
            </div>
          )}

          <div className="relative pt-8 mt-8 border-t border-line flex items-center gap-6">
            {[
              { icon: Users, v: '2.4M+', l: '注册用户' },
              { icon: Zap, v: '<5ms', l: '撮合延迟' },
              { icon: ShieldCheck, v: '100%', l: '储备金' },
            ].map(x => (
              <div key={x.l}>
                <div className="text-sm font-semibold tnum">{x.v}</div>
                <div className="text-2xs text-faint">{x.l}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* ------------------------------ Form ------------------------------ */}
        <section className="p-6 sm:p-8">
          <div className="md:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand grid place-items-center">
              <CandlestickChart className="w-4 h-4 text-brand-ink" />
            </div>
            <span className="font-bold tracking-tight">EXCHANGE</span>
          </div>

          <div className="flex items-end justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl font-semibold">创建账户</h1>
              <p className="text-xs text-muted mt-1">
                已有账户？
                <Link to="/login" className="text-brand hover:underline ml-1">立即登录</Link>
              </p>
            </div>
            <Badge tone="muted">F-01</Badge>
          </div>

          {/* 邮箱 / 手机 */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-elevated mb-5">
            {([
              { id: 'email', label: '邮箱注册', icon: Mail },
              { id: 'phone', label: '手机注册', icon: Phone },
            ] as const).map(m => (
              <button
                key={m.id} type="button"
                onClick={() => { setMode(m.id); setAccount(''); setCode(Array(6).fill('')); setLeft(0) }}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-8 rounded-md text-xs transition-all',
                  mode === m.id ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                <m.icon className="w-3.5 h-3.5" />{m.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Account */}
            <label className="block">
              <div className="text-xs text-muted mb-1.5">{mode === 'email' ? '邮箱地址' : '手机号码'}</div>
              <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand transition-colors">
                {mode === 'email'
                  ? <Mail className="w-4 h-4 text-faint shrink-0" />
                  : <Phone className="w-4 h-4 text-faint shrink-0" />}
                {mode === 'phone' && <span className="text-sm text-muted shrink-0">+852</span>}
                <input
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  placeholder={mode === 'email' ? 'you@example.com' : '请输入手机号'}
                  inputMode={mode === 'phone' ? 'tel' : 'email'}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                />
              </div>
            </label>

            {/* Password + strength */}
            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted">登录密码</span>
                {pw && <span className={cn('text-2xs font-medium', lv.text)}>密码强度：{lv.label}</span>}
              </div>
              <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand transition-colors">
                <KeyRound className="w-4 h-4 text-faint shrink-0" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  placeholder="8-32 位，含大小写字母与数字"
                  autoComplete="new-password"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                />
                <button
                  type="button" onClick={() => setShowPw(v => !v)}
                  className="text-faint hover:text-ink transition-colors shrink-0"
                  aria-label={showPw ? '隐藏密码' : '显示密码'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              <div className="flex gap-1 mt-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex-1 h-1 rounded-full bg-line overflow-hidden">
                    <div className={cn('h-full transition-all duration-300', s > i ? lv.bar : 'bg-transparent')} style={{ width: s > i ? '100%' : '0%' }} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                {rules.map(r => (
                  <div key={r.t} className={cn('flex items-center gap-1.5 text-2xs transition-colors', r.ok ? 'text-up' : 'text-faint')}>
                    <span className={cn(
                      'w-3 h-3 rounded-full grid place-items-center shrink-0',
                      r.ok ? 'bg-up/10' : 'bg-elevated',
                    )}>
                      {r.ok && <Check className="w-2 h-2" strokeWidth={3} />}
                    </span>
                    {r.t}
                  </div>
                ))}
              </div>
            </label>

            {/* Confirm */}
            <label className="block">
              <div className="text-xs text-muted mb-1.5">确认密码</div>
              <div className={cn(
                'flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border transition-colors',
                mismatch ? 'border-down' : match ? 'border-up' : 'border-line focus-within:border-brand',
              )}>
                <KeyRound className="w-4 h-4 text-faint shrink-0" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw2}
                  onChange={e => setPw2(e.target.value)}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                />
                {match && <Check className="w-4 h-4 text-up shrink-0" />}
              </div>
              {mismatch && <div className="text-2xs text-down mt-1">两次输入的密码不一致</div>}
            </label>

            {/* Invite */}
            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted">邀请码（选填）</span>
                {referred && <Badge tone="brand"><Gift className="w-2.5 h-2.5" />已自动填充</Badge>}
              </div>
              <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand transition-colors">
                <Gift className="w-4 h-4 text-faint shrink-0" />
                <input
                  value={invite}
                  onChange={e => setInvite(e.target.value.toUpperCase())}
                  placeholder="如有邀请码请填写"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm tnum uppercase placeholder:text-faint placeholder:normal-case"
                />
              </div>
            </label>

            {/* OTP */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted">
                  {mode === 'email' ? '邮箱验证码' : '短信验证码'}
                </span>
                {left > 0 ? (
                  <span className="text-2xs text-faint tnum">{left}s 后可重新发送</span>
                ) : (
                  <button type="button" onClick={send} className="text-2xs text-brand hover:underline">
                    发送验证码
                  </button>
                )}
              </div>
              <Otp value={code} onChange={setCode} />
              {err && (
                <div className="flex items-center gap-1.5 text-2xs text-down mt-2">
                  <AlertTriangle className="w-3 h-3" />{err}
                </div>
              )}
              {left > 0 && !err && (
                <div className="text-2xs text-faint mt-2">
                  验证码已发送至 {account || (mode === 'email' ? '您的邮箱' : '您的手机')} · 原型演示可输入任意 6 位数字
                </div>
              )}
            </div>

            {/* Terms */}
            <button
              type="button"
              onClick={() => setAgree(a => !a)}
              className="flex items-start gap-2.5 text-left w-full pt-1"
            >
              <span className={cn(
                'w-4 h-4 rounded border grid place-items-center shrink-0 mt-px transition-colors',
                agree ? 'bg-brand border-brand' : 'border-line hover:border-faint',
              )}>
                {agree && <Check className="w-3 h-3 text-brand-ink" strokeWidth={3} />}
              </span>
              <span className="text-2xs text-muted leading-relaxed">
                我已阅读并同意
                <span className="text-brand hover:underline mx-0.5">《服务条款》</span>与
                <span className="text-brand hover:underline mx-0.5">《隐私政策》</span>，
                并确认本人非受限地区居民。
              </span>
            </button>

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
              {busy
                ? <><LoaderCircle className="w-4 h-4 animate-spin" />提交中…</>
                : <>创建账户 <ArrowRight className="w-4 h-4" /></>}
            </Button>

            <p className="text-2xs text-faint leading-relaxed">
              F-01 注册：支持邮箱与手机两种注册方式，注册后需完成实名认证 (KYC) 方可交易与提现。
              短信 / 邮件验证码通道由第三方服务商提供，费用承担方须在合同附件中约定。
            </p>
          </form>
        </section>
      </Card>
    </div>
  )
}

/* ------------------------------ 6-box OTP ------------------------------ */
function Otp({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const set = (i: number, ch: string) => {
    const next = [...value]
    next[i] = ch
    onChange(next)
  }

  const handle = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) { set(i, ''); return }
    if (digits.length > 1) {
      const next = [...value]
      for (let k = 0; k < digits.length && i + k < value.length; k++) next[i + k] = digits[k]
      onChange(next)
      refs.current[Math.min(i + digits.length, value.length - 1)]?.focus()
      return
    }
    set(i, digits)
    if (i < value.length - 1) refs.current[i + 1]?.focus()
  }

  const key = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i]) set(i, '')
      else if (i > 0) {
        const next = [...value]
        next[i - 1] = ''
        onChange(next)
        refs.current[i - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < value.length - 1) refs.current[i + 1]?.focus()
  }

  return (
    <div className="flex gap-2">
      {value.map((c, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={c}
          onChange={e => handle(i, e.target.value)}
          onKeyDown={e => key(i, e)}
          onFocus={e => e.target.select()}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-label={`验证码第 ${i + 1} 位`}
          className={cn(
            'flex-1 min-w-0 h-11 rounded-lg bg-elevated border text-center text-base font-semibold tnum',
            'outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20',
            c ? 'border-brand' : 'border-line',
          )}
        />
      ))}
    </div>
  )
}
