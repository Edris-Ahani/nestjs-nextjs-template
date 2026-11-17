import { copyFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { databaseProvider, databaseUrl } from "../backend/config/database.mjs";
import { localEnvironment, projectRoot } from "./lib/environment.mjs";
const require = createRequire(new URL("../backend/package.json", import.meta.url));
const backend = path.join(projectRoot, "backend");
const command = process.argv[2];
function prisma(args, environment) {
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
    cwd: backend, env: environment, stdio: "inherit", timeout: 300000,
  });
  if (result.error || result.status !== 0) throw new Error("Prisma command failed");
}
try {
  if (["generate", "check"].includes(command)) {
    for (const provider of ["postgresql", "mysql"]) {
      const target = path.join(backend, "prisma", provider, "models.prisma");
      const model = path.join(backend, "prisma/models.prisma");
      if (command === "check" && readFileSync(target, "utf8") !== readFileSync(model, "utf8")) {
        throw new Error("Provider model drift; run npm run db:generate");
      }
      if (command === "generate") copyFileSync(model, target);
      prisma([command === "generate" ? "generate" : "validate"], {
        ...process.env, DATABASE_PROVIDER: provider,
        DATABASE_URL: provider + "://build:build@127.0.0.1:" + (provider === "mysql" ? "3306" : "5432") + "/build",
      });
    }
  } else if (["deploy", "dev", "status"].includes(command)) {
    const environment = localEnvironment();
    if (environment.DATABASE_URL_FILE) {
      if (environment.DATABASE_URL) throw new Error("Set only DATABASE_URL or DATABASE_URL_FILE");
      environment.DATABASE_URL = readFileSync(environment.DATABASE_URL_FILE, "utf8").trim();
    }
    databaseUrl(environment, databaseProvider(environment));
    const args = ["migrate", command];
    const extra = process.argv.slice(3);
    if (command === "dev" && extra.length) {
      if (extra.length !== 2 || extra[0] !== "--name" || !/^[a-zA-Z0-9_-]+$/.test(extra[1])) throw new Error("Use --name migration_name");
      args.push(...extra);
    } else if (extra.length) throw new Error("Unexpected migration arguments");
    prisma(args, environment);
  } else throw new Error("Expected generate, check, deploy, dev, or status");
} catch { console.error("Database command failed. Check configuration, generated models, migration history, and connectivity."); process.exitCode = 1; }
