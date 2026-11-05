import { test } from "node:test";
import { strict as assert } from "node:assert";
import { uploadBatch } from "../src/lib/upload.ts";
test("one interrupted image does not cause successfully completed uploads to be retried", async () => {
  const failed = await uploadBatch(
    ["first", "second", "third"],
    async (image) => {
      if (image === "second") throw new Error("network");
    },
  );
  assert.deepEqual(failed, ["second"]);
});
test("batch preserves failed image order for retry and leaves no false failures", async () => {
  assert.deepEqual(await uploadBatch(["a", "b"], async () => {}), []);
  assert.deepEqual(
    await uploadBatch(["a", "b"], async () => {
      throw new Error("offline");
    }),
    ["a", "b"],
  );
});
