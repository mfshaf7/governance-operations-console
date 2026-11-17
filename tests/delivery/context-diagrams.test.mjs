import test from "node:test";
import assert from "node:assert/strict";
import { captureContextBoardDiagrams, contextBoardCanvasSnapshot, contextBoardDiagrams,
  assertContextBoardDiagrams, contextBoardArchitectureContext, contextBoardSupportingDiagrams } from "../../src/product-apps/context-board/context-board-diagrams.ts";
import { cloneContextBoardSnapshot } from "../../src/product-apps/context-board/context-board-core.ts";
import { applyContextBoardAdvisorPatch } from "../../src/product-apps/context-board/context-board-advisor-patch.ts";
import { workDesignContextFingerprint } from "../../src/domain-workspaces/delivery/presentation/workflows/work-design/artifacts/context-brief/work-design-context-fingerprint.ts";

const canvas = label => ({ connections: [], customItems: [{ id: "shared-local-id", kind: "component", label,
  detail: "Retained exact source", x: 123.75, y: 210.5 }], positions: {}, removedCoreIds: [], sketchStrokes: [], style: "architecture", templateTrays: [] });
const views = () => [{ id: "overview", name: "System architecture", description: "Existing and proposed ownership", diagramType: "c4", snapshot: canvas("Console") },
  { id: "recovery", name: "Recovery", description: "Original-operation reconciliation", diagramType: "sequence", snapshot: canvas("Retained operation") }];
const fingerprint = snapshot => workDesignContextFingerprint({ decision: "proceed", note: "Architecture", snapshot, sources: [] });

test("supporting diagram context includes only explicitly selected other views and preserves the source document",()=>{
 const document=captureContextBoardDiagrams(canvas("Console"),views(),"overview"),before=structuredClone(document);
 assert.deepEqual(contextBoardSupportingDiagrams(document,[]),[]);
 const selected=contextBoardSupportingDiagrams(document,["recovery","overview","another-project"]);
 assert.deepEqual(selected.map(view=>view.id),["recovery"]);assert.equal(selected[0].snapshot.customItems[0].label,"Retained operation");
 selected[0].snapshot.customItems[0].label="Mutated copy";assert.deepEqual(document,before);
 assert.deepEqual(contextBoardSupportingDiagrams(canvas("Legacy"),["diagram-main"]),[]);
});

test("legacy snapshots retain exact content and old fingerprint, without an automatic migration write", () => {
  const old = canvas("Original saved board");
  assert.deepEqual(cloneContextBoardSnapshot(old), old);
  assert.deepEqual(contextBoardDiagrams(old)[0].snapshot, old);
  assert.equal("diagrams" in old, false);
  const value = JSON.parse(fingerprint(old));
  assert.deepEqual(value.customItems, old.customItems);
  assert.equal("diagrams" in value, false);
});

test("switching diagram preserves all content and leaves the brief fingerprint unchanged", () => {
  const diagrams = views();
  const first = captureContextBoardDiagrams(diagrams[0].snapshot, diagrams, "overview");
  const second = captureContextBoardDiagrams(diagrams[1].snapshot, first.diagrams, "recovery");
  assert.equal(fingerprint(first), fingerprint(second));
  assert.deepEqual(cloneContextBoardSnapshot(second), second);
  assert.deepEqual(second.diagrams, first.diagrams);
});

test("an advisor patch and its scoped undo preserve the other diagram, even with matching local item IDs", () => {
  const diagrams = views(), original = captureContextBoardDiagrams(diagrams[0].snapshot, diagrams, "overview");
  const next = applyContextBoardAdvisorPatch(original, { updateItems: [{ id: "shared-local-id", label: "Edited Console" }] });
  assert.equal(next.diagrams[0].snapshot.customItems[0].label, "Edited Console");
  assert.deepEqual(next.diagrams[1], original.diagrams[1]);
  assert.notEqual(fingerprint(next), fingerprint(original));
  const undone = captureContextBoardDiagrams(contextBoardCanvasSnapshot(original), next.diagrams, "overview");
  assert.deepEqual(undone, original);
});

test("unknown cross-view item references reject the entire transaction", () => {
  const diagrams = views(); diagrams[1].snapshot.customItems[0].id = "other-view-only";
  const original = captureContextBoardDiagrams(diagrams[0].snapshot, diagrams, "overview");
  assert.throws(() => applyContextBoardAdvisorPatch(original, { updateItems: [
    { id: "shared-local-id", label: "Must not leak" }, { id: "other-view-only", label: "Forbidden" }] }), /outside this board/);
  assert.equal(original.customItems[0].label, "Console");
});

test("the fingerprint covers every diagram's description, order and saved canvas", () => {
  const diagrams = views(), original = captureContextBoardDiagrams(diagrams[0].snapshot, diagrams, "overview");
  for (const change of [d => { d.diagrams[1].description = "Changed recovery contract"; },
    d => { d.diagrams.reverse(); }, d => { d.diagrams[1].snapshot.customItems[0].detail = "Changed original identity"; }]) {
    const next = structuredClone(original); change(next); assert.notEqual(fingerprint(next), fingerprint(original));
  }
});

test("missing selections, duplicate identities and recursive documents are rejected without normalization loss", () => {
  const good = captureContextBoardDiagrams(views()[0].snapshot, views(), "overview");
  for (const change of [s => { s.activeDiagramId = "missing"; }, s => { s.diagrams[1].id = "overview"; },
    s => { s.diagrams[1].snapshot.diagrams = []; }, s => { s.diagrams = []; }]) {
    const invalid = structuredClone(good); change(invalid); assert.throws(() => assertContextBoardDiagrams(invalid));
  }
});

test("the planning handoff carries every view's architectural detail and relationships without layout noise", () => {
  const diagrams = views();
  diagrams[1].snapshot.connections = [{ id: "recover", from: { itemId: "shared-local-id", itemType: "custom", side: "right" },
    to: { endpointType: "free", x: 710.5, y: 310.25, side: "left" }, label: "Reconcile original operation", shape: "curve", tip: "arrow" }];
  diagrams[1].snapshot.templateTrays = [{ id: "private-boundary", label: "Private runtime storage", itemIds: ["shared-local-id"], x: 0, y: 0 }];
  const snapshot = captureContextBoardDiagrams(diagrams[0].snapshot, diagrams, "overview");
  const context = contextBoardArchitectureContext(snapshot);
  assert.deepEqual(context.map(view => view.name), ["System architecture", "Recovery"]);
  assert.equal(context[1].description, "Original-operation reconciliation");
  assert.equal(context[1].cards[0].detail, "Retained exact source");
  assert.equal(context[1].connections[0].label, "Reconcile original operation");
  assert.deepEqual(context[1].groups[0].itemIds, ["shared-local-id"]);
  assert.equal("x" in context[1].cards[0], false);
  assert.equal("shape" in context[1].connections[0], false);
});
