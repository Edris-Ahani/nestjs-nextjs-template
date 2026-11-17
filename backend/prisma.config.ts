import { defineConfig } from "prisma/config";
import { databaseProvider, databaseUrl } from "./config/database.mjs";
const provider = databaseProvider(process.env);
export default defineConfig({
  schema: `prisma/${provider}`, migrations: { path: `prisma/${provider}/migrations` },
  datasource: { url: databaseUrl(process.env, provider) },
});
