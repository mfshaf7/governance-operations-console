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

import type { DeliveryIntakeSource } from "../../read-model/index.ts";
import {
  getDeliveryReadModel,
  getExecutionBoardPackages,
} from "../../read-model/index.ts";

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
  const baseModel = getDeliveryReadModel();
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

function deliverySurfaceIdFromRequiredMove(
  requiredMoveRef: string,
): DeliveryWorkspaceSurfaceId | null {
  const surfaceId = requiredMoveRef.split(".")[1];

  if (
    surfaceId === "execution-board" ||
    surfaceId === "intake" ||
    surfaceId === "refinement" ||
    surfaceId === "work-design"
  ) {
    return surfaceId;
  }

  return null;
}
