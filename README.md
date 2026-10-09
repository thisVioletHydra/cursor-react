# cursor-react

A plugin marketplace repository for Cursor and Codex. It contains one plugin, **`cursor-react`**, which provides:

- a **local, self-contained** docs MCP server for react.dev, Zustand and TanStack Query
- a React hooks / React Compiler linter
- six shared skills for React, Zustand, documentation lookup, editing and data safety; Cursor rules and an agent

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

### Codex

Add this GitHub marketplace in Codex Plugins, or run:

```bash
codex plugin marketplace add thisVioletHydra/cursor-react
codex plugin add cursor-react@thisviolethydra
```

The repo includes `.agents/plugins/marketplace.json`; the plugin includes `.codex-plugin/plugin.json` and `.mcp.json`. Codex resolves the relative MCP working directory from the installed plugin root. Both hosts share the same bundled server, documentation and six skills. Cursor keeps its own `mcp.json`, rules and agent; Codex uses the editing skill for that workflow.

To refresh an existing Git marketplace, run `codex plugin marketplace upgrade thisviolethydra`, then install/update the plugin and start a new chat. A repo marketplace update is separate from publication in OpenAI's public directory. Public submission of this local stdio MCP requires an HTTPS deployment or explicit local MCP support from OpenAI: https://developers.openai.com/plugins/build/plugins.

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

## Release 0.2.0

- Refreshed official React, Zustand and TanStack Query snapshots; provenance lives in `data/docs.json` (`generatedAt` and per-source commit SHA).
- Added Codex packaging and marketplace metadata; retained Cursor integration.
- Added editing and data-safety skills, request isolation, persistence allowlists and stable Zustand v5 selectors.
- Corrected Compiler guidance to require enabled compilation; API guidance checks project versions and experimental channels.

Validate both host launch configurations before releasing:

```bash
pnpm build
pnpm smoke
pnpm smoke -- --codex
```

The lint tool runs locally on provided code. It is a hooks/Compiler diagnostic tool, not a security scanner. The documentation snapshot is frozen at release time and can include upstream experimental pages.

## Release 0.2.1: readable React

Adds `react-style-guide`, shared by Cursor and Codex and linked from editing/best-practices skills and Cursor rules/agent. Covers JSX formatting (100-column target), domain-based names, explicit render branches, focused components and named complex handlers. Existing project conventions take precedence. These are plugin conventions, not requirements from react.dev.

MCP lint now reports nested ternaries as errors and unnecessary ternaries as warnings. It still allows short single ternaries and inline callbacks. Formatting/naming/component design are reviewed through the skill, not automatically enforced by ESLint. Updating the plugin does not rewrite existing application code; request a review/refactor to apply it.
