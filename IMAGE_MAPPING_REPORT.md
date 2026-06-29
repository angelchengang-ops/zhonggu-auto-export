# Image Mapping Report

This mapping was updated after visual review of the local images and cross-checking model class/body type references. Placeholder images remain on disk but are excluded from all new-car image fields.

## Final New-Car Image Mapping

| Model | Image path | Basis | Exists | Placeholder excluded |
| --- | --- | --- | --- | --- |
| Geely Coolray | `images/new-cars/suv-04.png` | Geely badge, compact sporty SUV shape; closer to Coolray/Binyue than the previous Jetour/generic image. | Yes | Yes |
| Jetta VS5 | `images/new-cars/generic-new-car-bg-06.png` | Jetta-style triangular badge and compact crossover proportions. | Yes | Yes |
| Geely Boyue | `images/new-cars/generic-new-car-bg-09.png` | Geely badge and larger SUV body; closer to Boyue than the previous Toyota image. | Yes | Yes |
| Livan X3 Pro | `images/new-cars/generic-new-car-bg-02.png` | Small affordable SUV shape; no clearer Livan image available, so used closest real vehicle image. | Yes | Yes |
| Kia KX1 | `images/new-cars/kia-suv.png` | Kia compact crossover image, consistent with KX1/Stonic positioning. | Yes | Yes |
| Toyota Corolla Cross | `images/new-cars/toyota-corolla-cross-01.jpg` | Toyota Corolla Cross image. | Yes | Yes |
| Jetour X70L | `images/new-cars/generic-new-car-bg-01.png` | Clear Jetour front badge and SUV body; better than poster-like X70L image for card display. | Yes | Yes |
| GAC Trumpchi GS3 | `images/new-cars/gac-gs3-01.png` | GAC GS3 official/candidate image. | Yes | Yes |
| GAC Trumpchi GS4 Max | `images/new-cars/gac-gs4-max-01.png` | GAC GS4 Max official/candidate image. | Yes | Yes |
| GAC Trumpchi TW8-06 | `images/new-cars/gac-gs4-max-01.png` | No dedicated TW8-06 image; temporarily mapped to the user-approved GS4 Max image, not a placeholder. | Yes | Yes |
| MG5 | `images/new-cars/mg5-01.jpg` | MG5 sedan image. | Yes | Yes |
| Toyota Corolla Hybrid | `images/new-cars/toyota-corolla-hybrid-01.jpg` | Toyota Corolla Hybrid sedan image. | Yes | Yes |
| Geely Xingyue L | `images/new-cars/generic-new-car-bg-05.png` | Geely badge and midsize SUV body, aligned with Xingyue L class. | Yes | Yes |
| Geely Galaxy Starship 7 | `images/new-cars/generic-new-car-bg-07.png` | Geely Galaxy-style new-energy SUV front and compact crossover body. | Yes | Yes |

## Placeholder Files - Do Not Use

| File | Reason |
| --- | --- |
| `images/new-cars/gac-tw8-06-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |
| `images/new-cars/geely-boyue-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |
| `images/new-cars/geely-coolray-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |
| `images/new-cars/geely-galaxy-starship-7-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |
| `images/new-cars/geely-xingyue-l-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |
| `images/new-cars/jetta-vs5-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |
| `images/new-cars/kia-kx1-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |
| `images/new-cars/livan-x3-pro-01.jpg` | Placeholder image, excluded from `manual-image-map.json`, `grouped-cars.json`, and new-car rows in `cars.json` |

## Source Cross-Check Notes

- Geely Coolray/Binyue is a subcompact crossover SUV; the selected image is a compact Geely SUV rather than the previous Jetour image.
- Jetta VS5 is a compact crossover SUV under the Jetta/FAW-VW brand; the selected image has the Jetta-style front badge.
- Kia KX1 is marketed as Kia Stonic in some markets and is a subcompact crossover SUV; the selected image is a Kia compact crossover.
- Geely Galaxy Starship 7 is a compact crossover SUV; the selected image uses a Geely/Galaxy-style new-energy SUV front.
- `jetour-x70-01.*` does not exist locally; the available Jetour-specific files are `generic-new-car-bg-01.png` and `jetour-x70l-01.jpg`.

## Validation Notes

- `manual-image-map.json`, `grouped-cars.json`, and `cars.json` now parse as valid JSON.
- The previous homepage placeholder issue was also caused by malformed JSON strings in `grouped-cars.json` and `cars.json`; the damaged strings were repaired without changing prices, configurations, forms, WhatsApp, language switching, or video behavior.
- `script.js` and `index.html` use asset version `20260616-vehicle-match-fix` so the browser reloads the latest mapping.
- Local HTTP validation on `http://localhost:8086` returned 200 for the homepage, `script.js`, `manual-image-map.json`, `grouped-cars.json`, `cars.json`, and every image path listed in the final mapping.
