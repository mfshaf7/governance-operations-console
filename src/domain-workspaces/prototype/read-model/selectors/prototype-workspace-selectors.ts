import type { OperationTone } from "../../../operation-contracts/operation-state.ts";

import type {
  PrototypeBaselinePacketState,
  PrototypeLifecycle,
  PrototypeProjectedReceipt,
  PrototypeRecord,
  PrototypeWorkspaceReadModel,
} from "../../domain/prototype-types.ts";
export {
  prototypeMovementRequestStateTone,
  prototypeMovementStateLabel,
} from "../../domain/prototype-movement-state.ts";
import { prototypeBasePlatformLabel } from "../../domain/support/prototype-setup-profile-model.ts";

export type PrototypeWorkspaceRecordFilters = {
  baseline: PrototypeBaselinePacketState | "all";
  lifecycle: PrototypeLifecycle | "all";
  search: string;
};

export type PrototypeWorkspaceStats = {
  baselineApproved: number;
  blocked: number;
  candidate: number;
  exploring: number;
  movementReady: number;
  retired: number;
  total: number;
};

export function prototypeReceiptsOldestFirst(
  receipts: PrototypeProjectedReceipt[],
) {
  return [...receipts].sort(comparePrototypeReceipts);
}

export function prototypeReceiptsNewestFirst(
  receipts: PrototypeProjectedReceipt[],
) {
  return [...receipts].sort((left, right) => {
    const recordedAtOrder = right.recordedAt.localeCompare(left.recordedAt);

    return recordedAtOrder || comparePrototypeReceiptIdentity(left, right);
  });
}

export function filterPrototypeRecords(
  records: PrototypeRecord[],
  filters: PrototypeWorkspaceRecordFilters,
) {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    const matchesLifecycle =
      filters.lifecycle === "all" || record.lifecycle === filters.lifecycle;
    const matchesBaseline =
      filters.baseline === "all" || record.baseline.state === filters.baseline;
    const matchesSearch = normalizedSearch
      ? prototypeRecordSearchText(record).includes(normalizedSearch)
      : true;

    return matchesLifecycle && matchesBaseline && matchesSearch;
  });
}

export function getSelectedPrototypeRecord(
  readModel: PrototypeWorkspaceReadModel,
  selectedRecordId: string | null,
) {
  return (
    readModel.records.find((record) => record.id === selectedRecordId) ??
    readModel.records.find((record) => record.lifecycle !== "retired") ??
    readModel.records[0] ??
    null
  );
}

export function getPrototypeWorkspaceStats(
  records: PrototypeRecord[],
): PrototypeWorkspaceStats {
  return {
    baselineApproved: records.filter(
      (record) => record.lifecycle === "baseline-approved",
    ).length,
    blocked: records.filter(
      (record) =>
        record.landing.state === "blocked" ||
        record.baseline.state === "blocked" ||
        record.openIssues.some((issue) => issue.status === "blocked"),
    ).length,
    candidate: records.filter((record) => record.lifecycle === "candidate")
      .length,
    exploring: records.filter((record) => record.lifecycle === "exploring")
      .length,
    movementReady: records.filter(
      (record) => record.baseline.state === "ready-for-movement",
    ).length,
    retired: records.filter((record) => record.lifecycle === "retired").length,
    total: records.length,
  };
}

export function getPrototypeLifecycleOptions(records: PrototypeRecord[]) {
  return [
    { label: "All lifecycle", value: "all" as const },
    ...Array.from(new Set(records.map((record) => record.lifecycle))).map(
      (lifecycle) => ({
        label: prototypeLifecycleLabel(lifecycle),
        value: lifecycle,
      }),
    ),
  ];
}

export function getPrototypeBaselineOptions(records: PrototypeRecord[]) {
  return [
    { label: "All baseline", value: "all" as const },
    ...Array.from(new Set(records.map((record) => record.baseline.state))).map(
      (baseline) => ({
        label: prototypeBaselineLabel(baseline),
        value: baseline,
      }),
    ),
  ];
}

export function prototypeLifecycleLabel(lifecycle: PrototypeLifecycle): string {
  switch (lifecycle) {
    case "baseline-approved":
      return "Baseline approved";
    case "candidate":
      return "Candidate";
    case "exploring":
      return "Exploring";
    case "graduated":
      return "Graduated";
    case "graduating":
      return "Graduating";
    case "retired":
      return "Retired";
  }
}

export function prototypeLifecycleTone(
  lifecycle: PrototypeLifecycle,
): OperationTone {
  switch (lifecycle) {
    case "baseline-approved":
      return "ok";
    case "candidate":
    case "graduating":
      return "warn";
    case "exploring":
      return "info";
    case "graduated":
    case "retired":
      return "muted";
  }
}

export function prototypeBaselineLabel(
  state: PrototypeBaselinePacketState,
): string {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "drafting":
      return "Drafting";
    case "needs-evidence":
      return "Needs evidence";
    case "not-started":
      return "Not started";
    case "ready-for-movement":
      return "Ready for movement";
    case "receipt-projected":
      return "Receipt recorded";
    case "returned":
      return "Returned";
  }
}

export function prototypeBaselineTone(
  state: PrototypeBaselinePacketState,
): OperationTone {
  switch (state) {
    case "blocked":
    case "returned":
      return "danger";
    case "drafting":
    case "needs-evidence":
      return "warn";
    case "ready-for-movement":
    case "receipt-projected":
      return "ok";
    case "not-started":
      return "muted";
  }
}

export function prototypePreviewLabel(record: PrototypeRecord): string {
  if (record.preview.profileState === "no-profile") {
    return "No profile";
  }

  if (record.preview.profileState === "profile-draft") {
    return "Profile draft";
  }

  switch (record.preview.proofState) {
    case "proof-failed":
      return "Check failed";
    case "proof-ready":
      return "Check ready";
    case "stale":
      return "Check stale";
    case "not-started":
      break;
  }

  switch (record.preview.runtimeState) {
    case "running":
      return "Running";
    case "stopped":
      return "Not started";
    case "unavailable":
      return "Unavailable";
    case "unknown":
      return "Unknown";
  }
}

export function prototypePreviewTone(record: PrototypeRecord): OperationTone {
  if (record.preview.profileState === "profile-draft") {
    return "warn";
  }

  if (record.preview.profileState === "no-profile") {
    return "muted";
  }

  switch (record.preview.proofState) {
    case "proof-failed":
      return "danger";
    case "proof-ready":
      return "ok";
    case "stale":
      return "warn";
    case "not-started":
      break;
  }

  switch (record.preview.runtimeState) {
    case "running":
      return "info";
    case "stopped":
      return "muted";
    case "unavailable":
      return "danger";
    case "unknown":
      return "warn";
  }
}

export function prototypeRecordStatusLabel(record: PrototypeRecord) {
  if (record.lifecycle === "retired") {
    return "Retired";
  }

  if (record.landing.state !== "landed") {
    return "Landing needed";
  }

  if (record.currentMove.id === "candidate-promotion") {
    return "Candidate promotion";
  }

  if (record.movementRequest.state === "returned") {
    return "Correction needed";
  }

  if (record.openIssues.some((issue) => issue.status === "blocked")) {
    return "Blocked";
  }

  if (record.baseline.state === "ready-for-movement") {
    return "Movement ready";
  }

  return prototypeBaselineLabel(record.baseline.state);
}

export function prototypeRecordTone(record: PrototypeRecord): OperationTone {
  if (record.lifecycle === "retired") {
    return "muted";
  }

  if (record.landing.state === "blocked") {
    return "danger";
  }

  if (record.landing.state !== "landed") {
    return "warn";
  }

  if (record.currentMove.id === "candidate-promotion") {
    return record.currentMove.tone;
  }

  if (record.movementRequest.state === "returned") {
    return "warn";
  }

  if (record.openIssues.some((issue) => issue.status === "blocked")) {
    return "danger";
  }

  return prototypeBaselineTone(record.baseline.state);
}

export function prototypeRecordActionEmphasis(record: PrototypeRecord) {
  return prototypeRecordTone(record) === "danger" ? "primary" : "secondary";
}

function prototypeRecordSearchText(record: PrototypeRecord) {
  return [
    record.baseline.state,
    record.currentMove.label,
    record.dataMode,
    record.id,
    record.ingress,
    record.landing.basePlatform,
    prototypeBasePlatformLabel(record.landing.basePlatform),
    record.landing.previewNeed,
    record.landing.sourceHome,
    record.landing.state,
    record.landing.supportProfile,
    record.lifecycle,
    record.movementRequest.state,
    record.name,
    record.origin,
    record.owner,
    record.preview.profileRef,
    record.preview.profileState,
    record.preview.proofState,
    record.preview.runtimeState,
    record.projectionVersion,
    record.sourcePath,
    record.sourceRef,
    record.summary,
    record.visibilityTier,
    ...record.linkedRecords.map((linkedRecord) => linkedRecord.ref),
    ...record.landing.blockedItems,
    ...record.landing.requiredEvidence,
    ...record.landing.setupItems,
    ...record.landing.supportRows.map(
      (row) => `${row.label} ${row.state} ${row.summary} ${row.detail}`,
    ),
    ...record.openIssues.map((issue) => `${issue.title} ${issue.requiredFix}`),
  ]
    .join(" ")
    .toLowerCase();
}

function comparePrototypeReceipts(
  left: PrototypeProjectedReceipt,
  right: PrototypeProjectedReceipt,
) {
  return (
    left.recordedAt.localeCompare(right.recordedAt) ||
    comparePrototypeReceiptIdentity(left, right)
  );
}

function comparePrototypeReceiptIdentity(
  left: PrototypeProjectedReceipt,
  right: PrototypeProjectedReceipt,
) {
  const sourcePriority = {
    "prototype-local": 0,
    "source record": 1,
  } as const;

  return (
    sourcePriority[left.sourceLabel] - sourcePriority[right.sourceLabel] ||
    left.id.localeCompare(right.id)
  );
}
