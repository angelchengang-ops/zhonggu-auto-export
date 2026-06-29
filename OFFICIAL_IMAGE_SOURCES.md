# Official New Car Image Candidate Workflow

This document is for candidate-image collection only. Do not replace any production image under `images/new-cars/` until a candidate has been manually reviewed for:

- right-front 45-degree view
- white or simple background preferred
- no watermark
- no third-party platform branding
- official source page or official media center provenance
- rights and usage notes manually confirmed

Current status:

- Candidate download directory: `images/new-cars-candidates/`
- Production image paths in `cars.json` are unchanged
- No candidate files were downloaded automatically in this pass

Disallowed sources:

- Autohome / 汽车之家
- Dongchedi / 懂车帝
- Yiche / 易车
- Google Images result pages
- Facebook
- Instagram
- YouTube screenshots
- third-party dealer pages

Recommended workflow:

1. Open the official source page below.
2. Find a right-front 45-degree image that matches the model family.
3. Copy the direct image URL into `official_image_sources.txt`.
4. Run `python download_official_images.py`.
5. Review the downloaded file in `images/new-cars-candidates/`.
6. After manual approval, copy the chosen file into `images/new-cars/` and then update `cars.json` if needed.

## Candidate Matrix

| vehicleId | Brand | Model | Official source page | Search keywords | Target angle | Suggested filename | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `geely-coolray-manual-super-power-edition` | Geely | Geely Coolray Manual Super Power Edition | `https://global.geely.com/en/models/new-coolray` | `site:global.geely.com "GEELY NEW COOLRAY"` | Right-front 45°, white/simple background | `geely-coolray-manual-super-power-edition.jpg` | Source page found | Use Coolray family hero/gallery image. Trim-specific photo likely needs manual confirmation. |
| `geely-coolray-automatic-super-power-edition-with-sunroof` | Geely | Geely Coolray Automatic Super Power Edition with Sunroof | `https://global.geely.com/en/models/new-coolray` | `site:global.geely.com "GEELY NEW COOLRAY"` | Right-front 45°, white/simple background | `geely-coolray-automatic-super-power-edition-with-sunroof.jpg` | Source page found | Same model family source as above. |
| `geely-coolray-automatic-super-power-edition-without-sunroof` | Geely | Geely Coolray Automatic Super Power Edition without Sunroof | `https://global.geely.com/en/models/new-coolray` | `site:global.geely.com "GEELY NEW COOLRAY"` | Right-front 45°, white/simple background | `geely-coolray-automatic-super-power-edition-without-sunroof.jpg` | Source page found | Same model family source as above. |
| `geely-coolray-super-max` | Geely | Geely Coolray Super MAX | `https://global.geely.com/en/models/new-coolray` | `site:global.geely.com "GEELY NEW COOLRAY"` | Right-front 45°, white/simple background | `geely-coolray-super-max.jpg` | Source page found | Same model family source as above. |
| `geely-coolray-battle-edition` | Geely | Geely Coolray BATTLE Edition | `https://global.geely.com/en/models/new-coolray` | `site:global.geely.com "GEELY NEW COOLRAY"` | Right-front 45°, white/simple background | `geely-coolray-battle-edition.jpg` | Source page found | Same model family source as above. |
| `geely-coolray-full-option` | Geely | Geely Coolray Full Option | `https://www.geely.com/en/corporate-fleet-sales/binyue-l` | `site:geely.com/en "Binyue L"` | Right-front 45°, white/simple background | `geely-coolray-full-option.jpg` | Source page found | Use Binyue L / Coolray family source if trim is visually closer. |
| `jetta-vs5-2026-280tsi-automatic-flagship-high-gloss-edition` | Jetta | Jetta VS5 2026 280TSI Automatic Flagship High-Gloss Edition | `https://jetta.faw-vw.com/vehicle-details/?code=0L&id=2` | `site:jetta.faw-vw.com "捷达VS5 280TSI自动旗舰高光版"` | Right-front 45°, white/simple background | `jetta-vs5-2026-280tsi-automatic-flagship-high-gloss-edition.jpg` | Source page found | Chinese official page explicitly lists the flagship high-gloss trim. |
| `geely-new-boyue` | Geely | Geely New Boyue | `https://www.geely.com/en/corporate-fleet-sales/boyue-l` | `site:geely.com/en "Boyue L"` | Right-front 45°, white/simple background | `geely-new-boyue.jpg` | Source page found | Confirm whether `全新博越美好` should use Boyue or Boyue L artwork before promoting to production. |
| `livan-x3-pro-white-automatic-version` | Livan | Livan X3 Pro White Automatic Version | Manual confirmation required | `Livan X3 Pro official model page`, `睿蓝 X3 PRO 官方` | Right-front 45°, white/simple background | `livan-x3-pro-white-automatic-version.jpg` | Official page not verified | Avoid third-party articles. Need official Livan source page or media kit. |
| `livan-x3-pro-international-version-manual-with-sunroof` | Livan | Livan X3 Pro International Version Manual with Sunroof | Manual confirmation required | `Livan X3 Pro official model page`, `睿蓝 X3 PRO 官方` | Right-front 45°, white/simple background | `livan-x3-pro-international-version-manual-with-sunroof.jpg` | Official page not verified | Same note as above. |
| `livan-x3-pro-international-version-automatic-with-sunroof` | Livan | Livan X3 Pro International Version Automatic with Sunroof | Manual confirmation required | `Livan X3 Pro official model page`, `睿蓝 X3 PRO 官方` | Right-front 45°, white/simple background | `livan-x3-pro-international-version-automatic-with-sunroof.jpg` | Official page not verified | Same note as above. |
| `kia-kx1-2021-with-sunroof` | Kia | Kia KX1 2021 with Sunroof | Manual confirmation required | `site:kia.com.cn 奕跑 官方`, `site:kia.com.cn KX1 官方` | Right-front 45°, white/simple background | `kia-kx1-2021-with-sunroof.jpg` | Official page not verified | Kia China source needs manual confirmation or archive lookup. |
| `toyota-corolla-cross-2026-2-0l-elite` | Toyota | Toyota Corolla Cross 2026 2.0L Elite | `https://global.toyota/en/mobility/toyota-brand/gallery/corolla.html` | `site:global.toyota Corolla Cross official`, `site:global.toyota "Corolla Cross"` | Right-front 45°, white/simple background | `toyota-corolla-cross-2026-2-0l-elite.jpg` | Source page found | Corolla gallery and Corolla Cross newsroom pages are both viable official sources. |
| `jetour-x70l-2026-1-5td-dct-luxury-7-seater` | Jetour | Jetour X70L 2026 1.5TD DCT Luxury 7-Seater | `https://www.jetour.com.cn/vehicles/jietux70l/` | `site:jetour.com.cn 捷途X70L 官方` | Right-front 45°, white/simple background | `jetour-x70l-2026-1-5td-dct-luxury-7-seater.jpg` | Candidate downloaded | Official page verified. Downloaded image is a branded hero poster with the vehicle in right-front view; still needs your visual approval before production use. |
| `gac-trumpchi-gs3-2026-270t-jingxiang-edition` | GAC Trumpchi | GAC Trumpchi GS3 2026 270T Jingxiang Edition | `https://www.gacmotor.com/gs3_2026/` | `site:gacmotor.com "传祺 2026款 GS3 影速"` | Right-front 45°, white/simple background | `gac-trumpchi-gs3-2026-270t-jingxiang-edition.png` | Candidate downloaded | 2026 GS3 page verified. Downloaded image is a clean white-background vehicle cutout. |
| `gac-trumpchi-gs3-2026-270t-dynamic-smart-edition` | GAC Trumpchi | GAC Trumpchi GS3 2026 270T Dynamic Smart Edition | `https://www.gacmotor.com/gs3_2026/` | `site:gacmotor.com "传祺 2026款 GS3 影速"` | Right-front 45°, white/simple background | `gac-trumpchi-gs3-2026-270t-dynamic-smart-edition.png` | Candidate downloaded | Uses the same official GS3 family image as the Jingxiang trim; trim-specific visual confirmation still needed. |
| `gac-trumpchi-gs4-max-2024-1-5tgdi-flagship-edition` | GAC Trumpchi | GAC Trumpchi GS4 Max 2024 1.5TGDI Flagship Edition | `https://www.gacmotor.com/gs4max_new/` | `site:gacmotor.com "传祺GS4 MAX"` | Right-front 45°, white/simple background | `gac-trumpchi-gs4-max-2024-1-5tgdi-flagship-edition.png` | Candidate downloaded | GS4 MAX official page verified. Downloaded image is an official transparent-background vehicle cutout. |
| `gac-trumpchi-international-version-tw8-06` | GAC Trumpchi | GAC Trumpchi International Version TW8-06 | Manual confirmation required | `site:gacinternational.com Trumpchi official`, `TW8-06 official export model` | Right-front 45°, white/simple background | `gac-trumpchi-international-version-tw8-06.jpg` | Official page not verified | Need exact public model mapping before selecting image. |
| `mg5-67900-rmb` | MG | MG5 | `https://www.saicmg.com/brand/information/news/app-6528/` | `site:saicmg.com MG5 2026款`, `site:saicmg.com "MG5 2026款"` | Right-front 45°, white/simple background | `mg5-67900-rmb.jpg` | Candidate downloaded | Downloaded from SAIC MG official page asset URL. Angle is elevated front-three-quarter rather than flat eye-level, so keep as candidate only. |
| `mg5-85900-rmb` | MG | MG5 | `https://www.saicmg.com/brand/information/news/app-6528/` | `site:saicmg.com MG5 2026款`, `site:saicmg.com "MG5 2026款"` | Right-front 45°, white/simple background | `mg5-85900-rmb.jpg` | Candidate downloaded | Downloaded from SAIC MG official page asset URL. Angle is elevated front-three-quarter rather than flat eye-level, so keep as candidate only. |
| `toyota-corolla-cross-2026-2-0l-elite` | Toyota | Toyota Corolla Cross 2026 2.0L Elite | `https://pressroom.toyota.com/vehicle/2026-toyota-corolla-cross/` | `site:pressroom.toyota.com Corolla Cross official` | Right-front 45°, white/simple background | `toyota-corolla-cross-2026-2-0l-elite.jpg` | Candidate downloaded | Official Toyota pressroom image downloaded. Strong right-front studio view. |
| `toyota-corolla-hybrid-2026-1-8l-elite-edition` | Toyota | Toyota Corolla Hybrid 2026 1.8L Elite Edition | `https://pressroom.toyota.com/the-toyota-corolla-hybrid-brings-efficiency-and-style-into-2026/` | `site:pressroom.toyota.com Corolla hybrid official`, `site:global.toyota Corolla official` | Right-front 45°, white/simple background | `toyota-corolla-hybrid-2026-1-8l-elite-edition.jpg` | Candidate downloaded | Official Toyota pressroom image downloaded. Right-front studio view. |
| `geely-xingyue-l-2026-dongfangyao-2-0td-automatic-wangyue-edition` | Geely | Geely Xingyue L 2026 Dongfangyao 2.0TD Automatic Wangyue Edition | `https://www.geely.com/en/corporate-fleet-sales/xingyue-l` | `site:geely.com/en "Xingyue L"` | Right-front 45°, white/simple background | `geely-xingyue-l-2026-dongfangyao-2-0td-automatic-wangyue-edition.jpg` | Source page found, download link unresolved | Official page verified, but the discovered `photo.zip` endpoint returned HTML instead of a usable archive in this environment. Needs manual confirmation. |
| `geely-xingjian-7-leading-edition-135km-qianli-haohan-h3` | Geely | Geely Xingjian 7 Leading Edition 135KM + Qianli Haohan H3 | Manual confirmation required | `Geely Galaxy Xingjian 7 official`, `星舰7 官方` | Right-front 45°, white/simple background | `geely-xingjian-7-leading-edition-135km-qianli-haohan-h3.jpg` | Official page not verified | Need exact official model page or media center before download. |

## Source Notes

- Geely official pages confirmed through `global.geely.com` / `geely.com` official model pages:
  - `GEELY NEW COOLRAY`
  - `Boyue L`
  - `Xingyue L`
- Jetta official page confirmed through `jetta.faw-vw.com`.
- Toyota official pages confirmed through `global.toyota`.
- Jetour X70L official page confirmed through `jetour.com.cn`.
- GAC Trumpchi GS3 / GS4 MAX official pages confirmed through `gacmotor.com`.
- MG5 official China page confirmed through `saicmg.com`.

## Authorization Reminders

- A page being official is not by itself a blanket commercial-use grant.
- Record the source page and any displayed rights statement before moving a candidate into production.
- For MG Motor Europe image bank assets, keep the rights note exactly as shown on the page, for example: `Use for editorial purposes free of charge`.
