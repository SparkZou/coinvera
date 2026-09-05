import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ShieldAlert, Info, Landmark, Coins, ChevronRight, Clock,
} from 'lucide-react'
import {
  Card, CardHeader, Button, Badge, Input, Select, Table, TabsUnderline, Tabs,
  CopyField, PageHeader, type Col,
} from '@/components/ui'
import { CHAINS, LEDGER, type LedgerRow } from '@/mock/account'
import { cn, num, seeded, shortAddr, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * F-46 充值 (数字货币 + 法币)
 *
 * ⚠️ 合同 Article I 明确排除 "wallet services (cold wallet, hot wallet)"。
 *    数字货币充值依赖钱包服务（地址生成 + 链上监听），责任边界须书面澄清。
 * ------------------------------------------------------------------ */

const TONE: Record<string, string> = {
  BTC: 'bg-warn/10 text-warn', ETH: 'bg-info/10 text-info', USDT: 'bg-up/10 text-up',
  SOL: 'bg-brand/10 text-brand',
}
const CoinIcon = ({ coin }: { coin: string }) => (
  <span className={cn('inline-grid place-items-center w-6 h-6 rounded-full text-2xs font-semibold shrink-0',
    TONE[coin] ?? 'bg-elevated text-muted')}>{coin.slice(0, 1)}</span>
)

/* ------------------------- Deterministic fake QR ------------------------- */
function qrMatrix(seed: string, n = 29): boolean[][] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  const r = seeded(h >>> 0)
  const m: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => r() > 0.52))
  const finder = (r0: number, c0: number) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const yy = r0 + y, xx = c0 + x
      if (yy < 0 || xx < 0 || yy >= n || xx >= n) continue
      if (y === -1 || y === 7 || x === -1 || x === 7) { m[yy][xx] = false; continue }
      const edge = y === 0 || y === 6 || x === 0 || x === 6
      const core = y >= 2 && y <= 4 && x >= 2 && x <= 4
      m[yy][xx] = edge || core
    }
  }
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0)
  for (let i = 8; i < n - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0 }
  return m
}

export function FakeQr({ value, className }: { value: string; className?: string }) {
  const n = 29
  const m = useMemo(() => qrMatrix(value, n), [value])
  return (
    <div className={cn('p-2.5 rounded-xl bg-elevated border border-line text-ink', className)}>
      <svg viewBox={`0 0 ${n} ${n}`} className="w-full h-full block" shapeRendering="crispEdges">
        {m.map((row, y) => row.map((on, x) => on
          ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          : null))}
      </svg>
    </div>
  )
}

/* ------------------------------- Contract note ---------------------------- */
export function WalletScopeNote() {
  return (
    <Card className="border-warn/40">
      <div className="flex gap-3 p-4">
        <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="warn"><AlertTriangle className="w-2.5 h-2.5" />待澄清 · 合同范围冲突</Badge>
            <span className="text-xs font-semibold">钱包服务不在合同交付范围内</span>
          </div>
          <p className="text-xs text-muted leading-relaxed mt-1.5">
            合同 Article I 明确排除 <b className="text-ink">“wallet services (cold wallet, hot wallet)”</b>；
            而《功能列表》F-46 充值 / F-47 提现依赖钱包服务（充值地址生成、链上区块监听、热钱包签名出金、冷热钱包归集）。
            本页展示的是 <b className="text-ink">「对接第三方托管 / 钱包服务商」的界面层</b>，
            地址、确认数、手续费等数据均由甲方提供的钱包服务返回。签约前须书面确认责任边界与服务商归属。
          </p>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
type Tab = 'crypto' | 'fiat'

export default function Deposit() {
  const [tab, setTab] = useState<Tab>('crypto')
  const coins = Object.keys(CHAINS)
  const [coin, setCoin] = useState(coins[0])
  const [chainIdx, setChainIdx] = useState(0)
  const chains = CHAINS[coin]
  const net = chains[Math.min(chainIdx, chains.length - 1)]

  const [fiat, setFiat] = useState('USD')
  const [channel, setChannel] = useState('bank')
  const [famt, setFamt] = useState('')

  const deposits = useMemo(() => LEDGER.filter(l => l.type === '充值').slice(0, 8), [])

  const cols: Col<LedgerRow>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-xs text-muted tnum">{fmtDateTime(r.ts)}</span> },
    { key: 'coin', header: '币种', cell: r => <span className="flex items-center gap-1.5 text-sm"><CoinIcon coin={r.coin} />{r.coin}</span> },
    { key: 'amt', header: '数量', align: 'right', cell: r => <span className="tnum text-up">+{num(Math.abs(r.amount), r.coin === 'USDT' ? 2 : 6)}</span> },
    {
      key: 'txid', header: 'TxID', hideBelow: 'md',
      cell: r => r.txid
        ? <span className="text-2xs font-mono text-muted hover:text-brand cursor-pointer"
                onClick={() => navigator.clipboard?.writeText(r.txid!)}>{shortAddr(r.txid, 10, 8)}</span>
        : <span className="text-faint">—</span>,
    },
    {
      key: 'st', header: '状态', align: 'right',
      cell: r => (
        <Badge tone={r.status === '已完成' ? 'up' : r.status === '失败' ? 'down' : 'warn'}>{r.status}</Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="充值"
        sub="F-46 · 数字货币充值与法币充值"
        actions={
          <>
            <Link to="/assets"><Button variant="ghost" size="sm">返回资产</Button></Link>
            <Link to="/assets/history"><Button variant="outline" size="sm">充值记录</Button></Link>
          </>
        }
      />

      <div className="mb-4"><WalletScopeNote /></div>

      <TabsUnderline
        className="mb-5"
        value={tab} onChange={setTab}
        tabs={[
          { id: 'crypto', label: <span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" />数字货币充值</span> },
          { id: 'fiat', label: <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" />法币充值</span> },
        ]}
      />

      {tab === 'crypto' ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-4">
          {/* --------------------------- Left: selector -------------------------- */}
          <Card>
            <CardHeader title="选择币种与网络" sub="充值地址由钱包服务按 币种 + 链 组合生成" />
            <div className="p-4 space-y-5">
              {/* coin */}
              <div>
                <div className="text-xs text-muted mb-2">充值币种</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {coins.map(c => (
                    <button
                      key={c}
                      onClick={() => { setCoin(c); setChainIdx(0) }}
                      className={cn(
                        'flex items-center gap-2 h-11 px-3 rounded-lg border transition-colors text-left',
                        coin === c ? 'border-brand bg-brand/5' : 'border-line bg-elevated hover:border-faint',
                      )}
                    >
                      <CoinIcon coin={c} />
                      <span className="text-sm font-medium">{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* chain */}
              <div>
                <div className="text-xs text-muted mb-2">选择网络 / 主链</div>
                <div className="grid sm:grid-cols-3 gap-2">
                  {chains.map((ch, i) => (
                    <button
                      key={ch.chain}
                      onClick={() => setChainIdx(i)}
                      className={cn(
                        'px-3 py-2.5 rounded-lg border text-left transition-colors',
                        i === chainIdx ? 'border-brand bg-brand/5' : 'border-line bg-elevated hover:border-faint',
                      )}
                    >
                      <div className="text-sm font-medium">{ch.chain}</div>
                      <div className="text-2xs text-faint tnum mt-0.5">
                        {ch.confirms} 确认 · 手续费 {num(ch.fee, ch.fee < 1 ? 4 : 2)} {coin}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* address */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted">充值地址</span>
                  <Badge tone="info">{net.chain}</Badge>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-elevated/60 border border-line">
                  <FakeQr value={net.addr} className="w-36 h-36 mx-auto sm:mx-0 shrink-0 bg-surface" />
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
                    <div>
                      <div className="text-2xs text-faint mb-1.5">扫描二维码或复制地址</div>
                      <CopyField value={net.addr} className="bg-surface" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-2xs">
                      <div>
                        <div className="text-faint">最小充值额</div>
                        <div className="tnum font-medium mt-0.5">{num(net.minDeposit, net.minDeposit < 1 ? 4 : 2)} {coin}</div>
                      </div>
                      <div>
                        <div className="text-faint">到账确认数</div>
                        <div className="tnum font-medium mt-0.5">{net.confirms}</div>
                      </div>
                      <div>
                        <div className="text-faint">充值手续费</div>
                        <div className="tnum font-medium mt-0.5">{num(net.fee, net.fee < 1 ? 4 : 2)} {coin}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* warning */}
              <div className="flex gap-2.5 p-3 rounded-lg bg-warn/10 border border-warn/25">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <div className="text-2xs text-muted leading-relaxed space-y-1">
                  <p>
                    请勿向上述地址充值任何非 <b className="text-warn">{coin}</b> 资产，
                    或使用 <b className="text-warn">{net.chain}</b> 以外的网络转账，否则资产将 <b className="text-ink">不可找回</b>。
                  </p>
                  <p>
                    最小充值额为 {num(net.minDeposit, net.minDeposit < 1 ? 4 : 2)} {coin}，
                    小于该金额的充值将不会上账且无法退回。充值需 {net.confirms} 个网络确认后到账。
                  </p>
                  <p>请确认接收地址与所选网络完全一致后再发起转账。</p>
                </div>
              </div>
            </div>
          </Card>

          {/* --------------------------- Right: process -------------------------- */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="充值流程" />
              <div className="p-4 space-y-3">
                {[
                  ['选择币种与主网', '不同主网地址不通用'],
                  ['复制地址 / 扫码', '由钱包服务为该用户生成独立地址'],
                  ['从外部钱包转入', '请务必核对网络'],
                  [`等待 ${net.confirms} 个区块确认`, '链上监听服务回调后自动上账'],
                ].map(([t, s], i) => (
                  <div key={t} className="flex gap-3">
                    <span className={cn(
                      'w-5 h-5 grid place-items-center rounded-full text-2xs font-semibold shrink-0',
                      'bg-brand/10 text-brand',
                    )}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{t}</div>
                      <div className="text-2xs text-faint mt-0.5">{s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="到账时间" right={<Clock className="w-3.5 h-3.5 text-faint" />} />
              <div className="p-4 space-y-2 text-2xs">
                <div className="flex justify-between"><span className="text-muted">预计到账</span><span className="tnum">约 {Math.max(2, Math.round(net.confirms / 4))} – {net.confirms} 分钟</span></div>
                <div className="flex justify-between"><span className="text-muted">充值上限</span><span className="tnum">不限</span></div>
                <div className="flex justify-between"><span className="text-muted">今日已充值</span><span className="tnum">2 笔</span></div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex gap-2.5">
                <Info className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                <p className="text-2xs text-muted leading-relaxed">
                  充值未到账？请提供 <b className="text-ink">TxID</b> 联系客服，
                  系统将在链上确认后自动补单。
                </p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* ------------------------------ Fiat deposit ----------------------------- */
        <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-4">
          <Card>
            <CardHeader title="法币充值" sub="通过银行转账 / 第三方支付通道入金" />
            <div className="p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Select
                  label="充值币种" value={fiat} onChange={e => setFiat(e.target.value)}
                  options={[{ value: 'USD', label: 'USD · 美元' }, { value: 'HKD', label: 'HKD · 港币' }]}
                />
                <Input
                  label="充值金额" placeholder="0.00" value={famt}
                  onChange={e => setFamt(e.target.value)} suffix={fiat} inputMode="decimal"
                />
              </div>

              <div>
                <div className="text-xs text-muted mb-2">支付通道</div>
                <div className="grid sm:grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: '银行电汇', sub: '1–2 个工作日 · 免手续费' },
                    { id: 'card', label: '银行卡快捷', sub: '实时到账 · 1.8% 手续费' },
                    { id: 'otc', label: 'OTC 商家', sub: '5–30 分钟 · 0 手续费' },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setChannel(c.id)}
                      className={cn(
                        'px-3 py-2.5 rounded-lg border text-left transition-colors',
                        channel === c.id ? 'border-brand bg-brand/5' : 'border-line bg-elevated hover:border-faint',
                      )}
                    >
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-2xs text-faint mt-0.5">{c.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-elevated border border-line p-3 space-y-2 text-2xs">
                <div className="flex justify-between"><span className="text-muted">单笔限额</span><span className="tnum">100 – 200,000 {fiat}</span></div>
                <div className="flex justify-between"><span className="text-muted">手续费</span><span className="tnum">{channel === 'card' ? '1.80%' : '0.00'}</span></div>
                <div className="flex justify-between"><span className="text-muted">预计到账</span><span className="tnum">{channel === 'bank' ? '1–2 个工作日' : channel === 'card' ? '实时' : '5–30 分钟'}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted">实际到账</span>
                  <span className="tnum font-medium">
                    {num((+famt || 0) * (channel === 'card' ? 0.982 : 1), 2)} {fiat}
                  </span>
                </div>
              </div>

              <Button size="lg" className="w-full" disabled={!famt || +famt <= 0}>
                下一步 · 获取收款信息 <ChevronRight className="w-4 h-4" />
              </Button>

              <div className="flex gap-2.5 p-3 rounded-lg bg-warn/10 border border-warn/25">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <p className="text-2xs text-muted leading-relaxed">
                  <b className="text-warn">法币支付接口需由甲方提供。</b>
                  平台仅实现订单创建、状态回调、对账与入账逻辑；
                  收单机构（银行 / 第三方支付 / OTC 商家）的资质、签约、结算账户与合规义务由甲方负责，
                  相关接口文档与测试账号须在开发启动前提供。
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="法币入金须知" />
              <div className="p-4 space-y-2.5 text-2xs text-muted leading-relaxed">
                <p>· 汇款人姓名必须与 <b className="text-ink">实名认证姓名一致</b>，否则将原路退回。</p>
                <p>· 请勿在汇款附言中出现 “crypto / bitcoin / 虚拟货币” 等字样。</p>
                <p>· 法币账户余额可通过 <Link to="/assets/transfer" className="text-brand hover:underline">划转</Link> 转入币币账户购买数字资产。</p>
                <p>· 法币入金需完成 <Link to="/account/kyc" className="text-brand hover:underline">Lv2 实名认证</Link>。</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs font-medium mb-2">当前法币余额</div>
              <div className="space-y-2">
                {[['USD', 12_500], ['HKD', 84_200]].map(([c, v]) => (
                  <div key={c as string} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted"><CoinIcon coin={c as string} />{c}</span>
                    <span className="tnum font-medium">{num(v as number, 2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ----------------------------- Recent deposits --------------------------- */}
      <Card className="mt-4">
        <CardHeader
          title="最近充值记录"
          sub="资金流水 → 类型 = 充值"
          right={<Link to="/assets/history" className="text-2xs text-brand hover:underline">查看全部</Link>}
        />
        <Table cols={cols} rows={deposits} empty="暂无充值记录" />
      </Card>
    </div>
  )
}
