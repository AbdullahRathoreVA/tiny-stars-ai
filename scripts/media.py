"""Turn the centre's phone photos and clips into web assets.

Run:  python scripts/media.py

Reads every image and video in .media-inbox/, writes derivatives into
public/assets/media/ and prints a manifest skeleton for src/data/media.ts.

Three things this does that matter:

1. Strips metadata. Phone photos carry GPS coordinates and device serials in
   EXIF. These are pictures of children at a daycare; the location of that
   daycare should not ride along in the file.
2. Caps dimensions and bitrate. The originals are up to 11 MB for a single
   clip, which is a phone-data bill for a parent on the school run.
3. Emits a poster frame per video, so a video slot paints something instantly
   instead of a black box while it buffers.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / ".media-inbox"
OUT = ROOT / "public" / "assets" / "media"
PHOTO_DIR = OUT / "photos"
VIDEO_DIR = OUT / "video"
POSTER_DIR = OUT / "posters"

# Two widths cover the layout: full-bleed on a large screen, and a card on a
# phone. Anything more is bytes nobody downloads.
PHOTO_WIDTHS = [1400, 700]
PHOTO_QUALITY = 70
VIDEO_MAX_H = 720
VIDEO_CRF = 28  # visually clean for phone footage, roughly a third of the size


def sh(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True)


def probe(path: Path) -> dict:
    out = sh(["ffprobe", "-v", "error", "-print_format", "json",
              "-show_format", "-show_streams", str(path)])
    try:
        data = json.loads(out.stdout)
    except ValueError:
        return {}
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    fmt = data.get("format", {})
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    return {
        "w": v.get("width"), "h": v.get("height"),
        "dur": float(fmt.get("duration", 0) or 0),
        "rotation": rot,
    }


def do_photo(src: Path, slug: str) -> dict:
    # ImageOps.exif_transpose honours the orientation tag before we drop it,
    # so portrait shots stay portrait once the metadata is gone.
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w0, h0 = img.size
    made = []
    # Cap the long edge, not the width. Capping width gives a portrait phone
    # photo a 1400x1867 rendition — more pixels than the landscape one it sits
    # next to, and the heaviest file in the set.
    long0 = max(w0, h0)
    for target in PHOTO_WIDTHS:
        if target > long0 and target != PHOTO_WIDTHS[0]:
            continue
        scale = min(1.0, target / long0)
        size = (round(w0 * scale), round(h0 * scale))
        resized = img.resize(size, Image.LANCZOS)
        name = f"{slug}-{target}.webp"
        # A fresh Image is saved with no exif argument, so nothing carries over.
        resized.save(PHOTO_DIR / name, "WEBP", quality=PHOTO_QUALITY, method=6)
        made.append({"file": f"photos/{name}", "w": size[0], "h": size[1],
                     "kb": round((PHOTO_DIR / name).stat().st_size / 1024)})
    return {"slug": slug, "kind": "photo", "src": src.name,
            "natural": [w0, h0], "renditions": made}


def letterbox_crop(src: Path, dur: float) -> str | None:
    """The crop filter that removes black bars, or None if there are none.

    The centre exports some clips for social, which pads a 3:4 picture into a
    9:16 canvas. Encoding that as-is bakes the bars into the file and into the
    poster frame, so the card renders a black-topped rectangle. cropdetect is
    sampled a quarter of the way in, because clip openings are often a fade.
    """
    at = max(0.0, dur * 0.25)
    r = sh(["ffmpeg", "-v", "info", "-nostats", "-ss", f"{at:.2f}", "-i", str(src),
            "-vf", "cropdetect=limit=24:round=2", "-frames:v", "40", "-f", "null", "-"])
    crops = [ln.split("crop=")[-1].strip() for ln in r.stderr.splitlines() if "crop=" in ln]
    if not crops:
        return None
    w, h, x, y = (int(v) for v in crops[-1].split(":"))
    if w <= 0 or h <= 0:
        return None
    full_w, full_h = probe(src)["w"], probe(src)["h"]
    # Ignore a couple of stray rows; only act on a real bar.
    if full_h - h < 8 and full_w - w < 8:
        return None
    return f"crop={w}:{h}:{x}:{y}"


def do_video(src: Path, slug: str) -> dict:
    info = probe(src)
    crop = letterbox_crop(src, info.get("dur") or 1)
    h = (int(crop.split(":")[1]) if crop else info.get("h")) or VIDEO_MAX_H
    vf = "scale=-2:'min(%d,ih)'" % VIDEO_MAX_H if h > VIDEO_MAX_H else "scale=-2:ih"
    if crop:
        vf = f"{crop},{vf}"

    mp4 = VIDEO_DIR / f"{slug}.mp4"
    r = sh([
        "ffmpeg", "-v", "error", "-y", "-i", str(src),
        "-vf", vf,
        "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p",
        "-crf", str(VIDEO_CRF), "-preset", "slow",
        # faststart puts the index at the front so playback can begin before
        # the whole file has arrived.
        "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "96k", "-ac", "2",
        str(mp4),
    ])
    if r.returncode != 0 or not mp4.exists():
        return {"slug": slug, "kind": "video", "src": src.name, "error": r.stderr[:200]}

    poster = POSTER_DIR / f"{slug}.webp"
    at = max(0.1, (info.get("dur") or 1) * 0.25)
    tmp = POSTER_DIR / f"{slug}-tmp.png"
    # Grabbed from the encoded file, not the original, so the poster is framed
    # exactly like the video — any letterbox crop is already applied.
    sh(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.2f}", "-i", str(mp4),
        "-frames:v", "1", "-vf", "scale=-2:720", str(tmp)])
    if tmp.exists():
        Image.open(tmp).convert("RGB").save(poster, "WEBP", quality=78, method=6)
        tmp.unlink()

    out_info = probe(mp4)
    return {
        "slug": slug, "kind": "video", "src": src.name,
        "natural": [out_info.get("w"), out_info.get("h")],
        "dur": round(out_info.get("dur") or 0, 1),
        "mb": round(mp4.stat().st_size / 1e6, 2),
        "srcMb": round(src.stat().st_size / 1e6, 2),
        "file": f"video/{slug}.mp4",
        "poster": f"posters/{slug}.webp" if poster.exists() else None,
    }


def main() -> int:
    if not INBOX.exists():
        print("no .media-inbox/ — nothing to do")
        return 1
    for d in (PHOTO_DIR, VIDEO_DIR, POSTER_DIR):
        d.mkdir(parents=True, exist_ok=True)

    files = sorted(
        p for p in INBOX.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".mp4", ".mov"}
        and not p.name.startswith("_")
    )
    if not files:
        print("no media found in .media-inbox/")
        return 1

    manifest_path = OUT / "_manifest.json"
    published: dict[str, dict] = {}
    if manifest_path.exists():
        for r in json.loads(manifest_path.read_text(encoding="utf-8")):
            published[r["slug"]] = r

    # Slugs are pinned to the original filename, via the manifest the last run
    # wrote. They used to be the file's position in the sorted listing, which
    # was fine until a new clip sorted above an existing one: adding a file
    # named "rooms-walkthrough.mp4" renumbered all 32 published assets, and
    # ts-05 in media.ts silently became a different photograph. A new file now
    # takes the next free number and nothing already published ever moves.
    by_src = {r["src"]: slug for slug, r in published.items() if r.get("src")}
    next_n = max((int(s.split("-")[1]) for s in published), default=0) + 1
    slugs: dict[Path, str] = {}
    for path in files:
        if path.name in by_src:
            slugs[path] = by_src[path.name]
        else:
            slugs[path] = f"ts-{next_n:02d}"
            next_n += 1

    # `video` / `photo` filter by kind; anything else is a filename, so a newly
    # dropped clip can be encoded on its own instead of re-encoding the set.
    args = set(sys.argv[1:])
    kinds = args & {"video", "photo"}
    names = args - kinds

    report = []
    for i, path in enumerate(files, 1):
        slug = slugs[path]
        kind = "video" if path.suffix.lower() in {".mp4", ".mov"} else "photo"
        if (kinds and kind not in kinds) or (names and path.name not in names):
            report.append({"slug": slug, "kind": kind, "src": path.name, "skipped": True})
            continue
        print(f"[{i:02d}/{len(files)}] {slug} {kind:5} {path.name}", flush=True)
        report.append(do_video(path, slug) if kind == "video" else do_photo(path, slug))

    # A filtered run must not drop the entries it skipped, so merge by slug over
    # whatever the last full run wrote.
    merged: dict[str, dict] = dict(published)
    for r in report:
        if not r.get("skipped"):
            merged[r["slug"]] = r
    report = [merged[k] for k in sorted(merged)]
    manifest_path.write_text(json.dumps(report, indent=1), encoding="utf-8")

    photos = [r for r in report if r["kind"] == "photo"]
    videos = [r for r in report if r["kind"] == "video" and "error" in r is False or r.get("file")]
    total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    src_total = sum(p.stat().st_size for p in files)
    print(f"\n{len(photos)} photos, {len(videos)} videos")
    print(f"source {src_total/1e6:.1f} MB  ->  output {total/1e6:.1f} MB")
    errs = [r for r in report if r.get("error")]
    for e in errs:
        print("  FAILED", e["src"], e["error"][:120])
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
