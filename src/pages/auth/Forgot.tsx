import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CandlestickChart, Mail, Phone, KeyRound, Eye, EyeOff, ArrowLeft, ArrowRight,
  Check, AlertTriangle, LoaderCircle, ShieldAlert,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 密码找回 — Function List F-05
 *   Step 1 输入账号 (邮箱 / 手机)
 *   Step 2 验证身份 (6 位验证码 + 60s 倒计时)
 *   Step 3 设置新密码 (强度校验 + 确认)
 *   → 完成
 * ------------------------------------------------------------------ */

const STEPS = ['输入账号', '验证身份', '设置新密码'] as const

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
  { label: '太弱', bar: 'bg-down', text: 'text-down' },
  { label: '弱', bar: 'bg-down', text: 'text-down' },
  { label: '中等', bar: 'bg-warn', text: 'text-warn' },
  { label: '较强', bar: 'bg-up', text: 'text-up' },
  { label: '强', bar: 'bg-up', text: 'text-up' },
]

export default function Forgot() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)          // 0..2, 3 = done
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [account, setAccount] = useState('')
  const [code, setCode] = useState<string[]>(Array(6).fill(''))
  const [left, setLeft] = useState(0)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

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

  const go = (n: number, delay = 700) => {
    setBusy(true)
    setErr('')
    window.setTimeout(() => { setBusy(false); setStep(n) }, delay)
  }

  const next1 = () => {
    if (!account.trim()) { setErr(mode === 'email' ? '请输入注册邮箱' : '请输入注册手机号'); return }
    setLeft(60)
    go(1)
  }
  const next2 = () => {
    if (!filled) { setErr('请输入完整的 6 位验证码'); return }
    go(2)
  }
  const finish = () => {
    if (s < 2) { setErr('新密码强度不足，请包含大小写字母与数字'); return }
    if (!match) { setErr('两次输入的密码不一致'); return }
    go(3, 900)
  }

  const back = () => { setErr(''); setStep(x => Math.max(0, x - 1)) }

  /* ------------------------------- 完成 ------------------------------- */
  if (step === 3) {
    return (
      <div className="w-full max-w-md">
        <Card className="p-8 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-up/10 grid place-items-center mx-auto mb-5">
            <Check className="w-8 h-8 text-up" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-semibold">密码重置成功</h1>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            账户 <b className="text-ink break-all">{account}</b> 的登录密码已更新。
          </p>

          <div className="mt-6 rounded-lg border border-warn/40 bg-warn/[0.06] p-3.5 text-left">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-warn shrink-0" />
              <span className="text-xs font-semibold text-warn">安全策略</span>
            </div>
            <p className="text-2xs text-muted leading-relaxed">
              为防范盗号后即刻转移资产，重置密码后 <b className="text-ink">24 小时内禁止提现</b>。
              所有已登录设备已被强制登出。
            </p>
          </div>

          <Button size="lg" className="w-full mt-6" onClick={() => nav('/login')}>
            使用新密码登录 <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    )
  }

  /* ------------------------------- 向导 ------------------------------- */
  return (
    <div className="w-full max-w-md">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />返回登录
      </Link>

      <Card className="overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative px-6 sm:px-8 pt-7 pb-6 border-b border-line overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(90% 100% at 90% 0%, rgb(var(--brand) / 0.12), transparent 65%)' }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand grid place-items-center shrink-0">
                <CandlestickChart className="w-5 h-5 text-brand-ink" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">找回密码</h1>
                <p className="text-2xs text-muted mt-0.5">通过注册邮箱或手机号重置登录密码</p>
              </div>
            </div>
            <Badge tone="muted">F-05</Badge>
          </div>

          {/* Step indicator */}
          <div className="relative flex items-center mt-7">
            {STEPS.map((label, i) => {
              const state = i < step ? 'done' : i === step ? 'active' : 'todo'
              return (
                <div key={label} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className={cn(
                      'w-7 h-7 rounded-full grid place-items-center text-2xs font-semibold tnum transition-colors border',
                      state === 'done' ? 'bg-brand border-brand text-brand-ink'
                        : state === 'active' ? 'bg-brand/10 border-brand text-brand'
                          : 'bg-elevated border-line text-faint',
                    )}>
                      {state === 'done' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={cn(
                      'text-2xs whitespace-nowrap transition-colors',
                      state === 'todo' ? 'text-faint' : 'text-ink font-medium',
                    )}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-2 -mt-5">
                      <div className={cn('h-px transition-colors', i < step ? 'bg-brand' : 'bg-line')} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 py-6">
          {/* ============================ Step 1 ============================ */}
          {step === 0 && (
            <div className="animate-fade-in space-y-4">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-elevated">
                {([
                  { id: 'email', label: '邮箱找回', icon: Mail },
                  { id: 'phone', label: '手机找回', icon: Phone },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setAccount(''); setErr('') }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 h-8 rounded-md text-xs transition-all',
                      mode === m.id ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink',
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5" />{m.label}
                  </button>
                ))}
              </div>

              <label className="block">
                <div className="text-xs text-muted mb-1.5">{mode === 'email' ? '注册邮箱' : '注册手机号'}</div>
                <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand transition-colors">
                  {mode === 'email'
                    ? <Mail className="w-4 h-4 text-faint shrink-0" />
                    : <Phone className="w-4 h-4 text-faint shrink-0" />}
                  {mode === 'phone' && <span className="text-sm text-muted shrink-0">+852</span>}
                  <input
                    value={account}
                    onChange={e => setAccount(e.target.value)}
                    placeholder={mode === 'email' ? 'you@example.com' : '请输入手机号'}
                    onKeyDown={e => e.key === 'Enter' && next1()}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                  />
                </div>
              </label>

              {err && <ErrLine text={err} />}

              <Button size="lg" className="w-full" disabled={busy} onClick={next1}>
                {busy ? <><LoaderCircle className="w-4 h-4 animate-spin" />发送中…</> : <>下一步 <ArrowRight className="w-4 h-4" /></>}
              </Button>

              <p className="text-2xs text-faint leading-relaxed">
                我们将向该账号发送一次性验证码。若该邮箱 / 手机号未注册，出于安全考虑系统不会作出区分提示。
              </p>
            </div>
          )}

          {/* ============================ Step 2 ============================ */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                验证码已发送至 <b className="text-ink break-all">{account}</b>，请在 10 分钟内完成验证。
              </p>

              <Otp value={code} onChange={setCode} onComplete={next2} />

              <div className="flex items-center justify-between">
                {left > 0 ? (
                  <span className="text-2xs text-faint tnum">{left}s 后可重新发送</span>
                ) : (
                  <button onClick={() => setLeft(60)} className="text-2xs text-brand hover:underline">
                    重新发送验证码
                  </button>
                )}
                <span className="text-2xs text-faint">原型演示：任意 6 位数字</span>
              </div>

              {err && <ErrLine text={err} />}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="lg" className="w-28" onClick={back} disabled={busy}>
                  <ArrowLeft className="w-4 h-4" />上一步
                </Button>
                <Button size="lg" className="flex-1" disabled={!filled || busy} onClick={next2}>
                  {busy ? <><LoaderCircle className="w-4 h-4 animate-spin" />验证中…</> : <>下一步 <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
            </div>
          )}

          {/* ============================ Step 3 ============================ */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <label className="block">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted">新密码</span>
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
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full bg-line overflow-hidden">
                      <div className={cn('h-full transition-all duration-300', s > i ? lv.bar : 'bg-transparent')} style={{ width: s > i ? '100%' : '0%' }} />
                    </div>
                  ))}
                </div>
              </label>

              <label className="block">
                <div className="text-xs text-muted mb-1.5">确认新密码</div>
                <div className={cn(
                  'flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border transition-colors',
                  mismatch ? 'border-down' : match ? 'border-up' : 'border-line focus-within:border-brand',
                )}>
                  <KeyRound className="w-4 h-4 text-faint shrink-0" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pw2}
                    onChange={e => setPw2(e.target.value)}
                    placeholder="请再次输入新密码"
                    autoComplete="new-password"
                    onKeyDown={e => e.key === 'Enter' && finish()}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                  />
                  {match && <Check className="w-4 h-4 text-up shrink-0" />}
                </div>
                {mismatch && <div className="text-2xs text-down mt-1">两次输入的密码不一致</div>}
              </label>

              {err && <ErrLine text={err} />}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="lg" className="w-28" onClick={back} disabled={busy}>
                  <ArrowLeft className="w-4 h-4" />上一步
                </Button>
                <Button size="lg" className="flex-1" disabled={busy || !match || s < 2} onClick={finish}>
                  {busy ? <><LoaderCircle className="w-4 h-4 animate-spin" />提交中…</> : '完成重置'}
                </Button>
              </div>

              <p className="text-2xs text-faint leading-relaxed">
                重置成功后，出于风控要求账户将在 24 小时内禁止提现，且所有设备将被强制登出。
              </p>
            </div>
          )}
        </div>
      </Card>

      <p className="text-2xs text-faint text-center mt-4">
        想起密码了？
        <Link to="/login" className="text-brand hover:underline ml-1">直接登录</Link>
      </p>
    </div>
  )
}

const ErrLine = ({ text }: { text: string }) => (
  <div className="flex items-center gap-1.5 text-xs text-down">
    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{text}
  </div>
)

/* ------------------------------ 6-box OTP ------------------------------ */
function Otp({
  value, onChange, onComplete,
}: { value: string[]; onChange: (v: string[]) => void; onComplete?: () => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const set = (i: number, ch: string) => {
    const next = [...value]
    next[i] = ch
    onChange(next)
    return next
  }

  const handle = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) { set(i, ''); return }
    if (digits.length > 1) {
      const next = [...value]
      for (let k = 0; k < digits.length && i + k < value.length; k++) next[i + k] = digits[k]
      onChange(next)
      refs.current[Math.min(i + digits.length, value.length - 1)]?.focus()
      if (next.every(c => c !== '')) onComplete?.()
      return
    }
    const next = set(i, digits)
    if (i < value.length - 1) refs.current[i + 1]?.focus()
    if (next.every(c => c !== '')) onComplete?.()
  }

  const key = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[i]) set(i, '')
      else if (i > 0) { set(i - 1, ''); refs.current[i - 1]?.focus() }
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
            'flex-1 min-w-0 h-12 rounded-lg bg-elevated border text-center text-lg font-semibold tnum',
            'outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20',
            c ? 'border-brand' : 'border-line',
          )}
        />
      ))}
    </div>
  )
}
