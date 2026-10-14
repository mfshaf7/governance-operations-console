import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { workspaceRegistryFixture } from "../../src/workspace-registry/fixtures/workspace-registry.fixture.ts";
import { assertWorkspaceContinuityProjection } from "../../src/workspace-continuity/workspace-continuity-contract.ts";
import { reconcileWorkspaceRegistryContinuity } from "../../src/workspace-continuity/workspace-registry-continuity.ts";
import { readWorkspaceContinuity } from "../../src/workspace-continuity/server/workspace-continuity-wgcf-client.ts";
import {
  productContinuitySummary,
  selectProductContinuityRecords,
} from "../../src/domain-workspaces/portfolio/presentation/surfaces/products/product-continuity-view-model.ts";

const config = {
  baseUrl: "http://127.0.0.1:8081",
  callerId: "governance-operations-console",
  callerSecret: "server-only-wgcf-secret",
};

test("case:1295-positive operates one canonical identity across Registry and Portfolio list/detail", async () => {
  const projection = continuityProjection();
  const calls = [];
  const fetched = await readWorkspaceContinuity({
    config,
    fetchImpl: async (url, init) => {
      calls.push({ init, url: String(url) });
      return json(projection);
    },
  });
  const registry = reconcileWorkspaceRegistryContinuity(
    fetched,
    registrySnapshot(),
  );
  const products = selectProductContinuityRecords(fetched.products, {
    maturity: "all",
    posture: "all",
    query: "governance-operations-console",
  });

  assert.equal(registry.records.find((item) => item.kind === "product")?.id, products[0].product_id);
  assert.equal(registry.records.find((item) => item.kind === "product")?.version, products[0].record_version);
  assert.equal(registry.records.find((item) => item.kind === "product")?.record_digest, products[0].record_digest);
  assert.equal(registry.records.find((item) => item.kind === "product")?.posture, products[0].posture);
  assert.deepEqual(productContinuitySummary(products), {
    active: 1,
    managed: 1,
    readinessAttention: 1,
    retired: 0,
    suspended: 0,
  });
  assert.equal(calls[0].url, `${config.baseUrl}/v1/projections/workspace-continuity`);
  assert.equal(calls[0].init.headers["x-wgcf-caller-id"], config.callerId);
  assert.equal(calls[0].init.headers["x-wgcf-caller-secret"], config.callerSecret);
  assert.doesNotMatch(JSON.stringify(fetched), /server-only-wgcf-secret/);
});

test("case:1295-negative rejects invented, duplicated, or silently repaired lifecycle state", () => {
  const duplicate = continuityProjection();
  duplicate.products.push(structuredClone(duplicate.products[0]));
  assert.throws(
    () => assertWorkspaceContinuityProjection(duplicate),
    /product identity is duplicated/i,
  );

  const contradictory = continuityProjection();
  contradictory.products[0].record_version += 1;
  assert.throws(
    () => assertWorkspaceContinuityProjection(contradictory),
    /contradicts canonical inventory/i,
  );

  const staleActionable = continuityProjection();
  staleActionable.products[0].publication_readiness = {
    ...staleActionable.products[0].publication_readiness,
    actionable: true,
    control_state: "stale",
    stale_reasons: ["expired"],
  };
  assert.throws(
    () => assertWorkspaceContinuityProjection(staleActionable),
    /contradicts actionability/i,
  );

  const oosDrift = registrySnapshot();
  oosDrift.records[1].version += 1;
  assert.throws(
    () => reconcileWorkspaceRegistryContinuity(
      assertWorkspaceContinuityProjection(continuityProjection()),
      oosDrift,
    ),
    /contradicts WGCF continuity/i,
  );
});

test("case:1295-negative rejects a tampered WGCF projection digest", async () => {
  const projection = continuityProjection();
  projection.products[0].name = "silently-repaired-name";
  await assert.rejects(
    readWorkspaceContinuity({
      config,
      fetchImpl: async () => json(projection),
    }),
    /projection digest is invalid/i,
  );
});

test("case:1295-negative keeps WGCF credentials and canonical source access out of the browser", () => {
  const browser = source(
    "../../src/workspace-continuity/live-runtime/use-workspace-continuity-runtime.ts",
  );
  const portfolio = source(
    "../../src/domain-workspaces/portfolio/presentation/surfaces/products/product-portfolio-continuity-surface.tsx",
  );
  const server = source(
    "../../src/workspace-continuity/server/workspace-continuity-wgcf-client.ts",
  );

  assert.doesNotMatch(browser, /WGCF_CALLER_SECRET|x-wgcf-caller-secret|contracts\/products\.yaml/i);
  assert.doesNotMatch(portfolio, /WGCF_CALLER_SECRET|x-wgcf-caller-secret|api\.github\.com/i);
  assert.match(server, /resolveConsoleWgcfConnection/);
  assert.match(server, /x-wgcf-caller-secret/);
});

test("case:1295-negative cannot open the fixture product dashboard in canonical mode", () => {
  const controller = source(
    "../../src/domain-workspaces/portfolio/presentation/workspace/use-product-portfolio-workspace-controller.ts",
  );
  const workspace = source(
    "../../src/domain-workspaces/portfolio/presentation/workspace/workspace.tsx",
  );

  assert.match(controller, /const dashboardEntrySource = productFixtureMode/);
  assert.match(controller, /if \(!productFixtureMode\) \{/);
  assert.match(controller, /setFocusedContinuityProductId\(product\.product_id\)/);
  assert.match(workspace, /controller\.productContinuity\.fixtureMode \? \(/);
  assert.match(workspace, /focusProductId=\{controller\.focusedContinuityProductId\}/);
});

function continuityProjection() {
  const inventory = workspaceRegistryFixture.records.map((item) => ({
    kind: item.kind,
    last_mutation: {
      ...item.last_mutation,
      idempotency_key: `fixture:${item.id}`,
      readiness_digest: null,
      request_digest: null,
    },
    lifecycle: item.maturity ?? "active",
    lineage: structuredClone(item.lineage),
    name: item.name,
    posture: item.posture,
    record_digest: item.record_digest,
    record_id: item.id,
    record_version: item.version,
    retired_collection: false,
  }));
  const productRecord = workspaceRegistryFixture.records.find(
    (item) => item.id === "product:governance-operations-console",
  );
  const projection = {
    artifact_type: "workspace-continuity-projection",
    authority: {
      file_digests: {
        "contracts/products.yaml": digest("a"),
      },
      owner_repo: "workspace-governance",
      revision: workspaceRegistryFixture.authority_revision,
    },
    authority_boundary: {
      canonical_registry: "workspace-governance",
      mutation_authority: "none",
      readiness_projection: "workspace-governance-control-fabric",
      terminal_publication_authority: "operator-orchestration-service",
      workflow_authority: "operator-orchestration-service",
    },
    intake: workspaceRegistryFixture.eligible_promotions.map((item) => ({
      decision: { id: "workspace-intake-decision:component:temporal:v2" },
      decision_source: "operator",
      kind: item.target.kind,
      last_mutation: { id: "workspace-intake:component:temporal:v2" },
      name: item.target.name,
      owner_route: "platform-engineering",
      record_digest: item.intake_entry_ref.digest,
      record_id: item.target.record_id,
      record_version: item.intake_entry_ref.version,
      source: { class: "direct" },
      status: "admitted",
    })),
    inventory,
    products: [
      {
        governed_prod_promotion: false,
        highest_real_endpoint: "owner-repository-local-preview",
        latest_lifecycle_event: null,
        lifecycle: "owner-managed",
        lineage: structuredClone(productRecord.lineage),
        maturity: "owner-managed",
        name: productRecord.name,
        owners: {
          platform: "platform-engineering",
          runtime: "governance-operations-console",
          security: "security-architecture",
          source: ["governance-operations-console"],
        },
        posture: productRecord.posture,
        product_id: productRecord.id,
        publication_readiness: {
          action: null,
          actionable: false,
          authority_revision: null,
          control_state: "unavailable",
          current_publication_posture: null,
          expires_at: null,
          outcome: null,
          product_id: productRecord.id,
          readiness_ref: null,
          stale_reasons: ["no-readiness-evidence"],
          target_publication: null,
        },
        record_digest: productRecord.record_digest,
        record_version: productRecord.version,
        stage_supported: false,
      },
    ],
    projection_state: "current",
    schema_version: 1,
  };
  const projectionDigest = `sha256:${createHash("sha256").update(canonicalStringify(projection)).digest("hex")}`;
  return {
    ...projection,
    projection_digest: projectionDigest,
    projection_id: `workspace-continuity-projection:${projectionDigest.slice(7)}`,
  };
}

function registrySnapshot() {
  const snapshot = structuredClone(workspaceRegistryFixture);
  snapshot.records.find(
    (item) => item.id === "product:governance-operations-console",
  ).owner_refs = [
    "platform-engineering",
    "security-architecture",
    "governance-operations-console",
  ];
  return snapshot;
}

function digest(character) {
  return `sha256:${character.repeat(64)}`;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function canonicalStringify(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(
    ([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`,
  ).join(",")}}`;
}
