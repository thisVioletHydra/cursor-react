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

## Release 0.2.1: readable React

Adds `react-style-guide`, shared by Cursor and Codex and linked from editing/best-practices skills and Cursor rules/agent. Covers JSX formatting (100-column target), domain-based names, explicit render branches, focused components and named complex handlers. Existing project conventions take precedence. These are plugin conventions, not requirements from react.dev.

MCP lint now reports nested ternaries as errors and unnecessary ternaries as warnings. It still allows short single ternaries and inline callbacks. Formatting/naming/component design are reviewed through the skill, not automatically enforced by ESLint. Updating the plugin does not rewrite existing application code; request a review/refactor to apply it.
