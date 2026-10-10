---
name: react-style-guide
description: Applies readable React JSX and component naming conventions when writing, editing or reviewing components and hooks. Use for nested ternaries, inline render logic, component boundaries, naming and JSX formatting in Cursor or Codex.
---

# React style guide

These are this plugin's readability conventions, not official React requirements. Apply them to code you create or touch. User instructions and existing project conventions/formatter configuration take precedence. Do not rename public APIs or reformat unrelated files without a requested migration.

## JSX formatting

- Use the project's formatter configuration. Without one, aim for Prettier-style formatting with `printWidth: 100`; this is a target, not a strict line-length limit.
- Keep a simple element with one or two short props on one line when it fits. Do not expand every small element into a vertical block.
- When an opening tag is too long or contains multiline values, put each prop on its own line and the closing `>` or `/>` on a separate line. Keep nested children indented.
- For manually written SVG with at most six short attributes, a readable line up to 120 characters is acceptable. This is a plugin exception, not Prettier behavior; never fight the configured formatter or add prettier-ignore just for it.
- Wrap long single conditional/logical expressions with clear indentation; follow the project's formatter for operator placement. Before wrapping, simplify complex logic. Line breaks do not repair nested ternaries.

## Conditions and render logic

- Do not nest ternaries, including in props, class names or helper functions. A single short `condition ? A : B` is fine. For loading/error/empty/content branches use early returns in the component or a named helper with explicit branches.
- Preserve Hook ordering: all Hooks must execute before conditional returns, or move the conditional subtree into a separate component.
- Name nontrivial predicates by their meaning (`canEditOrder`, `hasVisibleResults`), not by mechanics (`condition1`, `flag`). Put repeated or compound conditions before the JSX.
- Use boolean conditions with `&&`. For numeric counts, write `items.length > 0 && ...`; avoid accidentally rendering `0`.
- Keep simple callbacks inline (`onClick={() => selectItem(item.id)}`). Move callbacks with branching, async work, several statements or repeated logic into named handlers. An inline callback alone is not a performance bug; do not add useCallback by default.
- Keep simple `map` rendering inline. Move chains of filtering/sorting/grouping or substantial per-item computation into named derived values/helpers. Never mutate props/state with an inline sort.
- Avoid immediately invoked functions inside JSX and deeply mixed `&&`, `||` and ternaries. Prefer explicit named logic with clear precedence.

## Component and file names

- Use PascalCase components and files; use `use` plus a meaningful name for Hooks. Match exported component and filename unless the project has a different convention.
- Prefer domain + role for feature components: `OrderList`, `OrderListItem`, `OrderListFilters`; `AccountSettingsForm`, not generic `Item`, `Content`, `Block` or `Manager` scattered across features.
- Closely coupled child components should share the parent's domain prefix where that improves discovery. Folder membership alone is not a reason to prefix every name.
- Shared UI primitives may have short names such as `Button`, `Dialog`, `Input`. React does not require multi-word names. Use `Base`/`App` prefixes only when the project's UI system already uses them.
- Use complete recognizable words; avoid arbitrary abbreviations and suffixes such as `New`, `Temp`, `Component` or `Wrapper` that do not describe a role.

## Component boundaries

- Extract a top-level component when a subtree has a meaningful domain role, repeated markup, independent behavior or makes its parent's branches hard to scan. Do not declare components inside another component.
- Do not create a component for every div, impose arbitrary line-count limits or introduce many one-use prop-forwarding wrappers. A component should clarify responsibility.
- Keep business decisions and data transformations above the JSX or in focused helpers/hooks. Keep render pure; do not move event side effects into render while refactoring.
- Preserve DOM structure, keys, event behavior, accessibility and state ownership. Moving or renaming a subtree can affect state preservation; review that explicitly.

## Before/after

```jsx
// Avoid: loading/error/content decisions buried in JSX.
return <section>{isLoading ? <Spinner /> : error ? <ErrorMessage error={error} /> : <OrderList orders={orders} />}</section>;

// Prefer: after all Hooks, explicit branches within the same section.
let content;
if (isLoading) {
  content = <Spinner />;
} else if (error) {
  content = <ErrorMessage error={error} />;
} else {
  content = <OrderList orders={orders} />;
}
return <section>{content}</section>;
```

## Review and verification

Check changed code for nested ternaries, opaque compound conditions, generic feature names, heavy inline callbacks and unnecessary component fragmentation. Explain the concrete readability issue and make a behavior-preserving fix within scope.

`lint-component` checks nested/unnecessary ternaries as well as Hooks/Compiler diagnostics. Naming, component boundaries and formatting require review; a clean lint result does not prove the style guide was followed. Respect the user's verification preferences and do not run formatters without authorization.

References: https://prettier.io/docs/options#print-width and https://eslint.org/docs/latest/rules/no-nested-ternary. Official React correctness guidance remains in `../react-best-practices/SKILL.md`.

## React Compiler workflow

For React 19 with Compiler, also read `../react-compiler/SKILL.md`. Use plain pure components and handlers by default; avoid routine manual memoization. Compiler lint and actual compiled output are separate evidence.
