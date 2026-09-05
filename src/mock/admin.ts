import { seeded } from '@/lib/utils'
import { TICKERS } from './market'

/* ------------------------------------------------------------------ *
 * Back-office mock data. Deterministic — same on every reload.
 * ------------------------------------------------------------------ */

const r = seeded(31337)
const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
const days = (n: number) => Date.now() - n * 86_400_000
const iso = (ts: number) => new Date(ts).toISOString().slice(0, 19).replace('T', ' ')

/* --------------------------------- Coins ----------------------------------- */
export type AdminCoin = {
  id: string; coin: string; name: string; chains: string[]
  depositOn: boolean; withdrawOn: boolean
  withdrawFee: number; minWithdraw: number; confirms: number
  precision: number; status: '上线' | '下线' | '维护'
}
export const COINS: AdminCoin[] = [
  { id: 'C1', coin: 'USDT', name: 'Tether',   chains: ['TRC20', 'ERC20', 'BEP20'], depositOn: true,  withdrawOn: true,  withdrawFee: 1,      minWithdraw: 10,    confirms: 20, precision: 6, status: '上线' },
  { id: 'C2', coin: 'BTC',  name: 'Bitcoin',  chains: ['Bitcoin'],                 depositOn: true,  withdrawOn: true,  withdrawFee: 0.0002, minWithdraw: 0.001, confirms: 2,  precision: 8, status: '上线' },
  { id: 'C3', coin: 'ETH',  name: 'Ethereum', chains: ['ERC20', 'Arbitrum'],       depositOn: true,  withdrawOn: true,  withdrawFee: 0.003,  minWithdraw: 0.01,  confirms: 12, precision: 8, status: '上线' },
  { id: 'C4', coin: 'SOL',  name: 'Solana',   chains: ['Solana'],                  depositOn: true,  withdrawOn: true,  withdrawFee: 0.01,   minWithdraw: 0.05,  confirms: 32, precision: 6, status: '上线' },
  { id: 'C5', coin: 'BNB',  name: 'BNB',      chains: ['BEP20'],                   depositOn: true,  withdrawOn: true,  withdrawFee: 0.001,  minWithdraw: 0.01,  confirms: 15, precision: 6, status: '上线' },
  { id: 'C6', coin: 'XRP',  name: 'XRP',      chains: ['XRP Ledger'],              depositOn: true,  withdrawOn: false, withdrawFee: 0.25,   minWithdraw: 1,     confirms: 6,  precision: 6, status: '维护' },
  { id: 'C7', coin: 'DOGE', name: 'Dogecoin', chains: ['Dogecoin'],                depositOn: true,  withdrawOn: true,  withdrawFee: 5,      minWithdraw: 50,    confirms: 40, precision: 4, status: '上线' },
  { id: 'C8', coin: 'SUI',  name: 'Sui',      chains: ['Sui'],                     depositOn: false, withdrawOn: false, withdrawFee: 0.1,    minWithdraw: 1,     confirms: 20, precision: 6, status: '下线' },
]

/* --------------------------------- Pairs ----------------------------------- */
export type AdminPair = {
  id: string; symbol: string; kind: 'spot' | 'futures'
  tickSize: number; minQty: number; maxLeverage: number
  makerFee: number; takerFee: number; priceLimit: number
  status: '交易中' | '暂停' | '仅撤单'
}
export const PAIRS: AdminPair[] = TICKERS.slice(0, 12).map((t, i) => ({
  id: `P${i + 1}`, symbol: t.symbol, kind: 'spot',
  tickSize: t.price > 1000 ? 0.1 : t.price > 1 ? 0.0001 : 0.00000001,
  minQty: t.price > 1000 ? 0.0001 : 1,
  maxLeverage: 1,
  makerFee: 0.001, takerFee: 0.001,
  priceLimit: 10,
  status: i === 9 ? '暂停' : '交易中',
}))
export const FUTURES_PAIRS: AdminPair[] = TICKERS.slice(0, 10).map((t, i) => ({
  id: `FP${i + 1}`, symbol: `${t.base}USDT 永续`, kind: 'futures',
  tickSize: t.price > 1000 ? 0.1 : 0.0001,
  minQty: t.price > 1000 ? 0.001 : 1,
  maxLeverage: [125, 100, 75, 50, 50, 25, 25, 20, 20, 10][i],
  makerFee: 0.0002, takerFee: 0.0005,
  priceLimit: 5,
  status: '交易中',
}))

/** 梯度保证金 — F-38. Position tiers with rising margin requirements. */
export type MarginTier = { tier: number; from: number; to: number; imr: number; mmr: number; maxLev: number }
export const MARGIN_TIERS: MarginTier[] = [
  { tier: 1, from: 0,          to: 50_000,     imr: 0.008, mmr: 0.004, maxLev: 125 },
  { tier: 2, from: 50_000,     to: 250_000,    imr: 0.01,  mmr: 0.005, maxLev: 100 },
  { tier: 3, from: 250_000,    to: 1_000_000,  imr: 0.02,  mmr: 0.01,  maxLev: 50 },
  { tier: 4, from: 1_000_000,  to: 5_000_000,  imr: 0.05,  mmr: 0.025, maxLev: 20 },
  { tier: 5, from: 5_000_000,  to: 20_000_000, imr: 0.10,  mmr: 0.05,  maxLev: 10 },
  { tier: 6, from: 20_000_000, to: 50_000_000, imr: 0.125, mmr: 0.0625, maxLev: 8 },
  { tier: 7, from: 50_000_000, to: 100_000_000, imr: 0.25, mmr: 0.125, maxLev: 4 },
  { tier: 8, from: 100_000_000, to: 200_000_000, imr: 0.5, mmr: 0.25,  maxLev: 2 },
]

/* --------------------------------- Users ----------------------------------- */
export type AdminUser = {
  id: string; uid: string; email: string; phone: string
  kyc: '未认证' | '待审核' | '已认证' | '已驳回'
  vip: number; assets: number; status: '正常' | '冻结' | '限制提现'
  registeredAt: string; lastLogin: string; country: string; inviter?: string
}
const COUNTRIES = ['新加坡', '香港', '日本', '韩国', '越南', '马来西亚', '新西兰', '澳大利亚']
export const ADMIN_USERS: AdminUser[] = Array.from({ length: 64 }, (_, i) => {
  const uid = String(81_000_000 + Math.floor(r() * 999_999))
  return {
    id: `U${i + 1}`, uid,
    email: `u${uid.slice(-5)}@${pick(['gmail.com', 'outlook.com', 'qq.com', 'proton.me'])}`,
    phone: `+${pick(['65', '852', '81', '82', '84'])} ****${Math.floor(r() * 9000 + 1000)}`,
    kyc: (i < 6 ? '待审核' : r() > 0.28 ? '已认证' : r() > 0.5 ? '未认证' : '已驳回') as AdminUser['kyc'],
    vip: Math.floor(r() * 6),
    assets: +(r() * 480_000).toFixed(2),
    status: (r() > 0.94 ? (r() > 0.5 ? '冻结' : '限制提现') : '正常') as AdminUser['status'],
    registeredAt: iso(days(Math.floor(r() * 400))),
    lastLogin: iso(days(Math.floor(r() * 14))),
    country: pick(COUNTRIES),
    inviter: r() > 0.4 ? String(81_000_000 + Math.floor(r() * 999_999)) : undefined,
  }
})

/* ------------------------------ KYC review queue ---------------------------- */
export type KycApp = {
  id: string; uid: string; realName: string; country: string
  docType: '身份证' | '护照' | '驾照'; docNo: string
  level: 1 | 2 | 3; submittedAt: string
  status: '待审核' | '已通过' | '已驳回'
  faceScore: number; riskFlags: string[]
}
export const KYC_QUEUE: KycApp[] = Array.from({ length: 14 }, (_, i) => ({
  id: `K${i + 1}`,
  uid: ADMIN_USERS[i].uid,
  realName: pick(['陈**', '李**', '王**', 'Tan **', 'Nguyen **', 'Kim **', 'Sato **']),
  country: pick(COUNTRIES),
  docType: pick(['身份证', '护照', '驾照'] as const),
  docNo: `${pick(['S', 'G', 'M', 'K'])}${Math.floor(r() * 9e6 + 1e6)}${pick(['A', 'B', 'C', 'D'])}`,
  level: (r() > 0.5 ? 2 : 1) as 1 | 2,
  submittedAt: iso(days(Math.floor(r() * 8))),
  status: (i < 6 ? '待审核' : r() > 0.3 ? '已通过' : '已驳回') as KycApp['status'],
  faceScore: +(r() * 22 + 76).toFixed(1),
  riskFlags: [
    ...(r() > 0.78 ? ['证件模糊'] : []),
    ...(r() > 0.85 ? ['活体检测分数偏低'] : []),
    ...(r() > 0.9 ? ['同一证件多次提交'] : []),
  ],
}))

/* --------------------------- Deposits / Withdrawals ------------------------- */
export type WalletTx = {
  id: string; uid: string; coin: string; chain: string
  amount: number; fee: number; addr: string; txid: string
  ts: string; confirms: string
  status: '待审核' | '处理中' | '已完成' | '已驳回' | '失败'
  riskScore: number; riskFlags: string[]
}
const mkTx = (i: number, kind: 'in' | 'out'): WalletTx => {
  const coin = pick(['USDT', 'BTC', 'ETH', 'SOL'])
  const big = r() > 0.8
  return {
    id: `${kind === 'in' ? 'D' : 'W'}${9000 + i}`,
    uid: ADMIN_USERS[i % ADMIN_USERS.length].uid,
    coin,
    chain: coin === 'USDT' ? pick(['TRC20', 'ERC20', 'BEP20']) : coin,
    amount: +(r() * (coin === 'USDT' ? (big ? 180_000 : 9_000) : 3) + 0.01).toFixed(coin === 'USDT' ? 2 : 6),
    fee: coin === 'USDT' ? 1 : 0.0002,
    addr: (coin === 'BTC' ? 'bc1q' : coin === 'SOL' ? '7xKX' : '0x') +
          Math.floor(r() * 1e15).toString(16).padStart(12, '0').repeat(3).slice(0, 34),
    txid: '0x' + Math.floor(r() * 1e15).toString(16).padStart(15, '0').repeat(5).slice(0, 64),
    ts: iso(days(Math.floor(r() * 20))),
    confirms: kind === 'in' ? `${Math.floor(r() * 20 + 1)}/20` : '—',
    status: (kind === 'out'
      ? (i < 5 ? '待审核' : i < 7 ? '处理中' : r() > 0.15 ? '已完成' : '已驳回')
      : (i < 3 ? '处理中' : r() > 0.05 ? '已完成' : '失败')) as WalletTx['status'],
    riskScore: Math.floor(r() * 60 + (big ? 40 : 5)),
    riskFlags: [
      ...(big ? ['大额提现'] : []),
      ...(r() > 0.75 ? ['新地址'] : []),
      ...(r() > 0.88 ? ['首次提现'] : []),
      ...(r() > 0.92 ? ['24h 内多笔'] : []),
    ],
  }
}
export const DEPOSITS: WalletTx[] = Array.from({ length: 30 }, (_, i) => mkTx(i, 'in'))
export const WITHDRAWALS: WalletTx[] = Array.from({ length: 30 }, (_, i) => mkTx(i, 'out'))

/* --------------------------------- Staff / RBAC ----------------------------- */
export type Staff = { id: string; user: string; name: string; role: string; dept: string; status: '启用' | '停用'; lastLogin: string; twoFa: boolean }
export const STAFF: Staff[] = [
  { id: 'S1', user: 'admin',    name: '系统管理员', role: '超级管理员', dept: '技术部', status: '启用', lastLogin: iso(days(0)), twoFa: true },
  { id: 'S2', user: 'finance1', name: '张财务',    role: '财务',      dept: '财务部', status: '启用', lastLogin: iso(days(1)), twoFa: true },
  { id: 'S3', user: 'risk1',    name: '李风控',    role: '风控',      dept: '风控部', status: '启用', lastLogin: iso(days(0)), twoFa: true },
  { id: 'S4', user: 'kyc1',     name: '王审核',    role: 'KYC 审核员', dept: '合规部', status: '启用', lastLogin: iso(days(2)), twoFa: false },
  { id: 'S5', user: 'ops1',     name: '陈运营',    role: '运营',      dept: '运营部', status: '启用', lastLogin: iso(days(3)), twoFa: true },
  { id: 'S6', user: 'cs1',      name: '刘客服',    role: '客服',      dept: '客服部', status: '停用', lastLogin: iso(days(30)), twoFa: false },
]

export type Role = { id: string; name: string; desc: string; members: number; perms: number }
export const ROLES: Role[] = [
  { id: 'R1', name: '超级管理员', desc: '全部权限',                    members: 1, perms: 128 },
  { id: 'R2', name: '财务',      desc: '充提审核、财务报表、平账工具',  members: 3, perms: 24 },
  { id: 'R3', name: '风控',      desc: '风控规则、警报、对冲、黑名单',  members: 2, perms: 18 },
  { id: 'R4', name: 'KYC 审核员', desc: '实名认证审核（只读用户资料）',  members: 4, perms: 6 },
  { id: 'R5', name: '运营',      desc: '公告、活动、赠币、轮播图',      members: 5, perms: 22 },
  { id: 'R6', name: '客服',      desc: '工单、站内信、只读用户信息',    members: 8, perms: 9 },
]

/** 权限树 — 模块 → 页面 → 操作 */
export const PERM_TREE = [
  { key: 'trade', label: '交易配置', children: [
    { key: 'trade.coins', label: '币种配置', ops: ['查看', '新增', '编辑', '上下线'] },
    { key: 'trade.pairs', label: '币对配置', ops: ['查看', '新增', '编辑', '暂停交易'] },
    { key: 'trade.orders', label: '订单管理', ops: ['查看', '强制撤单'] },
    { key: 'trade.fee', label: '手续费管理', ops: ['查看', '编辑费率'] },
  ]},
  { key: 'wallet', label: '充币提币', children: [
    { key: 'wallet.dep', label: '充币明细', ops: ['查看', '导出'] },
    { key: 'wallet.wd', label: '提币明细', ops: ['查看', '审核通过', '审核驳回', '导出'] },
    { key: 'wallet.cfg', label: '提币配置', ops: ['查看', '编辑'] },
  ]},
  { key: 'finance', label: '财务管理', children: [
    { key: 'finance.report', label: '财务报表', ops: ['查看', '导出'] },
    { key: 'finance.tool', label: '财务工具', ops: ['查看', '转账', '平账', '调账'] },
  ]},
  { key: 'user', label: '用户管理', children: [
    { key: 'user.list', label: '用户管理', ops: ['查看', '冻结', '解冻', '重置密码'] },
    { key: 'user.kyc', label: '实名认证审核', ops: ['查看', '通过', '驳回'] },
  ]},
  { key: 'ops', label: '运营工具', children: [
    { key: 'ops.gift', label: '赠币工具', ops: ['查看', '执行赠币'] },
    { key: 'ops.lock', label: '锁仓工具', ops: ['查看', '锁仓', '解锁'] },
  ]},
  { key: 'sys', label: '系统配置', children: [
    { key: 'sys.staff', label: '员工管理', ops: ['查看', '新增', '编辑', '停用'] },
    { key: 'sys.role', label: '角色权限', ops: ['查看', '编辑'] },
    { key: 'sys.cron', label: '定时任务', ops: ['查看', '启停', '立即执行'] },
  ]},
]

/* --------------------------------- Tickets ---------------------------------- */
export type Ticket = {
  id: string; uid: string; subject: string; category: '充提问题' | '交易问题' | '账户安全' | 'KYC' | '其他'
  priority: '低' | '中' | '高' | '紧急'; status: '待处理' | '处理中' | '已解决' | '已关闭'
  createdAt: string; assignee?: string; lastReply: string
}
export const TICKETS: Ticket[] = Array.from({ length: 22 }, (_, i) => ({
  id: `T${5000 + i}`,
  uid: ADMIN_USERS[i].uid,
  subject: pick([
    'USDT 充值 3 小时未到账', '提现一直显示处理中', '合约爆仓价格计算有疑问',
    '无法完成实名认证', '谷歌验证器丢失，请求解绑', 'API 下单返回 403',
    '返佣佣金未结算', '账户被冻结，请协助', '资金费率扣款异常',
  ]),
  category: pick(['充提问题', '交易问题', '账户安全', 'KYC', '其他'] as const),
  priority: (i < 3 ? '紧急' : pick(['低', '中', '高'] as const)) as Ticket['priority'],
  status: (i < 5 ? '待处理' : i < 9 ? '处理中' : r() > 0.3 ? '已解决' : '已关闭') as Ticket['status'],
  createdAt: iso(days(Math.floor(r() * 12))),
  assignee: r() > 0.35 ? pick(['刘客服', '陈运营', '王审核']) : undefined,
  lastReply: iso(days(Math.floor(r() * 3))),
}))

/* ------------------------------- Cron jobs ---------------------------------- */
export type CronJob = {
  id: string; name: string; expr: string; desc: string
  lastRun: string; nextRun: string; durationMs: number
  status: '运行中' | '已停用' | '失败'
}
export const CRON_JOBS: CronJob[] = [
  { id: 'J1', name: '资金费率结算',   expr: '0 0 */8 * * *',  desc: '每 8 小时结算一次永续合约资金费用 (F-34)',   lastRun: iso(days(0)), nextRun: iso(days(-0.1)), durationMs: 1_842, status: '运行中' },
  { id: 'J2', name: '未实现盈亏结算', expr: '0 * * * * *',    desc: '每分钟结算一次未实现盈亏 (F-40)',           lastRun: iso(days(0)), nextRun: iso(days(-0.001)), durationMs: 128, status: '运行中' },
  { id: 'J3', name: '指数价格聚合',   expr: '* * * * * *',    desc: '每秒聚合多家交易所行情计算指数价格 (F-37)', lastRun: iso(days(0)), nextRun: iso(days(0)), durationMs: 42, status: '运行中' },
  { id: 'J4', name: 'K线聚合',        expr: '0 * * * * *',    desc: '增量聚合 1m/5m/15m/1H/4H/1D/1W K线',       lastRun: iso(days(0)), nextRun: iso(days(-0.001)), durationMs: 310, status: '运行中' },
  { id: 'J5', name: '返佣结算',       expr: '0 0 2 * * *',    desc: '每日 02:00 结算经纪人返佣 (F-43/F-44)',     lastRun: iso(days(1)), nextRun: iso(days(-1)), durationMs: 8_420, status: '运行中' },
  { id: 'J6', name: '资产对账',       expr: '0 0 3 * * *',    desc: '每日 03:00 账面余额 vs 链上余额对账',       lastRun: iso(days(1)), nextRun: iso(days(-1)), durationMs: 22_104, status: '运行中' },
  { id: 'J7', name: '持仓奖励分红',   expr: '0 0 4 * * *',    desc: '每日 04:00 计算持币分红',                   lastRun: iso(days(1)), nextRun: iso(days(-1)), durationMs: 4_218, status: '运行中' },
  { id: 'J8', name: '充值链上扫描',   expr: '*/10 * * * * *', desc: '每 10 秒扫描链上充值到账',                  lastRun: iso(days(0)), nextRun: iso(days(0)), durationMs: 620, status: '失败' },
  { id: 'J9', name: '风控警报扫描',   expr: '0 */5 * * * *',  desc: '每 5 分钟扫描异常订单与仓位 (F-52)',        lastRun: iso(days(0)), nextRun: iso(days(0)), durationMs: 890, status: '运行中' },
  { id: 'J10', name: '历史数据归档',  expr: '0 0 5 * * 0',    desc: '每周日 05:00 归档 90 天前的成交明细',       lastRun: iso(days(4)), nextRun: iso(days(-3)), durationMs: 184_200, status: '已停用' },
]

/* --------------------------------- i18n ------------------------------------- */
export type I18nKey = { key: string; zh: string; en: string; ja: string; ko: string; module: string }
export const I18N_KEYS: I18nKey[] = [
  { module: '通用',   key: 'common.confirm',      zh: '确认',       en: 'Confirm',      ja: '確認',           ko: '확인' },
  { module: '通用',   key: 'common.cancel',       zh: '取消',       en: 'Cancel',       ja: 'キャンセル',     ko: '취소' },
  { module: '通用',   key: 'common.submit',       zh: '提交',       en: 'Submit',       ja: '送信',           ko: '제출' },
  { module: '交易',   key: 'trade.buy',           zh: '买入',       en: 'Buy',          ja: '買い',           ko: '매수' },
  { module: '交易',   key: 'trade.sell',          zh: '卖出',       en: 'Sell',         ja: '売り',           ko: '매도' },
  { module: '交易',   key: 'trade.limit',         zh: '限价',       en: 'Limit',        ja: '指値',           ko: '지정가' },
  { module: '交易',   key: 'trade.market',        zh: '市价',       en: 'Market',       ja: '成行',           ko: '시장가' },
  { module: '合约',   key: 'futures.leverage',    zh: '杠杆',       en: 'Leverage',     ja: 'レバレッジ',     ko: '레버리지' },
  { module: '合约',   key: 'futures.liqPrice',    zh: '强平价',     en: 'Liq. Price',   ja: '清算価格',       ko: '청산가' },
  { module: '合约',   key: 'futures.fundingRate', zh: '资金费率',   en: 'Funding Rate', ja: '資金調達率',     ko: '펀딩비율' },
  { module: '合约',   key: 'futures.markPrice',   zh: '标记价格',   en: 'Mark Price',   ja: 'マーク価格',     ko: '마크가격' },
  { module: '资产',   key: 'assets.available',    zh: '可用',       en: 'Available',    ja: '利用可能',       ko: '사용가능' },
  { module: '资产',   key: 'assets.frozen',       zh: '冻结',       en: 'Frozen',       ja: '凍結',           ko: '동결' },
  { module: '资产',   key: 'assets.deposit',      zh: '充值',       en: 'Deposit',      ja: '入金',           ko: '입금' },
  { module: '资产',   key: 'assets.withdraw',     zh: '提现',       en: 'Withdraw',     ja: '出金',           ko: '출금' },
  { module: '安全',   key: 'sec.google2fa',       zh: '谷歌验证器', en: 'Google Auth',  ja: 'Google 認証',    ko: 'Google OTP' },
  { module: '安全',   key: 'sec.kyc',             zh: '实名认证',   en: 'Verification', ja: '本人確認',       ko: '실명인증' },
  { module: '返佣',   key: 'broker.commission',   zh: '返佣',       en: 'Commission',   ja: '',               ko: '' },
  { module: '返佣',   key: 'broker.subAccount',   zh: '下级',       en: 'Referrals',    ja: '',               ko: '' },
  { module: '错误',   key: 'err.insufficient',    zh: '余额不足',   en: 'Insufficient balance', ja: '',       ko: '' },
]

/* ------------------------------ Reconciliation ------------------------------ */
/** 平账工具 — the page that proves you understand a double-entry ledger. */
export type ReconRow = {
  coin: string
  ledgerBalance: number    // 账面余额 (sum of all user balances)
  chainBalance: number     // 链上余额 (hot + cold wallet)
  hotWallet: number
  coldWallet: number
  diff: number
  status: '平' | '差异'
}
export const RECON: ReconRow[] = [
  { coin: 'USDT', ledgerBalance: 4_812_442.18, chainBalance: 4_812_442.18, hotWallet: 812_442.18, coldWallet: 4_000_000.00, diff: 0,          status: '平' },
  { coin: 'BTC',  ledgerBalance: 128.42918,    chainBalance: 128.42918,    hotWallet: 18.42918,   coldWallet: 110.00000,    diff: 0,          status: '平' },
  { coin: 'ETH',  ledgerBalance: 2_418.8821,   chainBalance: 2_418.8759,   hotWallet: 418.8759,   coldWallet: 2_000.0000,   diff: -0.0062,    status: '差异' },
  { coin: 'SOL',  ledgerBalance: 41_882.442,   chainBalance: 41_882.442,   hotWallet: 11_882.442, coldWallet: 30_000.000,   diff: 0,          status: '平' },
  { coin: 'BNB',  ledgerBalance: 1_284.118,    chainBalance: 1_284.118,    hotWallet: 284.118,    coldWallet: 1_000.000,    diff: 0,          status: '平' },
  { coin: 'DOGE', ledgerBalance: 8_412_400.00, chainBalance: 8_412_400.00, hotWallet: 412_400.00, coldWallet: 8_000_000.00, diff: 0,          status: '平' },
]

/* ------------------------------- Risk / hedge ------------------------------- */
export type HedgeRow = {
  coin: string; netExposure: number; hedged: number; hedgeRatio: number
  venue: string; pnl24h: number; status: '已对冲' | '部分对冲' | '未对冲'
}
export const HEDGE: HedgeRow[] = [
  { coin: 'BTC',  netExposure: -12.482,  hedged: 12.000,  hedgeRatio: 0.961, venue: 'Binance',  pnl24h: 4_218.42,  status: '部分对冲' },
  { coin: 'ETH',  netExposure: 184.221,  hedged: 184.221, hedgeRatio: 1.000, venue: 'Binance',  pnl24h: -1_882.10, status: '已对冲' },
  { coin: 'SOL',  netExposure: -2_418.8, hedged: 2_000.0, hedgeRatio: 0.827, venue: 'OKX',      pnl24h: 812.44,    status: '部分对冲' },
  { coin: 'BNB',  netExposure: 42.118,   hedged: 0,       hedgeRatio: 0,     venue: '—',        pnl24h: 0,         status: '未对冲' },
]

export type RiskAlert = {
  id: string; rule: string; condition: string; severity: '低' | '中' | '高' | '严重'
  triggers24h: number; lastTrigger: string; enabled: boolean
}
export const RISK_ALERTS: RiskAlert[] = [
  { id: 'A1', rule: '大额提现',        condition: '单笔提现 > 100,000 USDT',        severity: '高',   triggers24h: 4,  lastTrigger: iso(days(0)), enabled: true },
  { id: 'A2', rule: '异常下单频率',    condition: '单用户 > 500 单/分钟',            severity: '中',   triggers24h: 12, lastTrigger: iso(days(0)), enabled: true },
  { id: 'A3', rule: '自成交检测',      condition: '同一用户买卖对敲',                severity: '严重', triggers24h: 1,  lastTrigger: iso(days(1)), enabled: true },
  { id: 'A4', rule: '价格偏离',        condition: '成交价偏离指数价 > 3%',           severity: '高',   triggers24h: 2,  lastTrigger: iso(days(0)), enabled: true },
  { id: 'A5', rule: '穿仓风险',        condition: '保险基金 24h 消耗 > 10%',         severity: '严重', triggers24h: 0,  lastTrigger: iso(days(6)), enabled: true },
  { id: 'A6', rule: '账本不平',        condition: '账面余额 ≠ 链上余额',             severity: '严重', triggers24h: 1,  lastTrigger: iso(days(0)), enabled: true },
  { id: 'A7', rule: '新地址大额提现',  condition: '首次使用地址且金额 > 10,000 USDT', severity: '高',   triggers24h: 3,  lastTrigger: iso(days(0)), enabled: true },
  { id: 'A8', rule: '同 IP 多账户',    condition: '同一 IP > 5 个账户登录',           severity: '中',   triggers24h: 8,  lastTrigger: iso(days(0)), enabled: false },
]

export const WAF_BLOCKED = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  blocked: Math.floor(r() * 8_000 + 200 + (i > 14 && i < 19 ? 24_000 : 0)),
}))
export const WAF_IPS = Array.from({ length: 12 }, (_, i) => ({
  ip: `${Math.floor(r() * 200 + 20)}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}`,
  country: pick(['RU', 'CN', 'US', 'BR', 'IN', 'VN', 'ID']),
  requests: Math.floor(r() * 90_000 + 1_000),
  reason: pick(['CC 攻击', 'SQL 注入尝试', '暴力破解', '爬虫', 'UDP Flood']),
  action: pick(['黑洞化', '拦截', '限速']),
  ts: iso(days(Math.floor(r() * 2))),
}))

/* ------------------------------ Dashboard series ---------------------------- */
export const SERIES = {
  turnover30d: Array.from({ length: 30 }, () => Math.floor(r() * 40_000_000 + 18_000_000)),
  register30d: Array.from({ length: 30 }, () => Math.floor(r() * 420 + 60)),
  login7d:     Array.from({ length: 7 },  () => Math.floor(r() * 8_000 + 2_400)),
  deposit30d:  Array.from({ length: 30 }, () => Math.floor(r() * 2_400_000 + 400_000)),
  withdraw30d: Array.from({ length: 30 }, () => Math.floor(r() * 1_800_000 + 300_000)),
}

export const KPI = {
  turnover24h: 42_184_922.44,
  turnoverDelta: 12.4,
  newUsers24h: 318,
  newUsersDelta: -4.2,
  pendingWithdrawals: WITHDRAWALS.filter(w => w.status === '待审核').length,
  pendingKyc: KYC_QUEUE.filter(k => k.status === '待审核').length,
  platformAssets: 8_412_882.10,
  insuranceFund: 1_284_421.88,
  insuranceFundDelta: 2.8,
  openInterest: 18_442_100.00,
  activeUsers24h: 4_218,
  feeRevenue24h: 42_188.42,
}

export const SYSTEM_HEALTH = [
  { name: '撮合引擎',   status: 'ok'   as const, detail: 'p99 1.2ms · 8,420 ops/s' },
  { name: 'WebSocket 网关', status: 'ok' as const, detail: '12,842 连接' },
  { name: '清结算服务', status: 'ok'   as const, detail: '队列积压 0' },
  { name: '风控引擎',   status: 'ok'   as const, detail: '扫描 4,218 仓位' },
  { name: '钱包服务',   status: 'warn' as const, detail: '⚠️ 第三方托管服务 — 链上扫描任务失败' },
  { name: '数据库',     status: 'ok'   as const, detail: '主从延迟 8ms' },
]

/* -------------------------------- Ops tools --------------------------------- */
export const GIFT_LOG = Array.from({ length: 18 }, (_, i) => ({
  id: `G${100 + i}`,
  batch: `BATCH-2026${String(Math.floor(r() * 9) + 1).padStart(2, '0')}`,
  uid: ADMIN_USERS[i].uid,
  coin: pick(['USDT', 'BTC', 'PLT']),
  amount: +(r() * 500 + 10).toFixed(2),
  reason: pick(['新用户注册奖励', '交易大赛奖励', '邀请活动', '补偿', '空投']),
  locked: r() > 0.6,
  operator: pick(['ops1', 'admin']),
  ts: iso(days(Math.floor(r() * 30))),
}))

export const HOLDERS = Array.from({ length: 26 }, (_, i) => ({
  uid: ADMIN_USERS[i].uid,
  amount: +(r() * 480_000 + 1_000).toFixed(2),
  lockedAmount: +(r() * 120_000).toFixed(2),
  share: +(r() * 3.8).toFixed(4),
  dividend30d: +(r() * 1_800).toFixed(2),
  tier: pick(['青铜', '白银', '黄金', '铂金', '钻石']),
}))

export const BANNERS = [
  { id: 'BN1', title: 'SUI/USDT 永续合约上线', link: '/notices/N1', sort: 1, platform: 'PC',  status: '已发布', start: '2026-07-10', end: '2026-07-30' },
  { id: 'BN2', title: '邀请返佣最高 50%',      link: '/broker',    sort: 2, platform: 'PC',  status: '已发布', start: '2026-07-01', end: '2026-08-01' },
  { id: 'BN3', title: '新用户注册送 20 USDT',  link: '/register',  sort: 3, platform: 'PC',  status: '草稿',   start: '2026-07-20', end: '2026-08-20' },
  { id: 'BN4', title: 'APP 新版本发布',        link: '/download',  sort: 1, platform: 'APP', status: '已发布', start: '2026-07-05', end: '2026-09-05' },
  { id: 'BN5', title: '合约交易大赛',          link: '/notices/N4',sort: 2, platform: 'APP', status: '已发布', start: '2026-07-12', end: '2026-07-26' },
]

export const APP_RELEASES = [
  { id: 'V1', version: '1.4.2', platform: 'iOS',     build: '20260710', size: '48.2 MB', force: false, status: '已发布', notes: '修复合约页面图表闪烁；优化下单响应速度', ts: iso(days(3)) },
  { id: 'V2', version: '1.4.2', platform: 'Android', build: '20260710', size: '42.8 MB', force: false, status: '已发布', notes: '同 iOS', ts: iso(days(3)) },
  { id: 'V3', version: '1.4.1', platform: 'iOS',     build: '20260622', size: '47.9 MB', force: true,  status: '已下架', notes: '安全更新：强制升级', ts: iso(days(21)) },
  { id: 'V4', version: '1.5.0', platform: 'iOS',     build: '20260714', size: '49.1 MB', force: false, status: '灰度中', notes: '新增图案锁；支持韩语', ts: iso(days(0)) },
]

export const PAYMENT_ORDERS = Array.from({ length: 16 }, (_, i) => ({
  id: `PO${7000 + i}`,
  uid: ADMIN_USERS[i].uid,
  channel: pick(['Stripe', 'Wise', 'Banxa', '银联']),
  fiat: pick(['USD', 'HKD', 'SGD']),
  amount: +(r() * 20_000 + 100).toFixed(2),
  coin: 'USDT',
  rate: +(r() * 0.2 + 0.9).toFixed(4),
  status: (i < 3 ? '处理中' : r() > 0.2 ? '已完成' : '失败') as string,
  ts: iso(days(Math.floor(r() * 20))),
}))
