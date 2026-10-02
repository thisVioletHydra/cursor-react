# cursor-react

A Cursor plugin for React, laid out like the official Svelte plugin (`.cursor-plugin/plugin.json`, `.mcp.json`, `rules/`, `agents/`, `skills/`), with a **local, self-contained** docs MCP server: react.dev + Zustand + TanStack Query docs, a React hooks / React Compiler linter, and React 19 skills.

## Install

### From GitHub (recommended)

In Cursor: **Settings → Plugins → Add → From GitHub Repository** and enter:

```
https://github.com/thisVioletHydra/cursor-react
```

Nothing else is needed: the MCP server is pre-bundled in `dist/` and the docs index ships in `data/docs.json`, so it starts right after clone with plain `node` (Node 20+ on your `PATH`). No `pnpm install` required.

### Manual / local

```bash
git clone https://github.com/thisVioletHydra/cursor-react ~/dev/cursor-react
```

Then either add the folder as a local plugin, or register just the MCP server in `~/.cursor/mcp.json` (absolute path, since `${CURSOR_PLUGIN_ROOT}` is only expanded for installed plugins):

```json
{
  "mcpServers": {
    "react-docs": {
      "command": "node",
      "args": ["/absolute/path/to/cursor-react/dist/server.mjs"]
    }
  }
}
```

## What's inside

```
cursor-react/
├── .cursor-plugin/plugin.json      # plugin manifest (same fields as the Svelte plugin)
├── .mcp.json                       # MCP config → "react-docs": node ${CURSOR_PLUGIN_ROOT}/dist/server.mjs
├── rules/react-mcp-tools.mdc       # alwaysApply rule: how to use the MCP tools
├── agents/react-file-editor.md     # subagent for editing/reviewing React files
├── skills/
│   ├── react-best-practices/SKILL.md   # React 19: Effects vs derived state, Actions, use(), keys, Compiler, RSC
│   ├── react-state-and-data/SKILL.md   # useState vs context vs Zustand vs TanStack Query
│   └── react-docs-lookup/SKILL.md      # when/how to call the MCP tools
├── dist/                           # committed esbuild bundle (no node_modules needed)
│   ├── server.mjs                  # MCP server entry
│   ├── chunks/lint-*.mjs           # lazily loaded ESLint + react-hooks + TS parser (~10 MB)
│   └── smoke-test.mjs              # bundled smoke-test client
├── mcp/                            # sources of the server
│   ├── server.mjs                  # MCP server (stdio, @modelcontextprotocol/sdk + zod)
│   ├── search.mjs                  # in-memory BM25F index (heading/title boosted)
│   └── lint.mjs                    # ESLint flat config + eslint-plugin-react-hooks recommended-latest
├── scripts/
│   ├── build.mjs                   # esbuild → dist/
│   ├── sync-docs.mjs               # shallow+sparse clone → split by headings → data/docs.json
│   └── smoke-test.mjs              # SDK client smoke test of all tools
├── data/docs.json                  # generated section index (committed)
├── LICENSE                         # MIT
└── .cache/                         # sync-docs git clones (gitignored)
```

### MCP tools (`react-docs`)

| tool | args | purpose |
|---|---|---|
| `search-docs` | `query`, `limit?` (8), `source?` | ranked full-text search; returns ids, URLs, snippets |
| `list-sections` | `source?`, `prefix?`, `detail?` | browse pages and section anchors |
| `get-documentation` | `ids[]` | full text of sections (`react/reference/react/use#use-promise`) or pages (no `#`) |
| `lint-component` | `code`, `filename?` | ESLint + react-hooks (rules-of-hooks, exhaustive-deps, React Compiler rules) |

Sources: `react` (reactjs/react.dev `src/content`), `zustand` (pmndrs/zustand `docs/`), and `tanstack-query` (TanStack/query `docs/framework/react`).

## Development

```bash
pnpm install
pnpm sync-docs          # clone/update upstream docs into .cache/ and rebuild data/docs.json
pnpm sync-docs zustand  # only one source
node scripts/sync-docs.mjs --no-fetch   # re-parse existing clones offline
pnpm build              # bundle mcp/ → dist/ (commit dist/ afterwards)
pnpm smoke              # bundled SDK client: starts the server exactly as .mcp.json says, exercises all tools
pnpm dev                # run the unbundled server from mcp/
pnpm start              # run the bundled server
```

Sections have a stable id (`<source>/<file>#<anchor>`), source, title, heading path, url and cleaned markdown text (frontmatter, MDX imports and JSX wrapper components stripped; callouts become `> **Pitfall**` etc.; react.dev's explicit `{/*anchor*/}` ids are kept so URLs match the live site).

The server finds `data/docs.json` relative to its own file (`../data/docs.json`); override with `REACT_DOCS_DATA=/path/to/docs.json`. If the lint chunk can't load, `lint-component` replies with "run `pnpm install` to enable lint" and the docs tools keep working.

After `pnpm sync-docs`, restart the server (toggle it in Cursor Settings → MCP).

## License

MIT © 2026 thisVioletHydra
