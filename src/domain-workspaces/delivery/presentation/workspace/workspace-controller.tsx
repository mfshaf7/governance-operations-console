"use client";
import { useWorkspaceViewState } from "../../../../console-integration/registers/workspace-view-state.ts";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import type { OperationWorkbenchDomainContract } from "../../../../operation-workbench/operation-workbench-contract.ts";
import { useConsoleRuntimeCapabilities } from "../../../../console-integration/configuration/use-console-runtime-capabilities.ts";
import { deliveryModelForScope } from "../../live-runtime/delivery-history-projection.ts";
import { useDeliveryWorkspaceLiveRuntime } from "../../live-runtime/use-delivery-workspace-live-runtime.ts";
import {
  resolveConsolePrimaryRecordIsolation,
  selectConsoleAuthorityProjection,
} from "../../../../console-integration/fixture-isolation/console-fixture-isolation.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import { TerasActionButton, TerasContentTray, TerasLoadingState, TerasModalShell } from "@/teras";

import type { DeliveryIntakeSource } from "../../read-model/index.ts";
import {
  getDeliveryReadModel,
  getExecutionBoardPackages,
} from "../../read-model/index.ts";
import type { DeliveryReadModel } from "../../read-model/index.ts";

import {
  getDeliveryWorkspaceProjectionSnapshot,
  localDeliveryPackageIdForIntakeSource,
  projectDeliveryEffectiveReadModel,
  recordLocalDeliveryIntakeConsume,
  recordLocalDeliveryWorkDesignApply,
  subscribeDeliveryWorkspaceProjection,
} from "../../local-runtime/index.ts";
import { DeliveryWorkspaceModal } from "./workspace-modal.tsx";
import type {
  DeliveryWorkspaceSurfaceId,
  DeliveryPackageRegisterFocus,
} from "./workspace-types.ts";

export function DeliveryWorkspaceController({
  contract,
  entryIntent,
  onClose,
}: {
  contract: OperationWorkbenchDomainContract;
  entryIntent: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
}) {
  const consoleRuntime = useConsoleRuntimeCapabilities();
  const live = useDeliveryWorkspaceLiveRuntime(consoleRuntime.status === "current" && consoleRuntime.projection?.mode === "live");
  const primaryRecordIsolation = resolveConsolePrimaryRecordIsolation({
    liveAuthorityAvailable: live.model !== null,
    runtimeMode: consoleRuntime.projection?.mode ?? null,
    runtimeStatus: consoleRuntime.status,
  });
  const selectedBaseModel = selectConsoleAuthorityProjection({
    decision: primaryRecordIsolation,
    fixture: primaryRecordIsolation.fixtureAllowed
      ? getDeliveryReadModel()
      : null,
    live: live.model,
  });

  if (!selectedBaseModel) {
    return (
      <DeliveryWorkspaceUnavailable
        contract={contract}
        onClose={onClose}
        onRetry={async () => {
          if (consoleRuntime.status === "current" && consoleRuntime.projection?.mode === "live") {
            await live.refresh();
          } else {
            await consoleRuntime.load();
          }
        }}
        loading={consoleRuntime.status === "loading" || (consoleRuntime.projection?.mode === "live" && !live.error)}
      />
    );
  }

  return (
    <AvailableDeliveryWorkspaceController
      baseModel={selectedBaseModel}
      allowLocalProjection={primaryRecordIsolation.fixtureAllowed}
      onSourceRefresh={live.refresh}
      contract={contract}
      entryIntent={entryIntent}
      onClose={onClose}
    />
  );
}

function AvailableDeliveryWorkspaceController({
  allowLocalProjection,
  onSourceRefresh,
  baseModel,
  contract,
  entryIntent,
  onClose,
}: {
  allowLocalProjection: boolean;
  onSourceRefresh: () => Promise<void>;
  baseModel: DeliveryReadModel;
  contract: OperationWorkbenchDomainContract;
  entryIntent: ConsoleSurfaceEntryIntent | null;
  onClose: () => void;
}) {
  const localProjection = useSyncExternalStore(
    subscribeDeliveryWorkspaceProjection,
    getDeliveryWorkspaceProjectionSnapshot,
    getDeliveryWorkspaceProjectionSnapshot,
  );
  const [packageRegisterFocus, setPackageRegisterFocus] =
    useState<DeliveryPackageRegisterFocus | null>(null);
  const [activeWorkspaceSurfaceId, setActiveWorkspaceSurfaceId] =
    useWorkspaceViewState<DeliveryWorkspaceSurfaceId>('delivery:activeWorkspaceSurfaceId', "home");
  const [workspaceMounted, setWorkspaceMounted] = useState(false);
  const appliedEntryIntentRef = useRef<string | null>(null);
  const [recordScope,setRecordScope] = useWorkspaceViewState<"current"|"history">('delivery:recordScope', "current");
  const effectiveRecordScope = activeWorkspaceSurfaceId === "home" || activeWorkspaceSurfaceId === "catalog" || activeWorkspaceSurfaceId === "pi-planning"
    ? "current" : recordScope;
  const completeModel = useMemo(
    () =>
      allowLocalProjection ? projectDeliveryEffectiveReadModel({
        model: baseModel,
        runtimeProjection: localProjection,
      }) : baseModel,
    [allowLocalProjection, baseModel, localProjection],
  );
  const model = useMemo(() => allowLocalProjection ? completeModel : deliveryModelForScope(completeModel,effectiveRecordScope),[allowLocalProjection,completeModel,effectiveRecordScope]);
  const executionCount = useMemo(
    () => getExecutionBoardPackages(model).length,
    [model],
  );

  useEffect(() => {
    setWorkspaceMounted(true);
  }, []);

  useEffect(() => {
    if (!entryIntent) {
      return;
    }

    const entryKey = `${entryIntent.subjectRef}:${entryIntent.requiredMoveRef}`;
    if (appliedEntryIntentRef.current === entryKey) {
      return;
    }

    const surfaceId = deliverySurfaceIdFromRequiredMove(
      entryIntent.requiredMoveRef,
    );
    if (!surfaceId) {
      return;
    }

    const relatedPackage = completeModel.packages.find(p => p.delivery_package_id === entryIntent.subjectRef || `delivery-package:${p.legacy_epic_id}` === entryIntent.subjectRef);
    const resolvedSubjectRef = relatedPackage?.delivery_package_id ?? entryIntent.subjectRef;
    if (!allowLocalProjection) {
      const target = relatedPackage;
      const source = completeModel.intake_sources.find(s => s.accepted_source_id === entryIntent.subjectRef);
      if ((target && ["done", "retired", "parked"].includes(target.backend_status)) || source?.intake_status === "consumed") {
        setRecordScope("history");
      }
    }
    appliedEntryIntentRef.current = entryKey;
    if (surfaceId === "work-design" || surfaceId === "refinement") {
      focusPackageRegister(surfaceId, resolvedSubjectRef);
      return;
    }

    setActiveWorkspaceSurfaceId(surfaceId);
  }, [entryIntent, allowLocalProjection, completeModel]);

  function focusPackageRegister(
    surfaceId: Extract<
      DeliveryWorkspaceSurfaceId,
      "refinement" | "work-design"
    >,
    packageId: string,
  ) {
    setPackageRegisterFocus({
      packageId,
      surfaceId,
      token: Date.now(),
    });
    setActiveWorkspaceSurfaceId(surfaceId);
  }

  function consumeIntakeSource(source: DeliveryIntakeSource) {
    if (!allowLocalProjection) throw new Error("Use the canonical Proposal or Prototype ingress workflow in live mode.");
    const deliveryPackageId = localDeliveryPackageIdForIntakeSource(source);

    recordLocalDeliveryIntakeConsume(source);
    focusPackageRegister("work-design", deliveryPackageId);
  }

  if (!workspaceMounted) {
    return null;
  }

  return (
    <DeliveryWorkspaceModal
      activeSurfaceId={activeWorkspaceSurfaceId}
      contract={contract}
      entryIntent={entryIntent}
      executionCount={executionCount}
      onExecutionChanged={onSourceRefresh}
      model={model}
      onRecordScopeChange={allowLocalProjection ? undefined : setRecordScope}
      onActiveSurfaceChange={setActiveWorkspaceSurfaceId}
      onClose={onClose}
      onConsumeSource={consumeIntakeSource}
      onRequestPackageRegisterFocus={focusPackageRegister}
      onWorkDesignApplied={(deliveryPackage, record) => {
        if (!allowLocalProjection) { void onSourceRefresh(); return; }
        recordLocalDeliveryWorkDesignApply({
          deliveryPackage,
          record,
        });
      }}
      packageRegisterFocus={packageRegisterFocus}
    />
  );
}

function DeliveryWorkspaceUnavailable({
  contract,
  onClose,
  onRetry,
  loading,
}: {
  contract: OperationWorkbenchDomainContract;
  onClose: () => void;
  onRetry: () => Promise<void>;
  loading: boolean;
}) {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };
  return (
    <TerasModalShell
      bodyLayout="fill"
      description={contract.surfacePurpose}
      kicker="Delivery Workspace"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="delivery-workspace-unavailable"
      title="Delivery Workspace"
      width="viewport"
    >
      {loading || retrying ? <TerasLoadingState fill label="Loading Delivery workspace…" />
        : <TerasContentTray fit="fill" role="alert" title="Delivery couldn’t load"
          description="Try reading your Delivery records again."
          actions={<TerasActionButton emphasis="secondary" onClick={() => void retry()}>Retry loading</TerasActionButton>} />}
    </TerasModalShell>
  );
}

function deliverySurfaceIdFromRequiredMove(
  requiredMoveRef: string,
): DeliveryWorkspaceSurfaceId | null {
  const surfaceId = requiredMoveRef.split(".")[1];

  if (
    surfaceId === "execution-board" ||
    surfaceId === "catalog" ||
    surfaceId === "intake" ||
    surfaceId === "refinement" ||
    surfaceId === "work-design"
  ) {
    return surfaceId;
  }

  return null;
}
