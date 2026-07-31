import type { OperationCommandRunState } from "../../../../operation-runtime/index.ts";

export type PrototypeLandingSimulationPlan = {
  basePlatform: string;
  blockedItems: string[];
  draftKey: string;
  evidenceCount: number;
  launchAdapter: string;
  setupItems: string[];
  sourceRef: string;
  supportRows: Array<{
    id: string;
    label: string;
    state: string;
  }>;
  validationCheckCount: number;
};

export type PrototypeLandingSimulationOutcome = {
  blockers: string[];
  progress: Array<{
    state: OperationCommandRunState;
    summary: string;
  }>;
  state: Extract<OperationCommandRunState, "blocked" | "completed">;
  summary: string;
};

export function evaluatePrototypeLandingSimulation(
  plan: PrototypeLandingSimulationPlan,
): PrototypeLandingSimulationOutcome {
  const blockedSupportRows = plan.supportRows.filter(
    (row) => row.state === "blocked",
  );
  const blockers = [
    ...plan.blockedItems,
    ...blockedSupportRows.map((row) => `${row.label} is blocked.`),
  ];
  const state = blockers.length > 0 ? "blocked" : "completed";
  const summary =
    state === "completed"
      ? "Prototype-local landing setup finished and is ready to record."
      : `Prototype-local landing setup found ${blockers.length} blocker${blockers.length === 1 ? "" : "s"}.`;

  return {
    blockers,
    progress: [
      {
        state: "running",
        summary: `Retained ${plan.sourceRef} as the landing source.`,
      },
      {
        state: "running",
        summary: `Evaluated ${plan.supportRows.length} support rows.`,
      },
      {
        state: "running",
        summary: `Prepared ${plan.setupItems.length} setup items for ${plan.basePlatform}.`,
      },
      {
        state: "running",
        summary: `Resolved preview adapter ${plan.launchAdapter}.`,
      },
      {
        state: "running",
        summary: `Retained ${plan.validationCheckCount} validation checks and ${plan.evidenceCount} evidence refs.`,
      },
    ],
    state,
    summary,
  };
}
