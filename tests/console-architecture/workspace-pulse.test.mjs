import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveWorkspacePulseFixture,
  workspacePulseFixture,
} from "../../src/command-center/fixtures/workspace-pulse.fixture.ts";

test("Workspace Pulse projects four stable signals from structured records", () => {
  assert.deepEqual(
    workspacePulseFixture.signals.map(({ id }) => id),
    [
      "required-decisions",
      "blocked-operations",
      "active-operations",
      "source-coverage",
    ],
  );
  assert.equal(workspacePulseFixture.schemaVersion, 1);
  assert.equal(workspacePulseFixture.projectionMode, "synthetic");
  assert.equal(workspacePulseFixture.projectedAt, null);
  assert.match(
    workspacePulseFixture.sourceSummary,
    /fixture sources represented$/,
  );
  assert.equal(
    workspacePulseFixture.signals.find(
      ({ id }) => id === "required-decisions",
    ).value,
    "1",
  );
  assert.equal(workspacePulseFixture.posture.label, "HEADS UP");
});

test("Workspace Pulse posture is derived from source trust and operational records", () => {
  const blocked = resolveWorkspacePulseFixture({
    "blocked-operations": "blocked",
    "required-decisions": "clear",
  });
  const stale = resolveWorkspacePulseFixture({
    "blocked-operations": "blocked",
    "source-coverage": "stale",
  });
  const unavailable = resolveWorkspacePulseFixture({
    "source-coverage": "unavailable",
  });
  const clear = resolveWorkspacePulseFixture({
    "required-decisions": "clear",
  });

  assert.equal(blocked.posture.label, "HARD STOP");
  assert.equal(stale.posture.label, "STALE SIGNALS");
  assert.equal(unavailable.posture.label, "SIGNAL LOST");
  assert.equal(clear.posture.label, "CALM / NO FIRE");
});

test("Workspace Pulse records retain stable identity and owner routes", () => {
  const records = workspacePulseFixture.signals.flatMap(
    ({ records }) => records,
  );

  assert.equal(records.length > 0, true);
  assert.equal(new Set(records.map(({ id }) => id)).size, records.length);
  for (const record of records) {
    assert.equal(record.owner.length > 0, true);
    assert.equal(record.route.label.length > 0, true);
    assert.match(record.route.target.id, /^(workbench:|dev-integration|governed-releases|lifecycle-transitions|console)/);
  }
});

test("Synthetic Workspace Pulse sources do not claim live observation truth", () => {
  for (const source of workspacePulseFixture.sources) {
    assert.equal(source.authority, "workspace-prototype-studio");
    assert.equal(source.mode, "synthetic");
    assert.equal(source.observedAt, null);
    assert.match(source.reference, /^fixture:\/\//);
    assert.equal(source.intendedAuthority.length > 0, true);
  }
});
