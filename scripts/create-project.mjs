import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { chmod, copyFile, lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

export const templateRoot = fileURLToPath(new URL("../", import.meta.url));
const exampleFiles = new Set([".env.example", "frontend/.env.local.example", "infra/production/.env.example"]);
const excludedDirectories = new Set([
  ".git", "node_modules", "target", ".next", ".tools", ".cache", ".npm", ".m2", ".idea", ".vscode",
  "coverage", "test-results", "playwright-report", ".auth", ".ssh", ".secrets", "secrets", "backups", "dumps",
  ".aws", ".agents", ".codex", ".claude", ".gemini", ".direnv", ".vercel", ".playwright-cli", "dist", "generated",
]);
const brandingFiles = [
  "README.md", "infra/compose.yml", "infra/production/compose.yml", "infra/production/.env.example",
  "scripts/platform.mjs", "scripts/api-compatibility.mjs", "scripts/smoke-test.mjs", "contracts/openapi.yaml",
  "infra/databases/postgresql.yml", "infra/databases/mysql.yml", "backend/src/assets/openapi.yaml",
  "backend/src/assets/api-reference/index.html", "backend/src/assets/api-reference/config.js", "backend/test/http.test.ts",
  "frontend/src/app/layout.tsx", "frontend/src/app/page.tsx", "frontend/api-e2e/scalar.spec.ts",
];
const customizedFiles = new Set([
  ...brandingFiles, "package.json", "backend/package.json", "frontend/package.json", "package-lock.json", ".env.example", "template.json",
]);

export function validateProjectName(value) {
  if (typeof value !== "string" || value.length < 2 || value.length > 28
    || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
    || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(value)) {
    throw new Error("Use 2-28 lowercase letters, digits, and single hyphens; start with a letter and avoid Windows device names");
  }
  return value;
}

export function validateTemplateFile(filename) {
  if (typeof filename !== "string" || !filename || filename.includes("\\")
    || filename.split("/").some(part => !/^[a-zA-Z0-9._-]+$/.test(part) || part === "." || part === "..")) {
    throw new Error("Template inventory contains an invalid relative path");
  }
  const parts = filename.split("/");
  const basename = parts.at(-1).toLowerCase();
  if (parts.some(part => excludedDirectories.has(part.toLowerCase())) || filename.toLowerCase().startsWith("tooling/vendor/")
    || (!exampleFiles.has(filename) && /(^|\.)env($|\.)/.test(basename))
    || /\.(?:key|pem|p12|pfx|jks|keystore|log|dump|backup|hprof|jfr|tsbuildinfo)$/i.test(basename)
    || /^(?:id_rsa|id_ed25519|next-env\.d\.ts|\.envrc|\.ds_store|thumbs\.db|desktop\.ini)$/.test(basename)) {
    throw new Error(`Private or generated file is not permitted in the template inventory: ${filename}`);
  }
  return filename;
}

export async function loadTemplate(sourceRoot) {
  const configuration = JSON.parse(await readFile(path.join(sourceRoot, "template.json"), "utf8"));
  if (configuration.schemaVersion !== 1 || !Array.isArray(configuration.files) || !configuration.files.length) {
    throw new Error("Invalid or empty template inventory; run npm run template:sync in the template repository");
  }
  validateProjectName(configuration.project?.name);
  validateProjectName(configuration.project?.brandName);
  if (typeof configuration.project.readmeTitle !== "string" || !/^[a-zA-Z][a-zA-Z0-9 +.,:-]{0,100}$/.test(configuration.project.readmeTitle)) {
    throw new Error("Invalid template README title");
  }
  for (const key of ["title", "database", "databaseUser", "identityDatabase", "identityUser"]) {
    const pattern = key === "title" ? /^[a-zA-Z][a-zA-Z0-9 -]{0,62}$/ : /^[a-z][a-z0-9_]{0,62}$/;
    if (typeof configuration.project[key] !== "string" || !pattern.test(configuration.project[key])) {
      throw new Error(`Invalid template project setting: ${key}`);
    }
  }
  const unique = new Set(configuration.files.map(validateTemplateFile));
  if (unique.size !== configuration.files.length || !unique.has("template.json")) {
    throw new Error("Template inventory must contain unique paths, including template.json");
  }
  if (!Array.isArray(configuration.executables)
    || configuration.executables.some(filename => !unique.has(validateTemplateFile(filename)))) {
    throw new Error("Executable paths must belong to the template file inventory");
  }
  return configuration;
}

function replaceRequired(text, search, replacement, filename) {
  if (!text.includes(search)) throw new Error(`Expected template setting is missing in ${filename}`);
  return text.replaceAll(search, replacement);
}

function customizeJson(files, project) {
  const rootPackage = JSON.parse(files.get("package.json"));
  const lock = JSON.parse(files.get("package-lock.json"));
  rootPackage.name = project.name;
  lock.name = project.name;
  lock.packages[""].name = project.name;
  const workspaces = [];
  for (const [directory, suffix] of [["backend", "api"], ["frontend", "web"]]) {
    const filename = `${directory}/package.json`;
    const value = JSON.parse(files.get(filename));
    const oldWorkspace = `node_modules/${value.name}`;
    const workspace = lock.packages[oldWorkspace];
    if (!workspace?.link || workspace.resolved !== directory) throw new Error("Unexpected workspace lockfile structure");
    value.name = `@${project.name}/${suffix}`;
    lock.packages[directory].name = value.name;
    delete lock.packages[oldWorkspace];
    lock.packages[`node_modules/${value.name}`] = workspace;
    workspaces.push([filename, value]);
  }
  for (const [filename, value] of [["package.json", rootPackage], ...workspaces, ["package-lock.json", lock]]) {
    files.set(filename, `${JSON.stringify(value, null, 2)}\n`);
  }
}

function customizeSources(files, previous, project) {
  for (const [filename, prefix, suffix] of [
    ["contracts/openapi.yaml", "title: ", " Catalog API"],
    ["backend/src/assets/openapi.yaml", "title: ", " Catalog API"],
    ["scripts/smoke-test.mjs", '"', ' API Reference"'],
    ["backend/test/http.test.ts", "/", " API Reference/"],
    ["backend/src/assets/api-reference/index.html", 'content="', " API reference,"],
    ["backend/src/assets/api-reference/index.html", "<title>", " API Reference</title>"],
    ["frontend/src/app/layout.tsx", 'title: "', ' | NestJS + Next Platform"'],
    ["frontend/src/app/page.tsx", "<span>", " / Application foundation</span>"],
    ["frontend/api-e2e/scalar.spec.ts", 'name: "', ' Catalog API"'],
  ]) {
    files.set(filename, replaceRequired(files.get(filename), `${prefix}${previous.title}${suffix}`,
      `${prefix}${project.title}${suffix}`, filename));
  }
  for (const [filename, prefix, suffix] of [
    ["infra/compose.yml", "COMPOSE_PROJECT_NAME:-", "}"],
    ["infra/compose.yml", "localhost/", "-"],
    ["infra/production/compose.yml", "name: ", "-production"],
    ["infra/production/.env.example", "/", "-api@"],
    ["infra/production/.env.example", "/", "-web@"],
    ["infra/production/.env.example", "/", "-migrate@"],
    ["scripts/platform.mjs", "localhost/", "-"],
  ]) {
    files.set(filename, replaceRequired(files.get(filename), `${prefix}${previous.name}${suffix}`,
      `${prefix}${project.name}${suffix}`, filename));
  }
  files.set("README.md", replaceRequired(files.get("README.md"), `# ${previous.readmeTitle}\n`, `# ${project.readmeTitle}\n`, "README.md"));
  for (const [filename, prefix, suffix] of [
    ["scripts/api-compatibility.mjs", '"', "-api-compatibility-"],
    ["backend/src/assets/api-reference/index.html", 'id="', '-api-reference"'],
    ["backend/src/assets/api-reference/config.js", '"#', '-api-reference"'],
    ["frontend/src/app/page.tsx", "</span>", "<span"],
  ]) {
    files.set(filename, replaceRequired(files.get(filename), `${prefix}${previous.brandName}${suffix}`,
      `${prefix}${project.brandName}${suffix}`, filename));
  }
  let environment = files.get(".env.example");
  const values = parseEnv(environment);
  for (const key of ["POSTGRES_PORT", "MYSQL_PORT"]) {
    if (!/^\d+$/.test(values[key]) || Number(values[key]) < 1 || Number(values[key]) > 65535) throw new Error(`Invalid ${key} in .env.example`);
  }
  for (const [key, value] of [["COMPOSE_PROJECT_NAME", project.name], ["DATABASE_USERNAME", project.databaseUser],
    ["DATABASE_URL", ""],
    ...["DATABASE_PASSWORD", "IDENTITY_DATABASE_PASSWORD", "KEYCLOAK_ADMIN_PASSWORD", "CATALOG_CLIENT_SECRET", "MYSQL_ROOT_PASSWORD"].map(key => [key, ""])]) {
    if (!new RegExp(`^${key}=`, "m").test(environment)) throw new Error(`Missing environment example setting: ${key}`);
    environment = environment.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
  }
  files.set(".env.example", environment);
  let compose = files.get("infra/compose.yml");
  const databaseLine = (text, key, previousName, nextName, filename) => {
    const expression = new RegExp(`^      ${key}: (?:"${previousName}"|${previousName})$`, "m");
    if (!expression.test(text)) throw new Error(`Expected ${key} in ${filename}`);
    return text.replace(expression, `      ${key}: "${nextName}"`);
  };
  compose = databaseLine(compose, "POSTGRES_DB", previous.identityDatabase, project.identityDatabase, "infra/compose.yml");
  for (const [search, replacement] of [
    [`POSTGRES_USER: ${previous.identityUser}\n`, `POSTGRES_USER: ${project.identityUser}\n`],
    [`"-U", "${previous.identityUser}", "-d", "${previous.identityDatabase}"`, `"-U", "${project.identityUser}", "-d", "${project.identityDatabase}"`],
    [`jdbc:postgresql://identity-db:5432/${previous.identityDatabase}\n`, `jdbc:postgresql://identity-db:5432/${project.identityDatabase}\n`],
    [`KC_DB_USERNAME: ${previous.identityUser}\n`, `KC_DB_USERNAME: ${project.identityUser}\n`],
  ]) compose = replaceRequired(compose, search, replacement, "infra/compose.yml");
  files.set("infra/compose.yml", compose);
  for (const [provider, key] of [["postgresql", "POSTGRES_DB"], ["mysql", "MYSQL_DATABASE"]]) {
    const filename = `infra/databases/${provider}.yml`;
    let content = databaseLine(files.get(filename), key, previous.database, project.database, filename);
    content = replaceRequired(content, `DATABASE_USERNAME:-${previous.databaseUser}}`, `DATABASE_USERNAME:-${project.databaseUser}}`, filename);
    files.set(filename, content);
  }
  let platform = files.get("scripts/platform.mjs");
  platform = replaceRequired(platform, `"://${previous.databaseUser}:"`, `"://${project.databaseUser}:"`, "scripts/platform.mjs");
  platform = replaceRequired(platform, `"/${previous.database}\\n"`, `"/${project.database}\\n"`, "scripts/platform.mjs");
  files.set("scripts/platform.mjs", platform);
  let production = files.get("infra/production/.env.example");
  production = production.replace(/^DATABASE_URL_FILE=.*$/m, `DATABASE_URL_FILE=/run/${project.name}-secrets/runtime-database-url`)
    .replace(/^MIGRATION_URL_FILE=.*$/m, `MIGRATION_URL_FILE=/run/${project.name}-secrets/migration-database-url`);
  files.set("infra/production/.env.example", production);
  files.set("frontend/src/app/page.tsx", files.get("frontend/src/app/page.tsx")
    .replace(`aria-hidden="true">${previous.brandName[0]}</span>`, `aria-hidden="true">${project.brandName[0]}</span>`));
}

export async function createProject(name, { sourceRoot = templateRoot, databaseProvider = "postgresql" } = {}) {
  validateProjectName(name);
  if (!["postgresql", "mysql"].includes(databaseProvider)) throw new Error("Database must be postgresql or mysql");
  const source = await realpath(sourceRoot);
  const destination = path.join(path.dirname(source), name);
  const configuration = await loadTemplate(source);
  const database = name.replaceAll("-", "_");
  const project = {
    name, title: name.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join(" "),
    database, databaseUser: `${database}_app`, identityDatabase: `${database}_identity`, identityUser: `${database}_identity`, brandName: name,
  };
  project.readmeTitle = `${project.title}: NestJS, Next.js, and Podman`;
  const textFiles = new Map();
  const sourceFiles = [];
  for (const filename of configuration.files) {
    let current = source;
    for (const segment of filename.split("/")) {
      current = path.join(current, segment);
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symbolic links are not permitted: ${filename}`);
    }
    const info = await lstat(current);
    if (!info.isFile()) throw new Error(`Expected a regular template file: ${filename}`);
    sourceFiles.push({ filename, path: current, mode: info.mode });
    if (customizedFiles.has(filename)) {
      textFiles.set(filename, (await readFile(current, "utf8")).replaceAll("\r\n", "\n"));
    }
  }
  for (const filename of customizedFiles) {
    if (!textFiles.has(filename)) throw new Error(`Missing required template file: ${filename}`);
  }
  customizeJson(textFiles, project);
  customizeSources(textFiles, configuration.project, project);
  textFiles.set("template.json", `${JSON.stringify({ ...configuration, project }, null, 2)}\n`);
  try {
    await mkdir(destination);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`Destination already exists; no files were changed: ${destination}`);
    throw error;
  }
  try {
    for (const file of sourceFiles) {
      const target = path.join(destination, file.filename);
      await mkdir(path.dirname(target), { recursive: true });
      if (textFiles.has(file.filename)) await writeFile(target, textFiles.get(file.filename), { flag: "wx" });
      else await copyFile(file.path, target, constants.COPYFILE_EXCL);
      if (process.platform !== "win32") {
        const mode = file.mode & 0o777;
        await chmod(target, configuration.executables.includes(file.filename) ? mode | 0o111 : mode);
      }
    }
    const setup = spawnSync(process.execPath, [path.join(destination, "scripts/platform.mjs"), "setup", `--database=${databaseProvider}`], {
      cwd: destination, encoding: "utf8", timeout: 15000, windowsHide: true,
    });
    if (setup.error || setup.status !== 0) throw new Error("Local configuration initialization failed");
  } catch {
    throw new Error(`Project creation failed. Inspect the incomplete directory before retrying: ${destination}`);
  }
  return { destination, project, fileCount: sourceFiles.length };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: node scripts/create-project.mjs [--name my-project] [--database postgresql|mysql]\nCreates a sibling project with fresh local credentials. Requires only Node.js 24.");
    return;
  }
  let name;
  let databaseProvider = "postgresql";
  const seen = new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--name", "--database"].includes(flag) || !value || seen.has(flag)) throw new Error("Use --name my-project and optional --database postgresql|mysql");
    seen.add(flag);
    if (flag === "--name") name = validateProjectName(value);
    else if (["postgresql", "mysql"].includes(value)) databaseProvider = value;
    else throw new Error("Database must be postgresql or mysql");
  }
  if (!name) {
    const input = createInterface({ input: process.stdin, output: process.stdout });
    const controller = new AbortController();
    input.on("close", () => controller.abort());
    input.on("SIGINT", () => controller.abort());
    try {
      name = validateProjectName((await input.question("Project name (lowercase kebab-case, e.g. blue-shop): ", {
        signal: controller.signal,
      })).trim());
    } catch (error) {
      if (error.name === "AbortError") throw new Error("No project name received; use --name my-project");
      throw error;
    } finally {
      input.close();
    }
  }
  const result = await createProject(name, { databaseProvider });
  console.log(`\nCreated ${result.project.title}: ${result.destination}\nApplication database: ${result.project.database}\nIdentity database: ${result.project.identityDatabase}\nFresh development credentials were generated and were not printed.\nNo dependencies were installed and no services were started.\n\nNext steps:\n  cd "${result.destination}"\n  npm run doctor\n  npm run stack:up\n\nDefault host ports are shared with the template; stop its stack before starting this one.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.code === "ERR_USE_AFTER_CLOSE" ? "No project name received; use --name my-project" : error.message);
    process.exitCode = 1;
  });
}
