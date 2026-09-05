import { t } from '@/lib/i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, ShieldCheck, Gauge, Gift, Languages, Smartphone,
  Sparkles, Star, ChevronRight, Apple, LayoutGrid,
} from 'lucide-react'
import { TICKERS } from '@/mock/market'
import { Button, Card, Badge } from '@/components/ui'
import { Sparkline } from '@/components/charts'
import { cn, num, pct, compact, priceDp } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 首页 — Hero + 轮播图 (后台 CMS 管理) + 热门市场 + 功能亮点 + APP 下载
 * Function List: 基本功能 → 首页 / 轮播图 / 热门市场 / APP 下载入口
 * ------------------------------------------------------------------ */

const route = (symbol: string) => `/trade/spot/${symbol.replace('/', '-')}`

type Token = 'brand' | 'info' | 'up'

const SLIDES: {
  id: string; eyebrow: string; title: string; sub: string
  cta: string; to: string; token: Token
}[] = [
  {
    id: 'b1', eyebrow: '新币上线',
    title: 'SUI/USDT 永续合约现已开放',
    sub: '最高 50× 杠杆 · 挂单手续费低至 0.008% · 7-15 12:00 (UTC+8) 开放',
    cta: '立即交易', to: '/trade/futures/SUI-USDT', token: 'brand',
  },
  {
    id: 'b2', eyebrow: '经纪人计划',
    title: '邀请好友，最高 50% 手续费返佣',
    sub: '三级返佣结构 · 佣金实时到账 · 专属邀请码与推广素材',
    cta: '查看返佣', to: '/broker', token: 'info',
  },
  {
    id: 'b3', eyebrow: '安全合规',
    title: '100% 储备金证明 · 冷热钱包分离',
    sub: '多签冷存储 · 风控引擎 7×24 监控 · KYC/AML 全流程合规',
    cta: '了解安全体系', to: '/account/security', token: 'up',
  },
]

const FEATURES = [
  { icon: LayoutGrid, title: '币币交易', desc: '深度聚合撮合引擎，毫秒级成交，支持限价 / 市价 / 止盈止损', to: '/trade/spot/BTC-USDT' },
  { icon: Gauge, title: '合约交易 125×', desc: 'U 本位永续合约，全仓 / 逐仓，最高 125 倍杠杆与实时强平预警', to: '/trade/futures/BTC-USDT' },
  { icon: Gift, title: '邀请返佣', desc: '三级经纪人体系，现货 30% / 合约 40% 起，佣金 T+0 结算', to: '/broker' },
  { icon: Languages, title: '多语言 · 多主题', desc: '简体中文 / English / 日本語 / 한국어，深色与浅色双主题', to: '/coverage' },
]

export default function Home() {
  const nav = useNavigate()
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const [email, setEmail] = useState('')
  const timer = useRef<number | null>(null)

  /* Auto-advance the carousel (轮播图) — pauses on hover. */
  useEffect(() => {
    if (paused) return
    timer.current = window.setTimeout(() => setSlide(s => (s + 1) % SLIDES.length), 5000)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [slide, paused])

  const hot = useMemo(
    () => [...TICKERS].sort((a, b) => b.turnover - a.turnover).slice(0, 8),
    [],
  )
  const vol24 = useMemo(() => TICKERS.reduce((s, t) => s + t.turnover, 0), [])

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(70% 90% at 85% 15%, rgb(var(--brand) / 0.16), transparent 60%),' +
              'radial-gradient(60% 80% at 10% 90%, rgb(var(--info) / 0.10), transparent 60%)',
          }}
        />
        <div className="relative px-5 sm:px-10 py-10 sm:py-16 grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
          <div>
            <Badge tone="brand" className="mb-4">
              <Sparkles className="w-3 h-3" />全新 v1.4.2 已发布
            </Badge>
            <h1 className="text-3xl sm:text-5xl font-bold leading-[1.15] tracking-tight">
              在一个账户里
              <br className="hidden sm:block" />
              <span className="text-brand">交易全球数字资产</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed max-w-lg">
              现货、永续合约、法币通道与经纪人返佣，运行于同一套撮合与风控引擎之上。
              为机构级深度而生，也为第一次下单的你而设计。
            </p>

            {/* Sign-up CTA */}
            <div className="mt-7 flex flex-col sm:flex-row gap-2.5 max-w-lg">
              <div className="flex-1 flex items-center h-12 px-4 rounded-xl bg-elevated border border-line focus-within:border-brand transition-colors">
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="输入邮箱或手机号"
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-faint"
                />
              </div>
              <Button size="lg" className="shrink-0" onClick={() => nav('/register')}>
                立即注册 <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="mt-2.5 text-2xs text-faint">
              注册即代表同意《服务条款》与《隐私政策》 · 已有账户？
              <Link to="/login" className="text-brand hover:underline ml-1">登录</Link>
            </p>

            {/* Trust stats */}
            <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6 max-w-lg">
              {[
                { label: '24h 成交额', value: '$' + compact(vol24) },
                { label: '上币数', value: String(TICKERS.length), hint: '现货 + 永续' },
                { label: '注册用户', value: '2.4M+', hint: '覆盖 130 个国家' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-lg sm:text-2xl font-semibold tnum">{s.value}</div>
                  <div className="text-2xs text-muted mt-0.5">{s.label}</div>
                  {s.hint && <div className="text-2xs text-faint hidden sm:block">{s.hint}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Hero art — a live-looking ticker stack */}
          <div className="hidden lg:block">
            <Card className="p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold">实时行情</span>
                <span className="flex items-center gap-1.5 text-2xs text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
                  WebSocket 已连接
                </span>
              </div>
              <div className="space-y-1">
                {hot.slice(0, 5).map(t => (
                  <Link
                    key={t.symbol} to={route(t.symbol)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-elevated transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-elevated grid place-items-center text-2xs font-bold shrink-0">
                      {t.base.slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium w-24">{t.symbol}</span>
                    <Sparkline data={t.sparkline} up={t.change >= 0} className="flex-1 h-6" />
                    <span className="text-sm tnum w-24 text-right">{num(t.price, priceDp(t.price))}</span>
                    <span className={cn('text-xs tnum w-16 text-right font-medium', t.change >= 0 ? 'text-up' : 'text-down')}>
                      {pct(t.change)}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ----------------------------- 轮播图 ------------------------------ */}
      <section
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="relative h-60 sm:h-56 rounded-2xl border border-line bg-surface overflow-hidden">
          {SLIDES.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                'absolute inset-0 transition-opacity duration-700',
                i === slide ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(90% 140% at 88% 50%, rgb(var(--${s.token}) / 0.20), transparent 62%)`,
                }}
              />
              {/* Decorative rings */}
              <div className="absolute -right-16 top-1/2 -translate-y-1/2 hidden sm:block">
                {[0, 1, 2].map(r => (
                  <div
                    key={r}
                    className="absolute rounded-full border"
                    style={{
                      width: 150 + r * 90, height: 150 + r * 90,
                      left: -(75 + r * 45), top: -(75 + r * 45),
                      borderColor: `rgb(var(--${s.token}) / ${0.28 - r * 0.08})`,
                    }}
                  />
                ))}
              </div>

              <div className="relative h-full flex flex-col justify-center px-5 sm:px-10 max-w-2xl">
                <Badge tone={s.token === 'brand' ? 'brand' : s.token === 'info' ? 'info' : 'up'} className="self-start mb-3">
                  {t(s.eyebrow)}
                </Badge>
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight leading-snug">{t(s.title)}</h2>
                <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">{t(s.sub)}</p>
                <Link to={s.to} className="mt-5 self-start">
                  <Button variant="outline">{t(s.cta)}<ChevronRight className="w-4 h-4" /></Button>
                </Link>
              </div>
            </div>
          ))}

          {/* Dots */}
          <div className="absolute bottom-4 right-5 flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSlide(i)}
                aria-label={`第 ${i + 1} 张`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === slide ? 'w-6 bg-brand' : 'w-1.5 bg-line hover:bg-faint',
                )}
              />
            ))}
          </div>
          <span className="absolute bottom-3.5 left-5 text-2xs text-faint hidden sm:block">
            轮播图内容由后台「客服运营 → PC 轮播图」配置
          </span>
        </div>
      </section>

      {/* --------------------------- 热门市场 ------------------------------ */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">热门市场</h2>
            <p className="text-xs text-muted mt-1">按 24h 成交额排序 · 数据每秒刷新</p>
          </div>
          <Link to="/markets" className="text-xs text-brand hover:underline flex items-center gap-1 shrink-0">
            查看全部行情 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-2xs text-muted">
                  {['币对', '最新价', '24h 涨跌', '24h 成交额', '24h 走势', ''].map((h, i) => (
                    <th
                      key={h + i}
                      className={cn(
                        'font-medium px-4 py-2.5 border-b border-line whitespace-nowrap',
                        i === 0 || i === 5 ? 'text-left' : i === 4 ? 'text-center' : 'text-right',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hot.map(t => (
                  <tr
                    key={t.symbol}
                    onClick={() => nav(route(t.symbol))}
                    className="border-b border-line/60 last:border-0 hover:bg-elevated transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-elevated grid place-items-center text-2xs font-bold">
                          {t.base.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1.5">
                            {t.base}<span className="text-faint font-normal">/{t.quote}</span>
                            {t.tags?.includes('hot') && <Badge tone="down">HOT</Badge>}
                            {t.tags?.includes('new') && <Badge tone="info">NEW</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tnum font-medium">{num(t.price, priceDp(t.price))}</td>
                    <td className={cn('px-4 py-3 text-right tnum font-medium', t.change >= 0 ? 'text-up' : 'text-down')}>
                      {pct(t.change)}
                    </td>
                    <td className="px-4 py-3 text-right tnum text-muted">${compact(t.turnover)}</td>
                    <td className="px-4 py-3">
                      <Sparkline data={t.sparkline} up={t.change >= 0} className="w-28 h-7 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="subtle" onClick={e => { e.stopPropagation(); nav(route(t.symbol)) }}>
                        交易
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-line/60">
            {hot.map(t => (
              <Link key={t.symbol} to={route(t.symbol)} className="flex items-center gap-3 px-4 py-3 active:bg-elevated">
                <div className="w-8 h-8 rounded-full bg-elevated grid place-items-center text-2xs font-bold shrink-0">
                  {t.base.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t.base}<span className="text-faint">/{t.quote}</span></div>
                  <div className="text-2xs text-muted tnum">${compact(t.turnover)}</div>
                </div>
                <Sparkline data={t.sparkline} up={t.change >= 0} className="w-14 h-6 shrink-0" />
                <div className="text-right shrink-0 w-24">
                  <div className="text-sm tnum font-medium">{num(t.price, priceDp(t.price))}</div>
                  <div className={cn('text-2xs tnum', t.change >= 0 ? 'text-up' : 'text-down')}>{pct(t.change)}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      {/* ---------------------------- 功能亮点 ----------------------------- */}
      <section>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map(f => (
            <Link key={f.title} to={f.to}>
              <Card className="p-5 h-full hover:border-brand/50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand grid place-items-center mb-3">
                  <f.icon className="w-[18px] h-[18px]" />
                </div>
                <div className="font-semibold text-sm flex items-center gap-1">
                  {t(f.title)}
                  <ArrowRight className="w-3.5 h-3.5 text-faint opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">{t(f.desc)}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------- 下载 APP ----------------------------- */}
      <section>
        <Card className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(70% 120% at 90% 40%, rgb(var(--brand) / 0.14), transparent 60%)' }}
          />
          <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-brand" />
                <span className="text-xs text-brand font-semibold">移动端</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">随时随地，掌上交易</h2>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                iOS 与 Android 全功能客户端 — 行情推送、指纹 / 图案解锁、一键下单与实时强平预警。
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link to="/download">
                  <Button><Apple className="w-4 h-4" />App Store</Button>
                </Link>
                <Link to="/download">
                  <Button variant="outline"><Smartphone className="w-4 h-4" />Android APK</Button>
                </Link>
                <Link to="/app-preview" className="text-xs text-muted hover:text-ink ml-1 flex items-center gap-1">
                  App 端交互预览 <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-5 shrink-0">
              <div className="hidden sm:flex flex-col gap-1.5">
                {['行情推送 & 价格预警', '指纹 / 图案 / 人脸解锁', '合约仓位实时监控'].map(x => (
                  <div key={x} className="flex items-center gap-2 text-xs text-muted">
                    <ShieldCheck className="w-3.5 h-3.5 text-up shrink-0" />{x}
                  </div>
                ))}
              </div>
              <Link to="/download" className="shrink-0">
                <div className="w-28 h-28 rounded-xl border border-line bg-surface p-2.5 grid place-items-center hover:border-brand transition-colors">
                  <MiniQR />
                </div>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Footnote for the client */}
      <p className="text-2xs text-faint flex items-center gap-1.5">
        <Star className="w-3 h-3" />
        首页 Banner、热门市场排序与下载入口均为后台可配置项 — 详见
        <Link to="/coverage" className="text-brand hover:underline">功能覆盖清单</Link>
      </p>
    </div>
  )
}

/* Deterministic QR-looking grid (no network, no image). */
function MiniQR() {
  const N = 21
  const cells = useMemo(() => {
    const m: boolean[][] = Array.from({ length: N }, () => Array<boolean>(N).fill(false))
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4
        m[oy + y][ox + x] = edge || core
      }
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7)
    let s = 20260713 >>> 0
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8)
      if (!inFinder) m[y][x] = rnd() > 0.52
    }
    return m
  }, [])

  return (
    <svg viewBox={`0 0 ${N} ${N}`} className="w-full h-full" shapeRendering="crispEdges">
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="rgb(var(--ink))" /> : null,
        ),
      )}
    </svg>
  )
}
