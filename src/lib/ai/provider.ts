/**
 * AIProvider — the seam between the Tiny Stars experience and whoever generates
 * the words.
 *
 * The entire concierge UI, the agent router, the guardrails and the Command Centre
 * talk to this interface and nothing else. Swapping the local provider for
 * Anthropic, OpenAI, Google or a self-hosted model is a one-line registration:
 * no component, no page and no test changes.
 *
 * The demo ships `local` — deterministic, retrieval-only, zero cost, works offline,
 * and structurally incapable of inventing a fact. That is not a stopgap: for a
 * childcare site it is a defensible production choice, and a hosted model would be
 * an upgrade in phrasing, not in truthfulness.
 */

import type { Trust } from '../../data/knowledge';
import type { AgentId } from './agents';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

export interface SessionContext {
  /** What the visitor told us they are here for, if anything. */
  intent?: string;
  /** Program slug the visitor has been reading. Session-only, never stored. */
  program?: string;
  /** Child age in months, if the visitor volunteered it. */
  ageMonths?: number;
  path: string;
}

export interface AIRequest {
  message: string;
  history: Turn[];
  context: SessionContext;
}

export interface Source {
  label: string;
  href?: string;
}

export interface Action {
  label: string;
  href: string;
  /** `primary` renders as a filled button; at most one per response. */
  kind?: 'primary' | 'secondary';
}

export interface AIResponse {
  text: string;
  trust: Trust;
  sources: Source[];
  actions: Action[];
  agent: AgentId;
  /** True when the honest answer is "a person should handle this". */
  handoff: boolean;
  /** 0..1 retrieval confidence. Below ~0.35 the provider should hand off. */
  confidence: number;
  /** Follow-up questions to offer as chips. */
  followUps: string[];
  /** Guardrail notes, surfaced in the Command Centre, never to the visitor. */
  flags: string[];
}

export interface AIProvider {
  id: string;
  label: string;
  /** False means the provider works with no network and no API key. */
  requiresNetwork: boolean;
  /** Rough cost signal for the Command Centre. */
  costPerTurn: 'free' | 'metered';
  respond(req: AIRequest): Promise<AIResponse>;
}

const registry = new Map<string, AIProvider>();

export function registerProvider(p: AIProvider): void {
  registry.set(p.id, p);
}

export function listProviders(): AIProvider[] {
  return Array.from(registry.values());
}

/**
 * Resolves the active provider. Reads PUBLIC_AI_PROVIDER when present so a deploy
 * can switch providers without a code change, and falls back to `local` whenever
 * the requested provider is not registered — the assistant must never hard-fail.
 */
export function getProvider(preferred?: string): AIProvider {
  const wanted =
    preferred ??
    (typeof import.meta !== 'undefined'
      ? (import.meta.env?.PUBLIC_AI_PROVIDER as string | undefined)
      : undefined) ??
    'local';
  return registry.get(wanted) ?? registry.get('local')!;
}

/* ---------------------------------------------------------------------------
 * Future providers
 * ---------------------------------------------------------------------------
 * A hosted provider is implemented exactly like the local one, with two rules:
 *
 *  1. The API key is read server-side only. A key must never reach the browser,
 *     so a hosted provider requires an endpoint (Astro `/api/concierge`) and the
 *     client provider becomes a thin fetch wrapper around it.
 *
 *  2. Retrieval still happens locally, and the retrieved knowledge entries are the
 *     ONLY factual material passed to the model. The model rewrites; it does not
 *     recall. `checkOutput` then runs on whatever comes back, so an invented fee or
 *     a claimed booking is caught before a family ever reads it.
 *
 * Sketch:
 *
 *   registerProvider({
 *     id: 'anthropic',
 *     label: 'Claude',
 *     requiresNetwork: true,
 *     costPerTurn: 'metered',
 *     async respond(req) {
 *       const retrieved = retrieve(req);                  // same retrieval as local
 *       const res = await fetch('/api/concierge', {
 *         method: 'POST',
 *         headers: { 'content-type': 'application/json' },
 *         body: JSON.stringify({ message: req.message, retrieved }),
 *       });
 *       return shape(await res.json(), retrieved);        // guardrails applied here
 *     },
 *   });
 */

/* Voice is a later phase. These interfaces exist so the website never has to be
 * rewritten to accommodate it — a voice channel is another transport in front of
 * the same router, agents and guardrails. Nothing here is implemented yet. */
export interface VoiceProvider {
  id: string;
  speak(text: string): Promise<void>;
  listen(): AsyncIterable<string>;
}

export interface TelephonyProvider {
  id: string;
  onInboundCall(handler: (from: string) => Promise<void>): void;
}

export interface BookingProvider {
  id: string;
  /** Returns real availability, or null when the integration cannot confirm it. */
  availability(date: string): Promise<string[] | null>;
  hold(slot: string, contact: Record<string, string>): Promise<{ reference: string } | null>;
}
