import assert from "node:assert/strict";
import test from "node:test";
import { readWorkspaceIntake, continueWorkspaceIntake } from "../../src/console-integration/workspace-intake/server/workspace-intake-oos-client.ts";
import { readWorkspaceInventoryPromotion, continueWorkspaceInventoryPromotion,
  readWorkspaceInventoryLifecycle, continueWorkspaceInventoryLifecycle } from "../../src/workspace-registry/server/workspace-registry-oos-client.ts";

const config = { baseUrl: "http://127.0.0.1:8080", callerId: "synthetic-console", callerSecret: "server-only-synthetic" };
for (const [label, read, command, prefix] of [
  ["Intake", readWorkspaceIntake, continueWorkspaceIntake, "workspace_intake"],
  ["promotion", readWorkspaceInventoryPromotion, continueWorkspaceInventoryPromotion, "workspace_registry"],
  ["lifecycle", readWorkspaceInventoryLifecycle, continueWorkspaceInventoryLifecycle, "workspace_registry"],
]) {
  test(`${label} keeps reads short, permits bounded source verification, and preserves an unconfirmed command`, async t => {
    const budgets = [], calls = [];
    t.mock.method(AbortSignal, "timeout", budget => { budgets.push(budget); return new AbortController().signal; });
    const options = { config, fetchImpl: async (url, init) => {
      calls.push({ url: String(url), method: init.method });
      throw new DOMException("Synthetic deadline", "TimeoutError");
    } };
    const id = "synthetic-original-request";
    await assert.rejects(read(id, options), e => e.code === `${prefix}_oos_timeout` && e.status === 504);
    await assert.rejects(command(id, options), e => e.code === `${prefix}_oos_timeout` && e.status === 504 &&
      e.retryable && /original request.*check its result/.test(e.message) && !/could not reach|failed/.test(e.message));
    assert.deepEqual(budgets, [12_000, 120_000]);
    assert.equal(calls.length, 2, "A deadline must not silently resubmit a command");
    assert.ok(calls.every(c => c.url.includes(id)));
    assert.deepEqual(calls.map(c => c.method), ["GET", "POST"]);
    await assert.rejects(command(id, { config, fetchImpl: async () => { throw new TypeError("Synthetic disconnected transport"); } }),
      e => e.code === `${prefix}_oos_unavailable` && e.status === 502);
  });
}
