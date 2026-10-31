import { test } from "node:test";
import assert from "node:assert/strict";
import { selectRecentAiActivity } from "../../src/agent-console/read-model/recent-ai-activity.ts";

const observedAt = "2026-10-31T12:00:00.000Z";
test("visual examples require an explicit current disconnected source", () => {
  const preview = selectRecentAiActivity({ mode: "disconnected-preview", status: "current", observedAt });
  assert.equal(preview.examples, true);
  assert.equal(preview.items.length, 5);
  assert.equal(preview.items[0].occurredAt, "2026-10-31T11:58:00.000Z");
  assert.match(preview.message, /Preview examples/);
  for (const [mode, status] of [["live", "current"], ["live", "offline"], ["live", "partial"], [null, "loading"], ["unavailable", "unavailable"], ["disconnected-preview", "offline"]]) {
    const result = selectRecentAiActivity({ mode, status, observedAt });
    assert.deepEqual(result.items, []);
    assert.equal(result.examples, false);
  }
});
test("invalid preview time cannot invent request timestamps", () => {
  assert.deepEqual(selectRecentAiActivity({ mode: "disconnected-preview", status: "current", observedAt: "invalid" }).items, []);
});
