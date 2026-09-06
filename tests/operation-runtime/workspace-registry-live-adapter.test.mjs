import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  workspaceInventoryLifecyclePreparationFixture,
  workspaceRegistryFixture,
} from "../../src/workspace-registry/fixtures/workspace-registry.fixture.ts";
import {
  prepareWorkspaceInventoryLifecycle,
  prepareWorkspaceInventoryPromotion,
  readWorkspaceRegistry,
  submitWorkspaceInventoryLifecycle,
  submitWorkspaceInventoryPromotion,
  WorkspaceRegistryOosError,
} from "../../src/workspace-registry/server/workspace-registry-oos-client.ts";

const digest = (character) => `sha256:${character.repeat(64)}`;
const config = {
  baseUrl: "http://127.0.0.1:8080",
  callerId: "governance-operations-console",
  callerSecret: "server-only-secret",
};

test("case:workspace-registry reads canonical records and submits a digest-bound OOS promotion", async () => {
  const calls = [];
  let submitted;
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).endsWith("/registry")) return json(workspaceRegistryFixture);
    if (String(url).endsWith("/preparations")) return json(preparation());
    submitted = JSON.parse(String(init.body));
    return json(result(submitted), 202);
  };
  const options = {
    config,
    fetchImpl,
    now: () => new Date("2026-09-06T13:00:00.000Z"),
  };
  const candidate = workspaceRegistryFixture.eligible_promotions[0];
  const snapshot = await readWorkspaceRegistry(options);
  const prepared = await prepareWorkspaceInventoryPromotion(candidate.target, options);
  const projected = await submitWorkspaceInventoryPromotion(
    intent(candidate, prepared, snapshot),
    options,
  );

  assert.equal(snapshot.canonical_mutation, false);
  assert.equal(projected.status, "accepted");
  assert.equal(submitted.request.target.record_id, candidate.target.record_id);
  assert.equal(submitted.request.operator_ref, config.callerId);
  assert.match(submitted.request.request_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(calls.at(-1).init.headers["x-oos-caller-secret"], config.callerSecret);
  assert.doesNotMatch(JSON.stringify(submitted), /server-only-secret/);
});

test("case:workspace-registry rejects stale review before preparing or submitting", async () => {
  let writeCalls = 0;
  const candidate = workspaceRegistryFixture.eligible_promotions[0];
  const reviewed = workspaceRegistryFixture;
  const stale = {
    ...workspaceRegistryFixture,
    authority_revision: "8".repeat(40),
    projection_digest: digest("8"),
  };
  await assert.rejects(
    submitWorkspaceInventoryPromotion(
      intent(candidate, preparation(), reviewed),
      {
        config,
        fetchImpl: async (url) => {
          if (!String(url).endsWith("/registry")) writeCalls += 1;
          return json(stale);
        },
      },
    ),
    (error) =>
      error instanceof WorkspaceRegistryOosError &&
      error.code === "workspace_registry_review_stale" &&
      error.status === 409,
  );
  assert.equal(writeCalls, 0);
});

test("case:workspace-registry fails closed on malformed registry and incomplete success evidence", async () => {
  await assert.rejects(
    readWorkspaceRegistry({
      config,
      fetchImpl: async () => json({ records: [] }),
    }),
    (error) =>
      error instanceof WorkspaceRegistryOosError &&
      error.code === "workspace_registry_projection_invalid",
  );

  const candidate = workspaceRegistryFixture.eligible_promotions[0];
  await assert.rejects(
    submitWorkspaceInventoryPromotion(
      intent(candidate, preparation(), workspaceRegistryFixture),
      {
        config,
        fetchImpl: async (url, init) => {
          if (String(url).endsWith("/registry")) return json(workspaceRegistryFixture);
          if (String(url).endsWith("/preparations")) return json(preparation());
          const submitted = JSON.parse(String(init.body));
          return json({
            ...result(submitted),
            canonical_mutation: true,
            next_action: "complete",
            status: "succeeded",
          });
        },
      },
    ),
    /merged readback and receipt evidence/i,
  );
});

test("case:workspace-registry browser runtime contains no authority credentials or direct Git access", () => {
  const browser = source(
    "../../src/workspace-registry/live-runtime/use-workspace-registry-live-runtime.ts",
  );
  const server = source(
    "../../src/workspace-registry/server/workspace-registry-oos-client.ts",
  );
  const workspace = source(
    "../../src/workspace-registry/presentation/workspace-registry-workspace.tsx",
  );

  assert.doesNotMatch(browser, /OOS_CALLER_SECRET|x-oos-caller-secret|api\.github\.com/i);
  assert.doesNotMatch(workspace, /api\.github\.com|contracts\/(repos|products|components)\.yaml/i);
  assert.match(server, /OOS_CALLER_SECRET/);
  assert.match(server, /sameWorkspaceInventoryPreparation/);
  assert.match(server, /sameWorkspaceInventoryLifecyclePreparation/);
  assert.match(workspace, /consoleDevMode \? workspaceRegistryFixture : runtime\.snapshot/);
});

test("case:console-adapters-positive submits a caller-bound Workspace Registry lifecycle action", async () => {
  const calls = [];
  let submitted;
  const record = workspaceRegistryFixture.records[0];
  const preparedFixture = workspaceInventoryLifecyclePreparationFixture(record);
  const fetchImpl = async (url, init) => {
    calls.push({ init, url: String(url) });
    if (String(url).endsWith("/registry")) return json(workspaceRegistryFixture);
    if (String(url).endsWith("/lifecycle/preparations")) return json(preparedFixture);
    submitted = JSON.parse(String(init.body));
    return json(lifecycleResult(submitted), 202);
  };
  const options = {
    config,
    fetchImpl,
    now: () => new Date("2026-09-07T03:00:00.000Z"),
  };

  const prepared = await prepareWorkspaceInventoryLifecycle(
    { kind: record.kind, name: record.name, record_id: record.id },
    options,
  );
  const projected = await submitWorkspaceInventoryLifecycle(
    lifecycleIntent(prepared, workspaceRegistryFixture),
    options,
  );

  assert.equal(projected.workflow_id, "workspace-inventory-lifecycle");
  assert.equal(submitted.request.action, "suspend");
  assert.equal(submitted.request.operator_ref, config.callerId);
  assert.equal(submitted.request.requested_value, null);
  assert.deepEqual(submitted.request.prior_event_ref, null);
  assert.match(submitted.request.request_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(calls.at(-1).init.headers["x-oos-caller-secret"], config.callerSecret);
  assert.doesNotMatch(JSON.stringify(submitted), /server-only-secret/);
});

test("case:console-adapters-negative rejects stale Workspace Registry lifecycle state", async () => {
  let lifecycleCalls = 0;
  const record = workspaceRegistryFixture.records[0];
  const prepared = workspaceInventoryLifecyclePreparationFixture(record);
  const stale = {
    ...workspaceRegistryFixture,
    records: workspaceRegistryFixture.records.map((item) =>
      item.id === record.id ? { ...item, version: item.version + 1 } : item,
    ),
  };

  await assert.rejects(
    submitWorkspaceInventoryLifecycle(
      lifecycleIntent(prepared, workspaceRegistryFixture),
      {
        config,
        fetchImpl: async (url) => {
          if (String(url).includes("/lifecycle/")) lifecycleCalls += 1;
          return json(stale);
        },
      },
    ),
    (error) =>
      error instanceof WorkspaceRegistryOosError &&
      error.code === "workspace_inventory_lifecycle_review_stale" &&
      error.status === 409,
  );
  assert.equal(lifecycleCalls, 0);
});

test("case:console-adapters-negative rejects incomplete Workspace Registry lifecycle success", async () => {
  const record = workspaceRegistryFixture.records[0];
  const prepared = workspaceInventoryLifecyclePreparationFixture(record);
  await assert.rejects(
    submitWorkspaceInventoryLifecycle(
      lifecycleIntent(prepared, workspaceRegistryFixture),
      {
        config,
        fetchImpl: async (url, init) => {
          if (String(url).endsWith("/registry")) return json(workspaceRegistryFixture);
          if (String(url).endsWith("/lifecycle/preparations")) return json(prepared);
          const command = JSON.parse(String(init.body));
          return json({
            ...lifecycleResult(command),
            canonical_mutation: true,
            next_action: "complete",
            status: "succeeded",
          });
        },
      },
    ),
    /merged review, readback, receipt, and canonical state/i,
  );
});

function intent(candidate, reviewedPreparation, snapshot) {
  return {
    candidate,
    request_id: "workspace-inventory-request:console-test",
    reviewed_preparation: reviewedPreparation,
    reviewed_projection: {
      authority_revision: snapshot.authority_revision,
      projection_digest: snapshot.projection_digest,
    },
  };
}

function preparation() {
  const candidate = workspaceRegistryFixture.eligible_promotions[0];
  return {
    authority_revision: workspaceRegistryFixture.authority_revision,
    canonical_authority: {
      branch: "main",
      intake_path: "contracts/intake-register.yaml",
      inventory_path: "contracts/components.yaml",
      repo: "workspace-governance",
    },
    canonical_mutation: false,
    expected_state: {
      active_inventory_digest: digest("6"),
      active_record_digest: null,
      active_record_version: null,
      intake_entry_digest: candidate.intake_entry_ref.digest,
      intake_entry_version: candidate.intake_entry_ref.version,
      intake_register_digest: digest("7"),
    },
    intake_entry_ref: candidate.intake_entry_ref,
    schema_version: 1,
    target: candidate.target,
    workflow_id: "workspace-inventory-promotion",
  };
}

function lifecycleIntent(prepared, snapshot) {
  return {
    action: "suspend",
    approval_refs: ["openproject://work_packages/1080"],
    impact_acknowledgements: ["impact:references-reviewed"],
    reason: "Suspend this record while its downstream ownership is reviewed.",
    request_id: "workspace-inventory-lifecycle-request:console-test",
    requested_value: null,
    reviewed_preparation: prepared,
    reviewed_projection: {
      authority_revision: snapshot.authority_revision,
      projection_digest: snapshot.projection_digest,
    },
  };
}

function lifecycleResult(command) {
  return {
    canonical_mutation: false,
    execution_ref: command.execution_ref,
    failure: null,
    history: [
      {
        at: "2026-09-07T03:00:01.000Z",
        details: null,
        sequence: 1,
        status: "accepted",
      },
    ],
    merged_state: null,
    next_action: "continue",
    readback: null,
    readiness: null,
    receipt: null,
    request: command.request,
    request_id: command.request.request_id,
    revision: 1,
    review: null,
    schema_version: 1,
    session_ref: command.session_ref,
    status: "accepted",
    workflow_id: "workspace-inventory-lifecycle",
  };
}

function result(command) {
  return {
    canonical_mutation: false,
    failure: null,
    history: [
      {
        at: "2026-09-06T13:00:00.000Z",
        details: null,
        sequence: 1,
        status: "accepted",
      },
    ],
    next_action: "continue",
    readback: null,
    receipt: null,
    request: command.request,
    request_id: command.request.request_id,
    revision: 1,
    review: null,
    schema_version: 1,
    status: "accepted",
    workflow_id: "workspace-inventory-promotion",
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}
