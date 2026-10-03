import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { submitDeliveryChangeCommand } from "../../src/domain-workspaces/delivery/server/delivery-change-oos-client.ts";
import { DeliveryOosError } from "../../src/domain-workspaces/delivery/server/delivery-oos-client.ts";
import {
  assertCanonicalSourceRequest,
  canonicalSourceResponse,
} from "../support/console-source-projection.mjs";

const env = {
  GOVERNANCE_CONSOLE_OPERATOR_ID: "operator:console-owner",
  OOS_BASE_URL: "http://127.0.0.1:8080",
  OOS_CALLER_ID: "governance-operations-console",
  OOS_CALLER_SECRET: "test-only-console-secret",
};
const commandId = "delivery-change-command:console-link-repo-1229";

test("case:repository-catalog-console-protocol-positive binds readiness, Catalog, and Delivery receipts to one command", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ body: init.body ? JSON.parse(String(init.body)) : null, url: String(url) });
    if (init.method === "GET") {
      assertCanonicalSourceRequest(init);
      return canonicalSourceResponse(catalogProjection(), {
        recordRef: "openproject://projects/workspace-delivery-art",
        sourceOwner: "workspace-delivery-art",
      });
    }
    const request = calls.at(-1).body;
    return jsonResponse(deliveryChangeResult(request), 201);
  };

  const result = await submitDeliveryChangeCommand(
    "delivery-1203",
    {
      acceptedAt: "2026-10-03T17:30:00.000Z",
      acceptanceNote: "Use the reviewed admitted repository as this work item's owner.",
      commandId,
      expectedSourceRevision: deliveryRevision("a"),
      operation: repositoryLinkOperation(catalogMutationCommand()),
    },
    { env, fetchImpl },
  );

  assert.equal(result.status, "applied");
  assert.equal(calls.length, 2);
  const submitted = calls[1].body;
  assert.equal(submitted.operation.payload.catalog_request.correlation_id, commandId);
  assert.equal(
    submitted.operation.payload.catalog_request.operator.id,
    "operator:console-owner",
  );
  assert.equal(
    submitted.operation.payload.catalog_request.acceptance.accepted_by,
    "operator:console-owner",
  );
  assert.equal(
    submitted.operation.payload.catalog_request.draft.repository_binding.receipt.uri,
    readiness().receipt.uri,
  );
  assert.equal(submitted.operation.payload.owner_repo, "operator-orchestration-service");
  assert.equal(submitted.operation.payload.work_item_id, "work-item-1229");
});

test("case:repository-catalog-console-protocol-negative rejects missing or mismatched readiness before Delivery mutation", async () => {
  for (const catalogCommand of [
    { ...catalogMutationCommand(), repositoryReadiness: null },
    {
      ...catalogMutationCommand(),
      repositoryReadiness: {
        ...readiness(),
        repo_name: "different-repository",
      },
    },
  ]) {
    let writes = 0;
    await assert.rejects(
      submitDeliveryChangeCommand(
        "delivery-1203",
        {
          acceptedAt: "2026-10-03T17:30:00.000Z",
          acceptanceNote: "Attempt an invalid repository link.",
          commandId,
          expectedSourceRevision: deliveryRevision("a"),
          operation: repositoryLinkOperation(catalogCommand),
        },
        {
          env,
          fetchImpl: async (_url, init) => {
            if (init.method !== "GET") writes += 1;
            return canonicalSourceResponse(catalogProjection(), {
              recordRef: "openproject://projects/workspace-delivery-art",
              sourceOwner: "workspace-delivery-art",
            });
          },
        },
      ),
      (error) =>
        error instanceof DeliveryOosError &&
        [
          "catalog_repository_readiness_required",
          "catalog_repository_readiness_mismatch",
        ].includes(error.code),
    );
    assert.equal(writes, 0);
  }
});

test("Repository Catalog browser bridge carries no backend credential or provider authority", () => {
  for (const relativePath of [
    "../../src/domain-workspaces/delivery/presentation/surfaces/catalog/use-catalog-control-state.ts",
    "../../src/domain-workspaces/delivery/presentation/surfaces/catalog/catalog-repository-link-dialog.tsx",
  ]) {
    const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.doesNotMatch(source, /OOS_CALLER_SECRET/);
    assert.doesNotMatch(source, /x-oos-caller-secret/i);
    assert.doesNotMatch(source, /\/v1\/delivery-initiatives/);
    assert.doesNotMatch(source, /github.*(?:POST|PATCH|PUT|DELETE)/is);
  }
});

function repositoryLinkOperation(catalogRequest) {
  return {
    payload: {
      catalog_item_id: "catalog-owner-repo",
      catalog_request: catalogRequest,
      owner_repo: "operator-orchestration-service",
      work_item_id: "work-item-1229",
    },
    type: "link_repository",
  };
}

function catalogMutationCommand() {
  return {
    acceptanceId: "catalog-acceptance:repository-link-1229",
    acceptedAt: "2026-10-03T17:30:00.000Z",
    draft: {
      description: "Shared workflow authority.",
      label: "operator-orchestration-service",
      linkedRepository: {
        admissionState: "admitted",
        description: "Shared workflow authority.",
        id: "repo-operator-orchestration-service",
        label: "operator-orchestration-service",
        owner: "OOS",
        repoRef: "git@github.com:mfshaf7/operator-orchestration-service.git",
        routeSource: "repository-operation",
        valueKey: "operator-orchestration-service",
      },
      parentCatalogValueKey: null,
      valueKey: "operator-orchestration-service",
    },
    mode: "edit",
    repositoryReadiness: readiness(),
    targetValueId: "catalog-value-owner-repo-oos",
  };
}

function readiness() {
  const digest = "c".repeat(64);
  return {
    catalog_value_key: "operator-orchestration-service",
    receipt: {
      digest: `sha256:${digest}`,
      evaluated_at: "2026-10-03T17:29:00.000Z",
      generation: 4,
      issuer: "workspace-governance-control-fabric",
      outcome: "ready",
      receipt_id: "repository-readiness-receipt:1234567890abcdef12345678",
      target_scope: "repo:operator-orchestration-service",
      uri: `wgcf://receipts/repository-readiness/repository-readiness-receipt-1234567890abcdef12345678-${digest}.json`,
    },
    repo_name: "operator-orchestration-service",
    repo_ref: "repo://operator-orchestration-service",
  };
}

function catalogProjection() {
  return {
    groups: [{
      description: "Repository ownership metadata.",
      expected_route: "/v1/delivery-catalog/catalog-owner-repo/mutations",
      group_id: "organization",
      item_ids: ["catalog-owner-repo"],
      route_status: "implemented",
      source_authority: "OpenProject",
      title: "Organization",
    }],
    items: [{
      backend_route: "/v1/delivery-catalog/catalog-owner-repo/mutations",
      catalog_item_id: "catalog-owner-repo",
      console_capability: "request",
      create_authority: "OOS Catalog runtime",
      description: "Link an admitted owner repository.",
      evidence_refs: ["oos://catalog/projection"],
      gap_status: "console_requestable",
      group_id: "organization",
      label: "Owner Repo",
      last_projected_at: "2026-10-03T17:29:00.000Z",
      lifecycle_state: "active",
      next_action_detail: "Review and apply a repository link.",
      next_action_label: "Request Value",
      owner_route: "operator-orchestration-service",
      source_authority: "OpenProject",
      usage_count: 1,
      usage_summary: "Used by one Delivery package.",
      value_key: "owner_repo",
    }],
    projected_at: "2026-10-03T17:29:00.000Z",
    projection_status: "ready",
    schema_version: 1,
    source_revision: "catalog-version-9",
    summary: {
      drift_count: 0,
      missing_route_count: 0,
      owner_routed_count: 0,
      requestable_count: 1,
      total_items: 1,
    },
    values: [],
  };
}

function deliveryChangeResult(request) {
  return {
    after: {
      record_ref: "openproject://work_packages/1203",
      source_revision: deliveryRevision("b"),
    },
    before: {
      record_ref: "openproject://work_packages/1203",
      source_revision: deliveryRevision("a"),
    },
    command_id: request.command_id,
    event: {
      command_digest: `sha256:${"d".repeat(64)}`,
      command_id: request.command_id,
      delivery_id: "delivery-1203",
      effect: {
        catalog: {
          receipt: { ref: "oos://catalog-receipts/1229" },
        },
      },
      event_id: `delivery-change-event:${request.command_id}:result`,
      next_action: { authority: "operator-orchestration-service", code: "continue", label: "Continue" },
      occurred_at: "2026-10-03T17:31:00.000Z",
      operation_type: "link_repository",
      operator_id: "operator:console-owner",
      receipt: { digest: `sha256:${"e".repeat(64)}`, ref: "oos://delivery-change-receipts/1229" },
      rollback: { mode: "compensating_command_required", reason: "Explicit reversal required." },
      schema_version: 1,
      source_revision_after: deliveryRevision("b"),
      source_revision_before: deliveryRevision("a"),
      status: "applied",
    },
    next_action: { authority: "operator-orchestration-service", code: "continue", label: "Continue" },
    receipt: { digest: `sha256:${"e".repeat(64)}`, ref: "oos://delivery-change-receipts/1229" },
    replayed: false,
    schema_version: 1,
    status: "applied",
  };
}

function deliveryRevision(character) {
  return `delivery-package:sha256:${character.repeat(64)}`;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
