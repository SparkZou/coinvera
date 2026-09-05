import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Apple, Smartphone, Download as DownloadIcon, ShieldCheck, Bell, Fingerprint,
  Zap, AlertTriangle, ChevronRight, Wifi, BatteryFull, Signal,
} from 'lucide-react'
import { TICKERS } from '@/mock/market'
import { Card, CardHeader, Badge, Button, PageHeader } from '@/components/ui'
import { Sparkline } from '@/components/charts'
import { cn, num, pct, priceDp } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * APP 下载 — Function List F-16
 *   · iOS (App Store) / Android (APK · Google Play)
 *   · 版本号 / 包体积 / 二维码
 *   · 注意：商户需自行完成 APP 的上架工作
 * ------------------------------------------------------------------ */

const VERSION = 'v1.4.2'
const RELEASED = '2026-07-08'

const PLATFORMS = [
  {
    id: 'ios',
    name: 'iOS',
    icon: Apple,
    store: 'App Store',
    size: '128.4 MB',
    req: 'iOS 14.0 或更高版本 · iPhone / iPad',
    seed: 91_237,
    cta: '前往 App Store',
    alt: '下载 TestFlight 测试版',
  },
  {
    id: 'android',
    name: 'Android',
    icon: Smartphone,
    store: 'Google Play / APK',
    size: '96.2 MB',
    req: 'Android 8.0 或更高版本 · arm64-v8a',
    seed: 44_819,
    cta: '下载 APK',
    alt: '前往 Google Play',
  },
] as const

const HIGHLIGHTS = [
  { icon: Zap, title: '毫秒级行情', desc: 'WebSocket 增量推送，深度图与 K 线原生渲染' },
  { icon: Fingerprint, title: '生物识别解锁', desc: '指纹 / 图案锁 / 人脸识别，支持独立资金密码' },
  { icon: Bell, title: '价格与强平预警', desc: '自定义价格提醒，仓位保证金率实时 Push' },
  { icon: ShieldCheck, title: '设备指纹风控', desc: '新设备登录二次验证，异常行为自动冻结' },
]

export default function Download() {
  return (
    <div>
      <PageHeader
        title="APP 下载"
        sub={`iOS 与 Android 全功能客户端 · 当前版本 ${VERSION} · 发布于 ${RELEASED}`}
        actions={
          <Link to="/app-preview">
            <Button variant="outline" size="sm">App 端交互预览<ChevronRight className="w-3.5 h-3.5" /></Button>
          </Link>
        }
      />

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          {/* --------------------------- 下载卡片 --------------------------- */}
          <div className="grid sm:grid-cols-2 gap-4">
            {PLATFORMS.map(p => (
              <Card key={p.id} className="p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-elevated grid place-items-center">
                    <p.icon className="w-5 h-5 text-ink" />
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {p.name}
                      <Badge tone="brand" className="tnum">{VERSION}</Badge>
                    </div>
                    <div className="text-2xs text-muted mt-0.5">{p.store}</div>
                  </div>
                </div>

                {/* QR */}
                <div className="flex items-center gap-4">
                  <div className="w-[124px] h-[124px] shrink-0 rounded-xl border border-line bg-surface p-2.5">
                    <FakeQR seed={p.seed} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2 text-2xs">
                    <div className="text-muted leading-relaxed">扫描二维码<br />直接安装到手机</div>
                    <dl className="space-y-1.5 pt-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-faint">版本</dt>
                        <dd className="tnum">{VERSION}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-faint">大小</dt>
                        <dd className="tnum">{p.size}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-faint">更新</dt>
                        <dd className="tnum">{RELEASED}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <p className="text-2xs text-faint mt-3 leading-relaxed">{p.req}</p>

                <div className="mt-4 pt-4 border-t border-line flex flex-col gap-2">
                  <Button className="w-full"><DownloadIcon className="w-4 h-4" />{p.cta}</Button>
                  <button className="text-2xs text-muted hover:text-ink transition-colors">{p.alt}</button>
                </div>
              </Card>
            ))}
          </div>

          {/* --------------------------- 上架提示 --------------------------- */}
          <Card className="border-warn/40 overflow-hidden">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warn" />
                  APP 上架责任说明
                </span>
              }
              sub="摘自贵司《功能列表》— 需在合同附件中书面确认"
              right={<Badge tone="warn">待澄清</Badge>}
            />
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm leading-relaxed">
                「<b className="text-warn">商户需自行完成 APP 的上架工作</b>」
              </p>
              <ul className="space-y-2">
                {[
                  '我方交付 iOS / Android 客户端源码与签名构建产物 (IPA / APK / AAB)。',
                  'Apple Developer 与 Google Play 开发者账号、企业实体资质、审核材料由甲方提供。',
                  '应用商店审核过程中的合规问询、金融类目资质与整改，由甲方主导，我方提供技术配合。',
                  '若需我方代为上架，应作为独立工作项另行报价与排期。',
                ].map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-muted leading-relaxed">
                    <span className="w-1 h-1 rounded-full bg-warn shrink-0 mt-1.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* --------------------------- 功能亮点 --------------------------- */}
          <div className="grid sm:grid-cols-2 gap-3">
            {HIGHLIGHTS.map(h => (
              <Card key={h.title} className="p-4 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
                  <h.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{h.title}</div>
                  <p className="text-2xs text-muted mt-1 leading-relaxed">{h.desc}</p>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-2xs text-faint leading-relaxed">
            F-16 APP 下载：下载入口、版本号、更新日志与安装包地址由后台「系统配置 → APP 版本发布 / APP 版本记录」维护，
            前端下载页自动读取最新版本。生物识别解锁的交互演示见
            <Link to="/app-preview" className="text-brand hover:underline mx-1">App 端交互预览</Link>。
          </p>
        </div>

        {/* ----------------------------- 手机预览 ----------------------------- */}
        <div className="hidden lg:block lg:sticky lg:top-[4.5rem]">
          <PhoneMock />
          <p className="text-2xs text-faint text-center mt-4 leading-relaxed">
            APP 首页示意 — 实际 UI 以 Figma 设计稿为准
          </p>
        </div>
      </div>

      {/* Mobile phone preview */}
      <div className="lg:hidden mt-6 flex justify-center">
        <PhoneMock />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Phone frame + a miniature of the actual app — pure CSS/SVG.
 * ------------------------------------------------------------------ */
function PhoneMock() {
  const [tab, setTab] = useState<'行情' | '交易'>('行情')
  const rows = TICKERS.slice(0, 5)
  const btc = TICKERS[0]

  return (
    <div className="mx-auto w-[280px] rounded-[2.25rem] border-[6px] border-line bg-bg shadow-2xl overflow-hidden">
      {/* Status bar */}
      <div className="relative h-9 bg-surface flex items-center justify-between px-5 text-2xs">
        <span className="tnum font-medium">9:41</span>
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-24 h-5 bg-line rounded-b-2xl" />
        <div className="flex items-center gap-1 text-muted">
          <Signal className="w-3 h-3" /><Wifi className="w-3 h-3" /><BatteryFull className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* App header */}
      <div className="bg-surface px-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xs text-muted">总资产估值 (USDT)</div>
            <div className="text-lg font-semibold tnum">182,409.55</div>
          </div>
          <div className="w-7 h-7 rounded-full bg-brand/10 text-brand grid place-items-center text-2xs font-bold">D</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 mt-3">
          {['充值', '提现', '划转', '返佣'].map(a => (
            <div key={a} className="rounded-lg bg-elevated py-1.5 text-center text-2xs text-muted">{a}</div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-bg px-4 pt-3">
        <div className="flex items-center gap-4 border-b border-line">
          {(['行情', '交易'] as const).map(x => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={cn(
                'relative pb-2 text-xs transition-colors',
                tab === x ? 'text-ink font-semibold' : 'text-muted',
              )}
            >
              {x}
              {tab === x && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="bg-bg px-4 py-3 h-[268px] overflow-hidden">
        {tab === '行情' ? (
          <div className="space-y-2.5">
            {rows.map(t => (
              <div key={t.symbol} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-elevated grid place-items-center text-[9px] font-bold shrink-0">
                  {t.base.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xs font-medium truncate">{t.base}<span className="text-faint">/{t.quote}</span></div>
                </div>
                <Sparkline data={t.sparkline} up={t.change >= 0} className="w-10 h-4 shrink-0" />
                <div className="text-right w-[70px] shrink-0">
                  <div className="text-2xs tnum">{num(t.price, priceDp(t.price))}</div>
                </div>
                <span className={cn(
                  'w-14 shrink-0 text-center py-0.5 rounded text-[10px] tnum font-semibold text-white',
                  t.change >= 0 ? 'bg-up' : 'bg-down',
                )}>
                  {pct(t.change)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">BTC/USDT</span>
              <span className="text-2xs text-up tnum">{pct(btc.change)}</span>
            </div>
            <div className="text-xl font-semibold tnum text-up">{num(btc.price, 2)}</div>
            <div className="rounded-lg border border-line p-2">
              <Sparkline data={btc.sparkline} up className="w-full h-16" />
            </div>
            <div className="space-y-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="relative flex justify-between text-[10px] tnum px-1.5 py-0.5">
                  <span className="absolute inset-y-0 right-0 bg-down/10" style={{ width: `${30 + i * 18}%` }} />
                  <span className="relative text-down">{num(btc.price + (3 - i) * 12, 2)}</span>
                  <span className="relative text-muted">{num(0.42 + i * 0.31, 3)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="rounded-lg bg-up text-white text-center py-1.5 text-2xs font-semibold">买入</div>
              <div className="rounded-lg bg-down text-white text-center py-1.5 text-2xs font-semibold">卖出</div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="bg-surface border-t border-line flex items-stretch h-12 pb-1">
        {['行情', '交易', '合约', '资产', '我的'].map((t, i) => (
          <div
            key={t}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5',
              i === 0 ? 'text-brand' : 'text-faint',
            )}
          >
            <div className={cn('w-3.5 h-3.5 rounded', i === 0 ? 'bg-brand/25' : 'bg-line')} />
            <span className="text-[9px]">{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Deterministic QR-looking matrix — rendered, never fetched.
 * ------------------------------------------------------------------ */
function FakeQR({ seed }: { seed: number }) {
  const N = 25
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

    // Alignment pattern (bottom-right), like a real QR.
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const edge = x === 0 || x === 4 || y === 0 || y === 4
      const core = x === 2 && y === 2
      m[N - 7 + y][N - 7 + x] = edge || core
    }

    // Timing patterns.
    for (let i = 8; i < N - 8; i++) {
      m[6][i] = i % 2 === 0
      m[i][6] = i % 2 === 0
    }

    let s = seed >>> 0
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)

    const reserved = (x: number, y: number) =>
      (x < 9 && y < 9) || (x >= N - 8 && y < 9) || (x < 9 && y >= N - 8) ||
      (x >= N - 8 && y >= N - 8) || x === 6 || y === 6

    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!reserved(x, y)) m[y][x] = rnd() > 0.5
    }
    return m
  }, [seed])

  return (
    <svg viewBox={`0 0 ${N} ${N}`} className="w-full h-full" shapeRendering="crispEdges" role="img" aria-label="下载二维码">
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="rgb(var(--ink))" /> : null,
        ),
      )}
    </svg>
  )
}
