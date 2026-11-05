import { test } from "node:test";
import { strict as assert } from "node:assert";
import { toCSV } from "../src/lib/export.ts";
test("CSV quotes commas, quotes and line breaks", () => {
  assert.equal(
    toCSV([{ note: 'a,"b"\nc', net: -20 }]),
    'note,net\r\n"a,""b""\nc",-20',
  );
});
test("untrusted text cannot become a spreadsheet formula", () => {
  assert.equal(
    toCSV([{ note: "=1+1", other: "@SUM(A1)", quantity: 2 }]),
    "note,other,quantity\r\n'=1+1,'@SUM(A1),2",
  );
});
test("CSV preserves nulls and nested data without invented values", () => {
  assert.equal(
    toCSV([{ risk: null, notes: { lesson: "wait" } }]),
    'risk,notes\r\n,"{""lesson"":""wait""}"',
  );
  assert.equal(toCSV([]), "");
});
