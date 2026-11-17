# NestJS + Next.js application template

A feature-organized TypeScript application with NestJS, Next.js App Router, Prisma, and PostgreSQL by default. MySQL is a supported configuration with its own adapter and migration history. Domain and application code use the same repository port on either provider.

This is the sibling of the Spring Boot template: it retains the Foundry interface, reference catalog, server-side reads, runtime Zod validation, contract-first OpenAPI, local Scalar documentation, Keycloak OIDC, request correlation, safe problem responses, independent health probes, internal Prometheus metrics, Podman/Docker infrastructure, production Compose/Caddy examples, dependency/security workflows, browser tests, and shared coding-agent references. It replaces Java/Maven/JPA/Flyway with NestJS/TypeScript/Prisma equivalents.

## Create your own project

Run `node scripts/create-project.mjs` and enter a name such as `blue-shop` to create an independent sibling with matching package, database, and image names and fresh local credentials. PostgreSQL is the default; add `--database mysql` to select MySQL. See [creating a project](docs/creating-a-project.md) for commands, safety boundaries, naming, and startup.

## Start here

Use Node.js 24 and npm 11.13 or newer within major 11. CI and images pin npm 11.21.2. Install Podman with a Compose provider or Docker Compose for real databases and the complete stack. No Java, Maven, global Nest CLI, or globally installed Prisma is required.

Run these commands from the repository root on Windows:

    cmd /c npm ci --ignore-scripts
    cmd /c npm run db:generate
    cmd /c npm run setup
    cmd /c npm run doctor
    cmd /c npm run stack:up

Setup generates fresh random development credentials without printing them. It preserves existing configuration. Stack startup builds images, starts infrastructure, applies pending migrations through a separate migration container, then starts the applications. It never removes volumes.

| Service | Development address |
| --- | --- |
| Next.js | http://localhost:3001 |
| NestJS | http://localhost:8081 |
| Scalar | http://localhost:8081/docs |
| Liveness / readiness | http://localhost:8081/livez / http://localhost:8081/readyz |
| Keycloak | http://localhost:8181 |
| PostgreSQL | localhost:15433 |
| MySQL, when selected | localhost:13307 |

These defaults avoid the original template's application, identity, and database ports. Metrics listen on container port 9090 and are not published to the host. Customize all host ports in the private root .env and update the frontend .env.local backend address when needed.

## Use MySQL

For a fresh checkout, choose the provider during setup:

    cmd /c npm run setup -- --database=mysql
    cmd /c npm run stack:up

For an already configured checkout, stop its stack first, then set DATABASE_PROVIDER=mysql and DATABASE_URL to a mysql:// URL in the private root .env. Keep DATABASE_USERNAME and DATABASE_PASSWORD consistent with that URL. Run stack:up. No controller, service, domain model, or frontend change is required. Both generated clients ship in the backend build, so provider selection is runtime configuration.

Changing providers creates or connects to a different database. It does not transfer existing data, translate migration SQL, or delete the previous volume. Read the [database portability guide](docs/database-portability.md) before switching an existing dataset. Keycloak has its own independent PostgreSQL database even when the application uses MySQL.

## Host development

    cmd /c npm run infra:up
    cmd /c npm run db:migrate
    cmd /c npm run dev:backend

In a second terminal:

    cmd /c npm run dev:frontend -- --port 3001

The backend launcher loads the root private environment into its child process; the frontend uses frontend/.env.local. Development commands are for user-operated terminals. Build and check commands terminate normally.

## Verify

    cmd /c npm run verify:quick
    cmd /c npm run build
    cmd /c npm run test:e2e
    cmd /c npm run security:npm

Real database tests require an isolated migrated database and TEST_DATABASE_URL. They do not silently skip unavailable infrastructure. The [verification guide](docs/verification.md) explains both providers and full-stack checks. See [recorded verification](docs/verification-results.md) for the actual creation-time evidence and remaining limitations.

## Repository map

| Path | Responsibility |
| --- | --- |
| backend/src/catalog | Reference domain, use cases, repository adapter, and HTTP controller |
| backend/src/platform | Validated configuration, database lifecycle, OIDC, docs, health, and HTTP policy |
| backend/src/shared | Framework-free domain failures |
| backend/prisma/models.prisma | Single portable model definition |
| backend/prisma/postgresql and backend/prisma/mysql | Provider headers, generated model copies, and immutable migration histories |
| backend/test | Domain, configuration, JWT/security, response-contract, and real-database tests |
| frontend | Foundry interface, Server Components, schemas, unit tests, and browser suites |
| contracts/openapi.yaml | Canonical API contract |
| infra | Development stack, database overlays, identity import, and production examples |
| scripts | Setup, platform lifecycle, database tooling, verification, and API compatibility |
| tooling | Reproducible coding-agent reference manifest |

## Guides

- [Installation and first run](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Add a feature](docs/adding-a-feature.md)
- [API design](docs/api-design.md)
- [Database portability](docs/database-portability.md)
- [Security](docs/security.md) and [vulnerability reporting](SECURITY.md)
- [Deployment](docs/deployment.md)
- [Verification](docs/verification.md)
- [Coding-agent tooling](docs/agent-tooling.md)
- [Official sources](docs/sources.md)

The template does not initialize Git, commit, push, deploy, or change host tools automatically.
