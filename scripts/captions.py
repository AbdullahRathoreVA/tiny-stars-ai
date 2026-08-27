"""Caption and description tracks for the centre's clips.

Two modes, because they are two different accessibility jobs and only one of
them can be done without hearing the audio:

  python scripts/captions.py
      Writes a `descriptions` track per clip from the alt text in
      src/data/media.ts. That text describes what is on screen, which is what a
      description track is for. Honest, and available today.

  GROQ_API_KEY=... python scripts/captions.py --transcribe
      Sends each clip's audio to Groq's Whisper endpoint and writes a real
      `captions` track with timings. This is the one that serves a deaf parent,
      and it needs a key because it needs a model that can hear.

Why not guess: every clip here has an audio track (measured, mean -46 to -10 dB),
and there is no way to tell from the video frames whether anyone is speaking.
A caption file that claims "[children playing]" over someone explaining the
pick-up policy is worse than no caption file, because a player will present it
as though it were the truth.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIA_TS = ROOT / "src" / "data" / "media.ts"
VIDEO_DIR = ROOT / "public" / "assets" / "media" / "video"
OUT_DIR = ROOT / "public" / "assets" / "media" / "tracks"

GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
WHISPER_MODEL = os.environ.get("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")


def read_media() -> dict[str, dict]:
    """Pull id / kind / alt / dur out of media.ts. Single source of truth."""
    src = MEDIA_TS.read_text(encoding="utf-8")
    items: dict[str, dict] = {}
    for block in re.finditer(r"\{\s*\n\s*id: '([^']+)',(.*?)\n  \},", src, re.S):
        ident, body = block.group(1), block.group(2)
        kind = re.search(r"kind: '(\w+)'", body)
        alt = re.search(r"alt:\s*\n?\s*'((?:[^'\\]|\\.)*)'", body)
        dur = re.search(r"dur: ([\d.]+)", body)
        if not kind:
            continue
        items[ident] = {
            "kind": kind.group(1),
            "alt": (alt.group(1).replace("\\'", "'") if alt else ""),
            "dur": float(dur.group(1)) if dur else None,
        }
    return items


def ts(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def write_descriptions(items: dict[str, dict]) -> int:
    """One cue spanning the clip: what a viewer who cannot see it would miss."""
    made = 0
    for ident, meta in items.items():
        if meta["kind"] != "video" or not meta["alt"]:
            continue
        dur = meta["dur"] or 10
        # Wrap long alt text so a player does not render one unreadable line.
        words, lines, line = meta["alt"].split(), [], ""
        for word in words:
            if len(line) + len(word) + 1 > 42:
                lines.append(line)
                line = word
            else:
                line = f"{line} {word}".strip()
        lines.append(line)
        body = "\n".join(lines[:4])
        vtt = f"WEBVTT\nKind: descriptions\nLanguage: en\n\n1\n{ts(0)} --> {ts(dur)}\n{body}\n"
        (OUT_DIR / f"{ident}.desc.vtt").write_text(vtt, encoding="utf-8")
        made += 1
    return made


def extract_audio(video: Path, dest: Path) -> bool:
    # 16 kHz mono is what Whisper wants and keeps the upload small.
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(video),
         "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", str(dest)],
        capture_output=True,
    )
    return r.returncode == 0 and dest.exists()


def transcribe(audio: Path, key: str) -> dict | None:
    """Groq's Whisper endpoint, verbose_json so we get segment timings."""
    boundary = "----tinystars"
    parts: list[bytes] = []

    def field(name: str, value: str) -> None:
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
        )

    field("model", WHISPER_MODEL)
    field("response_format", "verbose_json")
    field("language", "en")
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
        f'filename="{audio.name}"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()
    )
    parts.append(audio.read_bytes())
    parts.append(f"\r\n--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        GROQ_URL,
        data=b"".join(parts),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.read()[:160].decode('utf-8', 'replace')}")
    except Exception as e:  # noqa: BLE001 - report and carry on to the next clip
        print(f"    {type(e).__name__}: {e}")
    return None


def write_captions(ident: str, data: dict) -> bool:
    segments = data.get("segments") or []
    text = (data.get("text") or "").strip()

    if not segments and not text:
        # Whisper heard nothing usable. Say so in the file rather than inventing
        # a cue: a player showing "[silence]" is honest, an empty file is not.
        vtt = "WEBVTT\nKind: captions\nLanguage: en\n\nNOTE No speech detected in this clip.\n"
        (OUT_DIR / f"{ident}.vtt").write_text(vtt, encoding="utf-8")
        return True

    lines = ["WEBVTT", "Kind: captions", "Language: en", ""]
    for i, seg in enumerate(segments, 1):
        body = (seg.get("text") or "").strip()
        if not body:
            continue
        lines += [str(i), f"{ts(seg['start'])} --> {ts(seg['end'])}", body, ""]
    (OUT_DIR / f"{ident}.vtt").write_text("\n".join(lines), encoding="utf-8")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcribe", action="store_true",
                    help="call Groq Whisper and write real caption tracks")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    items = read_media()
    videos = {k: v for k, v in items.items() if v["kind"] == "video"}
    if not videos:
        print("no video entries found in src/data/media.ts")
        return 1

    made = write_descriptions(items)
    print(f"descriptions: {made} track(s) -> {OUT_DIR.relative_to(ROOT)}")

    if not args.transcribe:
        print("\ncaptions: skipped (pass --transcribe with GROQ_API_KEY set)")
        return 0

    key = os.environ.get("GROQ_API_KEY")
    if not key:
        print("\nGROQ_API_KEY is not set. Set it in the environment; do not paste it into a file.")
        return 1

    tmp = OUT_DIR / "_audio.mp3"
    ok = fail = 0
    for ident in sorted(videos):
        video = VIDEO_DIR / f"{ident}.mp4"
        if not video.exists():
            continue
        print(f"  {ident} …", flush=True)
        if not extract_audio(video, tmp):
            print("    could not extract audio")
            fail += 1
            continue
        data = transcribe(tmp, key)
        if data and write_captions(ident, data):
            ok += 1
        else:
            fail += 1
    tmp.unlink(missing_ok=True)
    print(f"\ncaptions: {ok} written, {fail} failed")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
