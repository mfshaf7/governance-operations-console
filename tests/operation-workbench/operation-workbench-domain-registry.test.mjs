import assert from "node:assert/strict";
import test from "node:test";

import {
  getOperationWorkbenchDomainId,
  operationWorkbenchDomainIds,
  operationWorkbenchDomainRegistry,
  operationWorkbenchPathLabels,
} from "../../src/operation-workbench/operation-workbench-domain-registry.ts";
import {
  operationWorkbenchSelectorEntries,
} from "../../src/operation-workbench/operation-workbench-selector-model.ts";

const expectedRegistry = [
  { domain: "proposal", label: "PROPOSAL" },
  { domain: "repository", label: "REPOSITORY" },
  { domain: "model-operations", label: "MODEL" },
  { domain: "delivery", label: "DELIVERY" },
  { domain: "prototype", label: "PROTOTYPE" },
  { domain: "portfolio", label: "PORTFOLIO" },
  { domain: "orchestration", label: "ORCHESTRATION" },
];

test("Operation Workbench registry has one stable label for every domain", () => {
  assert.deepEqual(operationWorkbenchDomainRegistry, expectedRegistry);
  assert.deepEqual(
    operationWorkbenchDomainIds,
    expectedRegistry.map(({ domain }) => domain),
  );
  assert.equal(new Set(operationWorkbenchDomainIds).size, expectedRegistry.length);
  assert.equal(
    new Set(operationWorkbenchDomainRegistry.map(({ label }) => label)).size,
    expectedRegistry.length,
  );
});

test("every selector label resolves to its registered domain", () => {
  for (const entry of operationWorkbenchDomainRegistry) {
    assert.equal(getOperationWorkbenchDomainId(entry.label), entry.domain);
  }

  assert.deepEqual(operationWorkbenchPathLabels, {
    delivery: "DELIVERY",
    modelOperations: "MODEL",
    orchestration: "ORCHESTRATION",
    portfolio: "PORTFOLIO",
    proposal: "PROPOSAL",
    prototype: "PROTOTYPE",
    repository: "REPOSITORY",
  });
});

test("selector identity is projected from the registry", () => {
  assert.deepEqual(
    operationWorkbenchSelectorEntries.map(({ domain, label }) => ({ domain, label })),
    expectedRegistry,
  );
});

test("unknown selector labels fail instead of opening a placeholder", () => {
  assert.throws(
    () => getOperationWorkbenchDomainId("UNKNOWN"),
    /Unknown Operation Workbench path label/,
  );
});
