// In-memory BM25F-style search over doc sections.
const STOP = new Set('a an and are as at be but by for from has have how i if in into is it its of on or that the this to was what when where which why will with you your can do does use using'.split(' '));

export const SOURCE_ALIASES = {
  react: 'react', 'react.dev': 'react', reactdev: 'react',
  zustand: 'zustand',
  tanstack: 'tanstack-query', 'tanstack-query': 'tanstack-query', 'react-query': 'tanstack-query', tanstackquery: 'tanstack-query', reactquery: 'tanstack-query',
};

/** Tokenize: lowercase words; also index camelCase parts (useOptimistic -> useoptimistic, use, optimistic). */
export function tokenize(text, { parts = true } = {}) {
  const out = [];
  const words = String(text).match(/[A-Za-z0-9_$]+/g) || [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (lw.length < 2 || STOP.has(lw)) continue;
    out.push(lw);
    if (parts) {
      const sub = w.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').split(' ');
      if (sub.length > 1) for (const p of sub) { const lp = p.toLowerCase(); if (lp.length > 2 && !STOP.has(lp)) out.push(lp); }
    }
  }
  return out;
}

const FIELDS = { heading: 4, title: 2.5, path: 1.5, text: 1 };
const K1 = 1.2, B = 0.75;

export class SearchIndex {
  constructor(sections) {
    this.sections = sections;
    this.docs = sections.map((s) => {
      const f = {
        heading: tokenize(s.heading),
        title: tokenize(s.title + ' ' + s.file.replace(/[/-]/g, ' ')),
        path: tokenize(s.headingPath.join(' ')),
        text: tokenize(s.text),
      };
      const tf = new Map(); // term -> weighted tf
      for (const [name, toks] of Object.entries(f)) for (const t of toks) tf.set(t, (tf.get(t) || 0) + FIELDS[name]);
      const len = f.text.length + f.heading.length * 4 + f.title.length * 2.5;
      return { tf, len, lower: (s.heading + '\n' + s.text).toLowerCase(), headLower: (s.title + ' ' + s.heading).toLowerCase() };
    });
    this.avgLen = this.docs.reduce((a, d) => a + d.len, 0) / Math.max(1, this.docs.length);
    this.df = new Map();
    for (const d of this.docs) for (const t of d.tf.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
  }

  search(query, { limit = 10, source } = {}) {
    const raw = String(query).trim();
    let terms = [...new Set(tokenize(raw, { parts: false }))];
    // Source words in the query ("zustand persist") act as a source boost, not a term.
    const boostSources = new Set();
    const rest = [];
    for (const t of terms) (SOURCE_ALIASES[t] ? boostSources.add(SOURCE_ALIASES[t]) : rest.push(t));
    if (rest.length) terms = rest; else boostSources.clear();
    if (!terms.length) return [];
    const N = this.docs.length;
    const idf = terms.map((t) => { const df = this.df.get(t) || 0; return Math.log(1 + (N - df + 0.5) / (df + 0.5)); });
    const phrase = rest.length > 1 ? rest.join(' ') : null;
    const scored = [];
    for (let i = 0; i < N; i++) {
      const s = this.sections[i];
      if (source && s.source !== source) continue;
      const d = this.docs[i];
      let score = 0, matched = 0;
      terms.forEach((t, j) => {
        let tf = d.tf.get(t) || 0;
        if (!tf && t.length >= 4 && d.lower.includes(t)) tf = 0.5; // substring fallback
        if (!tf) return;
        matched++;
        score += idf[j] * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * d.len / this.avgLen));
      });
      if (!score) continue;
      score *= 0.5 + 0.5 * (matched / terms.length) ** 2; // prefer docs matching all terms
      if (raw.length > 2 && d.headLower.includes(raw.toLowerCase())) score *= 1.6; // exact query in title/heading
      if (phrase && d.lower.includes(phrase)) score *= 1.3;
      if (boostSources.has(s.source)) score *= 2;
      scored.push({ i, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ i, score }) => {
      const s = this.sections[i];
      return { id: s.id, source: s.source, title: s.title, heading: s.headingPath.join(' > '), url: s.url, score: +score.toFixed(3), snippet: snippet(s.text, terms) };
    });
  }
}

export function snippet(text, terms, width = 240) {
  const flat = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/\s+/g, ' ')).replace(/\s+/g, ' ').trim();
  const lower = flat.toLowerCase();
  let pos = -1;
  for (const t of terms) { const p = lower.indexOf(t); if (p !== -1 && (pos === -1 || p < pos)) pos = p; }
  if (pos === -1) pos = 0;
  const start = Math.max(0, pos - 60);
  const s = flat.slice(start, start + width);
  return (start > 0 ? '…' : '') + s + (start + width < flat.length ? '…' : '');
}
