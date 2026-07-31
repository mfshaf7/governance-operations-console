import type { TerasMetadataItem } from "@/teras";

import type {
  ModelProfileRecord,
  ModelRequiredMoveProjection,
} from "../../../read-model/types/model-operations-types.ts";
import { modelProfileResolutionLabel } from "../../shared/model-profile-display-model.ts";

export function modelProfileDashboardFacts(
  profile: ModelProfileRecord,
): TerasMetadataItem[] {
  return [
    { label: "Profile", value: profile.policy.profileId },
    { label: "Lifecycle", value: profile.policy.lifecycle },
    { label: "Provider", value: profile.policy.provider },
    { label: "Upstream", value: modelProfileResolutionLabel(profile) },
  ];
}

export function modelRequiredMoveMetadata(
  requiredMove: ModelRequiredMoveProjection,
): TerasMetadataItem[] {
  return [{ label: "Owner", value: requiredMove.owner }];
}
