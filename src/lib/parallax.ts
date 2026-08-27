/**
 * TinyStarsParallax — the CSS-only half of the depth system.
 *
 * Two behaviours, both capped hard:
 *
 *  - `data-tilt` elements set `--tx` / `--ty` from the pointer's position within
 *    the element, which the stylesheet turns into a rotation of at most 4°.
 *  - `data-parallax` elements set `--py` from their position in the viewport,
 *    which becomes a translation of at most 14px.
 *
 * Everything runs off a single rAF driven by pointer and scroll events, and
 * stops entirely when nothing is moving. There is no per-element listener and
 * no continuous loop.
 *
 * It refuses to run at all under reduced motion, on coarse pointers (a finger
 * has no hover, and tilt-on-tap is a gimmick), or at minimal quality.
 */

import { prefersReducedMotion, quality } from './three/quality';

interface TiltTarget {
  el: HTMLElement;
  tx: number;
  ty: number;
  toX: number;
  toY: number;
}

interface ParallaxTarget {
  el: HTMLElement;
  rate: number;
  py: number;
}

const CLAMP = (v: number) => Math.max(-1, Math.min(1, v));

export function initParallax(root: ParentNode = document) {
  if (typeof window === 'undefined') return () => {};
  if (prefersReducedMotion()) return () => {};
  if (quality().tier === 'minimal') return () => {};

  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const tilts: TiltTarget[] = fine
    ? Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]')).map((el) => ({
        el,
        tx: 0,
        ty: 0,
        toX: 0,
        toY: 0,
      }))
    : [];

  const layers: ParallaxTarget[] = Array.from(
    root.querySelectorAll<HTMLElement>('[data-parallax]')
  ).map((el) => ({
    el,
    rate: parseFloat(el.dataset.parallax || '0.5') || 0.5,
    py: 0,
  }));

  if (!tilts.length && !layers.length) return () => {};

  let raf = 0;
  let running = false;
  let settled = false;

  // Only elements currently on screen are ever written to.
  const onScreen = new WeakSet<HTMLElement>();
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) onScreen.add(e.target as HTMLElement);
        else onScreen.delete(e.target as HTMLElement);
      });
      kick();
    },
    { rootMargin: '10%' }
  );
  [...tilts.map((t) => t.el), ...layers.map((l) => l.el)].forEach((el) => io.observe(el));

  function frame() {
    settled = true;

    for (const t of tilts) {
      if (!onScreen.has(t.el)) continue;
      // Ease toward the pointer so a fast flick does not snap.
      t.tx += (t.toX - t.tx) * 0.14;
      t.ty += (t.toY - t.ty) * 0.14;
      if (Math.abs(t.toX - t.tx) > 0.002 || Math.abs(t.toY - t.ty) > 0.002) settled = false;
      t.el.style.setProperty('--tx', t.tx.toFixed(4));
      t.el.style.setProperty('--ty', t.ty.toFixed(4));
    }

    const vh = window.innerHeight || 1;
    for (const l of layers) {
      if (!onScreen.has(l.el)) continue;
      const r = l.el.getBoundingClientRect();
      // -1 at the bottom of the viewport, +1 at the top.
      const progress = CLAMP(1 - (r.top + r.height / 2) / (vh / 2));
      const next = progress * l.rate;
      if (Math.abs(next - l.py) > 0.002) settled = false;
      l.py = next;
      l.el.style.setProperty('--py', l.py.toFixed(4));
    }

    if (settled) {
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (running || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    for (const t of tilts) {
      if (!onScreen.has(t.el)) continue;
      const r = t.el.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) {
        t.toX = CLAMP(((e.clientX - r.left) / r.width - 0.5) * 2);
        t.toY = CLAMP(((e.clientY - r.top) / r.height - 0.5) * 2);
      } else if (t.toX !== 0 || t.toY !== 0) {
        // Return to rest once the pointer leaves.
        t.toX = 0;
        t.toY = 0;
      }
    }
    kick();
  };

  const onScroll = () => kick();
  const onVisibility = () => {
    if (!document.hidden) kick();
  };

  if (tilts.length) window.addEventListener('pointermove', onPointer, { passive: true });
  if (layers.length) window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  kick();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
    [...tilts, ...layers].forEach(({ el }) => {
      el.style.removeProperty('--tx');
      el.style.removeProperty('--ty');
      el.style.removeProperty('--py');
    });
  };
}
