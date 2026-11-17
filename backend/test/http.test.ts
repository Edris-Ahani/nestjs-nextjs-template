import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { Controller, Get, type INestApplication } from "@nestjs/common";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import request from "supertest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { AppModule } from "../src/app-module.js";
import { CatalogService } from "../src/catalog/application/catalog-service.js";
import { DuplicateCatalogSlug } from "../src/catalog/domain/catalog-item.js";
import { PrismaService } from "../src/platform/database/prisma-service.js";
import { CONFIGURATION, loadConfiguration } from "../src/platform/config/runtime-config.js";
import { configureApp } from "../src/configure-app.js";

@Controller("internal")
class UnmarkedController {
  @Get()
  read() { return { private: true }; }
}

describe("HTTP security and canonical OpenAPI contract", () => {
  let app: INestApplication;
  let disabledDocs: INestApplication;
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  const issuer = "http://issuer.example.test/realms/platform";
  const audience = "platform-api";
  const item = { id: "8e756936-6419-4b0e-9c44-5b5ce3fa4627", slug: "reference", name: "Reference", description: "", createdAt: new Date("2026-11-17T00:00:00Z") };
  const body = { slug: "reference", name: "Reference", description: "" };
  const service = { list: vi.fn(async (page: number, size: number) => ({ items: [item], page, size, totalElements: 1, totalPages: 1 })), create: vi.fn(async () => item) };
  const database = { ready: vi.fn(async () => true) };
  const keyServer = createServer();
  const specification = parse(readFileSync(new URL("../../contracts/openapi.yaml", import.meta.url), "utf8"));
  const ajv = new Ajv.default({ strict: false });
  addFormats.default(ajv);
  ajv.addSchema({ $id: "contract", ...specification });
  function validResponse(payload: unknown, status: number, method: "get" | "post", media = "application/json") {
    const schema = specification.paths["/api/v1/catalog"][method].responses[String(status)];
    const reference = schema.$ref ? specification.components.responses[schema.$ref.split("/").pop()] : schema;
    const validation = ajv.compile({ $ref: "contract" + reference.content[media].schema.$ref });
    expect(validation(payload), JSON.stringify(validation.errors)).toBe(true);
  }
  async function token(options: { issuer?: string; audience?: string; scope?: string; expired?: boolean; signingKey?: typeof keys.privateKey; omitExpiry?: boolean } = {}) {
    let jwt = new SignJWT({ scope: options.scope ?? "catalog:write" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" }).setIssuer(options.issuer ?? issuer)
      .setAudience(options.audience ?? audience).setSubject("test-client").setIssuedAt();
    if (!options.omitExpiry) jwt = jwt.setExpirationTime(options.expired ? Math.floor(Date.now() / 1000) - 60 : "5m");
    return jwt.sign(options.signingKey ?? keys.privateKey);
  }
  async function application(docs: boolean) {
    const address = keyServer.address() as AddressInfo;
    const config = loadConfiguration({ NODE_ENV: "test", DATABASE_URL: "postgresql://test:test@localhost/test",
      OIDC_ISSUER_URI: issuer, OIDC_JWK_SET_URI: "http://127.0.0.1:" + address.port + "/keys", OIDC_AUDIENCE: audience,
      PLATFORM_API_DOCS_ENABLED: String(docs) });
    const module = await Test.createTestingModule({ imports: [AppModule], controllers: [UnmarkedController] })
      .overrideProvider(CONFIGURATION).useValue(config).overrideProvider(PrismaService).useValue(database)
      .overrideProvider(CatalogService).useValue(service).compile();
    const result = configureApp(module.createNestApplication({ bodyParser: false, logger: false }));
    await result.init(); return result;
  }
  beforeAll(async () => {
    keys = await generateKeyPair("RS256");
    const publicKey = { ...await exportJWK(keys.publicKey), kid: "test-key", alg: "RS256", use: "sig" };
    keyServer.on("request", (_request, response) => response.setHeader("Content-Type", "application/json").end(JSON.stringify({ keys: [publicKey] })));
    await new Promise<void>(resolve => keyServer.listen(0, "127.0.0.1", resolve));
    app = await application(true); disabledDocs = await application(false);
  });
  afterAll(async () => {
    await Promise.all([app?.close(), disabledDocs?.close()]);
    await new Promise<void>(resolve => keyServer.close(() => resolve()));
  });
  it("serves a populated contract response and replaces untrusted correlation identifiers", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/catalog").set("X-Request-ID", "untrusted").expect(200);
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    validResponse(response.body, 200, "get");
  });
  it("serves an empty contract page and denies unmarked handlers by default", async () => {
    service.list.mockResolvedValueOnce({ items: [], page: 0, size: 12, totalElements: 0, totalPages: 0 });
    const empty = await request(app.getHttpServer()).get("/api/v1/catalog").expect(200);
    validResponse(empty.body, 200, "get");
    await request(app.getHttpServer()).get("/internal").expect(401);
    await request(app.getHttpServer()).get("/internal").auth(await token(), { type: "bearer" }).expect(403);
  });
  it.each(["page=-1", "page=10001", "size=51", "size=0", "size=abc", "page=1.2", "size=1&size=2"])("rejects invalid pagination %s", async query => {
    const response = await request(app.getHttpServer()).get("/api/v1/catalog?" + query).expect(400);
    validResponse(response.body, 400, "get", "application/problem+json");
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
    expect(response.body.instance).toBe("/api/v1/catalog");
  });
  it("denies anonymous writes and accepts correctly scoped JWTs", async () => {
    const unauthorized = await request(app.getHttpServer()).post("/api/v1/catalog").send(body).expect(401);
    validResponse(unauthorized.body, 401, "post", "application/problem+json");
    const created = await request(app.getHttpServer()).post("/api/v1/catalog").auth(await token(), { type: "bearer" }).send(body).expect(201);
    validResponse(created.body, 201, "post");
  });
  it("rejects the wrong issuer, audience, expired tokens, missing expiry, forged signatures, and missing scopes", async () => {
    const foreignKey = await generateKeyPair("RS256");
    for (const options of [{ issuer: "http://wrong.test" }, { audience: "wrong" }, { expired: true }, { omitExpiry: true }, { signingKey: foreignKey.privateKey }]) {
      await request(app.getHttpServer()).post("/api/v1/catalog").auth(await token(options), { type: "bearer" }).send(body).expect(401);
    }
    await request(app.getHttpServer()).post("/api/v1/catalog").auth(await token({ scope: "catalog:read" }), { type: "bearer" }).send(body).expect(403);
    await request(app.getHttpServer()).get("/api/v1/catalog").set("Authorization", "Bearer malformed").expect(401);
  });
  it("validates JSON bodies, media negotiation, and request size", async () => {
    const bearer = await token();
    for (const payload of [{ ...body, name: " " }, { ...body, slug: "BAD" }, { slug: "valid", name: "Item" }]) {
      await request(app.getHttpServer()).post("/api/v1/catalog").auth(bearer, { type: "bearer" }).send(payload).expect(400);
    }
    await request(app.getHttpServer()).get("/api/v1/catalog").set("Accept", "text/html").expect(406);
    await request(app.getHttpServer()).get("/api/v1/catalog/").set("Accept", "text/html").expect(406);
    await request(app.getHttpServer()).post("/api/v1/catalog").auth(bearer, { type: "bearer" }).type("text").send("test").expect(415);
    await request(app.getHttpServer()).post("/api/v1/catalog").auth(bearer, { type: "bearer" }).type("json").send('{"invalid":').expect(400);
    await request(app.getHttpServer()).post("/api/v1/catalog").auth(bearer, { type: "bearer" }).send({ ...body, description: "x".repeat(70000) }).expect(413);
  });
  it("maps uniqueness races and sanitizes unexpected diagnostics", async () => {
    service.create.mockRejectedValueOnce(new DuplicateCatalogSlug());
    const conflict = await request(app.getHttpServer()).post("/api/v1/catalog").auth(await token(), { type: "bearer" }).send(body).expect(409);
    validResponse(conflict.body, 409, "post", "application/problem+json");
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      service.list.mockRejectedValueOnce(new Error("secret SQL password token"));
      const failure = await request(app.getHttpServer()).get("/api/v1/catalog").expect(500);
      expect(JSON.stringify(failure.body)).not.toContain("secret");
      expect(JSON.stringify(logger.mock.calls)).not.toContain("secret");
      validResponse(failure.body, 500, "get", "application/problem+json");
    } finally { logger.mockRestore(); }
  });
  it("separates process liveness from dependency readiness", async () => {
    await request(app.getHttpServer()).get("/livez").expect(200);
    database.ready.mockResolvedValueOnce(false);
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    try { await request(app.getHttpServer()).get("/readyz").expect(503); } finally { logger.mockRestore(); }
    await request(app.getHttpServer()).get("/livez").expect(200);
  });
  it("serves the canonical Scalar reference locally and disables every docs route when configured", async () => {
    await request(app.getHttpServer()).get("/docs").expect(200).expect(/Foundry API Reference/);
    await request(app.getHttpServer()).get("/docs/openapi.yaml").expect(200).expect(/openapi: 3.1.0/);
    await request(app.getHttpServer()).get("/docs/config.js").expect(200).expect(/persistAuth: false/);
    await request(app.getHttpServer()).get("/docs/scalar.js").expect(200);
    for (const route of ["/docs", "/docs/openapi.yaml", "/docs/config.js", "/docs/scalar.js", "/unknown"]) {
      await request(disabledDocs.getHttpServer()).get(route).expect(404);
    }
    await request(app.getHttpServer()).delete("/api/v1/catalog").expect(404);
  });
});
