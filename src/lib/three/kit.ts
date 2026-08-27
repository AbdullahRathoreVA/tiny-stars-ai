/**
 * The Tiny Stars 3D kit — palette, materials and the small set of shapes every
 * scene draws from.
 *
 * Two rules hold the visual language together:
 *
 *  1. The 3D palette is the 2D palette. No scene invents a colour. If the brand
 *     changes, `tokens.css` and this file change together and nothing drifts.
 *  2. Geometry and materials are created once and shared. A starfield of 800
 *     stars is one geometry and one material, not 800 of each.
 *
 * Everything here is procedural. There are no model files to download, which is
 * why the first 3D frame arrives in a few hundred milliseconds rather than
 * several seconds on a phone.
 */

import type * as THREE_NS from 'three';

type THREE = typeof THREE_NS;

/** Mirrors src/styles/tokens.css. Keep in sync. */
export const PALETTE = {
  cream50: 0xfffdfa,
  cream100: 0xfdf8f2,
  cream200: 0xf7efe4,
  cream300: 0xeee2d2,
  sand: 0xb3a08a,

  ink900: 0x17162b,
  ink800: 0x22203c,
  ink700: 0x33314f,
  ink500: 0x6a6785,

  coral300: 0xff9f80,
  coral500: 0xf4703f,
  coral700: 0xb8451d,

  teal400: 0x4fa896,
  teal600: 0x2d7a6c,

  gold200: 0xffe9b0,
  gold400: 0xf2be4c,

  blush: 0xe0678b,
  marigold: 0xe5992a,
  violet: 0x8163cf,
  sky: 0x3d8fc9,
} as const;

/** Per-program accent, matching the 2D program cards exactly. */
export const PROGRAM_COLOR: Record<string, number> = {
  'twinkle-stars': PALETTE.blush,
  'comet-stars': PALETTE.marigold,
  'nova-stars': PALETTE.teal400,
  'galaxy-stars': PALETTE.violet,
  'cosmic-stars': PALETTE.sky,
};

/* ------------------------------------------------------------------ cache -- */

const geoCache = new Map<string, THREE_NS.BufferGeometry>();
const matCache = new Map<string, THREE_NS.Material>();

/** Everything cached here is owned by the kit and released via `disposeKit`. */
function geo<T extends THREE_NS.BufferGeometry>(key: string, make: () => T): T {
  const hit = geoCache.get(key);
  if (hit) return hit as T;
  const made = make();
  geoCache.set(key, made);
  return made;
}

function mat<T extends THREE_NS.Material>(key: string, make: () => T): T {
  const hit = matCache.get(key);
  if (hit) return hit as T;
  const made = make();
  matCache.set(key, made);
  return made;
}

/**
 * Scenes share cached resources, so a single scene must never dispose them.
 * This is called only when the last stage on a page tears down.
 */
export function disposeKit() {
  geoCache.forEach((g) => g.dispose());
  matCache.forEach((m) => m.dispose());
  geoCache.clear();
  matCache.clear();
}

/* -------------------------------------------------------------- materials -- */

export interface MaterialOptions {
  color: number;
  /** 0 = matte paper, 1 = polished. Kept low; this is a warm brand, not chrome. */
  gloss?: number;
  /** Self-illumination, for stars and highlights only. */
  glow?: number;
  flat?: boolean;
  transparent?: number;
}

/** Soft matte — the default for almost everything. */
export function soft(T: THREE, o: MaterialOptions): THREE_NS.Material {
  const key = `soft:${o.color}:${o.gloss ?? 0}:${o.glow ?? 0}:${o.flat ?? 1}:${o.transparent ?? 1}`;
  return mat(key, () => {
    const m = new T.MeshStandardMaterial({
      color: o.color,
      roughness: 1 - (o.gloss ?? 0.12),
      metalness: 0,
      flatShading: o.flat ?? true,
      emissive: o.glow ? o.color : 0x000000,
      emissiveIntensity: o.glow ?? 0,
    });
    if (o.transparent !== undefined && o.transparent < 1) {
      m.transparent = true;
      m.opacity = o.transparent;
    }
    return m;
  });
}

/** Unlit — for stars, glints and anything that should read as light itself. */
export function lit(T: THREE, color: number, opacity = 1): THREE_NS.Material {
  return mat(`lit:${color}:${opacity}`, () => {
    const m = new T.MeshBasicMaterial({ color, toneMapped: false });
    if (opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
    }
    return m;
  });
}

/** Thin connecting line, used by the constellations and the agent graph. */
export function thread(T: THREE, color: number, opacity = 0.35): THREE_NS.LineBasicMaterial {
  return mat(`thread:${color}:${opacity}`, () => {
    return new T.LineBasicMaterial({ color, transparent: true, opacity });
  }) as THREE_NS.LineBasicMaterial;
}

/* ----------------------------------------------------------------- shapes -- */

/**
 * A five-pointed star, extruded. This is the brand mark, so it is the one shape
 * worth building precisely rather than approximating with a cone.
 */
export function starGeometry(T: THREE, points = 5, outer = 1, inner = 0.45, depth = 0.25) {
  return geo(`star:${points}:${outer}:${inner}:${depth}`, () => {
    const shape = new T.Shape();
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = i * step - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    const g = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.05,
      bevelSegments: 1,
      curveSegments: 1,
    });
    g.center();
    return g;
  });
}

export function boxGeometry(T: THREE, w = 1, h = 1, d = 1) {
  return geo(`box:${w}:${h}:${d}`, () => new T.BoxGeometry(w, h, d));
}

export function sphereGeometry(T: THREE, r = 1, seg = 16) {
  return geo(`sphere:${r}:${seg}`, () => new T.SphereGeometry(r, seg, Math.max(8, seg / 2)));
}

/** Rounded, low-segment cylinder — table legs, pots, brush handles. */
export function pillGeometry(T: THREE, r = 0.1, h = 1, seg = 8) {
  return geo(`pill:${r}:${h}:${seg}`, () => new T.CylinderGeometry(r, r, h, seg));
}

/** A simple leaf: a flattened, tapered ellipse. */
export function leafGeometry(T: THREE, len = 1) {
  return geo(`leaf:${len}`, () => {
    const shape = new T.Shape();
    shape.moveTo(0, -len / 2);
    shape.quadraticCurveTo(len * 0.45, 0, 0, len / 2);
    shape.quadraticCurveTo(-len * 0.45, 0, 0, -len / 2);
    const g = new T.ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: false,
      curveSegments: 6,
    });
    g.center();
    return g;
  });
}

/** A closed book: two covers and a slightly inset page block. */
export function book(T: THREE, cover: number, pages = PALETTE.cream100): THREE_NS.Group {
  const g = new T.Group();
  const body = new T.Mesh(boxGeometry(T, 0.72, 0.1, 0.94), soft(T, { color: cover, gloss: 0.2 }));
  const paper = new T.Mesh(boxGeometry(T, 0.66, 0.11, 0.88), soft(T, { color: pages }));
  paper.position.x = 0.02;
  g.add(body, paper);
  return g;
}

/** A stack of three offset blocks — the toddler-room shorthand. */
export function blocks(T: THREE, colors: number[]): THREE_NS.Group {
  const g = new T.Group();
  colors.slice(0, 3).forEach((c, i) => {
    const m = new T.Mesh(boxGeometry(T, 0.5, 0.5, 0.5), soft(T, { color: c }));
    m.position.set((i % 2 ? 0.08 : -0.06) * (i + 1), i * 0.52, (i === 1 ? 0.07 : -0.04) * i);
    m.rotation.y = (i - 1) * 0.18;
    g.add(m);
  });
  return g;
}

/** A paintbrush: handle, ferrule, bristles. */
export function brush(T: THREE, bristle = PALETTE.coral500): THREE_NS.Group {
  const g = new T.Group();
  const handle = new T.Mesh(pillGeometry(T, 0.07, 1.1), soft(T, { color: PALETTE.sand }));
  const ferrule = new T.Mesh(pillGeometry(T, 0.085, 0.18), soft(T, { color: PALETTE.cream300, gloss: 0.4 }));
  ferrule.position.y = -0.6;
  const tip = new T.Mesh(
    geo('brushTip', () => new T.ConeGeometry(0.09, 0.3, 8)),
    soft(T, { color: bristle })
  );
  tip.position.y = -0.82;
  tip.rotation.z = Math.PI;
  g.add(handle, ferrule, tip);
  return g;
}

/** A balloon with a thread. */
export function balloon(T: THREE, color: number): THREE_NS.Group {
  const g = new T.Group();
  const body = new T.Mesh(sphereGeometry(T, 0.4, 16), soft(T, { color, gloss: 0.45, flat: false }));
  body.scale.y = 1.22;
  const knot = new T.Mesh(
    geo('knot', () => new T.ConeGeometry(0.08, 0.14, 6)),
    soft(T, { color })
  );
  knot.position.y = -0.5;
  knot.rotation.z = Math.PI;
  g.add(body, knot);
  return g;
}

/** A crescent moon, made by subtracting nothing — just two offset spheres. */
export function moon(T: THREE): THREE_NS.Group {
  const g = new T.Group();
  const disc = new T.Mesh(
    geo('moonDisc', () => new T.CircleGeometry(0.5, 24)),
    lit(T, PALETTE.gold200, 0.95)
  );
  const bite = new T.Mesh(
    geo('moonBite', () => new T.CircleGeometry(0.42, 24)),
    lit(T, PALETTE.ink900, 1)
  );
  bite.position.set(0.22, 0.07, 0.01);
  g.add(disc, bite);
  return g;
}

/** A four-lobed puzzle piece, simplified to a cross of rounded tabs. */
export function puzzle(T: THREE, color: number): THREE_NS.Group {
  const g = new T.Group();
  const base = new T.Mesh(boxGeometry(T, 0.62, 0.14, 0.62), soft(T, { color }));
  g.add(base);
  const tab = sphereGeometry(T, 0.16, 10);
  const m = soft(T, { color });
  [
    [0.36, 0, 0],
    [0, 0, 0.36],
  ].forEach(([x, y, z]) => {
    const bump = new T.Mesh(tab, m);
    bump.position.set(x, y, z);
    bump.scale.set(1, 0.44, 1);
    g.add(bump);
  });
  return g;
}

/* ------------------------------------------------------------- starfield -- */

/**
 * A points-based starfield. One geometry, one material, additive-free so it
 * stays warm rather than blown out.
 */
export function starfield(
  T: THREE,
  count: number,
  radius: number,
  color = PALETTE.gold200
): THREE_NS.Points {
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Distribute on a shell rather than a cube so density reads evenly.
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.55 + Math.random() * 0.45);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i * 3 + 2] = r * Math.cos(phi);
    scales[i] = 0.4 + Math.random() * 0.6;
  }

  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(positions, 3));
  g.setAttribute('aScale', new T.BufferAttribute(scales, 1));

  const material = new T.PointsMaterial({
    color,
    size: radius * 0.012,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    toneMapped: false,
  });

  const points = new T.Points(g, material);
  // Owned by the scene, not the kit — it is unique per instance.
  points.userData.ownsResources = true;
  return points;
}

/* ---------------------------------------------------------------- lights -- */

/**
 * The standard three-light rig: warm key, cool fill, soft ambient. Deliberately
 * minimal — more lights is the fastest way to make a phone hot.
 */
export function warmRig(T: THREE, scene: THREE_NS.Scene, castShadow = false) {
  const ambient = new T.AmbientLight(PALETTE.cream200, 1.5);

  const key = new T.DirectionalLight(0xfff2e4, 2.1);
  key.position.set(3, 5, 4);
  key.castShadow = castShadow;
  if (castShadow) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    key.shadow.bias = -0.0015;
  }

  const fill = new T.DirectionalLight(0xcfe3ff, 0.7);
  fill.position.set(-4, 1.5, -2);

  scene.add(ambient, key, fill);
  return { ambient, key, fill };
}

/* ------------------------------------------------------------------ util -- */

/** Deterministic pseudo-random, so a scene looks identical on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frame-rate independent easing toward a target. */
export const damp = (a: number, b: number, lambda: number, dt: number) =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));
