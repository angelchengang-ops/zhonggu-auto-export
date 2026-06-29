#!/usr/bin/env python3
"""
Manual license plate box labeling tool.

Reads images from:
  media-inbox/unsorted
  media-processed/review-needed

Writes relative-coordinate boxes to:
  plate_boxes.json
"""

from __future__ import annotations

import json
from pathlib import Path
import tkinter as tk
from tkinter import messagebox

from PIL import Image, ImageOps, ImageTk


ROOT = Path(__file__).resolve().parent
INPUT_DIRS = [
    ROOT / "media-inbox" / "unsorted",
    ROOT / "media-processed" / "review-needed",
]
BOX_PATH = ROOT / "plate_boxes.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def rel_key(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def scan_images() -> list[Path]:
    images: list[Path] = []
    seen: set[str] = set()
    for directory in INPUT_DIRS:
        if not directory.exists():
            continue
        for path in sorted(directory.rglob("*"), key=lambda p: rel_key(p).lower()):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                key = rel_key(path)
                if key not in seen:
                    seen.add(key)
                    images.append(path)
    return images


def load_boxes() -> dict:
    if not BOX_PATH.exists():
        return {"version": 1, "images": {}}
    with BOX_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if "images" not in data:
        data = {"version": 1, "images": data}
    data.setdefault("version", 1)
    data.setdefault("images", {})
    return data


class PlateLabelTool:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Zhonggu plate label tool")
        self.images = scan_images()
        self.data = load_boxes()
        self.index = 0

        self.original: Image.Image | None = None
        self.display_image: ImageTk.PhotoImage | None = None
        self.scale = 1.0
        self.offset_x = 0
        self.offset_y = 0
        self.drag_start: tuple[int, int] | None = None
        self.current_rect: int | None = None
        self.current_box_px: tuple[int, int, int, int] | None = None

        self.status_var = tk.StringVar()
        self.info_var = tk.StringVar()

        self.canvas = tk.Canvas(root, bg="#202020", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        toolbar = tk.Frame(root)
        toolbar.pack(fill=tk.X)
        for text, command in [
            ("上一张", self.prev_image),
            ("保存框选", self.save_box),
            ("重新框选", self.clear_box),
            ("跳过", self.skip_image),
            ("下一张", self.next_image),
        ]:
            tk.Button(toolbar, text=text, command=command).pack(side=tk.LEFT, padx=4, pady=4)
        tk.Label(toolbar, textvariable=self.status_var, anchor="w").pack(side=tk.LEFT, fill=tk.X, expand=True)

        tk.Label(root, textvariable=self.info_var, anchor="w").pack(fill=tk.X)

        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.root.bind("<Left>", lambda _event: self.prev_image())
        self.root.bind("<Right>", lambda _event: self.next_image())
        self.root.bind("<Return>", lambda _event: self.save_box())
        self.root.bind("<BackSpace>", lambda _event: self.clear_box())
        self.root.bind("<Escape>", lambda _event: self.skip_image())
        self.root.bind("<Configure>", self.on_resize)

        if not self.images:
            messagebox.showinfo("No images", "没有找到可标注图片。")
        else:
            self.load_current()

    def save_data(self) -> None:
        with BOX_PATH.open("w", encoding="utf-8") as handle:
            json.dump(self.data, handle, ensure_ascii=False, indent=2)

    def load_current(self) -> None:
        path = self.images[self.index]
        with Image.open(path) as opened:
            self.original = ImageOps.exif_transpose(opened).convert("RGB")

        entry = self.data["images"].get(rel_key(path), {})
        box = entry.get("box")
        if box:
            width, height = self.original.size
            self.current_box_px = (
                int(box["x"] * width),
                int(box["y"] * height),
                int((box["x"] + box["width"]) * width),
                int((box["y"] + box["height"]) * height),
            )
        else:
            self.current_box_px = None
        self.redraw()

    def redraw(self) -> None:
        self.canvas.delete("all")
        if self.original is None:
            return

        canvas_w = max(1, self.canvas.winfo_width())
        canvas_h = max(1, self.canvas.winfo_height())
        img_w, img_h = self.original.size
        self.scale = min(canvas_w / img_w, canvas_h / img_h, 1.0)
        display_w = max(1, int(img_w * self.scale))
        display_h = max(1, int(img_h * self.scale))
        self.offset_x = (canvas_w - display_w) // 2
        self.offset_y = (canvas_h - display_h) // 2

        display = self.original.resize((display_w, display_h), Image.Resampling.LANCZOS)
        self.display_image = ImageTk.PhotoImage(display)
        self.canvas.create_image(self.offset_x, self.offset_y, image=self.display_image, anchor="nw")

        if self.current_box_px:
            self.draw_box(*self.current_box_px)

        path = self.images[self.index]
        has_box = "有框选" if self.data["images"].get(rel_key(path), {}).get("box") else "未框选"
        self.status_var.set(f"{self.index + 1}/{len(self.images)}  {rel_key(path)}  [{has_box}]")
        self.info_var.set("拖拽鼠标框选车牌。Enter 保存，Backspace 清除，Esc 跳过，左右方向键切换。")

    def image_to_canvas(self, x: int, y: int) -> tuple[int, int]:
        return int(x * self.scale + self.offset_x), int(y * self.scale + self.offset_y)

    def canvas_to_image(self, x: int, y: int) -> tuple[int, int]:
        if self.original is None:
            return 0, 0
        img_w, img_h = self.original.size
        ix = int((x - self.offset_x) / self.scale)
        iy = int((y - self.offset_y) / self.scale)
        return max(0, min(img_w, ix)), max(0, min(img_h, iy))

    def draw_box(self, x1: int, y1: int, x2: int, y2: int) -> None:
        cx1, cy1 = self.image_to_canvas(x1, y1)
        cx2, cy2 = self.image_to_canvas(x2, y2)
        self.current_rect = self.canvas.create_rectangle(cx1, cy1, cx2, cy2, outline="#ffcc00", width=3)

    def on_press(self, event: tk.Event) -> None:
        if self.original is None:
            return
        self.drag_start = self.canvas_to_image(int(event.x), int(event.y))
        if self.current_rect:
            self.canvas.delete(self.current_rect)
            self.current_rect = None

    def on_drag(self, event: tk.Event) -> None:
        if self.original is None or self.drag_start is None:
            return
        x1, y1 = self.drag_start
        x2, y2 = self.canvas_to_image(int(event.x), int(event.y))
        self.current_box_px = (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))
        if self.current_rect:
            self.canvas.delete(self.current_rect)
        self.draw_box(*self.current_box_px)

    def on_release(self, event: tk.Event) -> None:
        if self.original is None or self.drag_start is None:
            return
        x1, y1 = self.drag_start
        x2, y2 = self.canvas_to_image(int(event.x), int(event.y))
        if abs(x2 - x1) < 4 or abs(y2 - y1) < 4:
            self.current_box_px = None
        else:
            self.current_box_px = (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))
        self.drag_start = None
        self.redraw()

    def save_box(self) -> None:
        if self.original is None or self.current_box_px is None:
            return
        width, height = self.original.size
        x1, y1, x2, y2 = self.current_box_px
        key = rel_key(self.images[self.index])
        self.data["images"][key] = {
            "box": {
                "x": round(x1 / width, 6),
                "y": round(y1 / height, 6),
                "width": round((x2 - x1) / width, 6),
                "height": round((y2 - y1) / height, 6),
            },
            "skipped": False,
        }
        self.save_data()
        self.next_image()

    def clear_box(self) -> None:
        key = rel_key(self.images[self.index])
        self.data["images"].pop(key, None)
        self.current_box_px = None
        self.save_data()
        self.redraw()

    def skip_image(self) -> None:
        key = rel_key(self.images[self.index])
        self.data["images"][key] = {"box": None, "skipped": True}
        self.save_data()
        self.next_image()

    def prev_image(self) -> None:
        if not self.images:
            return
        self.index = max(0, self.index - 1)
        self.load_current()

    def next_image(self) -> None:
        if not self.images:
            return
        self.index = min(len(self.images) - 1, self.index + 1)
        self.load_current()

    def on_resize(self, _event: tk.Event) -> None:
        if self.original is not None:
            self.root.after_idle(self.redraw)


def main() -> int:
    root = tk.Tk()
    root.geometry("1200x800")
    PlateLabelTool(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
