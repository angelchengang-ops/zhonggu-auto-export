# Encoding Fix Report

## Scope

Checked and normalized these files as UTF-8 without BOM:

- `cars.json`
- `grouped-cars.json`
- `manual-image-map.json`
- `lang.json`
- `script.js`
- `index.html`
- `company.html`

Both HTML files already contain:

```html
<meta charset="UTF-8">
```

## Files With Mojibake Found

- `cars.json`
  - `chineseName` values for all new-car records were mojibake.
  - `specialNoteZh` values were mojibake on three records.
- `grouped-cars.json`
  - `chineseSeriesName` values were mojibake for all new-car groups.
  - `trimNameZh` values were mojibake for all new-car trims.
  - `options[].nameZh` values were mojibake on three trim options.

No Chinese mojibake was found in:

- `manual-image-map.json`
- `lang.json`
- `script.js`
- `index.html`
- `company.html`

Note: `ç` still appears in `Français` and French translations. These are valid French characters, not mojibake.

## Fields Fixed

### `cars.json`

Fixed `chineseName` for:

- Geely Coolray trims
- Jetta VS5 280TSI Automatic High-Gloss Flagship Edition
- Geely Boyue Beautiful Edition
- Livan X3 Pro Automatic White: `自动挡 白色`
- Livan X3 Pro International Manual with Sunroof: `国际版手动天窗`
- Livan X3 Pro International Automatic with Sunroof: `国际版自动天窗`
- Kia KX1 White Sunroof Edition
- Toyota Corolla Cross 2.0L Elite
- Jetour X70L 1.5TD DCT Luxury Edition 7-Seater
- GAC Trumpchi GS3 trims
- GAC Trumpchi GS4 Max 1.5TGDI Flagship Edition
- GAC Trumpchi TW8-06 International Version
- MG5 trims
- Toyota Corolla Hybrid 1.8L Dual Hybrid Elite Edition
- Geely Xingyue L Dongfang Yao 2.0TD Automatic Wangyue Edition
- Geely Galaxy Starship 7 / Xingjian 7 Leading Edition

Fixed `specialNoteZh` for:

- `geely-coolray-manual-super-power-edition`: `天窗选配：+1500元`
- `geely-coolray-battle-edition`: `电尾门版本：FOB 11,600 USD`
- `toyota-corolla-cross-2026-2-0l-elite`: `白色：FOB 加 300 美元`

### `grouped-cars.json`

Fixed `chineseSeriesName` for all 14 new-car groups.

Fixed `trimNameZh` for all 23 new-car trims, including:

- `Automatic White / 自动挡 白色`
- `International Manual with Sunroof / 国际版手动天窗`
- `International Automatic with Sunroof / 国际版自动天窗`

Fixed `options[].nameZh` for:

- `Electric tailgate version / 电尾门版本`
- `White exterior color / 白色车漆`
- `Sunroof / 天窗`

## Validation

- JSON parse check passed for `cars.json`, `grouped-cars.json`, `manual-image-map.json`, and `lang.json`.
- `index.html` and `company.html` both contain `<meta charset="UTF-8">`.
- All target JSON, JS, and HTML files are saved as UTF-8 without BOM.
- No `decodeURIComponent`, `escape`, or `unescape` usage was added or found.
- No replacement/private bad characters were found.

## Remaining Suspected Mojibake

No suspected Chinese mojibake remains in the checked files.

The only remaining matches from the requested character scan are valid French text such as `Français`, `À propos`, `véhicules`, and `expérience`.
