import assert from "node:assert/strict";
import test from "node:test";

import {
  operationEvidenceDetail,
  operationEvidenceStateLabel,
  operationEvidenceStateTone,
} from "../../src/domain-workspaces/operation-projections/operation-evidence-signal.ts";
import { proposalWorkspaceScenarios } from "../../src/domain-workspaces/proposal/read-model/fixtures/proposal-scenarios.fixture.ts";

test("operation evidence derives display treatment from semantic state", () => {
  const expected = {
    blocked: ["blocked", "danger"],
    clear: ["clear", "ok"],
    informational: ["info", "info"],
    missing: ["missing", "warn"],
    reference: ["reference", "muted"],
    review: ["review", "warn"],
    stale: ["stale", "stale"],
  };

  for (const [state, [label, tone]] of Object.entries(expected)) {
    assert.equal(operationEvidenceStateLabel(state), label);
    assert.equal(operationEvidenceStateTone(state), tone);
  }
});

test("operation evidence detail exposes provenance and required action", () => {
  const detail = operationEvidenceDetail({
    detail: "Repository proof is missing.",
    id: "repo-proof",
    label: "Repository proof",
    owner: "Repository Operation",
    requiredAction: "Select an admitted owner repository.",
    source: {
      kind: "source-record",
      label: "Repository request",
      ref: "repo-request://proposal/example",
    },
    state: "missing",
  });

  assert.match(detail, /Repository request/);
  assert.match(detail, /Repository Operation/);
  assert.match(detail, /Select an admitted owner repository/);
});

test("proposal evidence carries structured truth instead of stored display tone", () => {
  for (const proposal of proposalWorkspaceScenarios) {
    for (const evidence of proposal.evidence) {
      assert.ok(evidence.id);
      assert.ok(evidence.source.kind);
      assert.ok(evidence.source.label);
      assert.ok(evidence.state);
      assert.equal(Object.hasOwn(evidence, "tone"), false);
    }
  }
});
