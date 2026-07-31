import type {
  DevIntegrationExpectedWriteClass,
  DevIntegrationLaneClass,
  DevIntegrationPersistentConfiguration,
  DevIntegrationRuntimeStateModel,
  DevIntegrationSecurityTrigger,
} from "./dev-integration-profile.ts";

export type DevIntegrationProfileRequest = Readonly<{
  dependencies: readonly string[];
  expectedWrites: Readonly<{
    classification: DevIntegrationExpectedWriteClass;
    targets: readonly string[];
  }>;
  laneClass: DevIntegrationLaneClass;
  ownerRepo: string;
  participatingRepos: readonly string[];
  persistence: DevIntegrationPersistentConfiguration | null;
  profileId: string;
  purpose: string;
  replacesProfileId: string | null;
  requestedAt: string;
  requestedBy: string;
  runtimePlatform: string;
  runtimeStateModel: DevIntegrationRuntimeStateModel;
  securityTriggers: readonly DevIntegrationSecurityTrigger[];
}>;

export type DevIntegrationProfileRequestValidationContext = Readonly<{
  disposableProfileIds: readonly string[];
  existingProfileIds: readonly string[];
}>;

export const devIntegrationProfileRequestRoute = {
  adapterRef: "prototype-local://environment-lifecycle/profile-request",
  destinationLabel: "Workspace Governance",
  destinationRef: "workspace-governance",
  platformReviewOwner: "platform-engineering",
  requiredCapability: "workspace-governance:dev-integration-profile-request",
  securityReviewOwner: "security-architecture",
  workflowOwner: "workspace-governance",
} as const;

const laneClasses: readonly DevIntegrationLaneClass[] = [
  "governed-devint",
  "integration-devint",
  "prototype-devint",
];
const runtimeStateModels: readonly DevIntegrationRuntimeStateModel[] = [
  "disposable",
  "persistent",
];
const expectedWriteClasses: readonly DevIntegrationExpectedWriteClass[] = [
  "canonical-backend",
  "external-sandbox",
  "none",
  "prototype-local",
];
const securityTriggers: readonly DevIntegrationSecurityTrigger[] = [
  "ai-review",
  "identity",
  "runtime-privilege",
  "secrets",
];

export function validateDevIntegrationProfileRequest(
  request: DevIntegrationProfileRequest,
  context: DevIntegrationProfileRequestValidationContext,
): readonly string[] {
  const errors: string[] = [];
  const persistence = request.persistence;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.profileId)) {
    errors.push("Profile id must use lowercase kebab-case.");
  }
  if (context.existingProfileIds.includes(request.profileId)) {
    errors.push("Profile id is already registered.");
  }
  if (!request.ownerRepo.trim()) {
    errors.push("Owner repo is required.");
  }
  if (!request.purpose.trim()) {
    errors.push("Purpose is required.");
  }
  if (request.participatingRepos.length === 0) {
    errors.push("At least one participating repo is required.");
  }
  if (!request.runtimePlatform.trim()) {
    errors.push("Runtime platform is required.");
  }
  if (!laneClasses.includes(request.laneClass)) {
    errors.push("Lane class must use a supported value.");
  }
  if (!runtimeStateModels.includes(request.runtimeStateModel)) {
    errors.push("Runtime state model must use a supported value.");
  }
  if (
    !expectedWriteClasses.includes(
      request.expectedWrites.classification,
    )
  ) {
    errors.push("Expected write class must use a supported value.");
  }
  if (
    request.securityTriggers.some(
      (trigger) => !securityTriggers.includes(trigger),
    )
  ) {
    errors.push("Security triggers must use supported values.");
  }
  if (
    !request.requestedBy.trim() ||
    !request.requestedAt.trim() ||
    Number.isNaN(Date.parse(request.requestedAt))
  ) {
    errors.push("Request actor and timestamp are required.");
  }
  if (
    request.ownerRepo.trim() &&
    !request.participatingRepos.includes(request.ownerRepo)
  ) {
    errors.push("Participating repositories must include the owner repo.");
  }
  if (
    request.replacesProfileId &&
    !context.existingProfileIds.includes(request.replacesProfileId)
  ) {
    errors.push("Replacement profile must reference an existing profile.");
  }
  if (
    request.expectedWrites.classification !== "none" &&
    request.expectedWrites.targets.length === 0
  ) {
    errors.push("The selected write class requires at least one target.");
  }
  if (
    request.expectedWrites.classification === "none" &&
    request.expectedWrites.targets.length > 0
  ) {
    errors.push("No-write requests cannot include write targets.");
  }
  if (
    request.runtimeStateModel === "persistent" &&
    persistence === null
  ) {
    errors.push("Persistent profiles require persistence configuration.");
  }
  if (
    request.runtimeStateModel === "disposable" &&
    persistence !== null
  ) {
    errors.push("Disposable profiles cannot include persistence configuration.");
  }
  if (request.runtimeStateModel === "persistent" && persistence) {
    if (persistence.sharedSmokeMutationMode !== "read-only") {
      errors.push("Persistent shared smoke must remain read-only.");
    }
    if (!persistence.justification.trim()) {
      errors.push("Persistent runtime justification is required.");
    }
    if (!persistence.retainedDataScope.trim()) {
      errors.push("Retained data scope is required.");
    }
    if (!persistence.suspendResumeSemantics.trim()) {
      errors.push("Suspend and resume semantics are required.");
    }
    if (!persistence.storageRequirement.trim()) {
      errors.push("Storage requirement is required.");
    }
    if (!persistence.destructiveResetSemantics.trim()) {
      errors.push("Destructive reset semantics are required.");
    }
    if (request.replacesProfileId && !persistence.cutoverPlan.trim()) {
      errors.push("A replacement profile requires a cutover plan.");
    }
    if (
      persistence.disposableCompanionProfileId &&
      !context.existingProfileIds.includes(
        persistence.disposableCompanionProfileId,
      )
    ) {
      errors.push(
        "Disposable companion profile must reference an existing profile.",
      );
    } else if (
      persistence.disposableCompanionProfileId &&
      !context.disposableProfileIds.includes(
        persistence.disposableCompanionProfileId,
      )
    ) {
      errors.push(
        "Disposable companion profile must use the disposable state model.",
      );
    }
  }
  if (
    hasInvalidStringList(request.dependencies) ||
    hasInvalidStringList(request.participatingRepos) ||
    hasInvalidStringList(request.expectedWrites.targets) ||
    new Set(request.securityTriggers).size !== request.securityTriggers.length
  ) {
    errors.push("Request lists must contain unique, non-empty values.");
  }

  return errors;
}

function hasInvalidStringList(values: readonly string[]): boolean {
  return (
    new Set(values).size !== values.length ||
    values.some((value) => !value.trim())
  );
}
