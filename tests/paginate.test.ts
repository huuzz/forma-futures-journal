import { test } from "node:test";
import { strict as assert } from "node:assert";
import { paginate } from "../src/lib/paginate.ts";
test("all records are loaded across server row limits", async () => {
  const source = Array.from({ length: 1203 }, (_, i) => i);
  assert.equal(
    (
      await paginate(async (offset, size) => ({
        data: source.slice(offset, offset + size),
        error: null,
      }))
    ).length,
    1203,
  );
});
test("page failures do not silently produce incomplete performance", async () => {
  await assert.rejects(
    paginate(async () => ({
      data: null,
      error: { message: "connection failed" },
    })),
    /connection failed/,
  );
});
