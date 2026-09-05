import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pin, ArrowLeft, Megaphone, ChevronRight, Share2, Clock } from 'lucide-react'
import { NOTICES, type Notice } from '@/mock/account'
import { Card, CardHeader, Badge, SearchBox, PageHeader, Button } from '@/components/ui'
import { cn, timeAgo, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 公告中心 — Function List F-12 (查看公告)
 *   · 公告分类 (后台「客服运营 → 文章分类」维护)
 *   · 置顶公告 · 全文检索 · 详情页
 * ------------------------------------------------------------------ */

const TONE: Record<string, 'brand' | 'info' | 'up' | 'warn' | 'down' | 'muted'> = {
  新币上线: 'up',
  系统公告: 'info',
  费率调整: 'brand',
  活动: 'brand',
  安全提示: 'warn',
}

/** Sort: pinned first, then newest. */
const sortNotices = (a: Notice, b: Notice) =>
  (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.ts - a.ts

export default function Notices() {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const cats = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of NOTICES) m.set(n.category, (m.get(n.category) ?? 0) + 1)
    return [{ id: 'all', label: '全部公告', count: NOTICES.length },
      ...[...m.entries()].map(([label, count]) => ({ id: label, label, count }))]
  }, [])

  const list = useMemo(() => {
    return NOTICES
      .filter(n => cat === 'all' || n.category === cat)
      .filter(n => {
        if (!q.trim()) return true
        const hay = `${n.title} ${n.category} ${n.body}`.toLowerCase()
        return hay.includes(q.trim().toLowerCase())
      })
      .sort(sortNotices)
  }, [cat, q])

  const open = openId ? NOTICES.find(n => n.id === openId) ?? null : null

  /* Prev / next within the current filtered list — real announcement centres have this. */
  const idx = open ? list.findIndex(n => n.id === open.id) : -1
  const prev = idx > 0 ? list[idx - 1] : null
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null

  return (
    <div>
      <PageHeader
        title="公告中心"
        sub="上币公告、系统维护、费率调整与安全提示 — 内容由后台「客服运营 → 公告管理」发布"
        actions={
          <Link to="/inbox">
            <Button variant="outline" size="sm">站内信</Button>
          </Link>
        }
      />

      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        {/* ---------------------------- 公告分类 ---------------------------- */}
        <aside>
          <Card className="lg:sticky lg:top-[4.5rem] overflow-hidden">
            <CardHeader title="公告分类" />
            {/* Mobile: horizontal chips. Desktop: vertical list. */}
            <div className="p-1.5 flex lg:block gap-1 overflow-x-auto no-scrollbar">
              {cats.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCat(c.id); setOpenId(null) }}
                  className={cn(
                    'shrink-0 lg:w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors whitespace-nowrap',
                    cat === c.id
                      ? 'bg-elevated text-ink font-medium'
                      : 'text-muted hover:text-ink hover:bg-elevated/60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {cat === c.id && <span className="w-1 h-3.5 rounded-full bg-brand hidden lg:block" />}
                    {c.label}
                  </span>
                  <span className="text-2xs text-faint tnum">{c.count}</span>
                </button>
              ))}
            </div>
          </Card>
        </aside>

        {/* ------------------------------ 内容 ------------------------------ */}
        <section>
          {!open ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <SearchBox
                  value={q} onChange={e => setQ(e.target.value)}
                  placeholder="搜索公告标题或内容…" className="flex-1"
                />
                <span className="text-2xs text-faint tnum shrink-0 hidden sm:block">
                  共 {list.length} 条
                </span>
              </div>

              <Card className="overflow-hidden">
                {list.length === 0 && (
                  <div className="py-20 text-center">
                    <Megaphone className="w-8 h-8 text-faint mx-auto mb-3" />
                    <div className="text-sm text-muted">没有匹配的公告</div>
                    <div className="text-2xs text-faint mt-1">换个关键词，或选择其他分类</div>
                  </div>
                )}
                <div className="divide-y divide-line/60">
                  {list.map(n => (
                    <button
                      key={n.id}
                      onClick={() => setOpenId(n.id)}
                      className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-elevated transition-colors group"
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-lg grid place-items-center shrink-0 mt-0.5',
                        n.pinned ? 'bg-brand/10 text-brand' : 'bg-elevated text-faint',
                      )}>
                        {n.pinned ? <Pin className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {n.pinned && <Badge tone="brand"><Pin className="w-2.5 h-2.5" />置顶</Badge>}
                          <span className="text-sm font-medium truncate group-hover:text-brand transition-colors">
                            {n.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1 line-clamp-1 leading-relaxed">{n.body}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge tone={TONE[n.category] ?? 'muted'}>{n.category}</Badge>
                          <span className="text-2xs text-faint flex items-center gap-1 tnum">
                            <Clock className="w-2.5 h-2.5" />{timeAgo(n.ts)} 前
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-faint shrink-0 mt-3 group-hover:text-brand transition-colors" />
                    </button>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            /* ---------------------------- 公告详情 ---------------------------- */
            <Card className="overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
                <button
                  onClick={() => setOpenId(null)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />返回公告列表
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors">
                  <Share2 className="w-3.5 h-3.5" />分享
                </button>
              </div>

              <article className="px-5 sm:px-8 py-6 sm:py-8">
                <div className="flex items-center gap-2 mb-3">
                  {open.pinned && <Badge tone="brand"><Pin className="w-2.5 h-2.5" />置顶</Badge>}
                  <Badge tone={TONE[open.category] ?? 'muted'}>{open.category}</Badge>
                </div>

                <h1 className="text-xl sm:text-2xl font-semibold leading-snug tracking-tight">{open.title}</h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pb-5 mb-6 border-b border-line text-2xs text-faint">
                  <span className="tnum">发布时间 {fmtDateTime(open.ts)}</span>
                  <span>来源 官方公告</span>
                  <span className="tnum">编号 {open.id}</span>
                </div>

                <div className="space-y-4 text-sm leading-7 text-muted">
                  <p className="text-ink">尊敬的用户：</p>
                  <p>{open.body}</p>
                  <p>
                    请注意合理控制仓位与杠杆倍数，注意风险。数字资产价格波动剧烈，
                    请在充分了解产品规则后再参与交易。本公告的最终解释权归平台所有。
                  </p>
                  <ul className="space-y-2 pl-1">
                    {[
                      '交易前请确认已完成实名认证 (KYC Level 2)。',
                      '合约交易请关注保证金率与强平价格，及时追加保证金。',
                      '如遇异常，请通过官方渠道提交工单，客服不会主动索要验证码。',
                    ].map((li, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="w-1 h-1 rounded-full bg-brand shrink-0 mt-3" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-faint pt-2">— 平台运营团队</p>
                </div>
              </article>

              {/* Prev / next */}
              <div className="border-t border-line grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line">
                <button
                  disabled={!prev}
                  onClick={() => prev && setOpenId(prev.id)}
                  className="px-4 py-3 text-left disabled:opacity-40 hover:bg-elevated transition-colors disabled:pointer-events-none"
                >
                  <div className="text-2xs text-faint mb-0.5">上一条</div>
                  <div className="text-xs truncate">{prev?.title ?? '没有了'}</div>
                </button>
                <button
                  disabled={!next}
                  onClick={() => next && setOpenId(next.id)}
                  className="px-4 py-3 text-right disabled:opacity-40 hover:bg-elevated transition-colors disabled:pointer-events-none"
                >
                  <div className="text-2xs text-faint mb-0.5">下一条</div>
                  <div className="text-xs truncate">{next?.title ?? '没有了'}</div>
                </button>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
