"""Extract the Tiny Stars palette from the supplied logo, and produce web assets.

The logo arrived as a small JPEG on a white background. Two jobs:

1. Read the actual colours out of it, rather than guessing hex values by eye,
   so the site's tokens and the printed logo genuinely match.
2. Emit a transparent PNG at the sizes the site needs. JPEG has no alpha, so
   the white box around the mark would show as a card on every coloured
   surface.

Run: python scripts/brand.py
"""
from __future__ import annotations

import colorsys
import json
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".media-inbox" / "brand"
OUT = ROOT / "public" / "assets" / "brand"

# Anything this close to white is background, not ink.
WHITE_CUT = 238
SIZES = [512, 256, 128, 64]


def load() -> Image.Image:
    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    if not files:
        raise SystemExit("no logo found in .media-inbox/brand/")
    return Image.open(files[0]).convert("RGB")


def palette(img: Image.Image, k: int = 12) -> list[dict]:
    """Dominant non-white colours, grouped by hue so near-duplicates merge."""
    small = img.resize((160, int(160 * img.height / img.width)), Image.LANCZOS)
    buckets: Counter = Counter()
    for r, g, b in small.getdata():
        if r > WHITE_CUT and g > WHITE_CUT and b > WHITE_CUT:
            continue
        # Quantise so antialiasing does not shatter one colour into fifty.
        buckets[(r // 16 * 16, g // 16 * 16, b // 16 * 16)] += 1

    total = sum(buckets.values()) or 1
    out = []
    for (r, g, b), n in buckets.most_common(k * 4):
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        # Drop near-greys: they are outline blur, not brand colour.
        if s < 0.18 and not (l < 0.25):
            continue
        out.append({
            "hex": f"#{r:02x}{g:02x}{b:02x}",
            "rgb": [r, g, b],
            "share": round(100 * n / total, 1),
            "hue": round(h * 360),
            "sat": round(s, 2),
            "light": round(l, 2),
        })
        if len(out) >= k:
            break
    return out


def transparent(img: Image.Image) -> Image.Image:
    """Knock the white card out, keeping antialiased edges soft."""
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            m = min(r, g, b)
            if m > WHITE_CUT:
                px[x, y] = (r, g, b, 0)
            elif m > 200:
                # Feather the rim so the mark does not get a hard white halo.
                px[x, y] = (r, g, b, int(255 * (WHITE_CUT - m) / (WHITE_CUT - 200)))
    return rgba


def trim(img: Image.Image) -> Image.Image:
    box = img.getchannel("A").getbbox()
    return img.crop(box) if box else img


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    img = load()
    print(f"source: {img.width}x{img.height}")

    cols = palette(img)
    print("\ndominant brand colours:")
    for c in cols:
        print(f"  {c['hex']}  {c['share']:>4}%  hue {c['hue']:>3}  sat {c['sat']}  light {c['light']}")

    logo = trim(transparent(img))
    print(f"\ntrimmed to {logo.width}x{logo.height}")
    for s in SIZES:
        if s > logo.width * 2:
            continue
        w = s
        h = round(logo.height * s / logo.width)
        logo.resize((w, h), Image.LANCZOS).save(OUT / f"logo-{s}.png")
        print(f"  wrote logo-{s}.png ({w}x{h})")

    (OUT / "_palette.json").write_text(json.dumps(cols, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
