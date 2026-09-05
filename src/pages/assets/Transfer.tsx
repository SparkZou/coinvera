import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, CheckCircle2, Info, Wallet, ArrowRight } from 'lucide-react'
import {
  Card, CardHeader, Button, Badge, Input, Table, Modal, PageHeader, type Col,
} from '@/components/ui'
import { BALANCES, LEDGER, totalUsd, type LedgerRow } from '@/mock/account'
import { cn, num, usd, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * F-48 资产划转 — 币币 / 合约 / 法币 三账户互转
 * ------------------------------------------------------------------ */

type Acct = 'spot' | 'futures' | 'fiat'
const ACCTS: { id: Acct; label: string; desc: string }[] = [
  { id: 'spot', label: '币币账户', desc: '现货交易' },
  { id: 'futures', label: '合约账户', desc: '永续合约保证金' },
  { id: 'fiat', label: '法币账户', desc: '法币出入金' },
]
const LABEL: Record<Acct, string> = { spot: '币币账户', futures: '合约账户', fiat: '法币账户' }

const TONE: Record<string, string> = {
  BTC: 'bg-warn/10 text-warn', ETH: 'bg-info/10 text-info', USDT: 'bg-up/10 text-up',
  SOL: 'bg-brand/10 text-brand', BNB: 'bg-brand/10 text-brand', DOGE: 'bg-warn/10 text-warn',
  USD: 'bg-up/10 text-up', HKD: 'bg-info/10 text-info',
}
const CoinIcon = ({ coin }: { coin: string }) => (
  <span className={cn('inline-grid place-items-center w-6 h-6 rounded-full text-2xs font-semibold shrink-0',
    TONE[coin] ?? 'bg-elevated text-muted')}>{coin.slice(0, 1)}</span>
)

/** Account picker — a real select would hide the balance; show it. */
function AcctPicker({
  label, value, onChange, exclude,
}: { label: string; value: Acct; onChange: (a: Acct) => void; exclude?: Acct }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1.5">{label}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {ACCTS.map(a => {
          const off = a.id === exclude
          return (
            <button
              key={a.id}
              disabled={off}
              onClick={() => onChange(a.id)}
              className={cn(
                'px-2 py-2 rounded-lg border text-left transition-colors',
                off && 'opacity-35 cursor-not-allowed',
                value === a.id ? 'border-brand bg-brand/5' : 'border-line bg-elevated hover:border-faint',
              )}
            >
              <div className="text-xs font-medium truncate">{a.label}</div>
              <div className="text-2xs text-faint tnum mt-0.5">{usd(totalUsd(a.id), 0)}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Transfer() {
  const [from, setFrom] = useState<Acct>('spot')
  const [to, setTo] = useState<Acct>('futures')
  const [coin, setCoin] = useState('USDT')
  const [amt, setAmt] = useState('')
  const [done, setDone] = useState(false)

  const coins = useMemo(
    () => Array.from(new Set(BALANCES.filter(b => b.account === from).map(b => b.coin))),
    [from],
  )
  const active = coins.includes(coin) ? coin : coins[0]
  const bal = BALANCES.find(b => b.account === from && b.coin === active)
  const free = bal?.free ?? 0
  const px = bal?.usdPrice ?? 1
  const dp = px > 100 ? 6 : 2

  const a = +amt || 0
  const ok = a > 0 && a <= free

  const swap = () => { setFrom(to); setTo(from); setAmt('') }

  const rows = useMemo(() => LEDGER.filter(l => l.type === '划转').slice(0, 8), [])

  const cols: Col<LedgerRow>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-xs text-muted tnum">{fmtDateTime(r.ts)}</span> },
    { key: 'coin', header: '币种', cell: r => <span className="flex items-center gap-1.5 text-sm"><CoinIcon coin={r.coin} />{r.coin}</span> },
    {
      key: 'path', header: '方向', hideBelow: 'sm',
      cell: (_r, i) => (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {i % 2 === 0 ? '币币账户' : '合约账户'}
          <ArrowRight className="w-3 h-3 text-faint" />
          {i % 2 === 0 ? '合约账户' : '币币账户'}
        </span>
      ),
    },
    {
      key: 'amt', header: '数量', align: 'right',
      cell: r => <span className="tnum">{num(Math.abs(r.amount), r.coin === 'USDT' ? 2 : 6)}</span>,
    },
    {
      key: 'st', header: '状态', align: 'right',
      cell: r => <Badge tone={r.status === '已完成' ? 'up' : r.status === '失败' ? 'down' : 'warn'}>{r.status}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="资产划转"
        sub="F-48 · 币币 / 合约 / 法币账户之间实时划转，0 手续费"
        actions={
          <>
            <Link to="/assets"><Button variant="ghost" size="sm">返回资产</Button></Link>
            <Link to="/assets/history"><Button variant="outline" size="sm">划转记录</Button></Link>
          </>
        }
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-4">
        {/* -------------------------------- Form -------------------------------- */}
        <Card>
          <CardHeader title="划转" sub="内部账本转账，实时到账，不上链" />
          <div className="p-4 space-y-4">
            <AcctPicker label="从" value={from} onChange={f => { setFrom(f); if (f === to) setTo(ACCTS.find(x => x.id !== f)!.id) }} />

            <div className="flex justify-center">
              <button
                onClick={swap}
                className="w-9 h-9 grid place-items-center rounded-full bg-elevated border border-line
                           hover:border-brand hover:text-brand transition-colors active:scale-95"
                title="交换方向"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>

            <AcctPicker label="到" value={to} onChange={setTo} exclude={from} />

            {/* coin */}
            <div>
              <div className="text-xs text-muted mb-1.5">划转币种</div>
              <div className="flex flex-wrap gap-1.5">
                {coins.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCoin(c); setAmt('') }}
                    className={cn(
                      'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-colors',
                      active === c ? 'border-brand bg-brand/5 font-medium' : 'border-line bg-elevated hover:border-faint',
                    )}
                  >
                    <CoinIcon coin={c} />{c}
                  </button>
                ))}
              </div>
            </div>

            {/* amount */}
            <div>
              <Input
                label="划转数量"
                placeholder="0.00"
                value={amt}
                onChange={e => setAmt(e.target.value.replace(/[^\d.]/g, ''))}
                inputMode="decimal"
                suffix={
                  <span className="flex items-center gap-2">
                    <span>{active}</span>
                    <button
                      onClick={() => setAmt(String(+free.toFixed(dp)))}
                      className="text-brand font-medium hover:underline"
                    >全部</button>
                  </span>
                }
              />
              <div className="flex items-center justify-between mt-1.5 text-2xs">
                <span className="text-faint">
                  可用余额 <b className="text-muted tnum">{num(free, dp)} {active}</b>
                  {a > free && <span className="text-down ml-2">超出可用余额</span>}
                </span>
                <span className="text-faint tnum">≈ {usd(a * px)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-elevated border border-line p-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-muted">
                <span className="text-ink font-medium">{LABEL[from]}</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand" />
                <span className="text-ink font-medium">{LABEL[to]}</span>
              </span>
              <span className="text-2xs text-faint">手续费 0.00 · 实时到账</span>
            </div>

            <Button size="lg" className="w-full" disabled={!ok} onClick={() => setDone(true)}>划转</Button>
          </div>
        </Card>

        {/* ------------------------------ Accounts ------------------------------ */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="账户余额" right={<Wallet className="w-3.5 h-3.5 text-faint" />} />
            <div className="divide-y divide-line/60">
              {ACCTS.map(ac => (
                <div key={ac.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium">{ac.label}</div>
                      <div className="text-2xs text-faint mt-0.5">{ac.desc}</div>
                    </div>
                    <div className="text-sm font-semibold tnum">{usd(totalUsd(ac.id))}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {BALANCES.filter(b => b.account === ac.id).map(b => (
                      <span key={b.coin} className="text-2xs px-1.5 py-0.5 rounded bg-elevated text-muted tnum">
                        {b.coin} {num(b.free, b.usdPrice > 100 ? 4 : 0)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex gap-2.5">
              <Info className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
              <div className="text-2xs text-muted leading-relaxed space-y-1.5">
                <p>· 划转为平台内部账本操作，<b className="text-ink">不产生链上交易、不收取手续费</b>。</p>
                <p>· 合约账户中被 <b className="text-ink">持仓保证金占用</b> 的部分不可划出。</p>
                <p>· 法币账户仅支持 USD / HKD，划出前需先完成兑换。</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* --------------------------- Recent transfers --------------------------- */}
      <Card className="mt-4">
        <CardHeader
          title="最近划转记录"
          sub="资金流水 → 类型 = 划转"
          right={<Link to="/assets/history" className="text-2xs text-brand hover:underline">查看全部</Link>}
        />
        <Table cols={cols} rows={rows} empty="暂无划转记录" />
      </Card>

      <Modal
        open={done} onClose={() => setDone(false)} title="划转成功"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDone(false)}>继续划转</Button>
            <Link to="/assets" className="flex-1"><Button className="w-full">返回资产</Button></Link>
          </div>
        }
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-up/10 grid place-items-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-up" />
          </div>
          <div className="text-lg font-semibold tnum mt-3">{num(a, dp)} {active}</div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted mt-1">
            {LABEL[from]} <ArrowRight className="w-3.5 h-3.5 text-brand" /> {LABEL[to]}
          </div>
          <p className="text-2xs text-faint mt-3">资金已实时到账，可在资金流水中查询。</p>
        </div>
      </Modal>
    </div>
  )
}
