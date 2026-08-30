import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { assertRepositoryLifecycleWorkflowResult } from "../../src/domain-workspaces/repository/live-runtime/repository-lifecycle-live-contract.ts";
import {
  buildRepositoryLifecycleRequest,
  executeRepositoryLifecycleAction,
  readRepositoryLifecycleAudit,
  readRepositoryLifecycleResult,
  RepositoryLifecycleOosError,
} from "../../src/domain-workspaces/repository/server/repository-lifecycle-oos-client.ts";

const digest = (character) => `sha256:${character.repeat(64)}`;
const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  NODE_ENV: "test",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-server-secret",
  REPOSITORY_LIFECYCLE_POLICY_PROFILE_DIGEST: digest("2"),
  REPOSITORY_LIFECYCLE_POLICY_PROFILE_URI:
    "https://workspace-governance.local/contracts/repository-lifecycle.yaml",
  REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_DIGEST: digest("3"),
  REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_URI:
    "https://platform-engineering.local/credential-bindings/github-app/repository-lifecycle",
};

test("case:repository-lifecycle-console-positive applies, replays, reads, and projects exact OOS evidence", async () => {
  const calls = [];
  let request;
  let submissions = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).includes("/repositories/")) {
      return jsonResponse(initialAudit());
    }
    if (init.method === "POST") {
      submissions += 1;
      request = JSON.parse(String(init.body));
      return jsonResponse(
        successfulResult(request, { replayed: submissions > 1 }),
        submissions > 1 ? 200 : 201,
      );
    }
    return jsonResponse(successfulResult(request, { replayed: true }));
  };

  const created = await executeRepositoryLifecycleAction(intent(), {
    env,
    fetchImpl,
  });
  const replayed = await executeRepositoryLifecycleAction(intent(), {
    env,
    fetchImpl,
  });
  const read = await readRepositoryLifecycleResult(intent().requestId, {
    env,
    fetchImpl,
  });
  const audit = await readRepositoryLifecycleAudit(
    { provider: "github", providerRepositoryId: "1317781281" },
    { env, fetchImpl },
  );

  assert.equal(created.status, "succeeded");
  assert.equal(created.current_state.provider_lifecycle_state, "archived");
  assert.equal(replayed.replayed, true);
  assert.equal(read.replayed, true);
  assert.equal(audit.source_authority, "operator-orchestration-service");
  assert.equal(request.action, "archive-provider");
  assert.equal(request.current_state.provider_version, "etag-before");
  assert.equal(request.target.provider_lifecycle_state, "archived");
  assert.equal(
    decodeURIComponent(request.authority.approval_ref.uri).includes(
      intent().requestId,
    ),
    true,
  );
  assert.equal(
    request.authority.provider_credential_binding_ref.digest,
    env.REPOSITORY_LIFECYCLE_PROVIDER_CREDENTIAL_BINDING_DIGEST,
  );
  assert.equal(request.idempotency_key, intent().requestId);
  assert.match(request.request_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(calls[0].init.headers["x-oos-caller-id"], env.OOS_CALLER_ID);
  assert.equal(calls[0].init.headers["x-oos-caller-secret"], env.OOS_CALLER_SECRET);
  assert.doesNotMatch(JSON.stringify(request), /test-only-server-secret/);
  assert.deepEqual(
    JSON.parse(String(calls[1].init.body)),
    JSON.parse(String(calls[3].init.body)),
  );
});

test("case:repository-lifecycle-console-negative fails closed on missing authority, unsupported identity, stale state, and malformed evidence", async () => {
  await assert.rejects(
    executeRepositoryLifecycleAction(intent(), {
      env: { NODE_ENV: "test", OOS_BASE_URL: env.OOS_BASE_URL },
      fetchImpl: async () => {
        throw new Error("must not call OOS");
      },
    }),
    (error) =>
      error instanceof RepositoryLifecycleOosError &&
      error.code === "repository_lifecycle_oos_not_configured" &&
      error.status === 503,
  );

  await assert.rejects(
    executeRepositoryLifecycleAction(
      { ...intent(), providerRepositoryId: "owner/name" },
      {
        env,
        fetchImpl: async () => {
          throw new Error("must not call OOS");
        },
      },
    ),
    (error) =>
      error instanceof RepositoryLifecycleOosError &&
      error.code === "repository_lifecycle_identity_invalid" &&
      error.status === 400,
  );

  await assert.rejects(
    executeRepositoryLifecycleAction(intent(), {
      env,
      fetchImpl: async (url) =>
        String(url).includes("/repositories/")
          ? jsonResponse(initialAudit())
          : jsonResponse(
              {
                error: "repository_lifecycle_state_stale",
                message: "Current lifecycle state changed.",
              },
              409,
            ),
    }),
    (error) =>
      error instanceof RepositoryLifecycleOosError &&
      error.code === "repository_lifecycle_state_stale" &&
      error.status === 409,
  );

  await assert.rejects(
    executeRepositoryLifecycleAction(intent(), {
      env,
      fetchImpl: async (url, init) => {
        if (String(url).includes("/repositories/")) {
          return jsonResponse(initialAudit());
        }
        const request = JSON.parse(String(init.body));
        const result = successfulResult(request);
        result.provider_readback.repository_identity = {
          ...result.provider_readback.repository_identity,
          provider_repository_id: "999999999",
        };
        return jsonResponse(result);
      },
    }),
    /provider readback repository identity is invalid/i,
  );
});

test("case:repository-lifecycle-source-provenance-positive keeps OOS authority server-side and exposes one guarded console workflow", () => {
  const browserSource = source(
    "../../src/domain-workspaces/repository/live-runtime/use-repository-lifecycle-live-runtime.ts",
  );
  const serverSource = source(
    "../../src/domain-workspaces/repository/server/repository-lifecycle-oos-client.ts",
  );
  const dialogSource = source(
    "../../src/domain-workspaces/repository/presentation/dialogs/lifecycle/repository-lifecycle-dialog.tsx",
  );
  const stackSource = source(
    "../../src/domain-workspaces/repository/presentation/surface/repository-control-dialog-stack.tsx",
  );

  assert.doesNotMatch(browserSource, /OOS_CALLER_SECRET|credential_binding/i);
  assert.doesNotMatch(browserSource, /fixtures\//i);
  assert.doesNotMatch(serverSource, /api\.github\.com|octokit/i);
  assert.match(serverSource, /x-oos-caller-secret/);
  assert.match(dialogSource, /TerasWizardModal/);
  assert.match(dialogSource, /Action[\s\S]*Review[\s\S]*Result/);
  assert.match(dialogSource, /Apply Lifecycle Action/);
  assert.doesNotMatch(stackSource, /RepositoryRetirementRequestDialog/);
});

test("case:repository-lifecycle-source-provenance-negative cannot bootstrap live authority from fixture state", async () => {
  await assert.rejects(
    executeRepositoryLifecycleAction(intent(), {
      env,
      fetchImpl: async (url) => {
        assert.match(String(url), /repository-lifecycle\/repositories/);
        return jsonResponse(
          {
            error: "repository_lifecycle_repository_not_found",
            message: "Repository lifecycle projection was not found.",
          },
          404,
        );
      },
    }),
    (error) =>
      error instanceof RepositoryLifecycleOosError &&
      error.code === "repository_lifecycle_source_state_missing" &&
      error.status === 409,
  );

  const controllerSource = source(
    "../../src/domain-workspaces/repository/presentation/surface/use-repository-control-controller.ts",
  );
  assert.doesNotMatch(controllerSource, /recordRepositoryRetirementRequestCommand/);
  assert.doesNotMatch(controllerSource, /prototype-local retirement/i);
});

test("case:repository-lifecycle-end-to-end-positive connects register review, guarded action, OOS route, and audit history", () => {
  const controllerSource = source(
    "../../src/domain-workspaces/repository/presentation/surface/use-repository-control-controller.ts",
  );
  const stackSource = source(
    "../../src/domain-workspaces/repository/presentation/surface/repository-control-dialog-stack.tsx",
  );
  const historySource = source(
    "../../src/domain-workspaces/repository/presentation/dialogs/history/repository-history-dialog.tsx",
  );
  const routeSource = source(
    "../../src/domain-workspaces/repository/server/repository-lifecycle-api-routes.ts",
  );

  assert.match(controllerSource, /useRepositoryLifecycleLiveRuntime/);
  assert.match(controllerSource, /openRepositoryLifecycle/);
  assert.match(stackSource, /RepositoryLifecycleDialog/);
  assert.match(historySource, /lifecycleAudit/);
  assert.match(routeSource, /requireLiveMode\(\)/);
  assert.match(routeSource, /executeRepositoryLifecycleAction/);
});

test("case:repository-lifecycle-end-to-end-negative removes the competing local retirement action and hard-delete paths", () => {
  const repositoryRoot = new URL(
    "../../src/domain-workspaces/repository/",
    import.meta.url,
  );
  const runtimeSource = source(
    "../../src/domain-workspaces/repository/local-runtime/repository-runtime.ts",
  );
  const commandSource = source(
    "../../src/domain-workspaces/repository/local-runtime/repository-runtime-command-handler.ts",
  );
  const routeSource = source(
    "../../src/domain-workspaces/repository/server/repository-lifecycle-api-routes.ts",
  );

  assert.doesNotMatch(runtimeSource, /recordRepositoryRetirementRequestCommand/);
  assert.doesNotMatch(commandSource, /record-retirement-request/);
  assert.doesNotMatch(routeSource, /delete-provider|hard-delete|method:\s*["']DELETE/);
  assert.equal(repositoryRoot.protocol, "file:");
});

test("repository lifecycle request construction covers every action and exact reversal receipt", () => {
  const config = {
    baseUrl: env.OOS_BASE_URL,
    callerId: env.OOS_CALLER_ID,
    callerSecret: env.OOS_CALLER_SECRET,
    operatorId: env.GOVERNANCE_CONSOLE_OPERATOR_ID,
  };
  const actions = [
    "transfer-workspace-custody",
    "archive-provider",
    "unarchive-provider",
    "retire-workspace-record",
    "restore-workspace-record",
  ];
  for (const action of actions) {
    const reverseAction =
      action === "unarchive-provider"
        ? "archive-provider"
        : action === "restore-workspace-record"
          ? "retire-workspace-record"
          : null;
    const current = {
      audit: reverseAction
        ? {
            ...initialAudit(),
            current_state: {
              ...initialState(),
              provider_lifecycle_state:
                action === "unarchive-provider" ? "archived" : "active",
              workspace_record_state:
                action === "restore-workspace-record" ? "retired" : "active",
            },
            history: [
              {
                action: reverseAction,
                completed_at: "2026-08-30T09:00:00.000Z",
                outcome: "succeeded",
                receipt_ref: {
                  digest: digest("7"),
                  uri: `oos://receipts/repository-lifecycle/${reverseAction}.json`,
                },
                reversal_of_receipt_ref: null,
              },
            ],
          }
        : null,
      state: {
        ...initialState(),
        provider_lifecycle_state:
          action === "unarchive-provider" ? "archived" : "active",
        workspace_record_state:
          action === "restore-workspace-record" ? "retired" : "active",
      },
    };
    const request = buildRepositoryLifecycleRequest(
      {
        ...intent(),
        action,
        requestId: `repository-lifecycle-request:${action}-contract`,
        sourceOwnerAcceptanceNote:
          action === "transfer-workspace-custody"
            ? "Source owner accepts this exact custody transfer."
            : "",
        targetOwnerAcceptanceNote:
          action === "transfer-workspace-custody"
            ? "Target owner accepts this exact custody transfer."
            : "",
        targetWorkspaceOwnerRef:
          action === "transfer-workspace-custody" ? "repo:next-owner" : "",
      },
      current,
      config,
      env,
    );

    assert.equal(request.action, action);
    assert.match(request.request_digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(
      Boolean(request.authority.provider_credential_binding_ref),
      ["archive-provider", "unarchive-provider"].includes(action),
    );
    assert.equal(
      Boolean(request.authority.source_owner_acceptance_ref),
      action === "transfer-workspace-custody",
    );
    assert.equal(
      Boolean(request.reversal_of_receipt_ref),
      Boolean(reverseAction),
    );
  }
});

function intent() {
  return {
    action: "archive-provider",
    approvalNote: "Archive this exact provider repository after impact review.",
    impact: { blockerDecision: null, justification: "" },
    provider: "github",
    providerRepositoryId: "1317781281",
    repositoryId: "repo-governance-operations-console",
    requestedAt: "2026-08-30T10:00:00.000Z",
    requestId: "repository-lifecycle-request:console-test-001",
    sourceCustodyRequestId: null,
    sourceOwnerAcceptanceNote: "",
    targetOwnerAcceptanceNote: "",
    targetWorkspaceOwnerRef: "",
  };
}

function initialState() {
  return {
    custody_state: "linked",
    custody_version: "custody-v1",
    provider_lifecycle_state: "active",
    provider_version: "etag-before",
    workspace_owner_ref: "repo:governance-operations-console",
    workspace_record_state: "active",
  };
}

function initialAudit() {
  return {
    artifact_type: "repository_lifecycle_audit",
    audit_id: "repository-lifecycle-audit:github:1317781281",
    current_state: initialState(),
    history: [],
    impact_summary: {
      blocker_disposition: null,
      blocking_finding_count: 0,
      finding_count: 0,
      latest_assessment_ref: null,
    },
    integrity: integrity(digest("a")),
    latest_terminal_receipt_ref: null,
    mutation: false,
    projected_at: "2026-08-30T09:59:00.000Z",
    repository_identity: {
      provider: "github",
      provider_repository_id: "1317781281",
    },
    schema_version: 1,
    source_authority: "operator-orchestration-service",
  };
}

function successfulResult(request, { replayed = false } = {}) {
  const decisionRef = {
    digest: digest("d"),
    uri: "wgcf://decisions/repository-lifecycle/test.json",
  };
  const providerReadbackRef = {
    digest: digest("e"),
    uri: "oos://readbacks/repository-lifecycle/test.json",
  };
  const receiptRef = {
    digest: digest("f"),
    uri: "oos://receipts/repository-lifecycle/test.json",
  };
  const after = {
    ...request.current_state,
    provider_lifecycle_state: "archived",
    provider_version: "etag-after",
  };
  const receipt = {
    action: request.action,
    after,
    artifact_type: "repository_lifecycle_receipt",
    before: request.current_state,
    blocker_disposition: request.impact.blocker_disposition,
    completed_at: "2026-08-30T10:00:03.000Z",
    confirmations: {
      operator_approval_ref: request.authority.approval_ref,
      provider_credential_binding_ref:
        request.authority.provider_credential_binding_ref,
      source_owner_acceptance_ref: request.authority.source_owner_acceptance_ref,
      target_owner_acceptance_ref: request.authority.target_owner_acceptance_ref,
    },
    decision_ref: decisionRef,
    downstream_mutation: "none",
    findings: ["Lifecycle action completed and was read back."],
    history_event_ref: {
      digest: digest("9"),
      uri: "oos://events/repository-lifecycle/test.json",
    },
    impact_assessment_ref: request.impact.impact_assessment_ref,
    integrity: integrity(receiptRef.digest),
    outcome: "succeeded",
    provider_readback_ref: providerReadbackRef,
    receipt_id: "repository-lifecycle-receipt:test-001:1",
    repository_identity: request.repository_identity,
    request_ref: {
      digest: request.request_digest,
      uri: "wgcf://requests/repository-lifecycle/test.json",
    },
    reversal_of_receipt_ref: request.reversal_of_receipt_ref,
    schema_version: 1,
    workflow_status: "succeeded",
  };
  const audit = {
    artifact_type: "repository_lifecycle_audit",
    audit_id: "repository-lifecycle-audit:github:1317781281",
    current_state: after,
    history: [
      {
        action: request.action,
        completed_at: receipt.completed_at,
        outcome: "succeeded",
        receipt_ref: receiptRef,
        reversal_of_receipt_ref: request.reversal_of_receipt_ref,
      },
    ],
    impact_summary: {
      blocker_disposition: null,
      blocking_finding_count: 0,
      finding_count: 0,
      latest_assessment_ref: request.impact.impact_assessment_ref,
    },
    integrity: integrity(digest("b")),
    latest_terminal_receipt_ref: receiptRef,
    mutation: false,
    projected_at: receipt.completed_at,
    repository_identity: request.repository_identity,
    schema_version: 1,
    source_authority: "operator-orchestration-service",
  };
  return {
    audit,
    current_state: after,
    decision: {
      action: request.action,
      approved_target: request.target,
      artifact_type: "repository_lifecycle_decision",
      current_state: request.current_state,
      decision_id: "repository-lifecycle-decision:test-001",
      evaluated_at: "2026-08-30T10:00:01.000Z",
      findings: [],
      impact: { ...request.impact, downstream_mutation: "none" },
      integrity: integrity(decisionRef.digest),
      next_action: "archive-provider",
      obligations: ["fresh-readback-required", "immutable-receipt-required"],
      outcome: "allowed",
      policy_version: "repository-lifecycle/v1",
      request_ref: {
        digest: request.request_digest,
        uri: "wgcf://requests/repository-lifecycle/test.json",
      },
      required_human_gates: [
        "exact-operator-approval",
        "governed-provider-credential-binding",
      ],
      schema_version: 1,
    },
    decision_ref: decisionRef,
    execution_id: request.workflow.execution_id,
    failure: null,
    next_action: "complete",
    operation: {
      attempt_count: 1,
      command: "archive-provider",
      completion_path: "provider",
      state: "verified",
    },
    provider_readback: {
      coordinates: {
        name: "governance-operations-console",
        owner: "mfshaf7",
      },
      integrity: integrity(providerReadbackRef.digest),
      observed_at: "2026-08-30T10:00:02.000Z",
      provider_lifecycle_state: "archived",
      provider_version: "etag-after",
      readback_id: "repository-lifecycle-provider-readback:test-001",
      repository_identity: request.repository_identity,
    },
    provider_readback_ref: providerReadbackRef,
    receipt,
    receipt_ref: receiptRef,
    replayed,
    request,
    retryable: false,
    schema_version: 1,
    status: "succeeded",
    workflow_id: "repository-lifecycle",
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

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}
