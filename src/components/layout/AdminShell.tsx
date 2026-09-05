import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Settings2, Wallet, Users, BarChart3, Gift,
  Headphones, Wrench, Cog, ChevronDown, Menu, X, ArrowLeft, Shield,
} from 'lucide-react'
import { ADMIN_NAV } from '@/mock/funcList'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { ThemeToggle, LangSwitch } from './Shell'
import { t } from '@/lib/i18n'

const GROUP_ICON: Record<string, any> = {
  '交易配置': Settings2,
  '财务管理': Wallet,
  '用户管理': Users,
  '业务报表': BarChart3,
  '增值服务': Gift,
  '客服运营': Headphones,
  '运营工具': Wrench,
  '系统配置': Cog,
}

function Sidebar({ onNav }: { onNav?: () => void }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState<string[]>(() => {
    const g = ADMIN_NAV.find(g => g.items.some(i => i.route === pathname))
    return g ? [g.group] : ['交易配置']
  })
  const toggle = (g: string) =>
    setOpen(o => (o.includes(g) ? o.filter(x => x !== g) : [...o, g]))

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-4 flex items-center gap-2 border-b border-line shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand grid place-items-center">
          <Shield className="w-4 h-4 text-brand-ink" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold leading-none">管理后台</div>
          <div className="text-2xs text-faint mt-0.5">Admin Console</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin p-2">
        <NavLink
          to="/admin" end onClick={onNav}
          className={({ isActive }) => cn(
            'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm mb-1 transition-colors',
            isActive ? 'bg-brand/10 text-brand font-medium' : 'text-muted hover:bg-elevated hover:text-ink',
          )}
        >
          <LayoutDashboard className="w-4 h-4" />数据总览
        </NavLink>

        {ADMIN_NAV.map(g => {
          const Icon = GROUP_ICON[g.group] ?? Cog
          const isOpen = open.includes(g.group)
          const hasActive = g.items.some(i => i.route === pathname)
          return (
            <div key={g.group} className="mb-0.5">
              <button
                onClick={() => toggle(g.group)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors',
                  hasActive ? 'text-ink font-medium' : 'text-muted hover:bg-elevated hover:text-ink',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{t(g.group)}</span>
                <span className="text-2xs text-faint tnum">{g.items.length}</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="ml-3 pl-3 border-l border-line mt-0.5 space-y-px">
                  {g.items.map(i => (
                    <NavLink
                      key={i.id} to={i.route} onClick={onNav}
                      className={({ isActive }) => cn(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors',
                        isActive ? 'bg-elevated text-ink font-medium' : 'text-muted hover:text-ink hover:bg-elevated/60',
                      )}
                    >
                      <span className="flex-1 truncate">{t(i.name)}</span>
                      {i.status === 'q' && <span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0" title="待澄清" />}
                      {i.status === 'tpl' && <span className="w-1.5 h-1.5 rounded-full bg-line shrink-0" title="模板页" />}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="p-2 border-t border-line shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1 text-2xs text-faint">
          <span className="w-1.5 h-1.5 rounded-full bg-warn" />待澄清
          <span className="w-1.5 h-1.5 rounded-full bg-line ml-2" />模板页
        </div>
        <Link
          to="/" onClick={onNav}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted hover:bg-elevated hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />返回前台
        </Link>
      </div>
    </div>
  )
}

export function AdminShell() {
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()
  const page = ADMIN_NAV.flatMap(g => g.items).find(i => i.route === pathname)

  return (
    <div className="min-h-screen bg-bg flex">
      <aside className="hidden lg:block w-60 shrink-0 border-r border-line bg-surface sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 inset-y-0 w-64 bg-surface border-r border-line animate-fade-in">
            <Sidebar onNav={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur border-b border-line
                           flex items-center gap-2 px-3 sm:px-5">
          <button onClick={() => setDrawer(true)} className="lg:hidden w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-ink">
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {page ? `${t(page.group)} / ${t(page.cls)}` : t('数据总览')}
            </div>
            {page && <div className="text-2xs text-faint truncate">{page.id} · {t(page.name)}</div>}
          </div>
          <div className="flex-1" />
          {page?.status === 'q' && <Badge tone="warn">待澄清</Badge>}
          {page?.status === 'tpl' && <Badge tone="muted">模板页</Badge>}
          <LangSwitch />
          <ThemeToggle />
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-line">
            <div className="w-7 h-7 rounded-full bg-info/10 text-info grid place-items-center text-2xs font-bold">A</div>
            <div className="hidden sm:block leading-tight">
              <div className="text-xs font-medium">admin</div>
              <div className="text-2xs text-faint">超级管理员</div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
