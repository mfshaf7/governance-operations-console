import assert from "node:assert/strict";

export const consoleSourceProjectionMediaType =
  "application/vnd.mfshaf7.console-source-projection+json; version=1";

let eventSequence = 10_000;

export function canonicalSourceResponse(
  projection,
  {
    authority = "operator-orchestration-service",
    recordRef,
    sourceOwner,
    sourceRef = recordRef,
  },
  init = {},
) {
  const sequence = init.eventSequence ?? eventSequence++;
  const observedAt = new Date(Date.now() - 1_000).toISOString();
  const validUntil = new Date(Date.now() + 300_000).toISOString();
  return Response.json(
    {
      artifact_type: "console-source-projection",
      binding: {
        authority,
        record_ref: recordRef,
        source_owner: sourceOwner,
        source_ref: sourceRef,
      },
      freshness: {
        observed_at: init.observedAt ?? observedAt,
        state: init.freshnessState ?? "current",
        valid_until: init.validUntil ?? validUntil,
      },
      projection,
      revision: {
        event_cursor: init.eventCursor ?? `test-event:${sequence}`,
        event_sequence: sequence,
        source_revision: init.sourceRevision ?? `test-version:${sequence}`,
      },
      schema_version: 1,
    },
    { status: init.status ?? 200 },
  );
}

export function assertCanonicalSourceRequest(init) {
  assert.equal(
    new Headers(init.headers).get("accept"),
    consoleSourceProjectionMediaType,
  );
}
