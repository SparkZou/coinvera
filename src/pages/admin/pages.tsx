/* ------------------------------------------------------------------ *
 * Barrel for the back-office. App.tsx imports `* as A` from here.
 * The 73 pages of Annex 1 are split across g1–g4 by group.
 * ------------------------------------------------------------------ */

export { Dashboard } from './g1'

/* 交易配置 (14) + 财务管理 (7) */
export {
  Coins, Pairs, SpotOrders, MarginRules, MarginOrders, FuturesCoins, FuturesPairs,
  FeeRates, FeeDiscount, PlatformToken,
  Deposits, Withdrawals, NoAudit, WithdrawNotes,
  BalanceSheet, Cashflow, Pnl, TransferTool, TransferLog, ReconTool, AdjustLog,
} from './g1'

/* 用户管理 (6) + 业务报表 (7) + 增值服务 (4) */
export {
  Users, KycReview, KycConfig, UserTradeSummary, UserPositionSummary, UserLedgerSummary,
  ReportSpot, ReportFuturesPosition, ReportFuturesClose, ReportRegister, ReportLogin,
  ReportDeposit, ReportWithdraw,
  BrokerManage, BrokerCommission, BrokerPosition, BrokerRoles,
} from './g2'

/* 客服运营 (8) + 运营工具 (10) */
export {
  CmsNotices, CmsArticles, CmsCategories, CmsInbox, BannerPc, BannerApp, Tickets, Upload,
  Gift, GiftLog, HoldingRules, HoldingLog, Holders, HoldingStats, DividendHistory,
  Lock, Unlock, GiftLock,
} from './g3'

/* 系统配置 (17) + 风控安全 (3) */
export {
  Staff, Roles, Permissions, SysLogs, I18n, I18nTemplate, Kv, WalletConfig,
  AppRelease, AppVersionLog, AppEntries, ApiConfig, ApiWhitelist, PaymentOrders,
  Cron, CronLogs, SysLanguage,
  RiskHedge, RiskAlerts, RiskWaf,
} from './g4'
