import type { TerasTone } from "@/teras";

import type {
  DevIntegrationProfileRequestDraft,
} from "../../../work-model/profile-request/dev-integration-profile-request-draft";

export type ProfileRequestCheckItem = Readonly<{
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
}>;

export function profileRequestCheckItem(
  id: string,
  label: string,
  detail: string,
  complete: boolean,
): ProfileRequestCheckItem {
  return {
    detail,
    id,
    label,
    status: complete ? "Ready" : "Required",
    tone: complete ? "ok" : "warn",
  };
}

export function buildProfileIntentChecks(
  draft: DevIntegrationProfileRequestDraft,
  existingProfileIds: readonly string[],
): readonly ProfileRequestCheckItem[] {
  const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.profileId);

  return [
    profileRequestCheckItem(
      "profile-id",
      "Unique profile ID",
      "Use lowercase kebab-case and avoid an existing profile ID.",
      validId && !existingProfileIds.includes(draft.profileId),
    ),
    profileRequestCheckItem(
      "owner",
      "Owning repository",
      "The repository accountable for the profile contract.",
      Boolean(draft.ownerRepo),
    ),
    profileRequestCheckItem(
      "purpose",
      "Operational purpose",
      "State why this local environment needs to exist.",
      Boolean(draft.purpose.trim()),
    ),
    profileRequestCheckItem(
      "participants",
      "Repository participation",
      "The owner must be included among participating repositories.",
      Boolean(
        draft.ownerRepo &&
          draft.participatingRepos.includes(draft.ownerRepo),
      ),
    ),
  ];
}

export function buildRuntimeContractChecks(
  draft: DevIntegrationProfileRequestDraft,
  disposableProfileIds: readonly string[],
): readonly ProfileRequestCheckItem[] {
  const writeBoundaryComplete =
    draft.expectedWriteClassification === "none" ||
    draft.expectedWriteTargets.length > 0;
  const persistentComplete =
    draft.runtimeStateModel === "disposable" ||
    Boolean(
      draft.persistence.justification.trim() &&
        draft.persistence.retainedDataScope.trim() &&
        draft.persistence.storageRequirement.trim() &&
        draft.persistence.suspendResumeSemantics.trim() &&
        draft.persistence.destructiveResetSemantics.trim() &&
        (!draft.replacesProfileId ||
          draft.persistence.cutoverPlan.trim()) &&
        (!draft.persistence.disposableCompanionProfileId ||
          disposableProfileIds.includes(
            draft.persistence.disposableCompanionProfileId,
          )),
    );

  return [
    profileRequestCheckItem(
      "runtime-platform",
      "Runtime platform",
      "The local host or cluster shape is explicit.",
      Boolean(draft.runtimePlatform),
    ),
    profileRequestCheckItem(
      "write-boundary",
      "Expected write boundary",
      "Write targets are named when the profile can mutate data.",
      writeBoundaryComplete,
    ),
    profileRequestCheckItem(
      "persistence",
      "State model",
      draft.runtimeStateModel === "persistent"
        ? "Persistent storage and reset semantics are complete."
        : "Disposable runtime semantics require no persistence record.",
      persistentComplete,
    ),
  ];
}
