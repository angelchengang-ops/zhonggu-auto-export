import json
import pathlib
import re
import shutil


ROOT = pathlib.Path("images/used-cars")
VIDEO_ROOT = pathlib.Path("videos/used-cars")
DATA_DIR = pathlib.Path("data")

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv"}

MANUAL = {
    "source-vw-t-cross-2024": {
        "id": "used-vw-t-cross-2024-001",
        "brand": "Volkswagen",
        "model": "T-Cross",
        "chineseName": "大众途铠",
        "year": "2024",
        "trim": "2023款 改款 1.5L 自动风尚版",
        "fuel": "Petrol",
        "highlights": ["1.5L naturally aspirated engine", "Automatic transmission", "White exterior", "Compact SUV"],
    },
    "source-vw-tacqua-2023": {
        "id": "used-vw-tacqua-2023-001",
        "brand": "Volkswagen",
        "model": "TACQUA",
        "chineseName": "大众探影",
        "year": "2023",
        "trim": "2023款 200TSI DSG 悦智联版",
        "fuel": "Petrol",
        "highlights": ["200TSI turbo engine", "DSG automatic transmission", "White exterior", "Compact SUV"],
    },
    "source-toyota-corolla-2023": {
        "id": "used-toyota-corolla-2023-001",
        "brand": "Toyota",
        "model": "Corolla",
        "chineseName": "丰田卡罗拉",
        "year": "2023",
        "trim": "2023款 1.2T 精英版",
        "fuel": "Petrol",
        "highlights": ["1.2T turbo engine", "CVT transmission", "White exterior", "Compact sedan"],
    },
    "source-toyota-rav4-2024": {
        "id": "used-toyota-rav4-2024-001",
        "brand": "Toyota",
        "model": "RAV4",
        "chineseName": "丰田荣放RAV4",
        "year": "2024",
        "trim": "CVT 两驱风尚 Plus版",
        "fuel": "Petrol",
        "highlights": ["2.0L naturally aspirated engine", "CVT transmission", "Two-wheel drive", "White or black exterior"],
    },
    "source-honda-fit-2021": {
        "id": "used-honda-fit-2021-001",
        "brand": "Honda",
        "model": "Fit",
        "chineseName": "广汽本田飞度",
        "year": "2021",
        "trim": "2021款 1.5L CVT 潮启版",
        "fuel": "Petrol",
        "highlights": ["1.5L naturally aspirated engine", "CVT transmission", "White exterior", "Compact hatchback"],
    },
    "source-toyota-corolla-2022": {
        "id": "used-toyota-corolla-2022-001",
        "brand": "Toyota",
        "model": "Corolla",
        "chineseName": "卡罗拉",
        "year": "2022",
        "trim": "2022款 TNGA 1.5L CVT 先锋版",
        "fuel": "Petrol",
        "highlights": ["TNGA platform", "1.5L naturally aspirated engine", "CVT transmission", "White exterior"],
    },
    "source-chery-tiggo8-plus-cdm": {
        "id": "used-chery-tiggo8-plus-cdm-001",
        "brand": "Chery",
        "model": "Tiggo 8 PLUS C-DM",
        "chineseName": "瑞虎8 PLUS C-DM",
        "year": "2024",
        "trim": "1.5T 尊贵版 选装女王座驾",
        "fuel": "Plug-in Hybrid",
        "highlights": ["1.5T turbo hybrid system", "1-speed DHT transmission", "Queen seat option", "Galaxy Blue exterior"],
    },
}


def norm(value):
    return re.sub(r"\s+", " ", value.replace("\u00a0", " ")).strip()


def read_text_file(directory):
    for file_path in sorted(directory.iterdir(), key=lambda path: path.name):
        if file_path.suffix.lower() not in {".txt", ".md", ".csv", ".text"}:
            continue
        for encoding in ("utf-8-sig", "utf-8", "gb18030", "utf-16"):
            try:
                return file_path.name, file_path.read_text(encoding=encoding)
            except UnicodeError:
                continue
    return "", ""


def field(text, *names):
    for name in names:
        match = re.search(r"《" + re.escape(name) + r"》\s*[:：]\s*([^\n\r]+)", text)
        if match:
            return norm(match.group(1))
    return ""


def guide_price(text):
    english = field(text, "Guide Price")
    if english:
        return english
    chinese = field(text, "指导价")
    if chinese:
        match = re.search(r"([0-9.]+)\s*万", chinese)
        if match:
            return f"{int(float(match.group(1)) * 10000):,} RMB"
        return chinese
    return ""


def transmission(value):
    raw = value.lower()
    if "dht" in raw:
        return "DHT Hybrid Transmission"
    if "cvt" in raw or "无级" in value:
        return "CVT"
    if "dsg" in raw:
        return "DSG Automatic"
    if "automatic" in raw or "自动" in value or "手自一体" in value:
        return "Automatic"
    return value


def engine(value):
    return value.split(",")[0].strip() if value else ""


def description(info, text):
    dimensions = field(text, "Dimensions", "车身尺寸")
    engine_text = field(text, "Engine", "发动机")
    production = field(text, "Production Date", "出厂时间")
    registration = field(text, "Registration Date", "上牌时间")
    parts = [f"{info['brand']} {info['model']} {info['trim']} used vehicle in China."]
    if production:
        parts.append(f"Production date: {production}.")
    if registration:
        parts.append(f"Registration date: {registration}.")
    if dimensions:
        parts.append(f"Dimensions: {dimensions}.")
    if engine_text:
        parts.append(f"Engine: {engine_text}.")
    return " ".join(parts)


def import_used_cars():
    DATA_DIR.mkdir(exist_ok=True)
    VIDEO_ROOT.mkdir(parents=True, exist_ok=True)

    records = []
    report_items = []
    source_dirs = [path for path in ROOT.iterdir() if path.is_dir() and not path.name.startswith("used-")]

    for source_dir in sorted(source_dirs, key=lambda path: path.name):
        info = MANUAL.get(source_dir.name)
        if not info:
            continue

        text_file, text = read_text_file(source_dir)
        images = sorted(
            [path for path in source_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTS],
            key=lambda path: path.name,
        )
        videos = sorted(
            [path for path in source_dir.iterdir() if path.is_file() and path.suffix.lower() in VIDEO_EXTS],
            key=lambda path: path.name,
        )

        slug = info["id"]
        image_dir = ROOT / slug
        video_dir = VIDEO_ROOT / slug
        image_dir.mkdir(parents=True, exist_ok=True)
        video_dir.mkdir(parents=True, exist_ok=True)

        image_paths = []
        for index, source in enumerate(images, 1):
            destination = image_dir / f"{index:02d}.jpg"
            shutil.copy2(source, destination)
            image_paths.append(destination.as_posix())

        video_paths = []
        transcode_needed = []
        for index, source in enumerate(videos, 1):
            extension = source.suffix.lower() or ".mp4"
            destination = video_dir / f"video-{index:02d}{extension}"
            shutil.copy2(source, destination)
            video_paths.append(destination.as_posix())
            if extension != ".mp4":
                transcode_needed.append(destination.as_posix())

        mileage = field(text, "Odometer Reading", "表显里程")
        color = field(text, "Color", "颜色")
        engine_text = engine(field(text, "Engine", "发动机")) or field(text, "Displacement/Range", "排量or续航")
        transmission_text = transmission(field(text, "Transmission", "变速箱"))
        price = guide_price(text)

        needs_confirmation = []
        if not images:
            needs_confirmation.append("images")
        if not mileage:
            needs_confirmation.append("mileage")
        if not color:
            needs_confirmation.append("color")
        if not price:
            needs_confirmation.append("price")
        else:
            needs_confirmation.append("actual sale price")
        if source_dir.name == "source-toyota-rav4-2024":
            needs_confirmation.append("model year")

        record = {
            "id": slug,
            "brand": info["brand"],
            "model": info["model"],
            "chineseName": info["chineseName"],
            "year": info["year"],
            "trim": info["trim"],
            "engine": engine_text,
            "transmission": transmission_text,
            "fuel": info["fuel"],
            "mileage": mileage,
            "color": color,
            "price": price,
            "location": "China",
            "mainImage": image_paths[0] if image_paths else "",
            "images": image_paths,
            "videos": video_paths,
            "description": description(info, text),
            "highlights": info["highlights"],
            "status": "Available",
        }
        records.append(record)
        report_items.append({
            "folder": source_dir.name,
            "textFile": text_file,
            "record": record,
            "sourceImages": [path.name for path in images],
            "sourceVideos": [path.name for path in videos],
            "needsConfirmation": needs_confirmation,
            "transcodeNeeded": transcode_needed,
        })

    (DATA_DIR / "used-cars.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_report(report_items)
    return len(records)


def write_report(report_items):
    lines = [
        "# Used Car Import Report",
        "",
        "## Summary",
        "",
        f"- Imported vehicles: {len(report_items)}",
        "- Source directory: `images/used-cars`",
        "- Data file: `data/used-cars.json`",
        "- Original source files were not deleted.",
        "",
    ]

    manual_confirmation = []
    transcode_summary = []

    for item in report_items:
        record = item["record"]
        manual_confirmation.extend((record["id"], field_name) for field_name in item["needsConfirmation"])
        transcode_summary.extend(item["transcodeNeeded"])

        lines.extend([
            f"## {record['id']}",
            "",
            f"- Source folder: `{item['folder']}`",
            f"- Text file: `{item['textFile'] or 'None'}`",
            f"- Brand/model: {record['brand']} {record['model']}",
            f"- Chinese name: {record['chineseName']}",
            f"- Year: {record['year']}",
            f"- Trim: {record['trim']}",
            f"- Engine: {record['engine']}",
            f"- Transmission: {record['transmission']}",
            f"- Fuel: {record['fuel']}",
            f"- Mileage: {record['mileage']}",
            f"- Color: {record['color']}",
            f"- Price: {record['price']}",
            f"- Main image: `{record['mainImage']}`",
            "- Images:",
        ])
        lines.extend(f"  - `{path}`" for path in record["images"])
        lines.append("- Videos:")
        if record["videos"]:
            lines.extend(f"  - `{path}`" for path in record["videos"])
        else:
            lines.append("  - None")
        lines.append("- Needs manual confirmation: " + (", ".join(item["needsConfirmation"]) if item["needsConfirmation"] else "None"))
        lines.append("- Videos needing transcode: " + (", ".join(item["transcodeNeeded"]) if item["transcodeNeeded"] else "None"))
        lines.append("")

    lines.extend(["## Manual Confirmation Summary", ""])
    if manual_confirmation:
        lines.extend(f"- `{vehicle_id}`: {field_name}" for vehicle_id, field_name in manual_confirmation)
    else:
        lines.append("- None")

    lines.extend(["", "## Video Transcode Summary", ""])
    if transcode_summary:
        lines.extend(f"- `{path}`" for path in transcode_summary)
    else:
        lines.append("- None. All imported videos are MP4.")

    pathlib.Path("USED_CAR_IMPORT_REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    print(f"imported {import_used_cars()} used cars")
