import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { assertRepositoryCustodyWorkflowResult } from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-contract.ts";
import {
  projectRepositoryProvisioningResults,
  repositoryProvisionedRecordId,
} from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts";
import {
  provisionRepository,
  readRepositoryCustodyResult,
  RepositoryCustodyOosError,
} from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";

const digest = (character) => `sha256:${character.repeat(64)}`;
const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-server-secret",
  REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST: digest("2"),
  REPOSITORY_CUSTODY_POLICY_PROFILE_URI:
    "https://workspace-governance.local/contracts/repository-custody.yaml",
  REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_DIGEST: digest("7"),
  REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_URI:
    "https://platform-engineering.local/credential-bindings/github-app/repository-create",
};

test("case:repository-provisioning-positive binds exact server authority, projects provider truth, and replays", async () => {
  const calls = [];
  let canonicalRequest;
  let submissions = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (init.method === "POST") {
      submissions += 1;
      canonicalRequest = JSON.parse(String(init.body));
      return jsonResponse(
        provisioningResult(canonicalRequest, { replayed: submissions > 1 }),
        submissions > 1 ? 200 : 201,
      );
    }
    return jsonResponse(
      provisioningResult(canonicalRequest, { replayed: true }),
    );
  };

  const created = await provisionRepository(intent(), { env, fetchImpl });
  const replayed = await provisionRepository(intent(), { env, fetchImpl });
  const read = await readRepositoryCustodyResult(intent().requestId, {
    credentialKind: "provisioning",
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
  assert.equal(canonicalRequest.action, "provision-new");
  assert.equal(canonicalRequest.target.provider, "github");
  assert.equal(canonicalRequest.target.provider_host, "github.com");
  assert.equal(canonicalRequest.target.owner_scope, "organization");
  assert.equal(canonicalRequest.target.provider_repository_id, null);
  assert.equal(canonicalRequest.provisioning.visibility, "private");
  assert.equal(canonicalRequest.provisioning.initialize_with_readme, true);
  assert.deepEqual(canonicalRequest.provisioning.features, {
    discussions: false,
    issues: true,
    projects: false,
    wiki: false,
  });
  assert.deepEqual(canonicalRequest.provisioning.merge_policy, {
    allow_merge_commit: false,
    allow_rebase_merge: false,
    allow_squash_merge: true,
    delete_branch_on_merge: true,
  });
  assert.deepEqual(canonicalRequest.authority.credential_binding_ref, {
    digest: env.REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_DIGEST,
    uri: env.REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_URI,
  });
  assert.match(canonicalRequest.request_digest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(
    JSON.parse(String(calls[0].init.body)),
    JSON.parse(String(calls[1].init.body)),
  );

  const projected = projectRepositoryProvisioningResults([], {
    [intent().requestId]: created,
  });
  assert.equal(projected.length, 1);
  assert.equal(projected[0].id, repositoryProvisionedRecordId(created));
  assert.equal(projected[0].admissionState, "ready");
  assert.equal(projected[0].custody.state, "provisioned");
  assert.equal(projected[0].providerIdentity.repositoryId, "1350916928");
  assert.match(projected[0].nextAction, /separate Workspace Intake/i);
});

test("case:repository-provisioning-negative fails closed on missing authority, invalid review, stale request, and mismatched readback", async () => {
  await assert.rejects(
    provisionRepository(intent(), {
      env: {
        ...env,
        REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_DIGEST: undefined,
        REPOSITORY_PROVISIONING_CREDENTIAL_BINDING_URI: undefined,
      },
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
    provisionRepository(
      { ...intent(), templateReviewed: false },
      {
        env,
        fetchImpl: async () => {
          throw new Error("must not call OOS");
        },
      },
    ),
    (error) =>
      error instanceof RepositoryCustodyOosError &&
      error.code === "repository_provisioning_intent_invalid" &&
      error.status === 400,
  );

  await assert.rejects(
    provisionRepository(intent(), {
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
      error.status === 409,
  );

  await assert.rejects(
    provisionRepository(intent(), {
      env,
      fetchImpl: async (_url, init) => {
        const request = JSON.parse(String(init.body));
        const result = provisioningResult(request);
        result.request.target.name = "different-name";
        return jsonResponse(result);
      },
    }),
    (error) => /approved provisioning is invalid/i.test(error.message),
  );

  const request = await captureRequest();
  const staleReadback = provisioningResult(request);
  staleReadback.provider_readback.applied_provisioning.settings.visibility =
    "public";
  assert.throws(
    () => assertRepositoryCustodyWorkflowResult(staleReadback),
    /applied provisioning settings is invalid/i,
  );

  const denied = provisioningResult(request, { status: "denied" });
  assert.equal(assertRepositoryCustodyWorkflowResult(denied).status, "denied");
  assert.equal(
    projectRepositoryProvisioningResults([], { denied }).length,
    0,
  );
  const retryable = provisioningResult(request, { status: "failed" });
  assert.equal(assertRepositoryCustodyWorkflowResult(retryable).retryable, true);
  const applying = provisioningResult(request, { status: "applying" });
  assert.equal(assertRepositoryCustodyWorkflowResult(applying).next_action, "await-provider");
});

test("case:repository-provisioning-browser-boundary exposes only same-origin reviewed intent", () => {
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
  const controllerSource = readFileSync(
    new URL(
      "../../src/domain-workspaces/repository/presentation/surface/use-repository-control-controller.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const routeSource = readFileSync(
    new URL(
      "../../src/app/api/repositories/provisioning/requests/route.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(browserSource, /\/api\/repositories\/provisioning\/requests/);
  assert.match(browserSource, /readProvisioning/);
  assert.match(controllerSource, /status === "applying"/);
  assert.match(controllerSource, /readProvisioning\(requestId\)/);
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET|INSTALLATION_TOKEN|PRIVATE_KEY/);
  assert.doesNotMatch(browserSource, /api\.github\.com|fixtures\//i);
  assert.doesNotMatch(serverSource, /api\.github\.com|octokit/i);
  assert.match(serverSource, /REPOSITORY_PROVISIONING_CREDENTIAL_BINDING/);
  assert.match(serverSource, /x-oos-caller-secret/);
  assert.match(routeSource, /provisionRepositoryRoute/);
});

function intent() {
  return {
    approvalNote: "Approve this exact organization repository and provider baseline.",
    custodyKind: "dedicated-owner-repo",
    repositoryDescription: "Governed repository provisioning proof.",
    repositoryName: "governed-repository-provisioning-proof",
    repositoryOwner: "mfshaf7-workspace",
    requestedAt: "2026-08-30T08:00:00.000Z",
    requestId: "repository-custody-request:console-provision-001",
    templateReviewed: true,
    visibility: "private",
    workspaceOwnerRef: "repo:governed-repository-provisioning-proof",
  };
}

async function captureRequest() {
  let request;
  await provisionRepository(intent(), {
    env,
    fetchImpl: async (_url, init) => {
      request = JSON.parse(String(init.body));
      return jsonResponse(provisioningResult(request));
    },
  });
  return request;
}

function provisioningResult(request, { replayed = false, status = "succeeded" } = {}) {
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
