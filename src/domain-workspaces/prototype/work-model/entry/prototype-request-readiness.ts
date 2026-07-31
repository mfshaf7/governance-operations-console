import type { OperationTone } from "../../../operation-contracts/operation-state.ts";

import { prototypeBasePlatformLabel } from "../../domain/support/prototype-setup-profile-model.ts";
import { prototypeSupportProfileLabel } from "../../domain/support/prototype-support-profile-model.ts";
import {
  prototypeRequestDataModeLabel,
  prototypeRequestMutationBoundaryLabel,
  prototypeRequestPreviewNeedLabel,
  prototypeRequestSourceHomeLabel,
  prototypeRequestVisibilityLabel,
} from "./prototype-request-options.ts";
import {
  emptyPrototypeRequestDraft,
  type PrototypeRequestDraft,
  type PrototypeRequestReadinessRow,
} from "./prototype-request-types.ts";

export function prototypeRequestDraftDirty(draft: PrototypeRequestDraft) {
  return (
    draft.name.trim().length > 0 ||
    draft.owner.trim().length > 0 ||
    draft.prototypeObjective.trim().length > 0 ||
    draft.sourceContext.trim().length > 0 ||
    draft.basePlatform !== emptyPrototypeRequestDraft.basePlatform ||
    draft.dataMode !== emptyPrototypeRequestDraft.dataMode ||
    draft.mutationBoundary !== emptyPrototypeRequestDraft.mutationBoundary ||
    draft.previewNeed !== emptyPrototypeRequestDraft.previewNeed ||
    draft.sourceHome !== emptyPrototypeRequestDraft.sourceHome ||
    draft.supportProfile !== emptyPrototypeRequestDraft.supportProfile ||
    draft.visibilityTier !== emptyPrototypeRequestDraft.visibilityTier
  );
}

export function prototypeRequestDraftComplete(draft: PrototypeRequestDraft) {
  return prototypeRequestReadinessRows(draft).every((row) => row.tone === "ok");
}

export function prototypeRequestReadinessRows(
  draft: PrototypeRequestDraft,
): PrototypeRequestReadinessRow[] {
  const name = draft.name.trim();
  const owner = draft.owner.trim();
  const prototypeObjective = draft.prototypeObjective.trim();
  const sourceContext = draft.sourceContext.trim();
  const hasBoundaryBlocker =
    draft.dataMode === "real-mutable" ||
    draft.mutationBoundary === "real-system";

  return [
    readinessRow({
      complete: Boolean(name && owner),
      detail: name && owner ? `${name} / ${owner}` : "Name and owner required.",
      id: "request-identity",
      indexLabel: "01",
      label: "Request identity",
    }),
    readinessRow({
      complete: Boolean(prototypeObjective),
      detail: prototypeObjective || "State what the prototype should prove.",
      id: "prototype-objective",
      indexLabel: "02",
      label: "Prototype objective",
    }),
    readinessRow({
      complete: Boolean(sourceContext),
      detail: sourceContext || "Origin, current state, open issues.",
      id: "source-context",
      indexLabel: "03",
      label: "Source context",
    }),
    readinessRow({
      complete: Boolean(draft.supportProfile),
      detail: prototypeSupportProfileLabel(draft.supportProfile),
      id: "support-setup",
      indexLabel: "04",
      label: "Support profile",
    }),
    readinessRow({
      complete: Boolean(draft.sourceHome && draft.previewNeed),
      detail: `${prototypeRequestSourceHomeLabel(draft.sourceHome)} / ${prototypeRequestPreviewNeedLabel(draft.previewNeed)} / ${prototypeBasePlatformLabel(draft.basePlatform)}`,
      id: "studio-options",
      indexLabel: "05",
      label: "Studio options",
    }),
    readinessRow({
      complete: Boolean(
        draft.visibilityTier && draft.dataMode && draft.mutationBoundary,
      ),
      detail: hasBoundaryBlocker
        ? "Real mutation cannot land as a normal request."
        : `${prototypeRequestVisibilityLabel(draft.visibilityTier)} / ${prototypeRequestDataModeLabel(draft.dataMode)} / ${prototypeRequestMutationBoundaryLabel(draft.mutationBoundary)}`,
      id: "boundary",
      indexLabel: "06",
      label: "Boundary",
      toneOverride: hasBoundaryBlocker ? "danger" : undefined,
    }),
  ];
}

function readinessRow({
  complete,
  detail,
  id,
  indexLabel,
  label,
  toneOverride,
}: {
  complete: boolean;
  detail: string;
  id: PrototypeRequestReadinessRow["id"];
  indexLabel: string;
  label: string;
  toneOverride?: OperationTone;
}): PrototypeRequestReadinessRow {
  const tone = toneOverride ?? (complete ? "ok" : "warn");

  return {
    detail,
    id,
    indexLabel,
    label,
    status: tone === "ok" ? "ready" : tone === "danger" ? "blocked" : "needed",
    tone,
  };
}
