import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ConsoleSourceAuthorityError,
  assertConsoleSourceReceiptBinding,
  compareConsoleSourceProgress,
  parseConsoleSourceProjection,
  requireCurrentConsoleSourceProjection,
} from "../../src/console-integration/source-authority/console-source-authority.ts";

const now = new Date("2026-09-27T00:00:00.000Z");
const expectation = {
  authority: "operator-orchestration-service",
  recordRef: "openproject://work_packages/1182",
  sourceOwner: "delivery-art",
  sourceRef: "oos://delivery-art/work-items/1182",
};

test("case:trusted-console-1182-positive binds current owner truth, ordering, and receipt evidence", () => {
  const first = requireCurrentConsoleSourceProjection(projection(), expectation, {
    now,
  });
  const unchanged = requireCurrentConsoleSourceProjection(projection(), expectation, {
    now,
  });
  const advanced = requireCurrentConsoleSourceProjection(
    projection({
      freshness: {
        observed_at: "2026-09-27T00:00:10.000Z",
        state: "current",
        valid_until: "2026-09-27T00:05:10.000Z",
      },
      revision: {
        event_cursor: "delivery-art:1182:43",
        event_sequence: 43,
        source_revision: "version-43",
      },
    }),
    expectation,
    { now: new Date("2026-09-27T00:00:10.000Z") },
  );

  assert.equal(compareConsoleSourceProgress(first, unchanged), "unchanged");
  assert.equal(compareConsoleSourceProgress(first, advanced), "advanced");
  assert.equal(advanced.projection.state, "source-work");
  assert.deepEqual(
    assertConsoleSourceReceiptBinding(
      receipt(advanced, { recorded_at: "2026-09-27T00:00:11.000Z" }),
      advanced,
    ).revision,
    advanced.revision,
  );
});

test("case:trusted-console-1182-negative fails closed on unavailable, stale, conflicting, replayed, or invalid truth", () => {
  assertCode(
    () => parseConsoleSourceProjection(null),
    "source_authority_unavailable",
  );
  assertCode(
    () =>
      requireCurrentConsoleSourceProjection(
        projection({ freshness: { ...projection().freshness, state: "stale" } }),
        expectation,
        { now },
      ),
    "source_projection_stale",
  );
  assertCode(
    () =>
      requireCurrentConsoleSourceProjection(
        projection({ binding: { ...projection().binding, source_owner: "fixture" } }),
        expectation,
        { now },
      ),
    "source_authority_conflict",
  );

  const accepted = requireCurrentConsoleSourceProjection(projection(), expectation, {
    now,
  });
  const replayed = requireCurrentConsoleSourceProjection(
    projection({
      revision: {
        event_cursor: "delivery-art:1182:40",
        event_sequence: 40,
        source_revision: "version-40",
      },
    }),
    expectation,
    { now },
  );
  assertCode(
    () => compareConsoleSourceProgress(accepted, replayed),
    "source_projection_replayed",
  );
  assertCode(
    () =>
      compareConsoleSourceProgress(
        accepted,
        requireCurrentConsoleSourceProjection(
          projection({
            revision: {
              ...accepted.revision,
              source_revision: "conflicting-version",
            },
          }),
          expectation,
          { now },
        ),
      ),
    "source_authority_conflict",
  );
  assertCode(
    () =>
      assertConsoleSourceReceiptBinding(
        receipt(accepted, {
          revision: { ...accepted.revision, source_revision: "wrong-version" },
        }),
        accepted,
      ),
    "source_receipt_invalid",
  );
  assertCode(
    () =>
      parseConsoleSourceProjection({
        ...projection(),
        unsupported_field: true,
      }),
    "source_authority_invalid",
  );
});

test("machine contract and runtime validator share the same artifact identity", () => {
  const manifest = json("../../contracts/source-authority/manifest.json");
  const projectionSchema = json(
    "../../contracts/source-authority/console-source-projection.schema.json",
  );
  const receiptSchema = json(
    "../../contracts/source-authority/console-source-receipt-binding.schema.json",
  );

  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.default_max_future_clock_skew_ms, 30_000);
  assert.equal(
    projectionSchema.properties.artifact_type.const,
    "console-source-projection",
  );
  assert.equal(
    receiptSchema.properties.artifact_type.const,
    "console-source-receipt-binding",
  );
  assert.deepEqual(manifest.freshness_states, [
    "current",
    "stale",
    "unavailable",
    "unknown",
  ]);
});

function projection(overrides = {}) {
  return {
    artifact_type: "console-source-projection",
    binding: {
      authority: "operator-orchestration-service",
      record_ref: "openproject://work_packages/1182",
      source_owner: "delivery-art",
      source_ref: "oos://delivery-art/work-items/1182",
      ...overrides.binding,
    },
    freshness: {
      observed_at: "2026-09-26T23:59:55.000Z",
      state: "current",
      valid_until: "2026-09-27T00:04:55.000Z",
      ...overrides.freshness,
    },
    projection: { state: "source-work", ...overrides.projection },
    revision: {
      event_cursor: "delivery-art:1182:42",
      event_sequence: 42,
      source_revision: "version-42",
      ...overrides.revision,
    },
    schema_version: 1,
  };
}

function receipt(source, overrides = {}) {
  return {
    artifact_type: "console-source-receipt-binding",
    binding: { ...source.binding, ...overrides.binding },
    receipt_ref: "oos-receipt://delivery-art/1182/42",
    recorded_at: overrides.recorded_at ?? "2026-09-27T00:00:00.000Z",
    revision: { ...source.revision, ...overrides.revision },
    schema_version: 1,
  };
}

function assertCode(operation, code) {
  assert.throws(
    operation,
    (error) =>
      error instanceof ConsoleSourceAuthorityError && error.code === code,
  );
}

function json(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}
