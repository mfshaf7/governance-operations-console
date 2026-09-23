"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import {
  getPrototypeEntryPacketProjections,
  subscribePrototypeEntryPacketProjections,
} from "../../local-runtime/prototype-entry-runtime.ts";
import { recordPrototypeMovementRequestPacket } from "../../../operation-integrations/prototype-movement-request-projection.ts";
import {
  getPrototypeRuntimeCapabilities,
  submitPrototypeProjectionCommand,
  submitPrototypeRequestCommand,
  type PrototypeCommandInputById,
} from "../../local-runtime/prototype-runtime.ts";
import type { PrototypeLandingCommandInput } from "../../work-model/workflows/landing/prototype-landing-model.ts";
import { projectPrototypeEffectiveReadModel } from "../../local-runtime/prototype-effective-projection.ts";
import {
  runPrototypeLandingSimulation,
  type PrototypeLandingSimulationInput,
} from "../../local-runtime/prototype-landing-runtime.ts";
import {
  getPrototypeWorkspaceReadModel,
  type PrototypeRecord,
} from "../../read-model/prototype-workspace-read-model.ts";
import {
  filterPrototypeRecords,
  getPrototypeBaselineOptions,
  getPrototypeLifecycleOptions,
  getPrototypeWorkspaceStats,
  getSelectedPrototypeRecord,
} from "../../read-model/selectors/prototype-workspace-selectors.ts";
import type { PrototypeCommandId } from "../../work-model/commands/prototype-command-model.ts";
import { prototypeRecordFromEntryPacket } from "../../work-model/entry/prototype-entry-packet.ts";
import {
  emptyPrototypeRequestDraft,
  prototypeRequestDraftComplete,
  type PrototypeRequestDraft,
} from "../../work-model/entry/prototype-request-model.ts";
import {
  canRecordPrototypeBaselinePromotion,
  type PrototypeBaselinePromotionInput,
} from "../../work-model/workflows/baseline-promotion/prototype-baseline-promotion-model.ts";
import { type PrototypeCandidatePromotionInput } from "../../work-model/workflows/candidate-promotion/prototype-candidate-promotion-model.ts";
import { type PrototypeMovementRequestDraftInput } from "../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
import { usePrototypeDeliveryLiveRuntime } from "../../live-runtime/use-prototype-delivery-live-runtime.ts";
import { prototypeRecordSourceId } from "../../live-runtime/prototype-delivery-live-projection.ts";
import { usePrototypeClosureLiveRuntime } from "../../live-runtime/use-prototype-closure-live-runtime.ts";
import {
  prototypeLandingAllowsLocalFallback,
  usePrototypeLandingLiveRuntime,
} from "../../live-runtime/use-prototype-landing-live-runtime.ts";
import {
  prototypeMaturityAllowsLocalFallback,
  prototypeMaturityInputKey,
  usePrototypeMaturityLiveRuntime,
} from "../../live-runtime/use-prototype-maturity-live-runtime.ts";
import {
  type PrototypePreviewProfileDraft,
  type PrototypePreviewProfileMutationActionId,
  type PrototypePreviewRuntimeMutationActionId,
} from "../dashboards/preview-runtime/prototype-preview-runtime-model.ts";
import {
  prototypeSummaryMetrics,
  prototypeWorkspaceStatus,
} from "./prototype-control-view-model.ts";
import {
  type PrototypeDialogRoute,
  usePrototypeControlState,
} from "./use-prototype-control-state.ts";

export function usePrototypeControlController({
  entryIntent = null,
}: {
  entryIntent?: ConsoleSurfaceEntryIntent | null;
} = {}) {
  const runtimeCapabilities = getPrototypeRuntimeCapabilities();
  const deliveryRuntime = usePrototypeDeliveryLiveRuntime();
  const closureRuntime = usePrototypeClosureLiveRuntime();
  const landingRuntime = usePrototypeLandingLiveRuntime();
  const maturityRuntime = usePrototypeMaturityLiveRuntime();
  const sourceReadModel = getPrototypeWorkspaceReadModel();
  const state = usePrototypeControlState(sourceReadModel);
  const [requestDraft, setRequestDraft] = useState<PrototypeRequestDraft>(
    emptyPrototypeRequestDraft,
  );
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSubmittedAt, setRequestSubmittedAt] = useState<string | null>(
    null,
  );
  const proposalEntryPacketProjections = useSyncExternalStore(
    subscribePrototypeEntryPacketProjections,
    getPrototypeEntryPacketProjections,
    getPrototypeEntryPacketProjections,
  );
  const proposalEntryRecords = useMemo(
    () =>
      proposalEntryPacketProjections.map((projection, index) =>
        prototypeRecordFromEntryPacket(projection, index),
      ),
    [proposalEntryPacketProjections],
  );
  const effectiveProjection = useMemo(
    () =>
      projectPrototypeEffectiveReadModel({
        deliveryApplicationsByPrototypeId:
          deliveryRuntime.projectionsByPrototypeId,
        landingProjectionsByRecordId: landingRuntime.projectionsByRecordId,
        maturityProjectionsByRecordId: maturityRuntime.projectionsByRecordId,
        proposalEntryRecords,
        runtimeProjection: state.runtimeProjection,
        sourceReadModel,
      }),
    [
      deliveryRuntime.projectionsByPrototypeId,
      landingRuntime.projectionsByRecordId,
      maturityRuntime.projectionsByRecordId,
      proposalEntryRecords,
      sourceReadModel,
      state.runtimeProjection,
    ],
  );
  const readModel = effectiveProjection.readModel;
  const filteredRecords = useMemo(
    () => filterPrototypeRecords(readModel.records, state.filters),
    [readModel.records, state.filters],
  );
  const selectedRecord = useMemo(
    () => getSelectedPrototypeRecord(readModel, state.selectedRecordId),
    [readModel, state.selectedRecordId],
  );
  const activeRecord = selectedRecord;

  useEffect(() => {
    if (!activeRecord || !["dashboard", "closeout-retirement", "history"].includes(state.activeDialog ?? "")) return;
    void closureRuntime.load(activeRecord).catch(() => undefined);
  }, [activeRecord?.id, state.activeDialog, closureRuntime.load]);
  const selectedReceipts = activeRecord
    ? (effectiveProjection.receiptsByRecord[activeRecord.id] ?? [])
    : [];
  const selectedPreviewReceipts = selectedReceipts.filter(
    (receipt) => receipt.authority === "prototype-local",
  );
  const selectedDeliveryApplication = activeRecord
    ? (deliveryRuntime.projectionsByPrototypeId[
        prototypeRecordSourceId(activeRecord)
      ] ?? null)
    : null;
  const acceptedBaselineReceipt = selectedReceipts.find(
    (receipt) =>
      receipt.authority === "source-projected" &&
      receipt.commandId === "record-baseline-promotion" &&
      /^prototype-maturity-receipt:[a-z0-9][a-z0-9._-]*:[0-9]+$/.test(
        receipt.id,
      ),
  );
  const selectedClosureOwnerEvidence = {
    ...(acceptedBaselineReceipt
      ? {
          accepted_baseline_receipt_ref:
            `oos://receipts/prototype-maturity/${acceptedBaselineReceipt.id}`,
        }
      : {}),
    ...(selectedDeliveryApplication
      ? {
          accepted_delivery_target_receipt_ref:
            selectedDeliveryApplication.result.receipt.receipt_ref,
          target_delivery_ref:
            selectedDeliveryApplication.result.target.record_ref,
        }
      : {}),
  };
  const stats = getPrototypeWorkspaceStats(readModel.records);
  const workspaceStatus = prototypeWorkspaceStatus(readModel, stats);
  const canSubmitRequest = prototypeRequestDraftComplete(requestDraft);

  useEffect(() => {
    if (!entryIntent) {
      return;
    }

    const focusedRecord = readModel.records.find(
      (record) => record.id === entryIntent.subjectRef,
    );

    if (!focusedRecord) {
      return;
    }

    state.setFilters({ baseline: "all", lifecycle: "all", search: "" });
    state.setSelectedRecordId(focusedRecord.id);
    state.setActiveDialog("dashboard");
  }, [
    entryIntent,
    readModel.records,
    state.setActiveDialog,
    state.setFilters,
    state.setSelectedRecordId,
  ]);

  function selectRecord(record: PrototypeRecord) {
    state.setSelectedRecordId(record.id);
  }

  function openDialog(route: PrototypeDialogRoute, record?: PrototypeRecord) {
    if (record) {
      selectRecord(record);
    }

    state.setActiveDialog(route);
  }

  function closeDialog() {
    state.setActiveDialog(null);
  }

  async function recordPrototypeProjection<
    CommandId extends Exclude<PrototypeCommandId, "capture-prototype-request">,
  >(
    record: PrototypeRecord,
    commandId: CommandId,
    input: PrototypeCommandInputById[CommandId],
  ) {
    if (!runtimeCapabilities.canSubmit) {
      return null;
    }

    const result = await submitPrototypeProjectionCommand({
      commandId,
      input,
      record,
    });

    return result;
  }

  function updateRequestDraft<Field extends keyof PrototypeRequestDraft>(
    field: Field,
    value: PrototypeRequestDraft[Field],
  ) {
    setRequestDraft((current) => ({ ...current, [field]: value }));
  }

  function openPrototypeRequest() {
    setRequestSubmittedAt(null);
    setRequestOpen(true);
  }

  function closePrototypeRequest() {
    setRequestOpen(false);
    setRequestDraft(emptyPrototypeRequestDraft);
  }

  async function submitPrototypeRequest() {
    if (!canSubmitRequest) {
      return;
    }

    const result = await submitPrototypeRequestCommand(requestDraft);

    state.setFilters({ baseline: "all", lifecycle: "all", search: "" });
    state.setSelectedRecordId(result.record.id);
    setRequestSubmittedAt(result.recordedAt);
    setRequestDraft(emptyPrototypeRequestDraft);
    setRequestOpen(false);
  }

  async function landPrototypeRequest(
    record: PrototypeRecord,
    input: PrototypeLandingCommandInput,
    commandId: PrototypeCommandId,
  ) {
    if (commandId !== "land-prototype-request") {
      return;
    }

    await recordPrototypeProjection(record, commandId, input);
  }

  async function runLandingSimulation(input: PrototypeLandingSimulationInput) {
    try {
      return await landingRuntime.run(input);
    } catch (error) {
      if (prototypeLandingAllowsLocalFallback(error)) {
        return runPrototypeLandingSimulation(input);
      }
      throw error;
    }
  }

  async function cancelLanding(input: PrototypeLandingSimulationInput) {
    const projection = landingRuntime.projectionsByRecordId[input.record.id];
    if (!projection || projection.draftKey !== input.draftKey) return null;
    return landingRuntime.cancel(input, projection.result.request_id);
  }

  async function recordBaselinePromotion(
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeBaselinePromotionInput,
  ) {
    if (
      commandId !== "record-baseline-promotion" ||
      !canRecordPrototypeBaselinePromotion(record, input.decision)
    ) {
      return;
    }

    const maturityInput = {
      input,
      transition: "baseline-promotion" as const,
    };
    try {
      await maturityRuntime.run({
        input: maturityInput,
        inputKey: prototypeMaturityInputKey(maturityInput),
        record,
      });
    } catch (error) {
      if (prototypeMaturityAllowsLocalFallback(error)) {
        await recordPrototypeProjection(record, commandId, input);
      } else {
        throw error;
      }
    }

    if (input.decision === "route-closeout") {
      state.setActiveDialog("closeout-retirement");
    }
  }

  async function recordCandidatePromotion(
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeCandidatePromotionInput,
  ) {
    if (commandId !== "record-candidate-promotion") {
      return;
    }

    const maturityInput = {
      input,
      transition: "candidate-promotion" as const,
    };
    try {
      await maturityRuntime.run({
        input: maturityInput,
        inputKey: prototypeMaturityInputKey(maturityInput),
        record,
      });
    } catch (error) {
      if (prototypeMaturityAllowsLocalFallback(error)) {
        await recordPrototypeProjection(record, commandId, input);
      } else {
        throw error;
      }
    }

    if (input.decision === "route-closeout") {
      state.setActiveDialog("closeout-retirement");
    }
  }

  async function recordMovementRequest(
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    draft: PrototypeMovementRequestDraftInput,
  ) {
    if (commandId !== "prepare-movement-request") {
      return;
    }

    const sourcePacket =
      sourceReadModel.deliveryPacketsByPrototypeId?.[record.id];
    if (sourcePacket?.authority === "workspace-prototype-studio") {
      await deliveryRuntime.apply({
        decisionRef: `console://prototype-delivery-decisions/${sourcePacket.packet.packet_id}`,
        packet: sourcePacket.packet,
      });
      return;
    }

    const result = await recordPrototypeProjection(record, commandId, draft);

    if (result?.projected) {
      recordPrototypeMovementRequestPacket(result.receipt);
    }
  }

  async function recordPreviewRuntimeAction(
    record: PrototypeRecord,
    actionId: PrototypePreviewRuntimeMutationActionId,
  ) {
    await recordPrototypeProjection(record, actionId, {});
  }

  async function recordPreviewProfileAction(
    record: PrototypeRecord,
    draft: PrototypePreviewProfileDraft,
    actionId: PrototypePreviewProfileMutationActionId,
  ) {
    await recordPrototypeProjection(record, actionId, draft);
  }

  async function recordPreviewCheck(record: PrototypeRecord) {
    await recordPrototypeProjection(record, "refresh-preview-proof", {});
  }

  return {
    activeDialog: state.activeDialog,
    activeRecord,
    closeDialog,
    filters: {
      baseline: state.filters.baseline,
      baselineOptions: getPrototypeBaselineOptions(readModel.records),
      lifecycle: state.filters.lifecycle,
      lifecycleOptions: getPrototypeLifecycleOptions(readModel.records),
      onBaselineChange: (baseline: typeof state.filters.baseline) =>
        state.setFilters({ ...state.filters, baseline }),
      onLifecycleChange: (lifecycle: typeof state.filters.lifecycle) =>
        state.setFilters({ ...state.filters, lifecycle }),
      onSearchChange: (search: string) =>
        state.setFilters({ ...state.filters, search }),
      search: state.filters.search,
    },
    openDialog,
    overview: {
      onOpenPrototypeRequest: openPrototypeRequest,
      requestSubmittedAt,
      summary: prototypeSummaryMetrics(stats),
      workspaceStatus,
    },
    records: {
      all: readModel.records,
      filtered: filteredRecords,
    },
    request: {
      canSubmit: canSubmitRequest,
      close: closePrototypeRequest,
      draft: requestDraft,
      onDraftChange: updateRequestDraft,
      onSubmit: submitPrototypeRequest,
      open: requestOpen,
    },
    selectedPreviewReceipts,
    selectedReceipts,
    selectedClosure: activeRecord ? {
      preparation: closureRuntime.preparations[activeRecord.id] ?? null,
      result: closureRuntime.results[activeRecord.id] ?? null,
      error: closureRuntime.errors[activeRecord.id] ?? null,
      pending: closureRuntime.pending[activeRecord.id] === true,
    } : null,
    selectedClosureOwnerEvidence,
    selectedLandingProjection: activeRecord
      ? (landingRuntime.projectionsByRecordId[activeRecord.id] ?? null)
      : null,
    selectedRecord,
    selectedSourceDeliveryPacket: activeRecord
      ? (sourceReadModel.deliveryPacketsByPrototypeId?.[activeRecord.id] ?? null)
      : null,
    selectRecord,
    workflowActions: {
      backToDashboard: () => openDialog("dashboard"),
      landPrototypeRequest,
      cancelLanding,
      runLandingSimulation,
      recordBaselinePromotion,
      recordCandidatePromotion,
      recordMovementRequest,
      recordPreviewCheck,
      recordPreviewProfileAction,
      recordPreviewRuntimeAction,
      closure: {
        load: closureRuntime.load,
        submit: closureRuntime.submit,
        read: closureRuntime.read,
        inspect: closureRuntime.inspect,
        command: closureRuntime.command,
      },
    },
  };
}

export type PrototypeControlController = ReturnType<
  typeof usePrototypeControlController
>;
