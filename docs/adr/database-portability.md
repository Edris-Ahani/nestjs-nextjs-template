# ADR: Portable Prisma model with separate provider histories

Status: Accepted

## Context

PostgreSQL is the default, but switching application persistence to MySQL should avoid changes throughout business services and HTTP/UI code. Prisma providers and migration SQL cannot be changed safely by substituting only a connection URL.

## Decision

Keep one shared portable Prisma model, generated provider model copies, two generated clients, one runtime client factory, and separate immutable PostgreSQL/MySQL migration histories. Put Prisma behind feature repository ports. Use explicit string UUIDs, bounded strings, UTC millisecond timestamps, matching indexes, and MySQL binary collation. Test the same real persistence behavior on both engines.

## Consequences

Selecting a provider requires only configuration for the existing feature. Both clients and adapters increase runtime dependencies and both migration histories need maintenance. Existing data requires a deliberate transfer/cutover; provider selection does not transfer records or delete old data. Provider-specific future features require an explicit portability decision and paired tests.
