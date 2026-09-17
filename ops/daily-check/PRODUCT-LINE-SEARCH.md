# 六类车型搜索监测接口（v1）

本模块是现有晨检的可选附加报告，当前仅在本机实施，未部署 NAS、未新增计划任务、未连接 GSC/Yandex。RUNBOOK.md 仍是晨检执行规范。默认缺失数据为 null / 未取得，配置的18个词只是候选采购词。

## 文件与调用

- 配置：ops/daily-check/product-line-search.v1.json
- 纯函数：scripts/lib/product-line-search.js
- 离线报告：node scripts/report-product-line-search.js [脱敏输入.json] [新的输出.json]
- 不传输入仅输出“未取得”。指定输出时同时生成 .json.md，拒绝覆盖已有报告。
- 现有调用方可使用 withProductLineMonitoring(existingSummary, input) 加入 productLineMonitoring，所有旧字段保留。未修改旧晨报文件、旧 schema、Netlify/NAS 消费者或远程采集器。未经部署，现有晨报不会自动出现本扩展。

## 输入合同

~~~js
{
  now: '2026-09-17T08:00:00Z',
  sources: {
    google: {
      status: 'available',
      dataKind: 'observed', // 测试必须用 fixture
      finalThrough: '2026-09-13',
      windows: [{
        start: '2026-08-17', end: '2026-09-13',
        timezone: 'America/Los_Angeles',
        searchType: 'web', complete: true,
        rows: [{
          query: 'Geely Coolray price in China',
          country: 'dza',
          page: 'https://zhongguauto.com/landing/geely-coolray-exporter-china/',
          device: 'MOBILE', searchType: 'web',
          impressions: 10, clicks: 1, position: 12
        }]
      }]
    }
  }
}
~~~

以上为说明输入形状的假设值，不是实测。实际需要 current、previous 两个完整窗口。每行必须是整个窗口的 query/country/page/device/searchType 唯一聚合，不能混入按日行、总计行、不同搜索类型或重复分页。源适配器应完成授权预检、最终日期确认和正常分页后才标记 complete:true；它仅表示该窗口的取数操作完成，不声称查询行覆盖全部搜索。

Google 日期按 API 的 America/Los_Angeles 口径；报告生成时间以 Asia/Shanghai 展示。Yandex 独立输入，并必须明确提供与实际接口一致的 timezone，未确认时保持未取得。两平台不混算。

参考：[Google Search Analytics query 官方文档](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)。该接口的查询行不保证完整返回，因此空结果不能解释为零搜索量或第100名。

## 内部规则

- 默认窗口28天，两段相邻且不重叠。结束日期取源的 finalThrough 与“源时区今天减3天”中较早者。3天是可配置的保守内部滞后规则，不代表平台保证；仍需要实际已完结日期。
- 目标国家初始为 null（未选定）；仅来自明确配置，不从客户手机号推断。实际国家使用源查询维度。
- 候选匹配仅规范化大小写和空格，不将同义词或站点总平均代入候选词。
- 输出保存实际查询、实际页面、国家、设备、搜索类型和数据窗口。不同页面/国家/设备的返回行保留，汇总口径是这些页面级返回行之和，不是站点总排名。
- CTR = 总点击 / 总展现；排名 = 各行平均排名按展现加权。零展现的排名、CTR 为 null；任何有展现的行缺排名时汇总排名为 null。
- 少于100次展现为低样本（内部阈值，可配置）。低样本前10标为 low_sample_top10；其余前10只是 window_average_top10，均不声明稳定达标。
- 未取得授权数据、窗口不完整、未返回行、无效维度/指标分别记录；未知值不填0。
- 字段新增为可选扩展，历史基线不可覆盖。本轮没有远程发布，不应据此宣称晨检自然运行已验收。

## 名称与数据边界

- Yueyi 03 / JoyEE 03 对应关系由 [Bestune 官方品牌公告](https://bestune.ru/brand/news/bestune-introduced-special-version-joyee03-in-china/) 明确提及。仅用于名称对应，不将该公告中特定版本配置或海外保修套入现有中国版 SKU。
- FAW 官网分别使用 [Xiaoma](https://www.faw.com/fawen/xwzt/xwbd/5821331/index.html) 与 [Pony](https://www.faw.com/fawen/xwzt/xwbd/5841568/index.html)。本次未取得直接证明两个名称与当前222km SKU对应的品牌资料，故前台沿用 Xiaoma，Pony 只保留为待核实候选词。原有 K1 Europe 页面与商业字段未扩写，其认证/对应关系需另行核实。
- 无真实 GSC/Yandex 数据、搜索量、国家优先级或排名证明；测试 fixtures 必须明确标识。
