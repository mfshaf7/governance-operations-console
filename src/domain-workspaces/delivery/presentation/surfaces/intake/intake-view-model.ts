import type { TerasMetadataItem, TerasTone } from "@/teras";
import type {
  OperationSourceCustodyClass,
  OperationSourceCustodyGateState,
} from "@/domain-workspaces/operation-projections";

import type {
  DeliveryIntakeSource,
  DeliveryIntakeSourceStatus,
} from "../../../read-model/index.ts";

export const intakeStatusFilterOptions: Array<{
  label: string;
  value: DeliveryIntakeSourceStatus | "all";
}> = [
  { label: "Needs consume", value: "needs_consume" },
  { label: "Consume failed", value: "consume_failed" },
  { label: "Consumed", value: "consumed" },
  { label: "All intake", value: "all" },
];

export function intakeOwnerFilterOptions(sources: DeliveryIntakeSource[]) {
  return ["all", ...Array.from(new Set(sources.map((source) => source.owner)))];
}

export function intakeActionLabel(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "Repair";
    case "consumed":
      return "View Summary";
    case "needs_consume":
      return "Consume";
  }
}

export function intakeActionTitle(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "Repair or retry the failed consume attempt.";
    case "consumed":
      return "Review consumed handoff.";
    case "needs_consume":
      return "Create one Delivery shell.";
  }
}

export function intakeSelectedSourceFacts(
  source: DeliveryIntakeSource | null,
): TerasMetadataItem[] {
  if (!source) {
    return [];
  }

  return [
    { label: "Source Ref", value: source.source_ref },
    { label: "Owner", value: source.owner },
    {
      label: "Source Custody",
      value: intakeSourceCustodyClassLabel(
        source.source_custody.classification,
      ),
    },
    {
      label: "Repo Gate",
      value: intakeSourceCustodyGateLabel(
        source.source_custody.repository_gate_state,
      ),
    },
    {
      label: "Delivery Ref",
      value: source.delivery_package_id ?? "Not created",
    },
  ];
}

export function intakeSelectedSourceProjection(
  source: DeliveryIntakeSource | null,
) {
  return {
    description: source
      ? source.summary
      : "Select an accepted proposal source to inspect the consume handoff.",
    statusLabel: source?.status_label,
    statusTone: source?.tone ?? ("info" as TerasTone),
    title: source?.title ?? "No source selected",
    tone: source?.tone ?? ("warn" as TerasTone),
  };
}

export function intakeSelectedSourceActionEmphasis(
  source: DeliveryIntakeSource,
) {
  return source.intake_status === "consumed" ? "secondary" : "primary";
}

export function intakeModalStatusTitle(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "Consume Retry Needed";
    case "consumed":
      return "Review consumed handoff.";
    case "needs_consume":
      return "Create one Delivery shell.";
  }
}

export function intakeModalStatusDescription(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "The accepted source is valid, but the consume operation needs a retry or link repair.";
    case "consumed":
      return "The consume receipt is recorded and Intake is read-only for this item.";
    case "needs_consume":
      return "The accepted source becomes the delivery-of-record anchor.";
  }
}

export function intakeOperatorActionTitle(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "What failed";
    case "consumed":
      return "Recorded handoff";
    case "needs_consume":
      return "Approve shell creation or reuse.";
  }
}

export function intakeOperatorActionDetail(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return source.gate_summary;
    case "consumed":
      return "The Delivery shell already exists or was linked by the consume workflow.";
    case "needs_consume":
      return "Intake never creates Features, User stories, execution metadata, blockers, closeout records, or landing units.";
  }
}

export function intakeRequiredFixTitle(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "Repair path";
    case "consumed":
      return "Next surface";
    case "needs_consume":
      return "Creates";
  }
}

export function intakeRequiredFixDetail(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return `Retry consume or repair the Delivery backlink for ${source.source_ref}; keep the source in Intake until the receipt links cleanly.`;
    case "consumed":
      return "Use Work Design or the consumed package surface for any follow-on work.";
    case "needs_consume":
      return "One top-level Delivery Package shell.";
  }
}

export function intakeReviewRequestActionLabel(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "Retry Consume";
    case "consumed":
      return "View Receipt";
    case "needs_consume":
      return "Consume Source";
  }
}

export function intakeReviewRequestReceiptTitle(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return "Consume retry staged";
    case "consumed":
      return "Consume receipt available";
    case "needs_consume":
      return "Consume request ready";
  }
}

export function intakeReviewRequestReceiptDetail(source: DeliveryIntakeSource) {
  switch (source.intake_status) {
    case "consume_failed":
      return `Retry ${source.source_ref} through OOS consume or reconcile the existing Delivery backlink.`;
    case "consumed":
      return "The recorded consume receipt is the source of truth for this Intake item.";
    case "needs_consume":
      return "The source can proceed through the consume handoff.";
  }
}

export function intakeConsumeModalProjection(source: DeliveryIntakeSource) {
  const canConsume = source.intake_status === "needs_consume";
  const needsRepair = source.intake_status === "consume_failed";

  return {
    canConsume,
    needsRepair,
    ownerRouteDescription: canConsume
      ? "Child tree, execution readiness, source work, or closeout."
      : "Retry consume through OOS, or repair the source-to-Delivery backlink when a shell already exists.",
    ownerRouteKicker: canConsume ? "Does Not Create" : "Owner Route",
    statusLabel: canConsume ? "operator review" : source.status_label,
    statusTone: canConsume ? ("warn" as TerasTone) : source.tone,
    tone: canConsume ? ("warn" as TerasTone) : source.tone,
  };
}

export function intakeReviewRequestButtonLabel({
  reviewRequestRecorded,
  source,
}: {
  reviewRequestRecorded: boolean;
  source: DeliveryIntakeSource;
}) {
  return reviewRequestRecorded
    ? "Request Staged"
    : intakeReviewRequestActionLabel(source);
}

export function formatIntakeTimestamp(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function intakeSourceHandoffMetadata(
  source: DeliveryIntakeSource,
): TerasMetadataItem[] {
  return [
    { label: "Source Ref", value: source.source_ref },
    { label: "Owner", value: source.owner },
    {
      label: "Delivery Ref",
      value: source.delivery_package_id ?? "Will be created on consume",
    },
    {
      label: "Session Ref",
      value:
        source.work_design_session_ref ?? "Will be allocated after consume",
    },
  ];
}

export function intakeConsumedHandoffMetadata(
  source: DeliveryIntakeSource,
): TerasMetadataItem[] {
  return [
    { label: "Source Ref", value: source.source_ref },
    { label: "Owner", value: source.owner },
    {
      label: "Delivery Ref",
      value: source.delivery_package_id ?? "Not recorded",
    },
    {
      label: "Session Ref",
      value: source.work_design_session_ref ?? "Not recorded",
    },
  ];
}

export function intakeSourceCustodyMetadata(
  source: DeliveryIntakeSource,
): TerasMetadataItem[] {
  return [
    {
      label: "Class",
      value: intakeSourceCustodyClassLabel(
        source.source_custody.classification,
      ),
    },
    { label: "Owner", value: source.source_custody.owner },
    {
      label: "Repo / Ref",
      value: source.source_custody.repo_ref ?? "Not required",
    },
    {
      label: "Gate",
      value: intakeSourceCustodyGateLabel(
        source.source_custody.repository_gate_state,
      ),
    },
  ];
}

export function intakeSourceCustodyTitle(source: DeliveryIntakeSource) {
  return intakeSourceCustodyClassLabel(source.source_custody.classification);
}

export function intakeSourceCustodyDescription(source: DeliveryIntakeSource) {
  return source.source_custody.rationale;
}

export function intakeEvidenceMetadata(
  source: DeliveryIntakeSource,
): TerasMetadataItem[] {
  return source.evidence_refs.map((evidenceRef, index) => ({
    label: `Evidence ${index + 1}`,
    value: evidenceRef,
  }));
}

export function intakeReviewRequestReceiptMetadata(
  source: DeliveryIntakeSource,
): TerasMetadataItem[] {
  return [
    { label: "Owner Route", value: source.owner },
    { label: "Source Ref", value: source.source_ref },
    { label: "Request Type", value: "Consume retry" },
    {
      label: "Status",
      value: "Prototype-local request staged",
    },
  ];
}

export function intakeConsumeReceiptMetadata(
  source: DeliveryIntakeSource,
): TerasMetadataItem[] {
  return [
    {
      label: "Consumed At",
      value: formatIntakeTimestamp(source.consumed_at),
    },
    {
      label: "Consumed By",
      value: source.consumed_by ?? "OOS consume workflow",
    },
    {
      label: "Record System",
      value: "OOS / OpenProject adapter",
    },
    { label: "Receipt State", value: "Read-only in Intake" },
  ];
}

function intakeSourceCustodyClassLabel(
  classification: OperationSourceCustodyClass,
) {
  switch (classification) {
    case "existing-repo":
      return "Existing repo";
    case "new-repo-required":
      return "New repo required";
    case "non-source-work":
      return "Non-source work";
    case "platform-internal":
      return "Platform internal";
  }
}

function intakeSourceCustodyGateLabel(
  gateState: OperationSourceCustodyGateState,
) {
  switch (gateState) {
    case "blocked":
      return "Blocked";
    case "not-required":
      return "Not required";
    case "pending":
      return "Pending";
    case "resolved":
      return "Resolved";
  }
}
