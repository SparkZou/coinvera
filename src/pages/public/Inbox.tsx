import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Inbox as InboxIcon, CheckCheck, Bell, ShieldCheck, ArrowLeftRight,
  BadgeCheck, Settings2, Trash2, ChevronDown,
} from 'lucide-react'
import { INBOX, type InboxMsg } from '@/mock/account'
import { Card, Badge, PageHeader, Button, Tabs } from '@/components/ui'
import { cn, timeAgo, fmtDateTime } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 站内信 / 消息中心 — Function List F-13 (站内信) + F-14 (消息提醒)
 *   · 分类：系统 / 充提 / KYC / 安全
 *   · 未读态、单条已读、全部标为已读、空状态
 * ------------------------------------------------------------------ */

type Kind = InboxMsg['kind']
type TabId = 'all' | Kind

const KIND_META: Record<Kind, { icon: any; tone: 'info' | 'brand' | 'up' | 'warn'; desc: string }> = {
  系统: { icon: Bell, tone: 'info', desc: '维护、版本与规则变更通知' },
  充提: { icon: ArrowLeftRight, tone: 'brand', desc: '充值到账与提现状态提醒' },
  KYC: { icon: BadgeCheck, tone: 'up', desc: '实名认证审核结果' },
  安全: { icon: ShieldCheck, tone: 'warn', desc: '登录、设备与密码变更告警' },
}

/** Body text is not in the mock feed — synthesise a plausible one from the title. */
const bodyFor = (m: InboxMsg) => {
  switch (m.kind) {
    case '充提':
      return `${m.title}。链上交易已确认，资产已计入您的现货账户。如对本次操作有疑问，请立即通过官方工单联系客服。`
    case 'KYC':
      return `${m.title}。您现已可使用更高的提现额度与法币通道。如需升级至 Level 3，请前往「实名认证」提交进阶材料。`
    case '安全':
      return `${m.title}。若该操作非本人所为，请立即修改登录密码并启用谷歌验证器 (2FA)，同时冻结账户。`
    default:
      return `${m.title}。感谢您的理解与支持，如有疑问请查阅公告中心的详细说明。`
  }
}

export default function Inbox() {
  const [msgs, setMsgs] = useState<InboxMsg[]>(() => INBOX.map(m => ({ ...m })))
  const [tab, setTab] = useState<TabId>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const unreadOf = (k: TabId) =>
    msgs.filter(m => (k === 'all' || m.kind === k) && !m.read).length

  const list = useMemo(
    () => msgs.filter(m => tab === 'all' || m.kind === tab).sort((a, b) => b.ts - a.ts),
    [msgs, tab],
  )

  const totalUnread = unreadOf('all')

  const openMsg = (id: string) => {
    setOpenId(o => (o === id ? null : id))
    setMsgs(ms => ms.map(m => (m.id === id ? { ...m, read: true } : m)))
  }

  const markAll = () => setMsgs(ms => ms.map(m => ({ ...m, read: true })))
  const remove = (id: string) => {
    setMsgs(ms => ms.filter(m => m.id !== id))
    setOpenId(o => (o === id ? null : o))
  }

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'all', label: '全部', count: unreadOf('all') || undefined },
    ...(Object.keys(KIND_META) as Kind[]).map(k => ({
      id: k as TabId, label: k, count: unreadOf(k) || undefined,
    })),
  ]

  return (
    <div>
      <PageHeader
        title="消息中心"
        sub={
          totalUnread > 0
            ? <>您有 <b className="text-ink tnum">{totalUnread}</b> 条未读消息 — 系统 / 充提 / KYC / 安全 全类型推送</>
            : '所有消息均已读 — 系统 / 充提 / KYC / 安全 全类型推送'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/notices">
              <Button variant="ghost" size="sm">公告中心</Button>
            </Link>
            <Button variant="outline" size="sm" disabled={totalUnread === 0} onClick={markAll}>
              <CheckCheck className="w-3.5 h-3.5" />全部标为已读
            </Button>
          </div>
        }
      />

      {/* Channel summary — F-14 消息提醒渠道 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {(Object.keys(KIND_META) as Kind[]).map(k => {
          const M = KIND_META[k]
          const n = unreadOf(k)
          return (
            <button
              key={k}
              onClick={() => { setTab(k); setOpenId(null) }}
              className="text-left"
            >
              <Card className={cn(
                'p-3.5 h-full transition-colors',
                tab === k ? 'border-brand/50' : 'hover:border-line',
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className={cn(
                    'w-8 h-8 rounded-lg grid place-items-center',
                    M.tone === 'info' ? 'bg-info/10 text-info'
                      : M.tone === 'brand' ? 'bg-brand/10 text-brand'
                        : M.tone === 'up' ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn',
                  )}>
                    <M.icon className="w-4 h-4" />
                  </div>
                  {n > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-down text-white text-2xs font-semibold tnum grid place-items-center">
                      {n}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium mt-2.5">{k}消息</div>
                <div className="text-2xs text-faint mt-0.5 leading-relaxed">{M.desc}</div>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tabs value={tab} onChange={v => { setTab(v); setOpenId(null) }} tabs={TABS} />
        <div className="flex-1" />
        <span className="text-2xs text-faint tnum hidden sm:block">共 {list.length} 条</span>
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-elevated grid place-items-center mx-auto mb-4">
              <InboxIcon className="w-5 h-5 text-faint" />
            </div>
            <div className="text-sm text-muted">暂无消息</div>
            <div className="text-2xs text-faint mt-1">
              {tab === 'all' ? '收件箱是空的' : `没有「${tab}」类别的消息`}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {list.map(m => {
              const M = KIND_META[m.kind]
              const isOpen = openId === m.id
              return (
                <div key={m.id} className={cn('transition-colors', !m.read && 'bg-brand/[0.03]')}>
                  <button
                    onClick={() => openMsg(m.id)}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-elevated transition-colors group"
                  >
                    {/* Unread dot */}
                    <span className="w-2 shrink-0 mt-2.5 flex justify-center">
                      {!m.read && <span className="w-2 h-2 rounded-full bg-down" />}
                    </span>

                    <div className={cn(
                      'w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5',
                      m.read ? 'bg-elevated text-faint'
                        : M.tone === 'info' ? 'bg-info/10 text-info'
                          : M.tone === 'brand' ? 'bg-brand/10 text-brand'
                            : M.tone === 'up' ? 'bg-up/10 text-up' : 'bg-warn/10 text-warn',
                    )}>
                      <M.icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        'text-sm truncate',
                        m.read ? 'text-muted font-normal' : 'text-ink font-semibold',
                      )}>
                        {m.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone={m.read ? 'muted' : M.tone}>{m.kind}</Badge>
                        <span className="text-2xs text-faint tnum">{timeAgo(m.ts)} 前</span>
                        <span className="text-2xs text-faint tnum hidden sm:block">· {fmtDateTime(m.ts)}</span>
                      </div>
                    </div>

                    <ChevronDown className={cn(
                      'w-4 h-4 text-faint shrink-0 mt-2 transition-transform',
                      isOpen && 'rotate-180',
                    )} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pl-[4.25rem] animate-fade-in">
                      <div className="rounded-lg bg-elevated border border-line p-4">
                        <p className="text-xs text-muted leading-relaxed">{bodyFor(m)}</p>
                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-line">
                          <span className="text-2xs text-faint tnum">消息编号 {m.id} · {fmtDateTime(m.ts)}</span>
                          <button
                            onClick={() => remove(m.id)}
                            className="flex items-center gap-1 text-2xs text-muted hover:text-down transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />删除
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-1.5 text-2xs text-faint mt-5">
        <Settings2 className="w-3 h-3" />
        F-13 / F-14：站内信由后台「客服运营 → 站内信」群发或按用户定向发送；
        推送渠道 (站内 / 邮件 / 短信 / APP Push) 在《功能规格说明书》中逐项定义。
      </div>
    </div>
  )
}
