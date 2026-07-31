import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypePreviewProfileLabel,
  prototypePreviewProfileTone,
} from "./prototype-preview-profile-model.ts";
import {
  prototypePreviewProofLabel,
  prototypePreviewProofResult,
  prototypePreviewProofTone,
} from "./prototype-preview-proof-model.ts";
import type {
  PrototypePreviewRuntimeFact,
  PrototypePreviewRuntimeRow,
  PrototypePreviewRuntimeTab,
} from "./prototype-preview-runtime-types.ts";

export function prototypePreviewDefaultControlTab(
  record: PrototypeRecord,
): PrototypePreviewRuntimeTab {
  if (record.preview.profileState !== "profile-configured") {
    return "profile";
  }

  if (
    record.preview.proofState === "proof-failed" ||
    record.preview.proofState === "proof-ready" ||
    record.preview.proofState === "stale"
  ) {
    return "evidence";
  }

  return "runtime";
}

export function prototypePreviewRuntimeStatusRows(
  record: PrototypeRecord,
): PrototypePreviewRuntimeRow[] {
  const proof = prototypePreviewProofResult(record);

  return [
    {
      detail: "Current local preview endpoint from the prototype profile.",
      label: "Endpoint",
      status: record.preview.address,
      tone: prototypePreviewRuntimeTone(record),
    },
    {
      detail: "Reserved local port declared by the preview profile.",
      label: "Port",
      status: record.preview.port,
      tone: record.preview.port === "not reserved" ? "warn" : "info",
    },
    {
      detail: "Runtime admission depends on the profile state.",
      label: "Profile gate",
      status: prototypePreviewProfileLabel(record),
      tone: prototypePreviewProfileTone(record),
    },
    {
      detail: "Latest local check result that can feed baseline evidence.",
      label: "Check",
      status: proof.statusLabel,
      tone: proof.tone,
    },
  ];
}

export function prototypePreviewRuntimeContractFacts(
  record: PrototypeRecord,
): PrototypePreviewRuntimeFact[] {
  return [
    { label: "Launch command", value: record.preview.command },
    { label: "Working directory", value: record.preview.workingDirectory },
    { label: "Profile source", value: record.preview.profileSource },
  ];
}

export function prototypePreviewRuntimeTraceRows(
  record: PrototypeRecord,
): PrototypePreviewRuntimeRow[] {
  const profileTone = prototypePreviewProfileTone(record);
  const proofTone = prototypePreviewProofTone(record);

  return [
    {
      detail: "Profile exists and can be admitted for local runtime.",
      label: "Profile lookup",
      status:
        record.preview.profileState === "no-profile"
          ? "missing"
          : record.preview.profileState === "profile-draft"
            ? "draft"
            : "ready",
      tone: profileTone,
    },
    {
      detail: record.preview.command,
      label: "Runtime command",
      status:
        record.preview.profileState === "profile-configured"
          ? "declared"
          : "waiting",
      tone:
        record.preview.profileState === "profile-configured" ? "ok" : "warn",
    },
    {
      detail: record.preview.workingDirectory,
      label: "Runtime state",
      status: prototypePreviewRuntimeLabel(record),
      tone: prototypePreviewRuntimeTone(record),
    },
    {
      detail: "Healthcheck result becomes the local preview evidence.",
      label: "Healthcheck",
      status: prototypePreviewProofLabel(record),
      tone: proofTone,
    },
  ];
}

export function prototypePreviewRuntimeLabel(record: PrototypeRecord) {
  switch (record.preview.runtimeState) {
    case "running":
      return "Running";
    case "stopped":
      return "Stopped";
    case "unavailable":
      return "Unavailable";
    case "unknown":
      return "Unknown";
  }
}

export function prototypePreviewRuntimeTone(record: PrototypeRecord) {
  switch (record.preview.runtimeState) {
    case "running":
      return "ok" as const;
    case "stopped":
      return "muted" as const;
    case "unavailable":
      return "danger" as const;
    case "unknown":
      return "warn" as const;
  }
}

export function prototypePreviewReceiptRows(
  record: PrototypeRecord,
): PrototypePreviewRuntimeRow[] {
  return [
    {
      detail:
        record.preview.lastProofRef ??
        "Created by Record Preview Check in this prototype session.",
      label: "Receipt identity",
      status: record.preview.lastProofRef ? "saved" : "pending",
      tone: record.preview.lastProofRef ? "ok" : "warn",
    },
    {
      detail:
        record.preview.lastCheckLogRef ??
        "Operator-safe local log reference for the latest check.",
      label: "Log reference",
      status: record.preview.lastCheckLogRef ? "linked" : "pending",
      tone: record.preview.lastCheckLogRef ? "info" : "muted",
    },
    {
      detail:
        "This is not baseline approval, security approval, platform readiness, or production evidence.",
      label: "Evidence boundary",
      status: "prototype-local",
      tone: "warn",
    },
    {
      detail:
        "Receipt review stays in Prototype history until future durable wiring exists.",
      label: "Review path",
      status: "History",
      tone: "info",
    },
  ];
}

export function prototypePreviewPacketEligibilityRows(
  record: PrototypeRecord,
): PrototypePreviewRuntimeRow[] {
  return [
    {
      detail:
        "Baseline packet evidence can only use a confirmed preview profile.",
      label: "Profile",
      status: prototypePreviewProfileLabel(record),
      tone: prototypePreviewProfileTone(record),
    },
    {
      detail: "The declared endpoint must have a current local check result.",
      label: "Runtime check",
      status: prototypePreviewProofLabel(record),
      tone: prototypePreviewProofTone(record),
    },
    {
      detail:
        "Packet eligibility requires a recorded prototype-local check receipt.",
      label: "Receipt",
      status: record.preview.lastProofRef ? "available" : "pending",
      tone: record.preview.lastProofRef ? "ok" : "warn",
    },
    {
      detail:
        "Preview Runtime supplies evidence only; Baseline Promotion owns assembly.",
      label: "Packet owner",
      status: "Baseline Promotion",
      tone: record.preview.lastProofRef ? "info" : "muted",
    },
  ];
}
