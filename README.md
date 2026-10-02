# cursor-react

A Cursor plugin marketplace repository. It contains one plugin, **`cursor-react`**, which provides:

- a **local, self-contained** docs MCP server for react.dev, Zustand and TanStack Query
- a React hooks / React Compiler linter
- React 19 skills, rules and an agent

The layout follows Cursor's official [plugin template](https://github.com/cursor/plugin-template): `.cursor-plugin/marketplace.json` at the repo root, and the plugin itself under `plugins/cursor-react/`.

## Install

### Import as a marketplace

In Cursor: **Plugins → Add Marketplace → Import Marketplace**, then paste

```
https://github.com/thisVioletHydra/cursor-react
```

After the import, open **Customize** (reload the window if needed), find **cursor-react** under the imported marketplace, and click **Install** (user or project scope).

You don't need anything else. The MCP server is pre-bundled in `plugins/cursor-react/dist/` and the docs index ships in `plugins/cursor-react/data/docs.json`. Cursor starts the server with plain `node` (Node 20+ must be on your `PATH`), and no `pnpm install` is needed.

### Local plugin (manual)

```bash
git clone https://github.com/thisVioletHydra/cursor-react
cp -R cursor-react/plugins/cursor-react ~/.cursor/plugins/local/cursor-react
```

Then run **Developer: Reload Window**. A symlink only works if it resolves inside `~/.cursor/plugins/local`, so copy the folder rather than linking it.

### Just the MCP server

Add this to `~/.cursor/mcp.json`, using an absolute path because `${CURSOR_PLUGIN_ROOT}` is only expanded for installed plugins:

```json
{
  "mcpServers": {
    "react-docs": {
      "command": "node",
      "args": ["/absolute/path/to/cursor-react/plugins/cursor-react/dist/server.mjs"]
    }
  }
}
```

## Repository layout

```
cursor-react/
├── .cursor-plugin/marketplace.json     # marketplace manifest → ./plugins/cursor-react
├── plugins/cursor-react/               # ← the plugin (what Cursor installs)
│   ├── .cursor-plugin/plugin.json      # plugin manifest (name: cursor-react)
│   ├── mcp.json                        # react-docs: node ${CURSOR_PLUGIN_ROOT}/dist/server.mjs
│   ├── rules/react-mcp-tools.mdc
│   ├── agents/react-file-editor.md
│   ├── skills/{react-best-practices,react-state-and-data,react-docs-lookup}/SKILL.md
│   ├── dist/                           # committed esbuild bundle (server + lazy lint chunk + smoke test)
│   ├── data/docs.json                  # generated docs index (committed)
│   ├── README.md
│   └── LICENSE
├── mcp/                                # server sources (server.mjs, search.mjs, lint.mjs)
├── scripts/                            # sync-docs.mjs, build.mjs, smoke-test.mjs
├── package.json                        # dev tooling only
└── LICENSE
```

### MCP tools (`react-docs`)

| tool | args | purpose |
|---|---|---|
| `search-docs` | `query`, `limit?` (8), `source?` | ranked full-text search; returns ids, URLs and snippets |
| `list-sections` | `source?`, `prefix?`, `detail?` | browse pages and section anchors |
| `get-documentation` | `ids[]` | full text of sections (`react/reference/react/use#use-promise`) or whole pages (no `#`) |
| `lint-component` | `code`, `filename?` | ESLint + react-hooks: rules-of-hooks, exhaustive-deps, React Compiler rules |

Sources: `react` (reactjs/react.dev `src/content`), `zustand` (pmndrs/zustand `docs/`), `tanstack-query` (TanStack/query `docs/framework/react`).

## Development

```bash
pnpm install
pnpm sync-docs          # clone/update upstream docs into .cache/ → plugins/cursor-react/data/docs.json
pnpm build              # bundle mcp/ → plugins/cursor-react/dist/ (commit it)
pnpm smoke              # bundled SDK client: starts the server exactly as mcp.json says and exercises all tools
pnpm dev                # run the unbundled server from mcp/
```

The server looks for `data/docs.json` relative to its own file. Set `REACT_DOCS_DATA` to use a different file. If the lint chunk can't load, `lint-component` replies "run `pnpm install` to enable lint", and the docs tools keep working.

## License

MIT © 2026 thisVioletHydra
