"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import type { OperationSurfaceStatusModel } from "../../../operation-contracts/surface-status.ts";
import { useConsoleRuntimeCapabilities } from "../../../../console-integration/configuration/use-console-runtime-capabilities.ts";
import { usePrototypeWorkspaceLiveRuntime } from "../../live-runtime/use-prototype-workspace-live-runtime.ts";
import {
  resolveConsolePrimaryRecordIsolation,
  selectConsoleAuthorityProjection,
} from "../../../../console-integration/fixture-isolation/console-fixture-isolation.ts";
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
import { prototypeProjectedReceipts } from "../../local-runtime/prototype-receipt-projection.ts";
import {
  runPrototypeLandingSimulation,
  type PrototypeLandingSimulationInput,
} from "../../local-runtime/prototype-landing-runtime.ts";
import {
  getPrototypeWorkspaceReadModel,
  type PrototypeProjectedReceipt,
  type PrototypeRecord,
  type PrototypeWorkspaceReadModel,
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
import { projectPrototypePreviewOwnerRecord } from "../../live-runtime/prototype-preview-live-projection.ts";
import {
  PrototypePreviewClientError,
  usePrototypePreviewLiveRuntime,
} from "../../live-runtime/use-prototype-preview-live-runtime.ts";
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
  const consoleRuntime = useConsoleRuntimeCapabilities();
  const live = usePrototypeWorkspaceLiveRuntime(consoleRuntime.status === "current" && consoleRuntime.projection?.mode === "live");
  const primaryRecordIsolation = resolveConsolePrimaryRecordIsolation({
    liveAuthorityAvailable: live.projection !== null,
    runtimeMode: consoleRuntime.projection?.mode ?? null,
    runtimeStatus: consoleRuntime.status,
  });
  const deliveryRuntime = usePrototypeDeliveryLiveRuntime();
  const closureRuntime = usePrototypeClosureLiveRuntime(live.projection?.closure);
  const landingRuntime = usePrototypeLandingLiveRuntime(live.projection?.landing);
  const maturityRuntime = usePrototypeMaturityLiveRuntime(live.projection?.maturity);
  const previewRuntime = usePrototypePreviewLiveRuntime();
  const fixtureReadModel = primaryRecordIsolation.fixtureAllowed
    ? getPrototypeWorkspaceReadModel()
    : null;
  const sourceReadModel = useMemo<PrototypeWorkspaceReadModel>(
    () => ({
      ...(fixtureReadModel ?? live.projection?.readModel ?? {
        source: {
          lastRead: "unavailable",
          mutationGateway: "unavailable",
          project: "Workspace Prototype Studio",
          recordSystem: "canonical owner projection",
          registry: "unavailable",
        },
      }),
      records:
        selectConsoleAuthorityProjection({
          decision: primaryRecordIsolation,
          fixture: fixtureReadModel?.records ?? [],
          live: live.projection?.readModel.records ?? null,
        }) ?? [],
    }),
    [
      fixtureReadModel,
      live.projection?.readModel,
      primaryRecordIsolation.fixtureAllowed,
      primaryRecordIsolation.liveAuthorityAllowed,
    ],
  );
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
  const effectiveProjection = useMemo<{
    readModel: PrototypeWorkspaceReadModel;
    receiptsByRecord: Record<string, PrototypeProjectedReceipt[]>;
  }>(
    () => {
      if (!primaryRecordIsolation.fixtureAllowed) {
        return { readModel: sourceReadModel, receiptsByRecord: Object.fromEntries(sourceReadModel.records.map((record) => [record.id, prototypeProjectedReceipts(record, [])])) };
      }
      return projectPrototypeEffectiveReadModel({
        deliveryApplicationsByPrototypeId:
          deliveryRuntime.projectionsByPrototypeId,
        landingProjectionsByRecordId: landingRuntime.projectionsByRecordId,
        maturityProjectionsByRecordId: maturityRuntime.projectionsByRecordId,
        proposalEntryRecords: primaryRecordIsolation.fixtureAllowed ? proposalEntryRecords : [],
        runtimeProjection: primaryRecordIsolation.fixtureAllowed ? state.runtimeProjection : { localRequestRecords: [], receiptsByRecord: {} },
        sourceReadModel,
      });
    },
    [
      deliveryRuntime.projectionsByPrototypeId,
      landingRuntime.projectionsByRecordId,
      maturityRuntime.projectionsByRecordId,
      primaryRecordIsolation.fixtureAllowed,
      proposalEntryRecords,
      sourceReadModel.records,
      state.runtimeProjection,
    ],
  );
  const readModel = { ...effectiveProjection.readModel, source: sourceReadModel.source };
  const filteredRecords = useMemo(
    () => filterPrototypeRecords(readModel.records, state.filters),
    [readModel.records, state.filters],
  );
  const selectedRecord = useMemo(
    () => getSelectedPrototypeRecord(readModel, state.selectedRecordId),
    [readModel, state.selectedRecordId],
  );
  const selectedPreviewMode = selectedRecord
    ? (previewRuntime.modeByRecord[selectedRecord.id] ??
      (state.activeDialog === "preview-runtime" ? "loading" : "disconnected"))
    : "disconnected";
  const activeRecord = useMemo(() => {
    if (!selectedRecord || selectedPreviewMode === "disconnected") return selectedRecord;
    return projectPrototypePreviewOwnerRecord(
      selectedRecord,
      previewRuntime.projectionByRecord[selectedRecord.id] ?? null,
      previewRuntime.proofByRecord[selectedRecord.id] ?? null,
      selectedPreviewMode === "live"
        ? "live"
        : selectedPreviewMode === "error"
          ? "error"
          : "loading",
    );
  }, [
    previewRuntime.projectionByRecord,
    previewRuntime.proofByRecord,
    selectedPreviewMode,
    selectedRecord,
  ]);

  const refreshClosureSources = useCallback(async (record: PrototypeRecord) => {
    const packet = sourceReadModel.deliveryPacketsByPrototypeId?.[record.id]?.packet;
    if (packet) await deliveryRuntime.load(packet);
    return closureRuntime.load(record);
  }, [sourceReadModel.deliveryPacketsByPrototypeId, deliveryRuntime.load, closureRuntime.load]);

  useEffect(() => {
    if (!activeRecord || !["dashboard", "closeout-retirement", "history"].includes(state.activeDialog ?? "")) return;
    void refreshClosureSources(activeRecord).catch(() => undefined);
  }, [activeRecord?.id, state.activeDialog, refreshClosureSources]);
  useEffect(() => {
    if (!selectedRecord || state.activeDialog !== "preview-runtime") return;
    void previewRuntime.load(selectedRecord).catch(() => undefined);
  }, [selectedRecord?.id, state.activeDialog, previewRuntime.load]);
  const selectedCanonicalDeliveryPacket = activeRecord ? sourceReadModel.deliveryPacketsByPrototypeId?.[activeRecord.id]?.packet : null;
  useEffect(() => {
    if (!selectedCanonicalDeliveryPacket || !["dashboard", "movement-request", "closeout-retirement", "history"].includes(state.activeDialog ?? "")) return;
    void deliveryRuntime.load(selectedCanonicalDeliveryPacket).catch(() => undefined);
  }, [selectedCanonicalDeliveryPacket?.packet_digest, state.activeDialog, deliveryRuntime.load]);
  const selectedReceipts = activeRecord
    ? (effectiveProjection.receiptsByRecord[activeRecord.id] ?? [])
    : [];
  const selectedPreviewReceipts = activeRecord && selectedPreviewMode === "live"
    ? (previewRuntime.receiptsByRecord[activeRecord.id] ?? [])
    : selectedReceipts.filter((receipt) => receipt.authority === "prototype-local");
  const observedDeliveryApplication = activeRecord
    ? (deliveryRuntime.projectionsByPrototypeId[
        prototypeRecordSourceId(activeRecord)
      ] ?? null)
    : null;
  const selectedDeliveryApplication = observedDeliveryApplication && (primaryRecordIsolation.fixtureAllowed || observedDeliveryApplication.packet.packet_digest === selectedCanonicalDeliveryPacket?.packet_digest) ? observedDeliveryApplication : null;
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
  const workspaceStatus: OperationSurfaceStatusModel =
    primaryRecordIsolation.fixtureAllowed || primaryRecordIsolation.liveAuthorityAllowed
      ? prototypeWorkspaceStatus(readModel, stats, primaryRecordIsolation.liveAuthorityAllowed)
      : {
          ariaLabel: "Prototype workspace status details",
          items: [
            {
              detail:
                "Canonical Prototype records are unavailable; fixture and browser-local records are excluded from live mode.",
              facts: [
                { label: "Primary records", value: "unavailable" },
                { label: "Fixture fallback", value: "disabled" },
              ],
              id: "source-projection",
              label: "Source",
              state: "offline",
              tone: "danger",
            },
          ],
          kicker: "Prototype Status",
          statusLabel: "Canonical source unavailable",
          summary:
            "Live mode requires an owner-backed Prototype projection before records or record actions are shown.",
          title: "Prototype workspace status",
          tone: "danger",
        };
  const canSubmitRequest =
    primaryRecordIsolation.fixtureAllowed &&
    prototypeRequestDraftComplete(requestDraft);

  useEffect(() => {
    if (!entryIntent) {
      return;
    }

    const focusedRecord = readModel.records.find(
      (record) =>
        record.id === entryIntent.subjectRef ||
        record.sourceRef === entryIntent.subjectRef ||
        record.linkedRecords.some(
          (linkedRecord) => linkedRecord.ref === entryIntent.subjectRef,
        ),
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
    if (!primaryRecordIsolation.fixtureAllowed) throw new Error("Prototype-local commands are disabled in live mode; use the canonical owner workflow.");
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
    if (!primaryRecordIsolation.fixtureAllowed) return;
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

    if (!primaryRecordIsolation.fixtureAllowed) { await live.refresh(); return; }

    await recordPrototypeProjection(record, commandId, input);
  }

  async function runLandingSimulation(input: PrototypeLandingSimulationInput) {
    try {
      const result = await landingRuntime.run(input);
      if (!primaryRecordIsolation.fixtureAllowed) await live.refresh();
      return result;
    } catch (error) {
      if (primaryRecordIsolation.fixtureAllowed && prototypeLandingAllowsLocalFallback(error)) {
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
      if (!primaryRecordIsolation.fixtureAllowed) await live.refresh();
    } catch (error) {
      if (primaryRecordIsolation.fixtureAllowed && prototypeMaturityAllowsLocalFallback(error)) {
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
      if (!primaryRecordIsolation.fixtureAllowed) await live.refresh();
    } catch (error) {
      if (primaryRecordIsolation.fixtureAllowed && prototypeMaturityAllowsLocalFallback(error)) {
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
    const mode = previewRuntime.modeByRecord[record.id];
    if (mode !== "disconnected") {
      try {
        await previewRuntime.command(
          record,
          actionId.replace("-preview", "") as "restart" | "start" | "stop",
        );
        return;
      } catch (error) {
        if (!primaryRecordIsolation.fixtureAllowed || !previewFallbackAllowed(error)) throw error;
      }
    }
    await recordPrototypeProjection(record, actionId, {});
  }

  async function recordPreviewProfileAction(
    record: PrototypeRecord,
    draft: PrototypePreviewProfileDraft,
    actionId: PrototypePreviewProfileMutationActionId,
  ) {
    if (previewRuntime.modeByRecord[record.id] === "live") return;
    await recordPrototypeProjection(record, actionId, draft);
  }

  async function recordPreviewCheck(record: PrototypeRecord) {
    const mode = previewRuntime.modeByRecord[record.id];
    if (mode !== "disconnected") {
      try {
        await previewRuntime.prove(record);
        return;
      } catch (error) {
        if (!primaryRecordIsolation.fixtureAllowed || !previewFallbackAllowed(error)) throw error;
      }
    }
    await recordPrototypeProjection(record, "refresh-preview-proof", {});
  }

  async function maturityAction(action: "read" | "continue" | "cancel") {
    if (!activeRecord) throw new Error("Select a canonical Prototype record.");
    const projection = maturityRuntime.projectionsByRecordId[activeRecord.id];
    if (!projection) throw new Error("No current owner Maturity request is available.");
    const input = { record: activeRecord, input: projection.input, inputKey: projection.inputKey };
    try {
      if (action === "read") return await maturityRuntime.read(input, projection.result.request_id);
      if (action === "cancel") return await maturityRuntime.cancel(input, projection.result.request_id);
      return await maturityRuntime.run(input);
    } finally { if (!primaryRecordIsolation.fixtureAllowed) await live.refresh(); }
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
      canRequestPrototype: primaryRecordIsolation.fixtureAllowed,
      onOpenPrototypeRequest: openPrototypeRequest,
      requestSubmittedAt,
      summary: prototypeSummaryMetrics(stats),
      workspaceStatus,
    },
    records: {
      all: readModel.records,
      filtered: filteredRecords,
    },
    sourceAvailability: {
      error: live.error ?? consoleRuntime.error,
      reasonCode: primaryRecordIsolation.reasonCode,
      unavailable: !primaryRecordIsolation.fixtureAllowed && !live.projection,
      loading: consoleRuntime.status === "loading" || consoleRuntime.projection?.mode === "live" && !live.projection && !live.error,
      refresh: live.refresh,
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
    selectedPreviewOwnerMode: selectedPreviewMode,
    selectedReceipts,
    selectedClosure: activeRecord ? {
      preparation: closureRuntime.preparations[activeRecord.id] ?? null,
      result: closureRuntime.results[activeRecord.id] ?? null,
      error: closureRuntime.errors[activeRecord.id] ?? deliveryRuntime.errorsByPrototypeId[prototypeRecordSourceId(activeRecord)] ?? null,
      pending: closureRuntime.pending[activeRecord.id] === true,
    } : null,
    selectedClosureOwnerEvidence,
    selectedLandingProjection: activeRecord
      ? (landingRuntime.projectionsByRecordId[activeRecord.id] ?? null)
      : null,
    selectedMaturity: {
      mode: primaryRecordIsolation.fixtureAllowed ? "disconnected-preview" as const : "live" as const,
      projection: activeRecord ? maturityRuntime.projectionsByRecordId[activeRecord.id] ?? null : null,
      error: activeRecord ? maturityRuntime.errors[activeRecord.id] ?? null : null,
      pending: activeRecord ? maturityRuntime.pending[activeRecord.id] === true : false,
      read: () => maturityAction("read"),
      continueWork: () => maturityAction("continue"),
      cancel: () => maturityAction("cancel"),
    },
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
        load: refreshClosureSources,
        submit: closureRuntime.submit,
        read: closureRuntime.read,
        inspect: closureRuntime.inspect,
        command: closureRuntime.command,
      },
    },
  };
}

function previewFallbackAllowed(error: unknown) {
  return (
    error instanceof PrototypePreviewClientError &&
    error.code === "prototype_preview_live_mode_required"
  );
}

export type PrototypeControlController = ReturnType<
  typeof usePrototypeControlController
>;
