# Verification

Install dependencies with npm ci --ignore-scripts and run npm run db:generate first. Commands below use Windows syntax; omit cmd /c elsewhere.

## Host checks

    cmd /c npm run verify:quick
    cmd /c npm run build
    cmd /c npm run test:e2e
    cmd /c npm run security:npm

Quick verification covers repository text/links/agent entry points, validator regressions, configuration safety, both Prisma schemas, OpenAPI and generated type drift, architecture boundaries and negative fixtures, ESLint/TypeScript, frontend units, domain/application behavior, and HTTP/JWT/problem/contract behavior using an ephemeral RSA key and local JWKS server. It needs no real database. Browser tests use dedicated fixture servers and do not prove real persistence.

## Real databases

Use a dedicated empty test database, not production or another project's database. Apply pending migrations using DATABASE_PROVIDER and DATABASE_URL through npm run db:migrate, then set TEST_DATABASE_URL to the same isolated URL and run npm run backend:verify. Repeat with postgresql and mysql. On Windows, set variables in your user terminal without printing private values. The integration suite fails when TEST_DATABASE_URL is absent or connectivity fails. It never silently skips or substitutes SQLite. It creates uniquely named items and deletes only IDs recorded by that test process.

The real suite verifies Unicode strings, exact UTC millisecond timestamps, persistence, deterministic bounded reads, unique slugs, and concurrent duplicate writes. The CI database matrix runs both provider histories and suites. Every schema change must keep both jobs passing.

## Complete stack

Start the stack, then run npm run test:smoke and npm run test:api-reference. Smoke tests use real identity, bearer access, database writes/reads, uniqueness, health, Scalar, correlated problems, and Next.js rendering. They create one persistent development catalog item. They accept local HTTP origins only and do not follow redirects. The Scalar browser suite denies external requests and checks desktop/mobile rendering plus a real GET.

Full verification runs shared checks, real database integration for the currently selected TEST_DATABASE_URL, API compatibility regressions/baseline, production build, both browser suites, and smoke. Run it once per provider to claim complete provider coverage. It requires the running stack, an isolated migrated test database, a real Git baseline/fetched history, Go 1.26 or newer for pinned oasdiff, and an installed Playwright browser. Missing prerequisites must fail; do not hide them with skip flags.

Initial templates have no Git history. The owner must initialize/commit a baseline before history-based compatibility checks. API_BASE_REF can point to a release/target commit. A response-contract test cannot independently detect an incompatible simultaneous contract and implementation change.

Hosted Windows/Linux CI, production/container execution, managed TLS, data cutover, and backup restoration require their own evidence. Record exact results in [verification results](verification-results.md); do not infer them from static checks.
