import test from "node:test";
import assert from "node:assert/strict";
import { assessFeatureDeliveryTarget, findPIPlanningDependencyConflict, previewPIPlansForEpic } from "../../src/domain-workspaces/delivery/local-runtime/projections/pi-planning-preview.ts";

import { activeIterationsForPi } from "../../src/domain-workspaces/delivery/work-model/catalog/catalog-selectors.ts";
import { deliveryCatalogValueFixtures } from "../../src/domain-workspaces/delivery/read-model/fixtures/catalog/values.fixture.ts";

const pi = "PI-2026-04";
const first = pi + " / Iteration 1";
const second = pi + " / Iteration 2";
const search = { id: "82/search", number: 82, title: "Search repositories", dependencies: [81, 200] };
const list = { id: "81/list", number: 81, title: "Read repository list", dependencies: [] };
const scheduled = (epicId, itemId, iteration) => ({ epicId, itemId, iteration });

test("shared PI review respects cross-Epic prerequisites and iteration order", () => {
  const assignments = { [search.id]: scheduled(82, "search", first), [list.id]: scheduled(81, "list", second) };
  assert.deepEqual(findPIPlanningDependencyConflict([search, list], [first, second], pi, assignments, new Set([search.id])), { item: search, prerequisite: list });
  const canonicalSearch = { ...search, currentPI: pi, currentIteration: first };
  assert.deepEqual(findPIPlanningDependencyConflict([canonicalSearch, list], [first, second], pi, { [list.id]: assignments[list.id] }, new Set([list.id])), { item: canonicalSearch, prerequisite: list });
  assignments[search.id] = scheduled(82, "search", second);
  assert.equal(findPIPlanningDependencyConflict([search, list], [first, second], pi, assignments, new Set([search.id])), null);
});

test("work boards receive only their Epic's assignments and preserve the individual iteration", () => {
  const plans = { [pi]: { pi, objectives: {}, assignments: {
    [list.id]: scheduled(81, "list", first), [search.id]: scheduled(82, "search", second),
  } } };
  assert.deepEqual(previewPIPlansForEpic(plans, 82), [{ pi, assignments: [scheduled(82, "search", second)], objective: undefined }]);
  assert.deepEqual(previewPIPlansForEpic(plans, 99), []);
});


test("planning shows every active PI iteration even when the owner does not project a parent field", () => {
  const iterations = activeIterationsForPi(deliveryCatalogValueFixtures, pi);
  assert.deepEqual(iterations.map(value => value.value_key), [
    first, second, pi + " / Iteration 3",
  ]);
  const [one, two, three] = iterations;
  assert.deepEqual(activeIterationsForPi([
    { ...one, parent_catalog_value_key: null },
    { ...two, parent_catalog_value_key: "PI-2026-03" },
    { ...three, lifecycle_state: "retired" },
  ], pi).map(value => value.value_key), [first]);
});


test("Feature delivery targets follow child work across iterations", () => {
  const feature = { id: "100/feature", type: "Feature", status: "ready" };
  const story = { id: "100/story", type: "User story", status: "done", currentPI: pi, currentIteration: first };
  const defect = { id: "100/defect", type: "Defect", status: "ready" };
  const deferred = { id: "100/deferred", type: "Task", status: "parked" };
  const children = [story, defect, deferred];
  const assignments = { [feature.id]: scheduled(100, "feature", first) };
  assert.deepEqual(assessFeatureDeliveryTarget(feature, children, [first, second], { pi, assignments }), {
    inScope: 2, unplanned: 1, complete: 1, target: first, latest: first, earlier: false, later: false,
  });
  assignments[defect.id] = scheduled(100, "defect", second);
  assert.equal(assessFeatureDeliveryTarget(feature, children, [first, second], { pi, assignments }).earlier, true);
  assignments[feature.id] = scheduled(100, "feature", second);
  assignments[defect.id] = scheduled(100, "defect", first);
  const forecast = assessFeatureDeliveryTarget(feature, children, [first, second], { pi, assignments });
  assert.equal(forecast.latest, first);
  assert.equal(forecast.later, true);
  assert.equal(forecast.unplanned, 0);
});
