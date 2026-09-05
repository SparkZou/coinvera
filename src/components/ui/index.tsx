import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, ChevronDown, Search, Check } from 'lucide-react'

/* ---------------------------------- Button --------------------------------- */
type BtnVariant = 'primary' | 'ghost' | 'outline' | 'up' | 'down' | 'subtle' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

export function Button({
  variant = 'primary', size = 'md', className, ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-brand text-brand-ink hover:brightness-110 font-semibold',
    ghost:   'text-muted hover:text-ink hover:bg-elevated',
    outline: 'border border-line text-ink hover:bg-elevated',
    subtle:  'bg-elevated text-ink hover:brightness-125',
    up:      'bg-up text-white hover:brightness-110 font-semibold',
    down:    'bg-down text-white hover:brightness-110 font-semibold',
    danger:  'bg-down/10 text-down border border-down/30 hover:bg-down/20',
  }
  const sizes: Record<BtnSize, string> = {
    sm: 'h-8 px-3 text-xs rounded-lg',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-xl',
  }
  return (
    <button
      {...p}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 transition-all',
        'disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]',
        variants[variant], sizes[size], className,
      )}
    />
  )
}

/* ----------------------------------- Card ---------------------------------- */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn('card', className)} />
}

export function CardHeader({
  title, sub, right, className,
}: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3 border-b border-line', className)}>
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        {sub && <div className="text-xs text-muted mt-0.5 truncate">{sub}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* ---------------------------------- Input ---------------------------------- */
export function Input({
  label, suffix, prefix, error, className, ...p
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  // React types `prefix` as the RDFa string attribute; we want a ReactNode adornment.
  label?: string; suffix?: React.ReactNode; prefix?: React.ReactNode; error?: string
}) {
  return (
    <label className="block">
      {label && <div className="text-xs text-muted mb-1.5">{label}</div>}
      <div className={cn(
        'flex items-center gap-2 h-10 px-3 rounded-lg bg-elevated border transition-colors',
        error ? 'border-down' : 'border-line focus-within:border-brand',
      )}>
        {prefix && <span className="text-muted shrink-0">{prefix}</span>}
        <input
          {...p}
          className={cn(
            'flex-1 min-w-0 bg-transparent outline-none text-sm tnum placeholder:text-faint',
            className,
          )}
        />
        {suffix && <span className="text-xs text-muted shrink-0">{suffix}</span>}
      </div>
      {error && <div className="text-xs text-down mt-1">{error}</div>}
    </label>
  )
}

export function Select({
  label, options, className, ...p
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string; options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      {label && <div className="text-xs text-muted mb-1.5">{label}</div>}
      <div className="relative">
        <select
          {...p}
          className={cn(
            'w-full h-10 pl-3 pr-9 rounded-lg bg-elevated border border-line text-sm',
            'outline-none focus:border-brand appearance-none cursor-pointer', className,
          )}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      </div>
    </label>
  )
}

export function SearchBox({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('flex items-center gap-2 h-9 px-3 rounded-lg bg-elevated border border-line focus-within:border-brand', className)}>
      <Search className="w-3.5 h-3.5 text-faint shrink-0" />
      <input {...p} className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint" />
    </div>
  )
}

/* ----------------------------------- Tabs ---------------------------------- */
export function Tabs<T extends string>({
  tabs, value, onChange, size = 'md', full, className,
}: {
  tabs: { id: T; label: React.ReactNode; count?: number }[]
  value: T; onChange: (v: T) => void
  size?: 'sm' | 'md'; full?: boolean; className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1 no-scrollbar overflow-x-auto', full && 'w-full', className)}>
      {tabs.map(tb => (
        <button
          key={tb.id}
          onClick={() => onChange(tb.id)}
          className={cn(
            'relative whitespace-nowrap transition-colors rounded-lg',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            full && 'flex-1',
            value === tb.id
              ? 'text-ink font-semibold bg-elevated'
              : 'text-muted hover:text-ink',
          )}
        >
          {tb.label}
          {tb.count != null && (
            <span className={cn('ml-1.5 text-2xs tnum', value === tb.id ? 'text-brand' : 'text-faint')}>
              {tb.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Underline tabs — for page-level section switching. */
export function TabsUnderline<T extends string>({
  tabs, value, onChange, className,
}: { tabs: { id: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-5 border-b border-line no-scrollbar overflow-x-auto', className)}>
      {tabs.map(tb => (
        <button
          key={tb.id}
          onClick={() => onChange(tb.id)}
          className={cn(
            'relative whitespace-nowrap py-2.5 text-sm transition-colors',
            value === tb.id ? 'text-ink font-semibold' : 'text-muted hover:text-ink',
          )}
        >
          {tb.label}
          {value === tb.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand rounded-full" />}
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------- Badge ---------------------------------- */
type Tone = 'up' | 'down' | 'warn' | 'info' | 'brand' | 'muted'
export function Badge({
  tone = 'muted', children, className,
}: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const tones: Record<Tone, string> = {
    up:    'bg-up/10 text-up',
    down:  'bg-down/10 text-down',
    warn:  'bg-warn/10 text-warn',
    info:  'bg-info/10 text-info',
    brand: 'bg-brand/10 text-brand',
    muted: 'bg-elevated text-muted',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}

/* ---------------------------------- Table ---------------------------------- */
export type Col<R> = {
  key: string
  header: React.ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
  cell: (row: R, i: number) => React.ReactNode
  hideBelow?: 'sm' | 'md' | 'lg'
}

export function Table<R>({
  cols, rows, empty = '暂无数据', onRowClick, dense, className,
}: {
  cols: Col<R>[]; rows: R[]; empty?: React.ReactNode
  onRowClick?: (r: R) => void; dense?: boolean; className?: string
}) {
  const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' }
  return (
    <div className={cn('w-full overflow-x-auto scroll-thin', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-2xs text-muted">
            {cols.map(c => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={cn(
                  'font-medium px-3 py-2 border-b border-line whitespace-nowrap',
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                  c.hideBelow && hide[c.hideBelow],
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="text-center text-faint text-xs py-12">{empty}</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(r)}
              className={cn(
                'border-b border-line/60 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-elevated',
              )}
            >
              {cols.map(c => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 whitespace-nowrap', dense ? 'py-1.5' : 'py-2.5',
                    c.align === 'right' ? 'text-right tnum' : c.align === 'center' ? 'text-center' : 'text-left',
                    c.hideBelow && hide[c.hideBelow],
                  )}
                >
                  {c.cell(r, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------------------------- Modal ---------------------------------- */
export function Modal({
  open, onClose, title, children, footer, width = 'max-w-md',
}: {
  open: boolean; onClose: () => void; title?: React.ReactNode
  children: React.ReactNode; footer?: React.ReactNode; width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full bg-surface border border-line shadow-2xl animate-fade-in',
        'rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col', width,
      )}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div className="font-semibold">{title}</div>
            <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-5 py-4 overflow-y-auto scroll-thin flex-1">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line">{footer}</div>}
      </div>
    </div>
  )
}

/* --------------------------------- Toggle ---------------------------------- */
export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors shrink-0',
          checked ? 'bg-brand' : 'bg-line',
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow',
          checked ? 'left-[1.125rem]' : 'left-0.5',
        )} />
      </button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}

/* --------------------------------- Slider ---------------------------------- */
/** Percentage slider with notches — the amount picker on every exchange order form. */
export function PercentSlider({
  value, onChange, notches = [0, 25, 50, 75, 100], tone = 'brand',
}: { value: number; onChange: (v: number) => void; notches?: number[]; tone?: 'brand' | 'up' | 'down' }) {
  const bar = { brand: 'bg-brand', up: 'bg-up', down: 'bg-down' }[tone]
  return (
    <div className="pt-1 pb-4 relative">
      <div className="relative h-1 bg-line rounded-full">
        <div className={cn('absolute inset-y-0 left-0 rounded-full transition-all', bar)} style={{ width: `${value}%` }} />
        {notches.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="absolute -top-1 -translate-x-1/2 w-3 h-3 flex items-center justify-center group"
            style={{ left: `${n}%` }}
          >
            <span className={cn(
              'w-1.5 h-1.5 rotate-45 border transition-colors',
              value >= n ? cn(bar, 'border-transparent') : 'bg-surface border-line group-hover:border-faint',
            )} />
          </button>
        ))}
        <input
          type="range" min={0} max={100} value={value}
          onChange={e => onChange(+e.target.value)}
          className="absolute -inset-y-2 inset-x-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between mt-2.5 text-2xs text-faint tnum">
        {notches.map(n => <span key={n}>{n}%</span>)}
      </div>
    </div>
  )
}

/* -------------------------------- Stat tile -------------------------------- */
export function Stat({
  label, value, delta, hint, icon,
}: {
  label: React.ReactNode; value: React.ReactNode
  delta?: number; hint?: React.ReactNode; icon?: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-muted">{label}</div>
        {icon && <div className="text-faint">{icon}</div>}
      </div>
      <div className="text-xl font-semibold tnum mt-2">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {delta != null && (
          <span className={cn('text-xs tnum font-medium', delta >= 0 ? 'text-up' : 'text-down')}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
          </span>
        )}
        {hint && <span className="text-2xs text-faint">{hint}</span>}
      </div>
    </Card>
  )
}

/* ------------------------------- Page header ------------------------------- */
export function PageHeader({
  title, sub, actions,
}: { title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
        {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------ Empty / Spec ------------------------------- */
/** Marks a screen that is enumerated in the FSD but rendered as a template in the prototype. */
export function SpecStub({ title, points }: { title: string; points: string[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Badge tone="brand">原型模板</Badge>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <ul className="space-y-1.5">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2 text-xs text-muted">
            <Check className="w-3.5 h-3.5 text-up shrink-0 mt-px" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ------------------------------ Copy to clip ------------------------------- */
export function CopyField({ value, className }: { value: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1400) }}
      className={cn(
        'flex items-center justify-between gap-2 w-full h-10 px-3 rounded-lg',
        'bg-elevated border border-line hover:border-brand transition-colors text-left', className,
      )}
    >
      <span className="text-xs font-mono truncate">{value}</span>
      <span className={cn('text-2xs shrink-0', done ? 'text-up' : 'text-muted')}>
        {done ? '已复制' : '复制'}
      </span>
    </button>
  )
}
