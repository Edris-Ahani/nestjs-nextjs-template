import { expect, it } from "vitest";
import { loadConfiguration } from "../src/platform/config/runtime-config.js";
const base = { DATABASE_URL: "postgresql://user:private-value@localhost/platform", OIDC_ISSUER_URI: "http://localhost/realm", OIDC_JWK_SET_URI: "http://localhost/keys", OIDC_AUDIENCE: "platform-api" };
it("fails closed without disclosing configuration values", () => {
  expect(() => loadConfiguration({ ...base, DATABASE_PROVIDER: "mysql" })).toThrow("DATABASE_URL");
  expect(() => loadConfiguration({ ...base, OIDC_AUDIENCE: "" })).toThrow("OIDC_AUDIENCE");
  expect(() => loadConfiguration({ ...base, DATABASE_POOL_SIZE: "0" })).toThrow("DATABASE_POOL_SIZE");
  try { loadConfiguration({ ...base, DATABASE_URL: "private-value" }); } catch (error) { expect(String(error)).not.toContain("private-value"); }
});
it("requires verified TLS and disabled documentation in production", () => {
  const production = { ...base, NODE_ENV: "production", OIDC_ISSUER_URI: "https://identity.example.com/realm", OIDC_JWK_SET_URI: "https://identity.example.com/keys" };
  expect(() => loadConfiguration(production)).toThrow("TLS");
  expect(loadConfiguration({ ...production, DATABASE_URL: base.DATABASE_URL + "?sslmode=verify-full" }).NODE_ENV).toBe("production");
  expect(() => loadConfiguration({ ...production, DATABASE_URL: base.DATABASE_URL + "?sslmode=verify-full", PLATFORM_API_DOCS_ENABLED: "true" })).toThrow("documentation");
});
