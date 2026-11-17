# Create a project from the template

Use Node.js 24 to run the generator from this template directory. Generation needs only built-in Node.js modules; Git, installed npm dependencies, Prisma clients, and a container runtime are unnecessary for this step.

```sh
node scripts/create-project.mjs
```

On Windows, use:

```bat
cmd /c node scripts\create-project.mjs
```

Enter a lowercase name such as `blue-shop`. Names contain 2-28 ASCII letters, digits, and single hyphens, start with a letter, and exclude Windows device names. The limit keeps generated application usernames within [MySQL's 32-character limit](https://dev.mysql.com/doc/refman/8.4/en/user-names.html). Spaces, separators, traversal, and shell metacharacters are rejected. The same script works on Windows, Linux, and macOS.

Noninteractive generation supports both application database providers:

```sh
node scripts/create-project.mjs --name blue-shop
node scripts/create-project.mjs --name green-shop --database mysql
```

PostgreSQL is the default. With `--database mysql` alone, the script still prompts for the project name. Keycloak retains its separate PostgreSQL database on either application provider.

The destination is always beside the actual source template directory, independently of the current terminal directory:

```text
MyProjects/
  nestjs-nextjs-template/
  blue-shop/
```

## Generated names

| Setting | Example |
| --- | --- |
| Directory, root npm package, development Compose project | `blue-shop` |
| Backend and frontend packages | `@blue-shop/api`, `@blue-shop/web` |
| Application database on either provider | `blue_shop` |
| Application database user | `blue_shop_app` |
| Keycloak database and user | `blue_shop_identity` |
| Development images | `localhost/blue-shop-api:dev`, `localhost/blue-shop-web:dev`, `localhost/blue-shop-migrate:dev` |
| Production Compose project | `blue-shop-production` |
| Production URL secret-file directory | `/run/blue-shop-secrets/` |

The generator updates workspace links in the npm lockfile, both database overlays, setup connection URLs, identity configuration and health checks, image build tags, frontend branding, canonical and copied OpenAPI assets, Scalar, and their HTTP/browser/smoke assertions together. Dependency versions and integrity values are preserved. API paths, feature directories, OAuth realm, scopes, audience, and immutable migration histories retain their technical contracts.

## Configuration and startup

Only reviewed regular files in [template.json](../template.json) are copied. Git history, private environments, agent state, downloaded references, installed dependencies, generated Prisma clients, build output, and unlisted files are excluded. Binary files are copied without text conversion. The copied setup command generates independent random development credentials in `.env` and creates `frontend/.env.local`; credentials are never printed. Source configuration and runtime data are preserved.

The script does not install dependencies, generate Prisma clients, create a Git repository, start services, commit, push, or change host tools. Prepare the tools in the [installation guide](getting-started.md), then run these from the new directory:

```sh
npm run doctor
npm run stack:up
```

For native development, install dependencies with `npm ci --ignore-scripts`, generate both clients with `npm run db:generate`, then follow [development](development.md). Container builds install dependencies and generate clients themselves. On Windows, prefix commands with `cmd /c`.

Published ports retain defaults 3001, 8081, 8181, 15433, and 13307. Stop the source stack before starting a generated stack on the same ports, or configure distinct ports and corresponding native URLs for simultaneous stacks. Compose project names isolate networks, containers, and named volumes, but do not prevent host port conflicts. Production infrastructure, domains, image digests, runtime and migration database users, and private URL files still need real deployment configuration; generation does not provision them.

Existing destinations are never merged or overwritten. Invalid names, missing source files, unsafe inventory paths, and symbolic links fail before destination creation. A failure during copying or setup identifies an incomplete destination for inspection; the script does not recursively delete that directory. Inspect it before removing it or selecting a new name.

## Maintain the inventory

When adding or removing maintained template files, review them before running:

```sh
npm run template:sync
npm run template:check
npm run template:test
```

Inventory maintenance requires a Git checkout. Sync includes tracked and untracked non-ignored files and rejects known private or generated paths. Listing a file is an explicit decision to distribute its contents; review the inventory diff and keep examples free of real credentials. The check runs separately from shared verification because generated projects have no Git repository initially. Generator tests need neither dependencies nor external tools.

A generated project includes its adjusted naming metadata and generator, allowing it to create another sibling with different names and fresh credentials. Initialize its own Git repository before maintaining the inventory for newly added files.
