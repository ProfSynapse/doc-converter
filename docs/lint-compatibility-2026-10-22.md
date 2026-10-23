# Converter lint compatibility review

The original npm lock resolves eslint-config-next/@next/eslint-plugin-next 16.1.1,
react-hooks 7.0.1 and typescript-eslint 8.51.0. The current pnpm installation uses
16.4.1, 7.1.1 and 8.72.0 respectively; ESLint remains 9.39.2. The prior linter was
not reinstalled, so this report makes no claim that the 6 errors / 11 warnings
predated the dependency upgrade. See older-apps-r2-lint-dependency-comparison.json.

All findings were resolved in the target configuration without rule suppressions:

- Dashboard loading: preserve initial loading=true/error=null; user refresh/filter
  handlers reset those states. Data/error/completion updates run from the fetch
  promise callbacks. The stable loader receives the requested period explicitly.
- Internal back links: use Next Link with the same href and visual content. This
  intentionally switches internal navigation to the framework's client navigation.
- OAuth restoration: scope the restoration helper to its mount effect so the
  callback is declared before use and Date.now is evaluated only in that effect's
  asynchronous flow. The five-minute expiry, data/file reconstruction, selection
  restoration and consumed-state removal are preserved.
- Keyboard conversion/reset and file-drop validation: stable callbacks include
  their dependencies, avoiding stale captures without changing action conditions.
- OAuth redirect: keep a full document navigation to the backend, explicitly
  resolving its URL against the current origin (including the same-origin fallback).
- Remove unused auth-user state, a dead header sign-in handler/import, an unused
  destructured filename and unused verifyAuth request parameter.

Target verification: pnpm lint, eslint --max-warnings 0 and TypeScript check pass.
The real Chromium frontend test run against the built final frontend image passes
all four tests (4 passed in 6.34s), with mocked application APIs and an offline
container network namespace.
The opt-in frontend browser tests verify local mocked OAuth save/restore/expiry,
file-drop validation, Enter/Escape conversion, dashboard initial load/filter/refresh,
error recovery, unauthorized navigation and the internal back link. They do not
validate live OAuth or Google APIs.

Relevant primary documentation:
- https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect
- https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- https://nextjs.org/docs/app/api-reference/components/link
