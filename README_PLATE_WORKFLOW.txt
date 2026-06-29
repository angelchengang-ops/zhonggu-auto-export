中谷汽车素材 v2 车牌遮挡流程

目标：
停止自动猜测车牌位置。图片车牌遮挡只使用人工标注坐标；没有人工标注的图片不强行遮挡，进入 media-processed-v2/review-needed。

第一步：运行人工标注工具
python plate_label_tool.py

第二步：人工框选每张图片车牌
在窗口中用鼠标拖拽矩形框选车牌区域。
可以重新框选、跳过当前图片，也可以上一张/下一张检查。
工具会把相对比例坐标保存到 plate_boxes.json，图片缩放后坐标仍然有效。

第三步：运行批量处理
python apply_plate_masks.py

默认处理方式：
- 已标注图片：精准覆盖深色圆角 zhongguauto 遮挡条，并添加右下角半透明 zhonggu 水印。
- 未标注图片：不强行遮挡，复制到 media-processed-v2/review-needed。
- 视频：暂时不自动猜测车牌位置，只添加右下角 zhonggu 水印。
- 视频封面：生成 poster 图，放到 media-processed-v2/posters。
- 背景：默认保留原背景，只做轻微提亮、对比度优化、压缩和水印。

可选背景替换：
python apply_plate_masks.py --replace-background

只有在确认 rembg 效果可靠时才使用该选项。背景替换失败时会保留原背景，不影响人工车牌遮挡。

第四步：检查输出图片
检查 media-processed-v2/images。
重点确认车牌遮挡位置、遮挡条覆盖范围、水印位置、图片背景是否自然。

第五步：确认后再复制到网站正式 images 目录
确认无误后，再把 media-processed-v2/images 中合格图片复制到网站正式 images 目录。
不要直接覆盖原始文件，也不要覆盖 media-processed 旧版本。

日志：
每次运行 apply_plate_masks.py 会生成 processing_log_v2.csv，字段包括：
originalFileName, hasManualPlateBox, plateMasked, watermarkAdded, backgroundChanged, outputPath, status, notes
