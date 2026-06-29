Zhonggu Auto Export 合规图片下载工具使用说明
===========================================

用途
----
本工具只会下载人工填写在 image_sources.txt 中的直接图片 URL。
工具不会自动搜索网页，也不会抓取汽车之家、懂车帝、易车、Google 图片搜索或其他第三方平台。

请勿将汽车之家、懂车帝、易车、Google 图片搜索等来源的未经授权图片用于商业网站。
下载和使用图片前，请确认您拥有明确的商业使用授权。

第一步：手动寻找合法图片来源
----------------------------
可使用的来源包括：
- 汽车厂家官方 Media Center 或官方媒体资料包；
- 厂家明确授权的媒体包；
- Zhonggu Auto Export 自有实拍图片；
- 已获得商业使用授权的供应商图片。

请保存授权邮件、授权协议、媒体包说明或来源页面截图，便于后续核查。

第二步：填写 image_sources.txt
-----------------------------
每行填写一张图片，字段之间使用英文竖线 | 分隔：

车辆编号|品牌|车型|年份|图片序号|图片URL|授权说明

示例：
car1|Geely|Monjaro|2024|01|https://example.com/geely-monjaro-front.jpg|Official media kit or authorized source

填写要求：
- 图片 URL 必须是人工确认的 HTTP 或 HTTPS 直接图片链接；
- 不要填写网页搜索结果页或车辆详情页链接；
- 授权说明应写明图片授权来源；
- 图片序号建议使用 01、02、03；
- 以 # 开头的行属于注释，不会下载。

第三步：运行下载脚本
-------------------
在项目文件夹打开 PowerShell，然后运行：

python .\download_images.py

如果系统使用 Python Launcher，也可以运行：

py .\download_images.py

脚本只接受 image/jpeg、image/png、image/webp。
所有成功图片会保存为 JPG，并按以下规则命名：

品牌-车型-年份-图片序号.jpg

例如：
images/cars/geely-monjaro-2024-01.jpg

PNG 和 WebP 转换为 JPG 需要 Pillow。安装命令：

python -m pip install Pillow

如果没有安装 Pillow，JPEG 仍可正常下载；PNG/WebP 会记录失败原因且不会中断程序。

第四步：检查下载结果
-------------------
检查以下位置：
- images/cars/：成功下载并保存的图片；
- image_download_log.csv：每条清单记录的下载状态和错误原因。

失败记录不会中断其他图片下载。请根据日志修正 URL、授权说明或图片格式后重新运行。
重新运行会生成新的日志，并覆盖同名本地图片。

第五步：确认授权并更新车辆数据
-----------------------------
逐张确认图片授权无误后，再手动把对应图片路径更新到 cars.json。
本工具不会自动修改 cars.json。

第六步：重新上传到 Netlify
-------------------------
1. 在本地打开 index.html，检查图片和页面显示；
2. 确认 image_sources.txt 和授权记录完整；
3. 打开 Netlify 项目的 Deploys 页面；
4. 将完整 ZhongguAutoExport 项目文件夹拖入手动部署区域；
5. 部署完成后打开线上网站并刷新缓存。

如果使用 Git 连接 Netlify，请提交并推送修改，Netlify 会自动重新部署。
