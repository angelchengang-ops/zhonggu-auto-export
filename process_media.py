#!/usr/bin/env python3
"""
Batch media processor for Zhonggu Auto Export.

Input:
  media-inbox/unsorted

Output:
  media-processed/images
  media-processed/videos
  media-processed/posters
  media-processed/review-needed
  media-processed/processing_log.csv
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency check
    cv2 = None

try:
    from rembg import remove as rembg_remove  # type: ignore
except Exception:  # pragma: no cover - optional dependency check
    rembg_remove = None


ROOT = Path(__file__).resolve().parent
INPUT_DIR = ROOT / "media-inbox" / "unsorted"
OUTPUT_ROOT = ROOT / "media-processed"
IMAGE_OUT = OUTPUT_ROOT / "images"
VIDEO_OUT = OUTPUT_ROOT / "videos"
POSTER_OUT = OUTPUT_ROOT / "posters"
REVIEW_OUT = OUTPUT_ROOT / "review-needed"
LOG_PATH = OUTPUT_ROOT / "processing_log.csv"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}

BACKGROUND_COLOR = (245, 245, 245)
PLATE_TEXT = "zhongguauto"
WATERMARK_TEXT = "zhonggu"

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
    mediaType: str
    outputFileName: str
    outputPath: str
    plateMasked: str
    backgroundReplaced: str
    watermarkAdded: str
    posterGenerated: str
    status: str
    notes: str


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


def conservative_plate_boxes(width: int, height: int) -> list[tuple[int, int, int, int]]:
    """Return common front/rear plate zones for vehicle photos.

    This deliberately avoids pretending to have a precise detector. The output is
    marked review-needed when no stronger detector/background model is available.
    """
    box_w = int(width * 0.24)
    box_h = max(34, int(height * 0.055))
    center_x = width // 2
    zones = [
        (center_x - box_w // 2, int(height * 0.57), center_x + box_w // 2, int(height * 0.57) + box_h),
        (center_x - box_w // 2, int(height * 0.68), center_x + box_w // 2, int(height * 0.68) + box_h),
    ]
    return [(max(0, x1), max(0, y1), min(width, x2), min(height, y2)) for x1, y1, x2, y2 in zones]


def draw_plate_mask(image: Image.Image, boxes: Iterable[tuple[int, int, int, int]]) -> None:
    draw = ImageDraw.Draw(image)
    for x1, y1, x2, y2 in boxes:
        radius = max(4, int((y2 - y1) * 0.18))
        draw.rounded_rectangle((x1, y1, x2, y2), radius=radius, fill=(12, 24, 38))
        font = fit_text_font(draw, PLATE_TEXT, x2 - x1, max(12, int((y2 - y1) * 0.56)))
        left, top, right, bottom = draw.textbbox((0, 0), PLATE_TEXT, font=font)
        tx = x1 + ((x2 - x1) - (right - left)) / 2
        ty = y1 + ((y2 - y1) - (bottom - top)) / 2 - 1
        draw.text((tx, ty), PLATE_TEXT, fill=(255, 255, 255), font=font)


def draw_watermark(image: Image.Image) -> None:
    overlay = Image.new("RGBA", image.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = image.size
    font = get_font(max(28, width // 32))
    left, top, right, bottom = draw.textbbox((0, 0), WATERMARK_TEXT, font=font)
    text_w = right - left
    text_h = bottom - top
    padding = max(24, width // 50)
    x = width - text_w - padding
    y = height - text_h - padding
    draw.text((x + 2, y + 2), WATERMARK_TEXT, fill=(0, 0, 0, 50), font=font)
    draw.text((x, y), WATERMARK_TEXT, fill=(255, 255, 255, 115), font=font)
    image.alpha_composite(overlay)


def replace_background_if_available(image: Image.Image) -> tuple[Image.Image, str, str]:
    if rembg_remove is None:
        return image.convert("RGBA"), "no", "rembg not installed; background not replaced"
    try:
        cutout = rembg_remove(image.convert("RGBA"))
        background = Image.new("RGBA", cutout.size, BACKGROUND_COLOR + (255,))
        background.alpha_composite(cutout)
        return background, "yes", "background replaced with rembg"
    except Exception as exc:
        return image.convert("RGBA"), "no", f"background replacement failed: {exc}"


def process_image(source: Path) -> LogRow:
    stem = slugify(source.stem)
    output = unique_path(IMAGE_OUT, stem, ".jpg")
    review_copy = REVIEW_OUT / output.name
    notes: list[str] = []
    status = "processed"
    background_replaced = "no"

    try:
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")

        if image.width > 1600:
            ratio = 1600 / image.width
            image = image.resize((1600, max(1, int(image.height * ratio))), Image.Resampling.LANCZOS)

        processed, background_replaced, bg_note = replace_background_if_available(image)
        notes.append(bg_note)

        boxes = conservative_plate_boxes(processed.width, processed.height)
        draw_plate_mask(processed, boxes)
        draw_watermark(processed)

        final_image = processed.convert("RGB")
        final_image.save(output, "JPEG", quality=80, optimize=True, progressive=True)

        notes.append("plate mask uses conservative common vehicle plate zones; manual review recommended")
        status = "review-needed"
        shutil.copy2(output, review_copy)

        return LogRow(
            originalFileName=source.name,
            mediaType="image",
            outputFileName=output.name,
            outputPath=str(output.relative_to(ROOT)),
            plateMasked="yes",
            backgroundReplaced=background_replaced,
            watermarkAdded="yes",
            posterGenerated="no",
            status=status,
            notes="; ".join(notes),
        )
    except Exception as exc:
        failed_copy = REVIEW_OUT / f"{stem}{source.suffix.lower()}"
        shutil.copy2(source, failed_copy)
        return LogRow(
            originalFileName=source.name,
            mediaType="image",
            outputFileName=failed_copy.name,
            outputPath=str(failed_copy.relative_to(ROOT)),
            plateMasked="no",
            backgroundReplaced="no",
            watermarkAdded="no",
            posterGenerated="no",
            status="failed",
            notes=f"image processing failed: {exc}",
        )


def ffmpeg_path() -> str | None:
    return shutil.which("ffmpeg")


def process_video(source: Path) -> LogRow:
    stem = slugify(source.stem)
    output = unique_path(VIDEO_OUT, stem, ".mp4")
    poster = unique_path(POSTER_OUT, stem, ".jpg")
    review_frame = REVIEW_OUT / f"{stem}-first-frame.jpg"
    notes: list[str] = []

    if cv2 is None:
        review_copy = REVIEW_OUT / source.name
        shutil.copy2(source, review_copy)
        return LogRow(source.name, "video", review_copy.name, str(review_copy.relative_to(ROOT)), "no", "no", "no", "no", "failed", "opencv-python not installed")

    cap = cv2.VideoCapture(str(source))
    if not cap.isOpened():
        review_copy = REVIEW_OUT / source.name
        shutil.copy2(source, review_copy)
        return LogRow(source.name, "video", review_copy.name, str(review_copy.relative_to(ROOT)), "no", "no", "no", "no", "failed", "unable to open video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if width <= 0 or height <= 0:
        cap.release()
        review_copy = REVIEW_OUT / source.name
        shutil.copy2(source, review_copy)
        return LogRow(source.name, "video", review_copy.name, str(review_copy.relative_to(ROOT)), "no", "no", "no", "no", "failed", "invalid video dimensions")

    scale = min(1.0, 1920 / width, 1080 / height)
    out_w = int(width * scale)
    out_h = int(height * scale)
    out_w -= out_w % 2
    out_h -= out_h % 2

    tmp_dir = Path(tempfile.mkdtemp(prefix="zhonggu-media-"))
    silent_video = tmp_dir / "video-no-audio.mp4"
    writer = cv2.VideoWriter(str(silent_video), cv2.VideoWriter_fourcc(*"mp4v"), fps, (out_w, out_h))
    if not writer.isOpened():
        cap.release()
        shutil.rmtree(tmp_dir, ignore_errors=True)
        review_copy = REVIEW_OUT / source.name
        shutil.copy2(source, review_copy)
        return LogRow(source.name, "video", review_copy.name, str(review_copy.relative_to(ROOT)), "no", "no", "no", "no", "failed", "unable to create video writer")

    frame_index = 0
    poster_generated = "no"
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if scale != 1.0:
                frame = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)

            pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)).convert("RGBA")
            draw_plate_mask(pil, conservative_plate_boxes(pil.width, pil.height))
            draw_watermark(pil)
            frame_out = cv2.cvtColor(__import__("numpy").array(pil.convert("RGB")), cv2.COLOR_RGB2BGR)

            if frame_index == 0:
                pil.convert("RGB").save(poster, "JPEG", quality=82, optimize=True)
                pil.convert("RGB").save(review_frame, "JPEG", quality=82, optimize=True)
                poster_generated = "yes"

            writer.write(frame_out)
            frame_index += 1
    except Exception as exc:
        cap.release()
        writer.release()
        shutil.rmtree(tmp_dir, ignore_errors=True)
        review_copy = REVIEW_OUT / source.name
        shutil.copy2(source, review_copy)
        return LogRow(source.name, "video", review_copy.name, str(review_copy.relative_to(ROOT)), "yes", "partial", "yes", poster_generated, "failed", f"video processing failed: {exc}")
    finally:
        cap.release()
        writer.release()

    if frame_index == 0:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        review_copy = REVIEW_OUT / source.name
        shutil.copy2(source, review_copy)
        return LogRow(source.name, "video", review_copy.name, str(review_copy.relative_to(ROOT)), "no", "no", "no", "no", "failed", "video had no readable frames")

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
        if completed.returncode != 0:
            shutil.copy2(silent_video, output)
            notes.append("ffmpeg mux/transcode failed; output video may not preserve original audio")
        else:
            notes.append("audio preserved when present")
    else:
        shutil.copy2(silent_video, output)
        notes.append("ffmpeg not found; output video was generated without reliable audio preservation")

    shutil.rmtree(tmp_dir, ignore_errors=True)
    notes.append("background replacement for video not attempted; marked partial")
    notes.append("plate mask uses conservative common vehicle plate zones; manual review recommended")

    return LogRow(
        originalFileName=source.name,
        mediaType="video",
        outputFileName=output.name,
        outputPath=str(output.relative_to(ROOT)),
        plateMasked="yes",
        backgroundReplaced="partial",
        watermarkAdded="yes",
        posterGenerated=poster_generated,
        status="review-needed",
        notes="; ".join(notes),
    )


def scan_files(input_dir: Path) -> list[Path]:
    if not input_dir.exists():
        return []
    return sorted([path for path in input_dir.rglob("*") if path.is_file()], key=lambda p: p.name.lower())


def write_log(rows: list[LogRow]) -> None:
    fields = [
        "originalFileName",
        "mediaType",
        "outputFileName",
        "outputPath",
        "plateMasked",
        "backgroundReplaced",
        "watermarkAdded",
        "posterGenerated",
        "status",
        "notes",
    ]
    with LOG_PATH.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def main() -> int:
    parser = argparse.ArgumentParser(description="Process Zhonggu Auto Export image/video assets.")
    parser.add_argument("--input", default=str(INPUT_DIR), help="Input folder. Default: media-inbox/unsorted")
    parser.add_argument("--skip-video", action="store_true", help="Process images only.")
    args = parser.parse_args()

    input_dir = Path(args.input).resolve()
    ensure_dirs()

    rows: list[LogRow] = []
    files = scan_files(input_dir)
    for source in files:
        suffix = source.suffix.lower()
        if suffix in IMAGE_EXTENSIONS:
            rows.append(process_image(source))
        elif suffix in VIDEO_EXTENSIONS:
            if args.skip_video:
                rows.append(LogRow(source.name, "video", "", "", "no", "no", "no", "no", "skipped", "video skipped by --skip-video"))
            else:
                rows.append(process_video(source))
        else:
            review_copy = unique_path(REVIEW_OUT, slugify(source.stem), suffix)
            shutil.copy2(source, review_copy)
            rows.append(LogRow(source.name, "unknown", review_copy.name, str(review_copy.relative_to(ROOT)), "no", "no", "no", "no", "review-needed", "unsupported file extension"))

    write_log(rows)
    print(f"Processed {len(rows)} file(s).")
    print(f"Log: {LOG_PATH}")
    print(f"Review needed: {REVIEW_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
