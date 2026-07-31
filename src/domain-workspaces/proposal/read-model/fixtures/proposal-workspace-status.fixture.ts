import type { OperationSurfaceStatusModel } from "../../../operation-projections/index.ts";

export const proposalWorkspaceStatus: OperationSurfaceStatusModel = {
  ariaLabel: "Proposal workspace status details",
  detailDataAttribute: "data-proposal-status-modal",
  items: [
    {
      detail:
        "Proposal records are curated read-model scenarios shaped for the future backend proposal projection.",
      facts: [
        { label: "Read Path", value: "local scenario" },
        { label: "Backend State", value: "not connected" },
        { label: "Source Truth", value: "Proposal read-model fixtures" },
        { label: "Ingress", value: "console / API / agent / system" },
      ],
      id: "backend",
      label: "Read Model",
      state: "local",
      tone: "info",
    },
    {
      detail: "The curated proposal scenario set is current for this preview.",
      facts: [
        { label: "Status", value: "current scenario" },
        { label: "Checked", value: "2026-06-21 09:42" },
        { label: "Cursor", value: "proposal-projection-local-007" },
        {
          label: "Read Detail",
          value:
            "Console, API, agent, and system-fed records share one read state.",
        },
      ],
      id: "projection",
      label: "Read State",
      state: "local",
      tone: "info",
    },
    {
      detail:
        "Console-created proposal records stay in this preview until backend create and update are wired.",
      facts: [
        { label: "Create Path", value: "preview-only" },
        { label: "Backend Write", value: "not connected" },
        { label: "Draft Scope", value: "proposal preview" },
        { label: "Durable Mutation", value: "not connected" },
      ],
      id: "write-path",
      label: "Write Path",
      state: "local",
    },
    {
      detail:
        "Route and handoff orchestration is represented locally until OOS proposal movement wiring is admitted.",
      facts: [
        { label: "Boundary", value: "local until OOS admits writes" },
        { label: "Route Authority", value: "OOS when admitted" },
        { label: "Workflow Role", value: "proposal movement boundary" },
        { label: "Mutation Scope", value: "handoff preview only" },
      ],
      id: "oos",
      label: "OOS",
      state: "local",
    },
  ],
  kicker: "Workspace Status",
  statusLabel: "local",
  summary:
    "Proposal uses curated read-model scenarios; console create and handoff receipts remain prototype-local until command paths are admitted.",
  title: "Proposal workspace is local-write",
  tone: "warn",
};
