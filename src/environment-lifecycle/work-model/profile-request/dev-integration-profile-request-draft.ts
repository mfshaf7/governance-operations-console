import {
  type DevIntegrationExpectedWriteClass,
  type DevIntegrationLaneClass,
  type DevIntegrationPersistentConfiguration,
  type DevIntegrationRuntimeStateModel,
  type DevIntegrationSecurityTrigger,
} from "../../model/dev-integration-profile.ts";
import {
  validateDevIntegrationProfileRequest,
  type DevIntegrationProfileRequest,
} from "../../model/dev-integration-profile-request.ts";

export type DevIntegrationProfileRequestDraft = Readonly<{
  dependencies: readonly string[];
  expectedWriteClassification: DevIntegrationExpectedWriteClass;
  expectedWriteTargets: readonly string[];
  laneClass: DevIntegrationLaneClass;
  ownerRepo: string;
  participatingRepos: readonly string[];
  persistence: Readonly<{
    cutoverPlan: string;
    destructiveResetSemantics: string;
    disposableCompanionProfileId: string;
    justification: string;
    retainedDataScope: string;
    storageRequirement: string;
    suspendResumeSemantics: string;
  }>;
  profileId: string;
  purpose: string;
  replacesProfileId: string | null;
  runtimePlatform: string;
  runtimeStateModel: DevIntegrationRuntimeStateModel;
  securityTriggers: readonly DevIntegrationSecurityTrigger[];
}>;

export type DevIntegrationProfileRequestDraftContext = Readonly<{
  disposableProfileIds: readonly string[];
  existingProfileIds: readonly string[];
  requestedAt: string;
  requestedBy: string;
}>;

export function createDevIntegrationProfileRequestDraft(): DevIntegrationProfileRequestDraft {
  return {
    dependencies: [],
    expectedWriteClassification: "none",
    expectedWriteTargets: [],
    laneClass: "prototype-devint",
    ownerRepo: "",
    participatingRepos: [],
    persistence: {
      cutoverPlan: "",
      destructiveResetSemantics: "",
      disposableCompanionProfileId: "",
      justification: "",
      retainedDataScope: "",
      storageRequirement: "",
      suspendResumeSemantics: "",
    },
    profileId: "",
    purpose: "",
    replacesProfileId: null,
    runtimePlatform: "local-k3s",
    runtimeStateModel: "disposable",
    securityTriggers: [],
  };
}

function normalizeValues(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort();
}

function normalizePersistence(
  draft: DevIntegrationProfileRequestDraft,
): DevIntegrationPersistentConfiguration | null {
  if (draft.runtimeStateModel === "disposable") {
    return null;
  }

  return {
    cutoverPlan: draft.persistence.cutoverPlan.trim(),
    destructiveResetSemantics:
      draft.persistence.destructiveResetSemantics.trim(),
    disposableCompanionProfileId:
      draft.persistence.disposableCompanionProfileId.trim() || null,
    justification: draft.persistence.justification.trim(),
    retainedDataScope: draft.persistence.retainedDataScope.trim(),
    sharedSmokeMutationMode: "read-only",
    storageRequirement: draft.persistence.storageRequirement.trim(),
    suspendResumeSemantics:
      draft.persistence.suspendResumeSemantics.trim(),
  };
}

export function buildDevIntegrationProfileRequest(
  draft: DevIntegrationProfileRequestDraft,
  context: DevIntegrationProfileRequestDraftContext,
): DevIntegrationProfileRequest {
  return {
    dependencies: normalizeValues(draft.dependencies),
    expectedWrites: {
      classification: draft.expectedWriteClassification,
      targets:
        draft.expectedWriteClassification === "none"
          ? []
          : normalizeValues(draft.expectedWriteTargets),
    },
    laneClass: draft.laneClass,
    ownerRepo: draft.ownerRepo.trim(),
    participatingRepos: normalizeValues(draft.participatingRepos),
    persistence: normalizePersistence(draft),
    profileId: draft.profileId.trim(),
    purpose: draft.purpose.trim(),
    replacesProfileId: draft.replacesProfileId,
    requestedAt: context.requestedAt,
    requestedBy: context.requestedBy,
    runtimePlatform: draft.runtimePlatform.trim(),
    runtimeStateModel: draft.runtimeStateModel,
    securityTriggers: [...new Set(draft.securityTriggers)].sort(),
  };
}

export function validateDevIntegrationProfileRequestDraft(
  draft: DevIntegrationProfileRequestDraft,
  context: DevIntegrationProfileRequestDraftContext,
): readonly string[] {
  const request = buildDevIntegrationProfileRequest(draft, context);
  const errors = [
    ...validateDevIntegrationProfileRequest(
      request,
      {
        disposableProfileIds: context.disposableProfileIds,
        existingProfileIds: context.existingProfileIds,
      },
    ),
  ];

  return errors;
}

export function isDevIntegrationProfileRequestDraftDirty(
  draft: DevIntegrationProfileRequestDraft,
): boolean {
  return (
    JSON.stringify(draft) !==
    JSON.stringify(createDevIntegrationProfileRequestDraft())
  );
}
