# cursor-react (plugin)

React plugin for Cursor and Codex:

- **MCP server `react-docs`**: `search-docs`, `list-sections`, `get-documentation` and `lint-component` over local copies of react.dev, Zustand and TanStack Query (React) docs. Cursor starts it as `node ${CURSOR_PLUGIN_ROOT}/dist/server.mjs`. It's a pre-bundled file, so no dependency installation is needed. Requires Node 20+ on `PATH`.
- **Skills**: `react-best-practices`, `react-state-and-data`, `react-docs-lookup`, `react-data-safety`, `react-file-editor`, `react-style-guide`, `react-compiler`
- **Rule**: `react-mcp-tools` (alwaysApply)
- **Agent**: `react-file-editor`

Source, docs sync and build tooling are in the repository root: https://github.com/thisVioletHydra/cursor-react

MIT © 2026 thisVioletHydra

## Codex support (0.2.0)

Install `cursor-react@thisviolethydra` from the GitHub marketplace. Codex uses `.codex-plugin/plugin.json` and `.mcp.json`; Cursor uses `.cursor-plugin/plugin.json` and `mcp.json`. Shared skills include best practices, state/data, docs lookup, editing and data safety. The bundled MCP needs Node 20+ and no dependency installation. See the repository README for installation and refresh instructions.

## Release 0.2.1: readable React

Adds `react-style-guide`, shared by Cursor and Codex and linked from editing/best-practices skills and Cursor rules/agent. Covers JSX formatting (100-column target), domain-based names, explicit render branches, focused components and named complex handlers. Existing project conventions take precedence. These are plugin conventions, not requirements from react.dev.

MCP lint now reports nested ternaries as errors and unnecessary ternaries as warnings. It still allows short single ternaries and inline callbacks. Formatting/naming/component design are reviewed through the skill, not automatically enforced by ESLint. Updating the plugin does not rewrite existing application code; request a review/refactor to apply it.

## TypeScript compatibility and upgrade plan

The plugin stays on TypeScript 6 (`typescript: ^6.0.3`). Its local MCP linter uses `typescript-eslint` and the JavaScript compiler API; a faster native type checker alone is not a replacement for that integration.

TypeScript 7.1 is the next upgrade evaluation target, not an automatic upgrade. Microsoft announced a new compiler API planned for 7.1; availability and compatibility must be checked when evaluating the release. See the [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60).

Before moving to 7.1 or later:

- Confirm a stable release and a compiler API supported by `typescript-eslint` and the other bundled tools.
- Verify dependency compatibility and compare lint diagnostics for JSX/TSX, Hooks and ternary rules.
- Rebuild the self-contained MCP bundle and pass the Cursor and Codex smoke checks.

Until those checks pass, keep the plugin on TypeScript 6. This policy applies to the plugin's tooling, not to the TypeScript version used by projects consuming its skills.


## Release 0.2.2: React 19 and Compiler

Adds the shared `react-compiler` skill for React 19 applications with Compiler enabled: plain components/handlers by default, deliberate manual memoization, compilation verification and skipped-component debugging. Updates props/ref conventions, lazy declarations, Effect Event usage and transition guidance. TypeScript tooling remains on 6 pending the documented 7.1 evaluation.

The [10xHub guide](https://github.com/10xHub/react-style-guide/blob/main/docs/guidelines/REACT_GUIDE.md) was reviewed as community material, not imported into the official-docs index. Its PropTypes, routine memoization, lazy-inside-render and server-to-client callback examples are not adopted. Official react.dev guidance takes precedence; plugin naming/formatting conventions remain separate.

This repository is a Node MCP plugin, not a React app. Installing it does not enable React Compiler in a consumer project. Verify the project's own build configuration and compiled output.
