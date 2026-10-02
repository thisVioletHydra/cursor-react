#!/usr/bin/env node
// react-docs MCP server (stdio): react.dev + Zustand + TanStack Query docs, plus a React hooks/Compiler linter.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { SearchIndex, SOURCE_ALIASES } from './search.mjs';

// Works both as mcp/server.mjs (source) and dist/server.mjs (bundle): data/ is one level up.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.REACT_DOCS_DATA || path.join(ROOT, 'data', 'docs.json');

function load() {
  if (!fs.existsSync(DATA)) return { meta: { sources: {} }, sections: [] };
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}
const db = load();
const byId = new Map(db.sections.map((s) => [s.id, s]));
let index; // built lazily on first search
const getIndex = () => (index ??= new SearchIndex(db.sections));
const SOURCES = Object.keys(db.meta.sources);
const resolveSource = (s) => (s ? SOURCE_ALIASES[s.toLowerCase()] || s : undefined);
const text = (t) => ({ content: [{ type: 'text', text: t }] });
const noData = 'No docs data found. Run `pnpm sync-docs` in the plugin folder first.';

const server = new McpServer({ name: 'react-docs', version: '0.1.0' });

server.registerTool(
  'list-sections',
  {
    title: 'List documentation sections',
    description:
      'Lists available documentation pages (react.dev, Zustand, TanStack Query for React) with their section ids. ' +
      'Optionally filter by source ("react", "zustand", "tanstack-query") and/or a path prefix (e.g. "reference/react"). ' +
      'Use the returned ids with get-documentation. For topic lookup prefer search-docs.',
    inputSchema: {
      source: z.string().optional().describe('react | zustand | tanstack-query'),
      prefix: z.string().optional().describe('File path prefix inside the source, e.g. "reference/react" or "guides"'),
      detail: z.boolean().optional().describe('If true, list every section id; otherwise one line per page with its section anchors'),
    },
  },
  async ({ source, prefix, detail }) => {
    if (!db.sections.length) return text(noData);
    const src = resolveSource(source);
    if (src && !SOURCES.includes(src)) return text(`Unknown source "${source}". Available: ${SOURCES.join(', ')}`);
    const pages = new Map();
    for (const s of db.sections) {
      if (src && s.source !== src) continue;
      if (prefix && !s.file.startsWith(prefix.replace(/^\/+/, ''))) continue;
      const key = `${s.source}/${s.file}`;
      if (!pages.has(key)) pages.set(key, { title: s.title, url: s.url.split('#')[0], description: s.description, secs: [] });
      pages.get(key).secs.push(s);
    }
    const lines = [];
    for (const [key, p] of pages) {
      if (detail) {
        lines.push(`## ${p.title} (${key})`);
        for (const s of p.secs) lines.push(`- ${s.id} — ${s.headingPath.join(' > ')}`);
      } else {
        const anchors = p.secs.map((s) => s.id.split('#')[1]).filter(Boolean);
        lines.push(`- ${key} — ${p.title}${p.description ? ': ' + p.description.slice(0, 120) : ''}${anchors.length ? `\n    #${anchors.join(' #')}` : ''}`);
      }
    }
    const header = `${pages.size} pages${src ? ` in ${src}` : ''}. Page id = "<source>/<file>"; section id = page id + "#anchor".\n`;
    return text(header + lines.join('\n'));
  },
);

server.registerTool(
  'get-documentation',
  {
    title: 'Get documentation',
    description:
      'Returns the full text of documentation sections by id (e.g. "react/reference/react/useOptimistic#usage"). ' +
      'Passing a page id without "#anchor" (e.g. "react/reference/react/useOptimistic") returns the whole page.',
    inputSchema: { ids: z.array(z.string()).min(1).max(30).describe('Section or page ids from search-docs / list-sections') },
  },
  async ({ ids }) => {
    if (!db.sections.length) return text(noData);
    const out = [];
    for (const id of ids) {
      let secs = byId.has(id) ? [byId.get(id)] : db.sections.filter((s) => `${s.source}/${s.file}` === id.replace(/#$/, ''));
      if (!secs.length) { out.push(`### ${id}\n(not found — use search-docs or list-sections to find valid ids)`); continue; }
      for (const s of secs) out.push(`### ${s.headingPath.join(' > ')}\nid: ${s.id}\nsource: ${s.source} | page: ${s.title} | url: ${s.url}\n\n${s.text}`);
    }
    return text(out.join('\n\n---\n\n'));
  },
);

server.registerTool(
  'search-docs',
  {
    title: 'Search documentation',
    description:
      'Full-text search (BM25 with title/heading boosts) over react.dev, Zustand and TanStack Query (React) docs. ' +
      'Returns ranked section ids with short snippets; then call get-documentation with the ids you need. ' +
      'Mentioning a library name in the query (e.g. "zustand persist") boosts that source.',
    inputSchema: {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(50).optional().describe('Default 8'),
      source: z.string().optional().describe('Restrict to react | zustand | tanstack-query'),
    },
  },
  async ({ query, limit = 8, source }) => {
    if (!db.sections.length) return text(noData);
    const hits = getIndex().search(query, { limit, source: resolveSource(source) });
    if (!hits.length) return text(`No results for "${query}".`);
    return {
      content: [{ type: 'text', text: hits.map((h, i) => `${i + 1}. ${h.id}  [${h.source}] ${h.heading}\n   ${h.url}\n   ${h.snippet}`).join('\n\n') }],
      structuredContent: { hits },
    };
  },
);

server.registerTool(
  'lint-component',
  {
    title: 'Lint React component',
    description:
      'Lints React JS/TS/JSX/TSX code with ESLint + eslint-plugin-react-hooks recommended config ' +
      '(rules-of-hooks, exhaustive-deps and the React Compiler rules: purity, refs, set-state-in-effect, immutability, ...). ' +
      'Use it on components/hooks you write and fix all reported problems.',
    inputSchema: {
      code: z.string().min(1),
      filename: z.string().optional().describe('Used to pick the dialect, default Component.tsx'),
    },
  },
  async ({ code, filename }) => {
    let lintComponent;
    try {
      ({ lintComponent } = await import('./lint.mjs'));
    } catch (e) {
      return text(`lint-component is unavailable (${e.message.split('\n')[0]}). Run \`pnpm install\` in the plugin folder to enable lint. The docs tools still work.`);
    }
    const msgs = await lintComponent(code, filename || 'Component.tsx');
    if (!msgs.length) return { content: [{ type: 'text', text: 'No issues found.' }], structuredContent: { messages: [] } };
    return {
      content: [{ type: 'text', text: msgs.map((m) => `${m.line}:${m.column} ${m.severity} ${m.message} (${m.rule})`).join('\n') }],
      structuredContent: { messages: msgs },
    };
  },
);

await server.connect(new StdioServerTransport());
