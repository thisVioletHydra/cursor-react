---
name: react-state-and-data
description: How to choose and structure state in React apps - local useState/useReducer vs context vs Zustand (client state) vs TanStack Query (server cache) - and the common antipatterns. Load this skill when adding state, a store, data fetching, caching or mutations to a React project.
---

Ground rules come from react.dev, the Zustand docs and the TanStack Query docs (all available via `search-docs`).

## Decision table

| Kind of state | Use | Notes |
|---|---|---|
| UI state of one component (input text, open/closed) | `useState` / `useReducer` | Keep it as close as possible to where it's used |
| Values computable from other state/props | **nothing**: compute during render | No `useEffect` + `setState` |
| Shared by a few nearby components | lift state up to the common parent | Pass props |
| Deep tree, rarely changing (theme, current user, locale) | context | First try props or `children` composition |
| Global **client** state, frequently updated, many consumers | Zustand | Subscribe with selectors |
| **Server** data (fetched, cached, refetched, mutated) | TanStack Query | It's a server-state cache, not a client store |
| URL-addressable state (filters, tabs, page) | the router / search params | Shareable and survives reloads |
| Form submission + pending/error | `useActionState` / `<form action>` | See react-best-practices |

## Local state

- Avoid **redundant** and **duplicated** state. Store ids, not copies of objects, and derive the rest. [`react/learn/choosing-the-state-structure`]
- Several related updates belong in `useReducer`. [`react/learn/extracting-state-logic-into-a-reducer`]

## Context: use it sparingly

react.dev: "Just because you need to pass some props several levels deep doesn't mean you should put that information into context." First try (1) passing props and (2) extracting components and passing JSX as `children`. [`react/learn/passing-data-deeply-with-context#before-you-use-context`]

```jsx
// 🔴 context used to skip one layer
<PostsContext value={posts}><Layout /></PostsContext>

// ✅ composition
<Layout><Posts posts={posts} /></Layout>
```

Every consumer re-renders when the context value changes. Don't put fast-changing global state there; use a store with selectors.

## Zustand (client state)

```ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

type BearState = { bears: number; increase: (by: number) => void };
// TS: note the curried create<T>()(...)
export const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  increase: (by) => set((s) => ({ bears: s.bears + by })),
}));
```

```tsx
// 🔴 subscribes to the whole store → re-renders on every change
const { bears } = useBearStore();
// 🔴 selector returns a new object every time → extra re-renders
const { bears, increase } = useBearStore((s) => ({ bears: s.bears, increase: s.increase }));

// ✅ atomic selectors, or useShallow for computed objects/arrays
const bears = useBearStore((s) => s.bears);
const { bears, increase } = useBearStore(useShallow((s) => ({ bears: s.bears, increase: s.increase })));
```

A selector triggers a re-render when its output changes by `Object.is`. `useShallow` prevents re-renders when the output stays shallow-equal. [`zustand/learn/guides/prevent-rerenders-with-use-shallow`]

Persistence: `persist(stateCreatorFn, { name, storage?, partialize?, version?, migrate? })`. The storage defaults to `createJSONStorage(() => localStorage)`. Use `partialize` to persist only some keys, and `version` + `migrate` when the shape changes. [`zustand/reference/middlewares/persist`]

```ts
import { persist } from 'zustand/middleware';
export const useSettings = create<Settings>()(
  persist((set) => ({ theme: 'dark', setTheme: (theme) => set({ theme }) }), { name: 'settings' }),
);
```

With SSR/Next.js, don't create one module-level store that is shared across requests. Create the store per request and provide it through context. See `zustand/learn/guides/nextjs`.

## TanStack Query (server state)

From TanStack: Query is a **server-state** library. Redux, MobX and Zustand are client-state libraries that "can be used to store asynchronous data, albeit inefficiently". Once server data moves to Query, usually only a little global UI state is left (theme, sidebar). [`tanstack-query/guides/does-this-replace-client-state`]

```tsx
// 🔴 copying server data into a store / useEffect fetching
useEffect(() => { fetch('/api/todos').then(r => r.json()).then(setTodos); }, []);
const todos = useTodoStore((s) => s.todos);

// ✅ shared options object with queryOptions
import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
export const todosOptions = (filter: string) =>
  queryOptions({ queryKey: ['todos', filter], queryFn: () => fetchTodos(filter), staleTime: 60_000 });

function Todos({ filter }: { filter: string }) {
  const { data, isPending, error } = useQuery(todosOptions(filter));
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: addTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });
  // ...
}
```

Important defaults: cached data is **stale immediately** (`staleTime: 0`), so it is refetched on mount, window focus and reconnect. Inactive queries are garbage-collected after 5 minutes (`gcTime`). Failed queries retry 3 times with exponential backoff. Set `staleTime` deliberately; `Infinity` still allows manual invalidation, `'static'` doesn't. [`tanstack-query/guides/important-defaults`]

- **Query keys** must include every variable the `queryFn` depends on (`['todos', filter]`). [`tanstack-query/guides/query-keys`]
- After a mutation, invalidate the related keys, or write the response with `setQueryData`. [`tanstack-query/guides/invalidations-from-mutations`, `tanstack-query/guides/updates-from-mutation-responses`]
- For optimistic UI, either render `variables` from the pending mutation, or update the cache in `onMutate` and roll back on error. [`tanstack-query/guides/optimistic-updates`]

## Antipatterns

1. Syncing props or server data into local state through `useEffect`.
2. One giant context holding fast-changing values.
3. Server data cached in Zustand/Redux next to manual `loading`/`error` flags.
4. Zustand selectors that build new objects without `useShallow`.
5. Query keys that miss variables, so different filters share one cache entry.
6. Fetching in `useEffect` with no cancellation or caching. Use Query, framework loaders, or `use()` with a cached Promise.
