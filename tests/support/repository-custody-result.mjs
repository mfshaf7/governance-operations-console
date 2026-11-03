// Synthetic custody responses for isolated protocol tests only.
const digest = character => `sha256:${character.repeat(64)}`;
export function custodyResult(request, { replayed = false } = {}) {
  const decisionDigest = digest("d");
  const readbackDigest = digest("e");
  const receiptDigest = digest("f");
  const decisionRef = {
    digest: decisionDigest,
    uri: "wgcf://decisions/repository-custody/test.json",
  };
  const readbackRef = {
    digest: readbackDigest,
    uri: "oos://readbacks/repository-provider/test.json",
  };
  return {
    decision: {
      action: "link-existing",
      approved_provisioning: null,
      artifact_type: "repository_custody_decision",
      decision_id: "repository-custody-decision:test-001",
      evaluated_at: "2026-08-29T10:00:01.000Z",
      findings: [],
      integrity: integrity(decisionDigest),
      next_action: "read-provider",
      obligations: ["provider-readback-required"],
      outcome: "allowed",
      policy_version: "repository-custody/v1",
      request_ref: { digest: request.request_digest, uri: "wgcf://requests/test.json" },
      resolved_identity: {
        provider: "github",
        provider_repository_id: request.target.provider_repository_id,
      },
      schema_version: 1,
    },
    decision_ref: decisionRef,
    execution_id: request.workflow.execution_id,
    failure: null,
    next_action: "complete",
    provider_operation: {
      attempt_count: 1,
      command: "read-provider",
      completion_path: "read-existing",
      provider_repository_id: request.target.provider_repository_id,
      state: "verified",
    },
    provider_readback: {
      action: "link-existing",
      applied_provisioning: null,
      artifact_type: "repository_provider_readback",
      canonical_name: request.target.name,
      canonical_owner: request.target.owner,
      canonical_url: `https://github.com/${request.target.owner}/${request.target.name}`,
      credential_binding_ref: request.authority.credential_binding_ref,
      default_branch: "main",
      integrity: integrity(readbackDigest),
      observed_at: "2026-08-29T10:00:02.000Z",
      provider_lifecycle_state: "active",
      provider_version: "etag-test-001",
      readback_id: "repository-provider-readback:test-001",
      repository_identity: {
        provider: "github",
        provider_repository_id: request.target.provider_repository_id,
      },
      request_ref: { digest: request.request_digest, uri: "wgcf://requests/test.json" },
      schema_version: 1,
      visibility: "private",
    },
    provider_readback_ref: readbackRef,
    receipt: {
      action: "link-existing",
      artifact_type: "repository_custody_receipt",
      completed_at: "2026-08-29T10:00:03.000Z",
      custody: {
        after: "linked",
        before: "unrecorded",
        workspace_owner_ref: request.requested_custody.workspace_owner_ref,
      },
      decision_ref: decisionRef,
      downstream_handoffs: {
        active_inventory: "separate-action-required",
        delivery_catalog: "separate-action-required",
        product_admission: "separate-action-required",
        workspace_intake: "request-available",
      },
      findings: [
        "WGCF allowed the exact request.",
        "Provider readback matched the immutable identity.",
      ],
      integrity: integrity(receiptDigest),
      outcome: "succeeded",
      provider_readback_ref: readbackRef,
      receipt_id: "repository-custody-receipt:test-001",
      repository_identity: {
        provider: "github",
        provider_repository_id: request.target.provider_repository_id,
      },
      request_ref: { digest: request.request_digest, uri: "wgcf://requests/test.json" },
      schema_version: 1,
      workflow_status: "succeeded",
    },
    receipt_ref: {
      digest: receiptDigest,
      uri: "oos://receipts/repository-custody/test.json",
    },
    replayed,
    request,
    retryable: false,
    schema_version: 1,
    status: "succeeded",
    workflow_id: "repository-custody",
    workflow_version: "1",
  };
}

function integrity(contentDigest) {
  return {
    algorithm: "sha256",
    canonicalization: "RFC8785",
    content_digest: contentDigest,
  };
}

