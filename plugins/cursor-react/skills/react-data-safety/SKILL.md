---
name: react-data-safety
description: Review React Server Functions, Zustand persistence and caches for sensitive data exposure when handling auth, SSR or user data.
---

# React data safety

- Server Function arguments are client-controlled. Validate inputs and authorize the current user inside each operation. Return only necessary fields; hiding controls is not authorization. https://react.dev/reference/rsc/use-server#security
- Client Component props, imports and rendered HTML reach the browser. Keep secrets and privileged server clients out of client modules, props, logs and dehydrated query caches. `use server` does not make return values secret. https://react.dev/reference/rsc/use-client
- Isolate server Zustand stores and QueryClient instances per request. Reset client state/caches on logout or account changes as the app requires. User/tenant-dependent requests need scoped query keys. https://zustand.docs.pmnd.rs/learn/guides/nextjs and https://tanstack.com/query/latest/docs/framework/react/guides/ssr
- Persist only non-sensitive preferences with an allowlist. Browser storage is readable by client JavaScript and cannot be trusted for authorization. https://zustand.docs.pmnd.rs/reference/middlewares/persist
- Avoid untrusted `dangerouslySetInnerHTML`; if HTML is required, use a maintained sanitizer. React escapes ordinary text. https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html
- Hooks linting is not a security audit. Describe concrete exposure paths and fixes; do not claim experimental taint APIs provide complete protection.
