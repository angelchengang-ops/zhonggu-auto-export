# Google Ads 追踪链路修复验收 — 2026-09-20

状态：本地实现与隔离验收完成，可合并/部署；尚未推送、合并主分支或发布生产。GTM 默认关闭，Google Ads 实际接收未验收。未启动广告、未产生投放费用、未向生产 CRM 写测试询盘。

## 版本与原工作区保护

- 原项目：`D:\GitHub\zhonggu-auto-export`。
- 独立分支：`codex/google-ads-tracking-20260920`。
- 隔离工作树：`D:\GitHub\codex临时文件\2026-09-20-google-ads-tracking\work\repo`，属于原项目同一 Git 仓库。
- 修改前与交付前读取的 GitHub `origin/main`：`82739e3668fbe8b20c34a0886b2dbf1a66a9fc72`；原主目录 HEAD 相同。
- 本次提交号见交付目录的 `release-manifest.json`；本报告不将本地完成误记为生产部署完成。
- 生产部署提交未从 Netlify 控制台独立确认；2026-09-20 实测 14 个公开页面和 3 个线上共享脚本。线上脚本与原主分支基线在去除 BOM/统一换行后相同。
- 原工作区 6 项 tracked 文件改动保持原样；补丁 SHA-256 前后相同。未跟踪文件清单前后相同，素材、私有运行数据和历史报告留在原地。
- 备份和清单：交付目录上级 `work/original-tracked.patch`、`original-untracked-paths.txt`、`original-preservation.json`。没有 reset、清理、stash 或覆盖原工作区。

## 已实现

1. 共享 GTM 事件层与公开构建配置，不编造 Google ID。默认只在站内排队事件，Google 脚本不加载；配置启用后仍限制正式域名和生产构建。
2. 普通表单与站内 WhatsApp 弹窗统一发出 `lead_submit_success`。只有真实接口持久化成功，返回完整成功标记、记录 ID 和服务端 conversion 回执后才允许发出。保存失败、打开弹窗和测试记录不算成功。
3. `transaction_id` 由服务端根据保存记录的 submissionId（旧请求回退到 CRM ID）生成稳定哈希；前端已发记录去重，后续 GTM 将同一 ID 传入 Ads Transaction ID。感谢页不生成、恢复或重发成功事件。
4. 新增观察事件 `lead_form_open`、`whatsapp_lead_open`，标记 secondary。原弹窗的 CRM 点击记录逻辑保留。
5. 90 天来源持久化：first_touch、first_ad_touch、last_touch。涵盖 gclid、gbraid、wbraid、utm_source、utm_medium、utm_campaign、utm_term、utm_content、首次 landing_page、referrer、captured_at。跨页提交保留来源；直接访问不伪造广告参数。localStorage 不可用/配额满时降级 sessionStorage，再降级页内存。
6. 两个入口的 attribution 进入现有 CRM JSON 存储，经服务端白名单与长度验证；旧记录读取为 null，不需要 SQL/表结构迁移或历史回填。后续状态更新仍保留归因。
7. 保留 Umami。新增脚本不收集或推送姓名、电话、邮箱、询盘正文到 dataLayer；落地页与 referrer 去除查询串、fragment 和 URL 用户信息，广告参数单独保存。
8. 普通表单原跳转、WhatsApp 弹窗原成功视图、表单视觉/字段/布局保留。启用 GTM 后普通跳转等待标签回调，最长 1500ms；分析错误不把已保存询盘变成失败。

## 修改文件

全部清单在 `outputs/changed-files.txt`。实际逻辑与文档：

| 文件 | 用途 |
| --- | --- |
| `assets/js/lead-tracking.js` | 来源捕获、存储降级、dataLayer、GTM 加载、成功去重、辅助事件 |
| `assets/js/tracking-config.js` | 构建生成的公开开关与 Container ID；当前关闭/空值 |
| `script.js` | 普通表单请求携带 attribution；成功后等待共享事件，再跳感谢页 |
| `assets/js/whatsapp-lead-modal.js` | 弹窗打开观察、归因请求字段、共享成功事件 |
| `netlify/functions/inquiries.js` | 持久化成功后发出 conversion 回执；点击/测试返回 null |
| `netlify/functions/crm-store.js` | 新增 attribution 兼容字段 |
| `scripts/lib/lead-attribution.js` | 归因白名单、长度、URL、时间验证 |
| `scripts/inject-lead-tracking.js`、`package.json` | 构建时配置与共享脚本接入；不接入管理页、验证文件/图片预览 |
| `scripts/version-public-assets.js`、`assets/js/whatsapp-config.js` | 所有新增/改变的公共资源与动态弹窗内容版本化 |
| `scripts/lib/sitemap-lastmod.js` | 追踪脚本注入不当作 SEO 文案更新，保持原 editorial lastmod |
| `tests/lead-tracking.test.js` | 新增 19 项必要追踪/存储/失败/去重/兼容测试 |
| `scripts/verify-lead-tracking.js` | 可重复执行的桌面、手机及实际表单本地验收 |
| `.env.tracking.example`、`docs/GOOGLE-ADS-TRACKING.md` | 环境变量示例、Google 配置、事件/字段完整合同、回退与验收方法 |
| `ops/seo/2026-09-20-google-ads-tracking.md` | 本次独立交付记录 |

151 个 HTML 文件的改动全部为追踪脚本引用或资源哈希。去掉这两类机械变动后，与主分支 HTML 内容完全一致。样式、车辆价格数据、redirects、robots 与全部 sitemap 文件无实际差异。没有修改 SEO 文案、canonical 或报价。

## 验收结果

| 检查 | 结果 |
| --- | --- |
| 完整 `npm run build` | 通过；追踪接入 151 个公开页面，GTM=false |
| `npm test` | 93/93 通过，包含新增 19 项追踪测试 |
| `npm run check:site` | 153 个 HTML、124 个唯一 sitemap URL，0 issue |
| 桌面浏览器 | 1440px，124/124 个 sitemap 页面通过 |
| 手机浏览器模拟 | 390px，124/124 个 sitemap 页面通过；未测试实体手机 |
| 本地真实接口保存 | 242 条，仅在内存，全部保留原始首次广告来源 |
| 失败、双击、重试 | 两入口均通过；失败 0 成功事件，重试保留 submissionId；每次保存 1 成功事件 |
| WhatsApp 打开 | 只有辅助事件；提交成功才有主要事件；仍留在原页 |
| 感谢页直接访问/反复刷新 | 0 新主要事件 |
| 无参数、UTM、gclid、gbraid/wbraid、跨页/回访 | 单元及浏览器测试通过；不把空值当作 Google 来源 |
| 缺失/被拦截 GTM、存储禁用、存储已满 | 不影响正常询盘；已验证降级与去重 |
| 旧记录与 CRM 后续更新 | 旧数据兼容，新归因在读取/更新/重试中保留 |
| 生产 CRM/对外消息 | 写入/发送 0；浏览器阻断 500 个外部资源请求 |

证据位于 `work/`：`build-final.log`、`test-final.log`、`site-final.log`、`browser/browser-results.json`、4 张桌面/手机表单截图、`html-diff-check.json`、`live-baseline.json`、`original-preservation.json`。浏览器使用当前真实前端和 Netlify handler，以本地内存代替生产存储；这不是生产 Blobs 或 Google 收到转化的证明。

线上只读覆盖：6 个 Coolray 配置详情页、Coolray 南沙现货指南、Coolray exporter 落地页、Binyue Algeria 英/法/阿语页、首页、contact、thank-you，均 HTTP 200，保留 Umami，修复前未见 Google 标签。

## 上线配置与待验收

- 必填真实 `GTM-…`，通过 `ZHONGGU_GTM_CONTAINER_ID` 设置；明确启用时才设置 `ZHONGGU_GTM_ENABLED=true`，然后重新构建。
- 在 GTM 原生 Google Ads 转化标签填写真实 `AW-…` / Conversion ID、该询盘转化的 Conversion Label。
- 触发器只匹配 `lead_submit_success`；Transaction ID 取 dataLayer 的 `transaction_id`。Ads 设置 Primary、Count=One。辅助事件不作为主要转化；感谢页 PV 不作为转化。
- 基础 Google tag、Conversion Linker、自动标记、同意设置及详细操作见 `docs/GOOGLE-ADS-TRACKING.md` 中的官方来源和配置合同。
- 尚未验收：正式部署 commit、生产 Blobs 保存后的新增归因、真实容器加载、Tag Assistant 标签触发、Google Ads 接收/去重、实体手机。需要真实配置及正式发布后继续。
- 生产测试必须保持既有认证、精确查重和测试隔离；晨检合成测试有意不计 Ads 转化。真实 Ads 链路可通过受控环境/后续自然询盘观察，不能随意创建普通假客户。
- 当前浏览器去重不是无限期/跨设备 exactly-once；用户清除存储或脚本被拦截可能丢测。现有 CRM 并发集合写入未重构，Google 端应使用稳定 transaction_id 去重。

## 合并与回退

本分支基于本次最新 origin/main，交付为本地提交及可应用补丁。合并/发布前再次 fetch 确认远端没有新改动，并继续保护主目录原有未提交文件。代码未发布，不需要对生产执行回退。

若未来已启用 GTM，最快停止 Google 标签的方法是关闭 ZHONGGU_GTM_ENABLED 并重新构建，不恢复或删除客户数据。若回退代码，保留新增 attribution 的服务端兼容读写，避免旧 normalizer 丢弃新增顶层字段。无需数据库迁移回退。
