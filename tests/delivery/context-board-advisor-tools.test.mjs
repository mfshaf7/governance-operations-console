import test from "node:test";
import assert from "node:assert/strict";
import { applyContextBoardAdvisorPatch } from "../../src/product-apps/context-board/context-board-advisor-patch.ts";
import { contextBoardCustomItemResolvedSize } from "../../src/product-apps/context-board/context-board-template-helpers.ts";
import { contextBoardArchitectureContext, captureContextBoardDiagrams, restoreLegacyContextBoardCanvas } from "../../src/product-apps/context-board/context-board-diagrams.ts";
import { contextBoardAdvisorEditorFacts } from "../../src/product-apps/context-board/context-board-advisor-guidance.ts";

const empty = () => ({ customItems: [], connections: [], templateTrays: [], positions: {}, removedCoreIds: [], sketchStrokes: [], style: "architecture" });
const card = (id, x = 100) => ({ id, kind: "component", label: id, detail: "Actual architecture responsibility", x, y: 100, width: 300 });
const tray = (id = "group") => ({ id, label: "Private runtime", diagramType: "c4", x: 60, y: 60, width: 760, height: 280, itemIds: ["a", "b"] });
const edge = () => ({ id: "edge", from: { itemId: "a", itemType: "custom", side: "right" }, to: { itemId: "b", itemType: "custom", side: "left" }, label: "Exact source", shape: "straight", stroke: "solid", tip: "arrow" });
const grouped = () => ({ ...empty(), customItems: [card("a"), card("b", 450)], templateTrays: [tray()], connections: [edge()] });

test("tool facts expose relevant rendering changes when switching diagram family", () => {
  const facts = contextBoardAdvisorEditorFacts("freeform", { x: 100, y: 200, width: 900, height: 600, zoom: .5 });
  const actor = facts.cardKinds.find(item => item.kind === "actor");
  assert.equal(actor.displaysDetail, true); assert.equal(actor.diagramOverrides.sequence.displaysDetail, false);
  assert.equal(actor.diagramOverrides.sequence.defaultSize.height, 620); assert.equal(facts.viewport.x, 100);
});

test("new text cards use renderer automatic height and center the complete new diagram in the zoom-adjusted viewport", () => {
  const viewport = { x: 1900, y: 1300, width: 1100, height: 700, zoom: 0.6 };
  const next = applyContextBoardAdvisorPatch(empty(), { addItems: [{ ...card("a", 100), height: 760 }, card("b", 450)], addTrays: [tray()], addConnections: [edge()] }, [], { viewport, diagramType: "c4" });
  assert.equal(next.templateTrays[0].x + next.templateTrays[0].width / 2, viewport.x + viewport.width / 2);
  assert.equal(next.templateTrays[0].y + next.templateTrays[0].height / 2, viewport.y + viewport.height / 2);
  assert.equal(next.customItems[0].height, undefined); assert.ok(contextBoardCustomItemResolvedSize(next.customItems[0]).height < 760);
  assert.equal(next.customItems[0].diagramType, "c4"); assert.equal(next.customItems[1].x - next.customItems[0].x, 350);
  assert.equal(next.connections[0].id, "edge");
});

test("fixed height can return to automatic sizing; explicit positioning and existing manual layout survive", () => {
  const before = grouped(); before.customItems[0].height = 760;
  const next = applyContextBoardAdvisorPatch(before, { updateItems: [{ id: "a", autoSize: true }] });
  assert.equal(next.customItems[0].height, undefined); assert.equal(next.customItems[0].x, 100); assert.equal(before.customItems[0].height, 760);
  const fixed = applyContextBoardAdvisorPatch(empty(), { placement: "as-authored", addItems: [{ ...card("a", 32), autoSize: false, height: 200 }] });
  assert.equal(fixed.customItems[0].x, 32); assert.equal(fixed.customItems[0].height, 200);
});

test("tray movement preserves member and edge identity; explicit member geometry wins", () => {
  const before = grouped(), original = structuredClone(before);
  const next = applyContextBoardAdvisorPatch(before, { updateTrays: [{ id: "group", x: 160, y: 120 }], updateItems: [{ id: "b", x: 700 }] });
  assert.deepEqual([next.customItems[0].x, next.customItems[0].y], [200, 160]); assert.equal(next.customItems[1].x, 700);
  assert.deepEqual(next.connections, before.connections); assert.deepEqual(before, original);
  assert.deepEqual(contextBoardArchitectureContext(next)[0].groups[0].itemIds, ["a", "b"]);
});

test("new groups and requested refits derive frame geometry from actual member sizes without moving cards", () => {
  const before = grouped(); before.customItems[1].detail = "Actual architecture explanation. ".repeat(60);
  const next = applyContextBoardAdvisorPatch(before, { addTrays: [{ id: "fit-group", label: "Additional view boundary", itemIds: ["a", "b"] }] });
  const group = next.templateTrays.find(item => item.id === "fit-group");
  for (const card of next.customItems) { const size = contextBoardCustomItemResolvedSize(card); assert.ok(group.x <= card.x && group.y <= card.y); assert.ok(group.x + group.width >= card.x + size.width); assert.ok(group.y + group.height >= card.y + size.height); }
  assert.deepEqual(next.customItems, before.customItems);
  const refit = applyContextBoardAdvisorPatch(before, { updateTrays: [{ id: "group", autoFit: true }] });
  assert.deepEqual(refit.customItems, before.customItems); assert.ok(refit.templateTrays[0].height > before.templateTrays[0].height);
});

test("card deletion prunes memberships and empty generated groups; removing a frame preserves contents", () => {
  const before = grouped(), one = applyContextBoardAdvisorPatch(before, { removeItemIds: ["a"] });
  assert.deepEqual(one.templateTrays[0].itemIds, ["b"]); assert.equal(one.connections.length, 0);
  assert.equal(applyContextBoardAdvisorPatch(one, { removeItemIds: ["b"] }).templateTrays.length, 0);
  const ungrouped = applyContextBoardAdvisorPatch(before, { removeTrayIds: ["group"] });
  assert.equal(ungrouped.templateTrays.length, 0); assert.deepEqual(ungrouped.customItems, before.customItems); assert.deepEqual(ungrouped.connections, before.connections);
});

test("connector edits retain identity and support clearing relationship data", () => {
  const before = grouped(); before.connections[0].relationship = "dependency";
  const next = applyContextBoardAdvisorPatch(before, { updateConnections: [{ id: "edge", label: "", relationship: "none", stroke: "dashed" }] });
  assert.equal(next.connections[0].id, "edge"); assert.equal(next.connections[0].label, ""); assert.equal(next.connections[0].relationship, undefined);
  assert.equal(next.connections[0].stroke, "dashed"); assert.deepEqual(next.connections[0].from, before.connections[0].from);
});

test("shared arrangement and layer controls operate on admitted objects, including grouped members", () => {
  const before = grouped(); before.customItems.push({ ...card("c", 1000), y: 300 });
  const selected = before.customItems.map(item => ({ id: item.id, itemType: "custom" }));
  const next = applyContextBoardAdvisorPatch(before, { arrangements: [{ action: "align-top", items: selected }, { action: "distribute-horizontal", items: selected }], layers: [{ action: "bring-front", items: [{ id: "a", itemType: "custom" }] }] });
  assert.equal(next.customItems.at(-1).id, "a"); assert.ok(next.customItems.every(item => item.y === 100));
  const sorted = [...next.customItems].sort((a, b) => a.x - b.x); assert.equal(sorted[1].x - sorted[0].x, sorted[2].x - sorted[1].x);
});

test("all invalid group, edge and selection transactions fail atomically", () => {
  const before = grouped(), original = structuredClone(before);
  for (const patch of [{ addTrays: [{ ...tray("new"), itemIds: ["other-view"] }] }, { updateTrays: [{ id: "missing", x: 1 }] },
    { removeTrayIds: ["group", "group"] }, { updateConnections: [{ id: "edge", to: { itemType: "custom", itemId: "missing", side: "left" } }] },
    { arrangements: [{ action: "align-top", items: [{ id: "a", itemType: "custom" }] }] },
    { layers: [{ action: "send-back", items: [{ id: "absent", itemType: "custom" }] }] }, { updateItems: [{ id: "a", autoSize: "yes" }] }]) {
    assert.throws(() => applyContextBoardAdvisorPatch(before, patch)); assert.deepEqual(before, original);
  }
});

test("new tool operations retain other views and exact snapshot undo", () => {
  const first = grouped(), second = { ...empty(), customItems: [card("other")] };
  const document = captureContextBoardDiagrams(first, [{ id: "one", name: "System", description: "Boundaries", diagramType: "c4", snapshot: first }, { id: "two", name: "Other", description: "Retained", diagramType: "dependency", snapshot: second }], "one");
  const next = applyContextBoardAdvisorPatch(document, { updateTrays: [{ id: "group", label: "Updated boundary" }], updateConnections: [{ id: "edge", label: "Read original" }] });
  assert.deepEqual(next.diagrams[1], document.diagrams[1]); assert.deepEqual(captureContextBoardDiagrams(first, next.diagrams, "one"), document);
});


test("origin-relative new groups retain their padding before the complete drawing is centered", () => {
  const viewport = { x: 2200, y: 1400, width: 1200, height: 800, zoom: .8 };
  const next = applyContextBoardAdvisorPatch(empty(), { addItems: [card("a", 0), card("b", 450)],
    addTrays: [{ id: "group", label: "Runtime", itemIds: ["a", "b"], autoFit: true }] }, [], { viewport, diagramType: "c4" });
  const frame = next.templateTrays[0];
  assert.ok(frame.width < 1200 && frame.height < 500, "small groups do not inherit starter-canvas minimum dimensions");
  assert.equal(frame.x + frame.width / 2, viewport.x + viewport.width / 2);
  for (const item of next.customItems) {
    const size = contextBoardCustomItemResolvedSize(item);
    assert.ok(item.x > frame.x && item.y > frame.y);
    assert.ok(item.x + size.width < frame.x + frame.width);
    assert.ok(item.y + size.height < frame.y + frame.height);
  }
});


test("requested frame fitting uses member positions after arrangements in the same atomic edit", () => {
  const next = applyContextBoardAdvisorPatch(empty(), { addItems: [card("a", 100), { ...card("b", 550), y: 600 }],
    addTrays: [{ id: "group", label: "Runtime", itemIds: ["a", "b"], autoFit: true }],
    arrangements: [{ action: "align-top", items: [{ id: "a", itemType: "custom" }, { id: "b", itemType: "custom" }] }] });
  const frame = next.templateTrays[0];
  assert.equal(next.customItems[0].y, next.customItems[1].y);
  assert.equal(frame.height, contextBoardCustomItemResolvedSize(next.customItems[0]).height + 96);
});


test("undo of legacy canvas migration preserves a later manual diagram name or explanation", () => {
  const original = empty(), view = { id: "diagram-main", name: "Diagram 1", description: "", diagramType: "freeform", snapshot: original };
  const restored = { ...original, activeDiagramId: view.id, diagrams: [view] };
  assert.deepEqual(restoreLegacyContextBoardCanvas(restored, true), original);
  for (const metadata of [{ name: "My manual architecture name" }, { description: "Manual explanation after the advisor turn" }]) {
    const changed = { ...restored, diagrams: [{ ...view, ...metadata }] };
    assert.deepEqual(restoreLegacyContextBoardCanvas(changed, true), changed);
  }
  assert.deepEqual(restoreLegacyContextBoardCanvas(restored, false), restored);
});
