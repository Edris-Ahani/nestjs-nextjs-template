# Installation and first run

Install Node.js 24 with npm 11.13 or newer in major 11. Use npm 11.21.2 for dependency updates, matching the pinned package manager and CI. Install Git if using API compatibility against history. Install Podman and a Compose provider, or Docker Compose, for the complete stack. No Java or Maven is required.

On Windows/macOS, inspect existing container machines before starting one. Do not initialize, reconfigure, or delete a machine without reviewing the host setup. Linux can run Podman natively. Set CONTAINER_ENGINE=docker in the private environment to use Docker; PODMAN_BIN and DOCKER_BIN support custom executable paths.

From the repository root on Windows:

    cmd /c npm ci --ignore-scripts
    cmd /c npm run db:generate
    cmd /c npm run setup
    cmd /c npm run doctor
    cmd /c npm run stack:up

On Linux/macOS, omit cmd /c. Generation is explicit because dependency installation intentionally does not execute lifecycle hooks. It generates both provider clients without connecting to a database. Setup creates private root/frontend environments and fresh random credentials; it never copies secrets from another checkout or overwrites an existing .env.

For a new MySQL checkout, replace setup with npm run setup -- --database=mysql. Existing configuration is preserved even when passing that flag; edit provider and URL explicitly to switch an existing checkout. Read [database portability](database-portability.md).

Open http://localhost:3001 and http://localhost:8081/docs. The catalog starts empty. Writes require a short-lived Keycloak client-credentials token with catalog:write; secrets remain outside the browser. npm run test:smoke creates one local record after the stack is ready. Private values are never printed by setup or smoke tooling.

Stop the stack with npm run stack:down. This preserves database volumes. Changing .env passwords does not rotate credentials on initialized volumes or existing identity realms. Rotate through the service's supported administrative process; do not delete data to solve a mismatch.

See [development](development.md) for host reload, [verification](verification.md) for checks, and [deployment](deployment.md) for production.
