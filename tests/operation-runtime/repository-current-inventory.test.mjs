import assert from "node:assert/strict";
import test from "node:test";

import { provisioningResult } from "../support/repository-provisioning-result.mjs";
import { provisionRepository } from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
import { projectRepositoryProvisioningResults } from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts";
import { projectRepositoryCurrentInventory } from "../../src/domain-workspaces/repository/live-runtime/repository-inventory-live-projection.ts";
import { repositorySelectedActionLabel, repositorySummaryFromRecords } from "../../src/domain-workspaces/repository/presentation/shared/repository-control-projection.ts";
import { assertWorkspaceContinuityProjection } from "../../src/workspace-continuity/workspace-continuity-contract.ts";

const digest = `sha256:${"a".repeat(64)}`;
const revision = "b".repeat(40);

test("current exact inventory overrides an old successful provisioning handoff throughout Repository Control", async () => {
  const result = await custody();
  const retained = structuredClone(result);
  const history = projectRepositoryProvisioningResults([], { retained: result });
  assert.equal(history[0].admissionState, "ready");
  assert.equal(repositorySelectedActionLabel(history[0]), "Review Admission");
  const current = projectRepositoryCurrentInventory(history, inventory("active"));
  assert.equal(current[0].admissionState, "admitted");
  assert.equal(current[0].lifecycle, "source-only");
  assert.equal(repositorySelectedActionLabel(current[0]), "Review Repository");
  assert.equal(repositorySummaryFromRecords(current).find(item => item.id === "admitted").value, "1");
  assert.equal(repositorySummaryFromRecords(current).find(item => item.id === "ready").value, "0");
  assert.match(current[0].nextAction, /intake is already complete/i);
  assert.equal(current[0].admissionPosture.find(group => group.id === "admission").items[0].value, "active");
  assert.equal(current[0].runtimeLane.status, "platform-authority");
  assert.equal(current[0].securityBinding.status, "not-evaluated");
  assert.deepEqual(current[0].custody, history[0].custody);
  assert.deepEqual(current[0].providerIdentity, history[0].providerIdentity);
  assert.deepEqual(current[0].admissionPosture[0], history[0].admissionPosture[0]);
  assert.deepEqual(result, retained);
  assert.equal(history[0].admissionState, "ready");
});

test("suspended and retired canonical repositories never return to ready or duplicate intake", async () => {
  const history = projectRepositoryProvisioningResults([], { retained: await custody() });
  for (const [posture, expected] of [["suspended", "blocked"], ["retired", "retired"]]) {
    const current = projectRepositoryCurrentInventory(history, inventory(posture));
    assert.equal(current[0].admissionState, expected);
    assert.match(current[0].nextAction, /existing Workspace Registry lifecycle/);
    assert.equal(repositorySelectedActionLabel(current[0]), "Inspect Repository");
  }
});

test("only a current read can establish absence, and names or product identities cannot substitute for the approved repository owner", async () => {
  const history = projectRepositoryProvisioningResults([], { retained: await custody() });
  assert.equal(projectRepositoryCurrentInventory(history, inventory("active", []))[0].admissionState, "ready");
  const other = inventory("active");
  other.inventory[0].record_id = "repo:another-owner";
  other.inventory[0].name = "another-owner";
  other.inventory[0].lineage.source_ref = "repo:another-owner";
  assert.equal(projectRepositoryCurrentInventory(history, assertWorkspaceContinuityProjection(other))[0].admissionState, "ready");
  const unbound = structuredClone(history);
  unbound[0].custody.workspaceOwnerRef = "product:synthetic-source";
  assert.equal(projectRepositoryCurrentInventory(unbound, inventory("active"))[0].admissionState, "blocked");
  const duplicate = inventory("active");
  duplicate.inventory.push(structuredClone(duplicate.inventory[0]));
  assert.throws(() => assertWorkspaceContinuityProjection(duplicate), /duplicated/);
});

test("an owner read failure removes a previous admission claim and never reverts to ready history", async () => {
  const history = projectRepositoryProvisioningResults([], { retained: await custody() });
  const admitted = projectRepositoryCurrentInventory(history, inventory("active"));
  assert.equal(admitted[0].admissionState, "admitted");
  // The controller always reconciles original custody records, not a prior projection.
  const unavailable = projectRepositoryCurrentInventory(history, null);
  assert.equal(unavailable[0].admissionState, "blocked");
  assert.match(unavailable[0].blockers[0].detail, /unavailable/);
  assert.match(unavailable[0].nextAction, /Refresh current/);
  assert.equal(repositorySummaryFromRecords(unavailable).find(item => item.id === "ready").value, "0");
  assert.equal(projectRepositoryCurrentInventory(history, inventory("active"))[0].admissionState, "admitted");
});

function inventory(posture, records) {
  return assertWorkspaceContinuityProjection({
    artifact_type: "workspace-continuity-projection", schema_version: 1,
    authority: { owner_repo: "workspace-governance", revision, file_digests: { "contracts/repos.yaml": digest } },
    authority_boundary: { canonical_registry: "workspace-governance", mutation_authority: "none", readiness_projection: "workspace-governance-control-fabric", terminal_publication_authority: "operator-orchestration-service", workflow_authority: "operator-orchestration-service" },
    projection_digest: digest, projection_id: `workspace-continuity-projection:${digest.slice(7)}`, projection_state: "current", intake: [], products: [],
    inventory: records ?? [{ kind: "repo", name: "synthetic-source", record_id: "repo:synthetic-source", record_version: 2, record_digest: digest, posture, lifecycle: "source-only", retired_collection: posture === "retired",
      lineage: { intake_entry_version: 1, source: "workspace-intake", source_digest: digest, source_ref: "repo:synthetic-source" },
      last_mutation: { action: "promote", applied_at: "2026-10-25T12:00:00Z", id: "mutation:synthetic", idempotency_key: "synthetic", readiness_digest: digest, readiness_ref: "readiness://synthetic", request_digest: digest, request_ref: "request://synthetic" },
    }],
  });
}

async function custody() {
  return provisionRepository({
    approvalNote: "Approve this exact synthetic repository.", custodyKind: "dedicated-owner-repo",
    repositoryDescription: "Synthetic regression test source", repositoryName: "synthetic-source",
    repositoryOwner: "synthetic-workspace", requestedAt: "2026-10-25T11:00:00Z",
    requestId: "repository-custody-request:synthetic", templateReviewed: true,
    visibility: "private", workspaceOwnerRef: "repo:synthetic-source",
  }, {
    env: {
      OOS_BASE_URL: "http://owner.test", OOS_CALLER_SECRET: "synthetic-test-only", GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:synthetic",
      REPOSITORY_CUSTODY_POLICY_PROFILE_URI: "https://policy.test/custody", REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST: digest,
      REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_URI: "https://binding.test/create", REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_DIGEST: digest,
    },
    fetchImpl: async (_url, init) => Response.json(provisioningResult(JSON.parse(init.body))),
  });
}
