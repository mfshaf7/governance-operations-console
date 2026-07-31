import type { TerasTone } from "@/teras";

import type {
  PrototypeSupportAreaId,
  PrototypeSupportRow,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeLandingDraftKey,
  type PrototypeLandingDraft,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import {
  prototypeSupportRowWithState,
  prototypeSupportStateLabel,
} from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";
import type { PrototypeLandingStatusProjection } from "./prototype-landing-types.ts";

export const prototypeLandingSupportDerivedFields = new Set<
  keyof PrototypeLandingDraft
>([
  "dataMode",
  "mutationBoundary",
  "previewNeed",
  "sourceHome",
  "summary",
  "supportProfile",
  "visibilityTier",
]);

export function prototypeLandingSupportPlannerStatus({
  landingDraftDirty,
  landingDraftMutable,
  supportProfileCustom,
}: {
  landingDraftDirty: boolean;
  landingDraftMutable: boolean;
  supportProfileCustom: boolean;
}): PrototypeLandingStatusProjection {
  if (!landingDraftMutable) {
    return {
      label: "Locked",
      tone: "muted",
    };
  }

  if (supportProfileCustom) {
    return {
      label: landingDraftDirty ? "Custom draft" : "Custom editable",
      tone: "warn",
    };
  }

  return {
    label: landingDraftDirty ? "Generated draft" : "Profile generated",
    tone: landingDraftDirty ? "warn" : "info",
  };
}

export function prototypeLandingRunStatus({
  landingBlocked,
  landingDraftDirty,
  landingRunComplete,
}: {
  landingBlocked: boolean;
  landingDraftDirty: boolean;
  landingRunComplete: boolean;
}): PrototypeLandingStatusProjection {
  if (landingRunComplete) {
    return {
      label: landingBlocked ? "Run blocked" : "Run complete",
      tone: landingBlocked ? "warn" : "ok",
    };
  }

  return {
    label: landingDraftDirty ? "Draft not run" : "Ready to run",
    tone: "warn",
  };
}

export function prototypeLandingRunActionStatus(
  landingRunActionAvailable: boolean,
): PrototypeLandingStatusProjection {
  return {
    emphasis: landingRunActionAvailable ? "primary" : "secondary",
    label: "Run Landing",
    tone: landingRunActionAvailable ? "warn" : "muted",
  };
}

export function prototypeLandingSupportOptionStatus(
  supportProfileCustom: boolean,
): PrototypeLandingStatusProjection {
  return {
    label: supportProfileCustom ? "Option and state" : "Generated profile row",
    tone: supportProfileCustom ? "warn" : "muted",
  };
}

export function prototypeLandingSupportStateControlStatus(
  selectedSupportRowLocked: boolean,
): PrototypeLandingStatusProjection {
  return {
    label: "Support state",
    tone: selectedSupportRowLocked ? "muted" : "warn",
  };
}

export function prototypeLandingRunPanelTone(
  landingBlocked: boolean,
): TerasTone {
  return landingBlocked ? "warn" : "ok";
}

export function prototypeLandingSupportRowDisplay(row: PrototypeSupportRow): {
  status: string;
  tone: TerasTone;
} {
  return {
    status: prototypeSupportStateLabel(row.state),
    tone: row.tone,
  };
}

export function prototypeLandingSelectedSupportRowDisplay(
  row: PrototypeSupportRow | undefined,
) {
  if (!row) {
    return {
      detail: "Support detail",
      status: "none",
      summary: "Select a support row.",
      tone: "muted" as const,
    };
  }

  const display = prototypeLandingSupportRowDisplay(row);

  return {
    detail: row.detail,
    status: display.status,
    summary: row.summary,
    tone: display.tone,
  };
}

export function prototypeLandingApplySystemSupportLocks(
  draft: PrototypeLandingDraft,
): PrototypeLandingDraft {
  return {
    ...draft,
    supportRows: draft.supportRows.map((row) =>
      prototypeLandingSupportRowIsSystemLocked(row.id, draft)
        ? prototypeSupportRowWithState(row, "blocked")
        : row,
    ),
  };
}

export function prototypeLandingSupportRowIsSystemLocked(
  rowId: PrototypeSupportAreaId | undefined,
  draft: PrototypeLandingDraft,
) {
  if (!rowId) {
    return false;
  }

  if (rowId === "data" && draft.dataMode === "real-mutable") {
    return true;
  }

  if (rowId === "integration" && draft.mutationBoundary === "real-system") {
    return true;
  }

  return (
    rowId === "recovery" &&
    (draft.dataMode === "real-mutable" ||
      draft.mutationBoundary === "real-system")
  );
}

export { prototypeLandingDraftKey };
