import assert from "node:assert/strict";
import test from "node:test";
import { validateAgentRequest } from "../../src/agent-console/server/agent-request-policy.ts";
import { deliveryReadModel } from "../../src/domain-workspaces/delivery/read-model/projections/root-projection.ts";
import { deliveryHomeAdvisorContext } from "../../src/domain-workspaces/delivery/presentation/surfaces/home/home-agent-model.ts";
import { refinementStepStateLabel } from "../../src/domain-workspaces/delivery/presentation/workflows/refinement/view-model/refinement-step-model.ts";

const now = Date.parse("2026-11-01T02:00:00.000Z");
function ownerModel() {
  return { ...deliveryReadModel, source_truth: "OpenProject-backed OOS", projection_state: { ...deliveryReadModel.projection_state, status: "fresh", checked_at: new Date(now).toISOString() } };
}

test("Home advisor includes only bounded current overview facts, never fixture or package content", () => {
  const model = ownerModel();
  model.packages = Array.from({ length: 400 }, (_, i) => ({ workflow_phase: ["intake", "work_design", "refinement", "execution"][i % 4], subject: "PRIVATE ITEM", source: "PRIVATE SOURCE", draft: "PRIVATE DRAFT" }));
  const context = deliveryHomeAdvisorContext(model, now);
  assert.equal(context.sourceMode, "source-projected");
  const admitted = validateAgentRequest({ context: { candidate: context, mode: "focused" }, message: "Explain the Delivery overview",
    invocationNonce: "550e8400-e29b-41d4-a716-446655440001", session: { nonce: "550e8400-e29b-41d4-a716-446655440000", openedAt: new Date(now).toISOString() } });
  assert.equal(admitted.ok, true, admitted.error);
  assert.equal(context.refs.length, 1);
  assert.equal(context.signals.length, 4);
  assert.match(context.summary, /400 packages/);
  assert.ok(context.signals.every(s => s.endsWith("100 packages")));
  assert.doesNotMatch(JSON.stringify(context), /PRIVATE/);
  assert.ok(JSON.stringify(context).length < 2000);
});

test("preview, stale, invalid and future observations are explicitly unavailable to the Home advisor", () => {
  for (const model of [deliveryReadModel,
    { ...ownerModel(), source_truth: "prototype-local" },
    { ...ownerModel(), projection_state: { status: "stale", checked_at: new Date(now).toISOString() } },
    ...[now - 120001, now + 1, NaN].map(time => ({ ...ownerModel(), projection_state: { status: "fresh", checked_at: Number.isFinite(time) ? new Date(time).toISOString() : "invalid" } })),
  ]) {
    const context = deliveryHomeAdvisorContext(model, now);
    assert.equal(context.sourceMode, "unavailable");
    assert.deepEqual(context.signals, []);
    assert.equal(context.observedAt, null);
  }
  assert.equal(deliveryHomeAdvisorContext(ownerModel(), now + 120000).sourceMode, "source-projected");
});

test("Refinement navigation does not assert completion; owner receipt and locks retain precedence", () => {
  const args = { activeStep: "apply_refinement", candidateStep: "metadata_draft", packet: { status: "draft", receipt: null } };
  assert.equal(refinementStepStateLabel(args), "Open");
  assert.equal(refinementStepStateLabel({ ...args, activeStep: "metadata_draft" }), "Current");
  assert.equal(refinementStepStateLabel({ ...args, activeStep: "metadata_draft", candidateStep: "apply_refinement" }), "Next");
  for (const status of ["blocked", "stale"]) assert.equal(refinementStepStateLabel({ ...args, packet: { status } }), "Locked");
  for (const completion of [{ applyRecorded: true }, { packet: { status: "applied" } }, { packet: { status: "draft", receipt: { ref: "receipt://owner" } } }]) {
    assert.equal(refinementStepStateLabel({ ...args, ...completion }), "Done");
  }
});
