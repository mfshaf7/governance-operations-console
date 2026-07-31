import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultOrchestrationDefinitionFilters,
  filterOrchestrationDefinitions,
} from "../../src/domain-workspaces/orchestration/read-model/definitions/orchestration-definition-selectors.ts";
import { orchestrationDefinitionRecords } from "../../src/domain-workspaces/orchestration/read-model/definitions/orchestration-definitions.fixture.ts";
import {
  orchestrationDefinitionAction,
  orchestrationDefinitionInspectorRows,
  orchestrationDefinitionSelectedFacts,
  orchestrationDefinitionSourceDomainOptions,
} from "../../src/domain-workspaces/orchestration/presentation/surfaces/definitions/orchestration-definitions-view-model.ts";
import {
  orchestrationDefinitionInspectorPosture,
  orchestrationDefinitionNodeDetail,
} from "../../src/domain-workspaces/orchestration/presentation/surfaces/definitions/dashboard/definition-dashboard-view-model.ts";

test("Definitions register combines search, state, classification, and source filters", () => {
  const target = orchestrationDefinitionRecords.find(
    (record) => record.lifecycle === "definition-ready",
  );
  assert.ok(target);

  const filtered = filterOrchestrationDefinitions(
    orchestrationDefinitionRecords,
    {
      ...defaultOrchestrationDefinitionFilters,
      classification: "durable-candidate",
      query: "refinement",
      recordState: "definition-ready",
      sourceDomain: "delivery.refinement",
    },
  );

  assert.deepEqual(filtered.map((record) => record.id), [target.id]);
});

test("suspended, retired, and qualification records remain directly filterable", () => {
  assert.deepEqual(
    filterOrchestrationDefinitions(orchestrationDefinitionRecords, {
      ...defaultOrchestrationDefinitionFilters,
      recordState: "suspended",
    }).map((record) => record.lifecycle),
    ["suspended"],
  );
  assert.deepEqual(
    filterOrchestrationDefinitions(orchestrationDefinitionRecords, {
      ...defaultOrchestrationDefinitionFilters,
      recordState: "retired",
    }).map((record) => record.lifecycle),
    ["retired"],
  );
  assert.deepEqual(
    filterOrchestrationDefinitions(orchestrationDefinitionRecords, {
      ...defaultOrchestrationDefinitionFilters,
      recordState: "qualification",
    }).map((record) => record.classification),
    ["synchronous", "conditional"],
  );
});

test("source-domain options are unique, sorted, and include the all option", () => {
  assert.deepEqual(
    orchestrationDefinitionSourceDomainOptions(
      orchestrationDefinitionRecords,
    ),
    [
      { label: "All sources", value: "all" },
      { label: "delivery.refinement", value: "delivery.refinement" },
      { label: "delivery.work-design", value: "delivery.work-design" },
      { label: "proposal", value: "proposal" },
      { label: "prototype", value: "prototype" },
      { label: "repository", value: "repository" },
    ],
  );
});

test("selected definition facts preserve the complete register-to-dashboard context", () => {
  const record = orchestrationDefinitionRecords.find(
    (candidate) => candidate.lifecycle === "definition-ready",
  );
  assert.ok(record);

  assert.deepEqual(
    orchestrationDefinitionSelectedFacts(record).map((fact) => fact.label),
    [
      "Source",
      "Version",
      "Classification",
      "Execution Owner",
      "Implementation Repo",
      "Lifecycle",
    ],
  );
});

test("Definition Dashboard exposes the four locked focused inspectors", () => {
  assert.deepEqual(
    orchestrationDefinitionInspectorRows.map((row) => row.id),
    [
      "trigger-result",
      "failure-controls",
      "evidence-security",
      "version-history",
    ],
  );
});

test("every definition dashboard carries the five independent admission areas", () => {
  const expectedAreas = [
    "implementation",
    "validation",
    "platform",
    "security",
    "runtime",
  ];

  for (const record of orchestrationDefinitionRecords) {
    assert.deepEqual(
      record.admissionChecks.map((check) => check.area),
      expectedAreas,
    );
  }
});

test("active versions remain immutable while suspended and retired versions are read only", () => {
  const active = orchestrationDefinitionRecords.find(
    (record) => record.lifecycle === "active",
  );
  const suspended = orchestrationDefinitionRecords.find(
    (record) => record.lifecycle === "suspended",
  );
  const retired = orchestrationDefinitionRecords.find(
    (record) => record.lifecycle === "retired",
  );
  assert.ok(active);
  assert.ok(suspended);
  assert.ok(retired);

  assert.deepEqual(orchestrationDefinitionAction(active), {
    actionLabel: "Draft New Version",
    description:
      "New runs keep using this version until a separately admitted candidate replaces it.",
    disabled: false,
    statusLabel: "Synthetic",
    title: "Immutable active version",
    tone: "info",
  });
  assert.equal(orchestrationDefinitionAction(suspended).actionLabel, null);
  assert.equal(
    orchestrationDefinitionAction(suspended).statusLabel,
    "Read only",
  );
  assert.equal(orchestrationDefinitionAction(retired).actionLabel, null);
  assert.equal(
    orchestrationDefinitionAction(retired).statusLabel,
    "Read only",
  );
});

test("dashboard node and inspector projections derive from structured definition truth", () => {
  const record = orchestrationDefinitionRecords.find(
    (candidate) => candidate.lifecycle === "definition-ready",
  );
  assert.ok(record);
  assert.ok(record.executionNodes[0]);

  assert.equal(
    orchestrationDefinitionNodeDetail(record.executionNodes[0]),
    "Operator Orchestration Service / No dependencies",
  );
  assert.deepEqual(
    orchestrationDefinitionInspectorPosture(record, "version-history"),
    { label: "1 version", tone: "info" },
  );
  assert.deepEqual(
    orchestrationDefinitionInspectorPosture(record, "evidence-security"),
    { label: "4 requirements", tone: "info" },
  );
});

test("definition register projections do not mutate fixture truth", () => {
  const before = structuredClone(orchestrationDefinitionRecords);

  filterOrchestrationDefinitions(orchestrationDefinitionRecords, {
    classification: "all",
    query: "prototype",
    recordState: "all",
    sourceDomain: "all",
  });
  for (const record of orchestrationDefinitionRecords) {
    orchestrationDefinitionSelectedFacts(record);
    orchestrationDefinitionAction(record);
  }

  assert.deepEqual(orchestrationDefinitionRecords, before);
});
