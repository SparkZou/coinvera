import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2 } from 'lucide-react'
import {
  Card, Button, Badge, Select, SearchBox, Table, PageHeader, type Col,
} from '@/components/ui'
import { LEDGER, type LedgerRow } from '@/mock/account'
import { cn, num, shortAddr, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * F-49 资金流水 — 全量账本 + 筛选 + 分页 + 导出
 * ------------------------------------------------------------------ */

const TYPES: LedgerRow['type'][] = ['充值', '提现', '划转', '交易', '手续费', '返佣', '资金费用', '赠币']
const STATUSES: LedgerRow['status'][] = ['已完成', '处理中', '待审核', '失败']

const TYPE_TONE: Record<LedgerRow['type'], 'up' | 'down' | 'info' | 'brand' | 'warn' | 'muted'> = {
  充值: 'up', 提现: 'down', 划转: 'info', 交易: 'brand',
  手续费: 'muted', 返佣: 'up', 资金费用: 'warn', 赠币: 'brand',
}
const ST_TONE: Record<LedgerRow['status'], 'up' | 'down' | 'warn' | 'info'> = {
  已完成: 'up', 处理中: 'info', 待审核: 'warn', 失败: 'down',
}

const TONE: Record<string, string> = {
  BTC: 'bg-warn/10 text-warn', ETH: 'bg-info/10 text-info',
  USDT: 'bg-up/10 text-up', SOL: 'bg-brand/10 text-brand',
}
const CoinIcon = ({ coin }: { coin: string }) => (
  <span className={cn('inline-grid place-items-center w-6 h-6 rounded-full text-2xs font-semibold shrink-0',
    TONE[coin] ?? 'bg-elevated text-muted')}>{coin.slice(0, 1)}</span>
)

const PER = 15
const iso = (ts: number) => new Date(ts).toISOString().slice(0, 10)

export default function History() {
  const [type, setType] = useState('all')
  const [coin, setCoin] = useState('all')
  const [st, setSt] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState(false)

  const coins = useMemo(() => Array.from(new Set(LEDGER.map(l => l.coin))), [])

  const rows = useMemo(() => {
    return LEDGER
      .filter(l => type === 'all' || l.type === type)
      .filter(l => coin === 'all' || l.coin === coin)
      .filter(l => st === 'all' || l.status === st)
      .filter(l => !from || iso(l.ts) >= from)
      .filter(l => !to || iso(l.ts) <= to)
      .filter(l => !q || `${l.id} ${l.coin} ${l.type} ${l.txid ?? ''}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.ts - a.ts)
  }, [type, coin, st, from, to, q])

  const pages = Math.max(1, Math.ceil(rows.length / PER))
  const cur = Math.min(page, pages)
  const view = rows.slice((cur - 1) * PER, cur * PER)

  const reset = () => { setType('all'); setCoin('all'); setSt('all'); setFrom(''); setTo(''); setQ(''); setPage(1) }
  const exportCsv = () => { setToast(true); setTimeout(() => setToast(false), 2200) }

  const cols: Col<LedgerRow>[] = [
    { key: 'ts', header: '时间', width: '15%', cell: r => <span className="text-xs text-muted tnum">{fmtDateTime(r.ts)}</span> },
    { key: 'type', header: '类型', cell: r => <Badge tone={TYPE_TONE[r.type]}>{r.type}</Badge> },
    {
      key: 'coin', header: '币种',
      cell: r => <span className="flex items-center gap-1.5 text-sm font-medium"><CoinIcon coin={r.coin} />{r.coin}</span>,
    },
    {
      key: 'amt', header: '数量', align: 'right',
      cell: r => (
        <span className={cn('tnum font-medium', r.amount >= 0 ? 'text-up' : 'text-down')}>
          {r.amount >= 0 ? '+' : '−'}{num(Math.abs(r.amount), r.coin === 'USDT' ? 2 : 6)}
        </span>
      ),
    },
    {
      key: 'bal', header: '变动后余额', align: 'right', hideBelow: 'md',
      cell: r => <span className="tnum text-muted">{num(r.balance, 2)}</span>,
    },
    { key: 'st', header: '状态', align: 'center', cell: r => <Badge tone={ST_TONE[r.status]}>{r.status}</Badge> },
    {
      key: 'txid', header: 'TxID', align: 'right', hideBelow: 'lg',
      cell: r => r.txid
        ? (
          <button
            onClick={() => navigator.clipboard?.writeText(r.txid!)}
            className="text-2xs font-mono text-muted hover:text-brand transition-colors"
            title="点击复制"
          >
            {shortAddr(r.txid, 8, 6)}
          </button>
        )
        : <span className="text-faint text-2xs">—</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="资金流水"
        sub={<>F-49 · 共 <b className="text-ink tnum">{LEDGER.length}</b> 条账本记录，覆盖充值 / 提现 / 划转 / 交易 / 手续费 / 返佣 / 资金费用 / 赠币</>}
        actions={
          <>
            <Link to="/assets"><Button variant="ghost" size="sm">返回资产</Button></Link>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" />导出 CSV
            </Button>
          </>
        }
      />

      {/* -------------------------------- Filters ------------------------------- */}
      <Card className="p-3 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <Select
            label="类型" value={type} onChange={e => { setType(e.target.value); setPage(1) }}
            options={[{ value: 'all', label: '全部类型' }, ...TYPES.map(t => ({ value: t, label: t }))]}
          />
          <Select
            label="币种" value={coin} onChange={e => { setCoin(e.target.value); setPage(1) }}
            options={[{ value: 'all', label: '全部币种' }, ...coins.map(c => ({ value: c, label: c }))]}
          />
          <Select
            label="状态" value={st} onChange={e => { setSt(e.target.value); setPage(1) }}
            options={[{ value: 'all', label: '全部状态' }, ...STATUSES.map(s => ({ value: s, label: s }))]}
          />
          <label className="block">
            <div className="text-xs text-muted mb-1.5">开始日期</div>
            <input
              type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }}
              className="w-full h-10 px-3 rounded-lg bg-elevated border border-line text-sm tnum
                         outline-none focus:border-brand [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <label className="block">
            <div className="text-xs text-muted mb-1.5">结束日期</div>
            <input
              type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1) }}
              className="w-full h-10 px-3 rounded-lg bg-elevated border border-line text-sm tnum
                         outline-none focus:border-brand [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <div>
            <div className="text-xs text-muted mb-1.5">搜索</div>
            <div className="flex gap-1.5">
              <SearchBox
                value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
                placeholder="流水号 / TxID" className="flex-1 h-10"
              />
              <Button variant="subtle" size="md" onClick={reset} title="重置筛选" className="px-3 shrink-0">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* --------------------------------- Table -------------------------------- */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div className="text-xs text-muted">
            共 <b className="text-ink tnum">{rows.length}</b> 条
            {rows.length !== LEDGER.length && <span className="text-faint"> · 已筛选</span>}
          </div>
          <div className="flex items-center gap-3 text-2xs text-faint">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-up" />收入</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-down" />支出</span>
          </div>
        </div>

        {/* desktop */}
        <div className="hidden sm:block">
          <Table cols={cols} rows={view} empty="没有匹配的流水记录" />
        </div>

        {/* mobile */}
        <div className="sm:hidden divide-y divide-line/60">
          {view.map(r => (
            <div key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CoinIcon coin={r.coin} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={TYPE_TONE[r.type]}>{r.type}</Badge>
                      <span className="text-sm font-medium">{r.coin}</span>
                    </div>
                    <div className="text-2xs text-faint tnum mt-1">{fmtDateTime(r.ts)}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn('text-sm font-semibold tnum', r.amount >= 0 ? 'text-up' : 'text-down')}>
                    {r.amount >= 0 ? '+' : '−'}{num(Math.abs(r.amount), r.coin === 'USDT' ? 2 : 6)}
                  </div>
                  <div className="mt-1"><Badge tone={ST_TONE[r.status]}>{r.status}</Badge></div>
                </div>
              </div>
              {r.txid && (
                <button
                  onClick={() => navigator.clipboard?.writeText(r.txid!)}
                  className="mt-2.5 w-full text-left text-2xs font-mono text-faint truncate"
                >
                  TxID {shortAddr(r.txid, 12, 8)}
                </button>
              )}
            </div>
          ))}
          {view.length === 0 && <div className="py-12 text-center text-xs text-faint">没有匹配的流水记录</div>}
        </div>

        {/* pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <div className="text-2xs text-faint tnum">
              第 {(cur - 1) * PER + 1} – {Math.min(cur * PER, rows.length)} 条 / 共 {rows.length} 条
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={cur === 1} onClick={() => setPage(cur - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === pages || Math.abs(p - cur) <= 1)
                .map((p, i, arr) => (
                  <span key={p} className="flex items-center">
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-2xs text-faint">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs tnum transition-colors',
                        p === cur ? 'bg-brand text-brand-ink font-semibold' : 'text-muted hover:bg-elevated',
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <Button variant="ghost" size="sm" disabled={cur === pages} onClick={() => setPage(cur + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* toast */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-line shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-up" />
            <span className="text-xs">
              已导出 <b className="tnum">{rows.length}</b> 条流水 · ledger_{iso(Date.now())}.csv
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
