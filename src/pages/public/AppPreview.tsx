import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Fingerprint, ScanFace, Grid3x3, Check, AlertTriangle, RotateCcw,
  Wifi, BatteryFull, Signal, ChevronRight, Lock,
} from 'lucide-react'
import { Card, CardHeader, Badge, Button, PageHeader } from '@/components/ui'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * App 端交互预览 — Function List F-02 (验证：指纹 / 图案 / 人脸识别)
 *
 * 三个手机框内的交互都是真实可操作的：
 *   1. 指纹解锁  — 点击 → 扫描动画 → 成功
 *   2. 图案锁    — 3×3 点阵，鼠标/触摸拖动连线 (≥4 点通过)
 *   3. 人脸识别  — 点击 → 扫描线动画 → 成功
 *
 * 底部风险提示：人脸识别依赖第三方 KYC 服务商，且合同 Article I
 * 明确排除 secondary verification services — 须书面澄清。
 * ------------------------------------------------------------------ */

type Phase = 'idle' | 'scanning' | 'success' | 'error'

const CSS = `
@keyframes ap-scanline { 0% { top: 4%; } 50% { top: 92%; } 100% { top: 4%; } }
@keyframes ap-ring { 0% { transform: scale(0.9); opacity: 0.55; } 100% { transform: scale(1.55); opacity: 0; } }
@keyframes ap-sweep { from { transform: translateY(-100%); } to { transform: translateY(220%); } }
.ap-scanline { animation: ap-scanline 1.8s ease-in-out infinite; }
.ap-ring { animation: ap-ring 1.4s ease-out infinite; }
.ap-sweep { animation: ap-sweep 1.6s ease-in-out infinite; }
`

export default function AppPreview() {
  return (
    <div>
      <style>{CSS}</style>

      <PageHeader
        title="App 端交互预览"
        sub="F-02 验证 — 指纹解锁 / 图案锁 / 人脸识别。三个演示均可直接操作。"
        actions={
          <Link to="/download">
            <Button variant="outline" size="sm">APP 下载<ChevronRight className="w-3.5 h-3.5" /></Button>
          </Link>
        }
      />

      <div className="grid md:grid-cols-3 gap-5 lg:gap-8 justify-items-center mb-6">
        <FingerprintDemo />
        <PatternDemo />
        <FaceDemo />
      </div>

      {/* ------------------------------ 待澄清 ------------------------------ */}
      <Card className="border-warn/40 overflow-hidden max-w-4xl mx-auto">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warn" />
              F-02 验证 — 签约前须书面澄清
            </span>
          }
          sub="《功能列表》要求的三种验证方式，其实现主体与合同范围存在差异"
          right={<Badge tone="warn">待澄清</Badge>}
        />
        <div className="divide-y divide-line/60">
          {[
            {
              tone: 'up' as const,
              label: '指纹 / 图案锁',
              body: 'APP 原生能力 (iOS LocalAuthentication / Android BiometricPrompt)，由我方在客户端实现，无额外成本、无第三方依赖。已在上方演示。',
              badge: '我方交付',
              badgeTone: 'up' as const,
            },
            {
              tone: 'warn' as const,
              label: '人脸识别 (活体检测)',
              body: '需接入第三方 KYC / 活体检测服务商 (如 Sumsub、Jumio、ADVANCE.AI)。SDK 授权费、按次调用费与服务商合同须由甲方提供并承担；我方仅负责 SDK 集成与回调对接。',
              badge: '需甲方提供服务商',
              badgeTone: 'warn' as const,
            },
            {
              tone: 'down' as const,
              label: '合同 Article I 冲突',
              body: '合同 Article I 的产品定义明确排除 secondary verification services（二次验证服务）。而《功能列表》F-02「验证」与 F-03「登录二次验证」均要求该能力。二者直接冲突 — 须在附件中明确：(a) 是否纳入交付范围；(b) 若纳入，第三方服务费用由谁承担。',
              badge: '合同冲突',
              badgeTone: 'down' as const,
            },
          ].map(r => (
            <div key={r.label} className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
              <div className="sm:w-44 shrink-0 flex items-center gap-2">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  r.tone === 'up' ? 'bg-up' : r.tone === 'warn' ? 'bg-warn' : 'bg-down',
                )} />
                <span className="text-sm font-medium">{r.label}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed flex-1">{r.body}</p>
              <div className="shrink-0">
                <Badge tone={r.badgeTone}>{r.badge}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-2xs text-faint mt-5 text-center leading-relaxed max-w-4xl mx-auto">
        以上手机框内的三段交互为纯前端实现 (CSS + SVG + React 状态)，用于向贵司演示 App 端解锁流程的完整形态；
        正式版将替换为 iOS / Android 原生生物识别 API 与第三方活体检测 SDK。
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Phone shell
 * ------------------------------------------------------------------ */
function Phone({
  title, badge, children, footer,
}: { title: string; badge?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="w-full max-w-[280px]">
      <div className="w-[280px] rounded-[2.25rem] border-[6px] border-line bg-bg shadow-2xl overflow-hidden">
        {/* Status bar + notch */}
        <div className="relative h-9 bg-surface flex items-center justify-between px-5 text-2xs">
          <span className="tnum font-medium">9:41</span>
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-24 h-5 bg-line rounded-b-2xl" />
          <div className="flex items-center gap-1 text-muted">
            <Signal className="w-3 h-3" /><Wifi className="w-3 h-3" /><BatteryFull className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Screen */}
        <div className="h-[440px] bg-bg flex flex-col items-center px-5 pt-7 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-brand grid place-items-center mb-3">
            <Lock className="w-5 h-5 text-brand-ink" />
          </div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-2xs text-muted mt-1 mb-1">EXCHANGE · UID 81243907</div>

          <div className="flex-1 w-full flex flex-col items-center justify-center">
            {children}
          </div>

          <div className="w-full text-center min-h-[34px]">{footer}</div>
          <div className="w-28 h-1 rounded-full bg-line mt-3" />
        </div>
      </div>

      {badge && <div className="flex justify-center mt-4">{badge}</div>}
    </div>
  )
}

const StatusLine = ({ phase, idle, scanning, error }: {
  phase: Phase; idle: string; scanning: string; error?: string
}) => (
  <div className="text-2xs leading-relaxed">
    {phase === 'idle' && <span className="text-muted">{idle}</span>}
    {phase === 'scanning' && <span className="text-brand">{scanning}</span>}
    {phase === 'success' && (
      <span className="text-up inline-flex items-center gap-1 font-medium">
        <Check className="w-3 h-3" />验证通过，正在进入…
      </span>
    )}
    {phase === 'error' && <span className="text-down">{error ?? '验证失败，请重试'}</span>}
  </div>
)

/* ------------------------------------------------------------------ *
 * 1 · 指纹解锁
 * ------------------------------------------------------------------ */
function FingerprintDemo() {
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<number[]>([])

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const run = () => {
    if (phase === 'scanning') return
    timers.current.forEach(clearTimeout)
    setPhase('scanning')
    timers.current = [
      window.setTimeout(() => setPhase('success'), 1600),
      window.setTimeout(() => setPhase('idle'), 4200),
    ]
  }

  const active = phase === 'scanning'
  const done = phase === 'success'

  return (
    <Phone
      title="指纹解锁"
      badge={
        <Badge tone="up"><Check className="w-2.5 h-2.5" />APP 原生能力 · 我方交付</Badge>
      }
      footer={
        <StatusLine
          phase={phase}
          idle="轻触指纹传感器以解锁"
          scanning="正在识别指纹…"
        />
      }
    >
      <button onClick={run} className="relative w-36 h-36 grid place-items-center group" aria-label="指纹解锁">
        {/* Pulse rings */}
        {active && [0, 1, 2].map(i => (
          <span
            key={i}
            className="absolute w-28 h-28 rounded-full border-2 border-brand ap-ring"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}

        <span className={cn(
          'absolute w-28 h-28 rounded-full transition-colors duration-500',
          done ? 'bg-up/10' : active ? 'bg-brand/10' : 'bg-elevated group-hover:bg-brand/10',
        )} />

        {/* Progress ring */}
        <svg className="absolute w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="46" fill="none" strokeWidth="3"
            stroke="rgb(var(--line))"
          />
          <circle
            cx="50" cy="50" r="46" fill="none" strokeWidth="3" strokeLinecap="round"
            stroke={done ? 'rgb(var(--up))' : 'rgb(var(--brand))'}
            strokeDasharray={289}
            strokeDashoffset={done ? 0 : active ? 0 : 289}
            style={{ transition: active ? 'stroke-dashoffset 1.6s linear' : 'stroke-dashoffset 300ms ease' }}
          />
        </svg>

        {/* Scan sweep over the fingerprint */}
        <span className="relative w-14 h-14 grid place-items-center overflow-hidden">
          {done
            ? <Check className="w-12 h-12 text-up animate-fade-in" strokeWidth={2.5} />
            : (
              <>
                <Fingerprint
                  className={cn('w-14 h-14 transition-colors', active ? 'text-brand' : 'text-faint group-hover:text-muted')}
                  strokeWidth={1.4}
                />
                {active && (
                  <span className="absolute inset-x-0 h-1/3 bg-brand/25 ap-sweep pointer-events-none" />
                )}
              </>
            )}
        </span>
      </button>
    </Phone>
  )
}

/* ------------------------------------------------------------------ *
 * 2 · 图案锁 — real 3×3 pointer-driven pattern lock
 * ------------------------------------------------------------------ */
const BOX = 216           // svg/user-space size
const CELL = BOX / 3
const HIT = 30            // hit radius
const MIN_DOTS = 4

const centre = (i: number) => ({
  x: (i % 3) * CELL + CELL / 2,
  y: Math.floor(i / 3) * CELL + CELL / 2,
})

function PatternDemo() {
  const [path, setPath] = useState<number[]>([])
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const box = useRef<HTMLDivElement>(null)
  const drawing = useRef(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  /** Translate a client point into the 0..BOX user space of the pad. */
  const local = useCallback((e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * BOX,
      y: ((e.clientY - r.top) / r.height) * BOX,
    }
  }, [])

  const hitDot = (p: { x: number; y: number }) => {
    for (let i = 0; i < 9; i++) {
      const c = centre(i)
      if (Math.hypot(c.x - p.x, c.y - p.y) <= HIT) return i
    }
    return -1
  }

  const down = (e: React.PointerEvent) => {
    if (timer.current) clearTimeout(timer.current)
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    setPhase('idle')
    const p = local(e)
    const i = hitDot(p)
    setPath(i >= 0 ? [i] : [])
    setCursor(p)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const p = local(e)
    setCursor(p)
    const i = hitDot(p)
    if (i >= 0) {
      setPath(prev => {
        if (prev.includes(i)) return prev
        // Auto-fill the dot in between when the stroke jumps a cell (real pattern-lock behaviour).
        const last = prev[prev.length - 1]
        if (last != null) {
          const mid = middleDot(last, i)
          if (mid >= 0 && !prev.includes(mid)) return [...prev, mid, i]
        }
        return [...prev, i]
      })
    }
  }

  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    setCursor(null)
    if (path.length === 0) return
    const ok = path.length >= MIN_DOTS
    setPhase(ok ? 'success' : 'error')
    timer.current = window.setTimeout(
      () => { setPhase('idle'); setPath([]) },
      ok ? 2600 : 1400,
    )
  }

  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    setPath([]); setCursor(null); setPhase('idle')
  }

  const stroke =
    phase === 'success' ? 'rgb(var(--up))' : phase === 'error' ? 'rgb(var(--down))' : 'rgb(var(--brand))'

  const pts = path.map(centre)
  const line = pts.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <Phone
      title="图案解锁"
      badge={<Badge tone="up"><Check className="w-2.5 h-2.5" />APP 原生能力 · 我方交付</Badge>}
      footer={
        <div className="flex items-center justify-center gap-2">
          <StatusLine
            phase={phase}
            idle={`按住并拖动连接至少 ${MIN_DOTS} 个点`}
            scanning="正在校验图案…"
            error={`至少连接 ${MIN_DOTS} 个点`}
          />
          {path.length > 0 && phase === 'idle' && (
            <button onClick={reset} className="text-2xs text-faint hover:text-ink transition-colors">
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      }
    >
      <div
        ref={box}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative w-[216px] h-[216px] touch-none select-none cursor-crosshair"
      >
        <svg viewBox={`0 0 ${BOX} ${BOX}`} className="absolute inset-0 w-full h-full">
          {/* Connecting path */}
          {pts.length > 1 && (
            <polyline
              points={line} fill="none" stroke={stroke} strokeWidth={3}
              strokeLinecap="round" strokeLinejoin="round" opacity={0.9}
            />
          )}
          {/* Live segment to the cursor */}
          {cursor && pts.length > 0 && (
            <line
              x1={pts[pts.length - 1].x} y1={pts[pts.length - 1].y}
              x2={cursor.x} y2={cursor.y}
              stroke={stroke} strokeWidth={3} strokeLinecap="round" opacity={0.45}
            />
          )}

          {/* Dots */}
          {Array.from({ length: 9 }, (_, i) => {
            const c = centre(i)
            const on = path.includes(i)
            return (
              <g key={i}>
                {on && (
                  <circle
                    cx={c.x} cy={c.y} r={22} fill={stroke} opacity={0.12}
                    className="transition-all"
                  />
                )}
                <circle
                  cx={c.x} cy={c.y} r={on ? 9 : 7}
                  fill={on ? stroke : 'rgb(var(--line))'}
                  className="transition-all"
                />
                <circle
                  cx={c.x} cy={c.y} r={16} fill="none" strokeWidth={1.5}
                  stroke={on ? stroke : 'rgb(var(--line))'}
                  opacity={on ? 0.6 : 0.35}
                />
              </g>
            )
          })}
        </svg>

        {/* Success overlay */}
        {phase === 'success' && (
          <div className="absolute inset-0 grid place-items-center animate-fade-in pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-up/10 grid place-items-center">
              <Check className="w-8 h-8 text-up" strokeWidth={2.5} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        {Array.from({ length: MIN_DOTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              path.length > i
                ? phase === 'error' ? 'bg-down' : phase === 'success' ? 'bg-up' : 'bg-brand'
                : 'bg-line',
            )}
          />
        ))}
        {path.length > MIN_DOTS && (
          <span className="text-2xs text-faint tnum ml-1">+{path.length - MIN_DOTS}</span>
        )}
      </div>
    </Phone>
  )
}

/** The dot that a straight stroke from a→b must pass through, or -1. */
function middleDot(a: number, b: number) {
  const ax = a % 3, ay = Math.floor(a / 3)
  const bx = b % 3, by = Math.floor(b / 3)
  if ((ax + bx) % 2 !== 0 || (ay + by) % 2 !== 0) return -1
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  const mid = my * 3 + mx
  return mid === a || mid === b ? -1 : mid
}

/* ------------------------------------------------------------------ *
 * 3 · 人脸识别
 * ------------------------------------------------------------------ */
function FaceDemo() {
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<number[]>([])

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const run = () => {
    if (phase === 'scanning') return
    timers.current.forEach(clearTimeout)
    setPhase('scanning')
    timers.current = [
      window.setTimeout(() => setPhase('success'), 2400),
      window.setTimeout(() => setPhase('idle'), 5000),
    ]
  }

  const active = phase === 'scanning'
  const done = phase === 'success'

  return (
    <Phone
      title="人脸识别"
      badge={<Badge tone="warn"><AlertTriangle className="w-2.5 h-2.5" />第三方 KYC 服务商 · 待澄清</Badge>}
      footer={
        <StatusLine
          phase={phase}
          idle="点击开始 · 请将面部置于框内"
          scanning="活体检测中，请勿移动…"
        />
      }
    >
      <button onClick={run} className="relative w-[190px] h-[230px] group" aria-label="人脸识别">
        <div className={cn(
          'absolute inset-0 rounded-2xl overflow-hidden transition-colors duration-500',
          done ? 'bg-up/10' : active ? 'bg-brand/10' : 'bg-elevated group-hover:bg-brand/5',
        )}>
          {/* Camera grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.18]" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 30} x2="190" y2={i * 30} stroke="rgb(var(--faint))" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="230" stroke="rgb(var(--faint))" strokeWidth="0.5" />
            ))}
          </svg>

          {/* Face silhouette */}
          <svg viewBox="0 0 190 230" className="absolute inset-0 w-full h-full">
            <ellipse
              cx="95" cy="108" rx="52" ry="66"
              fill="none" strokeWidth="1.5" strokeDasharray="6 5"
              stroke={done ? 'rgb(var(--up))' : active ? 'rgb(var(--brand))' : 'rgb(var(--faint))'}
              opacity={0.7}
              className="transition-all"
            />
            {/* Landmark dots — appear during the scan */}
            {active && [
              [78, 96], [112, 96], [95, 116], [80, 138], [110, 138], [95, 146],
              [66, 80], [124, 80], [95, 62], [95, 172],
            ].map(([x, y], i) => (
              <circle
                key={i} cx={x} cy={y} r="2" fill="rgb(var(--brand))"
                className="animate-fade-in"
                style={{ animationDelay: `${i * 90}ms` }}
              />
            ))}
            {done && [
              [78, 96], [112, 96], [95, 116], [80, 138], [110, 138],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2" fill="rgb(var(--up))" />
            ))}
          </svg>

          {/* Scanning line */}
          {active && (
            <div className="absolute inset-x-3 h-8 ap-scanline pointer-events-none">
              <div
                className="w-full h-full"
                style={{ background: 'linear-gradient(to bottom, transparent, rgb(var(--brand) / 0.30), transparent)' }}
              />
              <div className="absolute inset-x-0 top-1/2 h-px bg-brand" />
            </div>
          )}

          {/* Idle icon */}
          {phase === 'idle' && (
            <div className="absolute inset-0 grid place-items-center">
              <ScanFace className="w-10 h-10 text-faint group-hover:text-muted transition-colors" strokeWidth={1.2} />
            </div>
          )}

          {done && (
            <div className="absolute inset-0 grid place-items-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-up/10 grid place-items-center">
                <Check className="w-8 h-8 text-up" strokeWidth={2.5} />
              </div>
            </div>
          )}
        </div>

        {/* Corner brackets */}
        {['left-0 top-0 border-l-2 border-t-2 rounded-tl-2xl',
          'right-0 top-0 border-r-2 border-t-2 rounded-tr-2xl',
          'left-0 bottom-0 border-l-2 border-b-2 rounded-bl-2xl',
          'right-0 bottom-0 border-r-2 border-b-2 rounded-br-2xl'].map(c => (
          <span
            key={c}
            className={cn(
              'absolute w-7 h-7 transition-colors duration-500', c,
              done ? 'border-up' : active ? 'border-brand' : 'border-line',
            )}
          />
        ))}
      </button>

      <div className="flex items-center gap-1.5 mt-4 text-2xs text-faint">
        <Grid3x3 className="w-3 h-3" />
        <span>SDK: Sumsub / Jumio (待定)</span>
      </div>
    </Phone>
  )
}
