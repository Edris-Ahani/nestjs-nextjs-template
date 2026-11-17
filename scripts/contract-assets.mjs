import { readFileSync, writeFileSync } from "node:fs";
const canonical = readFileSync(new URL("../contracts/openapi.yaml", import.meta.url), "utf8");
const native = new URL("../backend/src/assets/openapi.yaml", import.meta.url);
if (process.argv[2] === "sync") writeFileSync(native, canonical);
else if (process.argv[2] !== "check" || readFileSync(native, "utf8") !== canonical) {
  console.error("Native OpenAPI asset is stale; run npm run api:generate"); process.exitCode = 1;
}
