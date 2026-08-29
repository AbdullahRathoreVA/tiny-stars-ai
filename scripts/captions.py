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

Why not guess: the phone clips all carry real audio (measured, mean -46 to
-10 dB), and there is no way to tell from the video frames whether anyone is
speaking. A caption file that claims "[children playing]" over someone
explaining the pick-up policy is worse than no caption file, because a player
will present it as though it were the truth.

The drone and walkthrough clips are the exception: they have an AAC stream that
is digitally silent (-91 dB). Those are detected and skipped rather than
uploaded, since the transcriber can only come back with what ffmpeg already
knows.
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


CUE_COLS = 42   # characters per line, so a player does not render one long line
CUE_LINES = 4   # lines per cue, so a cue does not cover the picture


def write_descriptions(items: dict[str, dict]) -> int:
    """Cues spanning the clip: what a viewer who cannot see it would miss.

    A description longer than one cue is split across several, spread over the
    clip, rather than truncated. Cutting it mid-clause used to lose the end of
    the sentence — "each with its own play equipment and shade" — which reads
    to a screen reader as though the description simply stopped.
    """
    made = 0
    for ident, meta in items.items():
        if meta["kind"] != "video" or not meta["alt"]:
            continue
        dur = meta["dur"] or 10

        words, lines, line = meta["alt"].split(), [], ""
        for word in words:
            if len(line) + len(word) + 1 > CUE_COLS:
                lines.append(line)
                line = word
            else:
                line = f"{line} {word}".strip()
        lines.append(line)

        # Balanced, not greedy: five lines over two cues is 3 + 2, never 4 + 1,
        # because a cue holding the single orphan word "canopy." for four
        # seconds is worse than the truncation this replaced.
        n_cues = -(-len(lines) // CUE_LINES)
        per = -(-len(lines) // n_cues)
        cues = [lines[i:i + per] for i in range(0, len(lines), per)]
        span = dur / len(cues)
        out = ["WEBVTT", "Kind: descriptions", "Language: en", ""]
        for n, cue in enumerate(cues):
            start, end = n * span, min(dur, (n + 1) * span)
            out += [str(n + 1), f"{ts(start)} --> {ts(end)}", "\n".join(cue), ""]
        (OUT_DIR / f"{ident}.desc.vtt").write_text("\n".join(out), encoding="utf-8")
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
            # Groq sits behind Cloudflare, which answers the default
            # "Python-urllib/3.x" agent with 403 error 1010 — a banned browser
            # signature, not an auth failure. It looks exactly like a bad key
            # from here, which is why this path had never once succeeded.
            "User-Agent": "tiny-stars-captions/1.0",
            "Accept": "application/json",
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


# Below this there is nothing for a transcriber to hear. Digital silence reads
# as -91 dB, and even a very quiet room records well above -60.
SILENCE_DB = -60.0


def mean_volume_db(video: Path) -> float | None:
    """Mean audio level in dB, or None if there is no audio stream at all."""
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(video),
         "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True)
    m = re.search(r"mean_volume:\s*(-?\d+(?:\.\d+)?) dB", r.stderr)
    return float(m.group(1)) if m else None


SILENT_NOTE = "No speech detected in this clip."
UNRELIABLE_NOTE = (
    "Automatic transcription of this clip was not reliable enough to publish. "
    "The audio is ambient rather than spoken to camera."
)


def write_no_speech(ident: str, note: str = SILENT_NOTE) -> bool:
    """Say so in the file rather than inventing a cue: a player showing nothing
    is honest, an empty caption file is not.

    The two reasons are kept apart on purpose. "No speech detected" is a
    measured fact about a silent clip; claiming it for a clip that may well have
    someone talking in the background would be its own small untruth.
    """
    vtt = f"WEBVTT\nKind: captions\nLanguage: en\n\nNOTE {note}\n"
    (OUT_DIR / f"{ident}.vtt").write_text(vtt, encoding="utf-8")
    return True


# Whisper never returns "I heard nothing". Played ambient room noise it invents
# fluent, confident-looking speech. Measured over this set:
#
#   clip    avg_logprob  words  transcript
#   ts-14        -0.19      25  "Every child is a little star, full of …"
#   ts-15        -0.19      28  "Every child is a little star, full of …"
#   ts-12        -0.70       2  "Thank you."
#   ts-13        -0.64       3  "Lapsy, Lapsy, Lapsy."
#   ts-25        -0.84      12  "The 40s, the 40s, the 40s, the 40s. …"
#   ts-26        -1.10       4  "I have my own."
#
# Two things that pass judgement here rather than taste. `no_speech_prob` is
# 0.00 on every clip including the inventions, so it carries no information and
# is not used. And ts-26 transcribed as "I got my phone" repeated four times on
# one run and "I have my own." on the next — same audio, same model. Output that
# unstable is not a record of anything, and it was going to be published as a
# verbatim account of what a parent's child was hearing.
#
# What survives is sustained narration: the brand reels are scripted voiceover,
# loud and continuous, and they score an order of magnitude better than a phone
# held near a playground. Both thresholds sit in the gap, and a clip has to
# clear both.
AVG_LOGPROB_MIN = -0.40  # good -0.19; best invention -0.46
MIN_WORDS = 15           # good 25+; longest invention 12
COMPRESSION_MAX = 2.4    # high ratio means it fell into a repetition loop
REPEAT_MAX = 2           # the same line three times is a loop, not a transcript


def usable_segments(segments: list[dict]) -> tuple[list[dict], list[str]]:
    """Segments worth publishing, and why the rest were dropped."""
    kept, why = [], []
    for seg in segments:
        body = (seg.get("text") or "").strip()
        if not body:
            continue
        lp = seg.get("avg_logprob")
        cr = seg.get("compression_ratio")
        if lp is not None and lp < AVG_LOGPROB_MIN:
            why.append(f"logprob={lp:.2f}")
        elif cr is not None and cr > COMPRESSION_MAX:
            why.append(f"repetition={cr:.2f}")
        else:
            kept.append(seg)

    # A line repeated past REPEAT_MAX is a decoder loop even when each
    # individual segment scored well.
    counts: dict[str, int] = {}
    for seg in kept:
        k = (seg.get("text") or "").strip().lower()
        counts[k] = counts.get(k, 0) + 1
    looped = {k for k, n in counts.items() if n > REPEAT_MAX}
    if looped:
        why.append(f"looped x{max(counts.values())}")
        kept = [s for s in kept if (s.get("text") or "").strip().lower() not in looped]

    # A handful of words over ambient noise is the shape every invention here
    # took. Real narration keeps talking.
    words = sum(len((s.get("text") or "").split()) for s in kept)
    if kept and words < MIN_WORDS:
        why.append(f"only {words} words")
        kept = []
    return kept, why


def write_captions(ident: str, data: dict) -> bool:
    segments = data.get("segments") or []
    kept, why = usable_segments(segments)

    if not kept:
        detail = f" ({'; '.join(dict.fromkeys(why))})" if why else ""
        print(f"    not publishable{detail}")
        return write_no_speech(ident, UNRELIABLE_NOTE)

    if len(kept) < len([s for s in segments if (s.get("text") or "").strip()]):
        print(f"    kept {len(kept)}/{len(segments)} segments ({'; '.join(dict.fromkeys(why))})")

    lines = ["WEBVTT", "Kind: captions", "Language: en", ""]
    for i, seg in enumerate(kept, 1):
        lines += [str(i), f"{ts(seg['start'])} --> {ts(seg['end'])}",
                  (seg.get("text") or "").strip(), ""]
    (OUT_DIR / f"{ident}.vtt").write_text("\n".join(lines), encoding="utf-8")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcribe", action="store_true",
                    help="call Groq Whisper and write real caption tracks")
    ap.add_argument("--force", action="store_true",
                    help="ignore the cached Whisper responses and call the API again")
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

    # Whisper responses are cached, because the free tier rate-limits after
    # roughly fifteen clips and because the thresholds above were picked by
    # looking at real responses — tuning them should not cost another pass over
    # the whole set. Lives in .media-inbox/, which is already gitignored.
    cache = ROOT / ".media-inbox" / "_whisper"
    cache.mkdir(parents=True, exist_ok=True)

    tmp = OUT_DIR / "_audio.mp3"
    ok = fail = silent = cached = 0
    for ident in sorted(videos):
        video = VIDEO_DIR / f"{ident}.mp4"
        if not video.exists():
            continue

        # The drone clips carry an AAC stream that is digitally silent. Sending
        # one costs a request to be told what ffmpeg already knows, and the
        # answer written either way is the same.
        level = mean_volume_db(video)
        if level is None or level < SILENCE_DB:
            heard = "no audio stream" if level is None else f"{level:.0f} dB"
            print(f"  {ident} … silent ({heard}), not sent")
            write_no_speech(ident)
            silent += 1
            continue

        blob = cache / f"{ident}.json"
        if blob.exists() and not args.force:
            print(f"  {ident} … cached")
            write_captions(ident, json.loads(blob.read_text(encoding="utf-8")))
            cached += 1
            continue

        print(f"  {ident} …", flush=True)
        if not extract_audio(video, tmp):
            print("    could not extract audio")
            fail += 1
            continue
        data = transcribe(tmp, key)
        if data:
            blob.write_text(json.dumps(data), encoding="utf-8")
            write_captions(ident, data)
            ok += 1
        else:
            fail += 1
    tmp.unlink(missing_ok=True)
    print(f"\ncaptions: {ok} transcribed, {cached} from cache, {silent} silent, {fail} failed")
    if fail:
        print("Rate-limited responses are not cached; re-run to pick up where it stopped.")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
