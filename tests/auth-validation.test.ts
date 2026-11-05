import { test } from "node:test";
import { strict as assert } from "node:assert";
import { authInput } from "../src/lib/auth-validation.ts";
test("signup and login never substitute passwords when input is missing", () => {
  for (const mode of ["signup", "login"])
    for (const password of [undefined, null, "", "short"])
      assert.equal(
        authInput(mode, { email: "trader@example.com", password }).success,
        false,
      );
});
test("password recovery accepts only an email and unknown modes are rejected", () => {
  assert.equal(
    authInput("reset", { email: "trader@example.com" }).success,
    true,
  );
  assert.equal(
    authInput("unknown", {
      email: "trader@example.com",
      password: "longpassword",
    }).success,
    false,
  );
});
test("valid login preserves the exact supplied password", () => {
  const r = authInput("login", {
    email: "trader@example.com",
    password: "not-a-placeholder",
  });
  assert.equal(r.success && r.data.password, "not-a-placeholder");
});
