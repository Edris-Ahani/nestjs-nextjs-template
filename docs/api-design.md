# API conventions

The canonical document is [contracts/openapi.yaml](../contracts/openapi.yaml). Keep API paths versioned under /api/v1 and use explicit request/response DTOs. Collection reads have bounded, zero-based pagination. All timestamps are UTC ISO values. Do not expose Prisma records with additional internal fields when extending the model; map an explicit HTTP response.

Catalog GET is intentionally public. POST requires a valid RS256 bearer token from the configured issuer, for the configured audience, with exp/iat/sub claims and catalog:write scope. Unmarked handlers are denied; undefined routes return 404. Browser cookies do not authenticate requests. Review CORS/CSRF when introducing browser sessions or direct browser API calls.

Every response receives a server-generated X-Request-ID. RFC 9457 problem responses repeat it as requestId with type, status, title, detail, and query-free instance. Never trust inbound correlation identifiers or return raw exceptions, SQL, credentials, or submitted values. Invalid fields are optional; the current implementation returns a generic invalid-input problem.

The API validates input using Zod, enforces JSON request size limits, checks media negotiation, and maps database uniqueness races to 409. Authentication errors include a bearer challenge. Unexpected failures are generic and structured logs contain only bounded event categories, status, and correlation identifiers.

Scalar is enabled only for local development. GET /docs serves a pinned local bundle, /docs/openapi.yaml serves the canonical contract, and config disables telemetry, token persistence, agents, and external proxies. The CSP keeps network/script access on the same origin. Both build assets and the native-development copy come from the canonical contract through the asset script; api:check detects stale native copies.

    cmd /c npm run api:generate
    cmd /c npm run api:check
    cmd /c npm run api:compatibility -- release-tag

Type generation catches frontend drift. Backend HTTP tests select response schemas by operation, status, and media type. API compatibility uses pinned oasdiff with a real Git baseline to detect incompatible simultaneous contract/implementation changes. It requires Go and fetched history; a fresh template without Git must be initialized by its owner before this history-based check can run.
