# cursor-react (plugin)

React plugin for Cursor:

- **MCP server `react-docs`**: `search-docs`, `list-sections`, `get-documentation` and `lint-component` over local copies of react.dev, Zustand and TanStack Query (React) docs. Cursor starts it as `node ${CURSOR_PLUGIN_ROOT}/dist/server.mjs`. It's a pre-bundled file, so no `npm install` is needed. Requires Node 20+ on `PATH`.
- **Skills**: `react-best-practices`, `react-state-and-data`, `react-docs-lookup`
- **Rule**: `react-mcp-tools` (alwaysApply)
- **Agent**: `react-file-editor`

Source, docs sync and build tooling are in the repository root: https://github.com/thisVioletHydra/cursor-react

MIT © 2026 thisVioletHydra

## Codex support (0.2.0)

Install `cursor-react@thisviolethydra` from the GitHub marketplace. Codex uses `.codex-plugin/plugin.json` and `.mcp.json`; Cursor uses `.cursor-plugin/plugin.json` and `mcp.json`. Shared skills include best practices, state/data, docs lookup, editing and data safety. The bundled MCP needs Node 20+ and no dependency installation. See the repository README for installation and refresh instructions.
