# ADR: OIDC bearer resource server

Status: Accepted

## Context

The demonstration catalog is public, but machine-to-machine creation requires scoped authorization without exposing identity client secrets in the browser.

## Decision

Use Keycloak for local identity and validate RS256 bearer JWTs with issuer, audience, expiry, required claims, and scopes. Cache remote JWKS with bounded fetch timeouts. Public access is explicit; unmarked handlers are denied. No cookies, local password login, or server-side authentication sessions are introduced.

## Consequences

OIDC providers can be replaced through configuration. Production requires HTTPS endpoints. Browser login/cookies require a separate CSRF/session design. Secrets remain server-side, and invalid credentials produce sanitized correlated problems.
