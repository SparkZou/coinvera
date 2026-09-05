import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck, Check, AlertTriangle, Upload, ScanFace, Building2,
  FileText, Camera, ShieldCheck, ArrowRight, Lock, Info,
} from 'lucide-react'
import {
  Button, Card, CardHeader, Badge, Table, PageHeader, Select, Input, Modal, type Col,
} from '@/components/ui'
import { USER } from '@/mock/account'
import { cn, usd } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * 实名认证 (KYC) — F-06
 * Lv1 基础认证 → Lv2 高级认证 → Lv3 机构认证
 * 实名认证是提现的前提（《功能列表》F-06：“作为用户提现的前提”）。
 * ------------------------------------------------------------------ */

const LEVELS = [
  { lv: 1, title: 'Lv1 基础认证', sub: '姓名 · 国籍 · 证件号码' },
  { lv: 2, title: 'Lv2 高级认证', sub: '证件影像 · 人脸识别' },
  { lv: 3, title: 'Lv3 机构认证', sub: '营业执照 · 法人证件 · 授权书' },
]

type Right = {
  level: string
  daily: string
  single: string
  spot: boolean
  futures: boolean
  fiat: boolean
  apiWd: boolean
  current: boolean
}

const RIGHTS: Right[] = [
  { level: '未认证', daily: '—', single: '—', spot: false, futures: false, fiat: false, apiWd: false, current: false },
  { level: 'Lv1 基础', daily: usd(20_000, 0), single: usd(5_000, 0), spot: true, futures: false, fiat: false, apiWd: false, current: false },
  { level: 'Lv2 高级', daily: usd(1_000_000, 0), single: usd(200_000, 0), spot: true, futures: true, fiat: true, apiWd: true, current: true },
  { level: 'Lv3 机构', daily: '不限额', single: usd(2_000_000, 0), spot: true, futures: true, fiat: true, apiWd: true, current: false },
]

const NATIONS = [
  { value: 'hk', label: '中国香港 (Hong Kong SAR)' },
  { value: 'cn', label: '中国内地 (Mainland China)' },
  { value: 'sg', label: '新加坡 (Singapore)' },
  { value: 'nz', label: '新西兰 (New Zealand)' },
]
const DOCTYPES = [
  { value: 'id', label: '身份证' },
  { value: 'passport', label: '护照' },
  { value: 'driver', label: '驾照' },
]

/* ------------------- CSS-drawn document thumbnail -------------------- */
function DocThumb({ kind }: { kind: 'front' | 'back' | 'selfie' }) {
  return (
    <div className="w-full h-full p-3 grid place-items-center">
      <div className="w-full max-w-[190px] aspect-[1.586/1] rounded-lg bg-elevated border border-line p-2.5 flex gap-2 shadow-sm">
        {/* photo box */}
        <div className={cn(
          'rounded bg-surface border border-line shrink-0 grid place-items-center',
          kind === 'selfie' ? 'w-full' : 'w-[30%]',
        )}>
          {kind === 'selfie'
            ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-line" />
                <div className="w-10 h-8 rounded-sm bg-line/60 border border-line" />
              </div>
            )
            : (
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-4 h-4 rounded-full bg-line" />
                <div className="w-6 h-3 rounded-t-full bg-line" />
              </div>
            )}
        </div>
        {/* text lines */}
        {kind !== 'selfie' && (
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            <div className="h-1.5 rounded-full bg-line w-4/5" />
            <div className="h-1.5 rounded-full bg-line/60 w-3/5" />
            <div className="h-1.5 rounded-full bg-line/60 w-full" />
            <div className="h-1.5 rounded-full bg-line/60 w-2/3" />
            <div className="h-1 rounded-full bg-line/40 w-1/2 mt-0.5" />
          </div>
        )}
      </div>
    </div>
  )
}

/* --------------------------- Upload drop-zone ------------------------ */
function DropZone({
  title, hint, done, locked, kind, onUpload,
}: {
  title: string; hint: string; done: boolean; locked?: boolean
  kind: 'front' | 'back' | 'selfie'; onUpload: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => { if (!locked && !done) onUpload() }}
      disabled={locked}
      className={cn(
        'relative w-full aspect-[4/2.7] rounded-xl border-2 border-dashed transition-colors overflow-hidden group text-left',
        done ? 'border-up/40 bg-up/5' : locked ? 'border-line bg-elevated/50 cursor-not-allowed' : 'border-line hover:border-brand bg-elevated/50',
      )}
    >
      {done
        ? (
          <>
            <DocThumb kind={kind} />
            <div className="absolute inset-0 bg-bg/60 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
              <span className="text-2xs text-ink">点击重新上传</span>
            </div>
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-up/10 text-up text-2xs font-medium">
              <Check className="w-2.5 h-2.5" />已上传
            </span>
          </>
        )
        : (
          <div className="w-full h-full grid place-items-center px-3">
            <div className="text-center">
              <span className={cn(
                'w-9 h-9 rounded-lg grid place-items-center mx-auto',
                locked ? 'bg-line text-faint' : 'bg-elevated text-muted group-hover:text-brand transition-colors',
              )}>
                {locked ? <Lock className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              </span>
              <div className="text-xs font-medium mt-2">{title}</div>
              <div className="text-2xs text-faint mt-0.5 leading-relaxed">{hint}</div>
            </div>
          </div>
        )}
      {done && (
        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-surface/80 border-t border-line">
          <div className="text-2xs text-muted truncate">{title}</div>
        </div>
      )}
    </button>
  )
}

/* ------------------------ 人脸识别 / 活体检测 ------------------------- */
function FaceScan() {
  const [state, setState] = useState<'idle' | 'scanning' | 'done'>('done')
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const run = () => {
    if (state === 'scanning') return
    setState('scanning')
    timer.current = window.setTimeout(() => setState('done'), 2800)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <style>{`
        @keyframes kyc-scan-line { 0% { top: 4%; } 50% { top: 92%; } 100% { top: 4%; } }
        @keyframes kyc-ring { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
      `}</style>

      <div className="relative w-40 h-40 shrink-0">
        {/* frame */}
        <div className={cn(
          'absolute inset-0 rounded-full border-2 overflow-hidden transition-colors',
          state === 'done' ? 'border-up' : state === 'scanning' ? 'border-brand' : 'border-line',
        )}
          style={state === 'scanning' ? { animation: 'kyc-ring 1.2s ease-in-out infinite' } : undefined}
        >
          <div className="absolute inset-0 bg-elevated grid place-items-center">
            {/* CSS-drawn face silhouette */}
            <div className="flex flex-col items-center gap-1 opacity-60">
              <div className="w-9 h-9 rounded-full bg-line" />
              <div className="w-16 h-8 rounded-t-full bg-line" />
            </div>
          </div>

          {state === 'scanning' && (
            <div
              className="absolute left-0 right-0 h-8 pointer-events-none"
              style={{
                animation: 'kyc-scan-line 1.6s ease-in-out infinite',
                background: 'linear-gradient(180deg, rgb(var(--brand) / 0) 0%, rgb(var(--brand) / 0.3) 60%, rgb(var(--brand)) 100%)',
              }}
            />
          )}

          {state === 'done' && (
            <div className="absolute inset-0 bg-up/10 grid place-items-center">
              <span className="w-11 h-11 rounded-full bg-up text-white grid place-items-center">
                <Check className="w-6 h-6" />
              </span>
            </div>
          )}
        </div>

        {/* corner ticks */}
        {[
          'top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-6 h-0.5',
          'bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-6 h-0.5',
          'left-0 top-1/2 -translate-y-1/2 -translate-x-1 h-6 w-0.5',
          'right-0 top-1/2 -translate-y-1/2 translate-x-1 h-6 w-0.5',
        ].map((c, i) => (
          <span key={i} className={cn(
            'absolute rounded-full transition-colors',
            state === 'done' ? 'bg-up' : state === 'scanning' ? 'bg-brand' : 'bg-line', c,
          )} />
        ))}
      </div>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <span className="text-sm font-semibold">人脸识别 · 活体检测</span>
          {state === 'done' && <Badge tone="up"><Check className="w-2.5 h-2.5" />检测通过</Badge>}
          {state === 'scanning' && <Badge tone="brand">正在检测…</Badge>}
          {state === 'idle' && <Badge tone="warn">未检测</Badge>}
        </div>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          请正对摄像头，按提示完成眨眼、转头动作。系统将比对证件照片与实时人脸，判定为同一人且为活体。
        </p>
        <ul className="mt-2.5 space-y-1">
          {['光线充足、面部无遮挡', '取下眼镜、帽子与口罩', '单人出镜，背景简洁'].map(t => (
            <li key={t} className="flex items-center gap-1.5 text-2xs text-faint justify-center sm:justify-start">
              <Check className="w-3 h-3 text-up shrink-0" />{t}
            </li>
          ))}
        </ul>
        <Button
          size="sm" className="mt-3"
          variant={state === 'done' ? 'outline' : 'primary'}
          onClick={run}
          disabled={state === 'scanning'}
        >
          <Camera className="w-3.5 h-3.5" />
          {state === 'done' ? '重新检测' : state === 'scanning' ? '检测中…' : '开始检测'}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------- Page -------------------------------- */
const YesNo = ({ on }: { on: boolean }) =>
  on ? <Check className="w-3.5 h-3.5 text-up inline" /> : <span className="text-faint">—</span>

export default function Kyc() {
  const level = USER.kycLevel                            // 2
  const [selfie, setSelfie] = useState(true)
  const [org, setOrg] = useState<Record<string, boolean>>({ license: false, legal: false, auth: false })
  const [submitted, setSubmitted] = useState(false)
  const [modal, setModal] = useState(false)

  const orgReady = org.license && org.legal && org.auth

  const rightCols: Col<Right>[] = [
    {
      key: 'lv', header: '认证等级', cell: r => (
        <span className="flex items-center gap-1.5">
          <span className={cn('text-xs font-medium', r.current ? 'text-brand' : 'text-ink')}>{r.level}</span>
          {r.current && <Badge tone="brand">当前</Badge>}
        </span>
      ),
    },
    { key: 'daily', header: '24h 提现额度', align: 'right', cell: r => <span className="text-xs tnum">{r.daily}</span> },
    { key: 'single', header: '单笔限额', align: 'right', cell: r => <span className="text-xs tnum">{r.single}</span> },
    { key: 'spot', header: '币币交易', align: 'center', cell: r => <YesNo on={r.spot} /> },
    { key: 'futures', header: '合约交易', align: 'center', cell: r => <YesNo on={r.futures} /> },
    { key: 'fiat', header: '法币充提', align: 'center', hideBelow: 'sm', cell: r => <YesNo on={r.fiat} /> },
    { key: 'api', header: 'API 提现', align: 'center', hideBelow: 'sm', cell: r => <YesNo on={r.apiWd} /> },
  ]

  return (
    <div>
      <PageHeader
        title="实名认证"
        sub="KYC 三级认证 · 证件影像 · 人脸识别活体检测"
        actions={
          <Badge tone={USER.kyc === 'verified' ? 'up' : 'warn'} className="px-2 py-1">
            <BadgeCheck className="w-3 h-3" />
            {USER.kyc === 'verified' ? `已认证 · Lv${level}` : '未认证'}
          </Badge>
        }
      />

      {/* -------------------- 提现前提 · 显著提示 --------------------- */}
      <Card className="mb-4 border-brand/40 bg-brand/5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
          <span className="w-9 h-9 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">实名认证是提现的前提</div>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              未完成 Lv1 基础认证的账户无法发起任何提现请求；Lv2 高级认证后方可开通法币充提与 API 提现权限。
              当前账户已完成 <b className="text-ink">Lv{level}</b>，24h 提现额度 <b className="text-ink tnum">{usd(1_000_000, 0)}</b>。
            </p>
          </div>
          <Link to="/assets/withdraw" className="shrink-0">
            <Button variant="outline" size="sm">前往提现 <ArrowRight className="w-3.5 h-3.5" /></Button>
          </Link>
        </div>
      </Card>

      {/* ------------------------------ Stepper ------------------------------ */}
      <Card className="mb-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center">
          {LEVELS.map((l, i) => {
            const done = l.lv <= level
            const active = l.lv === level + 1
            return (
              <div key={l.lv} className="flex items-center flex-1 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn(
                    'w-9 h-9 rounded-full grid place-items-center shrink-0 text-sm font-semibold tnum border-2 transition-colors',
                    done ? 'bg-up/10 text-up border-up' : active ? 'bg-brand/10 text-brand border-brand' : 'bg-elevated text-faint border-line',
                  )}>
                    {done ? <Check className="w-4 h-4" /> : l.lv}
                  </span>
                  <div className="min-w-0">
                    <div className={cn('text-sm font-medium truncate', done || active ? 'text-ink' : 'text-faint')}>{l.title}</div>
                    <div className="text-2xs text-muted mt-0.5 truncate">{l.sub}</div>
                  </div>
                  <Badge tone={done ? 'up' : active ? 'brand' : 'muted'} className="ml-1 shrink-0">
                    {done ? '已完成' : active ? '可申请' : '未开始'}
                  </Badge>
                </div>
                {i < LEVELS.length - 1 && (
                  <div className={cn(
                    'flex-1 mx-4 rounded-full hidden sm:block h-0.5',
                    l.lv < level ? 'bg-up' : 'bg-line',
                  )} />
                )}
                {i < LEVELS.length - 1 && (
                  <div className={cn('w-0.5 h-4 ml-4 my-1 sm:hidden', l.lv < level ? 'bg-up' : 'bg-line')} />
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* ------------------------- Lv1 基础认证 ------------------------- */}
          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2">Lv1 基础认证 <Badge tone="up"><Check className="w-2.5 h-2.5" />已完成</Badge></span>}
              sub="审核通过于 2024-11-04 · 信息一经提交不可自行修改"
              right={<span className="text-2xs font-mono text-faint">F-06</span>}
            />
            <div className="grid sm:grid-cols-2 gap-3 p-4">
              {[
                { label: '真实姓名', value: '陈**' },
                { label: '国籍 / 地区', value: '中国香港 (Hong Kong SAR)' },
                { label: '证件类型', value: '身份证' },
                { label: '证件号码', value: 'A12****(9)' },
              ].map(f => (
                <div key={f.label} className="rounded-lg bg-elevated border border-line px-3 h-11 flex items-center justify-between gap-2">
                  <span className="text-2xs text-muted shrink-0">{f.label}</span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium truncate tnum">{f.value}</span>
                    <Check className="w-3.5 h-3.5 text-up shrink-0" />
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4 -mt-1">
              <div className="flex items-start gap-2 text-2xs text-faint leading-relaxed">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                如需更正姓名或证件号码，请提交工单并附上证件影像，由后台风控人工处理（后台 B-09 用户审核）。
              </div>
            </div>
          </Card>

          {/* ------------------------- Lv2 高级认证 ------------------------- */}
          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2">Lv2 高级认证 <Badge tone="up"><Check className="w-2.5 h-2.5" />已完成</Badge></span>}
              sub="证件影像 + 人脸识别活体检测"
              right={<span className="text-2xs font-mono text-faint">F-06</span>}
            />

            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DropZone kind="front" title="证件正面" hint="JPG / PNG，≤ 5MB" done onUpload={() => {}} />
                <DropZone kind="back" title="证件反面" hint="JPG / PNG，≤ 5MB" done onUpload={() => {}} />
                <DropZone
                  kind="selfie" title="手持证件照" hint="点击上传 · 需露出完整脸部与证件"
                  done={selfie} onUpload={() => setSelfie(true)}
                />
              </div>

              <div className="mt-5 pt-5 border-t border-line">
                <FaceScan />
              </div>
            </div>
          </Card>

          {/* ------------------------- Lv3 机构认证 ------------------------- */}
          <Card>
            <CardHeader
              title={<span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted" />Lv3 机构认证
                <Badge tone={submitted ? 'brand' : 'muted'}>{submitted ? '审核中' : '未开始'}</Badge>
              </span>}
              sub="面向法人主体 / 基金 / 做市商 — 通过后享受不限额提现与专属费率"
              right={<span className="text-2xs font-mono text-faint">F-06</span>}
            />

            <div className="p-4">
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <Input label="机构名称" placeholder="请输入营业执照上的完整名称" disabled={submitted} />
                <Input label="统一社会信用代码 / BR No." placeholder="例如 91310000MA1K3..." disabled={submitted} />
                <Select label="注册地" options={NATIONS} disabled={submitted} />
                <Select label="法人证件类型" options={DOCTYPES} disabled={submitted} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { k: 'license', t: '营业执照', h: '加盖公章的彩色扫描件' },
                  { k: 'legal', t: '法人证件', h: '身份证 / 护照正反面' },
                  { k: 'auth', t: '授权书', h: '经办人授权书 + 签章' },
                ] as const).map(z => (
                  <DropZone
                    key={z.k} kind={z.k === 'legal' ? 'front' : 'selfie'}
                    title={z.t} hint={z.h}
                    done={org[z.k]} locked={submitted}
                    onUpload={() => setOrg({ ...org, [z.k]: true })}
                  />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                <div className="text-2xs text-faint flex-1 leading-relaxed">
                  提交后由合规团队人工复核，通常于 <b className="text-muted">3 个工作日</b>内出具结果。
                  审核期间账户功能不受影响。
                </div>
                <Button
                  size="sm" className="shrink-0"
                  disabled={!orgReady || submitted}
                  onClick={() => setModal(true)}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {submitted ? '已提交，审核中' : '提交申请'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ------------------------------ Side rail ----------------------------- */}
        <div className="space-y-4">
          <Card className="border-warn/40 bg-warn/5">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warn" />
                <Badge tone="warn">待澄清 · 第三方服务</Badge>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                <b className="text-ink">人脸识别 / 活体检测 / 证件 OCR</b> 需由第三方 KYC 服务商
                （<span className="font-mono text-warn">Sumsub</span> / <span className="font-mono text-warn">Jumio</span> / Onfido）提供，
                按调用次数计费，须由甲方采购并提供账号与密钥。
              </p>
              <p className="text-xs text-muted leading-relaxed mt-2">
                本合同交付 <b className="text-ink">认证流程、状态机、影像存储与后台审核界面</b>；
                识别结果由服务商回调写入。
              </p>
              <Link to="/coverage" className="inline-flex items-center gap-1 text-2xs text-brand hover:underline mt-2">
                查看全部待澄清事项 →
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="认证状态" sub="当前账户" />
            <div className="divide-y divide-line/60">
              {[
                { k: 'UID', v: USER.uid },
                { k: '认证状态', v: '已通过' },
                { k: '当前等级', v: `Lv${level} 高级认证` },
                { k: '提交时间', v: '2024-11-03 21:40' },
                { k: '通过时间', v: '2024-11-04 10:12' },
                { k: '审核人', v: '风控 · auto+人工复核' },
              ].map(r => (
                <div key={r.k} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-2xs text-muted">{r.k}</span>
                  <span className="text-xs tnum font-medium">{r.v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="隐私与数据" />
            <ul className="p-4 space-y-2">
              {[
                '证件影像加密存储，仅合规审核可见',
                '不向第三方出售或共享个人身份数据',
                '按 GDPR / PDPO 保留期限自动销毁',
                '所有审核操作写入后台操作日志',
              ].map(t => (
                <li key={t} className="flex gap-2 text-2xs text-muted leading-relaxed">
                  <ScanFace className="w-3 h-3 text-faint shrink-0 mt-0.5" />{t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* ------------------------------ 权益对比表 ----------------------------- */}
      <Card className="mt-4">
        <CardHeader
          title="各级认证权益对比"
          sub="额度以 USDT 等值计算，按自然日 (UTC+8) 重置"
          right={<span className="text-2xs text-faint">当前 Lv{level}</span>}
        />
        <Table
          cols={rightCols}
          rows={RIGHTS}
          className="[&_tbody_tr:nth-child(3)]:bg-brand/5"
        />
        <div className="px-4 py-2.5 border-t border-line text-2xs text-faint leading-relaxed">
          Lv3 机构认证的额度与费率可按协议单独议定；做市商 (MM) 账户另有专属通道。
        </div>
      </Card>

      {/* ------------------------------- Modal ------------------------------- */}
      <Modal
        open={modal} onClose={() => setModal(false)} title="提交机构认证申请"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>再检查一下</Button>
            <Button className="flex-1" onClick={() => { setSubmitted(true); setModal(false) }}>确认提交</Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed text-muted">
            提交后材料将进入合规人工复核队列，审核期间不可修改。请确认所有影像清晰、四角完整、未经任何编辑。
          </p>
          <ul className="space-y-1.5">
            {['营业执照', '法人证件', '授权书'].map(t => (
              <li key={t} className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-up" />{t} <span className="text-faint ml-auto text-2xs">已上传</span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  )
}
