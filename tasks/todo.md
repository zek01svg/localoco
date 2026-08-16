# Task: Code Simplification & Review Findings Fixes

## Status: Complete

- [x] Dead Code & Dependency Removal
  - [x] Delete `server/lib/mailer.ts` and `server/lib/email/providers/smtp.ts`
  - [x] Remove `nodemailer` and `@types/nodemailer` from `package.json` and `bun.lock`
  - [x] Clean up SMTP / `EMAIL_PROVIDER` env variables in `server/env.ts` and `infra/secrets.tf`
- [x] Provider Seam Simplification
  - [x] Refactor `server/lib/email/provider.ts` to use simple factory functions (`createResendProvider`, `createFakeProvider`)
  - [x] Preserve HTTP status codes on Resend provider errors
  - [x] Remove `server/lib/email/providers/` directory
- [x] Native Utilities & Classifier Simplification
  - [x] Replace `node:crypto` import with global `crypto.randomUUID()` in `server/database/email.ts` and `server/lib/email/pipeline.ts`
  - [x] Use native `Bun.escapeHTML()` with fallback in `server/lib/email/sanitizer.ts`
  - [x] Simplify error classification and regex extraction in `server/lib/email/classifier.ts`
- [x] Template Deduplication & Glossary Compliance
  - [x] Extract `renderEmailLayout` in `server/lib/email/templates.ts` to deduplicate HTML boilerplate
  - [x] Remove forbidden glossary term `"account"` per `CONTEXT.md`
- [x] Robust Pipeline & Stale Lease Recovery
  - [x] Add stale in-flight job lease recovery (> 5 min) to `claimEmailJob` in `server/lib/email/pipeline.ts`
  - [x] Unify failure outcome recording into a single `recordJobOutcome` helper
- [x] Webhook Route Simplification
  - [x] Use Zod schema validation in `server/routes/webhooks.ts`
- [x] Test Simplification & Contract Verification
  - [x] Simplify `server/tests/unit/email-test-helper.ts` (remove AST SQL parser)
  - [x] Add contract tests against local HTTP fake in `tests/integration/email-fake-contract.test.ts`
  - [x] Update unit test suites to reflect simplified structure
- [x] Full Repository Validation
  - [x] Run `bun run lint:check`, `bun run format:check`, `bun run type:check`, `bun run test`, `bun run build`

## Review

All findings from the Ponytail, Standards, and Spec reviews were resolved:

- **Net Code Reduction**: -359 lines across 23 files; eliminated `nodemailer` and `@types/nodemailer` dependencies.
- **Provider Seam**: Simplified class hierarchies into functional factories (`createResendProvider`, `createFakeProvider`).
- **Error Status Handling**: Preserved HTTP status codes on Resend API errors via `ResendApiError`.
- **Fault Recovery**: Added stale in-flight job lease recovery (> 5 minutes) to `claimEmailJob` to prevent permanent stalls on worker crashes.
- **Contract Tests**: Added local HTTP fake tests covering provider contract, HTTP 429 rate limit classification, and HTTP 422 terminal handling.
- **Ubiquitous Language**: Aligned email templates with `CONTEXT.md` glossary (avoided `"account"`).
- **Validation**: 100% passing test suite (17 test files, 109 tests), 0 lint/typecheck/format warnings or errors, clean server & client production build.
