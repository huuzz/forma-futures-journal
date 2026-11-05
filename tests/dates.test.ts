import { test } from "node:test";
import { strict as assert } from "node:assert";
import { dayKey, localDateTime, zonedIso } from "../src/lib/dates.ts";
test("closed trades near midnight group in the configured trading timezone", () => {
  assert.equal(dayKey("2026-11-05T01:00:00Z", "America/Toronto"), "2026-11-04");
  assert.equal(dayKey("2026-11-05T01:00:00Z", "Asia/Tokyo"), "2026-11-05");
});
test("execution input converts configured local time instead of computer timezone", () => {
  assert.equal(
    zonedIso("2026-11-05T09:30", "America/Toronto"),
    "2026-11-05T14:30:00.000Z",
  );
  assert.equal(
    localDateTime("2026-07-05T13:30:00Z", "America/Toronto"),
    "2026-07-05T09:30",
  );
});
test("spring DST gaps reject nonexistent times and repeated hours choose earlier occurrence", () => {
  assert.throws(() => zonedIso("2026-03-08T02:30", "America/Toronto"));
  assert.equal(
    zonedIso("2026-11-01T01:30", "America/Toronto"),
    "2026-11-01T05:30:00.000Z",
  );
});
