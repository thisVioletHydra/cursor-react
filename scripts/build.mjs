#!/usr/bin/env node
// Bundle the MCP server (and the smoke test) into self-contained ESM files under dist/.
// dist/ is committed so the plugin works right after `git clone` without `pnpm install`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'plugins/cursor-react/dist'; // shipped inside the plugin folder
const DIST = path.join(ROOT, OUT);
fs.rmSync(DIST, { recursive: true, force: true });

// Bundled CJS deps (eslint, typescript) call require()/__dirname; provide them in ESM.
const banner = [
  "import { createRequire as __createRequire } from 'node:module';",
  "import { fileURLToPath as __fileURLToPath } from 'node:url';",
  "import { dirname as __pathDirname } from 'node:path';",
  'const require = __createRequire(import.meta.url);',
  'const __filename = __fileURLToPath(import.meta.url);',
  'const __dirname = __pathDirname(__filename);',
].join('\n');

const common = {
  absWorkingDir: ROOT,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: { js: banner },
  legalComments: 'none',
  minifySyntax: true,
  minifyWhitespace: true,
  minifyIdentifiers: true,
  logLevel: 'warning',
  metafile: true,
  // Optional deps only used on code paths we never hit (TS config files, babel presets);
  // left as runtime requires that are never executed.
  external: ['jiti', 'jiti/*', '@babel/preset-typescript', '@babel/preset-typescript/*'],
};

const results = [
  // server + lazily-loaded lint chunk (eslint, react-hooks plugin, typescript-eslint parser)
  await build({ ...common, entryPoints: { server: 'mcp/server.mjs' }, outdir: OUT, splitting: true, chunkNames: 'chunks/[name]-[hash]', outExtension: { '.js': '.mjs' } }),
  await build({ ...common, entryPoints: { 'smoke-test': 'scripts/smoke-test.mjs' }, outdir: OUT, outExtension: { '.js': '.mjs' } }),
];

for (const r of results) for (const [file, info] of Object.entries(r.metafile.outputs)) console.log(`${file.padEnd(40)} ${(info.bytes / 1024).toFixed(0).padStart(7)} KB`);
