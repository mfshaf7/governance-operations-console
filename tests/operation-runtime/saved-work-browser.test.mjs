import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSavedWorkBrowserSession } from "../../src/console-integration/saved-work/browser-session.ts";

const key = "delivery-work-design-session:delivery-42:v2";
const payload = JSON.stringify({ schemaVersion: 2, packageId: "delivery-42", context: { note: "diagram", x: 1.25 }, briefVersions: [] });
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return { get length() { return data.size; }, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), key: index => [...data.keys()][index] ?? null, removeItem: key => data.delete(key), clear: () => data.clear() };
}
function owner() {
  let record = null; const originals = []; const calls = []; let fail = false; let uncertain = false;
  const snapshot = () => ({ kind: "work-design", subject_id: "delivery-42", record, recoveries: originals.map((entry, index) => ({ recovery_id: String(index), storage_key: entry.storage_key, content_digest: digest(entry.raw_value), preserved_at: "2026-10-29T00:00:00Z" })) });
  return { calls, originals, get record() { return record; }, set record(value) { record = value; }, set fail(value) { fail = value; }, set uncertain(value) { uncertain = value; },
    async fetch(url, init) {
      calls.push({ url, ...init }); if (fail) throw new Error("Offline");
      if (init.method === "POST") {
        const input = JSON.parse(init.body);
        if (url.includes("preserve")) originals.push(input);
        else {
          if (record?.acknowledgement_id === input.command_id) { /* Exact uncertain-save retry. */ }
          else if ((record?.revision ?? 0) !== input.expected_revision) return Response.json({ error: "Another tab saved" }, { status: 409 });
          else record = { revision: input.expected_revision + 1, payload_json: input.payload_json, content_digest: digest(input.payload_json), acknowledgement_id: input.command_id, saved_at: "2026-10-29T00:00:00Z" };
          if (uncertain) { uncertain = false; throw new Error("Acknowledgement lost"); }
        }
      }
      return Response.json({ mode: "live", operatorId: "operator:test", snapshot: snapshot() });
    } };
}
function session(local, backend) { return createSavedWorkBrowserSession(key, { storage: local, fetchImpl: backend.fetch, delayMs: 60_000 }); }

test("legacy raw bytes are preserved before first server save and fresh browser restores exact diagrams", async () => {
  const backend = owner(); const local = storage({ [key]: payload }); const first = session(local, backend);
  await first.initialize(); assert.equal(backend.originals[0].raw_value, payload); assert.equal(backend.record, null);
  first.write(JSON.parse(payload)); await first.retry(); assert.equal(first.getSnapshot().status, "saved");
  const fresh = session(storage(), backend); await fresh.initialize(); assert.equal(fresh.read(), payload);
  assert.equal(fresh.getSnapshot().status, "saved"); assert.equal(local.getItem(`console-saved-work-original:${key}`), payload);
});
test("old-key malformed records remain downloadable originals and are never rewritten as valid evidence", async () => {
  const backend = owner(); const old = key.replace(":v2", ":v1"); const local = storage({ [old]: "{broken" });
  const current = session(local, backend); await current.initialize();
  assert.equal(backend.originals[0].storage_key, old); assert.equal(backend.originals[0].raw_value, "{broken");
  assert.equal(local.getItem(old), "{broken"); assert.equal(current.read(), null);
});
test("unavailable initial owner blocks autosave hydration and retains original browser bytes", async () => {
  const backend = owner(); backend.fail = true; const local = storage({ [key]: payload }); const current = session(local, backend);
  await current.initialize(); assert.equal(current.getSnapshot().hydrated, false); assert.equal(current.getSnapshot().status, "error"); assert.equal(local.getItem(key), payload);
  backend.fail = false; await current.retry(); assert.equal(current.getSnapshot().hydrated, true);
});
test("lost acknowledgement retries original command without duplicating a revision", async () => {
  const backend = owner(); const current = session(storage(), backend); await current.initialize();
  current.write(JSON.parse(payload)); backend.uncertain = true; await current.retry(); assert.equal(current.getSnapshot().status, "error"); assert.equal(backend.record.revision, 1);
  await current.retry(); assert.equal(current.getSnapshot().status, "saved"); assert.equal(backend.record.revision, 1);
});
test("unacknowledged browser edits conflict visibly with a different server copy", async () => {
  const backend = owner(); const first = session(storage(), backend); await first.initialize(); first.write(JSON.parse(payload)); await first.retry();
  const edits = payload.replace("diagram", "offline edit"); const second = session(storage({ [key]: edits }), backend); await second.initialize();
  assert.equal(second.getSnapshot().status, "conflict"); assert.equal(second.read(), edits); assert.equal(backend.record.payload_json, payload);
  await second.keepBrowserEdits(); assert.equal(second.getSnapshot().status, "saved"); assert.equal(backend.record.payload_json, edits);
});
test("read-only history performs no owner writes and reads the saved original", async () => {
  const backend = owner(); const first = session(storage(), backend); await first.initialize(); first.write(JSON.parse(payload)); await first.retry();
  const count = backend.calls.length; const history = session(storage({ [key]: payload }), backend); await history.initialize(true);
  history.write({ modified: true }); assert.equal(history.read(), payload); assert.ok(backend.calls.slice(count).every(call => call.method === "GET"));
});
test("a changed server payload cannot masquerade as a saved acknowledgement", async () => {
  const backend = owner(); backend.record = { revision: 1, payload_json: payload, content_digest: digest("different"), acknowledgement_id: "ack" };
  const current = session(storage(), backend); await current.initialize(); assert.equal(current.getSnapshot().hydrated, false); assert.equal(current.getSnapshot().status, "error");
});

test("a browser cache acknowledged for another operator is never imported", async () => {
  const backend = owner(); const local = storage({ [key]: payload, [`console-saved-work-ack:${key}`]: JSON.stringify({ operatorId: "operator:other", digest: digest(payload) }) });
  const current = session(local, backend); await current.initialize();
  assert.equal(current.getSnapshot().hydrated, false); assert.equal(current.getSnapshot().status, "error");
  assert.equal(backend.originals.length, 0); assert.equal(backend.record, null); assert.equal(local.getItem(key), payload);
});

test("choosing server content refreshes the editor without discarding preserved originals", async () => {
  const backend = owner(); const first = session(storage(), backend); await first.initialize(); first.write(JSON.parse(payload)); await first.retry();
  const browser = payload.replace("diagram", "different local draft"); const current = session(storage({ [key]: browser }), backend); await current.initialize();
  assert.equal(current.getSnapshot().status, "conflict"); await current.useServerCopy();
  assert.equal(current.read(), payload); assert.equal(current.getSnapshot().generation, 1); assert.ok(backend.originals.some(original => original.raw_value === browser));
});

test("server-copy conflict choice preserves edits made after the original browser import", async () => {
  const backend = owner(); const current = session(storage({ [key]: payload }), backend); await current.initialize(); current.write(JSON.parse(payload)); await current.retry();
  backend.record = { ...backend.record, revision: 2, payload_json: payload.replace("diagram", "other tab"), content_digest: digest(payload.replace("diagram", "other tab")) };
  const edits = payload.replace("diagram", "later local edits"); current.write(JSON.parse(edits)); await current.retry(); assert.equal(current.getSnapshot().status, "conflict");
  await current.useServerCopy(); assert.ok(backend.originals.some(original => original.raw_value === edits)); assert.equal(current.read(), backend.record.payload_json);
});
