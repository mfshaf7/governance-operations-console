import assert from "node:assert/strict";
import test from "node:test";

import {
  parseExternalConsoleRoute,
} from "../../src/console-integration/external-route.ts";

test("external console routes accept absolute HTTP and HTTPS URLs", () => {
  assert.equal(
    parseExternalConsoleRoute("https://console.example.test/status")?.href,
    "https://console.example.test/status",
  );
  assert.equal(
    parseExternalConsoleRoute("http://127.0.0.1:3317/")?.href,
    "http://127.0.0.1:3317/",
  );
});

test("external console routes reject unsafe and internal route schemes", () => {
  assert.equal(parseExternalConsoleRoute("javascript:alert(1)"), null);
  assert.equal(parseExternalConsoleRoute("data:text/plain,unsafe"), null);
  assert.equal(parseExternalConsoleRoute("portfolio://products/product-1"), null);
  assert.equal(parseExternalConsoleRoute("/relative/path"), null);
  assert.equal(parseExternalConsoleRoute(null), null);
});
