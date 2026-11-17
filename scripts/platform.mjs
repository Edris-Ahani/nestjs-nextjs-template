import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statfsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { databaseProvider, databaseUrl } from "../backend/config/database.mjs";
import { localEnvironment, projectRoot as root } from "./lib/environment.mjs";
const windows = process.platform === "win32";
const command = process.argv[2];
function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { cwd: root, stdio: "inherit", env: localEnvironment(), timeout: 1200000, ...options });
  if (result.error || result.status !== 0) throw new Error("Command failed: " + path.basename(binary));
}
function engine(environment) {
  if (environment.CONTAINER_ENGINE === "docker") return environment.DOCKER_BIN || "docker";
  if (environment.CONTAINER_ENGINE && environment.CONTAINER_ENGINE !== "podman") throw new Error("CONTAINER_ENGINE must be podman or docker");
  const candidate = path.join(process.env.LOCALAPPDATA ?? "", "Programs/Podman/podman.exe");
  return environment.PODMAN_BIN || (windows && existsSync(candidate) ? candidate : "podman");
}
function setup() {
  const args = process.argv.slice(3);
  if (args.length > 1 || args[0] && !/^--database=(postgresql|mysql)$/.test(args[0])) throw new Error("Use setup -- --database=postgresql or --database=mysql");
  const destination = path.join(root, ".env");
  if (!existsSync(destination)) {
    const provider = args[0]?.split("=")[1] ?? "postgresql";
    let content = readFileSync(path.join(root, ".env.example"), "utf8");
    content = content.replace("DATABASE_PROVIDER=postgresql", "DATABASE_PROVIDER=" + provider);
    for (const key of ["DATABASE_PASSWORD", "IDENTITY_DATABASE_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD", "CATALOG_CLIENT_SECRET", "MYSQL_ROOT_PASSWORD"]) {
      content = content.replace(key + "=\n", key + "=" + randomBytes(32).toString("hex") + "\n");
    }
    const values = parseEnv(content);
    const port = provider === "mysql" ? values.MYSQL_PORT : values.POSTGRES_PORT;
    content = content.replace("DATABASE_URL=\n", "DATABASE_URL=" + provider + "://platform:" + values.DATABASE_PASSWORD + "@localhost:" + port + "/platform\n");
    writeFileSync(destination, content, { flag: "wx", mode: 0o600 });
    console.log("Created local configuration with random development credentials; values are not printed.");
  } else console.log("Preserved existing local configuration; database selection was not changed.");
  const frontend = path.join(root, "frontend/.env.local");
  if (!existsSync(frontend)) {
    const values = localEnvironment();
    writeFileSync(frontend, "BACKEND_URL=" + (values.BACKEND_URL ?? "http://localhost:8081") + "\n", { flag: "wx" });
  }
}
function buildStack(environment) {
  for (const [directory, image, target] of [["backend", "api", "runtime"], ["frontend", "web", "runtime"], ["backend", "migrate", "migration"]]) {
    const filesystem = statfsSync(root);
    if (filesystem.bavail * filesystem.bsize < 2 * 1024 ** 3) throw new Error("Container builds require at least 2 GiB of free disk space");
    run(engine(environment), ["build", "--target", target, "-f", directory + "/Containerfile", "-t", "localhost/nestjs-foundry-" + image + ":dev", "."]);
  }
}
try {
  const environment = localEnvironment();
  if (command === "setup") setup();
  else if (command === "doctor") {
    console.log("Node.js " + process.versions.node + "; expected major version 24");
    if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Node.js 24 is required");
    run(engine(environment), ["version"], { timeout: 15000 });
    run(engine(environment), ["compose", "version"], { timeout: 15000 });
    console.log("Local configuration exists: " + existsSync(path.join(root, ".env")));
  } else if (command === "stack-build") buildStack(environment);
  else if (["infra-up", "stack-up", "stack-start", "stack-down"].includes(command)) {
    if (!existsSync(path.join(root, ".env"))) throw new Error("Run npm run setup first");
    const provider = databaseProvider(environment);
    const url = new URL(databaseUrl(environment, provider));
    url.hostname = "database"; url.port = provider === "mysql" ? "3306" : "5432";
    if (command === "stack-up") buildStack(environment);
    const args = ["compose", "--env-file", ".env", "-f", "infra/compose.yml", "-f", "infra/databases/" + provider + ".yml"];
    if (command !== "infra-up") args.push("--profile", "app");

    const settings = { env: { ...environment, CONTAINER_DATABASE_URL: url.href } };
    if (command === "stack-down") run(engine(environment), [...args, "--profile", "tools", "down"], settings);
    else {
      run(engine(environment), [...args, "up", "-d", "database", "identity-db", "identity"], settings);
      if (command !== "infra-up") {
        run(engine(environment), [...args, "run", "--rm", "--no-deps", "migrate"], settings);
        run(engine(environment), [...args, "up", "-d", "--no-build", "api", "web"], settings);
      }
    }
  } else if (command === "backend-dev") {
    if (!process.env.npm_execpath) throw new Error("Run through npm run dev:backend");
    run(process.execPath, [process.env.npm_execpath, "run", "dev", "--workspace", "backend"], {
      env: { ...environment, PORT: environment.API_PORT ?? "8081" }, timeout: undefined,
    });
  } else throw new Error("Unknown platform command");
} catch (error) { console.error(error.message); process.exitCode = 1; }
