import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  KeyRound, Plus, Trash2, Pencil, AlertTriangle, Check, ShieldAlert,
  Globe, Code2, Info, ArrowLeft,
} from 'lucide-react'
import {
  Button, Card, CardHeader, Badge, Modal, Table, Input, PageHeader, CopyField,
  Toggle, type Col,
} from '@/components/ui'
import { API_KEYS, type ApiKey } from '@/mock/account'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * API 管理 — F-17
 * 密钥列表 · 权限 · IP 白名单 · 创建流程（一次性明文展示）
 * ------------------------------------------------------------------ */

const PERMS = [
  { id: '读取', desc: '查询行情、账户、订单、成交记录', danger: false },
  { id: '现货交易', desc: '下单、撤单（币币）', danger: false },
  { id: '合约交易', desc: '开平仓、调整杠杆与保证金', danger: false },
  { id: '提现', desc: '通过 API 发起链上提现', danger: true },
]

const permTone = (p: string) =>
  p === '提现' ? 'down' : p === '读取' ? 'muted' : p === '合约交易' ? 'info' : 'brand'

/* 一次性展示的密钥 — 确定性，非随机 */
const NEW_KEY = 'pQ7dR2vL9kX4mB1nT6yH3sC8wZ0aE5jU'
const NEW_SECRET = 'x9F2kD7mQ1sV4bN8hR3tY6uL0pA5cZ2wJ7eG4iK1oM9nB6vX3zS8dH5rT2yQ0fW1'

/* --------------------------- 6-box OTP input -------------------------- */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const setAt = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[i] = d
    onChange(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }
  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...value]
      if (next[i]) { next[i] = '' } else if (i > 0) { next[i - 1] = ''; refs.current[i - 1]?.focus() }
      onChange(next)
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    if (!d.length) return
    e.preventDefault()
    onChange(Array.from({ length: 6 }, (_, i) => d[i] ?? ''))
    refs.current[Math.min(d.length, 5)]?.focus()
  }

  return (
    <div className="flex gap-2" onPaste={onPaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          inputMode="numeric" autoComplete="one-time-code" maxLength={1}
          value={value[i] ?? ''}
          onChange={e => setAt(i, e.target.value)}
          onKeyDown={e => onKey(i, e)}
          onFocus={e => e.currentTarget.select()}
          className={cn(
            'flex-1 min-w-0 h-12 text-center text-lg font-semibold tnum rounded-lg',
            'bg-elevated border outline-none transition-colors focus:border-brand',
            value[i] ? 'border-brand text-ink' : 'border-line text-muted',
          )}
        />
      ))}
    </div>
  )
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>(API_KEYS)
  const [killing, setKilling] = useState<ApiKey | null>(null)
  const [editing, setEditing] = useState<ApiKey | null>(null)

  /* create wizard */
  const [wizard, setWizard] = useState(false)
  const [step, setStep] = useState(1)
  const [label, setLabel] = useState('')
  const [perms, setPerms] = useState<string[]>(['读取'])
  const [ips, setIps] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [saved, setSaved] = useState(false)

  const noWhitelist = keys.filter(k => k.ips.length === 0)
  const togglePerm = (p: string) => setPerms(perms.includes(p) ? perms.filter(x => x !== p) : [...perms, p])

  const startWizard = () => {
    setStep(1); setLabel(''); setPerms(['读取']); setIps('')
    setOtp(Array(6).fill('')); setSaved(false); setWizard(true)
  }

  const finish = () => {
    setKeys([
      ...keys,
      {
        id: 'K' + (keys.length + 1),
        label: label || 'New Key',
        key: NEW_KEY.slice(0, 6) + '...' + NEW_KEY.slice(-4),
        perms,
        ips: ips.split(/[\s,]+/).filter(Boolean),
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ])
    setWizard(false)
  }

  const ipList = ips.split(/[\s,]+/).filter(Boolean)
  const wantsWithdraw = perms.includes('提现')

  const cols: Col<ApiKey>[] = [
    {
      key: 'label', header: '备注名', width: '16%', cell: k => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-elevated grid place-items-center text-muted shrink-0">
            <KeyRound className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-medium truncate">{k.label}</span>
        </div>
      ),
    },
    {
      key: 'key', header: 'API Key', width: '22%', cell: k => (
        <CopyField value={k.key} className="h-8 max-w-[220px]" />
      ),
    },
    {
      key: 'perms', header: '权限', cell: k => (
        <div className="flex flex-wrap gap-1">
          {k.perms.map(p => <Badge key={p} tone={permTone(p) as any}>{p}</Badge>)}
        </div>
      ),
    },
    {
      key: 'ips', header: 'IP 白名单', hideBelow: 'md', cell: k => (
        k.ips.length
          ? <div className="flex flex-wrap gap-1">
              {k.ips.map(ip => <Badge key={ip} tone="muted"><span className="font-mono tnum">{ip}</span></Badge>)}
            </div>
          : <Badge tone="warn"><AlertTriangle className="w-2.5 h-2.5" />未绑定</Badge>
      ),
    },
    {
      key: 'created', header: '创建时间', align: 'right', hideBelow: 'sm',
      cell: k => <span className="text-xs text-muted tnum">{k.createdAt}</span>,
    },
    {
      key: 'act', header: '操作', align: 'right', width: '110px', cell: k => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setEditing(k)}
            className="w-7 h-7 rounded-lg grid place-items-center text-faint hover:text-brand hover:bg-elevated transition-colors"
            title="编辑"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setKilling(k)}
            className="w-7 h-7 rounded-lg grid place-items-center text-faint hover:text-down hover:bg-elevated transition-colors"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="API 管理"
        sub="程序化交易密钥 · 权限控制 · IP 白名单"
        actions={
          <>
            <Link to="/coverage">
              <Button variant="ghost" size="sm"><Code2 className="w-3.5 h-3.5" />接口文档</Button>
            </Link>
            <Button size="sm" onClick={startWizard}><Plus className="w-3.5 h-3.5" />创建 API</Button>
          </>
        }
      />

      {/* --------------------- IP 白名单缺失告警 --------------------- */}
      {noWhitelist.length > 0 && (
        <Card className="mb-4 border-warn/40 bg-warn/5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5">
            <span className="flex items-center gap-2 shrink-0">
              <ShieldAlert className="w-4 h-4 text-warn" />
              <Badge tone="warn">安全提示</Badge>
            </span>
            <p className="text-xs text-muted flex-1 leading-relaxed">
              未绑定 IP 白名单的 API Key <b className="text-ink">无法开启提现权限</b>，
              且仅有 90 天有效期。当前有 <b className="text-warn tnum">{noWhitelist.length}</b> 个密钥未绑定：
              {noWhitelist.map(k => <b key={k.id} className="text-ink ml-1">{k.label}</b>)}。
            </p>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEditing(noWhitelist[0])}>
              立即绑定
            </Button>
          </div>
        </Card>
      )}

      {/* ------------------------------ 密钥列表 ------------------------------ */}
      <Card className="mb-4">
        <CardHeader
          title="我的 API Key"
          sub={`${keys.length} / 10 个 — 每个账户最多创建 10 个密钥`}
          right={<span className="text-2xs font-mono text-faint">F-17</span>}
        />

        {/* desktop table */}
        <div className="hidden sm:block">
          <Table cols={cols} rows={keys} empty="尚未创建任何 API Key" />
        </div>

        {/* mobile cards */}
        <div className="sm:hidden divide-y divide-line/60">
          {keys.map(k => (
            <div key={k.id} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-elevated grid place-items-center text-muted shrink-0">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm font-medium truncate">{k.label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditing(k)} className="w-7 h-7 rounded-lg grid place-items-center text-faint">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setKilling(k)} className="w-7 h-7 rounded-lg grid place-items-center text-faint">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <CopyField value={k.key} className="h-9" />
              <div className="flex flex-wrap gap-1">
                {k.perms.map(p => <Badge key={p} tone={permTone(p) as any}>{p}</Badge>)}
              </div>
              <div className="flex items-center justify-between gap-2">
                {k.ips.length
                  ? <span className="text-2xs text-muted font-mono tnum truncate">{k.ips.join(', ')}</span>
                  : <Badge tone="warn"><AlertTriangle className="w-2.5 h-2.5" />未绑定 IP</Badge>}
                <span className="text-2xs text-faint tnum shrink-0">{k.createdAt}</span>
              </div>
            </div>
          ))}
          {keys.length === 0 && <div className="py-12 text-center text-xs text-faint">尚未创建任何 API Key</div>}
        </div>
      </Card>

      {/* ------------------------------ 使用说明 ------------------------------ */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="使用说明" sub="REST / WebSocket 接入参数" right={<Globe className="w-3.5 h-3.5 text-faint" />} />
          <div className="divide-y divide-line/60">
            {[
              { k: 'REST Base URL', v: 'https://api.exchange.io/v1' },
              { k: 'WebSocket', v: 'wss://stream.exchange.io/ws' },
              { k: '限流规则', v: '1200 req / min · 权重制，超限返回 429' },
              { k: '签名算法', v: 'HMAC-SHA256 (timestamp + method + path + body)' },
              { k: '时间窗口', v: 'recvWindow ≤ 5000ms，服务器时间偏差 > 1s 拒绝' },
              { k: '提现接口', v: '需 IP 白名单 + 提现权限 + 资金密码' },
            ].map(r => (
              <div key={r.k} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-2.5">
                <span className="text-xs text-muted w-40 shrink-0">{r.k}</span>
                <span className="text-xs font-mono tnum text-ink break-all">{r.v}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-line">
            <div className="text-2xs text-muted mb-1.5">签名示例</div>
            <pre className="text-2xs font-mono bg-elevated border border-line rounded-lg p-3 overflow-x-auto scroll-thin text-muted leading-relaxed">
{`ts=$(date +%s000)
payload="\${ts}GET/v1/account"
sig=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$SECRET" -hex)

curl -H "X-API-KEY: $KEY" -H "X-TIMESTAMP: $ts" \\
     -H "X-SIGN: \${sig#*= }" \\
     https://api.exchange.io/v1/account`}
            </pre>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="安全建议" />
          <ul className="p-4 space-y-2.5">
            {[
              'Secret Key 仅在创建时显示一次，请离线保存',
              '为每个策略单独创建密钥，便于定位与吊销',
              '始终绑定 IP 白名单，最多 20 个 IPv4',
              '提现权限仅在必要时开启，并配合资金密码',
              '发现异常调用请立即删除密钥并修改登录密码',
            ].map(t => (
              <li key={t} className="flex gap-2 text-2xs text-muted leading-relaxed">
                <Check className="w-3 h-3 text-up shrink-0 mt-0.5" />{t}
              </li>
            ))}
          </ul>
          <div className="px-4 py-2.5 border-t border-line flex items-start gap-2 text-2xs text-faint leading-relaxed">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            所有 API 操作（创建 / 编辑 / 删除）均写入
            <Link to="/account/logs" className="text-brand hover:underline mx-1">操作日志</Link>。
          </div>
        </Card>
      </div>

      {/* =========================== 创建 API 向导 =========================== */}
      <Modal
        open={wizard}
        onClose={() => { if (step < 3 || saved) setWizard(false) }}
        title={`创建 API Key · 步骤 ${step} / 3`}
        width="max-w-lg"
        footer={
          step === 1 ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setWizard(false)}>取消</Button>
              <Button className="flex-1" disabled={!label.trim() || perms.length === 0} onClick={() => setStep(2)}>下一步</Button>
            </div>
          ) : step === 2 ? (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5" />上一步
              </Button>
              <Button className="flex-1" disabled={otp.join('').length < 6} onClick={() => setStep(3)}>确认创建</Button>
            </div>
          ) : (
            <Button className="w-full" disabled={!saved} onClick={finish}>
              {saved ? '完成' : '请先勾选「我已保存」'}
            </Button>
          )
        }
      >
        {/* progress rail */}
        <div className="flex items-center gap-2 mb-5">
          {['权限配置', '二次验证', '保存密钥'].map((t, i) => (
            <div key={t} className="flex items-center gap-2 flex-1 min-w-0">
              <span className={cn(
                'w-5 h-5 rounded-full grid place-items-center text-2xs font-semibold tnum shrink-0',
                step > i + 1 ? 'bg-up/10 text-up' : step === i + 1 ? 'bg-brand text-brand-ink' : 'bg-elevated text-faint',
              )}>
                {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className={cn('text-2xs truncate', step === i + 1 ? 'text-ink font-medium' : 'text-faint')}>{t}</span>
              {i < 2 && <div className={cn('h-px flex-1', step > i + 1 ? 'bg-up' : 'bg-line')} />}
            </div>
          ))}
        </div>

        {/* ---- step 1 ---- */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="备注名"
              value={label}
              onChange={e => setLabel(e.target.value.slice(0, 24))}
              placeholder="例如 Trading Bot / Grid Strategy"
            />

            <div>
              <div className="text-xs text-muted mb-1.5">权限</div>
              <div className="space-y-2">
                {PERMS.map(p => {
                  const on = perms.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
                        on && p.danger ? 'border-down/40 bg-down/5'
                          : on ? 'border-brand/40 bg-brand/5'
                          : 'border-line bg-elevated',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium">{p.id}</span>
                          {p.danger && <Badge tone="down"><AlertTriangle className="w-2.5 h-2.5" />高风险</Badge>}
                        </div>
                        <div className="text-2xs text-muted mt-0.5">{p.desc}</div>
                      </div>
                      <Toggle checked={on} onChange={() => togglePerm(p.id)} />
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted mb-1.5">
                IP 白名单 <span className="text-faint">（每行一个，或用逗号分隔 · 最多 20 个）</span>
              </div>
              <textarea
                value={ips}
                onChange={e => setIps(e.target.value)}
                rows={3}
                placeholder={'203.118.24.18\n119.28.44.201'}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-elevated border border-line text-xs font-mono tnum',
                  'outline-none focus:border-brand placeholder:text-faint resize-none scroll-thin',
                )}
              />
              <div className="text-2xs text-faint mt-1 tnum">已填写 {ipList.length} 个 IP</div>
            </div>

            {wantsWithdraw && ipList.length === 0 && (
              <div className="flex items-start gap-2 text-2xs text-down bg-down/10 rounded-lg p-2.5 leading-relaxed">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                开启<b>提现</b>权限必须绑定至少 1 个 IP 白名单。未绑定时该权限将被忽略。
              </div>
            )}
            {wantsWithdraw && ipList.length > 0 && (
              <div className="flex items-start gap-2 text-2xs text-warn bg-warn/10 rounded-lg p-2.5 leading-relaxed">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                提现权限允许程序将资产转出至<b>已通过审核的提币地址</b>。请务必妥善保管 Secret Key。
              </div>
            )}
          </div>
        )}

        {/* ---- step 2 ---- */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-elevated border border-line p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted">备注名</span><span className="font-medium">{label}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">权限</span>
                <span className="flex gap-1 flex-wrap justify-end">
                  {perms.map(p => <Badge key={p} tone={permTone(p) as any}>{p}</Badge>)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">IP 白名单</span>
                <span className="font-mono tnum text-right">{ipList.length ? ipList.join(', ') : <span className="text-warn">未绑定</span>}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted mb-1.5">谷歌验证码 (6 位)</div>
              <OtpInput value={otp} onChange={setOtp} />
              <div className="text-2xs text-faint mt-2">口令每 30 秒刷新一次。未绑定验证器？前往
                <Link to="/account/security" className="text-brand hover:underline mx-1">安全设置</Link>。
              </div>
            </div>
          </div>
        )}

        {/* ---- step 3 — one-time reveal ---- */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-xs text-down bg-down/10 border border-down/30 rounded-lg p-3 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Secret Key 仅显示一次，请立即保存。</div>
                <div className="mt-0.5 text-muted">关闭本窗口后无法再次查看。如遗失，只能删除该密钥并重新创建。</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted mb-1.5">API Key</div>
              <CopyField value={NEW_KEY} />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5 flex items-center gap-1.5">
                Secret Key <Badge tone="down">一次性</Badge>
              </div>
              <CopyField value={NEW_SECRET} />
            </div>

            <div className="rounded-lg bg-elevated border border-line p-3 space-y-1.5 text-2xs">
              <div className="flex justify-between"><span className="text-muted">备注名</span><span>{label}</span></div>
              <div className="flex justify-between"><span className="text-muted">权限</span><span>{perms.join(' · ')}</span></div>
              <div className="flex justify-between"><span className="text-muted">IP 白名单</span>
                <span className="font-mono tnum">{ipList.length ? ipList.join(', ') : '未绑定'}</span>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <span
                onClick={() => setSaved(!saved)}
                className={cn(
                  'w-4 h-4 rounded border grid place-items-center shrink-0 transition-colors',
                  saved ? 'bg-brand border-brand text-brand-ink' : 'border-line bg-elevated',
                )}
              >
                {saved && <Check className="w-3 h-3" />}
              </span>
              <span className="text-xs">我已将 Secret Key 保存至安全的地方</span>
            </label>
          </div>
        )}
      </Modal>

      {/* ============================== 编辑密钥 ============================== */}
      <Modal
        open={!!editing} onClose={() => setEditing(null)} title={`编辑 · ${editing?.label ?? ''}`}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>取消</Button>
            <Button className="flex-1" onClick={() => setEditing(null)}>保存修改</Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Input label="备注名" defaultValue={editing.label} />
            <div>
              <div className="text-xs text-muted mb-1.5">权限</div>
              <div className="flex flex-wrap gap-1.5">
                {PERMS.map(p => (
                  <Badge key={p.id} tone={editing.perms.includes(p.id) ? (permTone(p.id) as any) : 'muted'}>
                    {editing.perms.includes(p.id) && <Check className="w-2.5 h-2.5" />}{p.id}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">IP 白名单</div>
              <textarea
                rows={3}
                defaultValue={editing.ips.join('\n')}
                placeholder="203.118.24.18"
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-elevated border border-line text-xs font-mono tnum',
                  'outline-none focus:border-brand placeholder:text-faint resize-none scroll-thin',
                )}
              />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">谷歌验证码</div>
              <OtpInput value={otp} onChange={setOtp} />
            </div>
          </div>
        )}
      </Modal>

      {/* ============================== 删除密钥 ============================== */}
      <Modal
        open={!!killing} onClose={() => setKilling(null)} title="删除 API Key"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setKilling(null)}>取消</Button>
            <Button
              variant="danger" className="flex-1"
              onClick={() => { setKeys(keys.filter(k => k.id !== killing?.id)); setKilling(null) }}
            >
              确认删除
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            确认删除 <b>{killing?.label}</b>？该密钥将立即失效，使用它的所有程序会收到 <span className="font-mono text-down">401</span>。
            此操作不可撤销。
          </p>
          <div className="flex items-start gap-2 text-2xs text-warn bg-warn/10 rounded-lg p-2.5 leading-relaxed">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            请先确保该密钥下没有运行中的策略与未成交委托。
          </div>
        </div>
      </Modal>
    </div>
  )
}
