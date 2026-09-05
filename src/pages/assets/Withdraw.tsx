import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ShieldAlert, ShieldCheck, BookMarked, Coins, Landmark,
  Clock, Gauge, CheckCircle2, Plus, Info,
} from 'lucide-react'
import {
  Card, CardHeader, Button, Badge, Input, Select, Table, TabsUnderline, Modal,
  PageHeader, type Col,
} from '@/components/ui'
import { BALANCES, CHAINS, LEDGER, USER, type LedgerRow } from '@/mock/account'
import { cn, num, usd, shortAddr, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * F-47 提现 (自动风控 + 人工审核)
 *
 * ⚠️ 合同 Article I 排除 "wallet services (cold wallet, hot wallet)"。
 * ------------------------------------------------------------------ */

const TONE: Record<string, string> = {
  BTC: 'bg-warn/10 text-warn', ETH: 'bg-info/10 text-info', USDT: 'bg-up/10 text-up',
  SOL: 'bg-brand/10 text-brand', USD: 'bg-up/10 text-up', HKD: 'bg-info/10 text-info',
}
const CoinIcon = ({ coin }: { coin: string }) => (
  <span className={cn('inline-grid place-items-center w-6 h-6 rounded-full text-2xs font-semibold shrink-0',
    TONE[coin] ?? 'bg-elevated text-muted')}>{coin.slice(0, 1)}</span>
)

/* --------------------------------- OTP box -------------------------------- */
function Otp({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const set = (i: number, ch: string) => {
    const d = ch.replace(/\D/g, '').slice(-1)
    const arr = value.padEnd(6, ' ').split('')
    arr[i] = d || ' '
    onChange(arr.join('').replace(/ /g, ' ').trimEnd())
    if (d && i < 5) refs.current[i + 1]?.focus()
  }
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={(value[i] ?? '').trim()}
          onChange={e => set(i, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !(value[i] ?? '').trim() && i > 0) refs.current[i - 1]?.focus()
          }}
          inputMode="numeric" maxLength={1}
          className="w-9 h-10 sm:w-10 rounded-lg bg-elevated border border-line text-center text-sm tnum
                     outline-none focus:border-brand transition-colors"
        />
      ))}
    </div>
  )
}

/* ------------------------------ Address book ------------------------------ */
const BOOK: Record<string, { label: string; addr: string; chain: string }[]> = {
  USDT: [
    { label: 'Binance 主账户', addr: 'TQrZ8tpDmM4v9Yq2NsK7bF3hJ6wL0uE2aD', chain: 'TRC20' },
    { label: 'Ledger 冷钱包', addr: '0x4f8a2c6e9b1d3f5a7c0e2b4d6f8a0c2e4b6d8f0a', chain: 'ERC20' },
  ],
  BTC: [{ label: 'Ledger 冷钱包', addr: 'bc1q9h8k2mfz7v4nq3xt6r0plw5cj2ygdas8u4e7bn', chain: 'Bitcoin' }],
  ETH: [{ label: 'MetaMask', addr: '0x2b7e1c4a9f6d3e8b5c0a2f4d6e8b0c2a4f6d8e0b', chain: 'ERC20' }],
  SOL: [],
}

type Tab = 'crypto' | 'fiat'

export default function Withdraw() {
  const [tab, setTab] = useState<Tab>('crypto')

  const coins = Object.keys(CHAINS)
  const [coin, setCoin] = useState('USDT')
  const [chainIdx, setChainIdx] = useState(0)
  const chains = CHAINS[coin]
  const net = chains[Math.min(chainIdx, chains.length - 1)]

  const [addr, setAddr] = useState('')
  const [amt, setAmt] = useState('')
  const [g2fa, setG2fa] = useState('')
  const [sms, setSms] = useState('')
  const [book, setBook] = useState(false)
  const [done, setDone] = useState(false)

  const bal = BALANCES.find(b => b.account === 'spot' && b.coin === coin)
  const free = bal?.free ?? 0
  const px = bal?.usdPrice ?? 1
  const dp = px > 100 ? 6 : 2

  const a = +amt || 0
  const recv = Math.max(0, a - net.fee)
  const usdVal = a * px

  /* 风控 — 24h 提现限额 (Lv2 KYC) */
  const limit24 = 500_000
  const used24 = 128_400
  const usedPct = Math.min(100, ((used24 + usdVal) / limit24) * 100)
  const manual = usdVal >= 50_000                 // 大额 → 人工审核

  const ok = a > 0 && a <= free && a > net.fee && addr.length > 10 && g2fa.trim().length === 6 && sms.trim().length === 6

  const rows = useMemo(() => LEDGER.filter(l => l.type === '提现').slice(0, 8), [])

  const cols: Col<LedgerRow>[] = [
    { key: 'ts', header: '时间', cell: r => <span className="text-xs text-muted tnum">{fmtDateTime(r.ts)}</span> },
    { key: 'coin', header: '币种', cell: r => <span className="flex items-center gap-1.5 text-sm"><CoinIcon coin={r.coin} />{r.coin}</span> },
    { key: 'amt', header: '数量', align: 'right', cell: r => <span className="tnum text-down">-{num(Math.abs(r.amount), r.coin === 'USDT' ? 2 : 6)}</span> },
    {
      key: 'txid', header: 'TxID', hideBelow: 'md',
      cell: r => r.txid
        ? <span className="text-2xs font-mono text-muted hover:text-brand cursor-pointer"
                onClick={() => navigator.clipboard?.writeText(r.txid!)}>{shortAddr(r.txid, 10, 8)}</span>
        : <span className="text-faint">—</span>,
    },
    {
      key: 'st', header: '状态', align: 'right',
      cell: r => <Badge tone={r.status === '已完成' ? 'up' : r.status === '失败' ? 'down' : r.status === '待审核' ? 'warn' : 'info'}>{r.status}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="提现"
        sub="F-47 · 自动风控 + 人工审核"
        actions={
          <>
            <Link to="/assets"><Button variant="ghost" size="sm">返回资产</Button></Link>
            <Link to="/assets/history"><Button variant="outline" size="sm">提现记录</Button></Link>
          </>
        }
      />

      {/* Contract scope */}
      <Card className="border-warn/40 mb-4">
        <div className="flex gap-3 p-4">
          <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="warn"><AlertTriangle className="w-2.5 h-2.5" />待澄清 · 合同范围冲突</Badge>
              <span className="text-xs font-semibold">钱包服务不在合同交付范围内</span>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-1.5">
              合同 Article I 明确排除 <b className="text-ink">“wallet services (cold wallet, hot wallet)”</b>。
              提现的 <b className="text-ink">热钱包签名出金、私钥管理、冷钱包归集、链上广播与确认回调</b> 均属钱包服务范畴。
              本页交付的是 <b className="text-ink">提现申请、自动风控规则引擎、人工审核工作流与状态机</b>；
              实际出金动作由甲方提供的钱包 / 托管服务商执行。签约前须书面确认。
            </p>
          </div>
        </div>
      </Card>

      <TabsUnderline
        className="mb-5"
        value={tab} onChange={setTab}
        tabs={[
          { id: 'crypto', label: <span className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" />数字货币提现</span> },
          { id: 'fiat', label: <span className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" />法币提现</span> },
        ]}
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-4">
        {/* ------------------------------ Main form ----------------------------- */}
        <Card>
          <CardHeader
            title={tab === 'crypto' ? '数字货币提现' : '法币提现'}
            sub={tab === 'crypto' ? '请确认地址与网络一致，链上转账不可撤销' : '仅支持提现至本人同名银行账户'}
            right={<Badge tone={USER.kyc === 'verified' ? 'up' : 'warn'}>KYC Lv{USER.kycLevel}</Badge>}
          />

          {tab === 'crypto' ? (
            <div className="p-4 space-y-5">
              {/* coin */}
              <div>
                <div className="text-xs text-muted mb-2">提现币种</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {coins.map(c => (
                    <button
                      key={c}
                      onClick={() => { setCoin(c); setChainIdx(0); setAmt('') }}
                      className={cn(
                        'flex items-center gap-2 h-11 px-3 rounded-lg border transition-colors',
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
                <div className="text-xs text-muted mb-2">提现网络</div>
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
                      <div className="text-2xs text-faint tnum mt-0.5">手续费 {num(ch.fee, ch.fee < 1 ? 4 : 2)} {coin}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted">提现地址</span>
                  <button onClick={() => setBook(true)} className="text-2xs text-brand hover:underline flex items-center gap-1">
                    <BookMarked className="w-3 h-3" />地址簿
                  </button>
                </div>
                <Input
                  placeholder={`请输入 ${net.chain} 网络的 ${coin} 提现地址`}
                  value={addr} onChange={e => setAddr(e.target.value)}
                  className="font-mono text-xs"
                />
                {addr && addr.length <= 10 && <div className="text-2xs text-down mt-1">地址格式不正确</div>}
              </div>

              {/* amount */}
              <div>
                <Input
                  label="提现数量"
                  placeholder={`最小 ${num(net.fee * 2, net.fee < 1 ? 4 : 2)}`}
                  value={amt} onChange={e => setAmt(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  suffix={
                    <span className="flex items-center gap-2">
                      <span>{coin}</span>
                      <button
                        onClick={() => setAmt(String(+free.toFixed(dp)))}
                        className="text-brand font-medium hover:underline"
                      >全部</button>
                    </span>
                  }
                />
                <div className="flex items-center justify-between mt-1.5 text-2xs">
                  <span className="text-faint">
                    可用余额 <b className="text-muted tnum">{num(free, dp)} {coin}</b>
                    {a > free && <span className="text-down ml-2">余额不足</span>}
                  </span>
                  <span className="text-faint tnum">≈ {usd(usdVal)}</span>
                </div>
              </div>

              {/* summary */}
              <div className="rounded-lg bg-elevated border border-line p-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted">网络手续费</span><span className="tnum">{num(net.fee, net.fee < 1 ? 4 : 2)} {coin}</span></div>
                <div className="flex justify-between"><span className="text-muted">单笔最小提现</span><span className="tnum">{num(net.minDeposit, net.minDeposit < 1 ? 4 : 2)} {coin}</span></div>
                <div className="h-px bg-line" />
                <div className="flex justify-between items-baseline">
                  <span className="text-muted">实际到账</span>
                  <span className="text-base font-semibold tnum text-brand">{num(recv, dp)} {coin}</span>
                </div>
              </div>

              {/* 2FA */}
              <div className="rounded-lg border border-line p-3.5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                  <span className="text-xs font-semibold">安全验证</span>
                  <Badge tone="muted">提现二次验证已开启</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xs text-muted mb-1.5">谷歌验证码</div>
                    <Otp value={g2fa} onChange={setG2fa} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xs text-muted">短信验证码 ({USER.phone})</span>
                      <button className="text-2xs text-brand hover:underline">获取</button>
                    </div>
                    <Otp value={sms} onChange={setSms} />
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full" disabled={!ok} onClick={() => setDone(true)}>
                提交提现申请
              </Button>
              {manual && a > 0 && (
                <div className="flex items-center gap-2 text-2xs text-warn -mt-2">
                  <AlertTriangle className="w-3 h-3" />
                  本笔提现金额 ≥ $50,000，将触发风控规则转入 <b>人工审核</b>
                </div>
              )}
            </div>
          ) : (
            /* --------------------------- Fiat withdraw --------------------------- */
            <div className="p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Select
                  label="提现币种" defaultValue="USD"
                  options={[{ value: 'USD', label: 'USD · 美元' }, { value: 'HKD', label: 'HKD · 港币' }]}
                />
                <Input label="提现金额" placeholder="0.00" suffix="USD" inputMode="decimal" />
              </div>
              <Select
                label="收款银行账户"
                options={[
                  { value: 'a', label: 'HSBC ****8821 · DEMO TRADER' },
                  { value: 'b', label: 'Standard Chartered ****4417 · DEMO TRADER' },
                ]}
              />
              <button className="w-full h-10 rounded-lg border border-dashed border-line text-xs text-muted
                                 hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />添加收款账户
              </button>
              <div className="rounded-lg bg-elevated border border-line p-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted">法币可用</span><span className="tnum">12,500.00 USD</span></div>
                <div className="flex justify-between"><span className="text-muted">提现手续费</span><span className="tnum">15.00 USD</span></div>
                <div className="flex justify-between"><span className="text-muted">预计到账</span><span className="tnum">1–3 个工作日</span></div>
              </div>
              <div className="flex gap-2.5 p-3 rounded-lg bg-warn/10 border border-warn/25">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <p className="text-2xs text-muted leading-relaxed">
                  <b className="text-warn">法币出金通道需由甲方提供。</b>
                  平台实现提现单、风控与审核流程；银行代付 / 第三方支付出金接口、结算账户与合规义务由甲方负责。
                </p>
              </div>
              <Button size="lg" className="w-full" onClick={() => setDone(true)}>提交提现申请</Button>
            </div>
          )}
        </Card>

        {/* ------------------------------ Risk panel ---------------------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="风控与限额" right={<Gauge className="w-3.5 h-3.5 text-faint" />} />
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-2xs text-muted">24h 提现限额</span>
                  <span className="text-2xs tnum">
                    <b className={cn(usedPct > 80 ? 'text-warn' : 'text-ink')}>{usd(used24 + usdVal, 0)}</b>
                    <span className="text-faint"> / {usd(limit24, 0)}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', usedPct > 80 ? 'bg-warn' : 'bg-brand')}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <div className="text-2xs text-faint mt-1.5 tnum">
                  剩余额度 {usd(Math.max(0, limit24 - used24 - usdVal), 0)}
                </div>
              </div>

              <div className="h-px bg-line" />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-muted">KYC 等级要求</span>
                  <Badge tone="up"><CheckCircle2 className="w-2.5 h-2.5" />Lv{USER.kycLevel} 已认证</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-muted">谷歌验证器</span>
                  <Badge tone="up">已开启</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-muted">提现二次验证</span>
                  <Badge tone="up">谷歌 + 短信</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-muted">新地址冷静期</span>
                  <Badge tone="muted">24h</Badge>
                </div>
              </div>

              <div className="h-px bg-line" />

              <div>
                <div className="text-2xs text-muted mb-2">自动风控策略</div>
                <div className="space-y-2">
                  {[
                    { t: '< $10,000', s: '自动审核 · 即时放行', tone: 'up' as const, active: usdVal > 0 && usdVal < 10_000 },
                    { t: '$10,000 – $50,000', s: '风控评分 + 自动审核', tone: 'info' as const, active: usdVal >= 10_000 && usdVal < 50_000 },
                    { t: '≥ $50,000', s: '强制转入人工审核', tone: 'warn' as const, active: usdVal >= 50_000 },
                  ].map(r => (
                    <div
                      key={r.t}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-2 rounded-lg border transition-colors',
                        r.active ? 'border-brand bg-brand/5' : 'border-line',
                      )}
                    >
                      <div>
                        <div className="text-2xs font-medium tnum">{r.t}</div>
                        <div className="text-2xs text-faint mt-0.5">{r.s}</div>
                      </div>
                      <Badge tone={r.tone}>{r.active ? '当前命中' : '规则'}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-2xs text-muted flex items-center gap-1.5"><Clock className="w-3 h-3" />预计到账时间</span>
                <span className="text-2xs tnum font-medium">{manual ? '2 – 6 小时' : '5 – 30 分钟'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex gap-2.5">
              <Info className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
              <p className="text-2xs text-muted leading-relaxed">
                触发风控（异地登录、修改密码 24h 内、新增提现地址）时，
                提现将被暂缓并转入人工审核队列，后台可在
                <span className="text-brand"> 钱包管理 → 提现审核 </span>
                中处理。
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* --------------------------- Recent withdrawals -------------------------- */}
      <Card className="mt-4">
        <CardHeader
          title="最近提现记录"
          sub="资金流水 → 类型 = 提现"
          right={<Link to="/assets/history" className="text-2xs text-brand hover:underline">查看全部</Link>}
        />
        <Table cols={cols} rows={rows} empty="暂无提现记录" />
      </Card>

      {/* --------------------------------- Modals -------------------------------- */}
      <Modal open={book} onClose={() => setBook(false)} title="提现地址簿">
        <div className="space-y-2">
          {(BOOK[coin] ?? []).map(b => (
            <button
              key={b.addr}
              onClick={() => { setAddr(b.addr); setBook(false) }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-elevated border border-line
                         hover:border-brand transition-colors text-left"
            >
              <CoinIcon coin={coin} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium flex items-center gap-2">
                  {b.label}<Badge tone="info">{b.chain}</Badge>
                </div>
                <div className="text-2xs font-mono text-faint truncate mt-0.5">{shortAddr(b.addr, 14, 10)}</div>
              </div>
            </button>
          ))}
          {(BOOK[coin] ?? []).length === 0 && (
            <div className="py-8 text-center text-xs text-faint">该币种暂无已保存地址</div>
          )}
          <button className="w-full h-10 rounded-lg border border-dashed border-line text-xs text-muted
                             hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />添加新地址（需二次验证）
          </button>
        </div>
      </Modal>

      <Modal
        open={done} onClose={() => setDone(false)} title="提现申请已提交"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDone(false)}>继续提现</Button>
            <Link to="/assets/history" className="flex-1"><Button className="w-full">查看进度</Button></Link>
          </div>
        }
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 rounded-full bg-up/10 grid place-items-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-up" />
          </div>
          <div className="text-sm font-semibold mt-3">提现申请已提交，等待人工审核</div>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            订单号 <b className="text-ink font-mono">W{Date.now().toString().slice(-9)}</b>
          </p>
        </div>
        <div className="mt-4 rounded-lg bg-elevated border border-line p-3 space-y-2 text-2xs">
          <div className="flex justify-between"><span className="text-muted">提现数量</span><span className="tnum">{num(a, dp)} {coin}</span></div>
          <div className="flex justify-between"><span className="text-muted">网络</span><span>{net.chain}</span></div>
          <div className="flex justify-between"><span className="text-muted">地址</span><span className="font-mono">{addr ? shortAddr(addr, 8, 6) : '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted">手续费</span><span className="tnum">{num(net.fee, net.fee < 1 ? 4 : 2)} {coin}</span></div>
          <div className="flex justify-between"><span className="text-muted">实际到账</span><span className="tnum font-medium">{num(recv, dp)} {coin}</span></div>
          <div className="h-px bg-line" />
          <div className="flex justify-between items-center">
            <span className="text-muted">当前状态</span>
            <Badge tone="warn">待审核</Badge>
          </div>
        </div>
        <p className="text-2xs text-faint mt-3 leading-relaxed">
          风控系统已完成自动评分。审核通过后由钱包服务广播上链，届时可在资金流水中查询 TxID。
        </p>
      </Modal>
    </div>
  )
}
