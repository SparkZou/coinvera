import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, LayoutTemplate, ExternalLink, FileSpreadsheet } from 'lucide-react'
import { FRONT, ADMIN, TOTALS, type FnStatus } from '@/mock/funcList'
import { Card, CardHeader, Badge, Tabs, SearchBox, PageHeader, Stat } from '@/components/ui'
import { cn } from '@/lib/utils'
import { t } from '@/lib/i18n'

/* ------------------------------------------------------------------ *
 * 功能覆盖清单 — the page the client reviews.
 *
 * Every one of the 126 items in Annex 1《功能列表》is listed here,
 * linked to the screen that implements it, and flagged where the
 * contract and the function list contradict each other.
 *
 * funcList is module-scope data, so its Chinese fields are translated
 * here at render time via t() (keys live in the funclist locale files).
 * ------------------------------------------------------------------ */

const STATUS: Record<FnStatus, { label: string; tone: any; icon: any }> = {
  done: { label: '已实现', tone: 'up', icon: Check },
  tpl:  { label: '模板覆盖', tone: 'muted', icon: LayoutTemplate },
  q:    { label: '待澄清', tone: 'warn', icon: AlertTriangle },
}

type Row = {
  id: string; side: 'front' | 'admin'; sect: string; cls: string; name: string
  desc: string; route: string; status: FnStatus; note?: string
}

const ROWS: Row[] = [
  ...FRONT.map(f => ({ ...f, side: 'front' as const, sect: f.module, cls: f.module })),
  ...ADMIN.map(a => ({ ...a, side: 'admin' as const, sect: a.group, desc: '' })),
]

/** Translated description for a row. */
const descOf = (r: Row) => (r.side === 'front' ? t(r.desc) : `${t(r.cls)} → ${t(r.name)}`)
/** Translated section heading, e.g. "Front office · Basic Features". */
const headOf = (r: Row) => `${t(r.side === 'front' ? '前台 ·' : '后台 ·')} ${t(r.sect)}`

export default function Coverage() {
  const [side, setSide] = useState<'all' | 'front' | 'admin'>('all')
  const [st, setSt] = useState<'all' | FnStatus>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    return ROWS.filter(r => {
      if (side === 'front' && r.side !== 'front') return false
      if (side === 'admin' && r.side !== 'admin') return false
      if (st !== 'all' && r.status !== st) return false
      if (q) {
        const hay = `${r.id} ${headOf(r)} ${t(r.name)} ${descOf(r)}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [side, st, q])

  const grouped = useMemo(() => {
    const m: { head: string; items: Row[] }[] = []
    for (const r of rows) {
      const head = headOf(r)
      let g = m.find(x => x.head === head)
      if (!g) { g = { head, items: [] }; m.push(g) }
      g.items.push(r)
    }
    return m
  }, [rows])

  const done = ROWS.filter(r => r.status === 'done').length
  const tpl = ROWS.filter(r => r.status === 'tpl').length

  return (
    <div>
      <PageHeader
        title="功能覆盖清单"
        sub={<>逐条对应贵司《功能列表》(Annex 1) 的全部 <b className="text-ink">{TOTALS.all}</b> 项功能点 — 点击任意一行可直接跳转至对应页面</>}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>功能列表 (1).xlsx</span>
          </div>
        }
      />

      {/* Scoreboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="功能点总数" value={TOTALS.all} hint={`${t('前台')} ${TOTALS.front} · ${t('后台')} ${TOTALS.admin}`} />
        <Stat label="原型已实现" value={done} hint="可直接点击体验" icon={<Check className="w-4 h-4 text-up" />} />
        <Stat label="模板覆盖" value={tpl} hint="后台同构页面" icon={<LayoutTemplate className="w-4 h-4" />} />
        <Stat label="待澄清事项" value={TOTALS.questions} hint="合同与功能表冲突" icon={<AlertTriangle className="w-4 h-4 text-warn" />} />
      </div>

      {/* The conflicts — the single most important block on this page. */}
      <Card className="mb-5 border-warn/40">
        <CardHeader
          title={<span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warn" />签约前须书面澄清的 {TOTALS.questions} 项</span>}
          sub="下列条目在《合同》正文与《功能列表》之间存在直接冲突，或超出合同 Article I 的产品定义"
        />
        <div className="divide-y divide-line">
          {ROWS.filter(r => r.status === 'q').map(r => (
            <div key={r.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex items-center gap-2 sm:w-56 shrink-0">
                <span className="text-2xs font-mono text-faint">{r.id}</span>
                <span className="text-xs font-medium">{t(r.name)}</span>
              </div>
              <p className="text-xs text-muted flex-1 leading-relaxed">{t(r.note ?? '')}</p>
              {r.route && (
                <Link to={r.route} className="text-2xs text-brand hover:underline shrink-0 flex items-center gap-1">
                  查看页面 <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Tabs
          value={side} onChange={setSide}
          tabs={[
            { id: 'all', label: '全部', count: ROWS.length },
            { id: 'front', label: '前台功能点', count: TOTALS.front },
            { id: 'admin', label: '后台页面', count: TOTALS.admin },
          ]}
        />
        <div className="w-px h-5 bg-line mx-1 hidden sm:block" />
        <Tabs
          size="sm" value={st} onChange={setSt}
          tabs={[
            { id: 'all', label: '所有状态' },
            { id: 'done', label: '已实现' },
            { id: 'tpl', label: '模板覆盖' },
            { id: 'q', label: '待澄清' },
          ]}
        />
        <div className="flex-1" />
        <SearchBox
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="搜索功能点…" className="w-full sm:w-56"
        />
      </div>

      {/* The list */}
      <div className="space-y-4">
        {grouped.map(g => (
          <Card key={g.head}>
            <CardHeader
              title={g.head}
              right={<span className="text-2xs text-faint tnum">{g.items.length} {t('项')}</span>}
            />
            <div className="divide-y divide-line/60">
              {g.items.map(r => {
                const S = STATUS[r.status]
                const body = (
                  <div className={cn(
                    'flex items-start gap-3 px-4 py-2.5 transition-colors',
                    r.route && 'hover:bg-elevated cursor-pointer',
                  )}>
                    <span className="text-2xs font-mono text-faint w-9 shrink-0 pt-0.5">{r.id}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{t(r.name)}</span>
                        <Badge tone={S.tone}><S.icon className="w-2.5 h-2.5" />{t(S.label)}</Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{descOf(r)}</p>
                      {r.note && (
                        <p className="text-2xs text-warn mt-1 leading-relaxed">{t(r.note)}</p>
                      )}
                    </div>
                    {r.route && <ExternalLink className="w-3.5 h-3.5 text-faint shrink-0 mt-1" />}
                  </div>
                )
                return r.route
                  ? <Link key={r.id} to={r.route} className="block">{body}</Link>
                  : <div key={r.id}>{body}</div>
              })}
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="py-16 text-center text-sm text-faint">没有匹配的功能点</Card>
        )}
      </div>

      <p className="text-2xs text-faint mt-6 leading-relaxed">
        本清单由《功能列表 (1).xlsx》逐条转录而成，共 {TOTALS.all} 项（前台 {TOTALS.front} 项功能点 + 后台 {TOTALS.admin} 个页面）。
        「模板覆盖」指后台高度同构的列表/表单页，在原型中以统一模板呈现，但其路由、字段、权限与数据源已在《功能规格说明书》中逐页枚举。
        经贵司签字确认后，本清单将取代《功能列表》成为唯一的开发与验收依据。
      </p>
    </div>
  )
}
