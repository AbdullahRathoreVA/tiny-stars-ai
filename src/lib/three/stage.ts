/**
 * TinyStarsStage — the lifecycle every 3D scene on this site shares.
 *
 * Handles the unglamorous parts that decide whether 3D is a delight or a
 * battery complaint:
 *
 *  - renders only when visible, only when the tab is focused, and (where a
 *    scene opts in) only when something actually changed
 *  - watches frame timing and steps the whole site down a tier if needed
 *  - disposes every geometry, material, texture and the GL context itself on
 *    teardown, so navigating away does not leak GPU memory
 *  - never throws into the page: if WebGL dies, the canvas removes itself and
 *    the HTML underneath is simply what the visitor gets
 *
 * Subclasses implement `build()` and optionally `update()`.
 */

import type * as THREE_NS from 'three';
import { quality, FrameMonitor, downgrade, type QualitySettings } from './quality';

type THREE = typeof THREE_NS;

export interface StageOptions {
  /** Element the canvas is appended to. Must be positioned. */
  mount: HTMLElement;
  /** Text alternative for the canvas. Required — it is a real image to a screen reader. */
  label: string;
  /**
   * `always` renders every frame; `on-demand` renders only when a scene calls
   * `invalidate()`. Prefer on-demand for anything that is not ambiently moving.
   */
  loop?: 'always' | 'on-demand';
  /** Camera field of view. */
  fov?: number;
  /** Transparent canvas so the page background shows through. */
  alpha?: boolean;
}

export abstract class Stage {
  protected THREE!: THREE;
  protected renderer!: THREE_NS.WebGLRenderer;
  protected scene!: THREE_NS.Scene;
  protected camera!: THREE_NS.PerspectiveCamera;
  protected clock!: THREE_NS.Clock;
  protected q: QualitySettings;

  readonly mount: HTMLElement;
  private canvas?: HTMLCanvasElement;
  private raf = 0;
  private running = false;
  private visible = false;
  private disposed = false;
  private dirty = true;
  private monitor?: FrameMonitor;
  private io?: IntersectionObserver;
  private ro?: ResizeObserver;
  private readonly cleanups: (() => void)[] = [];
  protected readonly opts: Required<StageOptions>;

  constructor(options: StageOptions) {
    this.mount = options.mount;
    this.q = quality();
    this.opts = {
      loop: 'always',
      fov: 45,
      alpha: true,
      ...options,
    } as Required<StageOptions>;
  }

  /** Build the scene graph. Called once, after Three.js has loaded. */
  protected abstract build(): void | Promise<void>;

  /** Per-frame update. `dt` is seconds. Only called while visible. */
  protected update(_dt: number, _elapsed: number): void {}

  /** Called on resize, after the camera aspect has been corrected. */
  protected layout(_w: number, _h: number): void {}

  /* ------------------------------------------------------------- lifecycle */

  async start(): Promise<boolean> {
    if (this.disposed) return false;

    try {
      // Three.js is only ever fetched here — it is never in the initial bundle.
      this.THREE = await import('three');
    } catch (err) {
      // Logged because this branch and the renderer branch below both end at
      // the same one-line warning, which makes a failed scene impossible to
      // diagnose: a chunk that never arrived and a GPU that refused a context
      // look identical from the outside.
      if (import.meta.env.DEV) console.error('[tiny-stars] three.js failed to load', err);
      this.fail();
      return false;
    }

    const T = this.THREE;
    const { clientWidth: w, clientHeight: h } = this.mount;

    try {
      this.renderer = new T.WebGLRenderer({
        alpha: this.opts.alpha,
        antialias: this.q.antialias,
        powerPreference: 'default',
        // Depth-only scenes do not need a stencil buffer.
        stencil: false,
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[tiny-stars] WebGL context refused', err);
      this.fail();
      return false;
    }

    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', this.opts.label);
    // The canvas is decoration layered under real HTML; it must never take focus
    // or intercept a tap meant for a control unless a scene opts in.
    this.canvas.tabIndex = -1;
    this.canvas.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.dpr));
    this.renderer.setSize(w || 1, h || 1, false);
    this.renderer.shadowMap.enabled = this.q.shadows;
    if (this.q.shadows) this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(this.opts.fov, (w || 1) / (h || 1), 0.1, 100);
    this.clock = new T.Clock();

    this.mount.appendChild(this.canvas);

    try {
      await this.build();
    } catch (err) {
      if (import.meta.env.DEV) console.error('[tiny-stars] scene build failed', err);
      this.fail();
      return false;
    }

    // A lost context is recoverable in principle, but on a childcare site the
    // right answer is to stop cleanly and let the HTML carry the page.
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.fail();
    });

    this.observe();
    this.monitor = new FrameMonitor(() => {
      const next = downgrade('frame budget');
      if (next) this.applyQuality(next);
    });

    this.mount.dataset.stage = 'ready';
    return true;
  }

  /** Request a render on the next frame. Only meaningful in `on-demand` mode. */
  invalidate() {
    this.dirty = true;
    if (this.opts.loop === 'on-demand' && this.visible && !this.running) this.run();
  }

  private observe() {
    // Pause entirely when the scene scrolls away.
    this.io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        this.visible ? this.run() : this.halt();
      },
      { rootMargin: '120px' }
    );
    this.io.observe(this.mount);

    // Pause entirely when the tab is hidden.
    const onVisibility = () => {
      if (document.hidden) this.halt();
      else if (this.visible) this.run();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

    // Resize with the container, not the window — the mount may be a column.
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.mount);
    } else {
      const onResize = () => this.resize();
      window.addEventListener('resize', onResize, { passive: true });
      this.cleanups.push(() => window.removeEventListener('resize', onResize));
    }
  }

  private resize() {
    if (this.disposed || !this.renderer) return;
    const w = this.mount.clientWidth || 1;
    const h = this.mount.clientHeight || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.dpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.layout(w, h);
    this.dirty = true;
    if (!this.running && this.visible) this.run();
  }

  private run() {
    if (this.running || this.disposed || document.hidden) return;
    this.running = true;
    this.clock.getDelta(); // discard the gap accumulated while paused
    const frame = (now: number) => {
      if (!this.running || this.disposed) return;
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.monitor?.tick(now);

      if (this.opts.loop === 'always' || this.dirty) {
        this.update(dt, this.clock.elapsedTime);
        this.renderer.render(this.scene, this.camera);
        this.dirty = false;
      }

      // On-demand scenes stop the loop as soon as nothing is pending, so an
      // idle page costs literally zero frames.
      if (this.opts.loop === 'on-demand' && !this.dirty) {
        this.running = false;
        return;
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private halt() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Re-apply settings after a downgrade. Scenes may override to shed geometry. */
  protected applyQuality(q: QualitySettings) {
    this.q = q;
    if (!this.renderer) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
    this.renderer.shadowMap.enabled = q.shadows;
    this.dirty = true;
  }

  /** Remove the canvas and hand the page back to HTML. Never throws. */
  protected fail() {
    if (import.meta.env.DEV) console.warn('[tiny-stars] 3D unavailable, falling back');
    this.mount.dataset.stage = 'failed';
    this.dispose();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.halt();
    this.monitor?.stop();
    this.io?.disconnect();
    this.ro?.disconnect();
    this.cleanups.forEach((fn) => fn());
    this.cleanups.length = 0;

    // Walk the graph and release every GPU resource we created.
    this.scene?.traverse((obj) => {
      const mesh = obj as THREE_NS.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE_NS.Material | THREE_NS.Material[] | undefined;
      const materials = Array.isArray(mat) ? mat : mat ? [mat] : [];
      materials.forEach((m) => {
        Object.values(m).forEach((v) => {
          if (v && typeof v === 'object' && 'isTexture' in v) {
            (v as THREE_NS.Texture).dispose();
          }
        });
        m.dispose();
      });
    });
    this.scene?.clear();

    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.canvas?.remove();
    this.canvas = undefined;
  }

  /** Convenience for subclasses that need pointer input on the canvas. */
  protected enablePointerEvents() {
    if (this.canvas) this.canvas.style.pointerEvents = 'auto';
  }

  get tier() {
    return this.q.tier;
  }
}

/**
 * Mount a stage lazily: waits until the element is near the viewport, checks
 * that 3D is wanted at all, then dynamically imports the scene module.
 *
 * Returns a disposer so page-level code can tear a scene down on navigation.
 */
export function mountStage(
  el: HTMLElement,
  load: () => Promise<{ create: (mount: HTMLElement) => Stage }>
): () => void {
  const q = quality();
  if (q.tier === 'minimal') {
    el.dataset.stage = 'skipped';
    return () => {};
  }

  let stage: Stage | undefined;
  let cancelled = false;

  const io = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      try {
        const mod = await load();
        if (cancelled) return;
        stage = mod.create(el);
        const ok = await stage.start();
        if (!ok) stage = undefined;
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[tiny-stars] stage load failed', err);
        el.dataset.stage = 'failed';
      }
    },
    { rootMargin: '300px' }
  );
  io.observe(el);

  const onUnload = () => stage?.dispose();
  window.addEventListener('pagehide', onUnload);

  return () => {
    cancelled = true;
    io.disconnect();
    window.removeEventListener('pagehide', onUnload);
    stage?.dispose();
  };
}
