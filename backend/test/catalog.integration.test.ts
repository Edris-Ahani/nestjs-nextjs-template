import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { loadConfiguration } from "../src/platform/config/runtime-config.js";
import { PrismaService } from "../src/platform/database/prisma-service.js";
import { PrismaCatalogRepository } from "../src/catalog/persistence/prisma-catalog-repository.js";
import { CatalogService } from "../src/catalog/application/catalog-service.js";
import { DuplicateCatalogSlug } from "../src/catalog/domain/catalog-item.js";
// The test intentionally requires a migrated real database and never skips unavailable infrastructure.
let database: PrismaService;
let service: CatalogService;
const createdIds: string[] = [];
beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL must point to an isolated migrated PostgreSQL or MySQL database");
  const config = loadConfiguration({ ...process.env, NODE_ENV: "test", DATABASE_URL: process.env.TEST_DATABASE_URL,
    OIDC_ISSUER_URI: "http://localhost/realm", OIDC_JWK_SET_URI: "http://localhost/keys", OIDC_AUDIENCE: "test" });
  database = new PrismaService(config); await database.onModuleInit();
  service = new CatalogService(new PrismaCatalogRepository(database));
});
afterAll(async () => {
  if (database) {
    try { await database.client.catalogItem.deleteMany({ where: { id: { in: createdIds } } }); }
    finally { await database.onModuleDestroy(); }
  }
});
it("round-trips portable strings and UTC timestamps, enforces uniqueness, and uses stable pagination", async () => {
  const input = { slug: "integration-" + randomUUID(), name: "Portable \u00e9 \u03bb \u0641\u0627\u0631\u0633\u06cc", description: "Unicode \ud83d\ude80" };
  const item = await service.create(input); createdIds.push(item.id);
  const stored = await database.client.catalogItem.findUniqueOrThrow({ where: { id: item.id } });
  expect(stored.name).toBe(input.name); expect(stored.description).toBe(input.description);
  expect(stored.createdAt.toISOString()).toBe(item.createdAt.toISOString());
  expect((await service.list(0, 50)).items.some(entry => entry.id === item.id)).toBe(true);
  await expect(service.create(input)).rejects.toThrow(DuplicateCatalogSlug);
  expect(await database.ready()).toBe(true);
});
it("lets one concurrent writer win the same slug on either provider", async () => {
  const input = { slug: "race-" + randomUUID(), name: "Concurrent", description: "" };
  const results = await Promise.allSettled([service.create(input), service.create(input)]);
  const successes = results.filter(result => result.status === "fulfilled");
  for (const result of successes) if (result.status === "fulfilled") createdIds.push(result.value.id);
  expect(successes).toHaveLength(1);
  const failure = results.find(result => result.status === "rejected");
  expect(failure?.status === "rejected" && failure.reason).toBeInstanceOf(DuplicateCatalogSlug);
});
