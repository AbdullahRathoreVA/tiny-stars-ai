/**
 * The agent network, for the Command Centre.
 *
 * Two deliberate restraints keep this from becoming the "hacker dashboard" the
 * brief rules out:
 *
 *  1. Idle means idle. Connections sit dim and still. Nothing pulses until a
 *     real routed message actually travels the path — which happens when a
 *     visitor uses the probe on that page, driven by the same router the
 *     concierge uses.
 *  2. Agents that are designed but not built render dimmer and never pulse,
 *     because they never run. The picture is honest at a glance.
 */

import type * as THREE_NS from 'three';
import { Stage } from '../stage';
import { agents } from '../../ai/agents';
import { PALETTE, sphereGeometry, starGeometry, lit, damp, seeded } from '../kit';

const ACCENT: Record<string, number> = {
  coral: PALETTE.coral500,
  teal: PALETTE.teal400,
  marigold: PALETTE.marigold,
  violet: PALETTE.violet,
  sky: PALETTE.sky,
  blush: PALETTE.blush,
};

interface Node {
  id: string;
  live: boolean;
  mesh: THREE_NS.Mesh;
  halo: THREE_NS.Mesh;
  home: THREE_NS.Vector3;
  phase: number;
  glow: number;
  target: number;
}

interface Link {
  id: string;
  line: THREE_NS.Line;
  mat: THREE_NS.LineBasicMaterial;
  base: number;
  pulse: number;
}

class AgentStage extends Stage {
  private nodes: Node[] = [];
  private links: Link[] = [];
  private core?: THREE_NS.Mesh;
  private detach: (() => void)[] = [];

  protected build() {
    const T = this.THREE;
    const rand = seeded(1024);

    this.camera.position.set(0, 0, 13);

    // Flat, unlit look on purpose — this view is a diagram, not a room.
    this.scene.add(new T.AmbientLight(0xffffff, 1));

    this.core = new T.Mesh(starGeometry(T, 6, 1, 0.5, 0.24), lit(T, PALETTE.gold400));
    this.core.scale.setScalar(0.62);
    this.scene.add(this.core);

    const ring = agents.filter((a) => a.triggers.length > 0 || !a.live);
    ring.forEach((agent, i) => {
      const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
      // Live agents sit on an inner ring, future ones further out — the layout
      // itself says which is which before you read a label.
      const radius = agent.live ? 3.4 : 5.2;
      const home = new T.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.62,
        (rand() - 0.5) * 1.2
      );

      const color = ACCENT[agent.accent] ?? PALETTE.gold400;
      const mesh = new T.Mesh(sphereGeometry(T, 0.22, 14), lit(T, color, agent.live ? 1 : 0.4));
      mesh.position.copy(home);

      const halo = new T.Mesh(sphereGeometry(T, 0.5, 12), lit(T, color, agent.live ? 0.1 : 0.04));
      halo.position.copy(home);

      this.scene.add(mesh, halo);
      this.nodes.push({
        id: agent.id,
        live: agent.live,
        mesh,
        halo,
        home,
        phase: rand() * 6.28,
        glow: 0,
        target: 0,
      });

      const geometry = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), home.clone()]);
      const mat = new T.LineBasicMaterial({
        color: agent.live ? color : PALETTE.ink500,
        transparent: true,
        opacity: agent.live ? 0.16 : 0.07,
      });
      const line = new T.Line(geometry, mat);
      line.userData.ownsResources = true;
      this.scene.add(line);
      this.links.push({ id: agent.id, line, mat, base: agent.live ? 0.16 : 0.07, pulse: 0 });
    });

    // The page tells us which agent actually handled a message.
    const onRoute = (e: Event) => {
      const id = (e as CustomEvent<{ agent: string }>).detail?.agent;
      if (!id) return;
      this.nodes.forEach((n) => (n.target = n.id === id ? 1 : 0));
      const link = this.links.find((l) => l.id === id);
      if (link) link.pulse = 1;
    };
    this.mount.addEventListener('ts:agent', onRoute);
    this.detach.push(() => this.mount.removeEventListener('ts:agent', onRoute));

    this.layout(this.mount.clientWidth, this.mount.clientHeight);
  }

  protected layout(w: number, h: number) {
    const aspect = w / Math.max(1, h);
    this.camera.position.z = aspect < 1 ? 17 : aspect < 1.5 ? 15 : 13;
  }

  protected update(dt: number, t: number) {
    if (this.core) this.core.rotation.z = t * 0.12;

    for (const n of this.nodes) {
      n.glow = damp(n.glow, n.target, 4, dt);
      // Live agents breathe very slightly; future ones are completely still.
      const bob = n.live ? Math.sin(t * 0.6 + n.phase) * 0.05 : 0;
      n.mesh.position.y = n.home.y + bob;
      n.halo.position.y = n.mesh.position.y;
      n.mesh.scale.setScalar(1 + n.glow * 0.6);
      (n.halo.material as THREE_NS.MeshBasicMaterial).opacity =
        (n.live ? 0.1 : 0.04) + n.glow * 0.3;
      n.halo.scale.setScalar(1 + n.glow * 0.5);
    }

    for (const l of this.links) {
      if (l.pulse > 0) l.pulse = Math.max(0, l.pulse - dt * 0.9);
      l.mat.opacity = l.base + l.pulse * 0.7;
    }
  }

  dispose() {
    this.detach.forEach((fn) => fn());
    this.detach.length = 0;
    this.nodes.length = 0;
    this.links.length = 0;
    super.dispose();
  }
}

export function create(mount: HTMLElement) {
  return new AgentStage({
    mount,
    label:
      'A diagram of the Tiny Stars agent network: eight running agents on an inner ring and five designed-but-unbuilt agents further out, all connected to a central concierge.',
    loop: 'always',
    fov: 45,
  });
}
