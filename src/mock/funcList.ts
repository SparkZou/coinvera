/* ------------------------------------------------------------------ *
 * FUNCTION LIST REGISTRY
 *
 * Transcribed 1:1 from the client's Annex 1 —《功能列表 (1).xlsx》.
 * 53 front-office function points + 73 back-office pages = 126 items.
 *
 * Every item carries:
 *   route  — where it lives in this prototype ('' = template/enumerated only)
 *   status — 'done'  已在原型中实现
 *            'tpl'   以模板形式覆盖（后台同构页面）
 *            'q'     ⚠️ 存在需澄清的问题（合同 vs 功能表冲突）
 *
 * This registry is the single source of truth for the /coverage page,
 * and becomes the skeleton of the FSD (功能规格说明书) in Phase 0.
 * ------------------------------------------------------------------ */

export type FnStatus = 'done' | 'tpl' | 'q'

export type FnItem = {
  id: string
  module: string        // 功能模块
  name: string          // 功能点
  desc: string          // 功能描述
  route: string
  status: FnStatus
  note?: string         // 澄清事项
}

/* ============================ 前台功能模块 (53) ============================ */

export const FRONT: FnItem[] = [
  /* -------------------------------- 基本功能 (17) ------------------------------- */
  { id: 'F-01', module: '基本功能', name: '注册', desc: '支持手机注册与邮箱注册', route: '/register', status: 'done' },
  { id: 'F-02', module: '基本功能', name: '验证', desc: '支持指纹，图案，人脸识别', route: '/app-preview', status: 'q',
    note: '指纹/图案为 App 原生能力；人脸识别需第三方 KYC 服务商（Sumsub / Jumio），由甲方提供' },
  { id: 'F-03', module: '基本功能', name: '登录', desc: '用户登录，需要进行二次安全验证，包括谷歌验证、手机验证码、邮箱验证码', route: '/login', status: 'q',
    note: '⚠️ 合同 Article I 明确排除 "secondary verification services" 与 "SMS email verification services"，与本条直接冲突，须书面澄清' },
  { id: 'F-04', module: '基本功能', name: '手机邮箱绑定', desc: '同时支持手机或邮箱作为账号登录系统', route: '/account/security', status: 'done' },
  { id: 'F-05', module: '基本功能', name: '密码找回', desc: '根据用户绑定的手机或邮箱，进行密码找回', route: '/forgot', status: 'done' },
  { id: 'F-06', module: '基本功能', name: '身份认证', desc: '用户实名认证与后台人工审核，作为用户提现的前提', route: '/account/kyc', status: 'done' },
  { id: 'F-07', module: '基本功能', name: '谷歌认证', desc: '设置谷歌认证，作为登录、修改安全设置、提现等重要操作的安全性', route: '/account/security', status: 'q',
    note: '⚠️ 合同 Article I 排除 "secondary verification services"' },
  { id: 'F-08', module: '基本功能', name: '二次认证', desc: '登录或出金需要二次认证（邮箱验证 短信认证）', route: '/account/security', status: 'q',
    note: '⚠️ 合同 Article I 排除 "SMS email verification services"，短信/邮件通道须由甲方提供' },
  { id: 'F-09', module: '基本功能', name: '语言切换', desc: '交易所支持中文 英文 日语 韩文的页面展示，需准备语言包', route: '/', status: 'done',
    note: '原型已实现 4 语言切换框架；日/韩文案由甲方提供' },
  { id: 'F-10', module: '基本功能', name: '操作日志', desc: '记录用户登录与设置修改记录，防止被人盗号操作', route: '/account/logs', status: 'done' },
  { id: 'F-11', module: '基本功能', name: '邀请码', desc: '提供邀请码与注册链接，用于交易所推广', route: '/account/invite', status: 'done' },
  { id: 'F-12', module: '基本功能', name: '查看公告', desc: '可以查看商户发布的公告信息', route: '/notices', status: 'done' },
  { id: 'F-13', module: '基本功能', name: '查看站内信', desc: '可以查看系统和商户发布的站内信息', route: '/inbox', status: 'done' },
  { id: 'F-14', module: '基本功能', name: '消息提醒', desc: '支持系统消息、充提现、KYC认证、安全信息等消息的站内信提醒', route: '/inbox', status: 'done' },
  { id: 'F-15', module: '基本功能', name: '主题设置', desc: '提供深色版、浅色版两种主题样式', route: '/', status: 'done',
    note: '原型右上角可实时切换' },
  { id: 'F-16', module: '基本功能', name: 'APP下载', desc: '提供APP下载入口，下载页面，需要商户自行完成APP的上架工作', route: '/download', status: 'done' },
  { id: 'F-17', module: '基本功能', name: 'API管理', desc: '可以创建和管理API', route: '/account/api', status: 'done' },

  /* -------------------------------- 币币交易 (7) -------------------------------- */
  { id: 'F-18', module: '币币交易', name: '市场选择', desc: '支持多市场，支持自选币对显示，支持代币价格自动换算法币价格', route: '/markets', status: 'done' },
  { id: 'F-19', module: '币币交易', name: 'K线图', desc: '集成 TradingView，专业显示K线图。自带各种分析工具。', route: '/trade/spot/BTC-USDT', status: 'done',
    note: '原型已集成 TradingView Lightweight Charts；Advanced Charts 授权需甲方名义申请' },
  { id: 'F-20', module: '币币交易', name: '深度图', desc: '实时显示当前币对的买卖委托深度', route: '/trade/spot/BTC-USDT', status: 'done' },
  { id: 'F-21', module: '币币交易', name: '委托列表', desc: '显示列出买卖委托列表，支持各150条数据显示', route: '/trade/spot/BTC-USDT', status: 'done' },
  { id: 'F-22', module: '币币交易', name: '限价交易', desc: '以用户指定价进行买卖交易', route: '/trade/spot/BTC-USDT', status: 'done' },
  { id: 'F-23', module: '币币交易', name: '市价交易', desc: '以最优价完成用户买卖交易', route: '/trade/spot/BTC-USDT', status: 'done' },
  { id: 'F-24', module: '币币交易', name: '成交记录', desc: '支持显示该币对最近150条交易记录', route: '/trade/spot/BTC-USDT', status: 'done' },

  /* -------------------------------- 合约交易 (18) ------------------------------- */
  { id: 'F-25', module: '合约交易', name: '合约类型', desc: '永续合约', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-26', module: '合约交易', name: '合约方向', desc: '正向 USDT（计价货币作为保证金）、反向 币本位（基础货币作为保证金）', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-27', module: '合约交易', name: '合约结算单位', desc: '正向：计价货币结算，反向：基础货币结算', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-28', module: '合约交易', name: '交易费用', desc: '交易手续费、资金费用', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-29', module: '合约交易', name: '最大杠杆', desc: '125×，商户可自定义每个交易对的最大杠杆', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-30', module: '合约交易', name: '保证金模式', desc: '逐仓、全仓', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-31', module: '合约交易', name: '高级限价委托', desc: '支持 GTC、IOC、FOK 等高级限价委托', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-32', module: '合约交易', name: '止盈止损', desc: '支持计划委托、委托预设止盈止损、仓位止盈止损', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-33', module: '合约交易', name: '双向持仓、单向持仓', desc: '支持用户设置持仓模式', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-34', module: '合约交易', name: '资金费用', desc: '资金费用锚定现货价格', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-35', module: '合约交易', name: '调整保证金', desc: '持仓仓位可随时增加或者减少保证金', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-36', module: '合约交易', name: '标记价格爆仓', desc: '标记价格根据指数价格和当前市场价格计算，根据标记价格爆仓', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-37', module: '合约交易', name: '指数价格', desc: '根据 FTX、Binance、Huobi、OKex、Coinbase、Bitstamp 等多家交易所的实时价格和盘口价格计算指数价格，每秒计算一次', route: '/trade/futures/BTC-USDT', status: 'q',
    note: '⚠️ FTX 已于 2022-11 破产清算，须确认替换来源。该条暗示本文档源自白标供应商的历史产品清单' },
  { id: 'F-38', module: '合约交易', name: '梯度起始保证金、维持保证金制度', desc: '实行阶梯维持保证金率制度：持仓越大，起始/维持保证金率越高，可选最高杠杆越低', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-39', module: '合约交易', name: '强制部分平仓及爆仓', desc: '强平时逐步减少用户的仓位，每降低一个风险等级则计算一次，逐级平仓', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-40', module: '合约交易', name: '未实现盈利提取', desc: '每分钟结算一次未实现盈亏，大大增加资金利用率', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-41', module: '合约交易', name: '保险基金制度', desc: '爆仓后的头寸盈余会计入保险基金池，在爆仓时使用保险基金加入计算后利于平仓，减少分摊', route: '/trade/futures/BTC-USDT', status: 'done' },
  { id: 'F-42', module: '合约交易', name: '穿仓损失防控', desc: '分摊机制（ADL），发生穿仓时盈利方分摊穿仓损失', route: '/trade/futures/BTC-USDT', status: 'done' },

  /* -------------------------------- 增值服务 (2) -------------------------------- */
  { id: 'F-43', module: '增值服务', name: '现货经纪人', desc: '支持币币交易的邀请返佣、持仓返佣，可以查看所有下级信息及分红情况', route: '/broker', status: 'done' },
  { id: 'F-44', module: '增值服务', name: '合约经纪人', desc: '开通合约服务后，可对合约交易手续费返佣，包括返佣、分佣、直客返佣三种模式', route: '/broker', status: 'done' },

  /* -------------------------------- 资产管理 (5) -------------------------------- */
  { id: 'F-45', module: '资产管理', name: '资金列表', desc: '记录用户当前各种资产（支持代币与法币）的可用、冻结数额', route: '/assets', status: 'done' },
  { id: 'F-46', module: '资产管理', name: '充值', desc: '支持数字货币与法币的充值（需客户提供法币第三方支付接口）', route: '/assets/deposit', status: 'q',
    note: '⚠️ 合同 Article I 排除 "wallet services (cold wallet, hot wallet)"。数字货币充值必须依赖钱包服务（地址生成 + 链上监听），须澄清责任边界' },
  { id: 'F-47', module: '资产管理', name: '提现', desc: '支持数字货币与法币的提现，提现有自动风控策略，与人工审核', route: '/assets/withdraw', status: 'q',
    note: '⚠️ 合同 Article I 排除 "wallet services"。数字货币提现必须依赖热钱包签名，须澄清责任边界' },
  { id: 'F-48', module: '资产管理', name: '资产划转', desc: '可以将法币账户、合约账户等账户中的可用资产划转至币币账户', route: '/assets/transfer', status: 'done' },
  { id: 'F-49', module: '资产管理', name: '资金流水', desc: '记录用户每一笔充值、提现、转账等历史操作', route: '/assets/history', status: 'done' },

  /* -------------------------------- 风控系统 (2) -------------------------------- */
  { id: 'F-50', module: '风控系统', name: '流动性对冲', desc: '高频订单或整体订单锚定流动性内部全部对冲', route: '/admin/risk/hedge', status: 'q',
    note: '⚠️ 属量化交易系统范畴（平台做对手盘 + 外部交易所对冲），非 Web 开发。需引入量化工程师，建议列为独立阶段' },
  { id: 'F-51', module: '风控系统', name: '策略性对冲', desc: '策略判断订单出现的趋势选择风险对冲获得正向收益', route: '/admin/risk/hedge', status: 'q',
    note: '⚠️ 同上，需独立需求调研与报价' },

  /* -------------------------------- 安全系统 (2) -------------------------------- */
  { id: 'F-52', module: '安全系统', name: '风控警报器', desc: '超出配置风控的订单会响应提醒警报', route: '/admin/risk/alerts', status: 'done' },
  { id: 'F-53', module: '安全系统', name: 'WAF 防御盾', desc: '对流量攻击进行拦截和黑洞化处理', route: '/admin/risk/waf', status: 'q',
    note: 'WAF/DDoS 防护为第三方服务（Cloudflare / AWS Shield），非自研。订阅费用由甲方承担' },
]

/* ============================ 后台功能模块 (73) ============================ */

type AdminPage = { id: string; group: string; cls: string; name: string; route: string; status: FnStatus; note?: string }

export const ADMIN: AdminPage[] = [
  /* 交易配置 (14) */
  { id: 'B-01', group: '交易配置', cls: '币币交易', name: '币种配置',       route: '/admin/trade/coins',          status: 'done' },
  { id: 'B-02', group: '交易配置', cls: '币币交易', name: '币对配置',       route: '/admin/trade/pairs',          status: 'done' },
  { id: 'B-03', group: '交易配置', cls: '币币交易', name: '币币订单管理',   route: '/admin/trade/spot-orders',    status: 'done' },
  { id: 'B-04', group: '交易配置', cls: '杠杆交易', name: '杠杆规则配置',   route: '/admin/trade/margin-rules',   status: 'q',
    note: '⚠️ 杠杆（借贷）交易是独立的第三套交易系统。前台功能表无对应模块，合同 Article I 亦仅列 spot 与 derivatives。须确认是否在范围内' },
  { id: 'B-05', group: '交易配置', cls: '杠杆交易', name: '杠杆订单管理',   route: '/admin/trade/margin-orders',  status: 'q', note: '⚠️ 同 B-04' },
  { id: 'B-06', group: '交易配置', cls: '合约交易', name: '币种配置',       route: '/admin/trade/futures-coins',  status: 'done' },
  { id: 'B-07', group: '交易配置', cls: '合约交易', name: '币对配置',       route: '/admin/trade/futures-pairs',  status: 'done' },
  { id: 'B-08', group: '交易配置', cls: '手续费管理', name: '费率设置',     route: '/admin/fee/rates',            status: 'done' },
  { id: 'B-09', group: '交易配置', cls: '手续费管理', name: '手续费折扣',   route: '/admin/fee/discount',         status: 'tpl' },
  { id: 'B-10', group: '交易配置', cls: '手续费管理', name: '平台币抵扣手续费', route: '/admin/fee/platform-token', status: 'q',
    note: '⚠️ 隐含平台需发行自有平台币，属独立子系统，未在合同 Article I 中列明' },
  { id: 'B-11', group: '交易配置', cls: '充币提币', name: '充币明细',       route: '/admin/wallet/deposits',      status: 'done' },
  { id: 'B-12', group: '交易配置', cls: '充币提币', name: '提币明细',       route: '/admin/wallet/withdrawals',   status: 'done' },
  { id: 'B-13', group: '交易配置', cls: '充币提币', name: '提币免审配置',   route: '/admin/wallet/no-audit',      status: 'tpl' },
  { id: 'B-14', group: '交易配置', cls: '充币提币', name: '提币说明设置',   route: '/admin/wallet/notes',         status: 'tpl' },

  /* 财务管理 (7) */
  { id: 'B-15', group: '财务管理', cls: '财务报表', name: '资产负债表',     route: '/admin/finance/balance-sheet', status: 'q',
    note: '⚠️ 完整会计报表体系，工作量显著。建议列入 Phase 2' },
  { id: 'B-16', group: '财务管理', cls: '财务报表', name: '现金流量表',     route: '/admin/finance/cashflow',      status: 'q', note: '⚠️ 同 B-15' },
  { id: 'B-17', group: '财务管理', cls: '财务报表', name: '利润表',         route: '/admin/finance/pnl',           status: 'q', note: '⚠️ 同 B-15' },
  { id: 'B-18', group: '财务管理', cls: '财务小工具', name: '转账工具',     route: '/admin/finance/transfer-tool', status: 'tpl' },
  { id: 'B-19', group: '财务管理', cls: '财务小工具', name: '转账记录',     route: '/admin/finance/transfer-log',  status: 'tpl' },
  { id: 'B-20', group: '财务管理', cls: '财务小工具', name: '平账工具',     route: '/admin/finance/recon-tool',    status: 'done' },
  { id: 'B-21', group: '财务管理', cls: '财务小工具', name: '调账记录',     route: '/admin/finance/adjust-log',    status: 'tpl' },

  /* 用户管理 (6) */
  { id: 'B-22', group: '用户管理', cls: '用户管理',     name: '用户管理',     route: '/admin/users',                 status: 'done' },
  { id: 'B-23', group: '用户管理', cls: '实名认证审核', name: '实名认证审核', route: '/admin/users/kyc-review',      status: 'done' },
  { id: 'B-24', group: '用户管理', cls: '实名认证设置', name: '实名认证设置', route: '/admin/users/kyc-config',      status: 'tpl' },
  { id: 'B-25', group: '用户管理', cls: '用户交易汇总', name: '用户交易汇总', route: '/admin/users/trade-summary',   status: 'tpl' },
  { id: 'B-26', group: '用户管理', cls: '用户持仓汇总', name: '用户持仓汇总', route: '/admin/users/position-summary',status: 'tpl' },
  { id: 'B-27', group: '用户管理', cls: '用户流水汇总', name: '用户流水汇总', route: '/admin/users/ledger-summary',  status: 'tpl' },

  /* 业务报表 (7) */
  { id: 'B-28', group: '业务报表', cls: '币币交易统计', name: '币币交易统计', route: '/admin/reports/spot',            status: 'done' },
  { id: 'B-29', group: '业务报表', cls: '合约持仓统计', name: '合约持仓统计', route: '/admin/reports/futures-position',status: 'tpl' },
  { id: 'B-30', group: '业务报表', cls: '合约平仓统计', name: '合约平仓统计', route: '/admin/reports/futures-close',   status: 'tpl' },
  { id: 'B-31', group: '业务报表', cls: '注册统计',     name: '注册统计',     route: '/admin/reports/register',        status: 'tpl' },
  { id: 'B-32', group: '业务报表', cls: '登录统计',     name: '登录统计',     route: '/admin/reports/login',           status: 'tpl' },
  { id: 'B-33', group: '业务报表', cls: '充值统计',     name: '充值统计',     route: '/admin/reports/deposit',         status: 'tpl' },
  { id: 'B-34', group: '业务报表', cls: '提币统计',     name: '提币统计',     route: '/admin/reports/withdraw',        status: 'tpl' },

  /* 增值服务 (4) */
  { id: 'B-35', group: '增值服务', cls: '经纪人', name: '经纪人管理',     route: '/admin/broker/manage',     status: 'done' },
  { id: 'B-36', group: '增值服务', cls: '经纪人', name: '经纪人返佣汇总', route: '/admin/broker/commission', status: 'tpl' },
  { id: 'B-37', group: '增值服务', cls: '经纪人', name: '经纪人持仓汇总', route: '/admin/broker/position',   status: 'tpl' },
  { id: 'B-38', group: '增值服务', cls: '经纪人', name: '经纪人角色管理', route: '/admin/broker/roles',      status: 'tpl' },

  /* 客服运营 (8) */
  { id: 'B-39', group: '客服运营', cls: '内容发布',   name: '公告管理',     route: '/admin/cms/notices',    status: 'done' },
  { id: 'B-40', group: '客服运营', cls: '内容发布',   name: '文章管理',     route: '/admin/cms/articles',   status: 'tpl' },
  { id: 'B-41', group: '客服运营', cls: '内容发布',   name: '文章分类配置', route: '/admin/cms/categories', status: 'tpl' },
  { id: 'B-42', group: '客服运营', cls: '内容发布',   name: '站内信管理',   route: '/admin/cms/inbox',      status: 'tpl' },
  { id: 'B-43', group: '客服运营', cls: '首页轮播图', name: 'PC首页轮播图', route: '/admin/cms/banner-pc',  status: 'tpl' },
  { id: 'B-44', group: '客服运营', cls: '首页轮播图', name: 'APP首页轮播图',route: '/admin/cms/banner-app', status: 'tpl' },
  { id: 'B-45', group: '客服运营', cls: '工单管理',   name: '工单管理',     route: '/admin/cms/tickets',    status: 'done' },
  { id: 'B-46', group: '客服运营', cls: '图片上传',   name: '图片上传',     route: '/admin/cms/upload',     status: 'tpl' },

  /* 运营工具 (10) */
  { id: 'B-47', group: '运营工具', cls: '赠币工具',     name: '赠币工具',     route: '/admin/ops/gift',                 status: 'done' },
  { id: 'B-48', group: '运营工具', cls: '赠币工具',     name: '赠送记录',     route: '/admin/ops/gift-log',             status: 'tpl' },
  { id: 'B-49', group: '运营工具', cls: '持仓奖励',     name: '规则设置',     route: '/admin/ops/holding-reward-rules', status: 'tpl' },
  { id: 'B-50', group: '运营工具', cls: '持仓奖励',     name: '活动记录',     route: '/admin/ops/holding-reward-log',   status: 'tpl' },
  { id: 'B-51', group: '运营工具', cls: '持仓奖励',     name: '持币用户管理', route: '/admin/ops/holders',              status: 'tpl' },
  { id: 'B-52', group: '运营工具', cls: '持仓奖励',     name: '持币量统计',   route: '/admin/ops/holding-stats',        status: 'tpl' },
  { id: 'B-53', group: '运营工具', cls: '持仓奖励',     name: '历史分红明细', route: '/admin/ops/dividend-history',     status: 'tpl' },
  { id: 'B-54', group: '运营工具', cls: '锁仓/解锁工具', name: '锁仓工具',    route: '/admin/ops/lock',                 status: 'tpl' },
  { id: 'B-55', group: '运营工具', cls: '锁仓/解锁工具', name: '解锁工具',    route: '/admin/ops/unlock',               status: 'tpl' },
  { id: 'B-56', group: '运营工具', cls: '锁仓/解锁工具', name: '赠币锁仓',    route: '/admin/ops/gift-lock',            status: 'tpl' },

  /* 系统配置 (17) */
  { id: 'B-57', group: '系统配置', cls: '管理员配置',   name: '员工管理',        route: '/admin/sys/staff',           status: 'done' },
  { id: 'B-58', group: '系统配置', cls: '管理员配置',   name: '角色管理',        route: '/admin/sys/roles',           status: 'done' },
  { id: 'B-59', group: '系统配置', cls: '管理员配置',   name: '权限管理',        route: '/admin/sys/permissions',     status: 'done' },
  { id: 'B-60', group: '系统配置', cls: '管理员配置',   name: '操作日志',        route: '/admin/sys/logs',            status: 'done' },
  { id: 'B-61', group: '系统配置', cls: '基础配置',     name: '多语言配置',      route: '/admin/sys/i18n',            status: 'done' },
  { id: 'B-62', group: '系统配置', cls: '基础配置',     name: '多语言模板',      route: '/admin/sys/i18n-template',   status: 'tpl' },
  { id: 'B-63', group: '系统配置', cls: '基础配置',     name: 'KV配置',          route: '/admin/sys/kv',              status: 'tpl' },
  { id: 'B-64', group: '系统配置', cls: '基础配置',     name: '钱包设置',        route: '/admin/sys/wallet',          status: 'q',
    note: '⚠️ 合同 Article I 排除 wallet services。本页仅作为「对接第三方托管服务」的配置界面，钱包本身由甲方提供' },
  { id: 'B-65', group: '系统配置', cls: 'APP管理',      name: '版本发布',        route: '/admin/sys/app-release',     status: 'done' },
  { id: 'B-66', group: '系统配置', cls: 'APP管理',      name: 'APP版本升级记录', route: '/admin/sys/app-version-log', status: 'tpl' },
  { id: 'B-67', group: '系统配置', cls: 'APP管理',      name: '首页功能入口',    route: '/admin/sys/app-entries',     status: 'tpl' },
  { id: 'B-68', group: '系统配置', cls: 'API管理',      name: 'API参数配置',     route: '/admin/sys/api-config',      status: 'tpl' },
  { id: 'B-69', group: '系统配置', cls: 'API管理',      name: 'API白名单',       route: '/admin/sys/api-whitelist',   status: 'tpl' },
  { id: 'B-70', group: '系统配置', cls: '开放平台管理', name: '支付订单',        route: '/admin/sys/payment-orders',  status: 'q',
    note: '法币支付通道由甲方提供（功能表已注明）' },
  { id: 'B-71', group: '系统配置', cls: '定时任务',     name: '任务配置',        route: '/admin/sys/cron',            status: 'done' },
  { id: 'B-72', group: '系统配置', cls: '定时任务',     name: '执行日志',        route: '/admin/sys/cron-logs',       status: 'tpl' },
  { id: 'B-73', group: '系统配置', cls: '系统语言设置', name: '系统语言设置',    route: '/admin/sys/language',        status: 'tpl' },
]

/* ---------------------------------- Totals --------------------------------- */
export const TOTALS = {
  front: FRONT.length,                                  // 53
  admin: ADMIN.length,                                  // 73
  all: FRONT.length + ADMIN.length,                     // 126
  questions: [...FRONT, ...ADMIN].filter(i => i.status === 'q').length,
}

/** Admin nav tree, derived from the registry — 73 pages, grouped exactly as the xlsx. */
export const ADMIN_NAV = (() => {
  const groups: { group: string; items: AdminPage[] }[] = []
  for (const p of ADMIN) {
    let g = groups.find(x => x.group === p.group)
    if (!g) { g = { group: p.group, items: [] }; groups.push(g) }
    g.items.push(p)
  }
  return groups
})()
