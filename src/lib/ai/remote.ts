/**
 * The hosted provider, client side.
 *
 * A thin fetch wrapper around `/api/concierge` — deliberately thin, because all
 * of the judgement (guardrails, retrieval, the rewrite, the second output check)
 * happens on the server where the API key lives.
 *
 * Every failure path ends at the local provider. Network down, endpoint missing
 * because the site was deployed as pure static, cold start too slow, malformed
 * response: the parent still gets the offline answer. The assistant degrades to
 * exactly what the site shipped with, which is a working assistant.
 */

import { localProvider } from './local';
import { registerProvider, type AIProvider, type AIRequest, type AIResponse } from './provider';

/** Longer than the server's own model timeout, so the server can fall back first. */
const TIMEOUT_MS = 9000;

function looksLikeResponse(v: unknown): v is AIResponse {
  return Boolean(v) && typeof (v as AIResponse).text === 'string';
}

export const remoteProvider: AIProvider = {
  id: 'groq',
  label: 'Stella (Groq)',
  requiresNetwork: true,
  costPerTurn: 'metered',

  async respond(req: AIRequest): Promise<AIResponse> {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), TIMEOUT_MS);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        signal: control.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`http ${res.status}`);

      const data = await res.json();
      if (!looksLikeResponse(data)) throw new Error('shape');
      return data;
    } catch (err) {
      const local = await localProvider.respond(req);
      const why = err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'unreachable';
      return { ...local, flags: [...local.flags, `remote:fallback:${why}`] };
    } finally {
      clearTimeout(timer);
    }
  },
};

registerProvider(remoteProvider);
