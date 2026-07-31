import assert from "node:assert/strict";
import test from "node:test";

import {
  operationSurfaceStatusStateLabel,
  projectOperationSurfaceStatusItem,
  resolveOperationSurfaceStatusTone,
} from "../../src/domain-workspaces/operation-projections/operation-surface-status-projection.ts";

test("operation status projection owns semantic state labels and tones", () => {
  const expectedTones = {
    blocked: "warn",
    current: "ok",
    degraded: "warn",
    denied: "danger",
    failed: "danger",
    local: "warn",
    offline: "danger",
    online: "ok",
    ready: "ok",
    stale: "stale",
    syncing: "warn",
  };

  for (const [state, tone] of Object.entries(expectedTones)) {
    assert.equal(
      resolveOperationSurfaceStatusTone(statusItem(state)),
      tone,
      state,
    );
    assert.equal(operationSurfaceStatusStateLabel(state), state);
  }
});

test("operation status projection preserves explicit presentation overrides", () => {
  const projected = projectOperationSurfaceStatusItem({
    ...statusItem("local"),
    tone: "info",
  });

  assert.deepEqual(projected, {
    detail: "Status detail",
    facts: [{ label: "Source", value: "Fixture" }],
    id: "source",
    label: "Source",
    stateLabel: "local",
    tone: "info",
  });
  assert.equal(Object.hasOwn(projected, "state"), false);
});

function statusItem(state) {
  return {
    detail: "Status detail",
    facts: [{ label: "Source", value: "Fixture" }],
    id: "source",
    label: "Source",
    state,
  };
}
