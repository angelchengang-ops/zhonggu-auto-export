import argparse
import csv
import mimetypes
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Download manually confirmed official vehicle image candidates."
    )
    parser.add_argument(
        "--source-file",
        default="official_image_sources.txt",
        help="Input file with vehicleId|brand|model|imageUrl|sourcePage|licenseNote|targetFileName",
    )
    parser.add_argument(
        "--output-dir",
        default="images/new-cars-candidates",
        help="Directory for downloaded candidate images",
    )
    parser.add_argument(
        "--log-file",
        default="official_image_download_log.csv",
        help="CSV log file path",
    )
    return parser.parse_args()


def read_source_lines(source_file):
    with open(source_file, "r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            yield line_number, line


def is_valid_http_url(value):
    try:
        parsed = urllib.parse.urlparse(value)
    except ValueError:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def ensure_csv_header(log_file):
    if log_file.exists():
        return
    with open(log_file, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "vehicleId",
                "brand",
                "model",
                "sourcePage",
                "imageUrl",
                "licenseNote",
                "localCandidatePath",
                "status",
                "error",
            ]
        )


def append_log(log_file, row):
    with open(log_file, "a", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(row)


def normalized_content_type(headers):
    content_type = headers.get("Content-Type", "")
    return content_type.split(";", 1)[0].strip().lower()


def download_one(record, output_dir):
    vehicle_id, brand, model, image_url, source_page, license_note, target_file_name = record
    request = urllib.request.Request(
        image_url,
        headers={
            "User-Agent": "ZhongguAutoExportOfficialImageDownloader/1.0"
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        content_type = normalized_content_type(response.headers)
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Unsupported Content-Type: {content_type or 'missing'}")

        target_path = output_dir / target_file_name
        target_path.parent.mkdir(parents=True, exist_ok=True)
        payload = response.read()
        target_path.write_bytes(payload)
        return target_path


def main():
    args = parse_args()
    source_file = Path(args.source_file)
    output_dir = Path(args.output_dir)
    log_file = Path(args.log_file)

    output_dir.mkdir(parents=True, exist_ok=True)
    ensure_csv_header(log_file)

    if not source_file.exists():
        print(f"Source file not found: {source_file}", file=sys.stderr)
        return 1

    for line_number, line in read_source_lines(source_file):
        parts = line.split("|")
        if len(parts) != 7:
            append_log(
                log_file,
                ["", "", "", "", "", "", "", "error", f"Line {line_number}: expected 7 fields"],
            )
            continue

        vehicle_id, brand, model, image_url, source_page, license_note, target_file_name = [
            part.strip() for part in parts
        ]

        if not is_valid_http_url(image_url):
            append_log(
                log_file,
                [
                    vehicle_id,
                    brand,
                    model,
                    source_page,
                    image_url,
                    license_note,
                    "",
                    "skipped",
                    f"Line {line_number}: imageUrl is not a confirmed http(s) URL",
                ],
            )
            continue

        try:
            target_path = download_one(parts, output_dir)
            append_log(
                log_file,
                [
                    vehicle_id,
                    brand,
                    model,
                    source_page,
                    image_url,
                    license_note,
                    str(target_path).replace("\\", "/"),
                    "downloaded",
                    "",
                ],
            )
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as error:
            append_log(
                log_file,
                [
                    vehicle_id,
                    brand,
                    model,
                    source_page,
                    image_url,
                    license_note,
                    "",
                    "error",
                    str(error),
                ],
            )
        except Exception as error:  # noqa: BLE001
            append_log(
                log_file,
                [
                    vehicle_id,
                    brand,
                    model,
                    source_page,
                    image_url,
                    license_note,
                    "",
                    "error",
                    f"Unexpected error: {error}",
                ],
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
