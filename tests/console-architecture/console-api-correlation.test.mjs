import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server.js";

import { middleware } from "../../src/middleware.ts";

test("all Console API requests receive a fresh server correlation", () => {
  const response = middleware(
    new NextRequest("http://localhost/api/console/capabilities", {
      headers: {
        "x-console-correlation-id": "caller-controlled-value",
      },
    }),
  );

  assert.match(
    response.headers.get("x-console-correlation-id"),
    /^[0-9a-f]{8}-[0-9a-f-]{27}$/i,
  );
  assert.notEqual(
    response.headers.get("x-console-correlation-id"),
    "caller-controlled-value",
  );
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
