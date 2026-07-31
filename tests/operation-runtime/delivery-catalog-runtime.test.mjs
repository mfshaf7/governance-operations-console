import assert from "node:assert/strict";
import test from "node:test";

import {
  getDeliveryCatalogRuntimeCapabilities,
  listDeliveryCatalogRuntimeReceipts,
  submitCatalogMutationCommand,
} from "../../src/domain-workspaces/delivery/local-runtime/commands/catalog-mutation-runtime.ts";

test("delivery catalog runtime declares submit capability", () => {
  assert.equal(getDeliveryCatalogRuntimeCapabilities().canSubmit, true);
});

const activeCatalog = {
  backend_route: "workspace-governance/catalog/test-values",
  catalog_item_id: "catalog-runtime-test",
  console_capability: "create",
  create_authority: "workspace-governance",
  description: "Runtime test catalog.",
  evidence_refs: [],
  gap_status: "backend_created",
  group_id: "metadata",
  label: "Runtime Test Values",
  last_projected_at: null,
  lifecycle_state: "admitted",
  next_action_detail: "Prepare a prototype-local value.",
  next_action_label: "Add value",
  owner_route: "workspace-governance",
  source_authority: "workspace-governance",
  tone: "ok",
  usage_count: 0,
  usage_summary: "No current usage.",
  value_key: "runtime-test-values",
};

const mutationDraft = {
  mode: "add",
  valueId: null,
};

const draft = {
  description: "A value used to prove persistent Catalog command identity.",
  label: "Runtime Value",
  valueKey: "runtime-value",
};

test("delivery catalog mutation retries reuse one result and receipt", async () => {
  const first = await submitCatalogMutationCommand({
    activeCatalog,
    catalogValues: [],
    draft,
    mutationDraft,
    submittedAt: "2026-07-10T10:00:00.000Z",
  });
  const repeated = await submitCatalogMutationCommand({
    activeCatalog,
    catalogValues: [],
    draft,
    mutationDraft,
    submittedAt: "2026-07-10T10:05:00.000Z",
  });
  const receipts = await listDeliveryCatalogRuntimeReceipts(
    activeCatalog.catalog_item_id,
  );

  assert.ok(first);
  assert.ok(repeated);
  assert.equal(first.selectedValueId, repeated.selectedValueId);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].receipt.valueId, first.selectedValueId);
  assert.match(
    receipts[0].sourceVersions[0].version,
    /^local-projection-delivery-catalog-/,
  );
});

test("delivery catalog payload changes create distinct receipts", async () => {
  const changedCatalog = {
    ...activeCatalog,
    catalog_item_id: "catalog-runtime-test-payload-change",
  };
  await submitCatalogMutationCommand({
    activeCatalog: changedCatalog,
    catalogValues: [],
    draft,
    mutationDraft,
    submittedAt: "2026-07-10T10:55:00.000Z",
  });
  await submitCatalogMutationCommand({
    activeCatalog: changedCatalog,
    catalogValues: [],
    draft: { ...draft, label: "Second Runtime Value", valueKey: "runtime-value-2" },
    mutationDraft,
    submittedAt: "2026-07-10T11:00:00.000Z",
  });
  const receipts = await listDeliveryCatalogRuntimeReceipts(
    changedCatalog.catalog_item_id,
  );

  assert.equal(receipts.length, 2);
  assert.notEqual(receipts[0].receiptId, receipts[1].receiptId);
});
