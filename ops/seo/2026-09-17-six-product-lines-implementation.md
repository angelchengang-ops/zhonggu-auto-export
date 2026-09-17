# 六类重点车型 SEO 实施报告 — 本机完成，待验收与发布

执行日期：2026-09-17（Asia/Shanghai）。沿用 PR #5，不使用 TinyFish，没有配置 Codex 云端环境。

## 版本与目录

- 原主目录：D:\GitHub\zhonggu-auto-export，仍在 main；本次没有切换、清空或覆盖该目录。
- 开发工作树：D:\GitHub\zhonggu-auto-export\tmp\seo-six-product-lines-20260917。这是同一仓库的隔离工作树，不是新项目或新仓库。
- 分支：codex/seo-six-product-lines-20260917。
- 任务起点：27f7549d0ff7f5d56f4d81d7ea5b2a94aaece2b5。
- 实施提交：e49c82a4daedb709768955ef6a4b30e3c3b71696。后续报告提交仅补交付记录。
- 提交前重新读取的 GitHub main：d2b0106cd66d5bb69f0554c63139ecf97fdcb047，与起点一致。
- 生产实际部署提交：本次未读取、未验证；没有合并 main、推送 main 或发布生产。PR 自动预览不作为生产验收。
- 本机执行：Windows、Node.js v24.18.0、npm 11.16.0、既有 Git 和 Edge/Playwright。未升级依赖。Netlify 现有配置仍为 Node 20；本轮没有执行云端 Node 20 验证。

## 六类最终入口

| 产品线 | 主承接路径 | 实际实现 |
|---|---|---|
| 吉利缤越 / Coolray | /landing/geely-coolray-exporter-china/ | 6个现有版本的比较表；Full Option、南沙和阿尔及利亚入口分工；修正通用页遗留的阿尔及利亚默认归因 |
| 奔腾 B70 | /used-bestune-b70-wholesale.html | 2021/2022/2023版本、里程范围和价格读取车型源；补混批、逐车检测与报价范围说明；年款页回链保留 |
| 悦意03 | /bestune-yueyi-03-wholesale.html | 445/565 km CLTC版本与现有电池/报价数据比较；补充充电、目的地与售后核查；JoyEE名称只作同系名称对应 |
| 奔腾小马 | /bestune-xiaoma-2026-222km-shanyaoma-edition.html | 在现有单SKU页加入系列采购清单和首页入口，没有制造第二个相似专题 |
| 悦意07 | /used-bestune-yueyi-07-phev-export.html | 保留2025年二手PHEV；补电池、发动机/混动系统检查、充电与逐车资料要求 |
| 二手纯电 BEV | /used-electric-cars-from-china.html | 新建有实用采购清单的需求页；诚实显示无已核实公开库存；Service结构化数据，不生成虚构Product/Offer/InStock |

首页六入口移至新车列表之前；全部原有车辆列表、品牌、公司与出口流程内容保留。品牌页、新车/二手车列表建立相关内链。旧吉利专题补上现有手机菜单控件。

南沙页面删除 Priority Africa Keywords 及机械关键词段落。现有 Full Option 照片和点击加载视频仍在原SKU页，并明确引导查看；没有捏造当日库存数量、图片日期或运输时效。

## 实现与产物范围

- 源实现：scripts/lib/seo-product-lines.js、scripts/lib/six-product-pages.js；接入原有车辆/SEO生成器，运行在既有后处理、号码库和缓存版本化之前。
- 监测：ops/daily-check/product-line-search.v1.json、scripts/lib/product-line-search.js、scripts/report-product-line-search.js、ops/daily-check/PRODUCT-LINE-SEARCH.md。
- 回归：tests/six-product-lines.test.js、tests/product-line-search.test.js；本机浏览器检查脚本为 scripts/verify-six-product-pages.js。
- 共修改19张既有内容页，新增1张BEV采购页。另133个文件仅有公共资源版本/换行等机械差异，不计为新SEO内容。
- 共享 style.css 仅增加六入口的限定样式，由既有流程更新资源哈希。未修改共享号码规则、script.js、lead-gen.js、vehicle-inquiry.js、生产函数或依赖清单。
- 新BEV无后缀/目录/www别名明确301到同一 .html 页面。原 .html、landing目录、BMW例外和正式非www域名策略保留。
- 站点地图增加1个规范URL。日期按现有Git历史重新生成；本次实质内容更新单独写入 seo-content-updates.json。部分旧日期与仓库历史解析有差异，不解释为新增车型或搜索引擎重新抓取。第二次构建已确认稳定。

## 商业事实与保留项

cars.json 全文件标准换行后的 SHA-256 与执行前一致；44条车型记录、SKU、年款、价格、库存字段和媒体路径均保留。grouped-cars.json、图片/视频文件、Netlify函数、询盘提交脚本和客户数据没有修改。

关键报价维持原值：Coolray Full Option US$11,500；B70三个年款 US$6,000 / 6,500 / 7,000；悦意03 US$11,500 / 12,800；小马 US$4,500；悦意07 US$13,500。B70和悦意07专题将原有“salePriceDisplay”清楚称为列表售价，FOB/CIF范围需在书面报价中确认，未调价。

本轮没有重新盘点实际库存。悦意07保持2025年二手PHEV，没有改年款、增加新车供应或混进BEV分类。当前源数据没有二手BEV；SOH、测试日期/方法、事故和维修证据明确为未取得。

[Bestune官方公告](https://bestune.ru/brand/news/bestune-introduced-special-version-joyee03-in-china/)明确使用 JoyEE (Yueyi) 03，仅引用名称关系，不挪用公告中特定配置或海外保修。Pony与当前小马SKU的直接一手对应资料仍待核实：前台沿用Xiaoma；两个Pony候选词标记待核实。已有K1 Europe内容和商业认证字段未扩写，本次不把它们作为新增合规证明。

## 搜索监测

- 6产品线、18候选词，目标国家未选定；不从手机号推断国家。
- 两个不重叠完整28天窗口；Google按 America/Los_Angeles 数据日期，Yandex统计时区必须由实际源明确提供。
- 3天滞后、100展现低样本门槛都是可配置内部规则。实际 finalized 日期不足时以更早日期为准。
- CTR取总点击/总展现；排名按展现加权。缺失查询行不填0或第100名；低样本前10和普通窗口前10分别标记，均不宣称稳定达标。
- Google/Yandex独立输出。报告保留实际查询、页面、国家、设备、搜索类型与日期。未知数据为null。
- 纯函数可选附加 productLineMonitoring，旧schema不变；不覆写历史、不接生产客户存储、不改NAS或计划任务。
- GSC/Yandex真实查询数据未取得。本次生成的 2026-09-17-six-product-search-unavailable.md 全部明确缺失；测试只用fixture。现有晨报尚未部署此扩展，不能宣称自然运行已通过。

## 实际验收

按规范顺序执行 npm run build → npm test → npm run check:site：

- 完整构建成功。
- npm test：73/73通过；既有日报测试脚本亦通过。
- 网站检查：153 HTML；124 sitemap URL，唯一数124，issues为空。
- 连续构建：180个生成页面/资源逐一SHA-256比较，全部字节相同。
- 浏览器：本机Edge，1440px桌面与390px模拟；所有20张实质内容页共40组合通过。先全量检查，最后针对新BEV入口、通用缤越归因和吉利品牌页复验，结果按文件/宽度合并记录。
- 检查包括：页面横向溢出、实际图片加载、图库切换、南沙视频点击后加载、菜单打开/关闭、WhatsApp弹窗打开/Escape关闭、表单处理器绑定、必填/短号码/字母/错误邮箱拦截、跨国家本地/完整国际号码、前导0/意大利0/共享区号/波斯数字。
- 新BEV按钮点击后保留采购清单；本地拦截模拟失败→重试→成功，验证同一submissionId、阻止双触发、单一提交通道及来源/国家字段。未提交真实客户或生产测试询盘。
- 页面层所有外部请求被拦截，未打开真实WhatsApp会话，未发送通知。
- 真实iPhone/Android、生产CRM持久化/后台送达、线上重定向实际响应、搜索排名：未测，不计为通过。

机器记录：2026-09-17-six-product-lines-baseline.json 与 2026-09-17-six-product-lines-validation.json。截图和完整运行日志保留在本工作树 tmp/seo-validation/，未提交临时文件或客户数据。

## 原有改动、备份与恢复

主目录未提交状态与执行前一致。初始化记录中62个可直接解析路径的文件逐一比对哈希相同；随后用不转义路径盘点补齐1个中文路径文件，共63项原有未提交文件已备份，备份与源逐一核验。没有夹带主目录的晨检修改、未提交AGENTS规则、车辆配置资料或新增素材。

备份位置（仓库外）：D:\GitHub\codex临时文件\2026-09-17\zhonggu-seo-six-product-lines\work\main-uncommitted-backup。恢复时先比较文件及清单，只恢复明确需要的文件，不整包覆盖或自动恢复私有运行数据。

本次没有生产发布，生产无需回退。若撤回此开发成果，可在原任务分支新增对实施提交e49c82a的revert，重新构建与验证；不强推、不重置主目录、不删除真实数据。报告随后的文档提交不改变运行行为。

最终状态：已在本机完成实现与验证，提交到原分支供PR #5验收；尚未合并main或发布生产，不承诺搜索前10。
