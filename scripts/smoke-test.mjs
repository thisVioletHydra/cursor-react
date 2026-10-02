#!/usr/bin/env node
// Smoke test: spawns the MCP server over stdio with the SDK client and exercises every tool.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Plugin root: --root <dir>, else the folder above this file if it holds mcp.json (bundled dist/), else plugins/cursor-react.
const argRoot = process.argv.indexOf('--root');
const up = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = argRoot > 0 ? path.resolve(process.argv[argRoot + 1]) : fs.existsSync(path.join(up, 'mcp.json')) ? up : path.join(up, 'plugins', 'cursor-react');
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'docs.json'), 'utf8'));
console.log('Section counts:', Object.fromEntries(Object.entries(data.meta.sources).map(([k, v]) => [k, v.sections])));
for (const s of ['react', 'zustand', 'tanstack-query']) check((data.meta.sources[s]?.sections ?? 0) > 0, `source ${s} has sections`);

const client = new Client({ name: 'react-docs-smoke', version: '0.0.1' });
// Start the server exactly as Cursor would: command/args from mcp.json with ${CURSOR_PLUGIN_ROOT} resolved.
console.log('plugin root:', ROOT);
const mcpCfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'mcp.json'), 'utf8')).mcpServers['react-docs'];
const expand = (v) => v.replaceAll('${CURSOR_PLUGIN_ROOT}', ROOT);
const spawnCfg = { command: expand(mcpCfg.command), args: (mcpCfg.args || []).map(expand), cwd: mcpCfg.cwd ? expand(mcpCfg.cwd) : undefined };
console.log('server:', spawnCfg.command, spawnCfg.args.join(' '));
await client.connect(new StdioClientTransport({ ...spawnCfg, stderr: 'inherit' }));

const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
console.log('tools/list:', names.join(', '));
for (const n of ['list-sections', 'get-documentation', 'search-docs', 'lint-component']) check(names.includes(n), `tool ${n} listed`);

const call = (name, args) => client.callTool({ name, arguments: args });

const ls = await call('list-sections', { source: 'zustand' });
check(/pages in zustand/.test(ls.content[0].text), 'list-sections(source=zustand)');

const expectations = { useOptimistic: /useOptimistic/i, 'zustand persist': /^zustand\/.*persist/i };
let firstId;
for (const [q, re] of Object.entries(expectations)) {
  const r = await call('search-docs', { query: q, limit: 5 });
  const ids = r.structuredContent.hits.map((h) => h.id);
  console.log(`search-docs "${q}" top3:`, ids.slice(0, 3));
  check(ids.slice(0, 3).some((id) => re.test(id)), `"${q}" has a relevant top-3 hit`);
  firstId ??= ids[0];
}

const doc = await call('get-documentation', { ids: [firstId] });
check(doc.content[0].text.length > 200 && !/not found/.test(doc.content[0].text), `get-documentation(${firstId}) returned ${doc.content[0].text.length} chars`);

const bad = `import { useState } from 'react';
export function Counter({ enabled }: { enabled: boolean }) {
  if (enabled) {
    const [n, setN] = useState(0);
    return <button onClick={() => setN(n + 1)}>{n}</button>;
  }
  return null;
}
`;
const lint = await call('lint-component', { code: bad });
if (!lint.structuredContent) {
  console.log('lint-component:', lint.content[0].text);
  check(/pnpm install/.test(lint.content[0].text), 'lint-component degrades gracefully');
  await client.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed (lint unavailable)');
  process.exit(failures ? 1 : 0);
}
const msgs = lint.structuredContent.messages;
console.log('lint-component:', msgs.map((m) => `${m.rule}: ${m.message}`));
check(msgs.some((m) => m.rule === 'react-hooks/rules-of-hooks'), 'lint flags conditional hook (rules-of-hooks)');

const good = `import { useState } from 'react';
export function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}
`;
const ok = await call('lint-component', { code: good });
check(ok.structuredContent.messages.length === 0, 'lint passes clean component');

await client.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
