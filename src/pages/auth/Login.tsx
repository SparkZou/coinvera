import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CandlestickChart, Eye, EyeOff, Mail, Phone, ShieldCheck, Smartphone,
  KeyRound, ArrowLeft, CircleCheck, AlertTriangle, LoaderCircle, Check, ArrowRight,
} from 'lucide-react'
import { Card, Button, Badge, Toggle } from '@/components/ui'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 登录 — Function List F-03
 *   Step 1  账号密码 (邮箱 / 手机)
 *   Step 2  二次验证 — 谷歌验证器 / 手机验证码 / 邮箱验证码
 *
 * ⚠ 合同 Article I 明确排除 secondary verification services，
 *   与 F-03 要求的二次验证冲突 — 须书面澄清。
 * ------------------------------------------------------------------ */

type Step = 'credentials' | 'twofa' | 'done'
type Method = 'ga' | 'sms' | 'email'

const METHODS: { id: Method; label: string; icon: any; hint: string }[] = [
  { id: 'ga', label: '谷歌验证器', icon: ShieldCheck, hint: '请输入 Google Authenticator 中的 6 位动态码' },
  { id: 'sms', label: '手机验证码', icon: Smartphone, hint: '验证码已发送至 +64 21 *** 892' },
  { id: 'email', label: '邮箱验证码', icon: Mail, hint: '验证码已发送至 d***o@exchange.io' },
]

export default function Login() {
  const nav = useNavigate()
  const [step, setStep] = useState<Step>('credentials')
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [account, setAccount] = useState('demo@exchange.io')
  const [pw, setPw] = useState('Demo1234!')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const [method, setMethod] = useState<Method>('ga')
  const [code, setCode] = useState<string[]>(Array(6).fill(''))
  const [left, setLeft] = useState(0)

  /* Resend countdown */
  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => setLeft(l => l - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])

  /* Redirect after the success state. */
  useEffect(() => {
    if (step !== 'done') return
    const t = window.setTimeout(() => nav('/'), 1800)
    return () => window.clearTimeout(t)
  }, [step, nav])

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    if (!account.trim()) return setErr('请输入账号')
    if (pw.length < 6) return setErr('密码至少 6 位')
    setErr('')
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      setStep('twofa')
      setLeft(60)
    }, 700)
  }

  const filled = code.every(c => c !== '')

  const verify = () => {
    if (!filled) return
    setBusy(true)
    window.setTimeout(() => { setBusy(false); setStep('done') }, 900)
  }

  const switchMethod = (m: Method) => {
    setMethod(m)
    setCode(Array(6).fill(''))
    setLeft(m === 'ga' ? 0 : 60)
  }

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
                'radial-gradient(70% 70% at 90% 95%, rgb(var(--info) / 0.12), transparent 60%)',
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
              专业级交易，
              <br />从一次安全登录开始
            </h2>
            <p className="mt-3 text-xs text-muted leading-relaxed">
              机构级撮合引擎、冷热钱包分离与 7×24 风控监测 — 让每一笔委托都值得信赖。
            </p>
          </div>

          <div className="relative space-y-3 mt-10">
            {[
              { icon: ShieldCheck, t: '双因子验证', d: '谷歌验证器 / 短信 / 邮箱' },
              { icon: KeyRound, t: '防钓鱼码', d: '官方邮件均携带您的专属码' },
              { icon: CircleCheck, t: '100% 储备金证明', d: '每月发布 Merkle 树审计' },
            ].map(f => (
              <div key={f.t} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
                  <f.icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-medium">{f.t}</div>
                  <div className="text-2xs text-faint mt-0.5">{f.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative pt-8 mt-8 border-t border-line flex items-center gap-6">
            {[['24h 成交额', '$8.4B'], ['注册用户', '2.4M+'], ['上线币种', '240+']].map(([l, v]) => (
              <div key={l}>
                <div className="text-sm font-semibold tnum">{v}</div>
                <div className="text-2xs text-faint">{l}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* ------------------------------ Form ------------------------------ */}
        <section className="p-6 sm:p-8">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand grid place-items-center">
              <CandlestickChart className="w-4 h-4 text-brand-ink" />
            </div>
            <span className="font-bold tracking-tight">EXCHANGE</span>
          </div>

          {/* ============================ Step 1 ============================ */}
          {step === 'credentials' && (
            <form onSubmit={submitCredentials} className="animate-fade-in">
              <div className="flex items-end justify-between gap-3 mb-6">
                <div>
                  <h1 className="text-xl font-semibold">登录</h1>
                  <p className="text-xs text-muted mt-1">
                    还没有账户？
                    <Link to="/register" className="text-brand hover:underline ml-1">立即注册</Link>
                  </p>
                </div>
                <Badge tone="muted">F-03</Badge>
              </div>

              {/* 邮箱 / 手机 */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-elevated mb-5">
                {([
                  { id: 'email', label: '邮箱登录', icon: Mail },
                  { id: 'phone', label: '手机登录', icon: Phone },
                ] as const).map(m => (
                  <button
                    key={m.id} type="button"
                    onClick={() => { setMode(m.id); setAccount(m.id === 'email' ? 'demo@exchange.io' : '+64 21 000 892') }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 h-8 rounded-md text-xs transition-all',
                      mode === m.id ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink',
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5" />{m.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <label className="block">
                  <div className="text-xs text-muted mb-1.5">{mode === 'email' ? '邮箱地址' : '手机号码'}</div>
                  <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand transition-colors">
                    {mode === 'email'
                      ? <Mail className="w-4 h-4 text-faint shrink-0" />
                      : <Phone className="w-4 h-4 text-faint shrink-0" />}
                    <input
                      value={account}
                      onChange={e => setAccount(e.target.value)}
                      placeholder={mode === 'email' ? 'you@example.com' : '请输入手机号'}
                      autoComplete="username"
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted">登录密码</span>
                    <Link to="/forgot" className="text-2xs text-brand hover:underline">忘记密码？</Link>
                  </div>
                  <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand transition-colors">
                    <KeyRound className="w-4 h-4 text-faint shrink-0" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pw}
                      onChange={e => setPw(e.target.value)}
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                    />
                    <button
                      type="button" onClick={() => setShowPw(s => !s)}
                      className="text-faint hover:text-ink transition-colors shrink-0"
                      aria-label={showPw ? '隐藏密码' : '显示密码'}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                {err && (
                  <div className="flex items-center gap-1.5 text-xs text-down">
                    <AlertTriangle className="w-3.5 h-3.5" />{err}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Toggle checked={remember} onChange={setRemember} label={<span className="text-xs text-muted">记住我</span>} />
                  <span className="text-2xs text-faint">7 天内免验证</span>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <><LoaderCircle className="w-4 h-4 animate-spin" />验证中…</> : <>登录 <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>

              <div className="mt-5 pt-5 border-t border-line">
                <p className="text-2xs text-faint leading-relaxed">
                  原型演示：任意账号 + 6 位以上密码即可进入下一步「二次验证」。
                </p>
              </div>
            </form>
          )}

          {/* ============================ Step 2 ============================ */}
          {step === 'twofa' && (
            <div className="animate-fade-in">
              <button
                onClick={() => { setStep('credentials'); setCode(Array(6).fill('')) }}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />返回
              </button>

              <div className="flex items-end justify-between gap-3 mb-5">
                <div>
                  <h1 className="text-xl font-semibold">二次验证</h1>
                  <p className="text-xs text-muted mt-1">为保障账户安全，请完成一项验证</p>
                </div>
                <Badge tone="warn"><AlertTriangle className="w-2.5 h-2.5" />待澄清</Badge>
              </div>

              {/* Method tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-elevated mb-5">
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => switchMethod(m.id)}
                    className={cn(
                      'flex items-center justify-center gap-1 h-8 rounded-md text-2xs sm:text-xs transition-all whitespace-nowrap',
                      method === m.id ? 'bg-surface text-ink font-semibold shadow-sm' : 'text-muted hover:text-ink',
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted mb-4">{METHODS.find(m => m.id === method)!.hint}</p>

              <Otp value={code} onChange={setCode} onComplete={verify} />

              <div className="flex items-center justify-between mt-4">
                {method === 'ga' ? (
                  <span className="text-2xs text-faint">动态码每 30 秒刷新一次</span>
                ) : left > 0 ? (
                  <span className="text-2xs text-faint tnum">{left}s 后可重新发送</span>
                ) : (
                  <button onClick={() => setLeft(60)} className="text-2xs text-brand hover:underline">
                    重新发送验证码
                  </button>
                )}
                <button className="text-2xs text-muted hover:text-ink transition-colors">无法验证？</button>
              </div>

              <Button size="lg" className="w-full mt-5" disabled={!filled || busy} onClick={verify}>
                {busy ? <><LoaderCircle className="w-4 h-4 animate-spin" />验证中…</> : '验证并登录'}
              </Button>

              {/* Contract conflict */}
              <div className="mt-5 rounded-lg border border-warn/40 bg-warn/[0.06] p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-warn shrink-0" />
                  <span className="text-xs font-semibold text-warn">合同冲突 — 须书面澄清</span>
                </div>
                <p className="text-2xs text-muted leading-relaxed">
                  合同 <b className="text-ink">Article I</b> 的产品定义明确排除
                  <b className="text-ink"> secondary verification services</b>（二次验证服务），
                  而《功能列表》F-03 要求登录支持谷歌验证器 / 手机验证码 / 邮箱验证码。
                  短信与邮件通道的第三方费用 (SMS gateway / SMTP) 亦未在合同中约定 — 须在附件中明确范围与费用承担方。
                </p>
              </div>
            </div>
          )}

          {/* ============================ Step 3 ============================ */}
          {step === 'done' && (
            <div className="animate-fade-in py-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-up/10 grid place-items-center mb-5">
                <Check className="w-8 h-8 text-up" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-semibold">登录成功</h1>
              <p className="text-xs text-muted mt-2">
                欢迎回来，<b className="text-ink">Demo Trader</b> · UID 81243907
              </p>
              <p className="text-2xs text-faint mt-1 tnum">正在跳转至首页…</p>

              <div className="w-full max-w-xs mt-6 h-1 rounded-full bg-elevated overflow-hidden">
                <div className="h-full w-full bg-brand animate-pulse" />
              </div>

              <div className="flex gap-2 mt-6">
                <Link to="/"><Button variant="outline" size="sm">前往首页</Button></Link>
                <Link to="/trade/spot/BTC-USDT"><Button size="sm">开始交易</Button></Link>
              </div>
            </div>
          )}
        </section>
      </Card>

      <p className="text-2xs text-faint text-center mt-4">
        原型演示 · 数据均为模拟 ·
        <Link to="/coverage" className="text-brand hover:underline ml-1">功能覆盖清单</Link>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 6-box OTP — auto-advance, backspace-back, paste-to-fill.
 * ------------------------------------------------------------------ */
function Otp({
  value, onChange, onComplete, tone = 'brand',
}: {
  value: string[]
  onChange: (v: string[]) => void
  onComplete?: () => void
  tone?: 'brand' | 'up'
}) {
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

    if (digits.length > 1) {                       // paste / fast type
      const next = [...value]
      for (let k = 0; k < digits.length && i + k < value.length; k++) next[i + k] = digits[k]
      onChange(next)
      const last = Math.min(i + digits.length, value.length - 1)
      refs.current[last]?.focus()
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
    <div className="flex gap-2 sm:gap-2.5">
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
            'flex-1 min-w-0 h-12 sm:h-14 rounded-lg bg-elevated border text-center text-lg font-semibold tnum',
            'outline-none transition-all',
            c
              ? tone === 'up' ? 'border-up text-up' : 'border-brand text-ink'
              : 'border-line text-ink',
            'focus:border-brand focus:ring-2 focus:ring-brand/20',
          )}
        />
      ))}
    </div>
  )
}
