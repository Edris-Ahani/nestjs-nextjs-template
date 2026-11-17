# Deployment

The production Compose/Caddy files are reviewed starting points, not an automatic production deployment. Use external managed PostgreSQL or MySQL and a production OIDC provider. Pin API/web/migration images by immutable digest, provide verified TLS, separate runtime/DDL roles, backups, monitoring, resource budgets, and a tested rollback procedure.

1. Build API and web images from the root Containerfiles. Build the dedicated migration image with the backend Containerfile migration target. All dependency versions are locked; Prisma clients are generated explicitly. Runtime images contain no migration CLI and never migrate during startup.
2. Provision the selected provider and apply that provider's migration history using the migration image with a dedicated DDL DATABASE_URL_FILE. Back up and review migrations before running deploy. Failed migrations block application rollout. Keep runtime connection credentials least-privilege.
3. Supply production runtime configuration using the example in infra/production/.env.example. The API mounts its URL through a secret file and rejects missing TLS, non-HTTPS identity, or enabled documentation. PostgreSQL URLs use sslmode=verify-full; MySQL uses sslaccept=strict. Validate trusted CA handling with the actual managed service.
4. Start API and web with production Compose only after migrations. The API/web listener ports are bound to loopback for a host reverse proxy. Mount the Caddy example on that host and issue public TLS certificates. Adapt it if the proxy runs inside a container instead.
5. Validate readiness, authentication/scopes, real reads/writes, uniqueness, safe errors, management network policy, and browser rendering against the real environment. Rehearse backup restoration and rollback. Hosted CI and image builds must pass independently of local checks.

The migration image accepts DATABASE_URL or DATABASE_URL_FILE, DATABASE_PROVIDER, and the selected schema history. The migration connection is independent of the runtime URL. Use a controlled deployment job; do not run development migrate commands or db push in production. Native Prisma migration tooling needs the same locked project dependencies and generated provider model copies.

Application provider switching requires no business-code changes but does require target schema provisioning and an explicit data cutover. See [portability](database-portability.md). Keycloak development settings, local random credentials, start-dev, and realm-import client secrets are not production identity configuration.

Container health probes use independent application liveness/readiness. Prometheus is internal on port 9090 and must not be published publicly. Read-only filesystems use bounded /tmp mounts. Graceful shutdown closes HTTP and database pools. Compose stop grace periods exceed ordinary request timeouts; tune them to actual workload and platform behavior.
