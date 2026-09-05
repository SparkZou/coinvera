import React, { useMemo, useState } from 'react'
import { AlertTriangle, Download, Plus, ChevronLeft, ChevronRight, Check, Minus } from 'lucide-react'
import { Card, CardHeader, Button, Input, Select, SearchBox, Badge, Table, Toggle, Modal, Stat, type Col } from '@/components/ui'
import { BarChart, AreaChart } from '@/components/charts'
import { ADMIN } from '@/mock/funcList'
import { cn, num, compact } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * Admin kit — the primitives all 73 back-office pages compose from.
 * ------------------------------------------------------------------ */

/** Renders the contract-conflict note for a page, straight from funcList.ts. */
export function ConflictNote({ id }: { id: string }) {
  const item = ADMIN.find(a => a.id === id)
  if (!item?.note) return null
  return (
    <Card className="mb-4 border-warn/30 bg-warn/5">
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-warn mb-0.5">签约前须澄清 · {item.id}</div>
          <p className="text-xs text-muted leading-relaxed">{item.note}</p>
        </div>
      </div>
    </Card>
  )
}

/* --------------------------------- Toolbar --------------------------------- */
export type Filter =
  | { type: 'search'; key: string; placeholder?: string; width?: string }
  | { type: 'select'; key: string; label?: string; options: string[]; width?: string }
  | { type: 'date'; key: string; label?: string }

export function FilterBar({
  filters, state, onChange, actions,
}: {
  filters: Filter[]
  state: Record<string, string>
  onChange: (k: string, v: string) => void
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 mb-4">
      {filters.map(f => {
        if (f.type === 'search') {
          return (
            <SearchBox
              key={f.key}
              value={state[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder ?? '搜索…'}
              className={f.width ?? 'w-52'}
            />
          )
        }
        if (f.type === 'select') {
          return (
            <div key={f.key} className={f.width ?? 'w-36'}>
              <Select
                value={state[f.key] ?? ''}
                onChange={e => onChange(f.key, e.target.value)}
                options={[{ value: '', label: f.label ?? '全部' }, ...f.options.map(o => ({ value: o, label: o }))]}
                className="h-9"
              />
            </div>
          )
        }
        return (
          <div key={f.key} className="w-36">
            <input
              type="date"
              value={state[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand"
            />
          </div>
        )
      })}
      <div className="flex-1" />
      {actions}
    </div>
  )
}

/* ------------------------------- Pagination -------------------------------- */
function Pager({
  page, pages, total, onPage,
}: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <div className="px-4 py-2.5 text-2xs text-faint">共 {total} 条</div>
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-line">
      <span className="text-2xs text-faint tnum">共 {total} 条 · 第 {page}/{pages} 页</span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = Math.max(1, Math.min(pages - 4, page - 2)) + i
          if (p > pages) return null
          return (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={cn(
                'w-7 h-7 rounded-md text-xs tnum transition-colors',
                p === page ? 'bg-brand text-brand-ink font-semibold' : 'text-muted hover:bg-elevated hover:text-ink',
              )}
            >
              {p}
            </button>
          )
        })}
        <Button size="sm" variant="ghost" disabled={page === pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------- ListPage --------------------------------- */
/** The workhorse — covers ~40 of the 73 back-office pages. */
export function ListPage<R extends Record<string, any>>({
  fnId, title, sub, stats, filters = [], cols, rows,
  match, actions, perPage = 12, dense,
}: {
  fnId?: string
  title: string
  sub?: React.ReactNode
  stats?: { label: string; value: React.ReactNode; delta?: number; hint?: string }[]
  filters?: Filter[]
  cols: Col<R>[]
  rows: R[]
  /** Per-filter-key predicate. Return true to keep the row. */
  match?: (row: R, state: Record<string, string>) => boolean
  actions?: React.ReactNode
  perPage?: number
  dense?: boolean
}) {
  const [state, setState] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const active = Object.entries(state).filter(([, v]) => v !== '')
    if (!active.length) return rows
    return rows.filter(r => {
      if (match) return match(r, state)
      // Default: substring match across every value in the row.
      return active.every(([, v]) =>
        Object.values(r).some(cell => String(cell).toLowerCase().includes(v.toLowerCase())),
      )
    })
  }, [rows, state, match])

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const p = Math.min(page, pages)
  const slice = filtered.slice((p - 1) * perPage, p * perPage)

  const set = (k: string, v: string) => { setState(s => ({ ...s, [k]: v })); setPage(1) }

  return (
    <div>
      {fnId && <ConflictNote id={fnId} />}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {stats.map(s => <Stat key={s.label} {...s} />)}
        </div>
      )}

      {filters.length > 0 && (
        <FilterBar
          filters={filters} state={state} onChange={set}
          actions={actions ?? (
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出 CSV</Button>
          )}
        />
      )}

      <Card>
        <Table cols={cols} rows={slice} dense={dense} empty="没有匹配的记录" />
        <Pager page={p} pages={pages} total={filtered.length} onPage={setPage} />
      </Card>
    </div>
  )
}

/* ------------------------------- ConfigPage -------------------------------- */
export type Field =
  | { type: 'text' | 'number'; key: string; label: string; value: string | number; suffix?: string; hint?: string }
  | { type: 'select'; key: string; label: string; value: string; options: string[]; hint?: string }
  | { type: 'toggle'; key: string; label: string; value: boolean; hint?: string }
  | { type: 'textarea'; key: string; label: string; value: string; hint?: string }

export function ConfigPage({
  fnId, title, sub, sections,
}: {
  fnId?: string
  title: string
  sub?: React.ReactNode
  sections: { title: string; desc?: string; fields: Field[] }[]
}) {
  const [vals, setVals] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {}
    sections.forEach(s => s.fields.forEach(f => { v[f.key] = f.value }))
    return v
  })
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (k: string, v: any) => { setVals(o => ({ ...o, [k]: v })); setDirty(true); setSaved(false) }

  return (
    <div className="max-w-3xl">
      {fnId && <ConflictNote id={fnId} />}

      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-up">✓ 已保存</span>}
          <Button size="sm" disabled={!dirty} onClick={() => { setDirty(false); setSaved(true) }}>
            保存修改
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map(s => (
          <Card key={s.title}>
            <CardHeader title={s.title} sub={s.desc} />
            <div className="p-4 space-y-4">
              {s.fields.map(f => (
                <div key={f.key} className="grid sm:grid-cols-[200px_1fr] gap-2 sm:gap-4 sm:items-center">
                  <div>
                    <div className="text-xs font-medium">{f.label}</div>
                    {f.hint && <div className="text-2xs text-faint mt-0.5">{f.hint}</div>}
                  </div>
                  <div>
                    {f.type === 'toggle' ? (
                      <Toggle checked={!!vals[f.key]} onChange={v => set(f.key, v)} />
                    ) : f.type === 'select' ? (
                      <Select
                        value={vals[f.key]} onChange={e => set(f.key, e.target.value)}
                        options={f.options.map(o => ({ value: o, label: o }))}
                      />
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={vals[f.key]} onChange={e => set(f.key, e.target.value)} rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand resize-y"
                      />
                    ) : (
                      <Input
                        type={f.type} value={vals[f.key]}
                        onChange={e => set(f.key, f.type === 'number' ? e.target.value : e.target.value)}
                        suffix={f.suffix}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------- ReviewQueue -------------------------------- */
/** Approval workflow — KYC 审核, 提币审核, 工单. Split queue + detail. */
export function ReviewQueue<R extends { id: string }>({
  fnId, title, sub, items, pending,
  renderRow, renderDetail, onApprove, onReject,
  approveLabel = '通过', rejectLabel = '驳回',
}: {
  fnId?: string
  title: string
  sub?: React.ReactNode
  items: R[]
  pending: (r: R) => boolean
  renderRow: (r: R, selected: boolean) => React.ReactNode
  renderDetail: (r: R) => React.ReactNode
  onApprove?: (r: R) => void
  onReject?: (r: R, reason: string) => void
  approveLabel?: string
  rejectLabel?: string
}) {
  const [sel, setSel] = useState<string | null>(items[0]?.id ?? null)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState<Record<string, '通过' | '驳回'>>({})

  const list = tab === 'pending' ? items.filter(i => pending(i) && !done[i.id]) : items
  const current = items.find(i => i.id === sel) ?? list[0] ?? null

  return (
    <div>
      {fnId && <ConflictNote id={fnId} />}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
        <div className="flex gap-1">
          {(['pending', 'all'] as const).map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                tab === t ? 'bg-elevated text-ink font-semibold' : 'text-muted hover:text-ink',
              )}
            >
              {t === 'pending' ? '待处理' : '全部'}
              <span className={cn('ml-1.5 text-2xs tnum', tab === t ? 'text-brand' : 'text-faint')}>
                {t === 'pending' ? items.filter(i => pending(i) && !done[i.id]).length : items.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        {/* Queue */}
        <Card className="overflow-hidden max-h-[calc(100vh-13rem)] flex flex-col">
          <div className="overflow-y-auto scroll-thin divide-y divide-line/60">
            {list.length === 0 && (
              <div className="py-16 text-center text-xs text-faint">队列已清空 🎉</div>
            )}
            {list.map(r => (
              <button
                key={r.id}
                onClick={() => setSel(r.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors',
                  current?.id === r.id ? 'bg-elevated' : 'hover:bg-elevated/60',
                )}
              >
                {renderRow(r, current?.id === r.id)}
                {done[r.id] && (
                  <Badge tone={done[r.id] === '通过' ? 'up' : 'down'} className="mt-1">{done[r.id]}</Badge>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Detail */}
        <Card className="min-h-[400px] flex flex-col">
          {current ? (
            <>
              <div className="flex-1 p-4">{renderDetail(current)}</div>
              {pending(current) && !done[current.id] && (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-line">
                  <Button
                    variant="up"
                    onClick={() => { setDone(d => ({ ...d, [current.id]: '通过' })); onApprove?.(current) }}
                  >
                    <Check className="w-4 h-4" />{approveLabel}
                  </Button>
                  <Button variant="danger" onClick={() => setRejectOpen(true)}>{rejectLabel}</Button>
                  <div className="flex-1" />
                  <span className="text-2xs text-faint">操作将记入管理员操作日志</span>
                </div>
              )}
              {done[current.id] && (
                <div className="px-4 py-3 border-t border-line text-xs text-muted">
                  已{done[current.id]} · 操作人 admin · 已记入操作日志
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-xs text-faint">从左侧选择一条记录</div>
          )}
        </Card>
      </div>

      <Modal
        open={rejectOpen} onClose={() => setRejectOpen(false)} title={`${rejectLabel}原因`}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
            <Button
              variant="danger" disabled={!reason.trim()}
              onClick={() => {
                if (current) { setDone(d => ({ ...d, [current.id]: '驳回' })); onReject?.(current, reason) }
                setRejectOpen(false); setReason('')
              }}
            >
              确认{rejectLabel}
            </Button>
          </div>
        }
      >
        <textarea
          value={reason} onChange={e => setReason(e.target.value)} rows={4}
          placeholder="请填写驳回原因，将通过站内信通知用户"
          className="w-full px-3 py-2 rounded-lg bg-elevated border border-line text-sm outline-none focus:border-brand resize-y"
        />
      </Modal>
    </div>
  )
}

/* ------------------------------- ReportPage --------------------------------- */
export function ReportPage({
  fnId, title, sub,
  stats, chart, chartLabel, chartTone = 'brand', chartType = 'bar',
  cols, rows,
}: {
  fnId?: string
  title: string
  sub?: React.ReactNode
  stats: { label: string; value: React.ReactNode; delta?: number; hint?: string }[]
  chart: number[]
  chartLabel: string
  chartTone?: 'brand' | 'up' | 'info'
  chartType?: 'bar' | 'area'
  cols: Col<any>[]
  rows: any[]
}) {
  const [range, setRange] = useState('30天')
  const data = range === '7天' ? chart.slice(-7) : range === '14天' ? chart.slice(-14) : chart

  return (
    <div>
      {fnId && <ConflictNote id={fnId} />}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 p-0.5 bg-elevated rounded-lg">
            {['7天', '14天', '30天'].map(rg => (
              <button
                key={rg} onClick={() => setRange(rg)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs transition-colors',
                  range === rg ? 'bg-surface text-ink font-medium shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {rg}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" />导出</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map(s => <Stat key={s.label} {...s} />)}
      </div>

      <Card className="mb-4">
        <CardHeader title={chartLabel} sub={`近 ${range}`} />
        <div className="p-4">
          {chartType === 'bar'
            ? <BarChart data={data} tone={chartTone} height={200} />
            : <AreaChart data={data} tone={chartTone} height={200} className="w-full" />}
        </div>
      </Card>

      <Card>
        <CardHeader title="明细数据" right={<span className="text-2xs text-faint tnum">{rows.length} 条</span>} />
        <Table cols={cols} rows={rows} dense />
      </Card>
    </div>
  )
}

/* -------------------------------- TreePage ---------------------------------- */
export function PermissionTree({
  tree,
}: { tree: { key: string; label: string; children: { key: string; label: string; ops: string[] }[] }[] }) {
  const allKeys = tree.flatMap(m => m.children.flatMap(p => p.ops.map(o => `${p.key}.${o}`)))
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(allKeys.filter((_, i) => i % 3 !== 2)),
  )

  const toggle = (k: string) =>
    setChecked(s => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  const pageKeys = (p: { key: string; ops: string[] }) => p.ops.map(o => `${p.key}.${o}`)
  const modKeys = (m: { children: { key: string; ops: string[] }[] }) => m.children.flatMap(pageKeys)

  const stateOf = (keys: string[]): 'all' | 'none' | 'some' => {
    const n = keys.filter(k => checked.has(k)).length
    return n === 0 ? 'none' : n === keys.length ? 'all' : 'some'
  }
  const setMany = (keys: string[], on: boolean) =>
    setChecked(s => {
      const n = new Set(s)
      keys.forEach(k => (on ? n.add(k) : n.delete(k)))
      return n
    })

  const Box = ({ state, onClick }: { state: 'all' | 'none' | 'some'; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        'w-4 h-4 rounded border grid place-items-center shrink-0 transition-colors',
        state === 'all'  ? 'bg-brand border-brand' :
        state === 'some' ? 'bg-brand/20 border-brand' :
                           'border-line hover:border-faint',
      )}
    >
      {state === 'all'  && <Check className="w-3 h-3 text-brand-ink" />}
      {state === 'some' && <Minus className="w-2.5 h-2.5 text-brand" />}
    </button>
  )

  return (
    <div className="space-y-3">
      {tree.map(m => {
        const mk = modKeys(m)
        return (
          <Card key={m.key}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line">
              <Box state={stateOf(mk)} onClick={() => setMany(mk, stateOf(mk) !== 'all')} />
              <span className="text-sm font-semibold">{m.label}</span>
              <span className="text-2xs text-faint tnum ml-auto">
                {mk.filter(k => checked.has(k)).length}/{mk.length}
              </span>
            </div>
            <div className="divide-y divide-line/60">
              {m.children.map(p => {
                const pk = pageKeys(p)
                return (
                  <div key={p.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-40 shrink-0">
                      <Box state={stateOf(pk)} onClick={() => setMany(pk, stateOf(pk) !== 'all')} />
                      <span className="text-xs">{p.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {p.ops.map(op => {
                        const k = `${p.key}.${op}`
                        return (
                          <label key={k} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <Box state={checked.has(k) ? 'all' : 'none'} onClick={() => toggle(k)} />
                            <span className="text-xs text-muted">{op}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ----------------------------- Small helpers -------------------------------- */
export const StatusBadge = ({ s }: { s: string }) => {
  const tone =
    ['已完成', '正常', '上线', '交易中', '已通过', '启用', '运行中', '已发布', '平', '已解决', '已对冲'].includes(s) ? 'up' :
    ['待审核', '处理中', '维护', '灰度中', '部分对冲', '待处理', '暂停', '限制提现'].includes(s) ? 'warn' :
    ['失败', '已驳回', '冻结', '下线', '差异', '未对冲'].includes(s) ? 'down' :
    ['已停用', '停用', '草稿', '已关闭', '已下架', '仅撤单'].includes(s) ? 'muted' : 'info'
  return <Badge tone={tone as any}>{s}</Badge>
}

export const Sev = ({ s }: { s: string }) => {
  const tone = s === '严重' ? 'down' : s === '高' ? 'warn' : s === '中' ? 'info' : 'muted'
  return <Badge tone={tone as any}>{s}</Badge>
}

export const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('font-mono text-xs', className)}>{children}</span>
)

export const Money = ({ v, dp = 2, sign }: { v: number; dp?: number; sign?: boolean }) => (
  <span className={cn('tnum', sign && (v >= 0 ? 'text-up' : 'text-down'))}>
    {sign && v >= 0 ? '+' : ''}{num(v, dp)}
  </span>
)

/** Health dot for the dashboard. */
export const HealthDot = ({ status }: { status: 'ok' | 'warn' | 'down' }) => (
  <span className={cn(
    'w-2 h-2 rounded-full shrink-0',
    status === 'ok' ? 'bg-up' : status === 'warn' ? 'bg-warn' : 'bg-down',
  )} />
)

export { Card, CardHeader, Button, Input, Select, Badge, Table, Toggle, Modal, Stat, SearchBox }
export type { Col }
