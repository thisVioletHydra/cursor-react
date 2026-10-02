#!/usr/bin/env node
// Sync upstream docs (react.dev, Zustand, TanStack Query) into data/docs.json.
// Shallow + sparse git clones into .cache/, then split each md/mdx file into heading sections.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache');
const OUT = path.join(ROOT, 'data', 'docs.json');

export const SOURCES = [
  {
    id: 'react',
    repo: 'https://github.com/reactjs/react.dev.git',
    sparse: 'src/content',
    url: (rel, anchor) => 'https://react.dev/' + rel.replace(/(^|\/)index$/, '') + (anchor ? '#' + anchor : ''),
  },
  {
    id: 'zustand',
    repo: 'https://github.com/pmndrs/zustand.git',
    sparse: 'docs',
    url: (rel, anchor) => 'https://zustand.docs.pmnd.rs/' + rel.replace(/(^|\/)index$/, '') + (anchor ? '#' + anchor : ''),
  },
  {
    id: 'tanstack-query',
    repo: 'https://github.com/TanStack/query.git',
    sparse: 'docs/framework/react',
    url: (rel, anchor) => 'https://tanstack.com/query/latest/docs/framework/react/' + rel + (anchor ? '#' + anchor : ''),
  },
];

function git(args, cwd, timeout = 180_000) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (r.error) throw new Error(`git ${args.join(' ')} failed: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} exited ${r.status}: ${r.stderr}`);
  return r.stdout.trim();
}

function freshClone(src, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(CACHE, { recursive: true });
  git(['clone', '--depth', '1', '--filter=blob:none', '--sparse', src.repo, dir], CACHE);
  git(['sparse-checkout', 'set', src.sparse], dir);
}

function syncRepo(src) {
  const dir = path.join(CACHE, src.id);
  if (fs.existsSync(path.join(dir, '.git'))) {
    try {
      git(['rev-parse', 'HEAD'], dir); // detect half-finished clones
      git(['sparse-checkout', 'set', src.sparse], dir);
      git(['fetch', '--depth', '1', '--filter=blob:none', 'origin', 'HEAD'], dir);
      git(['reset', '--hard', 'FETCH_HEAD'], dir);
    } catch (e) {
      console.warn(`\n  cache update failed (${e.message.split('\n')[0]}), re-cloning`);
      freshClone(src, dir);
    }
  } else {
    freshClone(src, dir);
  }
  return git(['rev-parse', 'HEAD'], dir);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

// --- markdown / mdx cleanup ---
function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return { meta, body: src.slice(m[0].length) };
}

const CALLOUTS = { Pitfall: 'Pitfall', Note: 'Note', DeepDive: 'Deep Dive', Intro: '', Wip: 'Note', Canary: 'Canary', Experimental: 'Experimental', RSC: 'React Server Components', Solution: 'Solution', Hint: 'Hint', Recap: 'Recap', YouWillLearn: 'You will learn', InlineToc: '' };

function cleanProse(line) {
  // only clean outside inline code spans so `<Suspense>` survives
  return line.split(/(`[^`]*`)/).map((part, i) => (i % 2 ? part : cleanInline(part))).join('').replace(/\s+$/, '');
}

function cleanInline(line) {
  return line
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // {/* jsx comments */}
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[A-Z][\w.]*(\s[^<>]*?)?\/?>/g, '') // inline JSX components (keep inner text)
    .replace(/<\/?(?:kbd|span|div|br|sup|sub|small)\b[^>]*>/gi, '');
}

function cleanMdx(body) {
  const out = [];
  let inFence = false;
  let fence = '';
  for (const raw of body.split(/\r?\n/)) {
    const fm = raw.match(/^\s*(```+|~~~+)/);
    if (fm) {
      if (!inFence) {
        // keep only the language (drop meta like {1,3}, [[1, 4, "age"]], src/App.js, active)
        const lang = raw.match(/^(\s*)(```+|~~~+)\s*([\w+-]*)/);
        inFence = true; fence = fm[1]; out.push(lang[1] + lang[2] + lang[3]); continue;
      }
      if (raw.trim().startsWith(fence)) { inFence = false; out.push(raw); continue; }
    }
    if (inFence) { out.push(raw); continue; }
    if (/^\s*(import|export)\s.+(from\s|=)/.test(raw)) continue; // mdx import/export
    if (/^\[\/\/\]: #/.test(raw)) continue; // tanstack comments
    const tag = raw.match(/^\s*<(\/?)([A-Z]\w*)\b[^>]*?(\/?)>\s*$/);
    if (tag) {
      const label = CALLOUTS[tag[2]];
      if (!tag[1] && !tag[3] && label) out.push('', `> **${label}**`, '');
      continue; // drop pure component lines
    }
    out.push(cleanProse(raw));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function slugify(s) {
  return s.toLowerCase().replace(/`/g, '').replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

// Split into sections on h1-h3 (h4+ stay inside their parent section).
function splitSections(src, rel, file) {
  const { meta, body } = parseFrontmatter(file);
  const lines = body.split(/\r?\n/);
  const sections = [];
  let cur = { level: 0, heading: null, anchor: null, lines: [] };
  const stack = []; // heading path
  let inFence = false;
  let docTitle = meta.title || null;
  const push = () => sections.push(cur);
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (h) {
      push();
      const level = h[1].length;
      let text = h[2];
      let anchor = null;
      const explicit = text.match(/\{\/\*\s*([\w-]+)\s*\*\/\}\s*$/) || text.match(/\{#([\w-]+)\}\s*$/);
      if (explicit) { anchor = explicit[1]; text = text.slice(0, explicit.index).trim(); }
      text = text.replace(/<[^>]+>/g, '').trim();
      if (!anchor) anchor = slugify(text);
      if (level === 1 && !docTitle) docTitle = text;
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, text });
      cur = { level, heading: text, anchor, path: stack.map((s) => s.text), lines: [] };
      continue;
    }
    cur.lines.push(line);
  }
  push();
  docTitle = docTitle || path.basename(rel);
  const result = [];
  const seen = new Set();
  for (const s of sections) {
    const text = cleanMdx(s.lines.join('\n'));
    if (!text) continue; // e.g. "## Reference" immediately followed by "### foo"
    let anchor = s.level <= 1 ? null : s.anchor;
    let id = `${src.id}/${rel}${anchor ? '#' + anchor : ''}`;
    for (let i = 2; seen.has(id); i++) id = `${src.id}/${rel}#${anchor || 'intro'}-${i}`;
    seen.add(id);
    const headingPath = s.level === 0 ? [] : s.path.filter((p, i) => !(i === 0 && s.path.length > 1 && p === docTitle));
    result.push({
      id,
      source: src.id,
      file: rel,
      title: docTitle,
      heading: s.level === 0 || s.level === 1 ? docTitle : s.heading,
      headingPath: headingPath.length ? headingPath : [docTitle],
      level: s.level,
      url: src.url(rel, anchor),
      description: s.level <= 1 ? meta.description || meta.subtitle || undefined : undefined,
      text,
    });
  }
  return result;
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const skipFetch = process.argv.includes('--no-fetch');
  const all = [];
  const meta = { generatedAt: new Date().toISOString(), sources: {} };
  for (const src of SOURCES) {
    if (only.length && !only.includes(src.id)) continue;
    process.stdout.write(`[${src.id}] ${skipFetch ? 'using cache' : 'syncing ' + src.repo} ... `);
    const t0 = Date.now();
    const commit = skipFetch ? git(['rev-parse', 'HEAD'], path.join(CACHE, src.id)) : syncRepo(src);
    const base = path.join(CACHE, src.id, src.sparse);
    const files = walk(base).sort();
    let n = 0;
    for (const f of files) {
      const rel = path.relative(base, f).split(path.sep).join('/').replace(/\.mdx?$/, '');
      const secs = splitSections(src, rel, fs.readFileSync(f, 'utf8'));
      all.push(...secs);
      n += secs.length;
    }
    meta.sources[src.id] = { repo: src.repo, path: src.sparse, commit, files: files.length, sections: n };
    console.log(`${files.length} files, ${n} sections @ ${commit.slice(0, 10)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ meta, sections: all }));
  const size = fs.statSync(OUT).size;
  console.log('\nSection counts per source:');
  for (const [id, m] of Object.entries(meta.sources)) console.log(`  ${id.padEnd(16)} ${String(m.sections).padStart(6)}  (${m.files} files)`);
  console.log(`  ${'TOTAL'.padEnd(16)} ${String(all.length).padStart(6)}`);
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
