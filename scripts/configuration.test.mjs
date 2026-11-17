import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseProvider, databaseUrl } from "../backend/config/database.mjs";
test("database commands reject provider and URL mismatches without leaking credentials", () => {
  assert.throws(() => databaseProvider({ DATABASE_PROVIDER: "sqlite" }));
  for (const provider of ["postgresql", "mysql"]) {
    const url = provider + "://user:private-value@localhost/platform";
    assert.equal(databaseUrl({ DATABASE_PROVIDER: provider, DATABASE_URL: url }), url);
    assert.throws(() => databaseUrl({ DATABASE_PROVIDER: provider, DATABASE_URL: "https://user:private-value@example.com/platform" }), error => !error.message.includes("private-value"));
  }
  assert.throws(() => databaseUrl({}));
});
