/**
 * The program constellation — five stars along an age axis.
 *
 * This is a chart before it is a decoration: horizontal position is the child's
 * age, so the spacing carries real information (out-of-school care covers six
 * years and sits accordingly far to the right). Hovering a card below lights
 * its star; hovering a star lights its card.
 */

import type * as THREE_NS from 'three';
import { Stage } from '../stage';
import { programs } from '../../../data/programs';
import {
  PALETTE,
  PROGRAM_COLOR,
  starGeometry,
  sphereGeometry,
  lit,
  starfield,
  warmRig,
  damp,
  seeded,
} from '../kit';

interface Star {
  slug: string;
  group: THREE_NS.Group;
  star: THREE_NS.Mesh;
  halo: THREE_NS.Mesh;
  home: THREE_NS.Vector3;
  phase: number;
  glow: number;
}

class ProgramStage extends Stage {
  private stars: Star[] = [];
  private trail?: THREE_NS.Line;
  private trailMat?: THREE_NS.LineBasicMaterial;
  private field?: THREE_NS.Points;
  private raycaster!: THREE_NS.Raycaster;
  private ndc!: THREE_NS.Vector2;
  private active: string | null = null;
  private hovered: string | null = null;
  private detach: (() => void)[] = [];

  protected build() {
    const T = this.THREE;
    const rand = seeded(4242);

    this.raycaster = new T.Raycaster();
    this.ndc = new T.Vector2();
    this.camera.position.set(0, 0.4, 11);
    warmRig(T, this.scene, false);

    const bg = Math.round(260 * this.q.particles);
    if (bg > 20) {
      this.field = starfield(T, bg, 18, PALETTE.gold200);
      this.field.position.z = -7;
      this.scene.add(this.field);
    }

    // Age axis: map 12 months -> 144 months onto the visible width.
    const minM = 12;
    const maxM = 144;
    const span = 14;
    const pts: THREE_NS.Vector3[] = [];

    programs.forEach((p, i) => {
      const mid = (p.ageMinMonths + p.ageMaxMonths) / 2;
      const x = ((mid - minM) / (maxM - minM) - 0.5) * span;
      // Alternate above and below the axis so labels never collide.
      const y = (i % 2 === 0 ? 1 : -1) * (0.9 + rand() * 0.5);
      const home = new T.Vector3(x, y, (rand() - 0.5) * 1.2);
      pts.push(home.clone());

      const group = new T.Group();
      group.position.copy(home);

      const color = PROGRAM_COLOR[p.slug] ?? PALETTE.gold400;
      const star = new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.24), lit(T, color));
      // Older programs get slightly larger stars — the span they cover is wider.
      const size = 0.32 + ((p.ageMaxMonths - p.ageMinMonths) / (maxM - minM)) * 0.5;
      star.scale.setScalar(size);

      const halo = new T.Mesh(sphereGeometry(T, size * 2.1, 14), lit(T, color, 0.05));
      halo.userData.slug = p.slug;

      group.add(star, halo);
      this.scene.add(group);
      this.stars.push({ slug: p.slug, group, star, halo, home, phase: rand() * 6.28, glow: 0 });
    });

    // The trail that turns five points into one journey.
    const ordered = [...pts].sort((a, b) => a.x - b.x);
    const curve = new T.CatmullRomCurve3(ordered, false, 'catmullrom', 0.4);
    const geometry = new T.BufferGeometry().setFromPoints(curve.getPoints(60));
    this.trailMat = new T.LineBasicMaterial({
      color: PALETTE.gold400,
      transparent: true,
      opacity: 0.28,
    });
    this.trail = new T.Line(geometry, this.trailMat);
    this.trail.userData.ownsResources = true;
    this.scene.add(this.trail);

    this.enablePointerEvents();
    this.listen();
    this.layout(this.mount.clientWidth, this.mount.clientHeight);
  }

  private listen() {
    const canvas = this.renderer.domElement;

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = canvas.getBoundingClientRect();
      this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      const hit = this.pick();
      if (hit !== this.hovered) {
        this.hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : '';
        this.mount.dispatchEvent(
          new CustomEvent('ts:program-hover', { detail: { slug: hit }, bubbles: true })
        );
      }
    };

    const click = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      const hit = this.pick();
      if (hit) window.location.href = `/programs/${hit}`;
    };

    canvas.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('click', click as EventListener);
    canvas.addEventListener('pointerleave', () => {
      this.hovered = null;
      this.mount.dispatchEvent(
        new CustomEvent('ts:program-hover', { detail: { slug: null }, bubbles: true })
      );
    });

    const onFocus = (e: Event) => {
      this.active = (e as CustomEvent<{ slug: string | null }>).detail?.slug ?? null;
    };
    this.mount.addEventListener('ts:program', onFocus);

    this.detach.push(
      () => canvas.removeEventListener('pointermove', move),
      () => canvas.removeEventListener('click', click as EventListener),
      () => this.mount.removeEventListener('ts:program', onFocus)
    );
  }

  private pick(): string | null {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObjects(
      this.stars.map((s) => s.halo),
      false
    )[0];
    return (hit?.object.userData.slug as string) ?? null;
  }

  protected layout(w: number, h: number) {
    const aspect = w / Math.max(1, h);
    this.camera.position.z = aspect < 1 ? 17 : aspect < 1.6 ? 14 : 11;
  }

  protected update(dt: number, t: number) {
    const focus = this.active ?? this.hovered;
    for (const s of this.stars) {
      s.glow = damp(s.glow, focus === s.slug ? 1 : 0, 7, dt);
      const wave = t * 0.3 + s.phase;
      s.group.position.y = s.home.y + Math.sin(wave) * 0.12;
      s.star.rotation.y = wave * 0.4;
      s.star.rotation.z = Math.sin(wave * 0.6) * 0.08;
      (s.halo.material as THREE_NS.MeshBasicMaterial).opacity = 0.05 + s.glow * 0.2;
      s.halo.scale.setScalar(1 + s.glow * 0.28);
      s.group.scale.setScalar(1 + s.glow * 0.14);
    }
    if (this.trailMat) {
      this.trailMat.opacity = damp(this.trailMat.opacity, focus ? 0.5 : 0.28, 5, dt);
    }
    if (this.field) this.field.rotation.y = t * 0.008;
  }

  dispose() {
    this.detach.forEach((fn) => fn());
    this.detach.length = 0;
    this.stars.length = 0;
    super.dispose();
  }
}

export function create(mount: HTMLElement) {
  return new ProgramStage({
    mount,
    label:
      'The five Tiny Stars programs plotted as stars along a line, from 12 months on the left to 12 years on the right. Each is also a card below.',
    loop: 'always',
    fov: 45,
  });
}
