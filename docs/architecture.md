# Architecture

The backend is a single feature-organized NestJS application. The catalog is the reference vertical slice:

    Browser -> Next.js Server Component -> CatalogController
      -> CatalogService -> CatalogRepository -> PrismaCatalogRepository
        -> PrismaService -> PostgreSQL or MySQL

Domain code owns invariants and framework-free values. Application code owns use cases and repository ports. Nest module factories inject persistence implementations into plain application services. HTTP adapters validate explicit DTOs with Zod; persistence adapters own mappings and execute required transactions. Shared domain failures carry business reasons rather than HTTP status codes. The platform filter maps those reasons to problem responses without importing a feature.

Architecture checks inspect TypeScript imports, exports, and dynamic dependencies. They reject framework imports in domain/application, web-to-persistence access, platform-to-feature imports, cross-feature internals, unresolved local source imports, and cycles. Regression fixtures intentionally violate those rules. These are static checks, not a complete runtime proof; review dependency injection and new dynamic loading separately.

Pagination permits page 0 through 10000 and size 1 through 50. Queries order by createdAt DESC, id DESC with a matching composite index. Listing and counting share a repeatable-read transaction so the page and total describe the same snapshot. Creation uses a single INSERT with an application-assigned UUID; the unique database index resolves concurrent slug races. No pre-insert existence query is required. New multi-write use cases must define an explicit application-level transaction port rather than importing Prisma into application services.

Both providers use a shared model, string UUIDs, millisecond UTC timestamps, bounded strings, and matching indexes. Provider selection is isolated to configuration and the client factory. See [database portability](database-portability.md) for collation, timezone, migration, and data-transfer constraints.

Next.js Server Components read the backend on the internal network. Private URLs and credentials stay server-side. Catalog data and API readiness have independent Suspense boundaries. The refresh button is a Client Component. Failures show recoverable UI with validated request identifiers, never fabricated fallback records. Runtime Zod schemas validate external responses independently of generated TypeScript types.

contracts/openapi.yaml remains canonical. Both native documentation and compiled assets are copied from it by the asset script. Scalar uses a locally served pinned bundle, same-origin requests, no telemetry, no auth persistence, and no external proxy. Production configuration disables documentation. Metrics have a separate unpublished listener; liveness is process-only and readiness probes the selected real database.

Recorded decisions: [modular backend](adr/backend-modular-application.md), [bearer security](adr/auth-bearer-resource-server.md), and [database portability](adr/database-portability.md). Queues, caches, microservices, and generic repositories are intentionally deferred until required by actual behavior.
