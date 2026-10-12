import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readProductHealthProjection } from "../../src/domain-workspaces/portfolio/server/product-health-platform-adapter.ts";
import { resolveProductMaintenanceStep } from "../../src/domain-workspaces/portfolio/live-runtime/product-maintenance-sequence.ts";
import {
  consoleProductMaintenanceModeSelected,
  resolveConsoleProductMaintenanceConfiguration,
} from "../../src/console-integration/configuration/console-runtime-configuration.ts";

const now = new Date("2026-10-12T08:00:00.000Z");

test("case:1270-positive reads exact private Platform health evidence without granting owner authority", async (context) => {
  const fixture = await evidenceFixture(context);
  const result = await readProductHealthProjection({ config: fixture.config, now });

  assert.equal(result.projection.source.authority, "platform-engineering");
  assert.equal(result.projection.products[0].availability.state, "available");
  assert.equal(result.projection.grants.lifecycle_mutation, false);
  assert.equal(result.projection.grants.runtime_mutation, false);
  assert.equal(result.projectionDigest, digest(fixture.projection));
});

test("case:1270-negative rejects partial activation, public files, tampering, and stale receipt truth", async (context) => {
  assert.equal(consoleProductMaintenanceModeSelected({ GOVERNANCE_CONSOLE_PRODUCT_HEALTH_PROJECTION_PATH: "/tmp/value" }), true);
  assert.throws(
    () => resolveConsoleProductMaintenanceConfiguration({ GOVERNANCE_CONSOLE_PRODUCT_HEALTH_PROJECTION_PATH: "/tmp/value" }),
    /requires its OOS endpoint|reference|revision/i,
  );

  const publicFixture = await evidenceFixture(context);
  await chmod(publicFixture.config.healthProjectionPath, 0o644);
  await assert.rejects(
    readProductHealthProjection({ config: publicFixture.config, now }),
    /not operator-private/i,
  );

  const tampered = await evidenceFixture(context);
  tampered.receipt.projection_digest = `sha256:${"0".repeat(64)}`;
  await privateJson(tampered.config.healthReceiptPath, tampered.receipt);
  await assert.rejects(
    readProductHealthProjection({ config: tampered.config, now }),
    /does not bind the exact projection/i,
  );

  const stale = await evidenceFixture(context);
  stale.receipt.freshness = "current";
  await privateJson(stale.config.healthReceiptPath, stale.receipt);
  await assert.rejects(
    readProductHealthProjection({ config: stale.config, now: new Date("2026-10-12T09:00:00.000Z") }),
    /does not bind the exact projection/i,
  );
});

test("case:1270-sequence routes every lifecycle prerequisite through its existing owner surface", () => {
  assert.deepEqual(step("active", "internal"), ["unpublish", "product-publication"]);
  assert.deepEqual(step("active", "unlisted"), ["retire-inventory", "workspace-registry"]);
  assert.deepEqual(step("retired", "unlisted"), ["archive-publication", "product-publication"]);
  assert.deepEqual(step("retired", "archived"), ["restore-inventory", "workspace-registry"]);
  assert.deepEqual(step("active", "archived"), ["restore-publication", "product-publication"]);
  assert.deepEqual(step("retired", "internal"), ["blocked-contradiction", null]);
});

test("case:1270-regression maintenance projection is read-only and cannot reuse a stale manifest", async () => {
  const route = await readFile(new URL(
    "../../src/app/api/product-portfolio/maintenance/[requestId]/route.ts",
    import.meta.url,
  ), "utf8");
  const service = await readFile(new URL(
    "../../src/domain-workspaces/portfolio/server/product-maintenance-service.ts",
    import.meta.url,
  ), "utf8");

  assert.doesNotMatch(route, /export async function POST/);
  assert.doesNotMatch(service, /submitGovernedProductPublication|manifest_source|structuredClone/);
  assert.match(service, /readWorkspaceRegistry/);
});

async function evidenceFixture(context) {
  const directory = await mkdtemp(join(tmpdir(), "console-product-health-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const projectionPath = join(directory, "projection.json");
  const receiptPath = join(directory, "receipt.json");
  const projection = {
    schemaVersion: "portfolio-product-runtime-health/v1",
    environment: { lane: "dev-integration", profile: "governance-operations-console" },
    source: {
      authority: "platform-engineering",
      observedAt: "2026-10-12T07:55:00.000Z",
      validUntil: "2026-10-12T08:05:00.000Z",
      reference: "",
      runtimeObservationRef: `platform-runtime-observation://${"1".repeat(64)}`,
      runtimeObservationDigest: `sha256:${"2".repeat(64)}`,
      inventoryAuthority: {
        repo: "workspace-governance",
        revision: "3".repeat(40),
        path: "contracts/products.yaml",
        digest: `sha256:${"4".repeat(64)}`,
      },
    },
    products: [{
      productId: "product:governance-operations-console",
      productRecordRef: "workspace-governance://products/governance-operations-console/v1",
      productRecordVersion: 1,
      platformOwner: "platform-engineering",
      runtimeOwner: "governance-operations-console",
      availability: { state: "available", reasonCode: null },
      freshness: "current",
      observedAt: "2026-10-12T07:55:00.000Z",
      evidence: [{
        componentId: "governance-operations-console",
        sourceRef: "kubernetes://dev-integration/governance-operations-console",
        state: "available",
      }],
      issues: { state: "clear", codes: [] },
      recovery: { owner: "platform-engineering", runbookRef: "runbooks/product-runtime-observations.md" },
    }],
    grants: {
      runtime_mutation: false,
      release_authority: false,
      lifecycle_mutation: false,
      publication_authority: false,
      security_acceptance: false,
    },
  };
  projection.source.reference = `platform-product-health://${hash({
    ...projection,
    source: Object.fromEntries(Object.entries(projection.source).filter(([key]) => key !== "reference")),
  })}`;
  const receipt = {
    schema_version: 1,
    action: "project-product-health",
    projection_reference: projection.source.reference,
    projection_digest: digest(projection),
    policy_digest: `sha256:${"5".repeat(64)}`,
    freshness: "current",
    observed_at: projection.source.observedAt,
    valid_until: projection.source.validUntil,
    product_count: 1,
    counts: { available: 1, degraded: 0, unavailable: 0, unknown: 0 },
    secret_values_embedded: false,
  };
  await privateJson(projectionPath, projection);
  await privateJson(receiptPath, receipt);
  return {
    config: {
      authorityRevision: "6".repeat(40),
      baseUrl: "http://127.0.0.1:1",
      callerId: "governance-operations-console",
      callerSecret: "test-only",
      healthProjectionPath: projectionPath,
      healthReceiptPath: receiptPath,
      operatorId: "operator:mfshaf7",
      securityDecision: {
        digest: `sha256:${"7".repeat(64)}`,
        revision: "8".repeat(40),
        uri: "security-architecture://product-publication/decisions/maintenance-v1",
      },
    },
    projection,
    receipt,
  };
}

async function privateJson(path, value) {
  await writeFile(path, `${canonical(value)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
}
function digest(value) { return `sha256:${hash(value)}`; }
function hash(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
function canonical(value) {
  if (value === null || ["boolean", "number", "string"].includes(typeof value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function step(lifecycle, publication) {
  const result = resolveProductMaintenanceStep({
    inventory_lifecycle: { posture: lifecycle },
    maintenance: { publication: { posture: publication } },
  });
  return [result.id, result.surface];
}
