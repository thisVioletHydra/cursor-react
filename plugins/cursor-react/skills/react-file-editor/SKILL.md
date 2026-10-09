---
name: react-file-editor
description: Write or review React components and hooks using official docs, best practices, Zustand and local linting in Cursor or Codex.
---

# React editing workflow

1. Inspect target files, package versions, framework, state ownership and Compiler configuration.
2. Read `../react-best-practices/SKILL.md`; for stores/data also read `../react-state-and-data/SKILL.md`; for auth/SSR/user data read `../react-data-safety/SKILL.md`.
3. Follow `../react-docs-lookup/SKILL.md` to search and retrieve relevant API sections, matching the project version/channel.
4. Make the smallest coherent change. Prefer Zustand for new shared client state and framework loaders/TanStack Query for server data.
5. When tools are available and user verification preferences permit, run `lint-component` on changed components/hooks. Fix errors and investigate warnings. Run appropriate project checks; hooks lint does not validate behavior, authorization or hydration.
6. Report changes, actual checks and limitations. Disclose unavailable tools; never claim lint succeeded if it did not run.

This skill provides the workflow in hosts without Cursor rules/agent support. Installation does not create a Codex subagent.

## Readability conventions

When writing or reviewing JSX/components, also read `../react-style-guide/SKILL.md`. Apply its naming, formatting and render-logic conventions to changed code; check readability even when hooks lint passes.
