import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  History, TrendingUp, Wallet, ChevronRight,
} from 'lucide-react'
import {
  Card, CardHeader, Button, Badge, Tabs, Table, Toggle, PageHeader, SearchBox,
  type Col,
} from '@/components/ui'
import { BALANCES, balancesFor, totalUsd, type Balance } from '@/mock/account'
import { bySymbol } from '@/mock/market'
import { cn, num, usd, priceDp } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * F-45 资金列表 — 可用 / 冻结, 代币与法币
 * ------------------------------------------------------------------ */

type Acct = 'spot' | 'futures' | 'fiat'

const ACCT_LABEL: Record<Acct, string> = { spot: '币币账户', futures: '合约账户', fiat: '法币账户' }

/** Coin chip — letter avatar, semantic tone only. */
const TONE: Record<string, string> = {
  BTC: 'bg-warn/10 text-warn', ETH: 'bg-info/10 text-info', USDT: 'bg-up/10 text-up',
  SOL: 'bg-brand/10 text-brand', BNB: 'bg-brand/10 text-brand', DOGE: 'bg-warn/10 text-warn',
  XRP: 'bg-info/10 text-info', ADA: 'bg-info/10 text-info', AVAX: 'bg-down/10 text-down',
  LINK: 'bg-info/10 text-info', USD: 'bg-up/10 text-up', HKD: 'bg-info/10 text-info',
}
export function CoinIcon({ coin, size = 'md' }: { coin: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cn(
      'inline-grid place-items-center rounded-full font-semibold shrink-0',
      size === 'sm' ? 'w-6 h-6 text-2xs' : 'w-8 h-8 text-xs',
      TONE[coin] ?? 'bg-elevated text-muted',
    )}>
      {coin.slice(0, 1)}
    </span>
  )
}

/* Zero-balance rows so 「隐藏小额资产」 behaves like the real thing. */
const ZEROS: Balance[] = [
  { coin: 'XRP',  name: 'XRP',      free: 0, frozen: 0, usdPrice: 2.4183, account: 'spot' },
  { coin: 'ADA',  name: 'Cardano',  free: 0, frozen: 0, usdPrice: 1.0234, account: 'spot' },
  { coin: 'AVAX', name: 'Avalanche',free: 0, frozen: 0, usdPrice: 42.318, account: 'spot' },
  { coin: 'LINK', name: 'Chainlink',free: 0, frozen: 0, usdPrice: 24.882, account: 'spot' },
  { coin: 'ETH',  name: 'Ethereum', free: 0, frozen: 0, usdPrice: 3_412.88, account: 'futures' },
  { coin: 'SOL',  name: 'Solana',   free: 0, frozen: 0, usdPrice: 218.42, account: 'futures' },
]

const SEG = ['rgb(var(--brand))', 'rgb(var(--info))', 'rgb(var(--up))', 'rgb(var(--warn))', 'rgb(var(--down))', 'rgb(var(--faint))']

function Donut({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  const R = 54, C = 2 * Math.PI * R
  let acc = 0
  return (
    <svg viewBox="0 0 132 132" className="w-[132px] h-[132px] -rotate-90 shrink-0">
      <circle cx="66" cy="66" r={R} fill="none" stroke="rgb(var(--line))" strokeWidth="13" />
      {parts.map((p, i) => {
        const len = (p.value / total) * C
        const node = (
          <circle
            key={p.label} cx="66" cy="66" r={R} fill="none"
            stroke={SEG[i % SEG.length]} strokeWidth="13"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc}
          />
        )
        acc += len
        return node
      })}
    </svg>
  )
}

export default function Assets() {
  const [hide, setHide] = useState(false)
  const [acct, setAcct] = useState<Acct>('spot')
  const [small, setSmall] = useState(true)
  const [q, setQ] = useState('')

  const btc = bySymbol('BTC/USDT').price
  const equity = totalUsd()
  const pnl = equity * 0.0131          // 今日盈亏 — deterministic mock
  const pnlPct = 1.31

  const rows = useMemo(() => {
    const base = [...balancesFor(acct), ...ZEROS.filter(z => z.account === acct)]
    return base
      .filter(b => !small || (b.free + b.frozen) * b.usdPrice >= 1)
      .filter(b => !q || `${b.coin} ${b.name}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.free + b.frozen) * b.usdPrice - (a.free + a.frozen) * a.usdPrice)
  }, [acct, small, q])

  const alloc = useMemo(() => {
    const all = BALANCES
      .map(b => ({ label: b.coin, value: (b.free + b.frozen) * b.usdPrice }))
      .reduce<{ label: string; value: number }[]>((acc2, cur) => {
        const hit = acc2.find(x => x.label === cur.label)
        if (hit) hit.value += cur.value; else acc2.push({ ...cur })
        return acc2
      }, [])
      .sort((a, b) => b.value - a.value)
    const top = all.slice(0, 5)
    const rest = all.slice(5).reduce((s, x) => s + x.value, 0)
    return rest > 0 ? [...top, { label: '其他', value: rest }] : top
  }, [])
  const allocTotal = alloc.reduce((s, p) => s + p.value, 0) || 1

  /** Mask every number behind the eye toggle. */
  const m = (s: string) => (hide ? '******' : s)

  const cols: Col<Balance>[] = [
    {
      key: 'coin', header: '币种', width: '26%',
      cell: b => (
        <div className="flex items-center gap-2.5">
          <CoinIcon coin={b.coin} />
          <div className="min-w-0">
            <div className="text-sm font-medium leading-tight">{b.coin}</div>
            <div className="text-2xs text-faint truncate">{b.name}</div>
          </div>
        </div>
      ),
    },
    { key: 'free', header: '可用', align: 'right', cell: b => <span className="tnum">{m(num(b.free, b.usdPrice > 100 ? 6 : 2))}</span> },
    {
      key: 'frozen', header: '冻结', align: 'right',
      cell: b => (
        <span className={cn('tnum', b.frozen > 0 ? 'text-warn' : 'text-faint')}>
          {m(num(b.frozen, b.usdPrice > 100 ? 6 : 2))}
        </span>
      ),
    },
    {
      key: 'usd', header: '折合 USD', align: 'right',
      cell: b => <span className="tnum font-medium">{m(usd((b.free + b.frozen) * b.usdPrice))}</span>,
    },
    {
      key: 'px', header: '最新价', align: 'right', hideBelow: 'lg',
      cell: b => <span className="tnum text-muted">{usd(b.usdPrice, priceDp(b.usdPrice))}</span>,
    },
    {
      key: 'act', header: '操作', align: 'right', width: '22%',
      cell: b => (
        <div className="flex items-center justify-end gap-2.5 text-2xs">
          <Link to="/assets/deposit" className="text-brand hover:underline">充值</Link>
          <Link to="/assets/withdraw" className="text-muted hover:text-ink">提现</Link>
          <Link to="/assets/transfer" className="text-muted hover:text-ink">划转</Link>
          {acct !== 'fiat' && b.coin !== 'USDT' && (
            <Link to={`/trade/spot/${b.coin}-USDT`} className="text-muted hover:text-ink">交易</Link>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="资产总览"
        sub="F-45 · 币币 / 合约 / 法币账户的可用与冻结余额"
        actions={
          <>
            <Link to="/assets/history"><Button variant="outline" size="sm"><History className="w-3.5 h-3.5" />资金流水</Button></Link>
            <Link to="/orders"><Button variant="outline" size="sm">订单管理</Button></Link>
          </>
        }
      />

      {/* ------------------------------- Equity ------------------------------- */}
      <Card className="mb-4 overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Wallet className="w-3.5 h-3.5" />
              总资产估值
              <button
                onClick={() => setHide(h => !h)}
                className="text-faint hover:text-ink transition-colors"
                title={hide ? '显示余额' : '隐藏余额'}
              >
                {hide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-x-3 gap-y-1 mt-2">
              <span className="text-3xl sm:text-4xl font-semibold tnum tracking-tight">
                {hide ? '******' : usd(equity)}
              </span>
              <span className="text-sm text-muted tnum pb-1">
                ≈ {hide ? '****' : num(equity / btc, 6)} BTC
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted">今日盈亏</span>
                <span className="text-sm font-medium tnum text-up">
                  {hide ? '****' : `+${usd(pnl)}`}
                </span>
                <Badge tone="up"><TrendingUp className="w-2.5 h-2.5" />+{pnlPct.toFixed(2)}%</Badge>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-2xs text-faint tnum">
                {(['spot', 'futures', 'fiat'] as Acct[]).map(a => (
                  <span key={a}>
                    {ACCT_LABEL[a]} <b className="text-muted font-medium">{hide ? '****' : usd(totalUsd(a))}</b>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              <Link to="/assets/deposit"><Button size="md"><ArrowDownToLine className="w-4 h-4" />充值</Button></Link>
              <Link to="/assets/withdraw"><Button size="md" variant="subtle"><ArrowUpFromLine className="w-4 h-4" />提现</Button></Link>
              <Link to="/assets/transfer"><Button size="md" variant="subtle"><ArrowLeftRight className="w-4 h-4" />划转</Button></Link>
              <Link to="/trade/spot/BTC-USDT"><Button size="md" variant="outline">去交易<ChevronRight className="w-4 h-4" /></Button></Link>
            </div>
          </div>

          {/* Allocation donut */}
          <div className="flex items-center gap-5 lg:border-l lg:border-line lg:pl-6">
            <div className="relative">
              <Donut parts={alloc} />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xs text-faint">持仓分布</div>
                  <div className="text-sm font-semibold tnum">{alloc.length} 币种</div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 min-w-[7.5rem]">
              {alloc.map((p, i) => (
                <div key={p.label} className="flex items-center gap-2 text-2xs">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: SEG[i % SEG.length] }} />
                  <span className="text-muted w-10">{p.label}</span>
                  <span className="tnum text-ink font-medium ml-auto">
                    {((p.value / allocTotal) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------- Balances ----------------------------- */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-line">
          <Tabs
            value={acct} onChange={setAcct}
            tabs={[
              { id: 'spot', label: '币币账户' },
              { id: 'futures', label: '合约账户' },
              { id: 'fiat', label: '法币账户' },
            ]}
          />
          <div className="flex-1" />
          <Toggle checked={small} onChange={setSmall} label={<span className="text-xs text-muted">隐藏小额资产</span>} />
          <SearchBox value={q} onChange={e => setQ(e.target.value)} placeholder="搜索币种" className="w-full sm:w-44" />
        </div>

        {/* desktop */}
        <div className="hidden sm:block">
          <Table cols={cols} rows={rows} empty="该账户暂无资产" />
        </div>

        {/* mobile */}
        <div className="sm:hidden divide-y divide-line/60">
          {rows.map(b => (
            <div key={b.coin + b.account} className="p-4">
              <div className="flex items-center gap-2.5">
                <CoinIcon coin={b.coin} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{b.coin}</div>
                  <div className="text-2xs text-faint truncate">{b.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tnum">{m(usd((b.free + b.frozen) * b.usdPrice))}</div>
                  <div className="text-2xs text-faint tnum">{m(num(b.free + b.frozen, 4))} {b.coin}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-2xs">
                <div className="bg-elevated rounded-lg px-2.5 py-1.5">
                  <div className="text-faint">可用</div>
                  <div className="tnum mt-0.5">{m(num(b.free, 4))}</div>
                </div>
                <div className="bg-elevated rounded-lg px-2.5 py-1.5">
                  <div className="text-faint">冻结</div>
                  <div className={cn('tnum mt-0.5', b.frozen > 0 && 'text-warn')}>{m(num(b.frozen, 4))}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-2xs">
                <Link to="/assets/deposit" className="text-brand">充值</Link>
                <Link to="/assets/withdraw" className="text-muted">提现</Link>
                <Link to="/assets/transfer" className="text-muted">划转</Link>
                {acct !== 'fiat' && b.coin !== 'USDT' && (
                  <Link to={`/trade/spot/${b.coin}-USDT`} className="text-muted">交易</Link>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="py-12 text-center text-xs text-faint">该账户暂无资产</div>}
        </div>
      </Card>

      <p className="text-2xs text-faint mt-4 leading-relaxed">
        资产估值按各币种最新成交价折算为 USD，仅供参考，不构成任何投资建议。冻结金额包含挂单占用、提现审核中及合约保证金占用部分。
      </p>
    </div>
  )
}
