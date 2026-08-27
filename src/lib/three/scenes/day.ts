/**
 * "A day at Tiny Stars" — the signature scene.
 *
 * A small, warm, deliberately stylised room. It is **not** a model of the real
 * centre: Tiny Stars has photographs of its actual rooms and those are on the
 * gallery page, where they belong. This is a symbolic space whose job is to let
 * a parent move through the shape of a day and feel it, then read the verified
 * text in an ordinary HTML panel underneath.
 *
 * Interaction is camera-only. Clicking a hotspot flies to a named viewpoint and
 * emits an event; the HTML decides what to show. Nothing in the canvas carries
 * information a screen reader cannot reach.
 */

import type * as THREE_NS from 'three';
import { Stage } from '../stage';
import { dayZones, type DayZone } from '../../../data/dayZones';
import {
  PALETTE,
  boxGeometry,
  sphereGeometry,
  pillGeometry,
  leafGeometry,
  starGeometry,
  book,
  blocks,
  brush,
  soft,
  lit,
  warmRig,
  seeded,
  damp,
  lerp,
} from '../kit';

interface Hotspot {
  zone: DayZone;
  marker: THREE_NS.Mesh;
  ring: THREE_NS.Mesh;
  glow: number;
}

/** Cubic ease-in-out — the only easing a camera move needs. */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

class DayStage extends Stage {
  private hotspots: Hotspot[] = [];
  private raycaster!: THREE_NS.Raycaster;
  private ndc!: THREE_NS.Vector2;
  private detach: (() => void)[] = [];
  private motes?: THREE_NS.Points;

  private active: string | null = null;
  private hovered: string | null = null;

  // Camera flight
  private from = { pos: [0, 0, 0], look: [0, 0, 0] };
  private to = { pos: [0, 0, 0], look: [0, 0, 0] };
  private flight = 1;
  private readonly duration = 1.05;
  private lookAt!: THREE_NS.Vector3;

  private home: { pos: [number, number, number]; look: [number, number, number] } = {
    pos: [0.4, 5.6, 12.4],
    look: [0, 0.6, -0.6],
  };

  private pointer = { x: 0, y: 0 };
  private targetPointer = { x: 0, y: 0 };

  protected build() {
    const T = this.THREE;
    this.raycaster = new T.Raycaster();
    this.ndc = new T.Vector2();
    this.lookAt = new T.Vector3(...this.home.look);

    this.camera.position.set(...this.home.pos);
    this.camera.lookAt(this.lookAt);
    this.from = { pos: [...this.home.pos], look: [...this.home.look] };
    this.to = { pos: [...this.home.pos], look: [...this.home.look] };

    warmRig(T, this.scene, this.q.shadows);

    this.buildRoom();
    this.buildFurniture();
    this.buildOutdoors();
    this.buildHotspots();

    if (this.q.particles > 0.3) this.buildMotes();

    this.enablePointerEvents();
    this.listen();
  }

  /* ----------------------------------------------------------- structure */

  private buildRoom() {
    const T = this.THREE;

    const floor = new T.Mesh(
      boxGeometry(T, 22, 0.4, 14),
      soft(T, { color: PALETTE.cream300, flat: false })
    );
    floor.position.set(0, -0.2, 0);
    floor.receiveShadow = this.q.shadows;
    this.scene.add(floor);

    // A warm rug anchors the middle of the room the way it does in a real one.
    const rug = new T.Mesh(
      boxGeometry(T, 6.4, 0.06, 4.6),
      soft(T, { color: PALETTE.coral300, flat: false, transparent: 0.9 })
    );
    rug.position.set(0.6, 0.03, 0.4);
    this.scene.add(rug);

    // Back wall and one side wall only — three walls would box the camera in.
    const back = new T.Mesh(boxGeometry(T, 22, 6, 0.3), soft(T, { color: PALETTE.cream100 }));
    back.position.set(0, 2.8, -7);
    back.receiveShadow = this.q.shadows;

    const side = new T.Mesh(boxGeometry(T, 0.3, 6, 14), soft(T, { color: PALETTE.cream200 }));
    side.position.set(-11, 2.8, 0);
    this.scene.add(back, side);

    // Window: a pale panel with muntins, so the wall is not blank.
    const glass = new T.Mesh(
      boxGeometry(T, 3.4, 2.2, 0.1),
      lit(T, 0xe8f4ff, 0.92)
    );
    glass.position.set(-6.6, 3.1, -6.8);
    this.scene.add(glass);
    const bar = soft(this.THREE, { color: PALETTE.cream50 });
    [
      [0, 0, 3.5, 0.12],
      [0, 0, 0.12, 2.3],
    ].forEach(([dx, dy, w, h]) => {
      const m = new T.Mesh(boxGeometry(T, w, h, 0.14), bar);
      m.position.set(-6.6 + dx, 3.1 + dy, -6.74);
      this.scene.add(m);
    });

    // Door, at the arrival end.
    const door = new T.Mesh(boxGeometry(T, 1.9, 3.4, 0.16), soft(T, { color: PALETTE.teal600 }));
    door.position.set(-3.9, 1.7, -6.85);
    const handle = new T.Mesh(sphereGeometry(T, 0.11, 10), soft(T, { color: PALETTE.gold400, gloss: 0.6 }));
    handle.position.set(-3.15, 1.7, -6.7);
    this.scene.add(door, handle);

    // Coat cubbies — the detail that makes it read as a daycare, not an office.
    const cubby = new T.Mesh(boxGeometry(T, 3.2, 1.8, 0.7), soft(T, { color: PALETTE.sand }));
    cubby.position.set(-8.6, 0.9, -6.3);
    this.scene.add(cubby);
    const hookColors = [PALETTE.coral500, PALETTE.teal400, PALETTE.marigold, PALETTE.violet];
    for (let i = 0; i < 4; i++) {
      const peg = new T.Mesh(pillGeometry(T, 0.07, 0.34, 6), soft(T, { color: hookColors[i] }));
      peg.rotation.x = Math.PI / 2;
      peg.position.set(-9.9 + i * 0.85, 1.5, -5.9);
      this.scene.add(peg);
    }
  }

  private buildFurniture() {
    const T = this.THREE;
    const rand = seeded(90210);

    // --- learning corner: shelf with books --------------------------------
    const shelf = new T.Mesh(boxGeometry(T, 3.6, 2.2, 0.8), soft(T, { color: PALETTE.sand }));
    shelf.position.set(-0.9, 1.1, -6.2);
    shelf.castShadow = this.q.shadows;
    this.scene.add(shelf);

    const shelfBoard = new T.Mesh(boxGeometry(T, 3.5, 0.1, 0.78), soft(T, { color: PALETTE.cream200 }));
    shelfBoard.position.set(-0.9, 1.2, -6.2);
    this.scene.add(shelfBoard);

    const bookColors = [PALETTE.coral500, PALETTE.teal400, PALETTE.violet, PALETTE.marigold, PALETTE.sky];
    const bookCount = Math.max(3, Math.round(6 * this.q.detail + 2));
    for (let i = 0; i < bookCount; i++) {
      const b = book(T, bookColors[i % bookColors.length]);
      b.scale.setScalar(0.62);
      b.rotation.z = Math.PI / 2;
      b.rotation.y = Math.PI / 2;
      b.position.set(-2.2 + i * 0.42, 1.62, -6.1);
      b.rotation.x = (rand() - 0.5) * 0.12;
      this.scene.add(b);
    }

    // --- play zone: block stack ------------------------------------------
    const stack = blocks(T, [PALETTE.coral500, PALETTE.teal400, PALETTE.marigold]);
    stack.scale.setScalar(0.85);
    stack.position.set(1.8, 0.24, -0.4);
    this.scene.add(stack);

    const looseColors = [PALETTE.violet, PALETTE.sky, PALETTE.blush, PALETTE.gold400];
    const loose = Math.round(5 * this.q.detail + 2);
    for (let i = 0; i < loose; i++) {
      const cube = new T.Mesh(
        boxGeometry(T, 0.42, 0.42, 0.42),
        soft(T, { color: looseColors[i % looseColors.length] })
      );
      cube.position.set(1.2 + rand() * 2.4, 0.22, 0.4 + rand() * 1.6);
      cube.rotation.y = rand() * Math.PI;
      cube.castShadow = this.q.shadows;
      this.scene.add(cube);
    }

    // --- creative corner: easel ------------------------------------------
    const easelBoard = new T.Mesh(boxGeometry(T, 1.9, 2.1, 0.12), soft(T, { color: PALETTE.cream50 }));
    easelBoard.position.set(3.9, 1.6, -2.0);
    easelBoard.rotation.y = -0.4;
    this.scene.add(easelBoard);

    const legMat = soft(T, { color: PALETTE.sand });
    [-0.7, 0.7].forEach((dx) => {
      const leg = new T.Mesh(pillGeometry(T, 0.07, 2.4, 6), legMat);
      leg.position.set(3.9 + dx * Math.cos(-0.4), 1.2, -2.0 + dx * Math.sin(-0.4) + 0.3);
      leg.rotation.x = 0.16;
      this.scene.add(leg);
    });

    const paintBrush = brush(T, PALETTE.coral500);
    paintBrush.scale.setScalar(0.6);
    paintBrush.position.set(4.7, 0.5, -1.1);
    paintBrush.rotation.z = 0.9;
    this.scene.add(paintBrush);

    // A splash of colour on the easel — a child's painting, abstractly.
    [PALETTE.blush, PALETTE.teal400, PALETTE.gold400].forEach((c, i) => {
      const daub = new T.Mesh(sphereGeometry(T, 0.24, 10), soft(T, { color: c }));
      daub.scale.set(1, 1, 0.18);
      daub.position.set(3.6 + i * 0.34, 1.9 - i * 0.34, -1.9);
      daub.rotation.y = -0.4;
      this.scene.add(daub);
    });

    // --- meal table -------------------------------------------------------
    const tableTop = new T.Mesh(boxGeometry(T, 3.0, 0.16, 1.7), soft(T, { color: PALETTE.cream50 }));
    tableTop.position.set(0.5, 0.86, 1.9);
    tableTop.castShadow = this.q.shadows;
    this.scene.add(tableTop);

    const tLeg = soft(T, { color: PALETTE.sand });
    [
      [-1.3, -0.7],
      [1.3, -0.7],
      [-1.3, 0.7],
      [1.3, 0.7],
    ].forEach(([dx, dz]) => {
      const leg = new T.Mesh(pillGeometry(T, 0.08, 0.86, 6), tLeg);
      leg.position.set(0.5 + dx, 0.43, 1.9 + dz);
      this.scene.add(leg);
    });

    // Small chairs, only on higher tiers — they are charm, not information.
    if (this.q.detail > 0.5) {
      [
        [-1.0, 2.9, 0],
        [1.0, 2.9, 0],
        [-1.0, 0.9, Math.PI],
        [1.0, 0.9, Math.PI],
      ].forEach(([dx, dz, ry]) => {
        const seat = new T.Mesh(boxGeometry(T, 0.5, 0.1, 0.5), soft(T, { color: PALETTE.marigold }));
        seat.position.set(0.5 + dx, 0.52, dz);
        const back = new T.Mesh(boxGeometry(T, 0.5, 0.6, 0.09), soft(T, { color: PALETTE.marigold }));
        back.position.set(0.5 + dx, 0.82, dz + Math.cos(ry) * -0.22);
        this.scene.add(seat, back);
      });
    }

    const plate = new T.Mesh(sphereGeometry(T, 0.26, 12), soft(T, { color: PALETTE.cream100 }));
    plate.scale.y = 0.18;
    plate.position.set(0.5, 0.96, 1.9);
    const apple = new T.Mesh(sphereGeometry(T, 0.17, 10), soft(T, { color: PALETTE.coral500, flat: false }));
    apple.position.set(0.5, 1.06, 1.9);
    this.scene.add(plate, apple);

    // --- rest corner: mats -------------------------------------------------
    [0, 1, 2].forEach((i) => {
      const mat = new T.Mesh(boxGeometry(T, 1.5, 0.16, 0.9), soft(T, { color: PALETTE.ink500, transparent: 0.85 }));
      mat.position.set(-4.4, 0.09, -3.4 + i * 1.15);
      this.scene.add(mat);
      const pillow = new T.Mesh(boxGeometry(T, 0.5, 0.16, 0.42), soft(T, { color: PALETTE.cream50 }));
      pillow.position.set(-4.95, 0.22, -3.4 + i * 1.15);
      this.scene.add(pillow);
    });

    // A crescent of little stars above the rest corner, for atmosphere.
    if (this.q.detail > 0.4) {
      for (let i = 0; i < 5; i++) {
        const s = new T.Mesh(starGeometry(T, 5, 1, 0.44, 0.14), lit(T, PALETTE.gold200, 0.85));
        s.scale.setScalar(0.12 + rand() * 0.06);
        s.position.set(-4.9 + rand() * 1.4, 2.3 + rand() * 1.1, -3.6 + rand() * 2.2);
        s.rotation.z = rand() * Math.PI;
        this.scene.add(s);
      }
    }

    // --- greenery ---------------------------------------------------------
    const pot = new T.Mesh(pillGeometry(T, 0.32, 0.5, 8), soft(T, { color: PALETTE.coral700 }));
    pot.position.set(-9.4, 0.25, 1.4);
    this.scene.add(pot);
    for (let i = 0; i < 5; i++) {
      const leaf = new T.Mesh(leafGeometry(T, 1.0), soft(T, { color: PALETTE.teal600 }));
      leaf.scale.setScalar(0.7);
      leaf.position.set(-9.4, 0.85 + i * 0.12, 1.4);
      leaf.rotation.set(0.5, (i / 5) * Math.PI * 2, 0.5);
      this.scene.add(leaf);
    }
  }

  private buildOutdoors() {
    const T = this.THREE;

    // Beyond the side of the room: turf, a fence and a slide. Symbolic, and
    // matched to the real thing — the actual outdoor area is fenced, on turf,
    // with a climbing structure.
    const turf = new T.Mesh(boxGeometry(T, 7, 0.3, 8), soft(T, { color: 0x86b96a, flat: false }));
    turf.position.set(7.6, -0.15, -2.4);
    this.scene.add(turf);

    const fenceMat = soft(T, { color: PALETTE.sand });
    for (let i = 0; i < 8; i++) {
      const plank = new T.Mesh(boxGeometry(T, 0.22, 1.6, 0.1), fenceMat);
      plank.position.set(10.9, 0.8, -6 + i * 1.05);
      this.scene.add(plank);
    }

    const platform = new T.Mesh(boxGeometry(T, 1.5, 0.16, 1.5), soft(T, { color: PALETTE.marigold }));
    platform.position.set(6.8, 1.3, -2.8);
    const slide = new T.Mesh(boxGeometry(T, 0.9, 0.12, 2.6), soft(T, { color: PALETTE.coral500 }));
    slide.position.set(6.8, 0.75, -1.4);
    slide.rotation.x = -0.42;
    const roof = new T.Mesh(
      this.THREE.ConeGeometry ? new T.ConeGeometry(1.3, 0.8, 4) : boxGeometry(T, 1, 1, 1),
      soft(T, { color: PALETTE.teal400 })
    );
    roof.position.set(6.8, 2.4, -2.8);
    roof.rotation.y = Math.PI / 4;
    this.scene.add(platform, slide, roof);

    [-0.55, 0.55].forEach((dx) => {
      [-0.55, 0.55].forEach((dz) => {
        const post = new T.Mesh(pillGeometry(T, 0.1, 1.4, 6), soft(T, { color: PALETTE.sand }));
        post.position.set(6.8 + dx, 0.7, -2.8 + dz);
        this.scene.add(post);
      });
    });
  }

  private buildMotes() {
    const T = this.THREE;
    const count = Math.round(140 * this.q.particles);
    const pos = new Float32Array(count * 3);
    const rand = seeded(777);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 20;
      pos[i * 3 + 1] = rand() * 5.5;
      pos[i * 3 + 2] = (rand() - 0.5) * 13;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const m = new T.PointsMaterial({
      color: PALETTE.gold200,
      size: 0.06,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.motes = new T.Points(g, m);
    this.motes.userData.ownsResources = true;
    this.scene.add(this.motes);
  }

  /* ------------------------------------------------------------ hotspots */

  private buildHotspots() {
    const T = this.THREE;
    dayZones.forEach((zone) => {
      const marker = new T.Mesh(sphereGeometry(T, 0.26, 14), lit(T, zone.color, 0.95));
      marker.position.set(...zone.at);

      // A larger invisible ring is the actual pick target — a 0.26 sphere is a
      // cruel thing to ask a thumb to hit.
      const ring = new T.Mesh(sphereGeometry(T, 0.66, 12), lit(T, zone.color, 0.0));
      ring.position.copy(marker.position);
      ring.userData.zone = zone.id;

      this.scene.add(marker, ring);
      this.hotspots.push({ zone, marker, ring, glow: 0 });
    });
  }

  /* --------------------------------------------------------------- input */

  private listen() {
    const canvas = this.renderer.domElement;

    const setNdc = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.targetPointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.targetPointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setNdc(e);
      const hit = this.pick();
      if (hit !== this.hovered) {
        this.hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : '';
        this.mount.dispatchEvent(
          new CustomEvent('ts:zone-hover', { detail: { id: hit }, bubbles: true })
        );
      }
    };

    const click = (e: PointerEvent) => {
      setNdc(e);
      const hit = this.pick();
      if (!hit) return;
      this.goTo(hit);
      this.mount.dispatchEvent(
        new CustomEvent('ts:zone-select', { detail: { id: hit }, bubbles: true })
      );
    };

    canvas.addEventListener('pointermove', move, { passive: true });
    canvas.addEventListener('click', click as EventListener);
    this.detach.push(
      () => canvas.removeEventListener('pointermove', move),
      () => canvas.removeEventListener('click', click as EventListener)
    );

    // Driven from outside: the HTML zone buttons, and the concierge.
    const onGo = (e: Event) => {
      const id = (e as CustomEvent<{ id: string | null }>).detail?.id ?? null;
      id ? this.goTo(id) : this.goHome();
    };
    this.mount.addEventListener('ts:zone', onGo);
    this.detach.push(() => this.mount.removeEventListener('ts:zone', onGo));
  }

  private pick(): string | null {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObjects(
      this.hotspots.map((h) => h.ring),
      false
    )[0];
    return (hit?.object.userData.zone as string) ?? null;
  }

  /* -------------------------------------------------------------- camera */

  private goTo(id: string) {
    const zone = dayZones.find((z) => z.id === id);
    if (!zone) return;
    this.active = id;
    this.from = {
      pos: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      look: [this.lookAt.x, this.lookAt.y, this.lookAt.z],
    };
    this.to = { pos: [...zone.cam], look: [...zone.look] };
    this.flight = 0;
  }

  private goHome() {
    this.active = null;
    this.from = {
      pos: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      look: [this.lookAt.x, this.lookAt.y, this.lookAt.z],
    };
    this.to = { pos: [...this.home.pos], look: [...this.home.look] };
    this.flight = 0;
  }

  protected layout(w: number, h: number) {
    const aspect = w / Math.max(1, h);
    // On a phone the room is viewed from further back and higher, so the whole
    // space stays legible instead of becoming a corridor.
    this.home =
      aspect < 0.95
        ? { pos: [0.4, 8.4, 15.5], look: [0, 0.6, -1.2] }
        : aspect < 1.5
          ? { pos: [0.4, 6.8, 13.8], look: [0, 0.6, -0.9] }
          : { pos: [0.4, 5.6, 12.4], look: [0, 0.6, -0.6] };
    if (!this.active) {
      this.to = { pos: [...this.home.pos], look: [...this.home.look] };
      if (this.flight >= 1) {
        this.camera.position.set(...this.home.pos);
        this.lookAt.set(...this.home.look);
        this.camera.lookAt(this.lookAt);
      }
    }
  }

  /* --------------------------------------------------------------- frame */

  protected update(dt: number, t: number) {
    if (this.flight < 1) {
      this.flight = Math.min(1, this.flight + dt / this.duration);
      const k = ease(this.flight);
      this.camera.position.set(
        lerp(this.from.pos[0], this.to.pos[0], k),
        lerp(this.from.pos[1], this.to.pos[1], k),
        lerp(this.from.pos[2], this.to.pos[2], k)
      );
      this.lookAt.set(
        lerp(this.from.look[0], this.to.look[0], k),
        lerp(this.from.look[1], this.to.look[1], k),
        lerp(this.from.look[2], this.to.look[2], k)
      );
    }

    // A whisper of pointer drift once the flight has landed, so a parked camera
    // still feels alive without ever fighting the flight itself.
    if (this.q.parallax && this.flight >= 1) {
      this.pointer.x = damp(this.pointer.x, this.targetPointer.x, 1.6, dt);
      this.pointer.y = damp(this.pointer.y, this.targetPointer.y, 1.6, dt);
      this.camera.position.x = this.to.pos[0] + this.pointer.x * 0.34;
      this.camera.position.y = this.to.pos[1] + this.pointer.y * -0.2;
    }

    this.camera.lookAt(this.lookAt);

    const focus = this.active ?? this.hovered;
    for (const h of this.hotspots) {
      const want = focus === h.zone.id ? 1 : this.active ? 0.15 : 0.55;
      h.glow = damp(h.glow, want, 6, dt);
      const bob = Math.sin(t * 1.6 + h.zone.at[0]) * 0.06;
      h.marker.position.y = h.zone.at[1] + bob + h.glow * 0.1;
      h.marker.scale.setScalar(0.7 + h.glow * 0.7);
      (h.marker.material as THREE_NS.MeshBasicMaterial).opacity = 0.45 + h.glow * 0.55;
      h.ring.position.copy(h.marker.position);
    }

    if (this.motes) this.motes.rotation.y = t * 0.012;
  }

  dispose() {
    this.detach.forEach((fn) => fn());
    this.detach.length = 0;
    this.hotspots.length = 0;
    super.dispose();
  }
}

export function create(mount: HTMLElement) {
  return new DayStage({
    mount,
    label:
      'An illustrated model of a daycare room, with markers for arrival, learning, play, creative time, meals, rest, the outdoor area and pick-up. Every marker is also a button in the list below.',
    loop: 'always',
    fov: 38,
  });
}
