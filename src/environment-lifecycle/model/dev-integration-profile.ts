import {
  assertEnvironmentLifecycleNextMove,
  assertEnvironmentLifecycleSource,
  type EnvironmentLifecycleNextMove,
  type EnvironmentLifecycleSource,
} from "./environment-lifecycle-types.ts";

export type DevIntegrationLaneClass =
  | "governed-devint"
  | "integration-devint"
  | "prototype-devint";

export type DevIntegrationProfileLifecycle =
  | "active"
  | "build-admitted"
  | "proposed"
  | "retired"
  | "suspended";

export type DevIntegrationRuntimeStateModel =
  | "disposable"
  | "persistent";

export type DevIntegrationRuntimeObservationState =
  | "degraded"
  | "failed"
  | "running"
  | "starting"
  | "stopped"
  | "stopping"
  | "unavailable"
  | "unknown";

export type DevIntegrationProfileAction =
  | "access"
  | "down"
  | "promote-check"
  | "reset"
  | "smoke"
  | "status"
  | "up";

export type DevIntegrationPromoteCheckState =
  | "failed"
  | "not-ready"
  | "not-run"
  | "ready"
  | "running"
  | "stale";

export type DevIntegrationStageHandoffCheck = Readonly<{
  description: string;
  id: string;
  label: string;
}>;

export type DevIntegrationStageHandoffCheckResult = Readonly<{
  checkId: string;
  evidenceRef: string;
  status: "blocked" | "failed" | "passed";
}>;

export type DevIntegrationExpectedWriteClass =
  | "canonical-backend"
  | "external-sandbox"
  | "none"
  | "prototype-local";

export type DevIntegrationSecurityTrigger =
  | "ai-review"
  | "identity"
  | "runtime-privilege"
  | "secrets";

export type DevIntegrationPersistentConfiguration = Readonly<{
  cutoverPlan: string;
  destructiveResetSemantics: string;
  disposableCompanionProfileId: string | null;
  justification: string;
  retainedDataScope: string;
  sharedSmokeMutationMode: "read-only";
  storageRequirement: string;
  suspendResumeSemantics: string;
}>;

export type DevIntegrationProfile = Readonly<{
  actions: readonly DevIntegrationProfileAction[];
  admissionRefs: readonly string[];
  dependencies: readonly string[];
  expectedWrites: Readonly<{
    classification: DevIntegrationExpectedWriteClass;
    targets: readonly string[];
  }>;
  laneClass: DevIntegrationLaneClass;
  lifecycle: DevIntegrationProfileLifecycle;
  nextMove: EnvironmentLifecycleNextMove | null;
  ownerRepo: string;
  participatingRepos: readonly string[];
  persistence: DevIntegrationPersistentConfiguration | null;
  profileId: string;
  purpose: string;
  requestRecordRef: string;
  runtime: Readonly<{
    observation: Readonly<{
      observedAt: string | null;
      sourceRef: string | null;
      state: DevIntegrationRuntimeObservationState;
    }>;
    platform: string;
    stateModel: DevIntegrationRuntimeStateModel;
  }>;
  securityOwner: string;
  securityTriggers: readonly DevIntegrationSecurityTrigger[];
  source: EnvironmentLifecycleSource;
  stageHandoff: Readonly<{
    checkResults: readonly DevIntegrationStageHandoffCheckResult[];
    governedSurface: string;
    ownerRepo: string;
    requiredChecks: readonly DevIntegrationStageHandoffCheck[];
    result: DevIntegrationPromoteCheckState;
    sessionManifestRef: string | null;
    smokeSummaryRef: string | null;
    promotionReportRef: string | null;
  }>;
}>;

const ACTIVE_PROFILE_ACTIONS = new Set<DevIntegrationProfileAction>([
  "access",
  "down",
  "promote-check",
  "smoke",
  "up",
]);

const STABLE_RESET_STATES = new Set<DevIntegrationRuntimeObservationState>([
  "degraded",
  "failed",
  "running",
  "stopped",
]);

export type DevIntegrationProfileActionAvailability = Readonly<{
  allowed: boolean;
  reason: string | null;
}>;

export function assertDevIntegrationProfile(
  profile: DevIntegrationProfile,
): void {
  assertEnvironmentLifecycleSource(profile.source);
  assertEnvironmentLifecycleNextMove(profile.nextMove);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.profileId)) {
    throw new Error(
      `${profile.profileId} must use a lowercase kebab-case profile id.`,
    );
  }

  if (
    profile.runtime.stateModel === "persistent" &&
    profile.persistence === null
  ) {
    throw new Error(
      `${profile.profileId} requires persistent runtime configuration.`,
    );
  }

  if (
    profile.runtime.stateModel === "disposable" &&
    profile.persistence !== null
  ) {
    throw new Error(
      `${profile.profileId} cannot carry persistent runtime configuration.`,
    );
  }

  if (
    profile.expectedWrites.classification === "canonical-backend" &&
    profile.expectedWrites.targets.length === 0
  ) {
    throw new Error(
      `${profile.profileId} must identify every expected canonical backend target.`,
    );
  }

  if (
    profile.expectedWrites.classification === "none" &&
    profile.expectedWrites.targets.length > 0
  ) {
    throw new Error(
      `${profile.profileId} cannot list write targets when expected writes are none.`,
    );
  }

  if (new Set(profile.actions).size !== profile.actions.length) {
    throw new Error(
      `${profile.profileId} runtime actions must be unique.`,
    );
  }

  if (!profile.participatingRepos.includes(profile.ownerRepo)) {
    throw new Error(
      `${profile.profileId} participating repositories must include its owner.`,
    );
  }

  if (
    !profile.ownerRepo.trim() ||
    !profile.purpose.trim() ||
    !profile.requestRecordRef.trim() ||
    !profile.runtime.platform.trim() ||
    !profile.securityOwner.trim() ||
    new Set(profile.participatingRepos).size !==
      profile.participatingRepos.length ||
    new Set(profile.expectedWrites.targets).size !==
      profile.expectedWrites.targets.length ||
    profile.expectedWrites.targets.some((target) => !target.trim())
  ) {
    throw new Error(
      `${profile.profileId} profile identity, ownership, and write boundary must be complete and unique.`,
    );
  }

  const observation = profile.runtime.observation;
  if (
    Boolean(observation.observedAt) !== Boolean(observation.sourceRef) ||
    (observation.observedAt &&
      Number.isNaN(Date.parse(observation.observedAt))) ||
    (!["unavailable", "unknown"].includes(observation.state) &&
      (!observation.observedAt || !observation.sourceRef))
  ) {
    throw new Error(
      `${profile.profileId} runtime observation must carry coherent source and time evidence.`,
    );
  }

  const requiredCheckIds = new Set(
    profile.stageHandoff.requiredChecks.map((check) => check.id),
  );
  const checkResultIds = new Set(
    profile.stageHandoff.checkResults.map((result) => result.checkId),
  );
  if (
    requiredCheckIds.size !== profile.stageHandoff.requiredChecks.length ||
    profile.stageHandoff.requiredChecks.some(
      (check) =>
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(check.id) ||
        !check.label.trim() ||
        !check.description.trim(),
    ) ||
    checkResultIds.size !== profile.stageHandoff.checkResults.length ||
    profile.stageHandoff.checkResults.some(
      (result) =>
        !requiredCheckIds.has(result.checkId) ||
        !result.evidenceRef.trim(),
    )
  ) {
    throw new Error(
      `${profile.profileId} stage handoff checks and results must be complete, unique, and contract-owned.`,
    );
  }

  if (
    profile.stageHandoff.result === "not-run" &&
    profile.stageHandoff.checkResults.length > 0
  ) {
    throw new Error(
      `${profile.profileId} cannot carry current check results before a promote check runs.`,
    );
  }

  if (
    profile.stageHandoff.result === "ready" &&
    (profile.stageHandoff.requiredChecks.length === 0 ||
      profile.stageHandoff.checkResults.length !==
        profile.stageHandoff.requiredChecks.length ||
      profile.stageHandoff.checkResults.some(
        (result) => result.status !== "passed",
      ) ||
      !profile.stageHandoff.sessionManifestRef ||
      !profile.stageHandoff.smokeSummaryRef ||
      !profile.stageHandoff.promotionReportRef)
  ) {
    throw new Error(
      `${profile.profileId} ready handoff requires checks and complete evidence references.`,
    );
  }

  if (
    profile.stageHandoff.result === "not-ready" &&
    (profile.stageHandoff.checkResults.length !==
      profile.stageHandoff.requiredChecks.length ||
      profile.stageHandoff.checkResults.every(
        (result) => result.status === "passed",
      ))
  ) {
    throw new Error(
      `${profile.profileId} not-ready handoff must preserve every check outcome and at least one unmet check.`,
    );
  }

  if (
    (profile.lifecycle === "proposed" ||
      profile.lifecycle === "retired") &&
    profile.actions.length > 0
  ) {
    throw new Error(
      `${profile.profileId} cannot expose runtime actions while ${profile.lifecycle}.`,
    );
  }
}

export function devIntegrationProfileAllowsAction(
  profile: DevIntegrationProfile,
  action: DevIntegrationProfileAction,
): boolean {
  return devIntegrationProfileActionAvailability(profile, action).allowed;
}

export function devIntegrationProfileActionAvailability(
  profile: DevIntegrationProfile,
  action: DevIntegrationProfileAction,
): DevIntegrationProfileActionAvailability {
  if (!profile.actions.includes(action)) {
    return {
      allowed: false,
      reason: "The profile contract does not declare this action.",
    };
  }

  if (
    profile.lifecycle === "proposed" ||
    profile.lifecycle === "retired"
  ) {
    return {
      allowed: false,
      reason: `The ${profile.lifecycle} profile lifecycle does not allow runtime commands.`,
    };
  }

  if (
    ACTIVE_PROFILE_ACTIONS.has(action) &&
    profile.lifecycle !== "active"
  ) {
    return {
      allowed: false,
      reason: "Only an active profile can run this action.",
    };
  }

  const runtimeState = profile.runtime.observation.state;

  if (action === "up" && runtimeState !== "stopped") {
    return {
      allowed: false,
      reason: "Start or resume is available only while the runtime is stopped.",
    };
  }

  if (
    action === "down" &&
    runtimeState !== "running" &&
    runtimeState !== "degraded"
  ) {
    return {
      allowed: false,
      reason: "Stop or suspend requires a running or degraded runtime.",
    };
  }

  if (
    (action === "access" || action === "smoke") &&
    runtimeState !== "running" &&
    runtimeState !== "degraded"
  ) {
    return {
      allowed: false,
      reason: "This action requires a running or degraded runtime.",
    };
  }

  if (action === "reset" && !STABLE_RESET_STATES.has(runtimeState)) {
    return {
      allowed: false,
      reason:
        "Reset requires a stable running, degraded, stopped, or failed observation.",
    };
  }

  return { allowed: true, reason: null };
}

export function devIntegrationProfileActionLabel(
  profile: DevIntegrationProfile,
  action: DevIntegrationProfileAction,
): string {
  if (action === "down") {
    return profile.runtime.stateModel === "persistent"
      ? "Suspend"
      : "Stop";
  }

  if (action === "up") {
    return profile.runtime.stateModel === "persistent"
      ? "Resume"
      : "Start";
  }

  const labels: Record<
    Exclude<DevIntegrationProfileAction, "down" | "up">,
    string
  > = {
    access: "Open Access",
    "promote-check": "Run Promote Check",
    reset: "Reset",
    smoke: "Run Smoke",
    status: "Refresh Status",
  };

  return labels[action];
}
