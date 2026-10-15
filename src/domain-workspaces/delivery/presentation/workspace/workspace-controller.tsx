"use client";

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
import {
  resolveConsolePrimaryRecordIsolation,
  selectConsoleAuthorityProjection,
} from "../../../../console-integration/fixture-isolation/console-fixture-isolation.ts";
import {
  getOperationWorkbenchSurfaceAttributes,
} from "../../../../operation-workbench/operation-workbench-contract.ts";
import { TerasEmptyState, TerasModalShell } from "@/teras";

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
  const primaryRecordIsolation = resolveConsolePrimaryRecordIsolation({
    liveAuthorityAvailable: false,
    runtimeMode: consoleRuntime.projection?.mode ?? null,
    runtimeStatus: consoleRuntime.status,
  });
  const selectedBaseModel = selectConsoleAuthorityProjection({
    decision: primaryRecordIsolation,
    fixture: primaryRecordIsolation.fixtureAllowed
      ? getDeliveryReadModel()
      : null,
    live: null,
  });

  if (!selectedBaseModel) {
    return (
      <DeliveryWorkspaceUnavailable contract={contract} onClose={onClose} />
    );
  }

  return (
    <AvailableDeliveryWorkspaceController
      baseModel={selectedBaseModel}
      contract={contract}
      entryIntent={entryIntent}
      onClose={onClose}
    />
  );
}

function AvailableDeliveryWorkspaceController({
  baseModel,
  contract,
  entryIntent,
  onClose,
}: {
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
    useState<DeliveryWorkspaceSurfaceId>("home");
  const [workspaceMounted, setWorkspaceMounted] = useState(false);
  const appliedEntryIntentRef = useRef<string | null>(null);
  const model = useMemo(
    () =>
      projectDeliveryEffectiveReadModel({
        model: baseModel,
        runtimeProjection: localProjection,
      }),
    [baseModel, localProjection],
  );
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

    appliedEntryIntentRef.current = entryKey;
    if (surfaceId === "work-design" || surfaceId === "refinement") {
      focusPackageRegister(surfaceId, entryIntent.subjectRef);
      return;
    }

    setActiveWorkspaceSurfaceId(surfaceId);
  }, [entryIntent]);

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
      model={model}
      onActiveSurfaceChange={setActiveWorkspaceSurfaceId}
      onClose={onClose}
      onConsumeSource={consumeIntakeSource}
      onRequestPackageRegisterFocus={focusPackageRegister}
      onWorkDesignApplied={(deliveryPackage, record) => {
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
}: {
  contract: OperationWorkbenchDomainContract;
  onClose: () => void;
}) {
  return (
    <TerasModalShell
      bodyLayout="fill"
      description="Canonical Delivery records are unavailable. Fixtures are not used as fallback in live mode."
      kicker="Delivery Workspace"
      modalAttributes={getOperationWorkbenchSurfaceAttributes(contract)}
      onClose={onClose}
      height="fill"
      surfaceId="delivery-workspace-unavailable"
      title="Delivery Workspace"
      width="viewport"
    >
      <TerasEmptyState fill>
        Canonical Delivery records are unavailable. Restore the OOS owner
        projection before continuing Delivery work.
      </TerasEmptyState>
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
