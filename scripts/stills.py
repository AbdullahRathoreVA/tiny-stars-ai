"""Cut the section and program header images out of the centre's own footage.

Run:  python scripts/stills.py            # write the images
      python scripts/stills.py --check    # verify what is on disk matches

Everything in public/assets/images/{sections,programs} used to be stock
photography, carried over when these pages were mirrored from tinystars.ca:
other people's children, on a site whose whole argument is that it shows the
real place. This script replaces all of it from material the centre shot.

Sources live in .media-inbox/ (gitignored — see media.py for why):

  yard-drone-scan.mp4    3840x2160, a 23s drone pass down the fenced play area
  rooms-walkthrough.mp4  1214x1620 picture, letterboxed into a 1214x2160 canvas
  ts-05 / ts-06          two room photographs already published in the media set

Three things here matter:

1. The pick is recorded, not remembered. Every image below names its clip and
   timestamp, so a year from now anyone can re-cut it, or drop in a frame from
   a better shoot, without re-deriving which second of which file it came from.
2. Output is 4:3. Every consumer uses object-fit: cover, and 4:3 is what
   who-we-are.webp already was — so the OG card and the schema image keep the
   crop behaviour they have today.
3. Nothing carries metadata. The frames are written from a fresh buffer with no
   exif argument, because drone footage records GPS and a serial, and the
   location of a daycare should not ride along in the file.

`vbias` places the 4:3 window vertically: 0 = top of frame, 1 = bottom. Room
shots want it low; the ceiling is the least interesting part of a classroom.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / ".media-inbox"
SECTIONS = ROOT / "public/assets/images/sections"
PROGRAMS = ROOT / "public/assets/images/programs"
PHOTOS = ROOT / "public/assets/media/photos"

YARD = INBOX / "yard-drone-scan.mp4"
ROOMS = INBOX / "rooms-walkthrough.mp4"

# The real picture inside the walkthrough's vertical letterbox.
ROOM_BOX = (0, 270, 1214, 1890)

# The yard shots are the heaviest images on the homepage, and this site's whole
# performance story is that it ships 35 KB of JS on first paint. 1500px still
# gives the hero 2x its 720px slot; past that it is bytes nobody can see.
DRONE = (1500, 1125, 76)
ROOM = (1400, 1050, 80)
STILL = (1040, 780, 82)

#  target                                    source  at (s)  vbias  size
JOBS = [
    (SECTIONS / "who-we-are.webp",                 YARD,   6.20, 0.55, DRONE),
    (SECTIONS / "health-and-safety.webp",          YARD,   6.67, 0.55, DRONE),
    (SECTIONS / "cta.webp",                        YARD,   8.27, 0.50, DRONE),
    (SECTIONS / "classrooms-and-learning.webp",    ROOMS, 16.93, 0.74, ROOM),
    (SECTIONS / "learning-and-development.webp",   ROOMS, 27.97, 0.62, ROOM),
    (SECTIONS / "social-and-academic-skills.webp", ROOMS, 43.97, 0.62, ROOM),
    (SECTIONS / "talent-and-trust.webp",           ROOMS,  1.93, 0.28, ROOM),
    (PROGRAMS / "infant.webp",       PHOTOS / "ts-05-1400.webp", None, 0.62, STILL),
    (PROGRAMS / "toddler.webp",                    ROOMS, 33.00, 0.56, ROOM),
    (PROGRAMS / "preschool.webp",                  ROOMS, 19.00, 0.70, ROOM),
    (PROGRAMS / "kindergarden.webp",               ROOMS, 15.97, 0.70, ROOM),
    (PROGRAMS / "out-of-school.webp",              YARD,   9.07, 0.50, DRONE),
    (PROGRAMS / "enrichment.webp",    PHOTOS / "ts-06-1400.webp", None, 0.52, STILL),
]


def frame_at(clip: Path, t: float) -> Image.Image:
    """One frame, decoded to a temp PNG so PIL never sees the container."""
    tmp = clip.parent / f"_still-{clip.stem}-{t}.png"
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(clip),
         "-frames:v", "1", str(tmp)],
        capture_output=True, text=True)
    if not tmp.exists():
        raise SystemExit(f"could not read {clip.name} at {t}s: {r.stderr[:200]}")
    img = Image.open(tmp).convert("RGB")
    img.load()
    tmp.unlink()
    return img


def cut(img: Image.Image, out_w: int, out_h: int, vbias: float) -> Image.Image:
    """Largest out_w:out_h window that fits, placed by vbias, then resampled."""
    w, h = img.size
    ar = out_w / out_h
    if w / h > ar:
        cw, ch = round(h * ar), h
    else:
        cw, ch = w, round(w / ar)
    x, y = (w - cw) // 2, round((h - ch) * vbias)
    return img.crop((x, y, x + cw, y + ch)).resize((out_w, out_h), Image.LANCZOS)


def main() -> int:
    check = "--check" in sys.argv

    missing = {j[1] for j in JOBS if not j[1].exists()}
    if missing and not check:
        print("missing source media in .media-inbox/:")
        for m in sorted(missing):
            print(f"  {m.name}")
        return 1

    total = 0
    for out, src, t, vbias, (ow, oh, q) in JOBS:
        if check:
            if not out.exists():
                print(f"  MISSING  {out.name}")
                return 1
            got = Image.open(out).size
            ok = got == (ow, oh)
            print(f"  {'ok  ' if ok else 'SIZE'}   {out.name:32} {got[0]}x{got[1]}")
            if not ok:
                return 1
            continue

        img = Image.open(src).convert("RGB") if t is None else frame_at(src, t)
        if src == ROOMS:
            img = img.crop(ROOM_BOX)
        # A fresh buffer saved with no exif argument: nothing carries over.
        cut(img, ow, oh, vbias).save(out, "WEBP", quality=q, method=6)
        kb = out.stat().st_size / 1024
        total += kb
        where = src.name if t is None else f"{src.name} @{t}s"
        print(f"  {out.name:32} {ow}x{oh} q{q} {kb:7.1f} KB   <- {where}")

    if not check:
        print(f"  {'':32} {'':13} {total:7.1f} KB total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
