import { custodyResult as successfulResult } from "../support/repository-custody-result.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertRepositoryCustodyWorkflowResult,
} from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-contract.ts";
import { projectRepositoryCustodyResults } from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-projection.ts";
import {
  linkExistingRepositoryCustody,
  listRepositoryCustodyResults,
  readRepositoryCustodyResult,
  RepositoryCustodyOosError,
} from "../../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
import { readRepositoryCustodyRegister } from "../../src/domain-workspaces/repository/live-runtime/repository-custody-live-readback.ts";
import { emptyRepositoryIntakeDraft, repositoryIntakeCustody, repositoryIntakeRecord } from "../../src/domain-workspaces/repository/presentation/dialogs/admission/repository-intake-candidate.ts";
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
  REPOSITORY_CUSTODY_CREDENTIAL_BINDING_DIGEST: digest("3"),
  REPOSITORY_CUSTODY_CREDENTIAL_BINDING_URI:
    "https://platform-engineering.local/credential-bindings/github-app/repository-read",
  REPOSITORY_CUSTODY_POLICY_PROFILE_DIGEST: digest("2"),
  REPOSITORY_CUSTODY_POLICY_PROFILE_URI:
    "https://workspace-governance.local/contracts/repository-custody.yaml",
};

test("Repository entrant entry uses successful matching custody, never fixture admission", async () => {
  let request;
  await linkExistingRepositoryCustody(intent(), { env, fetchImpl: async (_url, init) => {
    request = JSON.parse(String(init.body)); return jsonResponse(successfulResult(request), 201);
  } });
  const result = successfulResult(request);
  const [record] = projectRepositoryCustodyResults([], { retained: result });
  assert.deepEqual(repositoryIntakeCustody(record, result), {
    requestId: request.request_id,
    target: { kind: "repo", name: request.requested_custody.workspace_owner_ref.slice(5) },
  });
  assert.equal(repositoryIntakeCustody(record), null);
  for (const mutate of [
    (value) => { value.status = "failed"; },
    (value) => { value.provider_readback.provider_lifecycle_state = "archived"; },
    (value) => { value.provider_readback.repository_identity.provider_repository_id = "999999999"; },
    (value) => { value.receipt.repository_identity.provider_repository_id = "999999999"; },
    (value) => { value.request.requested_custody.workspace_owner_ref = "product:not-a-repo"; },
  ]) {
    const denied = structuredClone(result); mutate(denied);
    assert.equal(repositoryIntakeCustody(record, denied), null);
  }
});

test("Repository entrant metadata requires explicit owner/validation choices and cannot supply provider identity", () => {
  assert.equal(repositoryIntakeRecord(emptyRepositoryIntakeDraft), null);
  const draft = { ...emptyRepositoryIntakeDraft, repoClass: "product-owner", securityBinding: "false",
    notes: "Synthetic operator-reviewed owner", validationPosture: "covered-by-owner-repo",
    graphRole: "product-runtime-source", validationNotes: "Owner selects applicable validation; no universal CI." };
  const record = repositoryIntakeRecord(draft);
  assert.equal(record.requires_security_bindings, false);
  assert.equal(record.security_owner, null);
  assert.equal(record.provider_repository, undefined);
  assert.deepEqual(record.validation_behavior.catalog_refs, []);
  assert.equal(repositoryIntakeRecord({ ...draft, securityBinding: "true" }), null);
  assert.equal(repositoryIntakeRecord({ ...draft, securityBinding: "true", securityOwner: "security-architecture" }).security_owner, "security-architecture");
});

test("canonical Repository register survives reload through authenticated owner readback", async () => {
  let request;
  await linkExistingRepositoryCustody(intent(), {
    env,
    fetchImpl: async (_url, init) => {
      request = JSON.parse(String(init.body));
      return jsonResponse(successfulResult(request), 201);
    },
  });
  const result = successfulResult(request, { replayed: true });
  const page = { schema_version: 1, records: [result], next_cursor: null };
  const listed = await listRepositoryCustodyResults(null, {
    env,
    fetchImpl: async (url, init) => {
      assert.match(String(url), /\/v1\/repository-custody\/requests$/);
      assertCanonicalSourceRequest(init);
      assert.equal(init.headers["x-oos-caller-secret"], env.OOS_CALLER_SECRET);
      return canonicalSourceResponse(page, {
        recordRef: "oos://repository-custody/requests",
        sourceOwner: "operator-orchestration-service",
      });
    },
  });
  assert.equal(listed.records[0].request.request_id, request.request_id);
  const fetchImpl = async () => jsonResponse({ ...page, mode: "live", status: "current", error: null });
  for (let reload = 0; reload < 2; reload += 1) {
    const records = await readRepositoryCustodyRegister(fetchImpl);
    const projected = projectRepositoryCustodyResults([], { [records[0].request.request_id]: records[0] });
    assert.equal(projected[0].providerIdentity.repositoryId, result.provider_readback.repository_identity.provider_repository_id);
    assert.equal(projected[0].custody.state, "linked");
    assert.equal(projected[0].admissionState, "ready");
  }
  await assert.rejects(
    readRepositoryCustodyRegister(async () => jsonResponse({ mode: "live", status: "offline", records: [] }, 503)),
    /unavailable or invalid/,
  );
  await assert.rejects(listRepositoryCustodyResults("../private", { env }), /cursor is invalid/);
  const cursor = "a".repeat(64);
  await assert.rejects(
    readRepositoryCustodyRegister(async () => jsonResponse({
      schema_version: 1, records: [], next_cursor: cursor, mode: "live", status: "current",
    })),
    /did not advance/,
  );
});

test("Repository reads distinguish temporary connection failures from setup and invalid responses", async () => {
  await assert.rejects(readRepositoryCustodyRegister(async () => { throw new TypeError('Connection lost'); }), error => error.retryable === true);
  await assert.rejects(readRepositoryCustodyRegister(async () => jsonResponse({code:'repository_custody_oos_unavailable',retryable:true},502)), error => error.retryable === true);
  await assert.rejects(readRepositoryCustodyRegister(async () => jsonResponse({code:'repository_custody_oos_not_configured',retryable:false},503)), error => error.retryable === false);
  await assert.rejects(readRepositoryCustodyRegister(async () => jsonResponse({malformed:true})), error => error.retryable === false);
});

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
    assertCanonicalSourceRequest(init);
    return canonicalSourceResponse(
      successfulResult(canonicalRequest, { replayed: true }),
      {
        recordRef: `oos://repository-custody/requests/${intent().requestId}`,
        sourceOwner: "operator-orchestration-service",
      },
    );
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

test("request attachment records an explicit reviewed association without changing standalone linkage",async()=>{
 let request;
 const attached=await linkExistingRepositoryCustody({...intent(),proposalId:"idea-851",createdForRequest:true},{env,fetchImpl:async(_url,init)=>{
  request=JSON.parse(init.body);return jsonResponse(successfulResult(request),201);
 }});
 assert.equal(attached.request.correlation.correlation_id,"repo-request://proposal/idea-851");
 assert.equal(attached.request.action,"link-existing");
 let calls=0;
 await assert.rejects(linkExistingRepositoryCustody({...intent(),proposalId:"idea-851"},{env,fetchImpl:async()=>{calls++;throw Error("must not send")}}),{code:"repository_custody_link_intent_invalid"});
 assert.equal(calls,0);
});
