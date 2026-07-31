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
import { type PrototypeCloseoutInput } from "../../work-model/workflows/closeout-retirement/prototype-closeout-retirement-model.ts";
import { type PrototypeMovementRequestDraftInput } from "../../work-model/workflows/movement-request/prototype-movement-request-model.ts";
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
        proposalEntryRecords,
        runtimeProjection: state.runtimeProjection,
        sourceReadModel,
      }),
    [proposalEntryRecords, sourceReadModel, state.runtimeProjection],
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
  const selectedReceipts = activeRecord
    ? (effectiveProjection.receiptsByRecord[activeRecord.id] ?? [])
    : [];
  const selectedPreviewReceipts = selectedReceipts.filter(
    (receipt) => receipt.authority === "prototype-local",
  );
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
    return runPrototypeLandingSimulation(input);
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

    await recordPrototypeProjection(record, commandId, input);

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

    await recordPrototypeProjection(record, commandId, input);

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

    const result = await recordPrototypeProjection(record, commandId, draft);

    if (result?.projected) {
      recordPrototypeMovementRequestPacket(result.receipt);
    }
  }

  async function recordCloseoutRetirement(
    record: PrototypeRecord,
    commandId: PrototypeCommandId,
    input: PrototypeCloseoutInput,
  ) {
    if (commandId !== "record-closeout-retirement") {
      return;
    }

    await recordPrototypeProjection(record, commandId, input);
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
    selectedRecord,
    selectRecord,
    workflowActions: {
      backToDashboard: () => openDialog("dashboard"),
      landPrototypeRequest,
      runLandingSimulation,
      recordBaselinePromotion,
      recordCandidatePromotion,
      recordCloseoutRetirement,
      recordMovementRequest,
      recordPreviewCheck,
      recordPreviewProfileAction,
      recordPreviewRuntimeAction,
    },
  };
}

export type PrototypeControlController = ReturnType<
  typeof usePrototypeControlController
>;
