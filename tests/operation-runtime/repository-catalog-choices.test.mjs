import assert from "node:assert/strict";
import test from "node:test";
import { repositoryCatalogRegistrySnapshot as snapshot } from "../support/repository-catalog-fixture.mjs";
import { promotionPreparation } from "../support/instance-inventory-fixture.mjs";
import { readRepositoryCatalogChoices, repositoryCurrentCatalogOption, repositoryRegistryCatalogOptions } from "../../src/workspace-registry/repository-catalog-choices.ts";


test("Delivery choices use actual active native and legacy registration, with explicit partial search results", async () => {
  const current = await snapshot({ more: true });
  const calls = [];
  const result = await readRepositoryCatalogChoices("", { fetchImpl: async (url, init) => { calls.push({ url, init }); return Response.json(current); } });
  const name = promotionPreparation().target.name;
  assert.ok(result.options.some(option => option.valueKey === name && option.id === `repo:${name}` && option.routeSource === "Internal registration"));
  assert.ok(result.options.some(option => option.routeSource === "Workspace Inventory"));
  assert.equal(result.more, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /scope=inventory/);
  assert.equal(calls[0].init.cache, "no-store");
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  const suspended = await snapshot({ posture: "suspended" });
  assert.ok(!repositoryRegistryCatalogOptions(suspended).some(option => option.valueKey === name));
});

test("Delivery choices reject failed, oversized or substituted searches instead of using example records", async () => {
  const current = await snapshot();
  for (const response of [new Response("offline", { status: 503 }), new Response("x".repeat(2_097_153)), Response.json(current)]) {
    await assert.rejects(readRepositoryCatalogChoices("another-name", { fetchImpl: async () => response }));
  }
  const controller = new AbortController(); controller.abort();
  await assert.rejects(readRepositoryCatalogChoices("", { signal: controller.signal, fetchImpl: async (_url, init) => { init.signal.throwIfAborted(); return Response.json(current); } }));
});

test("Delivery linking resolves selected native registration independently of the visible search page and blocks suspended or conflicting truth", async () => {
  const current = await snapshot(), name = promotionPreparation().target.name;
  const lookup = { mode: "current", instanceId: current.instance_page.authority.instance_id, recordIds: [`repo:${name}`], records: [{ record_id: `repo:${name}`, phase: "inventory", status: "active" }] };
  const selected = repositoryCurrentCatalogOption(current, name, lookup);
  assert.equal(selected.valueKey, name);
  for (const status of ["suspended", "retired", "admitted"]) {
    const changed = structuredClone(lookup); changed.records[0].status = status;
    assert.equal(repositoryCurrentCatalogOption(current, name, changed), null);
  }
  assert.equal(repositoryCurrentCatalogOption(current, name, { ...lookup, instanceId: "foreign" }), null);
  assert.equal(repositoryCurrentCatalogOption(current, name, { mode: "not-configured" }), null);
  assert.equal(repositoryCurrentCatalogOption(current, name, null), null);
  const conflict = structuredClone(current); conflict.legacy_snapshot.records.push({ ...current.instance_page.records[0], authority_kind: undefined });
  assert.equal(repositoryCurrentCatalogOption(conflict, name, lookup), null);
});
