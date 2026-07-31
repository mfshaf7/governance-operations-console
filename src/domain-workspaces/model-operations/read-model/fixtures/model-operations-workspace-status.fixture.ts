import type { OperationSurfaceStatusModel } from "../../../operation-projections/index.ts";

export const modelOperationsWorkspaceStatus: OperationSurfaceStatusModel = {
  ariaLabel: "Model Operations workspace status",
  detailDataAttribute: "data-model-operations-status-modal",
  items: [
    {
      detail:
        "The prototype projection is shaped from the current Platform Engineering profile registry contract.",
      facts: [
        {
          label: "Source",
          value:
            "platform-engineering/security/governed-ai-model-profiles.yaml",
        },
        { label: "Schema", value: "1" },
        { label: "Live API", value: "not available" },
      ],
      id: "registry",
      label: "Registry",
      state: "local",
      tone: "info",
    },
    {
      detail:
        "The access-plane runtime shape exists in dev-integration, but live profile activation is explicitly disallowed.",
      facts: [
        { label: "Gateway", value: "governed-ai-gateway" },
        { label: "Status", value: "devint-runtime-defined" },
        { label: "Activation", value: "blocked" },
      ],
      id: "access-plane",
      label: "Access Plane",
      state: "blocked",
      tone: "warn",
    },
    {
      detail:
        "No admitted OOS request API, review projection, fulfillment command, or reconciliation receipt exists for profile changes.",
      facts: [
        { label: "Request API", value: "not implemented" },
        { label: "Workflow owner", value: "OOS after admission" },
        { label: "Registry mutation", value: "Platform Engineering only" },
      ],
      id: "request-path",
      label: "Request Path",
      state: "blocked",
      tone: "warn",
    },
  ],
  kicker: "Workspace Status",
  statusLabel: "Attention",
  summary:
    "Governed profile policy is available as a contract snapshot; activation and profile requests remain unavailable.",
  title: "Model Operations requires attention",
  tone: "warn",
};
