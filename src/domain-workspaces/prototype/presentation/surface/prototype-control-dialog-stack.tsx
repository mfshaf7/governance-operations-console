import { PrototypeBaselinePromotionModal } from "../workflows/baseline-promotion/prototype-baseline-promotion-modal.tsx";
import type { PrototypeBaselinePromotionInput } from "../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import { PrototypeCandidatePromotionModal } from "../workflows/candidate-promotion/prototype-candidate-promotion-modal.tsx";
import type { PrototypeCandidatePromotionInput } from "../../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import { PrototypeCloseoutRetirementModal } from "../workflows/closeout-retirement/prototype-closeout-retirement-modal.tsx";
import type { PrototypeCloseoutInput } from "../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import { PrototypeLandingModal } from "../workflows/landing/prototype-landing-modal.tsx";
import { PrototypeMovementRequestModal } from "../workflows/movement-request/prototype-movement-request-modal.tsx";
import type { PrototypeMovementRequestDraftInput } from "../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import { PrototypeRequestModal } from "../dialogs/request/prototype-request-modal.tsx";
import { PrototypeDashboardModal } from "../dashboards/prototype-dashboard/prototype-dashboard-modal.tsx";
import { PrototypeHistoryModal } from "../dialogs/history/prototype-history-modal.tsx";
import { PrototypePreviewRuntimeModal } from "../dashboards/preview-runtime/prototype-preview-runtime-modal.tsx";
import type {
  PrototypePreviewProfileDraft,
  PrototypePreviewProfileMutationActionId,
  PrototypePreviewRuntimeMutationActionId,
} from "../dashboards/preview-runtime/prototype-preview-runtime-model.ts";
import type { PrototypeProjectedReceipt } from "../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeLandingCommandInput } from "../../work-model/workflows/landing/prototype-landing-model.ts";
import type {
  PrototypeLandingSimulationInput,
  PrototypeLandingSimulationResult,
} from "../../local-runtime/prototype-landing-runtime.ts";
import type { PrototypeCommandId } from "../../work-model/commands/prototype-command-model.ts";
import type { PrototypeRecord } from "../../read-model/prototype-workspace-read-model.ts";
import type { PrototypeRequestDraft } from "../../work-model/entry/prototype-request-model.ts";
import {
  prototypeDialogRouteForCurrentMove,
  type PrototypeDialogRoute,
} from "./use-prototype-control-state.ts";

type PrototypeControlDialogStackProps = {
  activeDialog: PrototypeDialogRoute | null;
  activeRecord: PrototypeRecord | null;
  canSubmitRequest: boolean;
  previewReceipts: PrototypeProjectedReceipt[];
  receipts: PrototypeProjectedReceipt[];
  onBackToDashboard: () => void;
  onCloseDialog: () => void;
  onDraftChange: <Field extends keyof PrototypeRequestDraft>(
    field: Field,
    value: PrototypeRequestDraft[Field],
  ) => void;
  onLandPrototype: (
    record: PrototypeRecord,
    input: PrototypeLandingCommandInput,
    commandId: PrototypeCommandId,
  ) => void | Promise<void>;
  onRunLanding: (
    input: PrototypeLandingSimulationInput,
  ) => Promise<PrototypeLandingSimulationResult>;
  onOpenDialog: (route: PrototypeDialogRoute, record?: PrototypeRecord) => void;
  onPreviewCheck: (record: PrototypeRecord) => void | Promise<void>;
  onPreviewProfileAction: (
    record: PrototypeRecord,
    draft: PrototypePreviewProfileDraft,
    actionId: PrototypePreviewProfileMutationActionId,
  ) => void | Promise<void>;
  onPreviewRuntimeAction: (
    record: PrototypeRecord,
    actionId: PrototypePreviewRuntimeMutationActionId,
  ) => void | Promise<void>;
  onRecordBaselinePromotion: (
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeBaselinePromotionInput,
  ) => void | Promise<void>;
  onRecordCandidatePromotion: (
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeCandidatePromotionInput,
  ) => void | Promise<void>;
  onRecordCloseoutRetirement: (
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeCloseoutInput,
  ) => void | Promise<void>;
  onRecordMovementRequest: (
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    draft: PrototypeMovementRequestDraftInput,
  ) => void | Promise<void>;
  onRequestClose: () => void;
  onRequestSubmit: () => void | Promise<void>;
  requestDraft: PrototypeRequestDraft;
  requestOpen: boolean;
};

export function PrototypeControlDialogStack({
  activeDialog,
  activeRecord,
  canSubmitRequest,
  previewReceipts,
  receipts,
  onBackToDashboard,
  onCloseDialog,
  onDraftChange,
  onLandPrototype,
  onRunLanding,
  onOpenDialog,
  onPreviewCheck,
  onPreviewProfileAction,
  onPreviewRuntimeAction,
  onRecordBaselinePromotion,
  onRecordCandidatePromotion,
  onRecordCloseoutRetirement,
  onRecordMovementRequest,
  onRequestClose,
  onRequestSubmit,
  requestDraft,
  requestOpen,
}: PrototypeControlDialogStackProps) {
  return (
    <>
      <PrototypeDashboardModal
        receipts={receipts}
        onClose={onCloseDialog}
        onOpenCurrentAction={(record) =>
          onOpenDialog(prototypeDialogRouteForCurrentMove(record), record)
        }
        onOpenCloseout={(record) => onOpenDialog("closeout-retirement", record)}
        onOpenHistory={(record) => onOpenDialog("history", record)}
        onOpenPreviewRuntime={() => onOpenDialog("preview-runtime")}
        record={activeDialog === "dashboard" ? activeRecord : null}
      />
      <PrototypeCloseoutRetirementModal
        onBackToDashboard={onBackToDashboard}
        onClose={onCloseDialog}
        onRecordReceipt={onRecordCloseoutRetirement}
        record={activeDialog === "closeout-retirement" ? activeRecord : null}
      />
      <PrototypeCandidatePromotionModal
        onBackToDashboard={onBackToDashboard}
        onClose={onCloseDialog}
        onRecordReceipt={onRecordCandidatePromotion}
        record={activeDialog === "candidate-promotion" ? activeRecord : null}
      />
      <PrototypeLandingModal
        onBackToDashboard={onBackToDashboard}
        onClose={onCloseDialog}
        onOpenDashboard={() => onOpenDialog("dashboard")}
        onLandPrototype={onLandPrototype}
        onRunLanding={onRunLanding}
        record={activeDialog === "landing" ? activeRecord : null}
      />
      <PrototypePreviewRuntimeModal
        receipts={previewReceipts}
        onBackToDashboard={onBackToDashboard}
        onClose={onCloseDialog}
        onPreviewCheck={onPreviewCheck}
        onPreviewProfileAction={onPreviewProfileAction}
        onPreviewRuntimeAction={onPreviewRuntimeAction}
        record={activeDialog === "preview-runtime" ? activeRecord : null}
      />
      <PrototypeBaselinePromotionModal
        onBackToDashboard={onBackToDashboard}
        onClose={onCloseDialog}
        onRecordReceipt={onRecordBaselinePromotion}
        record={activeDialog === "baseline-promotion" ? activeRecord : null}
      />
      <PrototypeMovementRequestModal
        onBackToDashboard={onBackToDashboard}
        onClose={onCloseDialog}
        onOpenHistory={(record) => onOpenDialog("history", record)}
        onRecordReceipt={onRecordMovementRequest}
        record={activeDialog === "movement-request" ? activeRecord : null}
      />
      <PrototypeHistoryModal
        receipts={receipts}
        onClose={onCloseDialog}
        record={activeDialog === "history" ? activeRecord : null}
      />
      <PrototypeRequestModal
        canSubmit={canSubmitRequest}
        draft={requestDraft}
        onClose={onRequestClose}
        onDraftChange={onDraftChange}
        onSubmit={onRequestSubmit}
        open={requestOpen}
      />
    </>
  );
}
