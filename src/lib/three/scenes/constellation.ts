/**
 * The Tiny Stars constellation — navigation as a star map.
 *
 * The important architectural point: **this canvas is not the navigation.**
 * Underneath it sits a real, ordered list of real links. Those links work with
 * a keyboard, work for a screen reader, work with JavaScript off, and are what
 * Google indexes. The canvas mirrors their state and makes them beautiful.
 *
 * Communication is one-way and event-based in both directions:
 *   - the HTML list emits `ts:node` on the mount when a link is hovered/focused
 *   - the scene emits `ts:node-enter` when a star is hovered, so the HTML can
 *     highlight the matching link
 *   - the concierge emits `ts:focus` to point at a node mid-answer
 *
 * If the scene never loads, every one of those events simply goes nowhere and
 * the list keeps working.
 */

import type * as THREE_NS from 'three';
import { Stage } from '../stage';
import { constellation, CORE, type ConstellationNode } from '../../../data/constellation';
import {
  PALETTE,
  starGeometry,
  sphereGeometry,
  lit,
  soft,
  thread,
  starfield,
  warmRig,
  damp,
  seeded,
} from '../kit';

interface NodeView {
  data: ConstellationNode;
  group: THREE_NS.Group;
  star: THREE_NS.Mesh;
  halo: THREE_NS.Mesh;
  home: THREE_NS.Vector3;
  phase: number;
  /** 0..1 activation, eased. */
  glow: number;
  targetGlow: number;
}

const DEG = Math.PI / 180;

class ConstellationStage extends Stage {
  private nodes: NodeView[] = [];
  private lines: { line: THREE_NS.Line; a: string; b: string; mat: THREE_NS.LineBasicMaterial }[] = [];
  private core?: THREE_NS.Mesh;
  private coreHalo?: THREE_NS.Mesh;
  private stars?: THREE_NS.Points;
  private raycaster!: THREE_NS.Raycaster;
  private ndc!: THREE_NS.Vector2;
  private active: string | null = null;
  private hovered: string | null = null;
  private pointer = { x: 0, y: 0 };
  private target = { x: 0, y: 0 };
  private detach: (() => void)[] = [];

  protected build() {
    const T = this.THREE;
    const rand = seeded(31415);

    this.raycaster = new T.Raycaster();
    this.ndc = new T.Vector2();

    this.camera.position.set(0, 0, 12);
    warmRig(T, this.scene, false);

    const bg = Math.round(340 * this.q.particles);
    if (bg > 20) {
      this.stars = starfield(T, bg, 20, PALETTE.gold200);
      this.stars.position.z = -8;
      this.scene.add(this.stars);
    }

    // --- core ------------------------------------------------------------
    this.core = new T.Mesh(starGeometry(T, 5, 1, 0.42, 0.3), lit(T, CORE.color));
    this.core.scale.setScalar(0.9);
    this.scene.add(this.core);

    this.coreHalo = new T.Mesh(sphereGeometry(T, 1.5, 20), lit(T, CORE.color, 0.07));
    this.scene.add(this.coreHalo);

    // --- nodes -----------------------------------------------------------
    constellation.forEach((data) => {
      const group = new T.Group();
      const a = (data.angle - 90) * DEG;
      const home = new T.Vector3(
        Math.cos(a) * data.radius,
        Math.sin(a) * data.radius * 0.72,
        (rand() - 0.5) * 1.4
      );
      group.position.copy(home);

      const star = new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.22), lit(T, data.color));
      star.scale.setScalar(0.42);

      // The halo is what actually reads as "this one is selected" at a glance.
      const halo = new T.Mesh(sphereGeometry(T, 0.86, 16), lit(T, data.color, 0.0));
      halo.renderOrder = -1;

      group.add(star, halo);
      this.scene.add(group);

      this.nodes.push({
        data,
        group,
        star,
        halo,
        home,
        phase: rand() * Math.PI * 2,
        glow: 0,
        targetGlow: 0,
      });
    });

    // --- connections -----------------------------------------------------
    // Core to every node, plus the ring links that make it a shape.
    this.nodes.forEach((n) => this.connect('core', n.data.id));
    this.nodes.forEach((n) => n.data.links.forEach((other) => this.connect(n.data.id, other)));

    this.enablePointerEvents();
    this.listen();
    this.layout(this.mount.clientWidth, this.mount.clientHeight);
  }

  private connect(a: string, b: string) {
    const T = this.THREE;
    if (this.lines.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return;

    const pa = this.positionOf(a);
    const pb = this.positionOf(b);
    if (!pa || !pb) return;

    const g = new T.BufferGeometry().setFromPoints([pa, pb]);
    // Each line owns its material because opacity animates independently.
    const mat = new T.LineBasicMaterial({
      color: PALETTE.gold400,
      transparent: true,
      opacity: 0.14,
    });
    const line = new T.Line(g, mat);
    line.userData.ownsResources = true;
    this.scene.add(line);
    this.lines.push({ line, a, b, mat });
  }

  private positionOf(id: string): THREE_NS.Vector3 | null {
    if (id === 'core') return new this.THREE.Vector3(0, 0, 0);
    return this.nodes.find((n) => n.data.id === id)?.home.clone() ?? null;
  }

  /* --------------------------------------------------------------- input */

  private listen() {
    const canvas = this.renderer.domElement;

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;

      const hit = this.pick();
      if (hit !== this.hovered) {
        this.hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : '';
        // Tell the HTML list which link to highlight.
        this.mount.dispatchEvent(
          new CustomEvent('ts:node-enter', { detail: { id: hit }, bubbles: true })
        );
      }
    };

    const click = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      const hit = this.pick();
      if (!hit) return;
      const node = constellation.find((n) => n.id === hit);
      if (node) window.location.href = node.href;
    };

    const leave = () => {
      this.hovered = null;
      canvas.style.cursor = '';
      this.target.x = 0;
      this.target.y = 0;
      this.mount.dispatchEvent(
        new CustomEvent('ts:node-enter', { detail: { id: null }, bubbles: true })
      );
    };

    if (this.q.parallax) canvas.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('click', click as EventListener);

    this.detach.push(
      () => canvas.removeEventListener('pointermove', move),
      () => canvas.removeEventListener('pointerleave', leave),
      () => canvas.removeEventListener('click', click as EventListener)
    );

    // Driven from outside: the HTML list, and the concierge.
    const focus = (e: Event) => {
      const id = (e as CustomEvent<{ id: string | null }>).detail?.id ?? null;
      this.active = id;
    };
    this.mount.addEventListener('ts:node', focus);
    this.detach.push(() => this.mount.removeEventListener('ts:node', focus));
  }

  private pick(): string | null {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    // Test the halos, not the stars: a 0.86-radius sphere is a forgiving target
    // on a trackpad, where a 0.42 star point is not.
    const halos = this.nodes.map((n) => n.halo);
    const hit = this.raycaster.intersectObjects(halos, false)[0];
    if (!hit) return null;
    return this.nodes.find((n) => n.halo === hit.object)?.data.id ?? null;
  }

  /* -------------------------------------------------------------- layout */

  protected layout(w: number, h: number) {
    const aspect = w / Math.max(1, h);
    this.camera.position.z = aspect < 0.85 ? 17 : aspect < 1.3 ? 14 : 12;
  }

  /* --------------------------------------------------------------- frame */

  protected update(dt: number, t: number) {
    const focusId = this.active ?? this.hovered;

    this.pointer.x = damp(this.pointer.x, this.target.x, 2.2, dt);
    this.pointer.y = damp(this.pointer.y, this.target.y, 2.2, dt);

    for (const n of this.nodes) {
      n.targetGlow = focusId === n.data.id ? 1 : 0;
      n.glow = damp(n.glow, n.targetGlow, 7, dt);

      const wave = t * 0.22 + n.phase;
      n.group.position.set(
        n.home.x + Math.cos(wave * 0.8) * 0.11 + this.pointer.x * 0.5,
        n.home.y + Math.sin(wave) * 0.15 - this.pointer.y * 0.3,
        n.home.z
      );

      n.star.rotation.y = wave * 0.5;
      n.star.scale.setScalar(0.42 + n.glow * 0.22);
      (n.halo.material as THREE_NS.MeshBasicMaterial).opacity = 0.05 + n.glow * 0.22;
      n.halo.scale.setScalar(1 + n.glow * 0.3);
    }

    // A connection only lights up when one of its ends is active. Leaving every
    // line animating permanently is the thing that makes node graphs look cheap.
    for (const l of this.lines) {
      const on = focusId !== null && (l.a === focusId || l.b === focusId);
      l.mat.opacity = damp(l.mat.opacity, on ? 0.55 : 0.14, 6, dt);
    }

    if (this.core) {
      this.core.rotation.y = t * 0.16;
      this.core.rotation.z = Math.sin(t * 0.4) * 0.06;
    }
    if (this.coreHalo) {
      const pulse = 1 + Math.sin(t * 0.9) * 0.04;
      this.coreHalo.scale.setScalar(pulse);
    }
    if (this.stars) this.stars.rotation.y = t * 0.01;

    this.camera.position.x = this.pointer.x * 0.6;
    this.camera.position.y = this.pointer.y * -0.4;
    this.camera.lookAt(0, 0, 0);
  }

  protected applyQuality(q: Parameters<Stage['applyQuality']>[0]) {
    super.applyQuality(q);
    // Shed the background field first — it is the least load-bearing element.
    if (this.stars && q.particles < 0.3) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      (this.stars.material as THREE_NS.Material).dispose();
      this.stars = undefined;
    }
  }

  dispose() {
    this.detach.forEach((fn) => fn());
    this.detach.length = 0;
    this.nodes.length = 0;
    this.lines.length = 0;
    super.dispose();
  }
}

export function create(mount: HTMLElement) {
  return new ConstellationStage({
    mount,
    label:
      'An interactive star map of the Tiny Stars website. Every star also appears as a link in the list below.',
    loop: 'always',
    fov: 45,
  });
}
