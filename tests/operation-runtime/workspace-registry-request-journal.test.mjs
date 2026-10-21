import assert from "node:assert/strict";
import test from "node:test";
import { assertInventoryRequestJournal, inventoryJournalEndpoint } from "../../src/workspace-registry/workspace-registry-request-journal.ts";
import { assertWorkspaceInventoryRequestId, assertWorkspaceInventoryLifecycleRequestId } from "../../src/workspace-registry/workspace-registry-contract.ts";
import { readWorkspaceInventoryRequestJournal } from "../../src/workspace-registry/server/workspace-registry-oos-client.ts";
import { canonicalSourceResponse, assertCanonicalSourceRequest } from "../support/console-source-projection.mjs";

const target = { kind: "repo", name: "synthetic-owner", record_id: "repo:synthetic-owner" };
const at = "2026-10-21T00:00:00.000Z";
const config = { baseUrl: "http://127.0.0.1:8080", callerId: "synthetic-caller", callerSecret: "synthetic-secret" };
function page(family = "promotion") {
  return { schema_version: 1, workflow_id: `workspace-inventory-${family}`, target,
    revision: 9, pending_request_count: 1, updated_at: at, canonical_mutation: false,
    records: [{ request_id: "native-original:non-console/日本語?key=value", status: "review-required", revision: 3,
      requested_at: at, updated_at: at, ...(family === "lifecycle" ? { action: "suspend" } : {}) }], next_cursor: null };
}
for (const family of ["promotion", "lifecycle"]) {
  test(`${family} journal retains opaque native locators and off-page pending counters`, () => {
    const value = page(family);
    assert.deepEqual(assertInventoryRequestJournal(value, family, target), value);
    assert.deepEqual(assertInventoryRequestJournal({ ...value, records: [] }, family, target).records, []);
    const suffix = inventoryJournalEndpoint(family, target, "a".repeat(64));
    assert.match(suffix, /target_kind=repo&target_name=synthetic-owner&cursor=a{64}$/);
    assert.equal((family === "lifecycle" ? assertWorkspaceInventoryLifecycleRequestId : assertWorkspaceInventoryRequestId)(value.records[0].request_id), value.records[0].request_id);
  });
  test(`${family} rejects cross-target/family, duplicate/extra fields, unsafe locators and impossible metadata`, () => {
    const valid = page(family);
    for (const invalid of [
      { ...valid, target: { ...target, name: "other", record_id: "repo:other" } },
      { ...valid, workflow_id: family === "lifecycle" ? "workspace-inventory-promotion" : "workspace-inventory-lifecycle" },
      { ...valid, canonical_mutation: true }, { ...valid, raw: "no raw data" },
      { ...valid, records: [...valid.records, ...valid.records] },
      { ...valid, records: [{ ...valid.records[0], raw: {} }] },
      { ...valid, records: [{ ...valid.records[0], request_id: "" }] },
      { ...valid, records: [{ ...valid.records[0], request_id: "\ud800" }] },
      { ...valid, records: [{ ...valid.records[0], updated_at: "invalid" }] },
      { ...valid, records: [{ ...valid.records[0], revision: 0 }] },
      { ...valid, records: [{ ...valid.records[0], status: "invented" }] },
      { ...valid, revision: 0 }, { ...valid, pending_request_count: 0 },
      { ...valid, pending_request_count: 10 }, { ...valid, records: [], next_cursor: "a".repeat(64) },
      { ...valid, next_cursor: "forged" },
    ]) assert.throws(() => assertInventoryRequestJournal(invalid, family, target));
    assert.throws(() => inventoryJournalEndpoint(family, target, "bad cursor"));
  });
  test(`${family} GET requires the exact fresh OOS journal authority envelope and performs no writes`, async () => {
    const suffix = inventoryJournalEndpoint(family, target), recordRef = `oos://workspace-inventory/${suffix}`;
    const calls = [];
    const fetchImpl = async (url, init) => {
      assertCanonicalSourceRequest(init); assert.equal(init.method, "GET");
      calls.push(String(url));
      return canonicalSourceResponse(page(family), { recordRef, sourceOwner: "operator-orchestration-service" });
    };
    assert.deepEqual(await readWorkspaceInventoryRequestJournal(family, target, undefined, { config, fetchImpl }), page(family));
    assert.deepEqual(calls, [`${config.baseUrl}/v1/workspace-inventory/${suffix}`]);
    for (const response of [
      () => Response.json(page(family)),
      () => canonicalSourceResponse(page(family), { recordRef, sourceOwner: "workspace-governance" }),
      () => canonicalSourceResponse(page(family), { recordRef: `${recordRef}&cursor=${"b".repeat(64)}`, sourceOwner: "operator-orchestration-service" }),
      () => canonicalSourceResponse(page(family), { recordRef, sourceOwner: "operator-orchestration-service" }, { freshnessState: "stale" }),
      () => new Response("unavailable", { status: 503 }),
    ]) await assert.rejects(readWorkspaceInventoryRequestJournal(family, target, undefined, { config, fetchImpl: async () => response() }));
  });
}

test("Journal rejects count and UTF8 projection oversize without accepting a truncated success", () => {
  const value = page();
  assert.throws(() => assertInventoryRequestJournal({ ...value, records: Array.from({ length: 26 }, (_, index) => ({ ...value.records[0], request_id: `original:${index}` })) }, "promotion", target));
  const rows = Array.from({ length: 10 }, (_, index) => ({ ...value.records[0], request_id: `${index}:${"界".repeat(2000)}` }));
  assert.throws(() => assertInventoryRequestJournal({ ...value, revision: 90, pending_request_count: 10, records: rows }, "promotion", target));
});

test("Opaque IDs preserve native text semantics without inventing a Console namespace/length rule", () => {
  for (const id of ["native:\nline/%3A?query=日本語", "native:" + "x".repeat(5000)]) {
    assert.equal(assertWorkspaceInventoryRequestId(id), id);
    assert.equal(assertWorkspaceInventoryLifecycleRequestId(id), id);
    const value = page();
    assert.equal(assertInventoryRequestJournal({ ...value, records: [{ ...value.records[0], request_id: id }] }, "promotion", target).records[0].request_id, id);
    assert.equal(decodeURIComponent(encodeURIComponent(id)), id);
  }
});
