# Recorded verification

Date: 2026-11-17. Environment: Windows, Node.js 24.16.0; dependencies resolved using npm 11.21.2. No Git repository was initialized, no commit/push/deployment was performed, and the original Spring Boot project was not edited.

## Passed

- Dependency installation with lifecycle scripts disabled; both Prisma 7.10.1 clients generated explicitly.
- npm run verify:quick: repository policy/link/agent-entry checks, 9 validator regressions, configuration safety, validation of both provider schemas, OpenAPI lint/type/asset drift, backend/frontend lint and strict TypeScript, architecture rules and 2 negative/positive regression checks, 21 backend tests, and 20 frontend tests.
- npm run build: compiled NestJS and Next.js production builds. The backend build was repeated after final startup-policy changes.
- npm run test:e2e: all 8 desktop/mobile Chromium checks passed, covering catalog rendering, recoverable errors, responsive layout, keyboard access, and health routes.
- Scalar browser suite: all 4 desktop/mobile checks passed against the actual compiled NestJS docs/controller/security stack with an isolated in-memory catalog injected by a temporary verification harness. The suite rejected external requests and executed a real HTTP GET through Scalar. This is documentation/UI verification, not real database or Keycloak coverage.
- npm run security:npm: zero known vulnerabilities, including development and optional dependencies. Two initial moderate findings were fixed by pinning patched AJV and YAML versions; no audit suppression was added.
- npm run api:compatibility:test: unchanged contracts accepted and a deliberately incompatible response type rejected by pinned oasdiff.
- The final contract was compared directly with the original Spring Boot template contract using pinned oasdiff: no breaking changes reported.
- Both new, unapplied initial migration files were generated from their validated schemas using Prisma migrate diff without connecting to a database. The MySQL migration preserves explicit utf8mb4_bin collation.
- Docker Compose config --quiet validated PostgreSQL and MySQL development overlays, application/migration profiles, and production Compose. This checks configuration, not container execution.

## Unverified runtime behavior

The existing Podman machine was stopped. Starting that existing machine without configuration changes failed with a WSL networking error and then an unavailable SSH listener. No machine/network settings were changed and no new container machine or database volumes were created.

Consequently, live PostgreSQL/MySQL integration, Keycloak smoke verification, Linux image builds, container startup/migration execution, managed TLS, production deployment, and hosted GitHub Actions have not been verified locally. These checks are implemented and documented; do not describe them as passed. The CI database matrix tests both engines when the owner publishes the repository.

Prisma schema validation, generated migration SQL, an in-memory repository, and HTTP response contracts do not replace real provider tests. Existing-data provider cutover also needs a separate data migration and backup/rollback rehearsal.

## Delivery

Only maintained source/configuration, lockfiles, contracts, migrations, and documentation are delivered. Private environments, downloaded references, build reports, browser state, temporary verification harnesses, and the original repository's Git history are excluded. Run setup to create fresh local credentials.
