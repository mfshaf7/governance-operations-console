import type { TerasMetadataItem } from "@/teras";

import type { ModelProfileRequestCapability } from "../../../work-model/profile-requests/model-profile-request-capability.ts";

export function modelProfileRequestMetadata(
  capability: ModelProfileRequestCapability,
): TerasMetadataItem[] {
  return [
    { label: "Backend Owner", value: capability.backendOwner },
    { label: "Workflow Owner", value: capability.workflowOwner },
    { label: "Security Owner", value: capability.securityOwner },
    { label: "Availability", value: capability.availability },
  ];
}

export function modelProfileRequestRequirementRows(
  capability: ModelProfileRequestCapability,
) {
  return capability.controls.map((requirement, index) => ({
    detail: "Enforced by the admitted Model Operations request and reconciliation boundary.",
    id: requirement,
    index: String(index + 1).padStart(2, "0"),
    label: requirement,
    status: "Active",
    tone: "ok" as const,
  }));
}
