/**
 * Hero atmosphere.
 *
 * Deliberately restrained. The hero's job is to answer "who are you, and can I
 * trust you" in about three seconds, and the strongest asset for that is the
 * real photograph of the real room. So the 3D here sits *behind* and *around*
 * that photograph rather than replacing it: a warm starfield, a handful of
 * slowly drifting objects, and a camera that responds to the pointer just
 * enough to feel alive.
 *
 * Nothing in this scene is clickable and nothing in it carries information.
 * The interactive 3D lives further down the page, where a visitor has already
 * decided to stay.
 */

import type * as THREE_NS from 'three';
import { Stage } from '../stage';
import {
  PALETTE,
  starfield,
  starGeometry,
  book,
  blocks,
  balloon,
  leafGeometry,
  brush,
  soft,
  lit,
  warmRig,
  seeded,
  damp,
} from '../kit';

interface Floater {
  object: THREE_NS.Object3D;
  /**
   * Where the object sits as a fraction of the visible frustum at its own
   * depth, -1..1 from centre. Authoring in screen space rather than world units
   * is what keeps the composition in the margins at every viewport: a fixed
   * world x that clears the headline at 1440px drifts into it at 1024px.
   */
  anchor: { x: number; y: number };
  /** Z the object sits at. Fixed; only x/y respond to the viewport. */
  z: number;
  /** Base position, orbited around. Recomputed from `anchor` on every layout. */
  home: THREE_NS.Vector3;
  drift: number;
  spin: number;
  phase: number;
  depth: number;
}

class HeroStage extends Stage {
  private floaters: Floater[] = [];
  private stars?: THREE_NS.Points;
  private pointer = { x: 0, y: 0 };
  private target = { x: 0, y: 0 };
  private detach: (() => void)[] = [];

  protected build() {
    const T = this.THREE;
    const rand = seeded(20260827);

    this.camera.position.set(0, 0, 9);
    this.camera.lookAt(0, 0, 0);

    warmRig(T, this.scene, false);

    // --- starfield -------------------------------------------------------
    const count = Math.round(520 * this.q.particles);
    if (count > 20) {
      this.stars = starfield(T, count, 16, PALETTE.gold200);
      this.stars.position.z = -6;
      this.scene.add(this.stars);
    }

    // --- floating objects ------------------------------------------------
    // A curated set, not a scatter. Each one is a thing a child would recognise.
    // Anchors keep the middle band clear. The headline is the one thing on this
    // page that has to be read in three seconds, and an opaque star drifting
    // through "A place where" costs more than the ornament is worth — so the
    // cast is pinned to the margins and to the space behind the photograph.
    type Spec = {
      make: () => THREE_NS.Object3D;
      anchor: [number, number];
      z: number;
      scale: number;
    };
    const cast: Spec[] = [
      {
        make: () => new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.22), lit(T, PALETTE.gold400)),
        anchor: [-0.86, 0.78],
        z: -2.6,
        scale: 0.42,
      },
      { make: () => book(T, PALETTE.coral500), anchor: [0.72, 0.42], z: -2.4, scale: 0.85 },
      {
        make: () => blocks(T, [PALETTE.teal400, PALETTE.marigold, PALETTE.blush]),
        anchor: [-0.88, -0.72],
        z: -2.8,
        scale: 0.44,
      },
      { make: () => balloon(T, PALETTE.blush), anchor: [0.82, -0.48], z: -1.8, scale: 0.72 },
      {
        make: () => new T.Mesh(leafGeometry(T, 1.1), soft(T, { color: PALETTE.teal600 })),
        anchor: [-0.8, -0.9],
        z: -1.6,
        scale: 0.5,
      },
      { make: () => brush(T, PALETTE.violet), anchor: [0.56, -0.78], z: -0.9, scale: 0.6 },
      {
        make: () => new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.2), lit(T, PALETTE.coral300)),
        anchor: [0.62, 0.84],
        z: -3.6,
        scale: 0.34,
      },
      {
        make: () => new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.2), lit(T, PALETTE.teal400)),
        anchor: [-0.66, 0.92],
        z: -3.9,
        scale: 0.28,
      },
    ];

    // Lower tiers carry fewer objects rather than smaller ones — thinning reads
    // as intentional composition; shrinking reads as a broken layout.
    const budget = Math.max(3, Math.round(cast.length * (0.45 + this.q.detail * 0.55)));

    cast.slice(0, budget).forEach((spec, i) => {
      const object = spec.make();
      object.scale.setScalar(spec.scale);
      object.rotation.set(rand() * 0.6 - 0.3, rand() * Math.PI * 2, rand() * 0.4 - 0.2);
      this.scene.add(object);
      this.floaters.push({
        object,
        anchor: { x: spec.anchor[0], y: spec.anchor[1] },
        z: spec.z,
        home: new T.Vector3(),
        drift: 0.16 + rand() * 0.13,
        spin: (rand() - 0.5) * 0.18,
        phase: rand() * Math.PI * 2,
        depth: 0.35 + (i % 3) * 0.28,
      });
    });

    if (this.q.parallax) this.listen();
    this.layout(this.mount.clientWidth, this.mount.clientHeight);
  }

  /* --------------------------------------------------------------- input */

  private listen() {
    const onPointer = (e: PointerEvent) => {
      // Ignore touch: a finger dragging the page is not aiming a camera.
      if (e.pointerType === 'touch') return;
      const r = this.mount.getBoundingClientRect();
      this.target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    this.detach.push(() => window.removeEventListener('pointermove', onPointer));

    // On touch devices the scroll position gives a gentle sense of movement
    // without asking for motion permissions or fighting the finger.
    if (matchMedia('(pointer: coarse)').matches) {
      const onScroll = () => {
        const r = this.mount.getBoundingClientRect();
        const progress = 1 - (r.top + r.height) / (window.innerHeight + r.height);
        this.target.y = (progress - 0.5) * 0.8;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      this.detach.push(() => window.removeEventListener('scroll', onScroll));
    }
  }

  /* -------------------------------------------------------------- layout */

  protected layout(w: number, h: number) {
    // Pull the camera back on narrow viewports so the composition stays whole
    // instead of cropping the objects at the edges.
    const aspect = w / Math.max(1, h);
    this.camera.position.z = aspect < 0.9 ? 13 : aspect < 1.4 ? 11 : 9;

    // Re-seat every floater against the frustum this viewport actually has.
    const halfFov = (this.camera.fov * Math.PI) / 360;

    // On a phone the hero copy is full-width: the eyebrow, the headline, the
    // lede and two buttons fill the frame edge to edge, so there is no margin
    // left to put an object in. Pushing them to the top and bottom bands was
    // not enough — they still landed on the headline, which is the one line
    // that has to be readable in three seconds. So in portrait the objects are
    // hidden outright and the starfield carries the atmosphere alone.
    const portrait = aspect < 1;
    for (const f of this.floaters) {
      f.object.visible = !portrait;
      if (portrait) continue;
      const dist = this.camera.position.z - f.z;
      const halfH = Math.tan(halfFov) * dist;
      const halfW = halfH * aspect;
      f.home.set(f.anchor.x * halfW, f.anchor.y * halfH, f.z);
      f.object.position.copy(f.home);
    }
  }

  /* --------------------------------------------------------------- frame */

  protected update(dt: number, t: number) {
    // Pointer easing is frame-rate independent, so a 120 Hz Mac and a 30 Hz
    // phone feel like the same amount of movement.
    this.pointer.x = damp(this.pointer.x, this.target.x, 2.4, dt);
    this.pointer.y = damp(this.pointer.y, this.target.y, 2.4, dt);

    for (const f of this.floaters) {
      const wave = t * f.drift + f.phase;
      f.object.position.y = f.home.y + Math.sin(wave) * 0.24;
      f.object.position.x = f.home.x + Math.cos(wave * 0.7) * 0.13;
      f.object.rotation.y += f.spin * dt;
      f.object.rotation.z = Math.sin(wave * 0.5) * 0.09;

      // Parallax: nearer objects travel further, which is what sells depth.
      f.object.position.x += this.pointer.x * f.depth * 0.55;
      f.object.position.y -= this.pointer.y * f.depth * 0.32;
    }

    if (this.stars) {
      this.stars.rotation.y = t * 0.008 + this.pointer.x * 0.05;
      this.stars.rotation.x = this.pointer.y * -0.03;
    }

    // The camera itself barely moves. Anything more reads as motion sickness
    // rather than craft.
    this.camera.position.x = this.pointer.x * 0.42;
    this.camera.position.y = this.pointer.y * -0.26;
    this.camera.lookAt(0, 0, 0);
  }

  dispose() {
    this.detach.forEach((fn) => fn());
    this.detach.length = 0;
    this.floaters.length = 0;
    super.dispose();
  }
}

export function create(mount: HTMLElement) {
  return new HeroStage({
    mount,
    label:
      'Decorative animation: a warm night sky of stars with a book, building blocks, a balloon, a leaf and a paintbrush drifting slowly.',
    loop: 'always',
    fov: 42,
  });
}
