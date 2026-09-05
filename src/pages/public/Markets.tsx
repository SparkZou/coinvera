import { t } from '@/lib/i18n'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Star, ChevronUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react'
import { TICKERS, MARKET_GROUPS, type Ticker } from '@/mock/market'
import { Button, Card, Badge, SearchBox, Select, PageHeader, Tabs } from '@/components/ui'
import { Sparkline } from '@/components/charts'
import { cn, num, pct, compact, priceDp } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 行情 / 市场选择 — Function List F-18
 *   · 多市场 (自选 / USDT / BTC / 热门 / 新币)
 *   · 自选币对 (本地收藏，正式版存用户维度)
 *   · 法币价格换算 (USD / HKD / CNY / JPY)
 * ------------------------------------------------------------------ */

const route = (symbol: string) => `/trade/spot/${symbol.replace('/', '-')}`

/** 法币汇率 — 正式版由后台「系统配置 → 汇率」下发。 */
const FIATS = [
  { id: 'USD', sym: '$', rate: 1, label: 'USD 美元' },
  { id: 'HKD', sym: 'HK$', rate: 7.8124, label: 'HKD 港币' },
  { id: 'CNY', sym: '¥', rate: 7.2418, label: 'CNY 人民币' },
  { id: 'JPY', sym: '¥', rate: 157.28, label: 'JPY 日元' },
] as const

type FiatId = typeof FIATS[number]['id']
type SortKey = 'symbol' | 'price' | 'change' | 'high' | 'low' | 'volume' | 'turnover'

export default function Markets() {
  const nav = useNavigate()
  const [group, setGroup] = useState(MARKET_GROUPS[1].id)   // default USDT
  const [q, setQ] = useState('')
  const [fiat, setFiat] = useState<FiatId>('USD')
  const [favs, setFavs] = useState<string[]>(() => MARKET_GROUPS[0].symbols)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'turnover', dir: 'desc' })

  const cur = FIATS.find(f => f.id === fiat)!
  const toFiat = (usdPrice: number) => {
    const v = usdPrice * cur.rate
    return `≈ ${cur.sym}${num(v, v >= 1000 ? 2 : v >= 1 ? 2 : 6)}`
  }

  const toggleFav = (s: string) =>
    setFavs(f => (f.includes(s) ? f.filter(x => x !== s) : [...f, s]))

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key
      ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
      : { key, dir: key === 'symbol' ? 'asc' : 'desc' }))

  const rows = useMemo(() => {
    const allowed = group === 'fav'
      ? favs
      : MARKET_GROUPS.find(g => g.id === group)?.symbols ?? []

    let list = TICKERS.filter(t => allowed.includes(t.symbol))

    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter(t => t.symbol.toLowerCase().includes(needle) || t.base.toLowerCase().includes(needle))
    }

    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sort.key === 'symbol') return a.symbol.localeCompare(b.symbol) * dir
      return ((a[sort.key] as number) - (b[sort.key] as number)) * dir
    })
  }, [group, q, favs, sort])

  const stats = useMemo(() => {
    const up = TICKERS.filter(t => t.change >= 0).length
    return {
      up, down: TICKERS.length - up,
      vol: TICKERS.reduce((s, t) => s + t.turnover, 0),
      top: [...TICKERS].sort((a, b) => b.change - a.change)[0],
    }
  }, [])

  /* ------------------------------ Sub-parts ------------------------------ */
  const SortTh = ({ k, label, align = 'right', hide }: {
    k: SortKey; label: string; align?: 'left' | 'right'; hide?: string
  }) => {
    const active = sort.key === k
    const Icon = !active ? ChevronsUpDown : sort.dir === 'desc' ? ChevronDown : ChevronUp
    return (
      <th
        className={cn(
          'font-medium px-3 py-2.5 border-b border-line whitespace-nowrap select-none',
          align === 'right' ? 'text-right' : 'text-left', hide,
        )}
      >
        <button
          onClick={() => toggleSort(k)}
          className={cn(
            'inline-flex items-center gap-1 transition-colors hover:text-ink',
            align === 'right' && 'flex-row-reverse',
            active ? 'text-ink' : 'text-muted',
          )}
        >
          {label}
          <Icon className={cn('w-3 h-3', active ? 'text-brand' : 'text-faint')} />
        </button>
      </th>
    )
  }

  const StarBtn = ({ t, className }: { t: Ticker; className?: string }) => {
    const on = favs.includes(t.symbol)
    return (
      <button
        onClick={e => { e.stopPropagation(); e.preventDefault(); toggleFav(t.symbol) }}
        title={on ? '取消自选' : '加入自选'}
        className={cn('p-1 -m-1 transition-colors', on ? 'text-brand' : 'text-faint hover:text-muted', className)}
      >
        <Star className="w-3.5 h-3.5" fill={on ? 'currentColor' : 'none'} />
      </button>
    )
  }

  const CoinCell = ({ t }: { t: Ticker }) => (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-7 h-7 rounded-full bg-elevated grid place-items-center text-2xs font-bold shrink-0">
        {t.base.slice(0, 2)}
      </div>
      <div className="min-w-0">
        <div className="font-medium flex items-center gap-1.5">
          <span className="truncate">{t.base}<span className="text-faint font-normal">/{t.quote}</span></span>
          {t.tags?.includes('hot') && <Badge tone="down">HOT</Badge>}
          {t.tags?.includes('new') && <Badge tone="info">NEW</Badge>}
        </div>
        <div className="text-2xs text-faint truncate">{t.base} Perpetual · 现货</div>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="行情"
        sub="多市场 · 自选币对 · 法币价格换算 — 数据每秒推送 (WebSocket)"
        actions={
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:flex items-center gap-1.5 text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />实时
            </span>
            <div className="w-36">
              <Select
                value={fiat}
                onChange={e => setFiat(e.target.value as FiatId)}
                options={FIATS.map(f => ({ value: f.id, label: t(f.label) }))}
              />
            </div>
          </div>
        }
      />

      {/* Market summary strip */}
      <Card className="mb-4 px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div>
          <div className="text-2xs text-muted">24h 总成交额</div>
          <div className="text-sm font-semibold tnum">${compact(stats.vol)}</div>
        </div>
        <div>
          <div className="text-2xs text-muted">涨 / 跌</div>
          <div className="text-sm font-semibold tnum">
            <span className="text-up">{stats.up}</span>
            <span className="text-faint mx-1">/</span>
            <span className="text-down">{stats.down}</span>
          </div>
        </div>
        <div>
          <div className="text-2xs text-muted">涨幅榜首</div>
          <div className="text-sm font-semibold tnum">
            {stats.top.base} <span className="text-up">{pct(stats.top.change)}</span>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="text-2xs text-muted">计价法币</div>
          <div className="text-sm font-semibold tnum">
            1 USDT ≈ {cur.sym}{num(cur.rate, 4)}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-2xs text-faint">
          <Info className="w-3 h-3" />法币换算汇率由后台「系统配置」下发，仅供参考
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tabs
          value={group}
          onChange={setGroup}
          tabs={MARKET_GROUPS.map(g => ({
            id: g.id,
            label: t(g.label),
            count: g.id === 'fav' ? favs.length : g.symbols.length,
          }))}
        />
        <div className="flex-1" />
        <SearchBox
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="搜索币种 / 币对…" className="w-full sm:w-64"
        />
      </div>

      {/* ----------------------------- Desktop ----------------------------- */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-2xs text-muted">
                <th className="w-9 border-b border-line" />
                <SortTh k="symbol" label="币对" align="left" />
                <SortTh k="price" label="最新价" />
                <SortTh k="change" label="24h 涨跌" />
                <SortTh k="high" label="24h 最高" hide="hidden lg:table-cell" />
                <SortTh k="low" label="24h 最低" hide="hidden lg:table-cell" />
                <SortTh k="volume" label="24h 量" hide="hidden xl:table-cell" />
                <SortTh k="turnover" label="24h 额" />
                <th className="font-medium px-3 py-2.5 border-b border-line text-center">走势</th>
                <th className="font-medium px-3 py-2.5 border-b border-line text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(t => (
                <tr
                  key={t.symbol}
                  onClick={() => nav(route(t.symbol))}
                  className="border-b border-line/60 last:border-0 hover:bg-elevated transition-colors cursor-pointer"
                >
                  <td className="pl-3 pr-0"><StarBtn t={t} /></td>
                  <td className="px-3 py-2.5"><CoinCell t={t} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="tnum font-medium">{num(t.price, priceDp(t.price))}</div>
                    <div className="text-2xs text-faint tnum">{toFiat(t.price)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn(
                      'inline-block px-1.5 py-0.5 rounded text-xs tnum font-semibold',
                      t.change >= 0 ? 'text-up bg-up/10' : 'text-down bg-down/10',
                    )}>
                      {pct(t.change)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tnum text-muted hidden lg:table-cell">{num(t.high, priceDp(t.high))}</td>
                  <td className="px-3 py-2.5 text-right tnum text-muted hidden lg:table-cell">{num(t.low, priceDp(t.low))}</td>
                  <td className="px-3 py-2.5 text-right tnum text-muted hidden xl:table-cell">{compact(t.volume)}</td>
                  <td className="px-3 py-2.5 text-right tnum text-muted">${compact(t.turnover)}</td>
                  <td className="px-3 py-2.5">
                    <Sparkline data={t.sparkline} up={t.change >= 0} className="w-24 h-7 mx-auto" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" variant="subtle" onClick={e => { e.stopPropagation(); nav(route(t.symbol)) }}>
                      交易
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-xs text-faint py-16">
                    {group === 'fav' ? '自选列表为空 — 点击 ☆ 添加币对' : '没有匹配的币对'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ------------------------------ Mobile ------------------------------ */}
      <div className="md:hidden space-y-2">
        {rows.map(t => (
          <Link key={t.symbol} to={route(t.symbol)}>
            <Card className="p-3 active:bg-elevated transition-colors">
              <div className="flex items-center gap-2.5">
                <StarBtn t={t} className="shrink-0" />
                <div className="w-8 h-8 rounded-full bg-elevated grid place-items-center text-2xs font-bold shrink-0">
                  {t.base.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {t.base}<span className="text-faint font-normal">/{t.quote}</span>
                    {t.tags?.includes('hot') && <Badge tone="down">HOT</Badge>}
                    {t.tags?.includes('new') && <Badge tone="info">NEW</Badge>}
                  </div>
                  <div className="text-2xs text-faint tnum">24h 额 ${compact(t.turnover)}</div>
                </div>
                <Sparkline data={t.sparkline} up={t.change >= 0} className="w-12 h-6 shrink-0" />
                <div className="text-right shrink-0">
                  <div className="text-sm tnum font-medium">{num(t.price, priceDp(t.price))}</div>
                  <div className="text-2xs text-faint tnum">{toFiat(t.price)}</div>
                </div>
                <span className={cn(
                  'shrink-0 w-16 text-center py-1 rounded text-2xs tnum font-semibold',
                  t.change >= 0 ? 'text-up bg-up/10' : 'text-down bg-down/10',
                )}>
                  {pct(t.change)}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-line/60 text-2xs text-muted tnum">
                <span>高 {num(t.high, priceDp(t.high))}</span>
                <span>低 {num(t.low, priceDp(t.low))}</span>
                <span>量 {compact(t.volume)}</span>
              </div>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && (
          <Card className="py-16 text-center text-xs text-faint">
            {group === 'fav' ? '自选列表为空 — 点击 ☆ 添加币对' : '没有匹配的币对'}
          </Card>
        )}
      </div>

      <p className="text-2xs text-faint mt-5 leading-relaxed">
        F-18 市场选择：多市场分组、自选币对与法币价格换算均已实现。原型中自选存于本地状态，
        正式版按用户维度持久化；法币汇率由后台配置的汇率源定时刷新。
      </p>
    </div>
  )
}
