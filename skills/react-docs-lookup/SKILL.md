---
name: react-docs-lookup
description: How and when to use the react-docs MCP tools (search-docs, list-sections, get-documentation, lint-component) for React 19, React Compiler, RSC, Zustand and TanStack Query questions. MUST be used whenever answering a React API question or writing/reviewing React code where exact API details matter.
---

# React Docs Lookup

The `react-docs` MCP server serves a local, freshly synced copy of:

| source | upstream | ids look like |
|---|---|---|
| `react` | react.dev `src/content` (learn, reference, blog, RSC, compiler) | `react/reference/react/useOptimistic#usage` |
| `zustand` | pmndrs/zustand `docs/` | `zustand/reference/middlewares/persist#signature` |
| `tanstack-query` | TanStack/query `docs/framework/react` | `tanstack-query/guides/query-keys` |

Section id = `<source>/<file path>` + `#<heading anchor>`. A page id (no `#`) returns the whole page.

## When to call

- **Before** answering any question about a React/Zustand/TanStack API signature, caveat or recommended pattern, especially newer APIs (`useActionState`, `useOptimistic`, `use`, `useEffectEvent`, `<Activity>`, `<ViewTransition>`, `cacheSignal`, React Compiler config, `'use client'`/`'use server'`). Signatures have changed: `useActionState` now documents `reducerAction(previousState, actionPayload)` → `[state, dispatchAction, isPending]`.
- **After** writing or editing a component or hook, call `lint-component`.
- Skip lookups for trivial JSX or plain JavaScript questions.

## How to call

### 1. `search-docs(query, limit?, source?)`

Start here. Use API names or short phrases. Naming the library in the query boosts it, and so does `source`.

```
search-docs { "query": "useOptimistic" }
search-docs { "query": "zustand persist" }
search-docs { "query": "reset state when prop changes" }
search-docs { "query": "optimistic updates", "source": "tanstack-query" }
```

Each hit has an id, a heading path, the canonical URL and a snippet. Pick the 1–5 most relevant ids.

### 2. `get-documentation(ids[])`

Fetch the full text of everything you need in one call:

```
get-documentation { "ids": ["react/reference/react/useOptimistic#adding-optimistic-state-to-a-component",
                            "react/reference/react/useOptimistic#troubleshooting"] }
```

Pass a page id (`react/reference/react/useActionState`) to get the whole page. Pages can be long, so prefer sections.

### 3. `list-sections(source?, prefix?, detail?)`

Use it to browse when you don't know the terms, for example all React hooks:

```
list-sections { "source": "react", "prefix": "reference/react" }
list-sections { "source": "tanstack-query", "prefix": "guides" }
```

### 4. `lint-component(code, filename?)`

ESLint with `eslint-plugin-react-hooks` `recommended-latest`: rules-of-hooks, exhaustive-deps and the React Compiler rules. Pass `filename` ending in `.tsx`/`.jsx`/`.ts`/`.js`.

```
lint-component { "code": "function C({ok}) { if (ok) { const [a] = useState(0); } return null }" }
→ 1:… error React Hook "useState" is called conditionally. … (react-hooks/rules-of-hooks)
```

Fix every error and re-run until it reports "No issues found." Treat warnings (`exhaustive-deps`, `incompatible-library`) as needing a reason if you leave them.

## Answering

- Cite the react.dev / Zustand / TanStack URL returned with the section.
- Prefer the docs' examples and wording over memory. If a doc and your memory disagree, the doc wins (it was synced from the latest default branch).
- If nothing relevant comes back, say so, and then answer from general knowledge with a caveat.

## Keeping docs fresh

From the plugin folder, run `pnpm sync-docs`. It shallow-clones the upstream repos into `.cache/` and rewrites `data/docs.json`. Restart the MCP server afterwards (toggle it in Cursor settings).
