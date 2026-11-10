import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { sourceEditorOwnerFixture } from "../support/source-editor-owner-fixture.mjs";
import { sourceSaveCommand } from "../../src/console-integration/source-authoring/source-editor-model.ts";
import { readSourceAssistantBody, readSourceSaveBody } from "../../src/console-integration/source-authoring/server/source-editor-evidence.ts";

// Next resolves this package subpath during compilation. Resolve the same
// installed module for direct Node execution of the actual server handlers.
const hooks = registerHooks({ resolve(specifier, context, next) {
  return next(specifier === "next/server" ? "next/server.js" : specifier, context);
} });
const { prototypeSourceEditorRoute } = await import("../../src/domain-workspaces/prototype/server/prototype-source-editor-api-routes.ts");
const { deliverySourceEditorRoute } = await import("../../src/domain-workspaces/delivery/server/delivery-source-editor-api-routes.ts");
hooks.deregister();

const post = body => new Request("http://console.invalid/editor", { method: "POST", body: typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body) });
const assistant = owner => ({ schema_version: 1, request_id: "assistant:http", snapshot_id: "snapshot:http", expected_revision: owner.revision,
  expected_change_set_digest: null, mode: "ask", prompt: "Explain this selected source", conversation: [],
  files: [{ path: owner.filePath, content: owner.original, expected_digest: "sha256:" + "a".repeat(64) }] });
const save = owner => sourceSaveCommand({ sessionId: owner.sessionId, revision: owner.revision, state: "not-started", attempt: null },
  owner.objective, "Update the selected source explicitly", [{ path: owner.filePath, content: owner.original + "// saved\n", expectedDigest: "sha256:" + "a".repeat(64), changed: true, deleted: false }], "manual", "http-save", owner.revision);

for (const kind of ["prototype", "delivery"]) {
  test(`${kind} HTTP assistance accepts ask/edit commands without invoking draft saves`, async () => {
    const owner = await sourceEditorOwnerFixture(kind), originalEnv = {};
    for (const [key, value] of Object.entries(owner.env)) { originalEnv[key] = process.env[key]; process.env[key] = value; }
    const route = (request, action) => kind === "prototype"
      ? prototypeSourceEditorRoute(request, owner.requestId, action)
      : deliverySourceEditorRoute(request, "71", action);
    try {
      for (const mode of ["ask", "edit"]) {
        const input = { ...assistant(owner), mode }, response = await route(post(input), "assist");
        assert.equal(response.status, 200);
        const result = await response.json();
        assert.equal(result.mode, "live"); assert.equal(result.projection.request_id, input.request_id);
        assert.equal(result.projection.edits.length, mode === "ask" ? 0 : 1);
        assert.deepEqual(owner.assistantRequests.at(-1), input);
        assert.equal(owner.writes.length, 0); assert.equal(owner.draft, null);
      }
      const reads = owner.reads.length;
      for (const [body, action] of [[save(owner), "assist"], [assistant(owner), "draft"], ["{", "assist"], [new Uint8Array([0xc3, 0x28]), "assist"], [" ".repeat(1048577), "assist"]]) {
        const response = await route(post(body), action);
        assert.equal(response.status, 400);
        assert.equal((await response.json()).projection, null);
      }
      assert.equal(owner.assistantRequests.length, 2); assert.equal(owner.writes.length, 0); assert.equal(owner.reads.length, reads);
      const response = await route(post(save(owner)), "draft");
      assert.equal(response.status, 200); assert.equal(owner.writes.length, 1); assert.equal(owner.assistantRequests.length, 2);
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
      await owner.close();
    }
  });
}

test("assistant and draft HTTP readers preserve separate closed contracts", async () => {
  const owner = { revision: "2026-11-10T00:00:00Z", sessionId: "session:http", objective: "Update selected source through the Console.", filePath: "src/app.ts", original: "export const value = 1;\n" };
  assert.deepEqual(await readSourceAssistantBody(post(assistant(owner))), assistant(owner));
  assert.deepEqual(await readSourceSaveBody(post(save(owner))), save(owner));
  await assert.rejects(readSourceAssistantBody(post(save(owner))));
  await assert.rejects(readSourceSaveBody(post(assistant(owner))));
  await assert.rejects(readSourceAssistantBody(post({ ...assistant(owner), operator_id: "forged" })));
  await assert.rejects(readSourceAssistantBody(post({ ...assistant(owner), prompt: "x".repeat(8001) })));
});
