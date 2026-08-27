/**
 * Shared text matching used by both global search and the concierge's retrieval.
 *
 * Small on purpose: a BM25-flavoured scorer plus bigram Dice similarity for typo
 * tolerance. No search library, no embeddings, no network. Runs in well under a
 * millisecond over a corpus this size.
 */

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'at', 'by', 'for', 'with',
  'about', 'to', 'from', 'in', 'on', 'is', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'i', 'you',
  'my', 'me', 'we', 'our', 'us', 'it', 'its', 'this', 'that', 'these', 'those',
  'there', 'here', 'what', 'when', 'where', 'who', 'how', 'why', 'which', 's',
]);

/** Light stemmer — enough to bridge plural/gerund forms without a dictionary. */
function stem(w: string): string {
  if (w.length <= 3) return w;
  return w
    .replace(/(ies)$/, 'y')
    .replace(/(sses|shes|ches|xes)$/, '')
    .replace(/([^s])s$/, '$1')
    .replace(/(ing|ed)$/, '');
}

export function tokenize(input: string, keepStopwords = false): string[] {
  return input
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && (keepStopwords || !STOP.has(t)))
    .map(stem);
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** Dice coefficient over character bigrams — 0..1. Cheap, and good at typos. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let hits = 0;
  A.forEach((g) => {
    if (B.has(g)) hits++;
  });
  return (2 * hits) / (A.size + B.size);
}

export interface Field {
  text: string;
  /** Multiplier for matches in this field. Titles outrank body copy. */
  weight: number;
}

export interface Scorable {
  id: string;
  fields: Field[];
}

interface Prepared {
  id: string;
  /** token -> accumulated weight */
  tf: Map<string, number>;
  length: number;
}

export class Index<T extends { id: string }> {
  private prepared: Prepared[] = [];
  private df = new Map<string, number>();
  private avgLen = 0;
  private items = new Map<string, T>();

  constructor(items: T[], toFields: (item: T) => Field[]) {
    items.forEach((item) => {
      this.items.set(item.id, item);
      const tf = new Map<string, number>();
      let length = 0;
      toFields(item).forEach(({ text, weight }) => {
        const tokens = tokenize(text);
        length += tokens.length;
        tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + weight));
      });
      this.prepared.push({ id: item.id, tf, length });
      new Set(tf.keys()).forEach((t) => this.df.set(t, (this.df.get(t) ?? 0) + 1));
    });
    this.avgLen =
      this.prepared.reduce((sum, p) => sum + p.length, 0) / Math.max(1, this.prepared.length);
  }

  /** Vocabulary, used to repair typos before scoring. */
  private get vocab(): string[] {
    return Array.from(this.df.keys());
  }

  /**
   * Expand each query token: keep it, and add its closest vocabulary neighbour
   * when the token is not in the vocabulary but is close to something that is.
   */
  private expand(tokens: string[]): { token: string; boost: number }[] {
    const out: { token: string; boost: number }[] = [];
    for (const t of tokens) {
      if (this.df.has(t)) {
        out.push({ token: t, boost: 1 });
        continue;
      }
      let best = '';
      let bestScore = 0;
      for (const v of this.vocab) {
        // Prefix match is a strong signal for partially typed words.
        if (v.startsWith(t) && t.length >= 3) {
          const s = 0.85 + Math.min(0.1, t.length / 100);
          if (s > bestScore) {
            bestScore = s;
            best = v;
          }
          continue;
        }
        const s = similarity(t, v);
        if (s > bestScore) {
          bestScore = s;
          best = v;
        }
      }
      if (best && bestScore >= 0.62) out.push({ token: best, boost: bestScore * 0.9 });
    }
    return out;
  }

  search(query: string, limit = 8): { item: T; score: number }[] {
    const raw = tokenize(query);
    if (!raw.length) return [];
    const terms = this.expand(raw);
    if (!terms.length) return [];

    const N = this.prepared.length;
    const k1 = 1.4;
    const b = 0.72;

    const scored = this.prepared.map((doc) => {
      let score = 0;
      for (const { token, boost } of terms) {
        const f = doc.tf.get(token);
        if (!f) continue;
        const n = this.df.get(token) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        const norm = 1 - b + b * (doc.length / (this.avgLen || 1));
        score += boost * idf * ((f * (k1 + 1)) / (f + k1 * norm));
      }
      return { item: this.items.get(doc.id)!, score };
    });

    return scored
      .filter((s) => s.score > 0.15)
      .sort((a, b2) => b2.score - a.score)
      .slice(0, limit);
  }
}

/** Wrap query matches in <mark> for result rendering. Escapes first. */
export function highlight(text: string, query: string): string {
  const escaped = text.replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!
  );
  const terms = Array.from(new Set(tokenize(query, true))).filter((t) => t.length > 2);
  if (!terms.length) return escaped;
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  return escaped.replace(pattern, '<mark>$1</mark>');
}

/** Trim a body of text to a window around the first match. */
export function snippet(text: string, query: string, len = 150): string {
  const terms = tokenize(query, true).filter((t) => t.length > 2);
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1 || text.length <= len) return text.slice(0, len) + (text.length > len ? '…' : '');
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, start + len);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}
