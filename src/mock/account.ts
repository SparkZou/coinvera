import { seeded } from '@/lib/utils'
import { TICKERS } from './market'

/* ------------------------------------------------------------------ *
 * Account, assets, orders, positions, broker — mock domain objects.
 * ------------------------------------------------------------------ */

export const USER = {
  uid: '81243907',
  email: 'demo@exchange.io',
  phone: '+64 21 ***  892',
  nickname: 'Demo Trader',
  kyc: 'verified' as 'none' | 'pending' | 'verified' | 'rejected',
  kycLevel: 2,
  google2fa: true,
  smsAuth: true,
  emailAuth: true,
  antiPhishing: 'HX-9271',
  vipLevel: 3,
  makerFee: 0.0008,
  takerFee: 0.001,
  inviteCode: 'HKX8Q2',
  registeredAt: '2024-11-03',
}

/* --------------------------------- Balances -------------------------------- */
export type Balance = {
  coin: string
  name: string
  free: number
  frozen: number
  usdPrice: number
  account: 'spot' | 'futures' | 'fiat'
}

const NAMES: Record<string, string> = {
  USDT: 'Tether', BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana',
  BNB: 'BNB', XRP: 'XRP', DOGE: 'Dogecoin', USD: 'US Dollar', HKD: 'Hong Kong Dollar',
}

export const BALANCES: Balance[] = [
  { coin: 'USDT', name: NAMES.USDT, free: 48_291.4412, frozen: 12_400.0000, usdPrice: 1,        account: 'spot' },
  { coin: 'BTC',  name: NAMES.BTC,  free: 1.28419,     frozen: 0.15000,     usdPrice: 97_842.31, account: 'spot' },
  { coin: 'ETH',  name: NAMES.ETH,  free: 18.4412,     frozen: 0,           usdPrice: 3_412.88,  account: 'spot' },
  { coin: 'SOL',  name: NAMES.SOL,  free: 412.8821,    frozen: 40.0000,     usdPrice: 218.42,    account: 'spot' },
  { coin: 'BNB',  name: NAMES.BNB,  free: 24.1180,     frozen: 0,           usdPrice: 692.15,    account: 'spot' },
  { coin: 'DOGE', name: NAMES.DOGE, free: 128_400.00,  frozen: 0,           usdPrice: 0.38412,   account: 'spot' },
  { coin: 'USDT', name: NAMES.USDT, free: 92_140.8800, frozen: 31_882.4100, usdPrice: 1,        account: 'futures' },
  { coin: 'BTC',  name: NAMES.BTC,  free: 0.44210,     frozen: 0.08000,     usdPrice: 97_842.31, account: 'futures' },
  { coin: 'USD',  name: NAMES.USD,  free: 12_500.00,   frozen: 0,           usdPrice: 1,        account: 'fiat' },
  { coin: 'HKD',  name: NAMES.HKD,  free: 84_200.00,   frozen: 0,           usdPrice: 0.1282,   account: 'fiat' },
]

export const balancesFor = (a: Balance['account']) => BALANCES.filter(b => b.account === a)
export const totalUsd = (a?: Balance['account']) =>
  BALANCES.filter(b => !a || b.account === a).reduce((s, b) => s + (b.free + b.frozen) * b.usdPrice, 0)

/* ---------------------------------- Orders --------------------------------- */
export type SpotOrder = {
  id: string
  ts: number
  symbol: string
  side: 'buy' | 'sell'
  type: 'limit' | 'market'
  price: number
  amount: number
  filled: number
  status: 'open' | 'partial' | 'filled' | 'cancelled'
}

const r0 = seeded(4242)
export const SPOT_ORDERS: SpotOrder[] = Array.from({ length: 26 }, (_, i) => {
  const t = TICKERS[Math.floor(r0() * 8)]
  const amount = +(r0() * (t.price > 1000 ? 1.2 : 900) + 0.01).toFixed(t.price > 1000 ? 5 : 2)
  const st = i < 5 ? 'open' : i < 7 ? 'partial' : r0() > 0.25 ? 'filled' : 'cancelled'
  const filled = st === 'filled' ? amount : st === 'partial' ? amount * 0.42 : st === 'open' ? 0 : amount * 0.1
  return {
    id: `S${(9_482_100 + i * 37).toString()}`,
    ts: Date.now() - i * (1_800_000 + Math.floor(r0() * 7_200_000)),
    symbol: t.symbol,
    side: r0() > 0.5 ? 'buy' : 'sell',
    type: r0() > 0.3 ? 'limit' : 'market',
    price: t.price * (1 + (r0() - 0.5) * 0.03),
    amount,
    filled,
    status: st as SpotOrder['status'],
  }
})

export const openSpotOrders = () => SPOT_ORDERS.filter(o => o.status === 'open' || o.status === 'partial')
export const histSpotOrders = () => SPOT_ORDERS.filter(o => o.status === 'filled' || o.status === 'cancelled')

/* -------------------------------- Positions -------------------------------- */
export type Position = {
  id: string
  symbol: string
  side: 'long' | 'short'
  mode: 'cross' | 'isolated'
  leverage: number
  size: number            // contracts (base)
  entry: number
  mark: number
  liq: number
  margin: number
  pnl: number
  pnlPct: number
  marginRatio: number     // 0..1  — 维持保证金率
  tp?: number
  sl?: number
  funding: number
}

export const POSITIONS: Position[] = [
  {
    id: 'P1', symbol: 'BTC/USDT', side: 'long', mode: 'cross', leverage: 20,
    size: 1.85, entry: 94_120.00, mark: 97_842.31, liq: 89_412.80,
    margin: 8_706.10, pnl: 6_886.27, pnlPct: 79.10, marginRatio: 0.082,
    tp: 105_000, sl: 91_000, funding: -12.44,
  },
  {
    id: 'P2', symbol: 'ETH/USDT', side: 'short', mode: 'isolated', leverage: 10,
    size: 24.0, entry: 3_512.40, mark: 3_412.88, liq: 3_842.10,
    margin: 8_429.76, pnl: 2_388.48, pnlPct: 28.34, marginRatio: 0.141,
    sl: 3_600, funding: 4.82,
  },
  {
    id: 'P3', symbol: 'SOL/USDT', side: 'long', mode: 'isolated', leverage: 50,
    size: 480, entry: 224.10, mark: 218.42, liq: 216.88,
    margin: 2_151.36, pnl: -2_726.40, pnlPct: -126.73, marginRatio: 0.812,
    funding: -1.18,
  },
]

export type FuturesOrder = {
  id: string; ts: number; symbol: string; side: 'buy' | 'sell'
  type: 'limit' | 'market' | 'stop' | 'take_profit'
  reduceOnly: boolean; price: number; amount: number; filled: number
  status: 'open' | 'filled' | 'cancelled' | 'triggered'
  tif: 'GTC' | 'IOC' | 'FOK'
}

const r1 = seeded(777)
export const FUTURES_ORDERS: FuturesOrder[] = Array.from({ length: 18 }, (_, i) => {
  const t = TICKERS[Math.floor(r1() * 6)]
  const amount = +(r1() * (t.price > 1000 ? 2 : 600) + 0.1).toFixed(t.price > 1000 ? 3 : 1)
  const st = i < 4 ? 'open' : r1() > 0.3 ? 'filled' : 'cancelled'
  return {
    id: `F${(3_120_400 + i * 53).toString()}`,
    ts: Date.now() - i * (2_400_000 + Math.floor(r1() * 6_000_000)),
    symbol: t.symbol, side: r1() > 0.5 ? 'buy' : 'sell',
    type: (['limit', 'market', 'stop', 'take_profit'] as const)[Math.floor(r1() * 4)],
    reduceOnly: r1() > 0.7,
    price: t.price * (1 + (r1() - 0.5) * 0.04),
    amount, filled: st === 'filled' ? amount : 0,
    status: st as FuturesOrder['status'],
    tif: (['GTC', 'IOC', 'FOK'] as const)[Math.floor(r1() * 3)],
  }
})

/* ------------------------------ Funds / ledger ----------------------------- */
export type LedgerRow = {
  id: string; ts: number; type: '充值' | '提现' | '划转' | '交易' | '手续费' | '返佣' | '资金费用' | '赠币'
  coin: string; amount: number; balance: number
  status: '已完成' | '处理中' | '待审核' | '失败'
  txid?: string
}

const r2 = seeded(9182)
const LTYPES: LedgerRow['type'][] = ['充值', '提现', '划转', '交易', '手续费', '返佣', '资金费用', '赠币']
export const LEDGER: LedgerRow[] = Array.from({ length: 48 }, (_, i) => {
  const type = LTYPES[Math.floor(r2() * LTYPES.length)]
  const coin = ['USDT', 'BTC', 'ETH', 'SOL'][Math.floor(r2() * 4)]
  const sign = ['提现', '手续费', '资金费用'].includes(type) ? -1 : 1
  return {
    id: `L${(5_002_100 + i * 29).toString()}`,
    ts: Date.now() - i * (3_600_000 + Math.floor(r2() * 20_000_000)),
    type, coin,
    amount: sign * +(r2() * (coin === 'USDT' ? 4_800 : 1.4) + 0.01).toFixed(coin === 'USDT' ? 2 : 6),
    balance: +(r2() * 60_000 + 1_000).toFixed(2),
    status: (i < 2 ? '处理中' : i < 4 ? '待审核' : r2() > 0.05 ? '已完成' : '失败') as LedgerRow['status'],
    txid: type === '充值' || type === '提现'
      ? '0x' + Math.floor(r2() * 1e16).toString(16).padStart(16, '0').repeat(4).slice(0, 64)
      : undefined,
  }
})

/* --------------------------------- Broker ---------------------------------- */
export type Referral = {
  uid: string; level: 1 | 2 | 3; registeredAt: string
  tradedVol: number; commission: number; kyc: boolean
}

const r3 = seeded(5150)
export const REFERRALS: Referral[] = Array.from({ length: 32 }, (_, i) => ({
  uid: String(80_000_000 + Math.floor(r3() * 9_000_000)),
  level: (r3() > 0.6 ? 1 : r3() > 0.3 ? 2 : 3) as 1 | 2 | 3,
  registeredAt: new Date(Date.now() - Math.floor(r3() * 300) * 86_400_000).toISOString().slice(0, 10),
  tradedVol: +(r3() * 480_000).toFixed(2),
  commission: +(r3() * 1_800).toFixed(2),
  kyc: r3() > 0.35,
}))

export const BROKER_STATS = {
  totalCommission: REFERRALS.reduce((s, r) => s + r.commission, 0),
  monthCommission: 4_218.44,
  directCount: REFERRALS.filter(r => r.level === 1).length,
  totalCount: REFERRALS.length,
  spotRate: 0.30,      // 现货返佣比例
  futuresRate: 0.40,   // 合约返佣比例
  tier: 'Gold',
}

/* ------------------------------- Announcements ----------------------------- */
export type Notice = { id: string; title: string; category: string; ts: number; pinned?: boolean; body: string }

export const NOTICES: Notice[] = [
  { id: 'N1', title: '关于上线 SUI/USDT 永续合约的公告', category: '新币上线', ts: Date.now() - 3_600_000, pinned: true,
    body: '平台将于 2026-07-15 12:00 (UTC+8) 上线 SUI/USDT 永续合约，支持最高 50 倍杠杆。' },
  { id: 'N2', title: '系统升级维护通知', category: '系统公告', ts: Date.now() - 86_400_000,
    body: '为提升撮合性能，平台将于 2026-07-20 02:00–04:00 进行系统维护，期间交易暂停。' },
  { id: 'N3', title: '合约手续费费率调整通知', category: '费率调整', ts: Date.now() - 3 * 86_400_000,
    body: 'VIP 3 及以上用户合约 Maker 费率下调至 0.008%。' },
  { id: 'N4', title: '邀请返佣活动升级：最高 50% 佣金比例', category: '活动', ts: Date.now() - 5 * 86_400_000,
    body: '经纪人计划升级，直客返佣最高可达 50%。' },
  { id: 'N5', title: '关于防范虚假客服诈骗的风险提示', category: '安全提示', ts: Date.now() - 8 * 86_400_000,
    body: '平台客服不会主动索要密码、验证码或私钥，请提高警惕。' },
]

export type InboxMsg = { id: string; title: string; ts: number; read: boolean; kind: '系统' | '充提' | 'KYC' | '安全' }
export const INBOX: InboxMsg[] = [
  { id: 'M1', title: '您的提现申请 2,000 USDT 已完成', ts: Date.now() - 1_800_000, read: false, kind: '充提' },
  { id: 'M2', title: '实名认证已通过审核（Level 2）', ts: Date.now() - 86_400_000, read: false, kind: 'KYC' },
  { id: 'M3', title: '检测到新设备登录，IP: 203.***.**.18', ts: Date.now() - 2 * 86_400_000, read: true, kind: '安全' },
  { id: 'M4', title: '充值 0.5 BTC 已到账（12/12 确认）', ts: Date.now() - 4 * 86_400_000, read: true, kind: '充提' },
  { id: 'M5', title: '系统维护完成通知', ts: Date.now() - 6 * 86_400_000, read: true, kind: '系统' },
]

/* --------------------------------- Security -------------------------------- */
export type LoginLog = { ts: number; ip: string; location: string; device: string; status: '成功' | '失败' }
export const LOGIN_LOGS: LoginLog[] = [
  { ts: Date.now() - 600_000,     ip: '203.118.24.18',  location: 'Auckland, NZ',  device: 'Chrome 131 · macOS', status: '成功' },
  { ts: Date.now() - 86_400_000,  ip: '203.118.24.18',  location: 'Auckland, NZ',  device: 'iOS App 1.4.2',      status: '成功' },
  { ts: Date.now() - 172_800_000, ip: '119.28.44.201',  location: 'Hong Kong',     device: 'Chrome 131 · Win',   status: '成功' },
  { ts: Date.now() - 200_000_000, ip: '45.32.118.9',    location: 'Singapore',     device: 'Unknown',            device2: '', status: '失败' } as any,
]

export type ApiKey = { id: string; label: string; key: string; perms: string[]; ips: string[]; createdAt: string }
export const API_KEYS: ApiKey[] = [
  { id: 'K1', label: 'Trading Bot', key: 'aK92mZ...4Xq1', perms: ['读取', '现货交易'], ips: ['203.118.24.18'], createdAt: '2026-05-12' },
  { id: 'K2', label: 'Portfolio Tracker', key: 'bR41vN...9Ld7', perms: ['读取'], ips: [], createdAt: '2026-06-28' },
]

/* -------------------------------- Deposit ---------------------------------- */
export const CHAINS: Record<string, { chain: string; addr: string; confirms: number; minDeposit: number; fee: number }[]> = {
  USDT: [
    { chain: 'TRC20', addr: 'TNV9o8fTRZGgvUTxaMwJ8NLxgGNaj6M5on', confirms: 20, minDeposit: 1, fee: 1 },
    { chain: 'ERC20', addr: '0x7a2f4b1c9e8d3a5f6b0c2d4e8f1a3b5c7d9e0f2a', confirms: 12, minDeposit: 10, fee: 8 },
    { chain: 'BEP20', addr: '0x3c8e1f5a7b9d2c4e6f0a1b3d5e7f9a0c2b4d6e8f', confirms: 15, minDeposit: 1, fee: 0.5 },
  ],
  BTC: [{ chain: 'Bitcoin', addr: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', confirms: 2, minDeposit: 0.0001, fee: 0.0002 }],
  ETH: [{ chain: 'ERC20', addr: '0x9f4e2a6c8b1d3f5a7c9e0b2d4f6a8c0e2b4d6f8a', confirms: 12, minDeposit: 0.01, fee: 0.003 }],
  SOL: [{ chain: 'Solana', addr: '7xKXtg2CW3xN1qP8vZ4mR6bF9hJ3sL5wY0uE2aD4cB6n', confirms: 32, minDeposit: 0.01, fee: 0.01 }],
}
