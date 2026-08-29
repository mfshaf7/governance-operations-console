import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertRepositoryCustodyWorkflowResult,
} from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-contract.ts";
import { projectRepositoryCustodyResults } from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts";
import {
  linkExistingRepositoryCustody,
  readRepositoryCustodyResult,
  RepositoryCustodyOosError,
} from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";

const digest = (character) => `sha256:${character.repeat(64)}`;
const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-server-secret",
  REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST: digest("3"),
  REPOSITORY_CUSTODY_CREDENTIAL_BINDING_URI:
    "https://platform-engineering.local/credential-bindings/github-app/repository-read",
  REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST: digest("2"),
  REPOSITORY_CUSTODY_POLICY_PROFILE_URI:
    "https://workspace-governance.local/contracts/repository-custody.yaml",
};

test("case:repository-custody-end-to-end-positive links, replays, reads, and projects exact authority evidence", async () => {
  const calls = [];
  let canonicalRequest;
  let submissions = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (init.method === "POST") {
      submissions += 1;
      canonicalRequest = JSON.parse(String(init.body));
      return jsonResponse(
        successfulResult(canonicalRequest, { replayed: submissions > 1 }),
        submissions > 1 ? 200 : 201,
      );
    }
    assert.equal(
      decodeURIComponent(String(url)),
      `${env.OOS_BASE_URL}/v1/repository-custody/requests/${intent().requestId}`,
    );
    return jsonResponse(successfulResult(canonicalRequest, { replayed: true }));
  };

  const created = await linkExistingRepositoryCustody(intent(), {
    env,
    fetchImpl,
  });
  const replayed = await linkExistingRepositoryCustody(intent(), {
    env,
    fetchImpl,
  });
  const read = await readRepositoryCustodyResult(intent().requestId, {
    env,
    fetchImpl,
  });

  assert.equal(created.status, "succeeded");
  assert.equal(replayed.replayed, true);
  assert.equal(read.replayed, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].init.headers["x-oos-caller-id"], env.OOS_CALLER_ID);
  assert.equal(calls[0].init.headers["x-oos-caller-secret"], env.OOS_CALLER_SECRET);
  assert.doesNotMatch(String(calls[0].init.body), /test-only-server-secret/);
  assert.equal(canonicalRequest.action, "link-existing");
  assert.equal(canonicalRequest.operator_ref.uri, "console://operators/operator%3Aconsole-owner");
  assert.equal(canonicalRequest.target.provider_repository_id, "1317781281");
  assert.equal(canonicalRequest.requested_custody.workspace_owner_ref, "repo:governance-operations-console");
  assert.equal(canonicalRequest.idempotency_key, intent().requestId);
  assert.match(canonicalRequest.request_digest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(
    JSON.parse(String(calls[0].init.body)),
    JSON.parse(String(calls[1].init.body)),
  );
  assert.equal(created.receipt.custody.after, "linked");
  assert.equal(
    created.receipt.downstream_handoffs.active_inventory,
    "separate-action-required",
  );
  assert.equal(
    created.receipt.downstream_handoffs.workspace_intake,
    "request-available",
  );
  const [projected] = projectRepositoryCustodyResults(
    [repositoryRecord()],
    { [intent().repositoryId]: created },
  );
  assert.equal(projected.custody.state, "linked");
  assert.equal(projected.admissionState, "admitted");
});

test("case:repository-custody-end-to-end-negative fails closed without credentials, exact identity, or matching authority evidence", async () => {
  await assert.rejects(
    linkExistingRepositoryCustody(intent(), {
      env: { OOS_BASE_URL: env.OOS_BASE_URL },
      fetchImpl: async () => {
        throw new Error("must not call OOS");
      },
    }),
    (error) =>
      error instanceof RepositoryCustodyOosError &&
      error.code === "repository_custody_authority_not_configured" &&
      error.status === 503,
  );

  await assert.rejects(
    linkExistingRepositoryCustody(
      { ...intent(), providerRepositoryId: "owner/name" },
      {
        env,
        fetchImpl: async () => {
          throw new Error("must not call OOS");
        },
      },
    ),
    (error) =>
      error instanceof RepositoryCustodyOosError &&
      error.code === "repository_custody_link_intent_invalid" &&
      error.status === 400,
  );

  await assert.rejects(
    linkExistingRepositoryCustody(intent(), {
      env,
      fetchImpl: async () =>
        jsonResponse(
          {
            code: "repository_custody_policy_stale",
            error: "The policy profile is stale.",
            retryable: false,
          },
          409,
        ),
    }),
    (error) =>
      error instanceof RepositoryCustodyOosError &&
      error.code === "repository_custody_policy_stale" &&
      error.status === 409 &&
      error.retryable === false,
  );

  await assert.rejects(
    linkExistingRepositoryCustody(intent(), {
      env,
      fetchImpl: async (_url, init) => {
        const request = JSON.parse(String(init.body));
        const result = successfulResult(request);
        result.request.target.owner = "different-owner";
        return jsonResponse(result);
      },
    }),
    (error) =>
      error instanceof RepositoryCustodyOosError &&
      error.code === "repository_custody_result_request_integrity_invalid",
  );

  const staleReadback = successfulResult(canonicalRequestFixture());
  staleReadback.provider_readback.repository_identity.provider_repository_id =
    "999999999";
  assert.throws(
    () => assertRepositoryCustodyWorkflowResult(staleReadback),
    /readback provider repository identity is invalid/i,
  );

  const browserSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/repository/live-runtime/use-repository-custody-live-runtime.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const serverSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET/);
  assert.doesNotMatch(browserSource, /fixtures\//i);
  assert.doesNotMatch(serverSource, /api\.github\.com|octokit/i);
  assert.doesNotMatch(serverSource, /WGCF_REPOSITORY_CUSTODY_BASE_URL/);
  assert.match(serverSource, /x-oos-caller-secret/);
});

function intent() {
  return {
    approvalNote: "Approve the exact existing Console repository custody link.",
    custodyKind: "dedicated-owner-repo",
    providerHost: "github.com",
    providerRepositoryId: "1317781281",
    repositoryId: "repo-governance-operations-console",
    repositoryName: "governance-operations-console",
    repositoryOwner: "mfshaf7",
    requestedAt: "2026-08-29T10:00:00.000Z",
    requestId: "repository-custody-request:console-test-001",
    workspaceOwnerRef: "repo:governance-operations-console",
  };
}

function repositoryRecord() {
  return {
    admissionPosture: [],
    admissionState: "admitted",
    blockers: [],
    boundary: "Console source.",
    custody: {
      kind: intent().custodyKind,
      state: "unrecorded",
      workspaceOwnerRef: intent().workspaceOwnerRef,
    },
    githubUrl: "https://github.com/mfshaf7/governance-operations-console",
    id: intent().repositoryId,
    lastValidation: "passing",
    lifecycle: "active",
    name: intent().repositoryName,
    nextAction: "Link custody.",
    owner: "Governance Operations Console",
    providerIdentity: {
      host: "github.com",
      name: intent().repositoryName,
      owner: intent().repositoryOwner,
      provider: "github",
      repositoryId: intent().providerRepositoryId,
    },
    purpose: "Governance operations.",
    repoClass: "product-source",
    role: "operator-console",
    routeSource: "workspace-governance/contracts/repos.yaml",
    runtimeLane: {
      decision: "dev-integration-required",
      detail: "Profile managed.",
      status: "profile-managed",
      tone: "info",
    },
    securityBinding: {
      detail: "Reviewed.",
      required: true,
      status: "review-coverage",
      subject: true,
      tone: "ok",
    },
    tone: "ok",
  };
}

function canonicalRequestFixture() {
  return {
    action: "link-existing",
    artifact_type: "repository_custody_request",
    authority: {
      approval_ref: { digest: digest("4"), uri: "console://approval/test" },
      credential_binding_ref: {
        digest: env.REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST,
        uri: env.REPOSITORY_CUSTODY_CREDENTIAL_BINDING_URI,
      },
      policy_profile_ref: {
        digest: env.REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST,
        uri: env.REPOSITORY_CUSTODY_POLICY_PROFILE_URI,
      },
    },
    correlation: { causation_id: null, correlation_id: intent().requestId },
    idempotency_key: intent().requestId,
    operator_ref: { digest: digest("5"), uri: "console://operators/test" },
    request_digest: digest("a"),
    request_id: intent().requestId,
    requested_at: intent().requestedAt,
    requested_custody: {
      custody_kind: intent().custodyKind,
      workspace_owner_ref: intent().workspaceOwnerRef,
    },
    schema_version: 1,
    target: {
      name: intent().repositoryName,
      owner: intent().repositoryOwner,
      provider: "github",
      provider_host: intent().providerHost,
      provider_repository_id: intent().providerRepositoryId,
    },
    workflow: {
      execution_id: "repository-custody-execution:test-001",
      workflow_id: "repository-custody",
      workflow_version: "1",
    },
  };
}

function successfulResult(request, { replayed = false } = {}) {
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
