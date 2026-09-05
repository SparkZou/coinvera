import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Sun, Moon, Globe, Menu, X, Bell, ChevronDown, LayoutGrid,
  CandlestickChart, Wallet, TrendingUp, ListChecks, Users, User,
  Settings, LogOut, Smartphone, Shield, KeyRound, FileText, Gift,
} from 'lucide-react'
import { usePrefs, LANGS, type Lang } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import { Button, Badge } from '@/components/ui'
import { INBOX, USER } from '@/mock/account'

/* ---------------------------- Theme + Language ----------------------------- */
export function ThemeToggle() {
  const { theme, toggleTheme } = usePrefs()
  return (
    <button
      onClick={toggleTheme}
      title="深色版 / 浅色版"
      className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-ink hover:bg-elevated transition-colors"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

export function LangSwitch() {
  const { lang, setLang } = usePrefs()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 px-2 flex items-center gap-1 rounded-lg text-muted hover:text-ink hover:bg-elevated transition-colors"
      >
        <Globe className="w-4 h-4" />
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-40 card p-1 shadow-2xl z-50 animate-fade-in">
          {LANGS.map(l => (
            <button
              key={l.id}
              onClick={() => { setLang(l.id as Lang); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors',
                lang === l.id ? 'bg-elevated text-ink font-medium' : 'text-muted hover:bg-elevated hover:text-ink',
              )}
            >
              <span>{l.flag}</span><span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* --------------------------------- Top nav --------------------------------- */
const NAV = [
  { to: '/markets', label: '行情', key: 'nav.markets' },
  { to: '/trade/spot/BTC-USDT', label: '币币交易', key: 'nav.spot', match: '/trade/spot' },
  { to: '/trade/futures/BTC-USDT', label: '合约交易', key: 'nav.futures', match: '/trade/futures' },
  { to: '/assets', label: '资产', key: 'nav.assets' },
  { to: '/orders', label: '订单', key: 'nav.orders' },
  { to: '/broker', label: '返佣', key: 'nav.broker' },
]

const MORE = [
  { to: '/notices', label: '公告中心', icon: FileText },
  { to: '/account/kyc', label: '实名认证', icon: Shield },
  { to: '/account/api', label: 'API 管理', icon: KeyRound },
  { to: '/account/invite', label: '邀请好友', icon: Gift },
  { to: '/download', label: 'APP 下载', icon: Smartphone },
  { to: '/coverage', label: '功能覆盖清单', icon: ListChecks },
]

export function TopNav() {
  const { t } = usePrefs()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const [more, setMore] = useState(false)
  const unread = INBOX.filter(m => !m.read).length

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-surface/95 backdrop-blur border-b border-line">
        <div className="h-full px-3 sm:px-5 flex items-center gap-1">
          <Link to="/" className="flex items-center gap-2 pr-3 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-brand grid place-items-center">
              <CandlestickChart className="w-4 h-4 text-brand-ink" />
            </div>
            <span className="font-bold text-base tracking-tight hidden sm:block">EXCHANGE</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV.map(n => {
              const active = pathname.startsWith(n.match ?? n.to)
              return (
                <Link
                  key={n.to} to={n.to}
                  className={cn(
                    'px-3 h-9 flex items-center rounded-lg text-sm transition-colors',
                    active ? 'text-ink font-semibold bg-elevated' : 'text-muted hover:text-ink',
                  )}
                >
                  {t(n.label)}
                </Link>
              )
            })}
            <div className="relative">
              <button
                onClick={() => setMore(o => !o)}
                onBlur={() => setTimeout(() => setMore(false), 150)}
                className="px-3 h-9 flex items-center gap-1 rounded-lg text-sm text-muted hover:text-ink transition-colors"
              >
                更多 <ChevronDown className="w-3 h-3" />
              </button>
              {more && (
                <div className="absolute left-0 top-10 w-48 card p-1 shadow-2xl z-50 animate-fade-in">
                  {MORE.map(m => (
                    <Link
                      key={m.to} to={m.to} onClick={() => setMore(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted hover:bg-elevated hover:text-ink transition-colors"
                    >
                      <m.icon className="w-3.5 h-3.5" />{t(m.label)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex-1" />

          <Link
            to="/admin"
            className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs text-muted hover:text-ink hover:bg-elevated transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5" />管理后台
          </Link>

          <Link to="/inbox" className="relative w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-ink hover:bg-elevated transition-colors">
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-down" />
            )}
          </Link>

          <LangSwitch />
          <ThemeToggle />

          <Link to="/account" className="hidden sm:flex items-center gap-2 h-9 pl-2 pr-3 ml-1 rounded-lg hover:bg-elevated transition-colors">
            <div className="w-6 h-6 rounded-full bg-brand/10 text-brand grid place-items-center text-2xs font-bold">
              {USER.nickname[0]}
            </div>
            <div className="text-left leading-tight">
              <div className="text-2xs text-muted">UID {USER.uid}</div>
            </div>
            <Badge tone="brand">VIP{USER.vipLevel}</Badge>
          </Link>

          <button onClick={() => setMenu(true)} className="lg:hidden w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-ink">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenu(false)} />
          <div className="absolute right-0 inset-y-0 w-72 bg-surface border-l border-line p-4 animate-fade-in overflow-y-auto scroll-thin">
            <div className="flex items-center justify-between mb-5">
              <span className="font-semibold">菜单</span>
              <button onClick={() => setMenu(false)} className="text-muted hover:text-ink"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-1">
              {[...NAV.map(n => ({ to: n.to, label: n.label })), ...MORE.map(m => ({ to: m.to, label: m.label })),
                { to: '/admin', label: '管理后台' }].map(n => (
                <Link
                  key={n.to} to={n.to} onClick={() => setMenu(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm text-muted hover:bg-elevated hover:text-ink transition-colors"
                >
                  {t(n.label)}
                </Link>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-line flex gap-2">
              <Link to="/login" className="flex-1" onClick={() => setMenu(false)}>
                <Button variant="outline" className="w-full">登录</Button>
              </Link>
              <Link to="/register" className="flex-1" onClick={() => setMenu(false)}>
                <Button className="w-full">注册</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------ Mobile bottom ------------------------------ */
const TABS = [
  { to: '/markets', label: '行情', icon: TrendingUp },
  { to: '/trade/spot/BTC-USDT', label: '交易', icon: CandlestickChart, match: '/trade' },
  { to: '/orders', label: '订单', icon: ListChecks },
  { to: '/assets', label: '资产', icon: Wallet },
  { to: '/account', label: '我的', icon: User },
]

export function MobileTabs() {
  const { pathname } = useLocation()
  const { t } = usePrefs()
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-surface/95 backdrop-blur border-t border-line
                    flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {TABS.map(tab => {
        const active = pathname.startsWith(tab.match ?? tab.to)
        return (
          <Link
            key={tab.to} to={tab.to}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
              active ? 'text-brand' : 'text-faint',
            )}
          >
            <tab.icon className="w-[18px] h-[18px]" />
            <span className="text-2xs">{t(tab.label)}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/* --------------------------------- Footer ---------------------------------- */
export function Footer() {
  return (
    <footer className="border-t border-line mt-12 py-8 px-5">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
        {[
          { h: '关于', items: ['关于我们', '公告中心', '费率标准', '服务条款'] },
          { h: '产品', items: ['币币交易', '合约交易', '经纪人计划', 'API 文档'] },
          { h: '服务', items: ['帮助中心', '提交工单', '手续费', '上币申请'] },
          { h: '合规', items: ['隐私政策', 'KYC/AML 政策', '风险提示', '受限地区'] },
        ].map(c => (
          <div key={c.h}>
            <div className="font-semibold mb-2.5 text-ink">{c.h}</div>
            <ul className="space-y-1.5">
              {c.items.map(i => <li key={i} className="text-muted hover:text-ink cursor-pointer transition-colors">{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <span className="text-2xs text-faint">© 2026 Exchange · 原型演示 (Prototype) · 数据均为模拟</span>
        <div className="flex items-center gap-2">
          <LangSwitch /><ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
