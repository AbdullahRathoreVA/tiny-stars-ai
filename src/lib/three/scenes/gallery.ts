/**
 * A drifting wall of real photographs, used as ambience behind the gallery and
 * virtual-tour headers.
 *
 * Two things this scene deliberately does *not* do:
 *
 *  - It does not replace the gallery. The masonry grid below it filters, opens a
 *    lightbox, takes keyboard input and has real alt text. That is the gallery.
 *  - It never distorts a photograph. Each plane takes its aspect ratio from the
 *    loaded image, so nothing is stretched to fit a slot.
 *
 * Only the top two tiers get it at all: eight extra image decodes is a real
 * cost, and it buys atmosphere rather than information.
 */

import type * as THREE_NS from 'three';
import { Stage } from '../stage';
import { PALETTE, starfield, damp, seeded } from '../kit';

/** A small, hand-picked subset — the widest and most characterful frames. */
const SOURCES = [
  '/assets/images/gallery/gallery-15.webp',
  '/assets/images/gallery/gallery-9.webp',
  '/assets/images/gallery/gallery-5.webp',
  '/assets/images/gallery/gallery-2.webp',
  '/assets/images/gallery/gallery-17.webp',
  '/assets/images/gallery/gallery-12.webp',
  '/assets/images/gallery/gallery-1.webp',
  '/assets/images/gallery/gallery-13.webp',
];

interface Panel {
  mesh: THREE_NS.Mesh;
  speed: number;
  phase: number;
  baseX: number;
  baseY: number;
}

class GalleryStage extends Stage {
  private panels: Panel[] = [];
  private field?: THREE_NS.Points;
  private pointer = { x: 0, y: 0 };
  private target = { x: 0, y: 0 };
  private detach: (() => void)[] = [];
  private owned: (THREE_NS.Texture | THREE_NS.BufferGeometry | THREE_NS.Material)[] = [];

  protected async build() {
    const T = this.THREE;
    const rand = seeded(60606);

    this.camera.position.set(0, 0, 8);
    this.scene.add(new T.AmbientLight(0xffffff, 1));

    const bg = Math.round(200 * this.q.particles);
    if (bg > 20) {
      this.field = starfield(T, bg, 22, PALETTE.gold200);
      this.field.position.z = -14;
      this.scene.add(this.field);
    }

    // Anything below `high` gets the starfield only — atmosphere without the
    // image decodes.
    if (this.q.tier !== 'ultra' && this.q.tier !== 'high') return;

    const loader = new T.TextureLoader();
    const count = Math.min(SOURCES.length, Math.round(4 + this.q.detail * 4));

    const loaded = await Promise.all(
      SOURCES.slice(0, count).map(
        (src) =>
          new Promise<THREE_NS.Texture | null>((resolve) => {
            loader.load(
              src,
              (tex) => resolve(tex),
              undefined,
              () => resolve(null) // a missing image must not break the scene
            );
          })
      )
    );

    loaded.forEach((tex, i) => {
      if (!tex) return;
      tex.colorSpace = T.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = T.LinearMipmapLinearFilter;
      this.owned.push(tex);

      const img = tex.image as { width: number; height: number };
      const aspect = img?.width && img?.height ? img.width / img.height : 4 / 3;

      const height = 2.1 + rand() * 0.7;
      const geometry = new T.PlaneGeometry(height * aspect, height);
      const material = new T.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      });
      this.owned.push(geometry, material);

      const mesh = new T.Mesh(geometry, material);
      const baseX = (rand() - 0.5) * 13;
      const baseY = (rand() - 0.5) * 5.5;
      mesh.position.set(baseX, baseY, -2 - i * 2.1 - rand() * 1.4);
      mesh.rotation.z = (rand() - 0.5) * 0.06;

      this.scene.add(mesh);
      this.panels.push({
        mesh,
        speed: 0.09 + rand() * 0.07,
        phase: rand() * 6.28,
        baseX,
        baseY,
      });
    });

    if (this.q.parallax) {
      const move = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        const r = this.mount.getBoundingClientRect();
        this.target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        this.target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      window.addEventListener('pointermove', move, { passive: true });
      this.detach.push(() => window.removeEventListener('pointermove', move));
    }
  }

  protected update(dt: number, t: number) {
    this.pointer.x = damp(this.pointer.x, this.target.x, 1.8, dt);
    this.pointer.y = damp(this.pointer.y, this.target.y, 1.8, dt);

    for (const p of this.panels) {
      p.mesh.position.z += p.speed * dt * 6;

      // Recycle to the back once a panel passes the camera.
      if (p.mesh.position.z > 6) {
        p.mesh.position.z = -20;
        (p.mesh.material as THREE_NS.MeshBasicMaterial).opacity = 0;
      }

      // Fade in from the distance and back out as it passes — no hard pops.
      const z = p.mesh.position.z;
      const near = Math.min(1, Math.max(0, (6 - z) / 5));
      const far = Math.min(1, Math.max(0, (z + 20) / 8));
      (p.mesh.material as THREE_NS.MeshBasicMaterial).opacity = near * far * 0.5;

      const depth = (z + 20) / 26;
      p.mesh.position.x = p.baseX + this.pointer.x * depth * 1.6;
      p.mesh.position.y = p.baseY + Math.sin(t * 0.3 + p.phase) * 0.12 - this.pointer.y * depth * 0.9;
    }

    if (this.field) this.field.rotation.y = t * 0.006;
  }

  dispose() {
    this.detach.forEach((fn) => fn());
    this.detach.length = 0;
    // Textures, geometries and materials here are per-instance, not kit-cached.
    this.owned.forEach((r) => r.dispose());
    this.owned.length = 0;
    this.panels.length = 0;
    super.dispose();
  }
}

export function create(mount: HTMLElement) {
  return new GalleryStage({
    mount,
    label: 'Decorative animation: photographs of the Tiny Stars rooms drifting slowly through a starfield.',
    loop: 'always',
    fov: 50,
  });
}
