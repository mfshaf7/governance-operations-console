import type {
  RepositoryWorkspaceReadModel,
  RepositoryWorkspaceSummaryMetric,
} from "../../domain/repository-types.ts";

export const repositoryWorkspaceSource: RepositoryWorkspaceReadModel["source"] =
  {
    lastRead: "2026-05-10 design mock",
    mutationGateway: "future OOS / WGCF workflow",
    project: "Workspace Repository Registry",
    readModel:
      "workspace-governance contracts + synthetic repository scenarios",
    recordSystem: "workspace-governance contracts + GitHub",
  };

export const repositoryWorkspaceSummary: RepositoryWorkspaceSummaryMetric[] = [
  { id: "total", label: "Total", value: "12", tone: "info" },
  { id: "ready", label: "Ready", value: "1", tone: "warn" },
  { id: "admitted", label: "Admitted", value: "10", tone: "ok" },
  { id: "blocked", label: "Blocked", value: "0", tone: "danger" },
  { id: "retired", label: "Retired", value: "1", tone: "muted" },
];

export const repositoryWorkspaceStatus: RepositoryWorkspaceReadModel["workspaceStatus"] =
  {
    ariaLabel: "Repository control status",
    items: [
      {
        detail:
          "Repository records in this prototype are seeded from workspace-governance contract truth and curated synthetic scenarios.",
        facts: [
          {
            label: "Read model",
            value: "contract-shaped fixtures + synthetic scenarios",
          },
          { label: "Future source", value: "workspace-governance + GitHub" },
        ],
        id: "source",
        label: "Source",
        state: "local",
        tone: "info",
      },
      {
        detail:
          "Repository request, admission, and retire actions remain prototype-local until OOS/WGCF admits a repository workflow API.",
        facts: [
          { label: "Mutation", value: "prototype-local only" },
          { label: "Gateway", value: "future OOS / WGCF" },
        ],
        id: "write-path",
        label: "Write Path",
        state: "local",
        tone: "warn",
      },
      {
        detail:
          "Dev-integration profile activation and governed stage/runtime admission are separate surfaces; Repository Control only records the runtime-lane decision.",
        facts: [
          { label: "Repo admission", value: "workspace-governance contracts" },
          { label: "Runtime profile", value: "platform/security profile path" },
        ],
        id: "boundary",
        label: "Boundary",
        state: "local",
        tone: "warn",
      },
    ],
    kicker: "Repository Status",
    statusLabel: "Prototype-local",
    summary:
      "Repository control reads contract-shaped repository admission records. Runtime profile and stage admission stay outside this surface.",
    title: "Repository control status",
    tone: "warn",
  };
