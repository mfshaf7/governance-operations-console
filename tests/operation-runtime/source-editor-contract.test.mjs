import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertOperatorDraftCommand, assertSourceDraft, sourcePathIssue, sourceEditorLimits } from "../../src/console-integration/source-authoring/source-editor-contract.ts";
import { sourceBufferOperations, sourceSaveCommand, sourceEditable, draftBuffers, sourceDraftFingerprint, replaceSourceBuffer } from "../../src/console-integration/source-authoring/source-editor-model.ts";
import { decodeImportedSource, mapSourceImports, browserImportFiles } from "../../src/console-integration/source-authoring/source-import.ts";
import { applyCodeTextChanges, normalizedCodeText } from "../../src/teras/teras-code-text.ts";
import { createBytePreservingCodeState } from "../../src/teras/teras-code-state.ts";
import { EditorState, Transaction } from "@codemirror/state";
import { history, undo, redo } from "@codemirror/commands";
import { readSourceSaveBody, sourceBoundedFetch, sourceFileSelectors, sourceCanonicalDigest as digest, sourceTextDigest as textDigest, verifySourceCapture, verifySourceDraft, verifySourceSaveAcknowledgement } from "../../src/console-integration/source-authoring/server/source-editor-evidence.ts";

const at = "2026-10-25T00:00:00.000Z", later = "2026-10-25T00:00:01.000Z", sessionId = "source-session:sample";
const state = { sessionId, revision: at, state: "not-started", attempt: null };
const objective = "Update a small ordinary source project using the Console.";
const newBuffer = () => ({ path: "src/example.ts", content: "export const sample = true;\n", expectedDigest: null, baseline: null, changed: true, deleted: false });
const command = () => sourceSaveCommand(state, objective, "Update the sample source", [newBuffer()], "manual", "sample", at);
function draft(command, base = "a".repeat(40)) {
  const change = { schema_version: 1, change_set_id: `operator-change-set:${digest(command).slice(7)}`, session_id: sessionId, base_commit: base, objective_digest: digest(command.objective), commit_message: command.commit_message, operations: command.operations };
  return { schema_version: 1, workflow_id: "delivery-art-source-draft", session_id: sessionId, revision: later, digest: digest(change), objective: command.objective, accepted: false, change_set: change, operator_draft: null };
}

for (const workflow of ["prototype-source-draft", "delivery-art-source-draft"]) {
  test(`native history references retain their owner format and binding: ${workflow}`, () => {
    const requestId = "prototype-source-request:sample", priorDigest = `sha256:${"b".repeat(64)}`;
    const native = workflow === "prototype-source-draft" ? { request_id: requestId, digest: `sha256:${"c".repeat(64)}` } : `draft-history-${"b".repeat(64)}.json`;
    const value = { ...draft(command()), workflow_id: workflow, ...(workflow === "prototype-source-draft" ? { request_id: requestId } : {}),
      operator_draft: { origin: "operator-amended-model", input_origin: "import", operator_id: "operator:test-owner", command_id: "operator-source-save:amend",
        amended_at: later, previous_draft_ref: native, previous_draft_digest: priorDigest, original_model: { profile_id: "synthetic-source-profile" } } };
    const read = assertSourceDraft(value, workflow);
    assert.equal(read.provenance.origin, "operator-amended-model"); assert.equal(read.provenance.originalModel, true);
    if (workflow === "prototype-source-draft") assert.notEqual(native.digest, priorDigest);
    const invalid = workflow === "prototype-source-draft"
      ? [`draft-history-${"b".repeat(64)}.json`, { ...native, request_id: "prototype-source-request:other" }, { ...native, digest: "not-a-digest" }, { ...native, path: "untrusted" }]
      : [{ request_id: requestId, digest: `sha256:${"c".repeat(64)}` }, 7];
    for (const reference of invalid) assert.throws(() => assertSourceDraft({ ...value, operator_draft: { ...value.operator_draft, previous_draft_ref: reference } }, workflow), /bounded/);
  });
}

test("actual CodeMirror undo/redo restores mixed newline bytes and the BOM, including grouped edits", () => {
  const original = "\uFEFFone\r\ntwo\nthree\r\nfour", field = createBytePreservingCodeState(original, 65536, () => {});
  let state = EditorState.create({ doc: normalizedCodeText(original), extensions: [history(), field.extension, EditorState.transactionFilter.of(field.filter)] });
  const dispatch = transaction => { state = transaction.state; };
  dispatch(state.update({ changes: { from: 8, to: 9 }, annotations: Transaction.userEvent.of("input.delete") }));
  assert.notEqual(field.value(state), original);
  assert.equal(undo({ state, dispatch }), true); assert.equal(field.value(state), original);
  assert.equal(redo({ state, dispatch }), true); assert.equal(field.value(state), "\uFEFFone\r\ntwothree\r\nfour");
  assert.equal(undo({ state, dispatch }), true);
  dispatch(state.update({ changes: { from: 5, to: 5, insert: "A" }, annotations: Transaction.userEvent.of("input.type") }));
  dispatch(state.update({ changes: { from: 6, to: 6, insert: "B" }, annotations: Transaction.userEvent.of("input.type") }));
  assert.equal(undo({ state, dispatch }), true); assert.equal(field.value(state), original);
});

test("case:1326-input-import-positive: text decoding and edits preserve UTF-8 BOM, CRLF and mixed untouched lines", () => {
  const original = "\uFEFFone\r\ntwo\nthree\r\nfour";
  const bytes = new TextEncoder().encode(original);
  assert.equal(decodeImportedSource(bytes.buffer), original);
  assert.equal(normalizedCodeText(original), "\uFEFFone\ntwo\nthree\nfour");
  assert.equal(applyCodeTextChanges(original, [{ from: 5, to: 8, inserted: "TWO" }]), "\uFEFFone\r\nTWO\nthree\r\nfour");
  assert.equal(applyCodeTextChanges(original, [{ from: 19, to: 19, inserted: "\nlast" }]), `${original}\r\nlast`);
  assert.throws(() => decodeImportedSource(new Uint8Array([0xc3, 0x28]).buffer), /UTF-8/);
  assert.throws(() => decodeImportedSource(new Uint8Array([65, 0, 66]).buffer), /Binary/);
  assert.throws(() => decodeImportedSource(new Uint8Array(sourceEditorLimits.fileBytes + 1).buffer), /64 KiB/);
});

test("case:1326-input-import-negative: mapping reports excluded, oversized, duplicate and unsafe inputs without inferred deletes", () => {
  const file = (path, size = 10) => ({ path, size, read: async () => new ArrayBuffer(size) });
  const rows = mapSourceImports([file("src/app.ts"), file("node_modules/x/a.js"), file(".env"), file("../outside"), file("large.txt", 65537)], "app", null);
  assert.equal(rows[0].target, "app/src/app.ts"); assert.equal(rows[0].issue, null);
  assert.ok(rows.slice(1).every(row => row.issue));
  assert.ok(mapSourceImports([file("same.ts"), file("same.ts")], "", null).every(row => /Multiple/.test(row.issue)));
  const scope = { source_root: "prototypes/sample", design_profile: "docs/prototypes/sample/design-profile.md" };
  assert.equal(sourcePathIssue("prototypes/sample/src/app.ts", scope), null);
  for (const forbidden of ["src/app.ts", "prototypes/other/app.ts", "prototypes/sample/.github/run.yml", "prototypes/sample/AGENTS.md"]) assert.ok(sourcePathIssue(forbidden, scope));
  const mapped = browserImportFiles([{ name: "app.ts", webkitRelativePath: "selected-folder/src/app.ts", size: 12, arrayBuffer: async () => new ArrayBuffer(12) }], true);
  assert.equal(mapped[0].path, "src/app.ts");
  const original = { ...newBuffer(), path: "existing.ts", expectedDigest: textDigest("before"), baseline: "before", content: "before", changed: false };
  assert.deepEqual(sourceBufferOperations([original, newBuffer()]).map(row => row.action), ["create"]);
});

test("case:1326-editor-state-positive: manual, linked retry and amendment preserve the actual execution and exact command", () => {
  const saved = assertOperatorDraftCommand(command()); assert.equal(saved.retry_of, null); assert.equal(saved.expected_change_set_digest, null);
  const existing = { ...state, state: "draft-ready", attempt: { requestId: "model-request:1", executionId: "model-execution:1", objectiveDigest: digest(objective), digest: digest("old draft") } };
  const amended = sourceSaveCommand(existing, objective, saved.commit_message, [newBuffer()], "import", "new-save", later);
  assert.equal(amended.execution_id, "model-execution:1"); assert.equal(amended.expected_change_set_digest, existing.attempt.digest); assert.equal(amended.retry_of, null);
  const retry = sourceSaveCommand({ ...existing, state: "cancelled" }, objective, saved.commit_message, [newBuffer()], "manual", "retry", later);
  assert.equal(retry.retry_of, "model-request:1"); assert.notEqual(retry.execution_id, "model-execution:1");
  const retained = draft(saved), buffers = draftBuffers(retained), fingerprint = sourceDraftFingerprint(buffers, saved.commit_message, objective);
  assert.equal(sourceDraftFingerprint(replaceSourceBuffer(buffers, { ...buffers[0], baseline: null }), saved.commit_message, objective), fingerprint);
  assert.notEqual(sourceDraftFingerprint([{ ...buffers[0], content: "changed" }], saved.commit_message, objective), fingerprint);
});

test("case:1326-editor-state-negative: applying, uncertain apply and source-created cannot create a new save", () => {
  for (const status of ["accepted", "applying", "apply-unknown", "source-created"]) {
    assert.equal(sourceEditable(status), false);
    assert.throws(() => sourceSaveCommand({ ...state, state: status }, objective, "Update source safely", [newBuffer()], "manual", "attempt", later), /read-only/);
  }
  assert.throws(() => sourceSaveCommand({ ...state, state: "draft-ready" }, objective, "Update source safely", [newBuffer()], "manual", "attempt", later), /exact retained/);
});

test("case:1326-adapter-binding-negative: closed command, stream budget, path selection and malformed text fail before owner write", async () => {
  for (const extra of [{ operator_id: "forged" }, { repository: "other/owner" }, { source_intent_ref: "ambient" }, { model: {} }, { context: {} }]) assert.throws(() => assertOperatorDraftCommand({ ...command(), ...extra }));
  assert.throws(() => assertOperatorDraftCommand({ ...command(), operations: [{ ...command().operations[0], content: "\ud800" }] }));
  assert.throws(() => sourceFileSelectors("http://example/files?repo=other"));
  assert.throws(() => sourceFileSelectors("http://example/files?path=src/a&path=src/a"));
  assert.throws(() => sourceFileSelectors(`http://example/files?${Array.from({ length: 49 }, (_, i) => `path=file${i}`).join("&")}`));
  const parsed = await readSourceSaveBody(new Request("http://example/draft", { method: "POST", body: JSON.stringify(command()) }));
  assert.deepEqual(parsed, command());
  await assert.rejects(readSourceSaveBody(new Request("http://example/draft", { method: "POST", body: " ".repeat(1048577) })), /wire budget/);
  await assert.rejects(sourceBoundedFetch(async () => new Response(new Uint8Array(2097153)))("http://owner.invalid"), /bounded envelope/);
  await assert.rejects(sourceBoundedFetch(async () => new Response("{}", { headers: { "content-length": "2097153" } }))("http://owner.invalid"), /bounded envelope/);
  const bounded = sourceBoundedFetch(async (_input, init) => { assert.equal(init.redirect, "error"); return Response.json({ safe: true }); });
  assert.deepEqual(await (await bounded("http://owner.invalid")).json(), { safe: true });
});

test("case:1326-adapter-binding-positive: save acknowledgement binds exact bytes; replay cannot impersonate a later revision", () => {
  const c = command(), d = draft(c), change = d.change_set;
  const acknowledgement = { session_id: sessionId, revision: later, state: "draft-ready", replayed: false, attempt: { execution_id: c.execution_id, objective_digest: digest(objective), change_set: { digest: d.digest, commit_message: c.commit_message } } };
  const before = { sessionId, base: change.base_commit };
  const first = verifySourceSaveAcknowledgement(acknowledgement, c, before);
  assert.equal(first.savedDigest, d.digest);
  assert.equal(verifySourceSaveAcknowledgement({ ...acknowledgement, replayed: true }, c, before).savedRevision, later);
  assert.throws(() => verifySourceSaveAcknowledgement(acknowledgement, { ...c, operations: [{ ...c.operations[0], content: "altered" }] }, before));
  assert.throws(() => verifySourceDraft(d, { ...before, revision: "2026-10-25T00:00:02.000Z", digest: d.digest, accepted: false }, "delivery-art-source-draft"));
});

test("case:1326-git-lineage-positive / negative: exact displayed text and selected operations correspond to real committed Git bytes; moved base or altered digest fails", () => {
  const root = mkdtempSync(path.join(tmpdir(), "console-source-editor-"));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } }).trim();
  try {
    git("init", "-q"); git("config", "user.name", "Synthetic source actor"); git("config", "user.email", "source@example.invalid");
    mkdirSync(path.join(root, "src")); const before = "\uFEFFexport const enabled = false;\r\n";
    writeFileSync(path.join(root, "src/app.ts"), before); git("add", "."); git("commit", "-qm", "Initial synthetic source"); const base = git("rev-parse", "HEAD");
    const captureBody = { schema_version: 1, session_id: sessionId, owner_repo: "example-owner", landing_unit_id: "source-sample", head_commit: base, clean: true,
      tree: { paths: ["src/app.ts"], total_path_count: 1, truncated: false }, files: [{ path: "src/app.ts", content: before, content_digest: textDigest(before), size_bytes: Buffer.byteLength(before) }], admitted_bytes: Buffer.byteLength(before) };
    const captured = verifySourceCapture({ ...captureBody, context_digest: textDigest(JSON.stringify(captureBody)) }, { sessionId, base }, ["src/app.ts"]);
    const after = captured.files[0].content.replace("false", "true"), buffer = { path: "src/app.ts", content: after, baseline: before, expectedDigest: captured.files[0].content_digest, changed: true, deleted: false };
    const c = sourceSaveCommand(state, objective, "Enable the real Git example", [buffer], "import", "real-git", at), d = draft(c, base);
    const inspected = verifySourceDraft(d, { sessionId, base, revision: later, digest: d.digest, accepted: false }, "delivery-art-source-draft");
    assert.equal(textDigest(readFileSync(path.join(root, buffer.path), "utf8")), inspected.change_set.operations[0].expected_digest);
    writeFileSync(path.join(root, buffer.path), inspected.change_set.operations[0].content); git("add", "."); git("commit", "-qm", c.commit_message);
    assert.equal(readFileSync(path.join(root, buffer.path), "utf8"), after); assert.notEqual(git("rev-parse", "HEAD"), base);
    assert.equal(execFileSync("git", ["-C", root, "show", `HEAD:${buffer.path}`], { encoding: "utf8" }), inspected.change_set.operations[0].content);
    assert.throws(() => verifySourceCapture({ ...captureBody, context_digest: textDigest(JSON.stringify(captureBody)) }, { sessionId, base: git("rev-parse", "HEAD") }, [buffer.path]));
    assert.throws(() => verifySourceDraft({ ...d, change_set: { ...d.change_set, operations: [{ ...c.operations[0], content: "altered" }] } }, { sessionId, base, revision: later, digest: d.digest, accepted: false }, "delivery-art-source-draft"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
