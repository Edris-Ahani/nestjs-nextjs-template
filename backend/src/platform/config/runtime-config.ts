import { readFileSync } from "node:fs";
import { z } from "zod";

const origin = z.url().refine(value => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
});
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
  MANAGEMENT_HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  MANAGEMENT_PORT: z.coerce.number().int().min(1).max(65535).default(9090),
  DATABASE_PROVIDER: z.enum(["postgresql", "mysql"]).default("postgresql"),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  OIDC_ISSUER_URI: origin,
  OIDC_JWK_SET_URI: origin,
  OIDC_AUDIENCE: z.string().min(1),
  PLATFORM_API_DOCS_ENABLED: z.enum(["true", "false"]).default("false").transform(value => value === "true"),
});
export type Configuration = z.output<typeof schema>;
export const CONFIGURATION = Symbol("Configuration");

export function loadConfiguration(environment: NodeJS.ProcessEnv): Configuration {
  let databaseUrl = environment.DATABASE_URL;
  if (environment.DATABASE_URL_FILE) {
    if (databaseUrl) throw new Error("Set only DATABASE_URL or DATABASE_URL_FILE");
    databaseUrl = readFileSync(environment.DATABASE_URL_FILE, "utf8").trim();
  }
  const result = schema.safeParse({ ...environment, DATABASE_URL: databaseUrl });
  if (!result.success) {
    throw new Error("Invalid configuration keys: " + result.error.issues.map(issue => issue.path.join(".")).join(", "));
  }
  const config = result.data;
  let url: URL;
  try { url = new URL(config.DATABASE_URL); } catch { throw new Error("Invalid DATABASE_URL"); }
  const protocols = config.DATABASE_PROVIDER === "postgresql" ? ["postgres:", "postgresql:"] : ["mysql:"];
  if (!protocols.includes(url.protocol) || !url.hostname || url.pathname.length < 2 || url.hash) {
    throw new Error("DATABASE_URL does not match DATABASE_PROVIDER");
  }
  if (config.PORT === config.MANAGEMENT_PORT) throw new Error("Application and management ports must differ");
  if (config.NODE_ENV === "production") {
    if (![config.OIDC_ISSUER_URI, config.OIDC_JWK_SET_URI].every(value => new URL(value).protocol === "https:")) {
      throw new Error("Production identity endpoints require HTTPS");
    }
    const secure = config.DATABASE_PROVIDER === "postgresql"
      ? url.searchParams.get("sslmode") === "verify-full"
      : url.searchParams.get("sslaccept") === "strict";
    if (!secure) throw new Error("Production database connections require verified TLS");
    if (config.PLATFORM_API_DOCS_ENABLED) throw new Error("Production API documentation must remain disabled");
  }
  return Object.freeze(config);
}
