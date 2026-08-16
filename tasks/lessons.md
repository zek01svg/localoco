# Project Lessons & Rules

## 1. Authentication State & UI Patterns

- Use TanStack Query mutations (`useMutation`) and queries (`useQuery`) for server state and operations instead of manual `useState`/`useEffect`.
- Tailor loading states using layout-matched `<Skeleton />` components mimicking the target form or view layout rather than generic spinners or text verbs.
- Use `@tanstack/react-form` for form validation and lifecycle management.

## 2. Commit Co-Author Attribution

- When authoring commits with the Antigravity agent, use `Co-authored-by: Antigravity <noreply@google.com>`.

## 3. Client Test Suite Organization

- Colocate frontend unit test suites under `src/tests/unit/`.
