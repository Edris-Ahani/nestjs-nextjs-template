# Database portability

## What changes when choosing a provider

Set DATABASE_PROVIDER to postgresql or mysql and set DATABASE_URL to the matching connection URL. Local stack commands select the matching Compose overlay automatically. Both Prisma clients are generated during development setup and container builds; the runtime client factory selects the adapter. No catalog domain, application, controller, contract, or frontend edit is needed.

The central model is [models.prisma](../backend/prisma/models.prisma). Run npm run db:generate after changing it. The script copies it byte-for-byte into both provider schema directories and generates both clients. npm run db:check validates both schemas and rejects model drift. Generated clients are ignored; generated provider model copies are versioned so migration tooling and reviewers can see the full selected schema.

## Portable semantics

- UUIDs use VARCHAR(36) rather than PostgreSQL-native UUID columns.
- Strings have explicit portable lengths. There are no JSONB, arrays, extensions, enums, sequences, database-generated UUIDs, or database-specific search operators in business behavior.
- Timestamps are millisecond precision. The application writes UTC instants. PostgreSQL timestamps without timezone are interpreted through the UTC driver mapping; MySQL sessions use +00:00. Cross-provider integration tests compare exact ISO timestamps. Review custom SQL and external writers for the same UTC policy.
- Slugs are lowercase ASCII and unique. MySQL uses utf8mb4_bin rather than its common case-insensitive collation; PostgreSQL uses ordinary case-sensitive string equality. Future case-insensitive search, accents, sorting, and locale requirements need explicit shared semantics and tests on both databases.
- Listing uses repeatable-read snapshots and deterministic createdAt/id ordering. Both engines maintain the matching descending composite index.
- Raw SQL is restricted to the fixed SELECT 1 infrastructure probe and provider migration files. Do not add raw SQL, Prisma types, or provider branches to business code.

## Schema changes

Prisma migrations contain provider-specific SQL. Maintain two independent migration histories; never reuse PostgreSQL SQL for MySQL or change an applied migration. Edit the shared model, run db:generate, then use db:dev against disposable development databases for each provider to create and review migrations with equivalent behavior. Run the real database suite for both providers. Never use migrate reset or db push against shared/production data.

DATABASE_URL is the migration connection URL. For production, supply a dedicated DDL role to the migration job and a separate least-privilege DML role to the API. DATABASE_URL_FILE supports a file-mounted connection URL. The CLI launcher and runtime reject conflicting inline/file configuration.

## Existing data and provider changes

Provider selection does not move data. Prisma documents that migration histories cannot be automatically switched between providers: [official limitations](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues).

Before a real cutover: back up and test restoration, provision the target database, apply its reviewed migration history, transfer data preserving IDs and UTC timestamps, compare counts and uniqueness, validate both API behavior and critical queries, then switch the runtime provider and URL. Plan a write freeze or explicit synchronization strategy, a rollback point, and a rehearsed cutover appropriate to the product. Keep the previous database until rollback is no longer needed. No script deletes either provider's volume.

Keycloak's own persistence is independent and remains PostgreSQL in the development stack. Selecting MySQL changes application persistence only. Production uses externally managed identity and database services.
