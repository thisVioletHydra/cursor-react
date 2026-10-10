---
name: react-best-practices
description: Guidance on writing modern, correct React 19 code. Load this skill whenever in a React project and asked to write/edit or review a component or hook (.jsx/.tsx). Covers derived state vs Effects, Actions (useActionState, useOptimistic, form actions), use(), keys, memoization with React Compiler, and Server/Client Component boundaries.
---

Use React 19 and enabled React Compiler as the baseline when confirmed by the user. For Compiler-specific work, read `../react-compiler/SKILL.md`. Facts below come from the synced react.dev docs. Look up details with the react-docs MCP (`search-docs`, then `get-documentation`); ids are shown in brackets.

## Don't use Effects for derived state

When something can be calculated from props or state, don't put it in state; calculate it during render. An Effect that sets state renders once with a stale value and then again. [`react/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state`]

```jsx
// 🔴 redundant state + Effect
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(firstName + ' ' + lastName); }, [firstName, lastName]);

// ✅ calculate during rendering
const fullName = firstName + ' ' + lastName;
```

- To **reset all state when a prop changes**, pass a `key` (`<Profile key={userId} userId={userId} />`) and don't clear the state in an Effect. [`#resetting-all-state-when-a-prop-changes`]
- Put **user-triggered logic** (POST requests, notifications, analytics for a click) in the event handler, not in an Effect that watches state. [`#sending-a-post-request`, `#sharing-logic-between-event-handlers`]
- Use `useSyncExternalStore` for **external stores**, not an Effect plus state. [`#subscribing-to-an-external-store`]
- Effects are for **synchronizing with external systems** (DOM APIs, sockets, timers). If an Effect needs the latest props without re-running, use `useEffectEvent`. Call it only from Effects or other Effect Events, not render or ordinary event handlers; never use it just to skip dependencies. [`react/reference/react/useEffectEvent`]

The linter rule `react-hooks/set-state-in-effect` flags synchronous `setState` inside an Effect.

## Actions: useActionState, useOptimistic, form actions

Functions called inside `startTransition` are **Actions**. The `action` prop on `<form>` and other "Action props" already run inside a transition.

`useActionState(reducerAction, initialState, permalink?)` returns `[state, dispatchAction, isPending]`. `reducerAction(previousState, actionPayload)` can be async. Calls are queued and run in order. [`react/reference/react/useActionState#useactionstate`]

```jsx
// 🔴 hand-rolled pending/error state
const [error, setError] = useState(null);
const [pending, setPending] = useState(false);
async function onSubmit(e) { e.preventDefault(); setPending(true); /* ... */ }

// ✅ useActionState + form action
async function updateName(prev, formData) {
  const error = await saveName(formData.get('name'));
  return error ?? null;
}
function NameForm() {
  const [error, dispatchAction, isPending] = useActionState(updateName, null);
  return (
    <form action={dispatchAction}>
      <input name="name" />
      <button disabled={isPending}>Save</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

`useOptimistic(value, reducer?)` returns `[optimisticState, setOptimistic]`. Call the setter **inside an Action**. Outside of one, React reports "An optimistic state update occurred outside a Transition or Action". Once the Action finishes, the state goes back to `value`. [`react/reference/react/useOptimistic#adding-optimistic-state-to-a-component`]

```jsx
const [count, dispatchAction, isPending] = useActionState(updateCartAction, 0);
const [optimisticCount, setOptimisticCount] = useOptimistic(count);
async function formAction(formData) {
  setOptimisticCount((c) => c + 1);   // inside the form Action → allowed
  return dispatchAction(formData);
}
return <form action={formAction}>…</form>;
```

## `use(resource)`

`use` reads a Promise or a context during render. Unlike other Hooks, it can be called inside `if` and loops. It must still be called from a component or Hook, and **not inside try/catch**; use an Error Boundary for errors. [`react/reference/react/use#use-promise`]

```jsx
// 🔴 new Promise every render → Suspense fallback on every re-render
const user = use(fetchUser(id));

// ✅ cached Promise (framework cache, TanStack Query, or a module cache)
const user = use(fetchUserCached(id)); // returns the same Promise instance per id
```

Wrap it in `<Suspense>` for the loading state. A Promise passed from a Server Component to a Client Component must resolve to a serializable value. `use(browser())` (from `react-dom`) marks a component as browser-only. [`#use-browser`]

## Keys

Keys must be **unique among siblings** and **stable**. Don't generate them during render (`key={Math.random()}`, `crypto.randomUUID()` inline). Using the index as a key is acceptable only for lists that never reorder, insert or delete. [`react/learn/rendering-lists#rules-of-keys`]

```jsx
{todos.map((t) => <Todo key={t.id} todo={t} />)}   // ✅ id from data
```

## Memoization and React Compiler

React Compiler memoizes automatically at build time. First check that React Compiler is enabled in the build configuration. Without it, profile expensive computations and identity-sensitive consumers before adding memoization. For **new compiled code**, rely on the compiler, and use `useMemo`/`useCallback` only as an escape hatch for precise control, for example a value used as an Effect dependency. For **existing code**, leave the current memoization alone, or test carefully before removing it: removal can change the compiled output. [`react/learn/react-compiler/introduction#what-should-i-do-about-usememo-usecallback-and-reactmemo`]

The compiler (and `lint-component`) expects code that follows the Rules of React:
- render is pure: no `Math.random()`/`Date.now()` in render (`purity`)
- don't read or write `ref.current` during render (`refs`)
- don't mutate props, state or hook return values (`immutability`)
- don't declare components inside components (`static-components`)
- hooks only at the top level (`rules-of-hooks`)

## Server and Client Components

- `'use client'` goes at the **very top of the file**, above imports (comments are OK). It must use quotes, not backticks. It marks the module **and its transitive dependencies** as client code. [`react/reference/rsc/use-client#use-client`]
- Add it only at the boundary, meaning components that need state, Effects, event handlers or browser APIs. Keep data fetching and heavy dependencies in Server Components. [`#when-to-use-use-client`]
- Props that cross from server to client must be **serializable**. Plain data, JSX, Promises and Server Functions (`'use server'`) work. Ordinary functions and class instances don't. [`#serializable-types`]

```jsx
// 🔴 whole page becomes client code because of one button
'use client';
export default async function Page() { /* ... */ }

// ✅ server page, small client leaf
// page.jsx (server)
import LikeButton from './LikeButton'; // LikeButton.jsx starts with 'use client'
export default async function Page() {
  const post = await db.posts.get(id);
  return <article>{post.body}<LikeButton postId={post.id} /></article>;
}
```

## Checklist

1. Can this be computed during render instead of stored or synced? → compute it.
2. Is this Effect reacting to a user event? → move it to the handler.
3. Consider Actions for React form workflows. Preserve framework or TanStack Query mutation workflows that already own pending/error/cache state.
4. Keys come from data. Memoize only with a measured reason.
5. Run `lint-component` on the result.

## Effect lifecycle and version checks

Keep reactive dependencies; do not suppress exhaustive-deps to hide stale closures. Return cleanup for subscriptions, timers and connections. Abort or ignore obsolete fetch responses and handle failures; prefer framework loaders or server-state caching where available. Strict Mode exercises setup → cleanup → setup; cleanup must undo setup. https://react.dev/learn/synchronizing-with-effects

Inspect the project React version and framework before proposing APIs. The snapshot follows upstream main and can include Canary/experimental APIs; verify the page channel before recommending them. Compiler lint diagnostics do not prove the compiler is enabled.

## Readability conventions

When writing or reviewing JSX/components, also read `../react-style-guide/SKILL.md`. Apply its naming, formatting and render-logic conventions to changed code; check readability even when hooks lint passes.

## Current React 19 conventions

Use typed props and parameter defaults instead of `propTypes` or function-component `defaultProps`. For new React 19-only function components, pass `ref` as a prop; do not introduce `forwardRef` unless supporting older consumers. Declare lazy components at module scope. Prefer function components, while allowing class-based Error Boundaries when needed. See `../react-compiler/SKILL.md` for details and official references.

Prefer plain derived values and handlers in compiled code; do not routinely wrap new components with `memo`. Compiler does not make external-store selector outputs stable or remove the need for Effect cleanup.
