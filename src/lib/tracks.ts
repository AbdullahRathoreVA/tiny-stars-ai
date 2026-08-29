/**
 * Which WebVTT tracks a clip can actually offer.
 *
 * Build-time only: this reads from public/ with node:fs, so it belongs in
 * Astro frontmatter, never in a client island.
 *
 * The two track kinds are tested differently, and the difference matters.
 * `scripts/captions.py` writes a description track for every clip and a
 * caption file for every clip — but most caption files hold only a NOTE saying
 * why there is no transcript, because the clip is silent or because the model's
 * output for ambient audio was not trustworthy enough to publish. So existence
 * proves nothing for captions: a file with no cues would put a "captions"
 * control on the player that switches nothing on. A cue timing is the only
 * evidence there is something to show.
 *
 * This lives here because MediaStrip and the gallery both need it, and a rule
 * this easy to get subtly wrong should not be written down twice.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TRACK_DIR = join(process.cwd(), 'public', 'assets', 'media', 'tracks');
const TRACK_URL = '/assets/media/tracks';

export interface MediaTracks {
  descriptions: string;
  captions: string;
}

const exists = (file: string) => existsSync(join(TRACK_DIR, file));

const hasCues = (file: string) => {
  const path = join(TRACK_DIR, file);
  return existsSync(path) && readFileSync(path, 'utf8').includes('-->');
};

export function tracksFor(id: string): MediaTracks {
  return {
    descriptions: exists(`${id}.desc.vtt`) ? `${TRACK_URL}/${id}.desc.vtt` : '',
    captions: hasCues(`${id}.vtt`) ? `${TRACK_URL}/${id}.vtt` : '',
  };
}
