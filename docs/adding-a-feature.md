# Add a feature

Read [AGENTS.md](../AGENTS.md), [architecture](architecture.md), [API conventions](api-design.md), and [database portability](database-portability.md). The catalog is the maintained reference slice.

| Responsibility | Reference |
| --- | --- |
| Invariants and immutable values | [domain](../backend/src/catalog/domain/catalog-item.ts) |
| Use cases and port | [service](../backend/src/catalog/application/catalog-service.ts), [repository](../backend/src/catalog/application/catalog-repository.ts) |
| Portable persistence and transaction execution | [adapter](../backend/src/catalog/persistence/prisma-catalog-repository.ts) |
| HTTP DTOs and access policy | [controller](../backend/src/catalog/web/catalog-controller.ts) |
| Dependency injection | [module](../backend/src/catalog/catalog-module.ts) |
| Central model | [models](../backend/prisma/models.prisma) |
| Contract and runtime schemas | [OpenAPI](../contracts/openapi.yaml), [frontend schemas](../frontend/src/lib/catalog-schema.ts) |
| Architecture rules and negative fixtures | [checker](../backend/scripts/architecture.mjs), [tests](../backend/scripts/architecture.test.mjs) |
| HTTP/JWT/response contracts | [tests](../backend/test/http.test.ts) |
| Both real database engines | [integration](../backend/test/catalog.integration.test.ts) |

1. Specify behavior, access policy, invariants, failure modes, and transaction requirements. Inspect callers before changing shared interfaces.
2. Change the canonical contract first, preserving versioned operations. Define explicit DTOs, limits, examples, scopes, and problems.
3. Add a feature with domain/application/persistence/web directories. Use framework-free application services and explicit feature repository ports. Compose adapters in a Nest module factory. Cross-feature calls use a small api directory and remain acyclic.
4. Edit the shared Prisma model, regenerate both clients, and create new immutable migrations for both providers against disposable development databases. Review collation, UTC handling, precision, indexes, query plans, unique races, and multi-write atomicity. Application services define transaction semantics through explicit ports; never leak Prisma transaction types into them.
5. Add Zod request validation and explicit Public or RequireScope metadata. Unmarked handlers remain denied. Review CSRF separately if adding cookies.
6. Regenerate frontend API types. Update runtime schemas, server-side reads, and UI states together. Preserve timeouts, server-only configuration, safe logs, pagination limits, and recoverable failures.
7. Test domain invariants, application behavior, anonymous/scoped requests, invalid JWTs, empty/populated response contracts, and both real providers. Negative architecture fixtures verify enforcement independently of current valid source.
8. Run verify:quick, production build, browser suites, and both provider integration jobs. Compare the edited API against a real Git baseline with api:compatibility; synchronized implementation/schema edits alone do not prove compatibility.
9. Review the complete diff, remove disposable artifacts, preserve unrelated work, and report exact evidence. Commit only when explicitly requested and never push.

See [verification](verification.md) for prerequisites and [security](security.md) for logging and deployment constraints.
