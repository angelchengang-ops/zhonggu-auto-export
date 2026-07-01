import json
import os
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images' / 'og' / 'vehicles'
BACKGROUND = ROOT / 'images' / 'og' / 'vehicle-card-background.png'
SIZE = (1200, 630)


def text(value):
    if isinstance(value, dict):
        return str(value.get('en') or next((v for v in value.values() if v), '')).strip()
    return str(value or '').strip()


def vehicle_name(car):
    brand = text(car.get('brand'))
    name = text(car.get('title') or car.get('name') or car.get('model'))
    while brand and name.lower().startswith((brand + ' ' + brand).lower()):
        name = name[len(brand):].strip()
    return name if not brand or name.lower().startswith(brand.lower() + ' ') else f'{brand} {name}'


def source_image(car):
    return ROOT / text(car.get('mainImage') or car.get('image')).lstrip('/\\')


def font(size, bold=False):
    choices = [
        Path('C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf'),
        Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
    ]
    for choice in choices:
        if choice.exists():
            return ImageFont.truetype(str(choice), size)
    return ImageFont.load_default()


def wrap(draw, value, face, width):
    words = value.split()
    lines, current = [], ''
    for word in words:
        trial = f'{current} {word}'.strip()
        if draw.textbbox((0, 0), trial, font=face)[2] <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def generate(car, background):
    name = vehicle_name(car)
    src_path = source_image(car)
    if not src_path.is_file():
        raise FileNotFoundError(f'Missing vehicle image for {car.get("id")}: {src_path}')
    canvas = background.copy().convert('RGB')
    with Image.open(src_path) as source:
        source = ImageOps.exif_transpose(source).convert('RGB')
        vehicle_panel = ImageOps.fit(source, (750, 562), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    canvas.paste(vehicle_panel, (420, 34))
    overlay = Image.new('RGBA', SIZE, (255, 255, 255, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, 500, 630), fill=(248, 250, 253, 244))
    for x in range(500, 661):
        alpha = max(0, int(244 * (1 - (x - 500) / 161)))
        od.line((x, 0, x, 630), fill=(248, 250, 253, alpha))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((42, 42, 250, 78), radius=18, fill='#153a67')
    draw.text((60, 51), 'ZHONGGU AUTO EXPORT', font=font(17, True), fill='white')
    title_font = font(43, True)
    lines = wrap(draw, name, title_font, 390)
    if len(lines) > 4:
        title_font = font(36, True)
        lines = wrap(draw, name, title_font, 390)
    y = 150
    for line in lines[:5]:
        draw.text((44, y), line, font=title_font, fill='#10243e')
        y += title_font.size + 8
    draw.line((44, min(y + 24, 520), 170, min(y + 24, 520)), fill='#2f76bd', width=5)
    draw.text((44, 548), 'Latest FOB price & stock list', font=font(22), fill='#35516f')
    target = OUT / f'{car["id"]}.jpg'
    canvas.save(target, 'JPEG', quality=86, optimize=True, progressive=True, subsampling=2)
    return target


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cars = json.loads((ROOT / 'cars.json').read_text(encoding='utf-8-sig'))
    with Image.open(BACKGROUND) as bg:
        background = ImageOps.fit(bg.convert('RGB'), SIZE, method=Image.Resampling.LANCZOS)
    outputs = [generate(car, background) for car in cars if car.get('id')]
    print(f'Generated {len(outputs)} vehicle OG images in {OUT.relative_to(ROOT)}.')


if __name__ == '__main__':
    main()