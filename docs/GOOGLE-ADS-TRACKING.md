# Google Ads 询盘追踪接入

## 状态与边界

代码支持 GTM，但仓库默认不加载 Google 标签。现有 Umami 保留。没有创建、启用广告，也没有创建 Google Ads 转化操作。本次实现针对正式网站实际使用的 Netlify Functions + Netlify Blobs；旧 `server.js` 媒体管理服务不作为生产询盘验收替代品。

## 构建配置

| 配置 | 默认 | 设置位置 |
| --- | --- | --- |
| `ZHONGGU_GTM_ENABLED` | `false`（未设置亦关闭） | Netlify 构建环境变量 |
| `ZHONGGU_GTM_CONTAINER_ID` | 空 | Netlify 构建环境变量；填账户里的真实 `GTM-…` |
| `CONTEXT` | 平台提供 | 只允许 `production`；预览构建自动关闭 |

开启开关却没有合法 ID 时，构建直接失败；`GTM-XXXX` 占位不被接受。浏览器只允许在 `zhongguauto.com` / `www.zhongguauto.com` 加载 GTM；本地和预览域名不加载。`daily_test_id` 页面不加载 GTM、不记录归因或事件。

`npm run build` 生成 `assets/js/tracking-config.js`，注入配置与共享追踪脚本，并对所有引用使用内容哈希。不要手改生成配置，否则下一次构建会覆盖。不需要新增 npm 依赖或数据库连接。

## 需要用户提供的 Google 配置

1. 真实 GTM Web Container ID（`GTM-…`），填入上述构建环境变量。
2. Google Ads 的真实 Google tag / Conversion ID（通常显示为 `AW-…`；GTM 原生转化标签字段按后台要求填写其数值部分）。
3. 该“成功询盘”转化操作的真实 Conversion Label。

后两项配置在 GTM 原生 Google Ads 标签中，不硬编码到网站。无需提供账号密码、令牌。不能仅凭代码事件存在便声称 Ads 已开始接收。

## GTM / Google Ads 设置合同

- 创建一个自定义事件触发器：事件名精确为 `lead_submit_success`，条件 `conversion_role = primary`。
- 创建数据层变量（Version 2）：`transaction_id`、`lead_channel`、`conversion_role`、`page_path`。
- 使用 GTM 原生 Google Ads Conversion Tracking 标签，填真实 ID/Label，将 Transaction ID 映射为 `{{transaction_id}}`。
- 该转化操作设 Primary，Count 设 One。不要再将同一询盘的 GA4 导入操作设为另一个 Primary。
- 按 Google 标签诊断配置基础 Google tag 与 Conversion Linker（覆盖首次广告着陆和后续页面），核实自动标记。不得以感谢页 Page View、任意表单 Submit 或 WhatsApp Click 触发主要转化。
- `lead_form_open` / `whatsapp_lead_open` 仅作 Secondary/分析观察，不纳入出价目标。代码的 `conversion_role` 只是事件约定，不会自动修改 Ads 后台配置。
- 按站点采用的同意方案配置 GTM；代码不自动授予 Google consent，不上传联系方式，不启用 Enhanced Conversions。后续增强型转化需单独接入。
- 无真实询盘金额时不填虚构 value 或 currency。
- 发布容器前使用 Tag Assistant：核对一次成功只触发一个主要标签、失败/打开/感谢页刷新均不触发；标签 transaction ID 必须来自服务端回执。

官方依据：[数据层](https://developers.google.com/tag-platform/tag-manager/datalayer)、[GTM 的 Google Ads 转化标签](https://support.google.com/tagmanager/answer/6105160?hl=en)、[Transaction ID 去重](https://support.google.com/google-ads/answer/6386790?hl=en)。

## 事件合同

| 事件 | 何时发生 | 字段 | 用途 |
| --- | --- | --- | --- |
| `lead_submit_success` | CRM API 明确返回 `ok=true`、`success=true`、`stored=true`、有效 ID 和服务端 conversion 回执 | `transaction_id`、`lead_channel`、`conversion_role=primary`、`page_path` | 唯一主要事件 |
| `lead_form_open` | 用户首次聚焦该普通表单，或点击指向该表单的同页锚点 | `lead_channel=inquiry_form`、`conversion_role=secondary`、`page_path` | 观察；每表单每页一次 |
| `whatsapp_lead_open` | 站内 WhatsApp 询盘弹窗实际打开 | `lead_channel=whatsapp_modal`、`conversion_role=secondary`、`page_path` | 观察；每次打开 |

两种提交共用 `window.ZhongguTracking.success()`。普通表单仍跳 `/thank-you.html`，弹窗仍留在原页显示原成功界面。仅在 GTM 启用时等待标签回调，最长 1500ms，标签被拦截不影响已保存询盘的成功流程。

服务端回执形态：`conversion: { event: 'lead_submit_success', transaction_id: 'zg-<40 hex>' }`。ID 来自服务端对已保存记录的 submissionId（旧请求回退到 CRM ID）的 SHA-256 截断值。重试返回同一个 ID；点击事件和隔离测试返回 `conversion: null`；保存失败不返回成功回执。

前端用该 ID 维护 90 天、最多 500 条的已推送记录，防止同浏览器重复调用、跨页/刷新重复推送。Google Ads 的 Transaction ID 是后续平台级去重的第二层。感谢页没有成功恢复逻辑，单独访问或刷新不产生主要事件。

前端记录证明事件已排队，不证明网络送达。用户清除存储、不同设备、阻止脚本、关闭页面可能影响观测；平台去重依赖真实 GTM/Ads 配置。现有 CRM 集合写入没有数据库级并发唯一约束，本次没有重构该存储；相同 submissionId 的并发请求仍使用同一个转化 transaction ID，不以此宣称 CRM 全局 exactly-once。

## 广告来源字段与保存规则

前端请求新增可选 `attribution`；CRM 使用相同字段独立保存，不改变现有 `source` / `sourceType` / `sourceUrl` 等入口归类。结构：

```json
{
  "schema_version": 1,
  "first_touch": { "landing_page": "https://zhongguauto.com/contact.html", "referrer": "", "captured_at": "ISO timestamp", "gclid": "", "gbraid": "", "wbraid": "", "utm_source": "", "utm_medium": "", "utm_campaign": "", "utm_term": "", "utm_content": "" },
  "first_ad_touch": null,
  "last_touch": { "landing_page": "https://zhongguauto.com/contact.html", "referrer": "", "captured_at": "ISO timestamp", "gclid": "", "gbraid": "", "wbraid": "", "utm_source": "", "utm_medium": "", "utm_campaign": "", "utm_term": "", "utm_content": "" }
}
```

- `first_touch`：90 天窗口内第一次访问，直接访问也保留真实记录，广告字段为空，不推测来源。
- `first_ad_touch`：窗口内第一次带任一广告点击 ID 或 UTM 参数的访问。若用户先直接访问、后从广告进入，保留两者而非覆盖首次访问。UTM 本身不证明是付费广告。
- `last_touch`：最新不同的带参数访问或站外引荐；普通内部跳转与直接回访不清空已知来源。
- 首次到站立即捕获，独立于 HTML 固定的隐藏 source_url；跨页和直接回访继续随两个提交入口携带。
- 本地键 `zg_attribution_v1`；90 天到期后开启新窗口。首选 localStorage，同时保存 sessionStorage；两者不可用时仅保留当前页内存，不承诺跨页持久化。
- `landing_page` 和 `referrer` 仅保留协议、主机、路径，剔除 query/hash/URL 用户信息，避免把无关私密 URL 参数入库。广告参数保存在专用字段；点击 ID 限长 256，UTM 限长 512，URL 限长 2048，控制字符移除。
- 服务端再次按白名单验证类型、长度、HTTP(S) URL 和时间；不可信/无效归因变为 null，不阻断正常询盘。
- 联系人、电话、邮箱、询盘正文、归因明细不会由本模块推入 dataLayer。后续 GTM 配置也应避免收集这些字段。

## 数据兼容、迁移与回退

Netlify Blobs 的原有 lead JSON 增加 `attribution`，不建表、不执行 SQL、不批量回填、不修改历史客户身份。历史记录/旧客户端缺省读为 null；新记录经过 normalize、列表读取、状态/备注更新及重试后保留归因。原有客户信息与 webhook 的既有行为保留，新增归因随完整 lead 沿既有 webhook 传递。

关闭 `ZHONGGU_GTM_ENABLED` 并重新构建可停止 Google 标签；询盘保存、来源保存和 Umami 继续可用。无需数据回滚。若需撤销追踪代码，优先撤销前端接入而保留服务端可选字段的读写兼容，避免旧版 normalize 丢弃新增顶层元数据；不要恢复或覆盖生产 leads.json。

## 本地验收命令

```text
npm run build
npm test
npm run check:site
node scripts/verify-lead-tracking.js
```

浏览器验收需要本机 Playwright 和 Edge，设置 `PLAYWRIGHT_MODULE` 可引用已安装的 Playwright；设置 `TRACKING_QA_OUTPUT` 可指定输出目录。脚本启动临时 localhost 服务、使用真正的 Netlify handler 和内存存储、清除子进程生产连接变量、拦截所有对外请求。没有连接真实 Blobs/Webhook。它会覆盖 sitemap 全部页的桌面和 390px 手机模拟，并验证普通表单、跨页携带、双击、失败重试、弹窗、感谢页刷新。

实体手机、生产存储送达、Google Tag Assistant/Ads 接收必须在正式发布、真实配置就绪后另行验收。生产合成测试仍按仓库既有认证与精确查重规范执行；其事件有意禁止进入 Ads，不能将晨检测试误记成主要转化。
