import type { TerasMetadataItem } from "@/teras";

import type {
  ModelProfileCheckProjection,
  ModelProfileRecord,
  ModelProjectionSource,
} from "../../../read-model/types/model-operations-types.ts";
import { modelReadinessLabel } from "../../shared/model-profile-display-model.ts";

function modelProjectionSourceMetadata(
  source: ModelProjectionSource,
): TerasMetadataItem[] {
  return [
    { label: "Authority", value: source.authority },
    { label: "Freshness", value: source.freshness },
    { label: "Observed", value: source.observedAt },
    { label: "Source", value: source.ref },
    { label: "Schema", value: source.schemaVersion },
    { label: "Version", value: source.sourceVersion },
  ];
}

export function modelProfileCheckMetadata(
  check: ModelProfileCheckProjection,
): TerasMetadataItem[] {
  return [
    { label: "Check", value: check.label },
    {
      label: "State",
      tone: check.tone,
      value: modelReadinessLabel(check.state),
    },
    ...check.facts,
    ...modelProjectionSourceMetadata(check.source),
  ];
}

export function modelProfilePolicyMetadata(
  profile: ModelProfileRecord,
): TerasMetadataItem[] {
  return [
    { label: "Profile", value: profile.policy.profileId },
    { label: "Lifecycle", value: profile.policy.lifecycle },
    { label: "Purpose", value: profile.policy.purpose },
    { label: "Provider", value: profile.policy.provider },
    { label: "Upstream", value: profile.policy.upstreamModel },
    { label: "Invocation", value: profile.policy.invocationPath },
    {
      label: "Human Approval",
      value: profile.policy.humanApprovalRequired ? "required" : "not required",
    },
    {
      label: "Direct Provider",
      value: profile.policy.directProviderAccessAllowed ? "allowed" : "denied",
    },
    ...modelProjectionSourceMetadata(profile.policy.source),
  ];
}

export function modelProfileRuntimeMetadata(
  profile: ModelProfileRecord,
): TerasMetadataItem[] {
  return [
    { label: "Contract", value: profile.runtime.contractId },
    { label: "Status", value: profile.runtime.status },
    { label: "Provider", value: profile.runtime.provider },
    { label: "Upstream", value: profile.runtime.upstreamModel },
    ...modelProjectionSourceMetadata(profile.runtime.source),
  ];
}

export function modelProfileLatestAuditMetadata(
  profile: ModelProfileRecord,
): TerasMetadataItem[] {
  return [
    {
      label: "State",
      value: modelReadinessLabel(profile.latestAudit.state),
    },
    { label: "Summary", value: profile.latestAudit.summary },
    {
      label: "Event",
      value: profile.latestAudit.eventRef ?? "not available",
    },
    {
      label: "Observed",
      value: profile.latestAudit.observedAt ?? "not observed",
    },
    ...modelProjectionSourceMetadata(profile.latestAudit.source),
  ];
}
