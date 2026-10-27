import assert from "node:assert/strict";
import test from "node:test";
import { assertAdvisorScope, assertAdvisorReply, parseAdvisorReply, advisorScopeSnapshot, advisorScopeIdentity } from "../../src/agent-console/model/advisor-drafts.ts";
import { applyContextBoardAdvisorPatch } from "../../src/product-apps/context-board/context-board-advisor-patch.ts";
import { applyWorkDesignAdvisorPatch } from "../../src/domain-workspaces/delivery/product-adapters/build-tree/work-design-advisor-patch.ts";
import { buildAdvisorAgentRequest } from "../../src/agent-console/server/advisor-draft-request.ts";
import { createWorkDesignAdvisorScope } from "../../src/domain-workspaces/delivery/live-runtime/work-design-draft-advisor.ts";

test("public Delivery register identity cannot substitute for native Work Design package binding", () => {
  const record = { delivery_package_id: "delivery-1332", legacy_epic_id: 1332 };
  for (const role of ["work-design-context", "work-design-tree"]) {
    const local = { ...scope(), role, ref: record.delivery_package_id };
    const { sourceRef: _unused, ...draft } = local;
    const result = createWorkDesignAdvisorScope(record, draft);
    assert.equal(result.ref, "delivery-1332");
    assert.equal(result.packageRef, "delivery-package:1332");
    assert.equal(result.sourceRef, "openproject://work_packages/1332");
    assert.equal(result.sourceRevision, local.sourceRevision);
    assert.deepEqual(result.fields, local.fields);
    assertAdvisorScope(result);
  }
});

const scope = () => ({ role: "proposal-triage", ref: "proposal:test", sourceRef: "proposal:test", sourceRevision: "1", context: "Selected proposal", fields: [{ key: "summary", label: "Summary", value: "Manual draft" }] });
const draft = (edits) => ({ intent: "draft", message: "Requested edits", edits });
const node = (id, kind, children = []) => ({ id, kind, title: id, description: "Manual description", draftBody: "Manual body", remark: "Manual remark", tone: "info", children });
const addition = (id, kind) => { const { tone, ...value } = node(id, kind); return value; };
const board = () => ({ customItems: [{ id: "manual", kind: "note", label: "Manual note", detail: "Keep this", x: 100, y: 100 }], connections: [], positions: { core: { x: 0, y: 0 } }, removedCoreIds: [], sketchStrokes: [{ id: "manual-sketch" }], templateTrays: [], style: "architecture" });

test("Context note proposals stay consumable by the native 8000-character note contract", () => {
  const current = "x".repeat(9347);
  const descriptor = createWorkDesignAdvisorScope({ legacy_epic_id: 1332 }, {
    role: "work-design-context", ref: "delivery-1332", sourceRevision: "current", context: "Current local draft",
    fields: [{ key: "note", label: "Context note", value: current }],
  });
  assertAdvisorScope(descriptor);
  assert.equal(descriptor.fields[0].value, current, "Retain overlong legacy content for manual recovery; do not truncate it");
  assert.equal(descriptor.fields[0].maxLength, 8000);
  for (const size of [0, 8000]) {
    const value = "n".repeat(size);
    assert.equal(parseAdvisorReply(JSON.stringify(draft([{ field: "note", value }])), descriptor).edits[0].value, value);
  }
  assert.throws(() => parseAdvisorReply(JSON.stringify(draft([{ field: "note", value: "n".repeat(8001) }])), descriptor));
  assert.equal(descriptor.fields[0].value, current);
});

test("draft advisor constructs the current canonical request envelope instead of bypassing ordinary request validation", () => {
  const session = { nonce: "550e8400-e29b-41d4-a716-446655440000", openedAt: new Date().toISOString() };
  const invocation = "550e8400-e29b-41d4-a716-446655440001";
  const request = buildAdvisorAgentRequest(scope(), "Draft my summary", session, invocation);
  assert.equal(request.mode, "focused"); assert.equal(request.message, "Draft my summary");
  assert.equal(request.candidate.scope, "page"); assert.equal(request.invocationNonce, invocation);
  assert.deepEqual(request.session, session);
  assert.throws(() => buildAdvisorAgentRequest(scope(), "", session, invocation));
  assert.throws(() => buildAdvisorAgentRequest(scope(), "Draft my summary", session, "not-a-valid-nonce"));
});

test("question and clarification proposals cannot contain edits; final or foreign fields never become draft targets", () => {
  for (const intent of ["answer", "clarify"]) {
    assert.equal(assertAdvisorReply({ intent, message: "Explanation", edits: [] }, scope()).edits.length, 0);
    assert.throws(() => assertAdvisorReply({ intent, message: "Explanation", edits: [{ field: "summary", value: "overwrite" }] }, scope()));
  }
  for (const key of ["approve", "status", "decision", "__proto__"]) assert.throws(() => assertAdvisorScope({ ...scope(), fields: [{ key, label: key, value: "" }] }));
  assert.throws(() => assertAdvisorReply(draft([{ field: "approve", value: "yes" }]), scope()));
  assert.throws(() => assertAdvisorReply(draft([{ field: "summary", value: "A" }, { field: "summary", value: "B" }]), scope()));
  assert.throws(() => assertAdvisorReply(draft([{ field: "summary", value: "A" }]), { ...scope(), readOnly: true }));
});

test("draft scope fingerprints bind the selected source and manual content independently of transport and read-only formatting", () => {
  const original = scope();
  assert.equal(advisorScopeSnapshot(original), advisorScopeSnapshot({ ...original, readOnly: false }));
  assert.notEqual(advisorScopeIdentity(original), advisorScopeIdentity({ ...original, sourceRevision: "2" }));
  assert.notEqual(advisorScopeSnapshot(original), advisorScopeSnapshot({ ...original, fields: [{ ...original.fields[0], value: "Later manual edit" }] }));
  assert.notEqual(advisorScopeSnapshot(original), advisorScopeSnapshot({ ...original, context: "Different selected decision" }));
});

test("malformed, executable, oversized and unavailable-choice replies fail before local editing", () => {
  assert.throws(() => parseAdvisorReply("run shell command", scope()));
  assert.throws(() => parseAdvisorReply('{"intent":"draft","message":"x","edits":[],"execute":"anything"}', scope()));
  assert.throws(() => assertAdvisorReply(draft([{ field: "summary", value: "x".repeat(24001) }]), scope()));
  assert.throws(() => assertAdvisorReply(draft([{ field: "summary", value: "unavailable" }]), { ...scope(), fields: [{ ...scope().fields[0], allowedValues: ["valid"] }] }));
  assert.equal(parseAdvisorReply('```json\n{"intent":"answer","message":"Hello","edits":[]}\n```', scope()).intent, "answer");
});

test("diagram drafting preserves manual cards, sketches and core positions and can connect an admitted core node", () => {
  const base = board(), before = structuredClone(base);
  const result = applyContextBoardAdvisorPatch(base, { addItems: [{ id: "new", kind: "process", label: "New process", detail: "Requested", x: 400, y: 100 }], addConnections: [{ id: "link", from: { endpointType: "port", itemId: "core", itemType: "core", side: "right" }, to: { endpointType: "port", itemId: "new", itemType: "custom", side: "left" } }] }, ["core"]);
  assert.deepEqual(base, before);
  assert.deepEqual(result.customItems[0], before.customItems[0]);
  assert.deepEqual(result.sketchStrokes, before.sketchStrokes);
  assert.deepEqual(result.positions, before.positions);
  assert.equal(result.connections[0].to.itemId, "new");
  const revised = applyContextBoardAdvisorPatch(result, { updateItems: [{ id: "new", label: "Revised process" }] }, ["core"]);
  assert.equal(revised.customItems[1].label, "Revised process");
  assert.equal(revised.connections.length, 1);
});

test("a malformed diagram transaction makes no partial changes and cannot link unknown or removed nodes", () => {
  const base = board(), before = structuredClone(base);
  const addition = { id: "new", kind: "note", label: "New", detail: "", x: 0, y: 0 };
  assert.throws(() => applyContextBoardAdvisorPatch(base, { addItems: [addition], updateItems: [{ id: "missing", label: "Bad" }] }));
  assert.deepEqual(base, before);
  for (const itemId of ["unknown", "manual"]) assert.throws(() => applyContextBoardAdvisorPatch(base, { removeItemIds: ["manual"], addConnections: [{ id: "bad", from: { itemType: "custom", itemId, side: "right" }, to: { itemType: "custom", itemId: "manual", side: "left" } }] }));
  assert.throws(() => applyContextBoardAdvisorPatch(base, { addItems: [{ ...addition, x: Infinity }] }));
  assert.throws(() => applyContextBoardAdvisorPatch(base, { addItems: [{ ...addition, id: "core" }] }, ["core"]));
});

test("tree drafting preserves existing text and creates ordinary Feature/story decomposition atomically", () => {
  const base = node("epic", "Epic", [node("manual-feature", "Feature", [node("manual-story", "User story")])]);
  const before = structuredClone(base);
  const result = applyWorkDesignAdvisorPatch(base, { addNodes: [{ parentId: "epic", node: addition("new-feature", "Feature") }, { parentId: "new-feature", node: addition("new-story", "User story") }] });
  assert.deepEqual(base, before);
  assert.deepEqual(result.children[0], before.children[0]);
  assert.equal(result.children[1].children[0].kind, "User story");
  for (const patch of [{ removeNodeIds: ["epic"] }, { updateNodes: [{ id: "manual-feature", status: "done" }] }, { addNodes: [{ parentId: "epic", node: node("bad-story", "User story") }] }]) {
    assert.throws(() => applyWorkDesignAdvisorPatch(base, patch)); assert.deepEqual(base, before);
  }
});
