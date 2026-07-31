import type {
  DevIntegrationExpectedWriteClass,
  DevIntegrationLaneClass,
  DevIntegrationRuntimeStateModel,
  DevIntegrationSecurityTrigger,
} from "../model/dev-integration-profile.ts";

export type DevIntegrationRequestOption<TValue extends string> = Readonly<{
  label: string;
  value: TValue;
}>;

export const devIntegrationRequestOptions = {
  dependencyRefs: [
    "openproject",
    "operator-orchestration-service",
    "platform-engineering",
    "security-architecture",
    "workspace-governance",
    "workspace-governance-control-fabric",
  ],
  expectedWriteClasses: [
    { label: "No writes", value: "none" },
    { label: "Prototype local", value: "prototype-local" },
    { label: "External sandbox", value: "external-sandbox" },
    { label: "Canonical backend", value: "canonical-backend" },
  ] satisfies readonly DevIntegrationRequestOption<DevIntegrationExpectedWriteClass>[],
  laneClasses: [
    { label: "Governed dev integration", value: "governed-devint" },
    { label: "Integration dev environment", value: "integration-devint" },
    { label: "Prototype dev environment", value: "prototype-devint" },
  ] satisfies readonly DevIntegrationRequestOption<DevIntegrationLaneClass>[],
  ownerRepos: [
    "context-governance-gateway",
    "operator-orchestration-service",
    "platform-engineering",
    "workspace-governance-control-fabric",
    "workspace-prototype-studio",
  ],
  participatingRepos: [
    "context-governance-gateway",
    "operator-orchestration-service",
    "platform-engineering",
    "security-architecture",
    "workspace-governance",
    "workspace-governance-control-fabric",
    "workspace-prototype-studio",
  ],
  runtimePlatforms: ["local-k3s", "local-process", "local-wsl"],
  runtimeStateModels: [
    { label: "Disposable", value: "disposable" },
    { label: "Persistent", value: "persistent" },
  ] satisfies readonly DevIntegrationRequestOption<DevIntegrationRuntimeStateModel>[],
  securityTriggers: [
    { label: "Identity", value: "identity" },
    { label: "Secrets", value: "secrets" },
    { label: "Runtime privilege", value: "runtime-privilege" },
    { label: "AI review", value: "ai-review" },
  ] satisfies readonly DevIntegrationRequestOption<DevIntegrationSecurityTrigger>[],
} as const;
