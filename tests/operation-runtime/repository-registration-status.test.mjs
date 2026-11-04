import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertRepositoryRegistrationLookup, mergeRepositoryRegistrationLookups, readRepositoryRegistrationLookups } from "../../src/workspace-registry/workspace-repository-status.ts";
import { readRepositoryRegistrationStatus } from "../../src/workspace-registry/server/workspace-registry-oos-client.ts";
import { canonicalSourceResponse } from "../support/console-source-projection.mjs";
const stable = value => value && typeof value === "object" ? Array.isArray(value) ? value.map(stable) : Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(stable(value))).digest("hex")}`;
const config = { baseUrl: "http://127.0.0.1:8080", callerId: "governance-operations-console", callerSecret: "server-held-test-secret" };
const names = ["first", "second"];
function body() {
  const value = { schema_version: 1, mode: "current", authority: { kind: "internal-instance-record", instance_id: "synthetic-installation" },
    record_ids: names.map(name => `repo:${name}`), records: [{ record_id: "repo:first", version: 3, record_digest: `sha256:${"a".repeat(64)}`,
      phase: "inventory", status: "active", provider_repository: { provider: "github", provider_repository_id: "123", full_name: "example-org/physical-source" } }], projected_at: new Date().toISOString() };
  return { ...value, projection_digest: digest(value) };
}
test("selected registration uses one exact source read and validates its payload and current namespace", async () => {
  const value = body(); let calls = 0;
  const fetched = await readRepositoryRegistrationStatus(names, { config, fetchImpl: async (url, init) => {
    calls++; const parsed = new URL(url);
    assert.equal(init.method, "GET"); assert.deepEqual(parsed.searchParams.getAll("name"), names);
    assert.equal(parsed.pathname, "/v1/workspace-inventory/repository-status");
    return canonicalSourceResponse(value, { recordRef: `oos://workspace-inventory/repository-status?${parsed.searchParams}`, sourceOwner: "operator-orchestration-service" });
  } });
  assert.deepEqual(fetched, value); assert.equal(calls, 1);
  const parsed = assertRepositoryRegistrationLookup(fetched, names);
  assert.equal(parsed.records.length, 1); assert.equal(parsed.recordIds.length, 2);
  const other = { ...parsed, instanceId: "foreign-installation", recordIds: ["repo:third"], records: [] };
  assert.throws(() => mergeRepositoryRegistrationLookups(parsed, other), /changed installation/);
  assert.throws(() => mergeRepositoryRegistrationLookups(parsed, parsed), /overlapped/);
  for (const mutate of [value => value.record_ids.pop(), value => { value.records[0].status = "proposed"; },
    value => { value.records[0].record_id = "repo:unselected"; }, value => { value.authority.instance_id = ""; }]) {
    const wrong = body(); mutate(wrong); assert.throws(() => assertRepositoryRegistrationLookup(wrong, names));
  }
});
test("only explicit unconfigured status permits a legacy-only view; an outage never means empty registration", async () => {
  assert.deepEqual(assertRepositoryRegistrationLookup({ schema_version: 1, mode: "not-configured", projected_at: new Date().toISOString() }, names), { mode: "not-configured" });
  await assert.rejects(readRepositoryRegistrationStatus(names, { config, fetchImpl: async () => Response.json({}, { status: 503 }) }));
  const wrong = body(); wrong.records[0].version++;
  await assert.rejects(readRepositoryRegistrationStatus(names, { config, fetchImpl: async url => canonicalSourceResponse(wrong,
    { recordRef: `oos://workspace-inventory/repository-status?${new URL(url).searchParams}`, sourceOwner: "operator-orchestration-service" }) }), /content changed/);
});


test("selected status batching stays bounded and stops abandoned reads before another request", async () => {
  const names = Array.from({ length: 60 }, (_, index) => `project-${String(index).padStart(2, "0")}`), calls = [];
  const responseFor = url => {
    const page = new URL(url, "http://fixture.test").searchParams.getAll("name"); calls.push(page);
    const value = { schema_version: 1, mode: "current", authority: { kind: "internal-instance-record", instance_id: "synthetic-installation" },
      record_ids: page.map(name => `repo:${name}`), records: [], projected_at: new Date().toISOString() };
    return Response.json({ ...value, projection_digest: digest(value) });
  };
  const result = await readRepositoryRegistrationLookups(names, { fetchImpl: async (url, init) => { assert.equal(init.cache, "no-store"); return responseFor(url); } });
  assert.deepEqual(calls.map(page => page.length), [25, 25, 10]);
  assert.equal(result.recordIds.length, 60);
  const controller = new AbortController(); calls.length = 0;
  await assert.rejects(readRepositoryRegistrationLookups(names, { signal: controller.signal, fetchImpl: async url => {
    const response = responseFor(url); controller.abort(); return response;
  } }));
  assert.equal(calls.length, 1);
});
