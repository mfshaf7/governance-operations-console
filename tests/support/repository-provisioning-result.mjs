// Synthetic owner results for isolated conformance only, never live runtime.
const digest = (character) => `sha256:${character.repeat(64)}`;
export function provisioningResult(request, { replayed = false, status = "succeeded" } = {}) {
  const decisionDigest = digest("d");
  const readbackDigest = digest("e");
  const receiptDigest = digest("f");
  const decisionRef = {
    digest: decisionDigest,
    uri: "wgcf://decisions/repository-custody/provision-test.json",
  };
  const readbackRef = {
    digest: readbackDigest,
    uri: "oos://readbacks/repository-provider/provision-test.json",
  };
  const terminal = status !== "applying";
  const succeeded = status === "succeeded";
  const denied = status === "denied";
  const readback = succeeded
    ? {
        action: "provision-new",
        applied_provisioning: {
          initialization_state: "initialized",
          owner_scope: "organization",
          settings: structuredClone(request.provisioning),
        },
        artifact_type: "repository_provider_readback",
        canonical_name: request.target.name,
        canonical_owner: request.target.owner,
        canonical_url: `https://github.com/${request.target.owner}/${request.target.name}`,
        credential_binding_ref: request.authority.credential_binding_ref,
        default_branch: "main",
        integrity: integrity(readbackDigest),
        observed_at: "2026-08-30T08:00:02.000Z",
        provider_lifecycle_state: "active",
        provider_version: "etag-proof-001",
        readback_id: "repository-provider-readback:provision-test-001",
        repository_identity: {
          provider: "github",
          provider_repository_id: "1350916928",
        },
        request_ref: {
          digest: request.request_digest,
          uri: "wgcf://requests/repository-custody/provision-test.json",
        },
        schema_version: 1,
        visibility: request.provisioning.visibility,
      }
    : null;
  const receipt = terminal
    ? {
        action: "provision-new",
        artifact_type: "repository_custody_receipt",
        completed_at: "2026-08-30T08:00:03.000Z",
        custody: {
          after: succeeded ? "provisioned" : "unrecorded",
          before: "unrecorded",
          workspace_owner_ref: request.requested_custody.workspace_owner_ref,
        },
        decision_ref: decisionRef,
        downstream_handoffs: {
          active_inventory: succeeded ? "separate-action-required" : "not-requested",
          delivery_catalog: succeeded ? "separate-action-required" : "not-requested",
          product_admission: succeeded ? "separate-action-required" : "not-requested",
          workspace_intake: succeeded ? "request-available" : "not-requested",
        },
        findings: succeeded
          ? ["Provider readback matched the exact approved settings."]
          : [denied ? "WGCF denied the request." : "Provider operation unavailable."],
        integrity: integrity(receiptDigest),
        outcome: status,
        provider_readback_ref: succeeded ? readbackRef : null,
        receipt_id: "repository-custody-receipt:provision-test-001",
        repository_identity: succeeded ? readback.repository_identity : null,
        request_ref: {
          digest: request.request_digest,
          uri: "wgcf://requests/repository-custody/provision-test.json",
        },
        schema_version: 1,
        workflow_status: status,
      }
    : null;

  return {
    decision: {
      action: "provision-new",
      approved_provisioning: denied
        ? null
        : {
            name: request.target.name,
            owner: request.target.owner,
            owner_scope: "organization",
            provider: "github",
            provider_host: "github.com",
            settings: structuredClone(request.provisioning),
          },
      artifact_type: "repository_custody_decision",
      decision_id: "repository-custody-decision:provision-test-001",
      evaluated_at: "2026-08-30T08:00:01.000Z",
      findings: denied
        ? [{ code: "not-ready", severity: "blocking", summary: "WGCF denied the request." }]
        : [],
      integrity: integrity(decisionDigest),
      next_action: denied ? "stop" : "create-provider",
      obligations: denied ? [] : ["create-provider-once"],
      outcome: denied ? "denied" : "allowed",
      policy_version: "repository-custody/v1",
      request_ref: {
        digest: request.request_digest,
        uri: "wgcf://requests/repository-custody/provision-test.json",
      },
      resolved_identity: null,
      schema_version: 1,
    },
    decision_ref: decisionRef,
    execution_id: request.workflow.execution_id,
    failure: terminal && !succeeded
      ? {
          code: denied ? "repository_custody_denied" : "repository_provider_unavailable",
          message: denied ? "WGCF denied the request." : "Provider operation unavailable.",
          retryable: !denied,
        }
      : null,
    next_action: !terminal
      ? "await-provider"
      : succeeded
        ? "complete"
        : denied
          ? "request-correction"
          : "retry-provider",
    provider_operation: {
      attempt_count: denied ? 0 : 1,
      command: "create-provider",
      completion_path: succeeded ? "created" : null,
      provider_repository_id: succeeded ? "1350916928" : null,
      state: succeeded
        ? "verified"
        : denied
          ? "not-started"
          : terminal
            ? "recovery-required"
            : "command-issued",
    },
    provider_readback: readback,
    provider_readback_ref: succeeded ? readbackRef : null,
    receipt,
    receipt_ref: terminal
      ? {
          digest: receiptDigest,
          uri: "oos://receipts/repository-custody/provision-test.json",
        }
      : null,
    replayed,
    request,
    retryable: status === "failed",
    schema_version: 1,
    status,
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
