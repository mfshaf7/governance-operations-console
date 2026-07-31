import type { TerasTone } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypePreviewRuntimeCommandDisabledReason } from "../../../work-model/preview-runtime/prototype-preview-state-model.ts";
import {
  prototypePreviewProfileLabel,
  prototypePreviewProfileTone,
} from "./prototype-preview-profile-model.ts";
import {
  prototypePreviewProofFacts,
  prototypePreviewProofResult,
  prototypePreviewProofTone,
  prototypePreviewRecoveryRows,
} from "./prototype-preview-proof-model.ts";
import {
  prototypePreviewPacketEligibilityRows,
  prototypePreviewRuntimeContractFacts,
  prototypePreviewRuntimeTraceRows,
} from "./prototype-preview-runtime-status-model.ts";
import type {
  PrototypePreviewActionDialogShell,
  PrototypePreviewRuntimeAction,
  PrototypePreviewRuntimeActionDetail,
  PrototypePreviewRuntimeActionId,
  PrototypePreviewRuntimeRow,
} from "./prototype-preview-runtime-types.ts";

export function prototypePreviewRuntimeActions(
  record: PrototypeRecord,
): PrototypePreviewRuntimeAction[] {
  const profileReady = record.preview.profileState === "profile-configured";
  const failed = record.preview.proofState === "proof-failed";
  const startDisabledReason = prototypePreviewRuntimeCommandDisabledReason(
    record,
    "start-preview",
  );
  const stopDisabledReason = prototypePreviewRuntimeCommandDisabledReason(
    record,
    "stop-preview",
  );
  const restartDisabledReason = prototypePreviewRuntimeCommandDisabledReason(
    record,
    "restart-preview",
  );

  return [
    {
      detail: profileReady
        ? "Start the prototype-local preview from the confirmed profile."
        : "Profile confirmation is required before runtime can start.",
      disabled: Boolean(startDisabledReason),
      id: "start-preview",
      label: profileReady ? "Start Preview" : "Configure Profile First",
      tone: profileReady ? "ok" : "warn",
    },
    {
      detail:
        "Stop the prototype-local preview and keep prior receipts in history.",
      disabled: Boolean(stopDisabledReason),
      id: "stop-preview",
      label: "Stop Preview",
      tone: "danger",
    },
    {
      detail: "Restart the local preview after profile or source corrections.",
      disabled: Boolean(restartDisabledReason),
      id: "restart-preview",
      label: "Restart Preview",
      tone: "warn",
    },
    {
      detail: failed
        ? "Inspect the failed check path and retry plan."
        : "Inspect current runtime state and check trace.",
      id: failed ? "open-blocker" : "check-status",
      label: failed ? "Review Issue" : "Check Status",
      tone: failed ? "danger" : "info",
    },
  ];
}

export function prototypePreviewActionDialogShell(
  action: PrototypePreviewRuntimeActionDetail | null | undefined,
): PrototypePreviewActionDialogShell {
  return {
    description: action?.summary,
    title: action?.title ?? "Preview action",
  };
}

export function prototypePreviewActionDetail(
  actionId: PrototypePreviewRuntimeActionId,
  record: PrototypeRecord,
): PrototypePreviewRuntimeActionDetail {
  const proof = prototypePreviewProofResult(record);
  const runtimeFacts = prototypePreviewRuntimeContractFacts(record);
  const proofFacts = prototypePreviewProofFacts(record, proof);

  switch (actionId) {
    case "start-preview":
      return {
        facts: runtimeFacts,
        primaryAction: "Start Preview",
        primaryBehavior: "start-preview",
        rows: [
          previewActionRow(
            "Profile gate",
            prototypePreviewProfileLabel(record),
            prototypePreviewProfileTone(record),
          ),
          previewActionRow("Command", record.preview.command, "info"),
          previewActionRow(
            "Working directory",
            record.preview.workingDirectory,
            "info",
          ),
          previewActionRow(
            "Healthcheck",
            record.preview.healthcheckPath,
            "info",
          ),
        ],
        summary:
          "Start the prototype-local preview from the confirmed profile. Record a separate check before using it as evidence.",
        secondaryAction: "Close",
        title: "Start preview",
        tone: "ok",
      };
    case "stop-preview":
      return {
        facts: runtimeFacts,
        primaryAction: "Stop Preview",
        primaryBehavior: "stop-preview",
        rows: [
          previewActionRow("Runtime", proof.currentStep, proof.tone),
          previewActionRow("History", "prior receipts stay available", "info"),
          previewActionRow(
            "Current proof",
            "cleared from active preview state",
            "warn",
          ),
        ],
        summary:
          "Stop the prototype-local preview. This does not delete receipt history or approve baseline state.",
        secondaryAction: "Close",
        title: "Stop preview",
        tone: "danger",
      };
    case "restart-preview":
      return {
        facts: runtimeFacts,
        primaryAction: "Restart Preview",
        primaryBehavior: "restart-preview",
        rows: [
          previewActionRow(
            "Profile gate",
            prototypePreviewProfileLabel(record),
            prototypePreviewProfileTone(record),
          ),
          previewActionRow("Runtime", "stop then start local preview", "warn"),
          previewActionRow(
            "Check",
            "record a fresh check after restart",
            "info",
          ),
        ],
        summary:
          "Restart the prototype-local preview. Existing proof becomes stale until a new check is recorded.",
        secondaryAction: "Close",
        title: "Restart preview",
        tone: "warn",
      };
    case "check-status":
      return {
        facts: [...runtimeFacts, ...proofFacts],
        primaryAction: "Close",
        rows: prototypePreviewRuntimeTraceRows(record),
        summary:
          "Status trace shows the current profile and local runtime state before recording preview evidence.",
        title: "Preview status trace",
        tone: proof.tone,
      };
    case "prepare-proof":
      return {
        facts: [
          ...proofFacts,
          { label: "Target", value: "Baseline packet preview evidence" },
        ],
        primaryAction: "Close",
        rows: prototypePreviewPacketEligibilityRows(record),
        summary:
          "Review the log reference, receipt state, and packet eligibility for the current local preview check. Preview Runtime does not assemble the packet here.",
        title: "Evidence details",
        tone: prototypePreviewProofTone(record),
      };
    case "open-blocker":
      return {
        facts: [
          ...proofFacts,
          { label: "Blocked step", value: proof.currentStep },
        ],
        primaryAction: "Close",
        primaryBehavior: "close",
        rows: prototypePreviewRecoveryRows(record).map((row) => ({
          detail: row.detail,
          label: row.label,
          status: row.status,
          tone: row.tone,
        })),
        summary:
          "Resolve the visible preview issue before the check can support baseline evidence.",
        title: "Preview issue",
        tone: proof.tone,
      };
  }
}

function previewActionRow(
  label: string,
  status: string,
  tone: TerasTone,
): PrototypePreviewRuntimeRow {
  return {
    detail: status,
    label,
    status,
    tone,
  };
}
