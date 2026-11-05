import { test } from "node:test";
import { strict as assert } from "node:assert";
import { isLocalRequest } from "../src/lib/local-request.ts";
test("only loopback hosts can access the local journal", () => {
  assert.equal(isLocalRequest("127.0.0.1:3000", null, "GET"), true);
  assert.equal(isLocalRequest("localhost:3000", null, "GET"), true);
  for (const host of [
    "evil.example:3000",
    "127.0.0.1.evil.example",
    "192.168.1.2:3000",
    "localhost@evil.example",
    null,
  ])
    assert.equal(isLocalRequest(host, null, "GET"), false);
});
test("mutations require a matching local origin", () => {
  assert.equal(
    isLocalRequest("127.0.0.1:3000", "http://127.0.0.1:3000", "POST"),
    true,
  );
  for (const origin of [
    null,
    "null",
    "https://evil.example",
    "http://127.0.0.1:4000",
  ])
    assert.equal(isLocalRequest("127.0.0.1:3000", origin, "POST"), false);
});
