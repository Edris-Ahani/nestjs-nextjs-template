import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const reserved = new Set(["platform", "shared", "generated"]);
export function analyzeSources(sources) {
  const errors = [];
  const edges = new Map(Object.keys(sources).map(name => [name, []]));
  for (const [name, source] of Object.entries(sources)) {
    const [feature, layer] = name.split("/");
    const imports = ts.preProcessFile(source, true, true).importedFiles.map(reference => reference.fileName);
    for (const dependency of imports) {
      const local = dependency.startsWith(".");
      const target = local ? path.posix.normalize(path.posix.join(path.posix.dirname(name), dependency)).replace(/\.js$/, ".ts") : dependency;
      const [otherFeature, otherLayer] = target.split("/");
      if (local && !(target in sources)) errors.push(name + ": unresolved source dependency " + target);
      if (local && target in sources) edges.get(name).push(target);
      if (layer === "domain" || layer === "application") {
        if (!local && !dependency.startsWith("node:")) errors.push(name + ": domain/application depends on an external framework");
        if (local && otherFeature !== "shared" && (otherFeature !== feature || !["domain", "application"].includes(otherLayer))) {
          errors.push(name + ": domain/application imports infrastructure or another feature");
        }
        if (layer === "domain" && otherFeature === feature && otherLayer !== "domain") errors.push(name + ": domain depends on application");
      }
      if (layer === "web" && ["persistence", "generated"].includes(otherLayer)) errors.push(name + ": web imports persistence");
      if (layer === "persistence" && otherLayer === "web") errors.push(name + ": persistence imports web");
      if (feature === "platform" && local && !reserved.has(otherFeature)) errors.push(name + ": platform imports a business feature");
      if (feature === "shared" && (local && otherFeature !== "shared" || !local && !dependency.startsWith("node:"))) errors.push(name + ": shared code is not independent");
      if (name.includes("/") && !reserved.has(feature) && local && !reserved.has(otherFeature) && otherFeature !== feature && otherLayer !== "api") {
        errors.push(name + ": cross-feature dependency must use api");
      }
      if (feature !== "platform" && feature !== "generated" && local && otherFeature === "generated") errors.push(name + ": generated clients belong to platform infrastructure");
    }
  }
  const active = new Set();
  const complete = new Set();
  function visit(name) {
    if (active.has(name)) { errors.push("Dependency cycle at " + name); return; }
    if (complete.has(name)) return;
    active.add(name);
    for (const target of edges.get(name) ?? []) visit(target);
    active.delete(name); complete.add(name);
  }
  for (const name of edges.keys()) visit(name);
  return errors;
}
export function verifyArchitecture(directory) {
  const sources = {};
  function collect(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "generated") continue;
      const filename = path.join(current, entry.name);
      if (entry.isDirectory()) collect(filename);
      else if (entry.name.endsWith(".ts")) sources[path.relative(directory, filename).replaceAll(path.sep, "/")] = readFileSync(filename, "utf8");
    }
  }
  collect(directory);
  // Generated imports are opaque infrastructure nodes, not business modules.
  for (const provider of ["postgresql", "mysql"]) sources["generated/" + provider + "/client.ts"] = "";
  return analyzeSources(sources);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verifyArchitecture(fileURLToPath(new URL("../src", import.meta.url)));
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else console.log("Architecture checks passed");
}
