# Yueyi 08 Price Update Report

## Modified Files

- `grouped-cars.json`
- `cars.json`
- `manual-image-map.json`
- `script.js`

## Final Model Summary

- Model: Bestune Yueyi 08 / 一汽奔腾悦意08
- Image: `images/new-cars/bestune-yueyi-08-01.png`
- Guide Price: `RMB 104,900 - 144,900`
- 中文指导价：`人民币 104,900 - 144,900`
- FOB Nansha Price: `USD 15,837 - 21,763`
- Trim Versions: `6`
- Fuel: `Electric / Range Extender`
- 中文能源类型：`纯电 / 增程`
- Available Color: `Star Purple / Forest Green / Electric White / Midnight Black / Titanium Gray / Sky Blue`
- 中文可选颜色：`星辰紫 / 森野绿 / 电光白 / 极夜黑 / 钛空灰 / 晴空蓝`

## Final Trims

| Trim | 中文配置 | Guide Price | FOB Nansha Price | Fuel |
| --- | --- | --- | --- | --- |
| Yueyi 08 2026 Pure Electric 565 Air | 悦意08 2026款 纯电565 Air | RMB 104,900 | USD 15,837 | Electric / 纯电 |
| Yueyi 08 2026 Pure Electric 565 Plus | 悦意08 2026款 纯电565 Plus | RMB 114,900 | USD 17,319 | Electric / 纯电 |
| Yueyi 08 2026 Pure Electric 565 Pro | 悦意08 2026款 纯电565 Pro | RMB 124,900 | USD 18,800 | Electric / 纯电 |
| Yueyi 08 2026 Pure Electric 650 Pro | 悦意08 2026款 纯电650 Pro | RMB 134,900 | USD 20,281 | Electric / 纯电 |
| Yueyi 08 2026 Pure Electric 650 Pro Pilot Edition | 悦意08 2026款 纯电650 Pro领航版 | RMB 144,900 | USD 21,763 | Electric / 纯电 |
| Yueyi 08 2026 EREV 240 Plus | 悦意08 2026款 增程240 Plus | RMB 114,900 | USD 17,319 | Range Extender / 增程 |

## Cleanup

- Removed the previous two temporary Yueyi 08 fallback records from `cars.json`.
- Replaced them with six trim-specific fallback records.
- Updated `manual-image-map.json` with six Yueyi 08 trim IDs.
- Yueyi 08 front-end data no longer contains the previous placeholder price text, question-mark placeholder text, or internal confirmation wording.

## Local Test Results

- JSON parse passed for `grouped-cars.json`, `cars.json`, and `manual-image-map.json`.
- Yueyi 08 validation passed for 6 trims, final image path, guide price range, FOB price range, fuel range and color list.
- Local HTTP check returned 200 for `index.html`, `script.js`, all three new-car data/mapping files, the Yueyi 08 image, and this report.
