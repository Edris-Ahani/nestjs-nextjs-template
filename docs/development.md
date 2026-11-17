# Development

Read [installation](getting-started.md) and [architecture](architecture.md) first. Commands use Windows cmd /c syntax; omit that prefix on Linux/macOS.

To create an independent sibling, follow [creating a project](creating-a-project.md). After adding or removing maintained files, review them and run `npm run template:sync` and `npm run template:check`.

## Host reload

    cmd /c npm run infra:up
    cmd /c npm run db:migrate
    cmd /c npm run dev:backend

In another user terminal, run cmd /c npm run dev:frontend -- --port 3001. Backend development loads the private root environment into its child process and uses API_PORT. Next.js loads frontend/.env.local. After changing provider or models, regenerate both clients before starting the backend. Production builds do not automatically load private root environment files.

## Commands

| Command | Purpose |
| --- | --- |
| npm run template:test | Dependency-free generator behavior and copy protection tests |
| npm run template:check | Verify the reviewed inventory in a Git checkout |
| npm run setup | Preserve or generate private development configuration |
| npm run doctor | Check Node, selected container client/server, Compose provider, and local environment presence |
| npm run infra:up | Start only the selected database and local identity services |
| npm run stack:build | Build API, web, and migration images sequentially |
| npm run stack:up | Build, start infrastructure, deploy migrations, then start applications |
| npm run stack:start | Same startup sequence using existing images |
| npm run stack:down | Stop services while preserving volumes |
| npm run db:generate | Assemble both provider schemas and generate both clients |
| npm run db:check | Validate both schemas and shared-model synchronization |
| npm run db:migrate | Apply pending migrations to the configured host database |
| npm run db:dev -- --name add_feature | Create/review migrations against a disposable development database |
| npm run db:status | Inspect the selected migration history |
| npm run verify:quick | Host verification without containers |
| npm run backend:verify | Unit checks and real configured database integration tests |

The doctor does not install tools, start machines, validate free ports, or check every production prerequisite. Builds require at least 2 GiB free space per image; reserve substantially more for the full stack and caches.

## Troubleshooting

- A missing Prisma client means db:generate has not run after installation.
- URL/provider mismatches fail before running the application or migration. Keep local database service credentials consistent with the URL.
- Port conflicts: change API_PORT, WEB_PORT, IDENTITY_PORT, POSTGRES_PORT, or MYSQL_PORT and update matching native URLs. Container-to-container database/API ports remain standard internal ports.
- HTTP 401: check JWT signature, issuer, audience, required claims, and expiry. HTTP 403: check catalog:write. HTTP 409: the unique slug constraint rejected a duplicate.
- Keycloak imports a realm on initial creation; editing the import does not update an existing realm.
- Password changes in .env do not rotate credentials in existing volumes.
- Unavailable databases fail readiness and real integration verification. Never substitute SQLite or silently skip a suite.
- Application browser tests use dedicated fixture ports 3100/19090 and clean up their servers. If Chromium cannot be downloaded, PLAYWRIGHT_CHANNEL=msedge may use an installed Edge browser.

Private environments, generated clients, dependencies, build output, reports, browser state, downloaded references, and secrets are ignored. Keep the lockfile, migration histories, generated provider model copies, generated API types, and agent entry points in version control. Review ignored data before sharing archives. The project does not initialize Git or publish automatically.
