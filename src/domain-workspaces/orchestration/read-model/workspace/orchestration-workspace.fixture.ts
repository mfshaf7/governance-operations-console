import type { OperationSurfaceStatusModel } from "../../../operation-contracts/surface-status.ts";
import { orchestrationDefinitionRecords } from "../definitions/orchestration-definitions.fixture.ts";
import { orchestrationRunRecords } from "../runs/orchestration-runs.fixture.ts";
import {
  orchestrationAttentionQueue,
  orchestrationInFlightRuns,
  orchestrationMaterialEvents,
  orchestrationWorkspaceSummary,
} from "./orchestration-workspace-selectors.ts";
import type {
  OrchestrationScenarioCoverage,
  OrchestrationWorkspaceReadModel,
} from "./orchestration-workspace-types.ts";

const observedAt = "2026-07-16T10:00:00.000Z";

export const orchestrationWorkspaceStatus: OperationSurfaceStatusModel = {
  ariaLabel: "Orchestration workspace status",
  detailDataAttribute: "data-orchestration-status-modal",
  items: [
    {
      detail:
        "OOS has bounded operator workflow routes, but no admitted durable definition, run, control, event, or receipt API.",
      facts: [
        { label: "Authority", value: "Operator Orchestration Service" },
        { label: "Durable API", value: "not admitted" },
        { label: "Console write path", value: "unavailable" },
      ],
      id: "oos",
      label: "OOS API",
      state: "blocked",
      tone: "warn",
    },
    {
      detail:
        "Definition records are contract-derived or synthetic and remain owned by this prototype.",
      facts: [
        { label: "Mode", value: "prototype fixture" },
        { label: "Live catalog", value: "not connected" },
        { label: "Definition ready", value: "delivery.refinement.apply v1" },
      ],
      id: "catalog",
      label: "Catalog",
      state: "local",
      tone: "info",
    },
    {
      detail:
        "Run records are synthetic scenario projections for UI and contract validation only.",
      facts: [
        { label: "Mode", value: "synthetic scenario" },
        { label: "Live runs", value: "none" },
        { label: "Projection freshness", value: "current fixture" },
      ],
      id: "projection",
      label: "Run Projection",
      state: "local",
      tone: "info",
    },
    {
      detail:
        "No durable runtime adapter, worker, persistence, or admitted execution path is connected.",
      facts: [
        { label: "Worker", value: "not available" },
        { label: "Runtime adapter", value: "not admitted" },
        { label: "Controls", value: "prototype simulation only" },
      ],
      id: "execution",
      label: "Execution",
      state: "blocked",
      tone: "warn",
    },
  ],
  kicker: "Workspace Status",
  statusLabel: "Prototype",
  summary:
    "Definition truth is contract-derived and run truth is synthetic; live durable execution remains unavailable.",
  title: "Orchestration is prototype-local",
  tone: "warn",
};

export const orchestrationScenarioCoverage: OrchestrationScenarioCoverage[] = [
  coverage(
    "definition-synchronous",
    "Synchronous qualification",
    "definition",
    "orchestration-definition-qualification-proposal-capture",
  ),
  coverage(
    "definition-conditional",
    "Conditional qualification",
    "definition",
    "orchestration-definition-qualification-proposal-handoff",
  ),
  coverage(
    "definition-durable-qualification",
    "Durable candidate under qualification",
    "definition",
    "orchestration-definition-candidate-repository-onboarding",
  ),
  coverage(
    "definition-ready",
    "Definition ready for implementation request",
    "definition",
    "orchestration-definition-delivery-refinement-apply-v1",
  ),
  coverage(
    "definition-admission-review",
    "Definition in admission review",
    "definition",
    "orchestration-definition-scenario-admission-review",
  ),
  coverage(
    "definition-active",
    "Active definition version",
    "definition",
    "orchestration-definition-scenario-active",
  ),
  coverage(
    "definition-suspended",
    "Suspended definition version",
    "definition",
    "orchestration-definition-scenario-suspended",
  ),
  coverage(
    "definition-retired",
    "Retired definition version",
    "definition",
    "orchestration-definition-scenario-retired",
  ),
  coverage(
    "run-queued",
    "Queued run with no effects",
    "run",
    "orchestration-run-scenario-queued",
  ),
  coverage(
    "run-running",
    "Running run with possible effects",
    "run",
    "orchestration-run-scenario-running",
  ),
  coverage(
    "run-waiting",
    "Healthy structured wait",
    "run",
    "orchestration-run-scenario-waiting",
  ),
  coverage(
    "run-blocked",
    "Blocked run with partial effects",
    "run",
    "orchestration-run-scenario-blocked",
  ),
  coverage(
    "run-failed",
    "Failed run with retry available",
    "run",
    "orchestration-run-scenario-failed",
  ),
  coverage(
    "run-completed",
    "Completed run with verified effects",
    "run",
    "orchestration-run-scenario-completed",
  ),
  coverage(
    "run-cancelled",
    "Cancelled run with retained effects",
    "run",
    "orchestration-run-scenario-cancelled",
  ),
];

export const orchestrationWorkspaceFixture: OrchestrationWorkspaceReadModel = {
  attention: orchestrationAttentionQueue({
    definitions: orchestrationDefinitionRecords,
    now: observedAt,
    runs: orchestrationRunRecords,
  }),
  definitions: orchestrationDefinitionRecords,
  inFlightRuns: orchestrationInFlightRuns(orchestrationRunRecords, observedAt),
  materialEvents: orchestrationMaterialEvents(orchestrationRunRecords),
  runs: orchestrationRunRecords,
  scenarioCoverage: orchestrationScenarioCoverage,
  summary: orchestrationWorkspaceSummary({
    definitions: orchestrationDefinitionRecords,
    runs: orchestrationRunRecords,
  }),
  workspaceStatus: orchestrationWorkspaceStatus,
};

function coverage(
  id: string,
  label: string,
  kind: OrchestrationScenarioCoverage["kind"],
  recordId: string,
): OrchestrationScenarioCoverage {
  return {
    id,
    kind,
    label,
    recordId,
    sourceMode: "synthetic-or-contract-derived",
  };
}
