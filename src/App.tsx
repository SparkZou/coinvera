import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TopNav, MobileTabs, Footer } from '@/components/layout/Shell'
import { AdminShell } from '@/components/layout/AdminShell'
import { useEffect } from 'react'

/* Public */
import Home from '@/pages/public/Home'
import Markets from '@/pages/public/Markets'
import Notices from '@/pages/public/Notices'
import Inbox from '@/pages/public/Inbox'
import Download from '@/pages/public/Download'
import AppPreview from '@/pages/public/AppPreview'
import Coverage from '@/pages/public/Coverage'

/* Auth */
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Forgot from '@/pages/auth/Forgot'

/* Trade */
import Spot from '@/pages/trade/Spot'
import Futures from '@/pages/trade/Futures'

/* Assets & Orders */
import Assets from '@/pages/assets/Assets'
import Deposit from '@/pages/assets/Deposit'
import Withdraw from '@/pages/assets/Withdraw'
import Transfer from '@/pages/assets/Transfer'
import History from '@/pages/assets/History'
import Orders from '@/pages/assets/Orders'

/* Account */
import Account from '@/pages/account/Account'
import Security from '@/pages/account/Security'
import Kyc from '@/pages/account/Kyc'
import ApiKeys from '@/pages/account/Api'
import Logs from '@/pages/account/Logs'
import Invite from '@/pages/account/Invite'
import Broker from '@/pages/account/Broker'

/* Admin */
import * as A from '@/pages/admin/pages'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

/** Front-office chrome: top nav + mobile bottom tabs. */
function Site({ children, footer = true, pad = true }: { children: React.ReactNode; footer?: boolean; pad?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <TopNav />
      <main className={pad ? 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-5 py-5 pb-20 lg:pb-5' : 'flex-1 pb-14 lg:pb-0'}>
        {children}
      </main>
      {footer && <div className="pb-14 lg:pb-0"><Footer /></div>}
      <MobileTabs />
    </div>
  )
}

/** Trading terminal: full-bleed, no footer. */
const Terminal = ({ children }: { children: React.ReactNode }) => (
  <Site footer={false} pad={false}>{children}</Site>
)

/** Auth: centred card, no chrome. */
const Bare = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-bg grid place-items-center p-4">{children}</div>
)

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        {/* ---------------------------- Front office ---------------------------- */}
        <Route path="/"          element={<Site><Home /></Site>} />
        <Route path="/markets"   element={<Site><Markets /></Site>} />
        <Route path="/notices"   element={<Site><Notices /></Site>} />
        <Route path="/inbox"     element={<Site><Inbox /></Site>} />
        <Route path="/download"  element={<Site><Download /></Site>} />
        <Route path="/app-preview" element={<Site><AppPreview /></Site>} />
        <Route path="/coverage"  element={<Site><Coverage /></Site>} />

        {/* Trading terminal */}
        <Route path="/trade/spot/:symbol"    element={<Terminal><Spot /></Terminal>} />
        <Route path="/trade/futures/:symbol" element={<Terminal><Futures /></Terminal>} />
        <Route path="/trade/spot"    element={<Navigate to="/trade/spot/BTC-USDT" replace />} />
        <Route path="/trade/futures" element={<Navigate to="/trade/futures/BTC-USDT" replace />} />

        {/* Assets & orders */}
        <Route path="/assets"          element={<Site><Assets /></Site>} />
        <Route path="/assets/deposit"  element={<Site><Deposit /></Site>} />
        <Route path="/assets/withdraw" element={<Site><Withdraw /></Site>} />
        <Route path="/assets/transfer" element={<Site><Transfer /></Site>} />
        <Route path="/assets/history"  element={<Site><History /></Site>} />
        <Route path="/orders"          element={<Site><Orders /></Site>} />

        {/* Account */}
        <Route path="/account"          element={<Site><Account /></Site>} />
        <Route path="/account/security" element={<Site><Security /></Site>} />
        <Route path="/account/kyc"      element={<Site><Kyc /></Site>} />
        <Route path="/account/api"      element={<Site><ApiKeys /></Site>} />
        <Route path="/account/logs"     element={<Site><Logs /></Site>} />
        <Route path="/account/invite"   element={<Site><Invite /></Site>} />
        <Route path="/broker"           element={<Site><Broker /></Site>} />

        {/* Auth */}
        <Route path="/login"    element={<Bare><Login /></Bare>} />
        <Route path="/register" element={<Bare><Register /></Bare>} />
        <Route path="/forgot"   element={<Bare><Forgot /></Bare>} />

        {/* ----------------------------- Back office ---------------------------- */}
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<A.Dashboard />} />

          {/* 交易配置 (14) */}
          <Route path="trade/coins"          element={<A.Coins />} />
          <Route path="trade/pairs"          element={<A.Pairs />} />
          <Route path="trade/spot-orders"    element={<A.SpotOrders />} />
          <Route path="trade/margin-rules"   element={<A.MarginRules />} />
          <Route path="trade/margin-orders"  element={<A.MarginOrders />} />
          <Route path="trade/futures-coins"  element={<A.FuturesCoins />} />
          <Route path="trade/futures-pairs"  element={<A.FuturesPairs />} />
          <Route path="fee/rates"            element={<A.FeeRates />} />
          <Route path="fee/discount"         element={<A.FeeDiscount />} />
          <Route path="fee/platform-token"   element={<A.PlatformToken />} />
          <Route path="wallet/deposits"      element={<A.Deposits />} />
          <Route path="wallet/withdrawals"   element={<A.Withdrawals />} />
          <Route path="wallet/no-audit"      element={<A.NoAudit />} />
          <Route path="wallet/notes"         element={<A.WithdrawNotes />} />

          {/* 财务管理 (7) */}
          <Route path="finance/balance-sheet" element={<A.BalanceSheet />} />
          <Route path="finance/cashflow"      element={<A.Cashflow />} />
          <Route path="finance/pnl"           element={<A.Pnl />} />
          <Route path="finance/transfer-tool" element={<A.TransferTool />} />
          <Route path="finance/transfer-log"  element={<A.TransferLog />} />
          <Route path="finance/recon-tool"    element={<A.ReconTool />} />
          <Route path="finance/adjust-log"    element={<A.AdjustLog />} />

          {/* 用户管理 (6) */}
          <Route path="users"                  element={<A.Users />} />
          <Route path="users/kyc-review"       element={<A.KycReview />} />
          <Route path="users/kyc-config"       element={<A.KycConfig />} />
          <Route path="users/trade-summary"    element={<A.UserTradeSummary />} />
          <Route path="users/position-summary" element={<A.UserPositionSummary />} />
          <Route path="users/ledger-summary"   element={<A.UserLedgerSummary />} />

          {/* 业务报表 (7) */}
          <Route path="reports/spot"             element={<A.ReportSpot />} />
          <Route path="reports/futures-position" element={<A.ReportFuturesPosition />} />
          <Route path="reports/futures-close"    element={<A.ReportFuturesClose />} />
          <Route path="reports/register"         element={<A.ReportRegister />} />
          <Route path="reports/login"            element={<A.ReportLogin />} />
          <Route path="reports/deposit"          element={<A.ReportDeposit />} />
          <Route path="reports/withdraw"         element={<A.ReportWithdraw />} />

          {/* 增值服务 (4) */}
          <Route path="broker/manage"     element={<A.BrokerManage />} />
          <Route path="broker/commission" element={<A.BrokerCommission />} />
          <Route path="broker/position"   element={<A.BrokerPosition />} />
          <Route path="broker/roles"      element={<A.BrokerRoles />} />

          {/* 客服运营 (8) */}
          <Route path="cms/notices"    element={<A.CmsNotices />} />
          <Route path="cms/articles"   element={<A.CmsArticles />} />
          <Route path="cms/categories" element={<A.CmsCategories />} />
          <Route path="cms/inbox"      element={<A.CmsInbox />} />
          <Route path="cms/banner-pc"  element={<A.BannerPc />} />
          <Route path="cms/banner-app" element={<A.BannerApp />} />
          <Route path="cms/tickets"    element={<A.Tickets />} />
          <Route path="cms/upload"     element={<A.Upload />} />

          {/* 运营工具 (10) */}
          <Route path="ops/gift"                 element={<A.Gift />} />
          <Route path="ops/gift-log"             element={<A.GiftLog />} />
          <Route path="ops/holding-reward-rules" element={<A.HoldingRules />} />
          <Route path="ops/holding-reward-log"   element={<A.HoldingLog />} />
          <Route path="ops/holders"              element={<A.Holders />} />
          <Route path="ops/holding-stats"        element={<A.HoldingStats />} />
          <Route path="ops/dividend-history"     element={<A.DividendHistory />} />
          <Route path="ops/lock"                 element={<A.Lock />} />
          <Route path="ops/unlock"               element={<A.Unlock />} />
          <Route path="ops/gift-lock"            element={<A.GiftLock />} />

          {/* 系统配置 (17) */}
          <Route path="sys/staff"           element={<A.Staff />} />
          <Route path="sys/roles"           element={<A.Roles />} />
          <Route path="sys/permissions"     element={<A.Permissions />} />
          <Route path="sys/logs"            element={<A.SysLogs />} />
          <Route path="sys/i18n"            element={<A.I18n />} />
          <Route path="sys/i18n-template"   element={<A.I18nTemplate />} />
          <Route path="sys/kv"              element={<A.Kv />} />
          <Route path="sys/wallet"          element={<A.WalletConfig />} />
          <Route path="sys/app-release"     element={<A.AppRelease />} />
          <Route path="sys/app-version-log" element={<A.AppVersionLog />} />
          <Route path="sys/app-entries"     element={<A.AppEntries />} />
          <Route path="sys/api-config"      element={<A.ApiConfig />} />
          <Route path="sys/api-whitelist"   element={<A.ApiWhitelist />} />
          <Route path="sys/payment-orders"  element={<A.PaymentOrders />} />
          <Route path="sys/cron"            element={<A.Cron />} />
          <Route path="sys/cron-logs"       element={<A.CronLogs />} />
          <Route path="sys/language"        element={<A.SysLanguage />} />

          {/* 风控 / 安全 (前台功能表 F-50..F-53 的后台落点) */}
          <Route path="risk/hedge"  element={<A.RiskHedge />} />
          <Route path="risk/alerts" element={<A.RiskAlerts />} />
          <Route path="risk/waf"    element={<A.RiskWaf />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
