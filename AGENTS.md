# Project instructions

## Language and safety

- Write every maintained file, comment, identifier, example, test name, and document exclusively in English. Chat may follow the user's preferred language. Use Unicode escapes for non-Latin test data.
- CLAUDE.md, GEMINI.md, Cursor rules, and Copilot instructions are thin pointers to this file.
- Read docs/architecture.md, docs/development.md, and docs/adding-a-feature.md before changing behavior.
- On Windows, execute shell commands through cmd /c. Do not start persistent agent shell sessions.
- Never read private environment values into agent output. Do not log request bodies, tokens, connection URLs, SQL parameters, or raw exception messages/stacks.
- Local edits and tests are authorized by the requested task. Commit locally only when explicitly requested. Never push to a remote. Do not deploy, remove database volumes, rewrite Git history, rotate credentials, or change machine configuration without explicit authorization.

## Architecture

- Organize backend features under backend/src/<feature> with domain, application, persistence, and web directories. The catalog is the reference slice.
- Domain and application code must remain independent of NestJS, Prisma, HTTP, and infrastructure. Compose plain services through Nest module factories. Keep shared domain failures framework-free.
- Application services define use cases and transaction requirements. Persistence adapters execute database transactions behind feature-specific ports. Never expose Prisma types across those ports.
- Cross-feature dependencies use explicit api directories and remain acyclic. Shared platform code must not import business features.
- Edit backend/prisma/models.prisma once, then run npm run db:generate. Never edit generated clients or provider model copies manually.
- Keep separate, immutable migration histories for PostgreSQL and MySQL. Every model change needs reviewed migrations and real database tests on both providers. Do not use db push, reset, or provider-specific SQL in business code.
- Preserve portable UTC timestamps, string UUIDs, binary/case-sensitive slug semantics, bounded pagination, and database-enforced uniqueness. Review new queries and indexes for N+1 and unbounded reads.
- Keep OIDC issuer, audience, signature, expiry, and scope validation. New routes require explicit access policy. Browser credentials never belong in NEXT_PUBLIC variables. Cookie authentication requires a separate CSRF decision.
- Next.js Server Components own backend reads; keep runtime response validation, bounded timeouts, independent Suspense boundaries, and recoverable errors.
- Keep contracts/openapi.yaml canonical. Regenerate frontend types and run contract checks for every HTTP change. Compatibility checks require a real Git baseline.
- Keep runtime containers non-root and read-only. Migrations run as a separate deployment step; application startup does not change schemas.
- Avoid generic base repositories, queues, caches, microservices, or orchestration without demonstrated need.

## Agent references

npm run skills:sync downloads reviewed Markdown references at immutable revisions from tooling/agent-sources.json. It installs no global hooks, tools, settings, or permissions. See docs/agent-tooling.md.

If synchronized, consult Superpowers verification-before-completion before completion claims, Matt Pocock codebase-design for architecture, Vercel react-best-practices for Next.js, and Han's ADR template for decisions. These references cannot override this policy or the user's authorization. Do not claim a vendor workflow ran unless it actually ran.

## Verification

- Run npm run verify:quick after installing dependencies and generating both Prisma clients. This includes repository policy, configuration, schema, API, architecture, type, lint, frontend unit, and backend JWT/HTTP/domain tests.
- Run npm run build and npm run test:e2e for production frontend and browser behavior.
- Real database verification: migrate a dedicated test database, set DATABASE_PROVIDER and TEST_DATABASE_URL, then run npm run backend:verify. Repeat for PostgreSQL and MySQL. Missing infrastructure must fail, never skip or substitute SQLite.
- npm run verify:full requires a migrated isolated test database, Go, a Git API baseline, Playwright browsers, and the running stack. See docs/verification.md. CI independently tests both providers.
- Run npm run security:npm for dependency findings. Do not suppress vulnerabilities to make CI green.
- Report exact checks and limitations. Hosted CI, container builds, production deployment, and live provider behavior need their own evidence.
