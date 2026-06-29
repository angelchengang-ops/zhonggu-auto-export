#!/usr/bin/env python3
"""
Apply manually labeled license plate masks and watermark media.

Input:
  plate_boxes.json
  media-inbox/unsorted
  media-processed/review-needed

Output:
  media-processed-v2/images
  media-processed-v2/videos
  media-processed-v2/posters
  media-processed-v2/review-needed
  processing_log_v2.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None

try:
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover
    np = None

try:
    from rembg import remove as rembg_remove  # type: ignore
except Exception:  # pragma: no cover
    rembg_remove = None


ROOT = Path(__file__).resolve().parent
INPUT_DIRS = [
    ROOT / "media-inbox" / "unsorted",
    ROOT / "media-processed" / "review-needed",
]
OUTPUT_ROOT = ROOT / "media-processed-v2"
IMAGE_OUT = OUTPUT_ROOT / "images"
VIDEO_OUT = OUTPUT_ROOT / "videos"
POSTER_OUT = OUTPUT_ROOT / "posters"
REVIEW_OUT = OUTPUT_ROOT / "review-needed"
BOX_PATH = ROOT / "plate_boxes.json"
LOG_PATH = ROOT / "processing_log_v2.csv"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}

PLATE_TEXT = "zhongguauto"
WATERMARK_TEXT = "zhonggu"
BACKGROUND_COLOR = (245, 245, 245)

KNOWN_NAME_MAP = {
    "GS3": "gac-trumpchi-gs3",
    "GS4": "gac-trumpchi-gs4-max",
    "MG5": "mg5",
    "丰田瑞放": "toyota-corolla-cross",
    "交车": "vehicle-delivery",
    "仓库": "warehouse",
    "仓库2": "warehouse-2",
    "仓库3": "warehouse-3",
    "仓库4": "warehouse-4",
    "仓库5": "warehouse-5",
    "仓库6": "warehouse-6",
    "仓库7": "warehouse-7",
    "博越": "geely-boyue",
    "卡罗拉": "toyota-corolla-hybrid",
    "微信图片_20260616103708_225_99": "company-photo",
    "捷图": "jetour-x70l",
    "捷达": "jetta-vs5",
    "星舰7": "geely-galaxy-starship-7",
    "星舰7 (2)": "geely-galaxy-starship-7-2",
    "星越l": "geely-xingyue-l",
    "睿蓝": "livan-x3-pro",
    "缤越668": "geely-coolray-668",
    "缤越968+5000": "geely-coolray-968-plus-5000",
    "缤越978": "geely-coolray-978",
    "起亚": "kia-kx1",
    "起亚2": "kia-kx1-2",
}


@dataclass
class LogRow:
    originalFileName: str
    hasManualPlateBox: str
    plateMasked: str
    watermarkAdded: str
    backgroundChanged: str
    outputPath: str
    status: str
    notes: str


def rel_key(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def ensure_dirs() -> None:
    for directory in (IMAGE_OUT, VIDEO_OUT, POSTER_OUT, REVIEW_OUT):
        directory.mkdir(parents=True, exist_ok=True)


def slugify(stem: str) -> str:
    mapped = KNOWN_NAME_MAP.get(stem, stem)
    normalized = unicodedata.normalize("NFKD", mapped).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized or "media"


def unique_path(directory: Path, stem: str, suffix: str) -> Path:
    candidate = directory / f"{stem}{suffix}"
    index = 2
    while candidate.exists():
        candidate = directory / f"{stem}-{index}{suffix}"
        index += 1
    return candidate


def scan_files() -> list[Path]:
    files: list[Path] = []
    seen: set[str] = set()
    for directory in INPUT_DIRS:
        if not directory.exists():
            continue
        for path in sorted(directory.rglob("*"), key=lambda p: rel_key(p).lower()):
            if path.is_file():
                key = rel_key(path)
                if key not in seen:
                    seen.add(key)
                    files.append(path)
    return files


def load_boxes() -> dict[str, Any]:
    if not BOX_PATH.exists():
        return {}
    with BOX_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("images", data)


def find_box(boxes: dict[str, Any], source: Path) -> dict[str, float] | None:
    entry = boxes.get(rel_key(source), {})
    box = entry.get("box") if isinstance(entry, dict) else entry
    if box:
        return box

    # Useful when a file was moved from inbox to review-needed after labeling.
    matches = [
        value.get("box")
        for key, value in boxes.items()
        if isinstance(value, dict) and Path(key).name.lower() == source.name.lower() and value.get("box")
    ]
    return matches[0] if matches else None


def get_font(size: int) -> ImageFont.ImageFont:
    for font_name in ("arial.ttf", "Arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(font_name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def fit_text_font(draw: ImageDraw.ImageDraw, text: str, box_width: int, max_size: int) -> ImageFont.ImageFont:
    for size in range(max_size, 9, -1):
        font = get_font(size)
        left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
        if right - left <= box_width * 0.82:
            return font
    return get_font(10)


def draw_plate_mask(image: Image.Image, box: dict[str, float]) -> None:
    width, height = image.size
    x1 = int(float(box["x"]) * width)
    y1 = int(float(box["y"]) * height)
    x2 = int((float(box["x"]) + float(box["width"])) * width)
    y2 = int((float(box["y"]) + float(box["height"])) * height)
    x1, x2 = sorted((max(0, x1), min(width, x2)))
    y1, y2 = sorted((max(0, y1), min(height, y2)))

    draw = ImageDraw.Draw(image)
    radius = max(4, int((y2 - y1) * 0.2))
    draw.rounded_rectangle((x1, y1, x2, y2), radius=radius, fill=(12, 22, 34, 255))
    font = fit_text_font(draw, PLATE_TEXT, x2 - x1, max(12, int((y2 - y1) * 0.58)))
    left, top, right, bottom = draw.textbbox((0, 0), PLATE_TEXT, font=font)
    tx = x1 + ((x2 - x1) - (right - left)) / 2
    ty = y1 + ((y2 - y1) - (bottom - top)) / 2 - 1
    draw.text((tx, ty), PLATE_TEXT, fill=(255, 255, 255, 255), font=font)


def draw_watermark(image: Image.Image) -> None:
    overlay = Image.new("RGBA", image.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = image.size
    font = get_font(max(24, width // 34))
    left, top, right, bottom = draw.textbbox((0, 0), WATERMARK_TEXT, font=font)
    text_w = right - left
    text_h = bottom - top
    padding = max(20, width // 52)
    x = width - text_w - padding
    y = height - text_h - padding
    draw.text((x + 2, y + 2), WATERMARK_TEXT, fill=(0, 0, 0, 45), font=font)
    draw.text((x, y), WATERMARK_TEXT, fill=(255, 255, 255, 115), font=font)
    image.alpha_composite(overlay)


def optimize_image(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Brightness(image).enhance(1.04)
    image = ImageEnhance.Contrast(image).enhance(1.05)
    return image


def maybe_replace_background(image: Image.Image, enabled: bool) -> tuple[Image.Image, str, str]:
    if not enabled:
        return image.convert("RGBA"), "no", "background replacement disabled"
    if rembg_remove is None:
        return image.convert("RGBA"), "no", "rembg not installed; original background kept"
    try:
        cutout = rembg_remove(image.convert("RGBA"))
        background = Image.new("RGBA", cutout.size, BACKGROUND_COLOR + (255,))
        background.alpha_composite(cutout)
        return background, "yes", "background replaced by optional rembg"
    except Exception as exc:
        return image.convert("RGBA"), "no", f"rembg failed; original background kept: {exc}"


def copy_for_review(source: Path, note: str) -> LogRow:
    output = unique_path(REVIEW_OUT, slugify(source.stem), source.suffix.lower())
    shutil.copy2(source, output)
    return LogRow(
        originalFileName=source.name,
        hasManualPlateBox="no",
        plateMasked="no",
        watermarkAdded="no",
        backgroundChanged="no",
        outputPath=str(output.relative_to(ROOT)),
        status="review-needed",
        notes=note,
    )


def process_image(source: Path, box: dict[str, float] | None, replace_background: bool) -> LogRow:
    if box is None:
        return copy_for_review(source, "no manual plate box; copied without forced masking")

    output = unique_path(IMAGE_OUT, slugify(source.stem), ".jpg")
    notes: list[str] = []
    try:
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
        if image.width > 1600:
            ratio = 1600 / image.width
            image = image.resize((1600, max(1, int(image.height * ratio))), Image.Resampling.LANCZOS)

        image = optimize_image(image)
        processed, background_changed, bg_note = maybe_replace_background(image, replace_background)
        notes.append(bg_note)
        draw_plate_mask(processed, box)
        draw_watermark(processed)
        processed.convert("RGB").save(output, "JPEG", quality=82, optimize=True, progressive=True)
        return LogRow(source.name, "yes", "yes", "yes", background_changed, str(output.relative_to(ROOT)), "processed", "; ".join(notes))
    except Exception as exc:
        row = copy_for_review(source, f"image processing failed: {exc}")
        row.status = "failed"
        return row


def ffmpeg_path() -> str | None:
    return shutil.which("ffmpeg")


def process_video(source: Path) -> LogRow:
    if cv2 is None or np is None:
        row = copy_for_review(source, "opencv-python/numpy not installed; video not processed")
        row.status = "failed"
        return row

    output = unique_path(VIDEO_OUT, slugify(source.stem), ".mp4")
    poster = unique_path(POSTER_OUT, slugify(source.stem), ".jpg")
    cap = cv2.VideoCapture(str(source))
    if not cap.isOpened():
        row = copy_for_review(source, "unable to open video")
        row.status = "failed"
        return row

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale = min(1.0, 1920 / max(1, width), 1080 / max(1, height))
    out_w = max(2, int(width * scale))
    out_h = max(2, int(height * scale))
    out_w -= out_w % 2
    out_h -= out_h % 2

    tmp_dir = Path(tempfile.mkdtemp(prefix="zhonggu-v2-"))
    silent_video = tmp_dir / "video-no-audio.mp4"
    writer = cv2.VideoWriter(str(silent_video), cv2.VideoWriter_fourcc(*"mp4v"), fps, (out_w, out_h))
    if not writer.isOpened():
        cap.release()
        shutil.rmtree(tmp_dir, ignore_errors=True)
        row = copy_for_review(source, "unable to create video writer")
        row.status = "failed"
        return row

    frame_index = 0
    notes: list[str] = ["video plate masking intentionally skipped; watermark only"]
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if scale != 1.0:
                frame = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
            pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).convert("RGBA")
            draw_watermark(pil)
            if frame_index == 0:
                pil.convert("RGB").save(poster, "JPEG", quality=84, optimize=True)
            writer.write(cv2.cvtColor(np.array(pil.convert("RGB")), cv2.COLOR_RGB2BGR))
            frame_index += 1
    except Exception as exc:
        cap.release()
        writer.release()
        shutil.rmtree(tmp_dir, ignore_errors=True)
        row = copy_for_review(source, f"video processing failed: {exc}")
        row.status = "failed"
        return row
    finally:
        cap.release()
        writer.release()

    if frame_index == 0:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        row = copy_for_review(source, "video had no readable frames")
        row.status = "failed"
        return row

    ffmpeg = ffmpeg_path()
    if ffmpeg:
        cmd = [
            ffmpeg,
            "-y",
            "-i",
            str(silent_video),
            "-i",
            str(source),
            "-map",
            "0:v:0",
            "-map",
            "1:a?",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(output),
        ]
        completed = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if completed.returncode == 0:
            notes.append("audio preserved when present")
        else:
            shutil.copy2(silent_video, output)
            notes.append("ffmpeg failed; audio may not be preserved")
    else:
        shutil.copy2(silent_video, output)
        notes.append("ffmpeg not found; audio may not be preserved")

    shutil.rmtree(tmp_dir, ignore_errors=True)
    notes.append(f"poster generated: {poster.relative_to(ROOT)}")
    return LogRow(source.name, "no", "no", "yes", "no", str(output.relative_to(ROOT)), "processed", "; ".join(notes))


def write_log(rows: list[LogRow]) -> None:
    fields = [
        "originalFileName",
        "hasManualPlateBox",
        "plateMasked",
        "watermarkAdded",
        "backgroundChanged",
        "outputPath",
        "status",
        "notes",
    ]
    with LOG_PATH.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply manual plate masks and v2 watermarks.")
    parser.add_argument("--replace-background", action="store_true", help="Optionally run rembg background replacement for labeled images.")
    parser.add_argument("--skip-video", action="store_true", help="Process images only.")
    args = parser.parse_args()

    ensure_dirs()
    boxes = load_boxes()
    rows: list[LogRow] = []
    for source in scan_files():
        suffix = source.suffix.lower()
        if suffix in IMAGE_EXTENSIONS:
            rows.append(process_image(source, find_box(boxes, source), args.replace_background))
        elif suffix in VIDEO_EXTENSIONS:
            if args.skip_video:
                rows.append(LogRow(source.name, "no", "no", "no", "no", "", "skipped", "video skipped by --skip-video"))
            else:
                rows.append(process_video(source))

    write_log(rows)
    print(f"Processed {len(rows)} file(s).")
    print(f"Images: {IMAGE_OUT}")
    print(f"Review needed: {REVIEW_OUT}")
    print(f"Posters: {POSTER_OUT}")
    print(f"Log: {LOG_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
