import type { TerasTone } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypePreviewMetric,
  PrototypePreviewPanelProjection,
  PrototypePreviewProofResult,
  PrototypePreviewRecoveryRow,
  PrototypePreviewRuntimeFact,
} from "./prototype-preview-runtime-types.ts";

export function prototypePreviewProofResult(
  record: PrototypeRecord,
): PrototypePreviewProofResult {
  const noLogRef = "No local preview log yet.";

  if (record.lifecycle === "retired") {
    return {
      currentStep: "Archive",
      logRef: record.preview.lastCheckLogRef ?? "No active preview log.",
      receiptRef: record.preview.lastProofRef ?? "No receipt saved.",
      requiredMove: "Review history only unless reactivation is approved.",
      statusLabel: "Closed",
      summary: "This prototype is retired, so preview checks are read-only.",
      title: "Preview Closed",
      tone: "muted",
    };
  }

  if (record.preview.profileState === "no-profile") {
    return {
      currentStep: "Profile setup",
      logRef: record.preview.lastCheckLogRef ?? noLogRef,
      receiptRef: "No receipt saved.",
      requiredMove:
        "Set up and confirm the local preview profile before running a check.",
      statusLabel: "Needs profile",
      summary:
        "The preview cannot be checked until the local profile is ready.",
      title: "Profile Still Needed",
      tone: "warn",
    };
  }

  if (record.preview.profileState === "profile-draft") {
    return {
      currentStep: "Confirm profile",
      logRef: record.preview.lastCheckLogRef ?? noLogRef,
      receiptRef: "No receipt saved.",
      requiredMove:
        "Review and confirm the draft profile before running a check.",
      statusLabel: "Draft",
      summary:
        "The draft is ready to review, but preview checks stay locked until it is confirmed.",
      title: "Review Draft Profile",
      tone: "warn",
    };
  }

  if (record.preview.proofState === "proof-failed") {
    return {
      currentStep: "Fix check",
      logRef: record.preview.lastCheckLogRef ?? "No failed check log recorded.",
      receiptRef: record.preview.lastProofRef ?? "No passing receipt saved.",
      requiredMove:
        "Fix the failed preview path, then save a fresh check result.",
      statusLabel: "Needs fix",
      summary:
        "The profile is configured, but the last preview check did not pass.",
      title: "Fix Preview Check",
      tone: "danger",
    };
  }

  if (record.preview.proofState === "proof-ready") {
    return {
      currentStep: "Receipt ready",
      logRef: record.preview.lastCheckLogRef ?? "No check log recorded.",
      receiptRef: record.preview.lastProofRef ?? "No receipt saved yet.",
      requiredMove:
        "Use this local receipt as preview evidence for the baseline promotion.",
      statusLabel: "Ready",
      summary:
        "The preview profile and latest check are ready to support the packet.",
      title: "Preview Check Ready",
      tone: "ok",
    };
  }

  if (record.preview.proofState === "stale") {
    return {
      currentStep: "Refresh check",
      logRef: record.preview.lastCheckLogRef ?? noLogRef,
      receiptRef:
        record.preview.lastProofRef ?? "Prior receipt moved to history.",
      requiredMove:
        record.preview.runtimeState === "running"
          ? "Record a new preview check for the active runtime."
          : "Start the preview, then record a new check.",
      statusLabel: "Stale",
      summary:
        "The previous check no longer represents the current profile or runtime state.",
      title: "Preview Check Stale",
      tone: "warn",
    };
  }

  if (record.preview.runtimeState === "running") {
    return {
      currentStep: "Record check",
      logRef: record.preview.lastCheckLogRef ?? noLogRef,
      receiptRef: "No current check receipt saved.",
      requiredMove: "Record a preview check for the active local runtime.",
      statusLabel: "Running",
      summary:
        "The local preview is running, but it has not produced current evidence yet.",
      title: "Preview Ready to Check",
      tone: "info",
    };
  }

  if (record.preview.runtimeState === "unavailable") {
    return {
      currentStep: "Restore runtime",
      logRef: record.preview.lastCheckLogRef ?? noLogRef,
      receiptRef: "No current check receipt saved.",
      requiredMove:
        "Restore the prototype-local runtime before recording a check.",
      statusLabel: "Unavailable",
      summary: "The configured local preview runtime is currently unavailable.",
      title: "Preview Runtime Unavailable",
      tone: "danger",
    };
  }

  if (record.preview.runtimeState === "unknown") {
    return {
      currentStep: "Refresh state",
      logRef: record.preview.lastCheckLogRef ?? noLogRef,
      receiptRef: "No current check receipt saved.",
      requiredMove: "Refresh runtime state before taking another action.",
      statusLabel: "Unknown",
      summary: "The current local preview runtime state is not known.",
      title: "Preview State Unknown",
      tone: "warn",
    };
  }

  return {
    currentStep: "Not started",
    logRef: record.preview.lastCheckLogRef ?? noLogRef,
    receiptRef: record.preview.lastProofRef ?? "No receipt saved yet.",
    requiredMove: "Run and save a preview check when the profile is ready.",
    statusLabel: "Not started",
    summary: "No preview check has been saved for this prototype yet.",
    title: "Preview Check Not Started",
    tone: "muted",
  };
}

export function prototypePreviewRecoveryRows(
  record: PrototypeRecord,
): PrototypePreviewRecoveryRow[] {
  if (record.lifecycle === "retired") {
    return [
      {
        detail:
          "This record stays review-only unless reactivation is approved.",
        label: "Review history",
        status: "closed",
        tone: "muted",
      },
    ];
  }

  if (record.preview.profileState === "no-profile") {
    return [
      {
        detail:
          "Add the command, working directory, healthcheck, and local boundary.",
        label: "Set up profile",
        status: "needed",
        tone: "warn",
      },
      {
        detail:
          "The preview check stays locked until the profile is confirmed.",
        label: "Keep check locked",
        status: "locked",
        tone: "info",
      },
    ];
  }

  if (record.preview.proofState === "proof-failed") {
    return [
      {
        detail: "Read the failed check log before saving a new result.",
        label: "Review failed check",
        status: "needed",
        tone: "danger",
      },
      {
        detail:
          "Fix the profile, source path, or preview launch mismatch, then run the check again.",
        label: "Fix preview path",
        status: "next",
        tone: "warn",
      },
    ];
  }

  return [
    {
      detail: "Review the profile before reusing this check in a packet.",
      label: "Review profile",
      status:
        record.preview.profileState === "profile-configured"
          ? "available"
          : "required",
      tone:
        record.preview.profileState === "profile-configured" ? "ok" : "warn",
    },
    {
      detail:
        "Save a fresh preview check when the packet needs current evidence.",
      label: "Save check",
      status:
        record.preview.proofState === "proof-ready" ? "ready" : "available",
      tone: record.preview.proofState === "proof-ready" ? "ok" : "warn",
    },
  ];
}

export function prototypePreviewProofLabel(record: PrototypeRecord) {
  switch (record.preview.proofState) {
    case "not-started":
      return "Not started";
    case "proof-failed":
      return "Needs fix";
    case "proof-ready":
      return "Ready";
    case "stale":
      return "Stale";
  }
}

export function prototypePreviewEvidenceMetrics(
  record: PrototypeRecord,
  proofResult: PrototypePreviewProofResult,
): PrototypePreviewMetric[] {
  const logAvailable = Boolean(record.preview.lastCheckLogRef);
  const receiptAvailable = Boolean(record.preview.lastProofRef);
  const checkDone = Boolean(record.preview.lastCheckedAt);

  return [
    {
      label: "Log",
      tone: logAvailable ? "info" : "muted",
      value: logAvailable ? "Available" : "Pending",
    },
    {
      label: "Receipt",
      tone: receiptAvailable ? "ok" : "warn",
      value: receiptAvailable ? "Saved" : "Pending",
    },
    {
      label: "Check",
      tone: checkDone ? proofResult.tone : "muted",
      value: checkDone ? "Done" : "Pending",
    },
  ];
}

export function prototypePreviewEvidenceCommandProjection(
  commandDisabled: boolean,
  commandTone: TerasTone,
): PrototypePreviewPanelProjection {
  return {
    statusLabel: commandDisabled ? "Locked" : "Ready",
    tone: commandTone,
  };
}

export function prototypePreviewEvidenceReceiptProjection(
  record: PrototypeRecord,
  proofResult: PrototypePreviewProofResult,
): PrototypePreviewPanelProjection {
  return {
    statusLabel: record.preview.lastProofRef ? "Available" : "Pending",
    tone: proofResult.tone,
  };
}

export function prototypePreviewProofFacts(
  record: PrototypeRecord,
  proof: PrototypePreviewProofResult,
): PrototypePreviewRuntimeFact[] {
  return [
    { label: "Log", value: proof.logRef },
    { label: "Receipt", value: proof.receiptRef },
    { label: "Result", value: proof.statusLabel },
    {
      label: "Last Checked",
      value: record.preview.lastCheckedAt ?? "Not checked",
    },
  ];
}

export function prototypePreviewProofTone(record: PrototypeRecord): TerasTone {
  switch (record.preview.proofState) {
    case "proof-ready":
      return "ok";
    case "proof-failed":
      return "danger";
    case "stale":
      return "warn";
    case "not-started":
      return "muted";
  }
}
