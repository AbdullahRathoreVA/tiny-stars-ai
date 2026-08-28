"""Favicon and app-icon set, drawn from the Tiny Stars logo's star.

Run: python scripts/icons.py

The full wordmark is unreadable at 16px, so the mark is the star that replaces
the A in STARS — the one part of the logo that survives being tiny. Gold on the
brand purple, which is 8.9:1 and reads on both a light and a dark tab strip;
the transparent-background version disappeared against dark Chrome.

Drawn rather than cropped: the supplied logo is a 264px JPEG, and a crop of the
star inside it is about 60px of soft pixels.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
BRAND = ROOT / "public" / "assets" / "brand"

PURPLE = (64, 32, 120)      # #402078 — the logo's outline and star
GOLD = (240, 184, 48)       # #f0b830 — the TINY fill
GOLD_HI = (255, 208, 92)    # #ffd05c — highlight, top of the letters

# Supersample then downsample: PIL has no polygon antialiasing.
SS = 8


def star_points(cx: float, cy: float, outer: float, inner: float, n: int = 5):
    pts = []
    for i in range(n * 2):
        r = outer if i % 2 == 0 else inner
        a = i * math.pi / n - math.pi / 2
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def rounded_tile(size: int, radius_ratio: float = 0.22) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * radius_ratio), fill=PURPLE + (255,))
    return img


def draw_star(img: Image.Image, scale: float = 0.34) -> None:
    s = img.size[0]
    d = ImageDraw.Draw(img)
    outer = s * scale
    inner = outer * 0.45
    cx = cy = s / 2
    # A slightly larger star behind, in the highlight tone, reads as the logo's
    # top-lit gradient once it is 32px across.
    d.polygon(star_points(cx, cy - outer * 0.06, outer, inner), fill=GOLD_HI + (255,))
    d.polygon(star_points(cx, cy + outer * 0.04, outer * 0.94, inner * 0.94), fill=GOLD + (255,))


def make(size: int, tile: bool = True, star_scale: float = 0.34) -> Image.Image:
    img = rounded_tile(size) if tile else Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    draw_star(img, star_scale)
    return img.resize((size, size), Image.LANCZOS)


def main() -> int:
    BRAND.mkdir(parents=True, exist_ok=True)

    # Browser tab / PWA / iOS home screen.
    for size, path in [
        (32, OUT / "favicon.png"),
        (180, OUT / "apple-touch-icon.png"),
        (192, BRAND / "icon-192.png"),
        (512, BRAND / "icon-512.png"),
    ]:
        make(size).save(path)
        print(f"  {path.relative_to(ROOT)}  {size}x{size}")

    # Maskable: Android crops to a circle, so the star sits smaller inside the
    # safe zone and the tile is edge to edge.
    m = Image.new("RGBA", (512 * SS, 512 * SS), PURPLE + (255,))
    draw_star(m, 0.26)
    m.resize((512, 512), Image.LANCZOS).save(BRAND / "icon-maskable-512.png")
    print(f"  {(BRAND / 'icon-maskable-512.png').relative_to(ROOT)}  512x512 maskable")

    # ICO for anything still asking for one.
    make(32).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"  {(OUT / 'favicon.ico').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
