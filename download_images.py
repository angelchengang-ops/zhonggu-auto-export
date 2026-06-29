#!/usr/bin/env python3
"""Download only manually listed, authorized vehicle images.

This script never searches websites or discovers image URLs. It reads direct URLs
from image_sources.txt, validates each response, saves JPEG files to images/cars,
and writes a result row for every source entry to image_download_log.csv.
"""

import csv
import io
import re
import socket
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
SOURCE_FILE = ROOT / "image_sources.txt"
OUTPUT_DIR = ROOT / "images" / "cars"
LOG_FILE = ROOT / "image_download_log.csv"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
TIMEOUT_SECONDS = 30
LOG_FIELDS = [
    "vehicle_id",
    "brand",
    "model",
    "year",
    "image_number",
    "source_url",
    "local_file_path",
    "authorization_note",
    "download_status",
    "error_reason",
]


def slugify(value):
    """Create a lowercase, hyphen-separated ASCII filename component."""
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unknown"


def normalize_image_number(value):
    value = value.strip()
    return value.zfill(2) if value.isdigit() else slugify(value)


def is_valid_url(value):
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def detect_image_type(data):
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def read_limited_response(response):
    content_length = response.headers.get("Content-Length")
    if content_length and int(content_length) > MAX_DOWNLOAD_BYTES:
        raise ValueError("Image exceeds the 25 MB download limit")

    data = response.read(MAX_DOWNLOAD_BYTES + 1)
    if len(data) > MAX_DOWNLOAD_BYTES:
        raise ValueError("Image exceeds the 25 MB download limit")
    return data


def convert_to_jpeg(data, content_type):
    if content_type == "image/jpeg":
        return data

    try:
        from PIL import Image
    except ImportError as exc:
        raise ValueError(
            "PNG/WebP requires Pillow for JPEG conversion. Run: python -m pip install Pillow"
        ) from exc

    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.mode in {"RGBA", "LA"}:
                background = Image.new("RGB", image.size, "white")
                alpha = image.getchannel("A")
                background.paste(image.convert("RGB"), mask=alpha)
                image = background
            else:
                image = image.convert("RGB")
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=92, optimize=True)
            return output.getvalue()
    except Exception as exc:
        raise ValueError(f"Image conversion failed: {exc}") from exc


def parse_source_line(line, line_number):
    parts = [part.strip() for part in line.split("|")]
    if len(parts) != 7:
        raise ValueError(f"Line {line_number}: expected 7 pipe-separated fields, found {len(parts)}")
    return parts


def make_log_row(parts=None):
    values = (parts or []) + [""] * 7
    return {
        "vehicle_id": values[0],
        "brand": values[1],
        "model": values[2],
        "year": values[3],
        "image_number": values[4],
        "source_url": values[5],
        "local_file_path": "",
        "authorization_note": values[6],
        "download_status": "Failed",
        "error_reason": "",
    }


def download_entry(parts):
    row = make_log_row(parts)
    vehicle_id, brand, model, year, image_number, source_url, _ = parts

    if not source_url:
        row["error_reason"] = "Image URL is empty"
        return row
    if not is_valid_url(source_url):
        row["error_reason"] = "Image URL must be a valid HTTP or HTTPS URL"
        return row
    if not brand or not model or not year or not image_number:
        row["error_reason"] = "Brand, model, year, and image number are required"
        return row

    filename = (
        f"{slugify(brand)}-{slugify(model)}-{slugify(year)}-"
        f"{normalize_image_number(image_number)}.jpg"
    )
    output_path = OUTPUT_DIR / filename
    row["local_file_path"] = output_path.relative_to(ROOT).as_posix()

    try:
        request = Request(
            source_url,
            headers={"User-Agent": "ZhongguAutoExport-AuthorizedImageDownloader/1.0"},
        )
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            content_type = response.headers.get_content_type().lower()
            if content_type not in ALLOWED_CONTENT_TYPES:
                raise ValueError(f"Unsupported Content-Type: {content_type or 'missing'}")
            data = read_limited_response(response)

        detected_type = detect_image_type(data)
        if detected_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError("Downloaded content is not a valid JPEG, PNG, or WebP image")
        if detected_type != content_type:
            raise ValueError(
                f"Content-Type mismatch: server reported {content_type}, file is {detected_type}"
            )

        jpeg_data = convert_to_jpeg(data, detected_type)
        output_path.write_bytes(jpeg_data)
        row["download_status"] = "Success"
        row["error_reason"] = ""
    except HTTPError as exc:
        row["error_reason"] = f"HTTP error {exc.code}: {exc.reason}"
    except (URLError, socket.timeout, TimeoutError) as exc:
        row["error_reason"] = f"Network error: {exc}"
    except OSError as exc:
        row["error_reason"] = f"File save or system error: {exc}"
    except Exception as exc:
        row["error_reason"] = str(exc)

    return row


def load_entries():
    entries = []
    parsing_errors = []
    with SOURCE_FILE.open("r", encoding="utf-8-sig") as source:
        for line_number, raw_line in enumerate(source, start=1):
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                entries.append(parse_source_line(line, line_number))
            except ValueError as exc:
                row = make_log_row()
                row["error_reason"] = str(exc)
                parsing_errors.append(row)
    return entries, parsing_errors


def write_log(rows):
    with LOG_FILE.open("w", newline="", encoding="utf-8-sig") as log:
        writer = csv.DictWriter(log, fieldnames=LOG_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not SOURCE_FILE.exists():
        print(f"Source list not found: {SOURCE_FILE}", file=sys.stderr)
        return 1

    try:
        entries, rows = load_entries()
    except OSError as exc:
        print(f"Unable to read {SOURCE_FILE.name}: {exc}", file=sys.stderr)
        return 1

    for entry in entries:
        row = download_entry(entry)
        rows.append(row)
        print(f"[{row['download_status']}] {row['vehicle_id']}: {row['error_reason'] or row['local_file_path']}")

    try:
        write_log(rows)
    except OSError as exc:
        print(f"Unable to write {LOG_FILE.name}: {exc}", file=sys.stderr)
        return 1

    successes = sum(row["download_status"] == "Success" for row in rows)
    failures = len(rows) - successes
    print(f"Finished: {successes} succeeded, {failures} failed. Log: {LOG_FILE.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
