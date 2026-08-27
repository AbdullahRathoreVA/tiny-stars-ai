/**
 * TinyStarsQualityManager
 *
 * Decides how much 3D this particular device should be asked to do, before a
 * single byte of Three.js is downloaded.
 *
 * The bias is deliberately conservative. A parent on a three-year-old Android
 * with one hand free is the person this site exists for; a discrete GPU is a
 * bonus, never an assumption. Every tier below ULTRA is a first-class design,
 * not a degraded one — and MINIMAL is a complete, beautiful experience that
 * happens to contain no WebGL at all.
 */

export type Tier = 'ultra' | 'high' | 'balanced' | 'low' | 'minimal';

export interface QualitySettings {
  tier: Tier;
  /** Device pixel ratio cap. Retina at 3x is almost never worth the fill rate. */
  dpr: number;
  /** Multiplier applied to every scene's particle budget. */
  particles: number;
  /** Real-time shadows at all. */
  shadows: boolean;
  /** Anti-aliasing in the renderer. */
  antialias: boolean;
  /** Additional decorative geometry beyond the essential composition. */
  detail: number;
  /** Whether continuous per-frame animation is allowed, or only on interaction. */
  continuousAnimation: boolean;
  /** Cursor / device parallax on the camera. */
  parallax: boolean;
  /** Max texture edge, for anything that ever loads one. */
  maxTexture: number;
}

const PRESETS: Record<Tier, Omit<QualitySettings, 'tier'>> = {
  ultra:    { dpr: 2,   particles: 1,    shadows: true,  antialias: true,  detail: 1,   continuousAnimation: true,  parallax: true,  maxTexture: 2048 },
  high:     { dpr: 2,   particles: 0.75, shadows: true,  antialias: true,  detail: 0.8, continuousAnimation: true,  parallax: true,  maxTexture: 1024 },
  balanced: { dpr: 1.5, particles: 0.5,  shadows: false, antialias: true,  detail: 0.6, continuousAnimation: true,  parallax: true,  maxTexture: 1024 },
  low:      { dpr: 1,   particles: 0.25, shadows: false, antialias: false, detail: 0.4, continuousAnimation: false, parallax: false, maxTexture: 512 },
  minimal:  { dpr: 1,   particles: 0,    shadows: false, antialias: false, detail: 0,   continuousAnimation: false, parallax: false, maxTexture: 256 },
};

const ORDER: Tier[] = ['minimal', 'low', 'balanced', 'high', 'ultra'];

/** One cached WebGL probe. Creating contexts is not free. */
let webglCache: boolean | null = null;

export function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  if (typeof document === 'undefined') return (webglCache = false);
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    webglCache = !!gl;
    // Release the probe context immediately — browsers cap how many exist.
    if (gl && 'getExtension' in gl) {
      (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function prefersReducedData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (c?.saveData) return true;
  return !!c?.effectiveType && ['slow-2g', '2g', '3g'].includes(c.effectiveType);
}

/**
 * A rough device score. There is no honest way to read GPU class from the web,
 * so this combines the signals that do exist and errs downward.
 */
function detectTier(): Tier {
  if (!hasWebGL()) return 'minimal';

  // An explicit accessibility preference outranks any hardware signal.
  if (prefersReducedMotion()) return 'minimal';
  if (prefersReducedData()) return 'low';

  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;

  let score = 0;
  score += memory >= 8 ? 3 : memory >= 4 ? 2 : memory >= 2 ? 1 : 0;
  score += cores >= 8 ? 3 : cores >= 4 ? 2 : cores >= 2 ? 1 : 0;
  score += width >= 1440 ? 2 : width >= 1024 ? 1 : 0;

  // A touch primary pointer on a small screen is a phone. Phones get less,
  // regardless of how many cores they report — thermal headroom is the real limit.
  if (coarse && width < 820) score -= 2;

  // Very high DPR on a small screen means an enormous number of fragments for
  // a device that is usually also on battery.
  if (dpr >= 3 && width < 820) score -= 1;

  if (score >= 7) return 'ultra';
  if (score >= 5) return 'high';
  if (score >= 3) return 'balanced';
  return 'low';
}

let current: QualitySettings | null = null;
const listeners = new Set<(q: QualitySettings) => void>();

function build(tier: Tier): QualitySettings {
  return { tier, ...PRESETS[tier] };
}

/** Resolves once per page, then cached. */
export function quality(): QualitySettings {
  if (current) return current;

  // A manual override always wins, and persists for the session only.
  let forced: string | null = null;
  try {
    forced = sessionStorage.getItem('ts:quality');
  } catch {
    /* private mode */
  }

  const tier = (forced && ORDER.includes(forced as Tier) ? (forced as Tier) : detectTier());
  current = build(tier);
  return current;
}

export function setQuality(tier: Tier | 'auto'): QualitySettings {
  try {
    if (tier === 'auto') sessionStorage.removeItem('ts:quality');
    else sessionStorage.setItem('ts:quality', tier);
  } catch {
    /* private mode */
  }
  current = build(tier === 'auto' ? detectTier() : tier);
  listeners.forEach((fn) => fn(current!));
  return current;
}

export function onQualityChange(fn: (q: QualitySettings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Drop one tier. Called by the frame monitor when a device cannot keep up. */
export function downgrade(reason = 'performance'): QualitySettings | null {
  const q = quality();
  const i = ORDER.indexOf(q.tier);
  if (i <= 0) return null;
  current = build(ORDER[i - 1]);
  if (import.meta.env.DEV) {
    console.info(`[tiny-stars] quality: ${q.tier} -> ${current.tier} (${reason})`);
  }
  listeners.forEach((fn) => fn(current!));
  return current;
}

/**
 * Watches frame timing and steps the whole site down a tier if a device is
 * struggling. Deliberately slow to react: one bad second during a scroll is
 * normal, ten seconds of 20fps is not.
 */
export class FrameMonitor {
  private samples: number[] = [];
  private last = 0;
  private strikes = 0;
  private stopped = false;

  constructor(
    private readonly onDowngrade: () => void,
    private readonly budgetMs = 34, // ~30fps
  ) {}

  tick(now: number) {
    if (this.stopped) return;
    if (this.last) {
      const delta = now - this.last;
      // Ignore tab-switch and scroll-jank outliers entirely.
      if (delta < 500) this.samples.push(delta);
    }
    this.last = now;

    if (this.samples.length < 90) return;

    const sorted = [...this.samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.samples.length = 0;

    if (median > this.budgetMs) {
      this.strikes++;
      if (this.strikes >= 2) {
        this.stopped = true;
        this.onDowngrade();
      }
    } else {
      this.strikes = 0;
    }
  }

  stop() {
    this.stopped = true;
  }
}

/** Debug label for the dev overlay and the command centre. */
export function describeQuality(q: QualitySettings): string {
  return [
    q.tier.toUpperCase(),
    `dpr ${q.dpr}`,
    q.shadows ? 'shadows' : 'no shadows',
    q.parallax ? 'parallax' : 'static camera',
  ].join(' · ');
}
