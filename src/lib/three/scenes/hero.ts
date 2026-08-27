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
  /** Base position, orbited around. */
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
    const cast: { make: () => THREE_NS.Object3D; at: [number, number, number]; scale: number }[] = [
      {
        make: () => new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.22), lit(T, PALETTE.gold400)),
        at: [-4.4, 1.9, -1.2],
        scale: 0.62,
      },
      { make: () => book(T, PALETTE.coral500), at: [4.6, 1.3, -2.4], scale: 0.85 },
      { make: () => blocks(T, [PALETTE.teal400, PALETTE.marigold, PALETTE.blush]), at: [-5.1, -1.9, -2.8], scale: 0.5 },
      { make: () => balloon(T, PALETTE.blush), at: [5.2, -1.6, -1.8], scale: 0.72 },
      {
        make: () => new T.Mesh(leafGeometry(T, 1.1), soft(T, { color: PALETTE.teal600 })),
        at: [-3.2, -2.6, -0.6],
        scale: 0.7,
      },
      { make: () => brush(T, PALETTE.violet), at: [3.4, -2.5, -0.9], scale: 0.6 },
      {
        make: () => new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.2), lit(T, PALETTE.coral300)),
        at: [4.1, 2.7, -3.6],
        scale: 0.34,
      },
      {
        make: () => new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.2), lit(T, PALETTE.teal400)),
        at: [-4.9, 2.9, -3.9],
        scale: 0.28,
      },
    ];

    // Lower tiers carry fewer objects rather than smaller ones — thinning reads
    // as intentional composition; shrinking reads as a broken layout.
    const budget = Math.max(3, Math.round(cast.length * (0.45 + this.q.detail * 0.55)));

    cast.slice(0, budget).forEach((spec, i) => {
      const object = spec.make();
      object.position.set(...spec.at);
      object.scale.setScalar(spec.scale);
      object.rotation.set(rand() * 0.6 - 0.3, rand() * Math.PI * 2, rand() * 0.4 - 0.2);
      this.scene.add(object);
      this.floaters.push({
        object,
        home: object.position.clone(),
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
