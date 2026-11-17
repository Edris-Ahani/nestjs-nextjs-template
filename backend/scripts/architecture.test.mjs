import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeSources } from "./architecture.mjs";
test("architecture rejects infrastructure, cross-feature internals, and dependency cycles", () => {
  for (const sources of [
    { "orders/domain/item.ts": 'import { Module } from "@nestjs/common";' },
    { "orders/web/controller.ts": 'import "../persistence/store.js";', "orders/persistence/store.ts": "" },
    { "orders/application/service.ts": 'import "../../billing/application/service.js";', "billing/application/service.ts": "" },
    { "platform/web/errors.ts": 'import "../../orders/domain/item.js";', "orders/domain/item.ts": "" },
    { "orders/api/index.ts": 'export * from "../../billing/api/index.js";', "billing/api/index.ts": 'export * from "../../orders/api/index.js";' },
  ]) assert(analyzeSources(sources).length > 0);
});
test("architecture accepts domain ports with explicit adapter composition", () => {
  assert.deepEqual(analyzeSources({
    "orders/domain/item.ts": "export interface Item {}",
    "orders/application/port.ts": 'import type { Item } from "../domain/item.js";',
    "orders/persistence/store.ts": 'import "../application/port.js";',
    "orders/web/controller.ts": 'import "../application/port.js";',
  }), []);
});
