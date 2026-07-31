import type {
  PrototypePreviewLaunchAdapter,
  PrototypePreviewRuntimeState,
  PrototypeRecord,
} from "../../domain/prototype-types.ts";

export type PrototypePreviewRuntimeCommandId =
  "restart-preview" | "start-preview" | "stop-preview";

export type PrototypePreviewProfileCommandId =
  "confirm-preview-profile" | "save-preview-profile";

export type PrototypePreviewProfileInput = {
  command: string;
  healthcheckPath: string;
  host: string;
  launchAdapter: PrototypePreviewLaunchAdapter;
  port: string;
  profileRef: string;
  profileSource: string;
  workingDirectory: string;
};

export function prototypePreviewRuntimeCommandDisabledReason(
  record: PrototypeRecord,
  commandId: PrototypePreviewRuntimeCommandId,
): string | null {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return "Terminal Prototype records are review-only.";
  }

  if (record.preview.profileState !== "profile-configured") {
    return commandId === "start-preview"
      ? "Confirm the preview profile before starting the local runtime."
      : "Confirm the preview profile before changing the local runtime.";
  }

  if (record.preview.runtimeState === "unavailable") {
    return "The prototype-local preview runtime is unavailable.";
  }

  if (record.preview.runtimeState === "unknown") {
    return "Refresh the preview runtime projection before changing its state.";
  }

  if (commandId === "start-preview") {
    return record.preview.runtimeState === "running"
      ? "The prototype-local preview is already running."
      : null;
  }

  if (commandId === "restart-preview") {
    return record.preview.runtimeState === "running"
      ? null
      : "Start the prototype-local preview before restarting it.";
  }

  return record.preview.runtimeState === "running"
    ? null
    : "No running prototype-local preview is available to stop.";
}

export function prototypePreviewCheckDisabledReason(
  record: PrototypeRecord,
): string | null {
  if (record.lifecycle === "retired" || record.lifecycle === "graduated") {
    return "Terminal Prototype records are review-only.";
  }

  if (record.preview.profileState !== "profile-configured") {
    return "Confirm the preview profile before recording a check.";
  }

  if (record.preview.runtimeState !== "running") {
    return previewRuntimeCheckUnavailableReason(record.preview.runtimeState);
  }

  if (
    record.preview.launchAdapter === "none" ||
    record.preview.launchAdapter === "unassigned"
  ) {
    return "Select a runnable launch adapter before recording a preview check.";
  }

  if (
    !record.preview.address.trim() ||
    !record.preview.command.trim() ||
    !record.preview.healthcheckPath.trim() ||
    !record.preview.workingDirectory.trim()
  ) {
    return "Complete the launch and healthcheck contract before recording a preview check.";
  }

  return null;
}

export function prototypeRecordAfterPreviewRuntimeCommand(
  record: PrototypeRecord,
  commandId: PrototypePreviewRuntimeCommandId,
  receiptRef: string,
): PrototypeRecord {
  if (prototypePreviewRuntimeCommandDisabledReason(record, commandId)) {
    return record;
  }

  const runtimeState = commandId === "stop-preview" ? "stopped" : "running";

  return {
    ...record,
    evidence: markCurrentPreviewEvidenceStale(record),
    preview: {
      ...record.preview,
      lastCheckedAt: null,
      lastCheckLogRef: null,
      lastProofRef: null,
      proofState: previewProofInvalidationState(record),
      runtimeState,
    },
    projectionFreshness: `prototype-local ${commandId} / ${receiptRef}`,
  };
}

function markCurrentPreviewEvidenceStale(record: PrototypeRecord) {
  if (!record.preview.lastProofRef) {
    return record.evidence;
  }

  return record.evidence.map((evidence) =>
    evidence.id === record.preview.lastProofRef
      ? {
          ...evidence,
          status: "stale",
          tone: "warn" as const,
        }
      : evidence,
  );
}

function upsertPreviewReceiptEvidence(
  record: PrototypeRecord,
  receiptRef: string,
) {
  const evidence = {
    detail:
      "Preview Runtime recorded a current local check and retained its command log reference.",
    id: receiptRef,
    label: "Preview proof receipt",
    status: "proof ready",
    tone: "ok" as const,
  };

  return record.evidence.some((item) => item.id === receiptRef)
    ? record.evidence.map((item) => (item.id === receiptRef ? evidence : item))
    : [...record.evidence, evidence];
}

export function prototypeRecordAfterPreviewCheckCommand(
  record: PrototypeRecord,
  receiptRef: string,
  recordedAt: string,
): PrototypeRecord {
  if (prototypePreviewCheckDisabledReason(record)) {
    return record;
  }

  return {
    ...record,
    baseline: {
      ...record.baseline,
      evidenceRefs: Array.from(
        new Set([...record.baseline.evidenceRefs, receiptRef]),
      ),
      missingItems: record.baseline.missingItems.filter(
        (item) =>
          !["preview profile", "preview proof"].includes(
            item.trim().toLowerCase(),
          ),
      ),
    },
    evidence: upsertPreviewReceiptEvidence(record, receiptRef),
    preview: {
      ...record.preview,
      lastCheckedAt: recordedAt,
      lastCheckLogRef: `local-logs/${receiptRef}.log`,
      lastProofRef: receiptRef,
      proofState: "proof-ready",
    },
    projectionFreshness: `prototype-local preview check / ${receiptRef}`,
  };
}

export function prototypeRecordAfterPreviewProfileCommand(
  record: PrototypeRecord,
  input: PrototypePreviewProfileInput,
  commandId: PrototypePreviewProfileCommandId,
  receiptRef: string,
): PrototypeRecord {
  if (
    record.lifecycle === "retired" ||
    record.lifecycle === "graduated" ||
    !prototypePreviewProfileInputComplete(input)
  ) {
    return record;
  }

  const profileState =
    commandId === "confirm-preview-profile"
      ? "profile-configured"
      : "profile-draft";
  const proofState =
    record.preview.proofState === "not-started" &&
    !record.preview.lastCheckedAt &&
    !record.preview.lastProofRef
      ? "not-started"
      : "stale";

  return {
    ...record,
    baseline:
      commandId === "confirm-preview-profile"
        ? {
            ...record.baseline,
            missingItems: record.baseline.missingItems.filter(
              (item) => item.trim().toLowerCase() !== "preview profile",
            ),
          }
        : record.baseline,
    evidence: markCurrentPreviewEvidenceStale(record),
    preview: {
      ...record.preview,
      address: prototypePreviewAddressFromProfile(input),
      command: input.command,
      healthcheckPath: input.healthcheckPath,
      lastCheckLogRef: null,
      lastCheckedAt: null,
      lastProofRef: null,
      launchAdapter: input.launchAdapter,
      port: input.port,
      profileRef: input.profileRef,
      profileSource: input.profileSource,
      profileState,
      proofState,
      runtimeState: "stopped",
      workingDirectory: input.workingDirectory,
    },
    projectionFreshness: `prototype-local profile / ${receiptRef}`,
  };
}

export function prototypePreviewProfileInputComplete(
  input: PrototypePreviewProfileInput,
) {
  return [
    input.command,
    input.healthcheckPath,
    input.host,
    input.launchAdapter,
    input.port,
    input.profileRef,
    input.profileSource,
    input.workingDirectory,
  ].every((value) => value.trim().length > 0);
}

function prototypePreviewAddressFromProfile(
  input: PrototypePreviewProfileInput,
) {
  return `http://${input.host}:${input.port}`;
}

function previewProofInvalidationState(
  record: PrototypeRecord,
): "not-started" | "stale" {
  return record.preview.proofState === "not-started" &&
    !record.preview.lastCheckedAt &&
    !record.preview.lastProofRef
    ? "not-started"
    : "stale";
}

function previewRuntimeCheckUnavailableReason(
  runtimeState: PrototypePreviewRuntimeState,
) {
  switch (runtimeState) {
    case "running":
      return null;
    case "stopped":
      return "Start the prototype-local preview before recording a check.";
    case "unavailable":
      return "The prototype-local preview runtime is unavailable.";
    case "unknown":
      return "Refresh the preview runtime projection before recording a check.";
  }
}
