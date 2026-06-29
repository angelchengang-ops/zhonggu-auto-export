# Image Update Report

## Final Image Paths

| Model | Final image path |
| --- | --- |
| Toyota Corolla Cross / 卡罗拉锐放 | `images/new-cars/toyota-corolla-cross-01.png` |
| GAC Trumpchi GS3 / 广汽传祺GS3 | `images/new-cars/gac-gs3-01.png` |
| MG5 | `images/new-cars/mg5-01.png` |
| Toyota Corolla Hybrid / 卡罗拉双擎 | `images/new-cars/toyota-corolla-hybrid-01.png` |
| Bestune Yueyi 08 / 一汽奔腾悦意08 | `images/new-cars/bestune-yueyi-08-01.png` |

## Yueyi 08 Data Files

Yueyi 08 was added to:

- `grouped-cars.json` as model group `bestune-yueyi-08`
- `cars.json` as fallback new-car records
- `manual-image-map.json` as model-group and car-id image mappings

## Yueyi 08 Trim Versions

Current temporary versions:

1. Battery Electric Version / 纯电版
2. Range Extender Version / 增程版

## Configuration Differences Needing Manual Confirmation

- Official Autohome trim names and version count.
- Guide price and FOB NanSha price for each trim.
- Available colors.
- Exact fuel/powertrain classification.
- Exact transmission wording.
- Battery, range, motor, and range extender specifications.
- Key feature differences between trims.

## Local Test Results

- JSON parse passed for `grouped-cars.json`, `cars.json`, and `manual-image-map.json`.
- All five target image paths exist.
- All five target images are 1448x1086, matching the Geely Coolray standard image ratio.
- Local HTTP check on `http://localhost:8086` returned 200 for `index.html`, `script.js`, all three data files, and all five target image paths.
- The specified models no longer reference old `.jpg`, `.png.png`, generic, or placeholder paths in the three data files.
- Language switching code was not modified; grouped new-car rendering continues to use existing English/Chinese label switching.
- Used cars, company page, Netlify Forms, WhatsApp, backend, and video features were not modified.
