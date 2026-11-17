import { cp, mkdir, copyFile } from "node:fs/promises";
await mkdir("dist/assets", { recursive: true });
await cp("src/assets/api-reference", "dist/assets/api-reference", { recursive: true });
await copyFile("../contracts/openapi.yaml", "dist/assets/openapi.yaml");
