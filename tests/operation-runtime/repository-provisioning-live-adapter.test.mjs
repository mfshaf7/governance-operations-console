import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { provisioningResult } from "../support/repository-provisioning-result.mjs";

import { assertRepositoryCustodyWorkflowResult } from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-contract.ts";
import {
  projectRepositoryProvisioningResults,
  repositoryProvisionedRecordId,
} from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts";
import {
  provisionRepository,
  readRepositoryCustodyResult,
  RepositoryCustodyOosError,
  resumeRepositoryProvisioning,
} from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
import {
  repositoryProvisioningCanCorrect,
  repositoryRequestDraftFromResult,
  repositoryProvisioningResultProjection,
} from "../../src/domain-workspaces/repository/presentation/dialogs/request/repository-request-view-model.ts";
import {
  assertCanonicalSourceRequest,
  canonicalSourceResponse,
} from "../support/console-source-projection.mjs";

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
    assertCanonicalSourceRequest(init);
    return canonicalSourceResponse(
      provisioningResult(canonicalRequest, { replayed: true }),
      {
        recordRef: `oos://repository-custody/requests/${intent().requestId}`,
        sourceOwner: "operator-orchestration-service",
      },
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
  assert.match(controllerSource, /provision\(\{ requestId, resume: true \}\)/);
  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET|INSTALLATION_TOKEN|PRIVATE_KEY/);
  assert.doesNotMatch(browserSource, /api\.github\.com|fixtures\//i);
  assert.doesNotMatch(serverSource, /api\.github\.com|octokit/i);
  assert.match(serverSource, /REPOSITORY_PROVISIONING_CREDENTIAL_BINDING/);
  assert.match(serverSource, /x-oos-caller-secret/);
  assert.match(routeSource, /provisionRepositoryRoute/);
});

test("failed applied settings remain readable failure, never successful custody or a malformed register", async () => {
  const request = await captureRequest();
  const result = provisioningResult(request);
  result.status = "failed";
  result.next_action = "request-correction";
  result.failure = { code: "repository_provider_readback_stale", message: "Provider settings do not match.", retryable: false };
  result.provider_operation.state = "provider-acknowledged";
  result.provider_operation.completion_path = null;
  result.provider_readback.applied_provisioning.settings.merge_policy.delete_branch_on_merge = false;
  result.receipt.outcome = "failed";
  result.receipt.workflow_status = "failed";
  result.receipt.repository_identity = null;
  result.receipt.custody.after = "unrecorded";
  for (const key of Object.keys(result.receipt.downstream_handoffs)) result.receipt.downstream_handoffs[key] = "not-requested";
  assert.equal(assertRepositoryCustodyWorkflowResult(result).status, "failed");
  assert.equal(projectRepositoryProvisioningResults([], { retained: result }).length, 0);
  assert.equal(repositoryProvisioningCanCorrect(result), true);
  const draft = repositoryRequestDraftFromResult(result);
  assert.equal(draft.name, request.target.name);
  assert.equal(draft.purpose, request.provisioning.description);
  assert.equal(draft.approvalNote, "");
  assert.equal(draft.templateReviewed, false);
  assert.match(repositoryProvisioningResultProjection(result).title, /exists; custody incomplete/);
  result.provider_readback.applied_provisioning.settings.merge_policy.delete_branch_on_merge = "false";
  assert.throws(() => assertRepositoryCustodyWorkflowResult(result), /applied settings delete_branch_on_merge is invalid/);
});

test("correction binds a new approval and request to the retained failure without accepting browser authority", async () => {
  let submitted;
  const correction = { ...intent(), requestId: `${intent().requestId}-correction`, correctionOfRequestId: intent().requestId };
  await provisionRepository(correction, {
    env,
    fetchImpl: async (_url, init) => {
      submitted = JSON.parse(String(init.body));
      return jsonResponse(provisioningResult(submitted));
    },
  });
  assert.equal(submitted.correlation.causation_id, intent().requestId);
  assert.equal(submitted.request_id, correction.requestId);
  assert.notDeepEqual(submitted.authority.approval_ref, (await captureRequest()).authority.approval_ref);
  await assert.rejects(provisionRepository({ ...intent(), correctionOfRequestId: intent().requestId }, { env }),
    error => error.code === "repository_provisioning_intent_invalid");
});

test("cold-browser resume resubmits the exact retained approval instead of reconstructing its note", async () => {
  const request = await captureRequest();
  const calls = [];
  const result = await resumeRepositoryProvisioning(request.request_id, {
    env,
    fetchImpl: async (_url, init) => {
      calls.push(init);
      if (init.method === "GET") {
        assertCanonicalSourceRequest(init);
        return canonicalSourceResponse(provisioningResult(request, { status: "applying" }), {
          recordRef: `oos://repository-custody/requests/${request.request_id}`, sourceOwner: "operator-orchestration-service",
        });
      }
      assert.deepEqual(JSON.parse(init.body), request);
      return jsonResponse(provisioningResult(request));
    },
  });
  assert.equal(result.status, "succeeded");
  assert.equal(calls.length, 2);
  let writes = 0;
  await assert.rejects(resumeRepositoryProvisioning(request.request_id, {
    env: { ...env, GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:someone-else" },
    fetchImpl: async (_url, init) => {
      if (init.method === "POST") writes += 1;
      return canonicalSourceResponse(provisioningResult(request, { status: "failed" }), {
        recordRef: `oos://repository-custody/requests/${request.request_id}`, sourceOwner: "operator-orchestration-service",
      });
    },
  }), error => error.code === "repository_provisioning_resume_denied");
  assert.equal(writes, 0);
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
