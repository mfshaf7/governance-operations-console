import {
  assertDevIntegrationProfile,
  type DevIntegrationPersistentConfiguration,
  type DevIntegrationProfile,
  type DevIntegrationStageHandoffCheck,
  type DevIntegrationStageHandoffCheckResult,
} from "../model/dev-integration-profile.ts";

const persistentRuntime: DevIntegrationPersistentConfiguration = {
  cutoverPlan:
    "Replace the prior disposable lane only after retained state is backed up.",
  destructiveResetSemantics:
    "Reset removes the local database and rebuilds the profile runtime.",
  disposableCompanionProfileId: null,
  justification:
    "Operator workflow and receipt data must survive normal suspend and resume.",
  retainedDataScope: "Local API metadata, database state, and receipt evidence.",
  sharedSmokeMutationMode: "read-only",
  storageRequirement: "Local k3s persistent volume, 10 GiB.",
  suspendResumeSemantics:
    "Suspend removes active workloads while preserving declared project data.",
};

const governanceControlFabricHandoffChecks = [
  {
    description: "Confirm the admitted local API responds.",
    id: "api-readiness",
    label: "API readiness",
  },
  {
    description: "Confirm the current local database migration state.",
    id: "database-migration",
    label: "Database migration",
  },
  {
    description: "Confirm the validation planner completes a dry run.",
    id: "validation-planner-dry-run",
    label: "Validation planner dry run",
  },
] as const satisfies readonly DevIntegrationStageHandoffCheck[];

const ideaWorkflowHandoffChecks = [
  {
    description: "Confirm the local broker path is ready.",
    id: "broker-readiness",
    label: "Broker readiness",
  },
  {
    description: "Confirm proposal capture completes against the local broker.",
    id: "proposal-capture-smoke",
    label: "Proposal capture smoke",
  },
] as const satisfies readonly DevIntegrationStageHandoffCheck[];

const activationHandoffChecks = [
  {
    description: "Confirm the admitted profile completes its activation smoke.",
    id: "activation-smoke",
    label: "Activation smoke",
  },
] as const satisfies readonly DevIntegrationStageHandoffCheck[];

function passedHandoffResults(
  checks: readonly DevIntegrationStageHandoffCheck[],
  evidenceBase: string,
): readonly DevIntegrationStageHandoffCheckResult[] {
  return checks.map((check) => ({
    checkId: check.id,
    evidenceRef: `${evidenceBase}/${check.id}`,
    status: "passed",
  }));
}

function profile<T extends DevIntegrationProfile>(value: T): T {
  assertDevIntegrationProfile(value);
  return value;
}

export const devIntegrationProfileFixtures = [
  profile({
    actions: [
      "up",
      "status",
      "access",
      "smoke",
      "down",
      "reset",
      "promote-check",
    ],
    admissionRefs: [
      "repo://platform-engineering/docs/records/change-records/governance-control-fabric-devint-runtime-access",
    ],
    dependencies: ["workspace-governance", "platform-engineering"],
    expectedWrites: {
      classification: "prototype-local",
      targets: ["local PostgreSQL metadata store"],
    },
    laneClass: "governed-devint",
    lifecycle: "active",
    nextMove: {
      actionId: "review-stage-handoff",
      label: "Review stage handoff",
      ownerRef: "workspace-governance-control-fabric",
      reason: "The local runtime is active and its handoff evidence is ready.",
    },
    ownerRepo: "workspace-governance-control-fabric",
    participatingRepos: [
      "workspace-governance-control-fabric",
      "workspace-governance",
      "platform-engineering",
    ],
    persistence: persistentRuntime,
    profileId: "governance-control-fabric",
    purpose:
      "Provide the local API and metadata runtime used for governance-control iteration.",
    requestRecordRef: "openproject://work_packages/475",
    runtime: {
      observation: {
        observedAt: "2026-07-26T08:00:00Z",
        sourceRef: "devint://governance-control-fabric/status/20260726T080000Z",
        state: "running",
      },
      platform: "local-k3s",
      stateModel: "persistent",
    },
    securityOwner: "security-architecture",
    securityTriggers: ["identity", "secrets"],
    source: {
      observedAt: "2026-07-26T08:00:00Z",
      provenance: "authority-snapshot",
      ref: "workspace-governance://developer-integration-profiles/governance-control-fabric",
      source: "workspace-governance",
      version: "1",
    },
    stageHandoff: {
      checkResults: passedHandoffResults(
        governanceControlFabricHandoffChecks,
        "devint://governance-control-fabric/promotion-report/latest/checks",
      ),
      governedSurface: "workspace-governance-control-fabric-stage",
      ownerRepo: "platform-engineering",
      promotionReportRef:
        "devint://governance-control-fabric/promotion-report/latest",
      requiredChecks: governanceControlFabricHandoffChecks,
      result: "ready",
      sessionManifestRef:
        "devint://governance-control-fabric/session/current",
      smokeSummaryRef:
        "devint://governance-control-fabric/smoke/latest",
    },
  }),
  profile({
    actions: [
      "up",
      "status",
      "access",
      "smoke",
      "down",
      "reset",
      "promote-check",
    ],
    admissionRefs: ["github://platform-engineering/pull/idea-workflow-admission"],
    dependencies: ["openproject", "operator-orchestration-service"],
    expectedWrites: {
      classification: "external-sandbox",
      targets: ["local OpenProject proposal project"],
    },
    laneClass: "integration-devint",
    lifecycle: "active",
    nextMove: {
      actionId: "up",
      label: "Start local runtime",
      ownerRef: "operator-orchestration-service",
      reason: "The active disposable profile is currently stopped.",
    },
    ownerRepo: "operator-orchestration-service",
    participatingRepos: [
      "operator-orchestration-service",
      "platform-engineering",
    ],
    persistence: null,
    profileId: "idea-workflow",
    purpose: "Rehearse proposal capture and triage against the local broker.",
    requestRecordRef: "openproject://work_packages/222",
    runtime: {
      observation: {
        observedAt: "2026-07-26T07:45:00Z",
        sourceRef: "devint://idea-workflow/status/20260726T074500Z",
        state: "stopped",
      },
      platform: "local-k3s",
      stateModel: "disposable",
    },
    securityOwner: "security-architecture",
    securityTriggers: ["identity"],
    source: {
      observedAt: "2026-07-26T07:45:00Z",
      provenance: "authority-snapshot",
      ref: "workspace-governance://developer-integration-profiles/idea-workflow",
      source: "workspace-governance",
      version: "1",
    },
    stageHandoff: {
      checkResults: [],
      governedSurface: "idea-workflow-stage",
      ownerRepo: "platform-engineering",
      promotionReportRef: null,
      requiredChecks: ideaWorkflowHandoffChecks,
      result: "not-run",
      sessionManifestRef: null,
      smokeSummaryRef: null,
    },
  }),
] as const satisfies readonly DevIntegrationProfile[];

export const devIntegrationProfileScenarioFixtures = [
  profile({
    actions: [],
    admissionRefs: [],
    dependencies: ["platform-engineering"],
    expectedWrites: {
      classification: "none",
      targets: [],
    },
    laneClass: "prototype-devint",
    lifecycle: "proposed",
    nextMove: {
      actionId: "owner-review",
      label: "Confirm profile ownership",
      ownerRef: "workspace-prototype-studio",
      reason: "The profile request exists but has not been build-admitted.",
    },
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["workspace-prototype-studio"],
    persistence: null,
    profileId: "environment-lifecycle-preview",
    purpose: "Exercise the Environment Lifecycle prototype locally.",
    requestRecordRef: "openproject://work_packages/synthetic-env-101",
    runtime: {
      observation: {
        observedAt: null,
        sourceRef: null,
        state: "unavailable",
      },
      platform: "local-k3s",
      stateModel: "disposable",
    },
    securityOwner: "security-architecture",
    securityTriggers: [],
    source: {
      observedAt: "2026-07-26T08:10:00Z",
      provenance: "synthetic-scenario",
      ref: "synthetic://dev-integration-profile/environment-lifecycle-preview",
      source: "environment-lifecycle-fixtures",
      version: "1",
    },
    stageHandoff: {
      checkResults: [],
      governedSurface: "unavailable",
      ownerRepo: "platform-engineering",
      promotionReportRef: null,
      requiredChecks: [],
      result: "not-run",
      sessionManifestRef: null,
      smokeSummaryRef: null,
    },
  }),
  profile({
    actions: ["status", "down", "reset", "promote-check"],
    admissionRefs: ["synthetic://platform/build-admission/env-102"],
    dependencies: ["workspace-governance", "platform-engineering"],
    expectedWrites: {
      classification: "prototype-local",
      targets: ["local profile metadata"],
    },
    laneClass: "governed-devint",
    lifecycle: "build-admitted",
    nextMove: {
      actionId: "complete-activation",
      label: "Complete activation checks",
      ownerRef: "platform-engineering",
      reason: "Implementation is admitted but self-serve launch is still denied.",
    },
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: [
      "workspace-prototype-studio",
      "platform-engineering",
    ],
    persistence: persistentRuntime,
    profileId: "synthetic-build-admitted",
    purpose: "Prove build-admitted projection without implying launchability.",
    requestRecordRef: "synthetic://request/env-102",
    runtime: {
      observation: {
        observedAt: null,
        sourceRef: null,
        state: "unknown",
      },
      platform: "local-k3s",
      stateModel: "persistent",
    },
    securityOwner: "security-architecture",
    securityTriggers: ["secrets"],
    source: {
      observedAt: "2026-07-26T08:11:00Z",
      provenance: "synthetic-scenario",
      ref: "synthetic://dev-integration-profile/build-admitted",
      source: "environment-lifecycle-fixtures",
      version: "1",
    },
    stageHandoff: {
      checkResults: [],
      governedSurface: "synthetic-stage",
      ownerRepo: "platform-engineering",
      promotionReportRef: null,
      requiredChecks: activationHandoffChecks,
      result: "not-run",
      sessionManifestRef: null,
      smokeSummaryRef: null,
    },
  }),
  profile({
    actions: ["status", "down", "reset", "promote-check"],
    admissionRefs: ["synthetic://platform/activation/env-103"],
    dependencies: ["platform-engineering"],
    expectedWrites: {
      classification: "none",
      targets: [],
    },
    laneClass: "integration-devint",
    lifecycle: "suspended",
    nextMove: {
      actionId: "review-suspension",
      label: "Review suspension",
      ownerRef: "platform-engineering",
      reason: "Normal self-serve launch is unavailable while suspended.",
    },
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["workspace-prototype-studio"],
    persistence: null,
    profileId: "synthetic-suspended",
    purpose: "Prove suspended profile behavior.",
    requestRecordRef: "synthetic://request/env-103",
    runtime: {
      observation: {
        observedAt: "2026-07-26T07:00:00Z",
        sourceRef: "synthetic://status/env-103",
        state: "stopped",
      },
      platform: "local-k3s",
      stateModel: "disposable",
    },
    securityOwner: "security-architecture",
    securityTriggers: [],
    source: {
      observedAt: "2026-07-26T08:12:00Z",
      provenance: "synthetic-scenario",
      ref: "synthetic://dev-integration-profile/suspended",
      source: "environment-lifecycle-fixtures",
      version: "1",
    },
    stageHandoff: {
      checkResults: [],
      governedSurface: "synthetic-stage",
      ownerRepo: "platform-engineering",
      promotionReportRef: null,
      requiredChecks: [],
      result: "stale",
      sessionManifestRef: "synthetic://session/env-103",
      smokeSummaryRef: "synthetic://smoke/env-103",
    },
  }),
  profile({
    actions: [],
    admissionRefs: ["synthetic://platform/retirement/env-104"],
    dependencies: [],
    expectedWrites: {
      classification: "none",
      targets: [],
    },
    laneClass: "prototype-devint",
    lifecycle: "retired",
    nextMove: null,
    ownerRepo: "workspace-prototype-studio",
    participatingRepos: ["workspace-prototype-studio"],
    persistence: null,
    profileId: "synthetic-retired",
    purpose: "Prove retired profile projection without exposing runtime actions.",
    requestRecordRef: "synthetic://request/env-104",
    runtime: {
      observation: {
        observedAt: "2026-07-26T06:00:00Z",
        sourceRef: "synthetic://status/env-104",
        state: "unavailable",
      },
      platform: "local-k3s",
      stateModel: "disposable",
    },
    securityOwner: "security-architecture",
    securityTriggers: [],
    source: {
      observedAt: "2026-07-26T08:13:00Z",
      provenance: "synthetic-scenario",
      ref: "synthetic://dev-integration-profile/retired",
      source: "environment-lifecycle-fixtures",
      version: "1",
    },
    stageHandoff: {
      checkResults: [],
      governedSurface: "unavailable",
      ownerRepo: "platform-engineering",
      promotionReportRef: null,
      requiredChecks: [],
      result: "stale",
      sessionManifestRef: null,
      smokeSummaryRef: null,
    },
  }),
] as const satisfies readonly DevIntegrationProfile[];
