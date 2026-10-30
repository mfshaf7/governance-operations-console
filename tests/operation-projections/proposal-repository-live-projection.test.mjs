import assert from "node:assert/strict";
import test from "node:test";
import { projectCanonicalRepositoryGateRequests } from "../../src/domain-workspaces/operation-integrations/proposal-repository-live-projection.ts";

test("Repository requests are reconstructed only from canonical accepted Proposal truth", () => {
  const projection = { proposal_id: "idea-851", title: "Build the to-do app", record_ref: "openproject://work_packages/851", record_version: "version-2",
    status: "accepted", projection_state: "current", route: { source_custody: { classification: "new-repo-required", repository_gate_state: "pending" } } };
  const snapshot = { mode: "live", status: "current", records: [{ projection }] };
  for (let reload = 0; reload < 2; reload++) {
    const [request] = projectCanonicalRepositoryGateRequests(JSON.parse(JSON.stringify(snapshot)));
    assert.equal(request.proposalId, "idea-851");
    assert.equal(request.recordVersion, "version-2");
    assert.equal(request.recovery, null);
  }
  for (const override of [{ mode: "disconnected-preview" }, { status: "offline" }]) {
    assert.deepEqual(projectCanonicalRepositoryGateRequests({ ...snapshot, ...override }), []);
  }
  projection.repository_resolution = { source_version: "version-1", notes: "Exact original notes", custody_request_id: "repository-custody-request:todo" };
  projection.repository_resolution_history_pending = true;
  const [recovered] = projectCanonicalRepositoryGateRequests(snapshot);
  assert.equal(recovered.recovery.source_version, "version-1");
  assert.equal(recovered.recovery.notes, "Exact original notes");
  assert.equal(recovered.recovery.custody_request_id, "repository-custody-request:todo");
});
