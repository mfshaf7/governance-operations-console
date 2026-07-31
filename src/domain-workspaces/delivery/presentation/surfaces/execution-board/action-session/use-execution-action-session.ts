"use client";

import { useCallback, useState } from "react";

import {
  getDeliveryEffectivePackagePosture,
  type DeliveryAvailableAction,
} from "../../../../read-model/index.ts";
import {
  deliveryExecutionActionPosture,
  recordLocalDeliveryExecutionAction,
} from "../../../../local-runtime/index.ts";

import {
  getExecutionActionRuntimeCapabilities,
  submitExecutionActionCommand,
} from "../../../../local-runtime/commands/execution-action-runtime.ts";
import type {
  DeliveryApplyIntent,
  DeliveryPackageSummary,
} from "../../../../read-model/index.ts";
import type {
  ExecutionActionContract,
  ExecutionActionReceipt,
  ExecutionActionStep,
} from "../../../../work-model/execution/execution-action-contracts.ts";

export function useExecutionActionSession() {
  const runtimeCapabilities = getExecutionActionRuntimeCapabilities();
  const [activeAction, setActiveAction] =
    useState<DeliveryAvailableAction | null>(null);
  const [actionStep, setActionStep] = useState<ExecutionActionStep>("draft");
  const [applying, setApplying] = useState(false);
  const [receipt, setReceipt] = useState<ExecutionActionReceipt | null>(null);

  const openAction = useCallback((action: DeliveryAvailableAction) => {
    setActiveAction(action);
    setActionStep("draft");
    setApplying(false);
    setReceipt(null);
  }, []);

  const closeAction = useCallback(() => {
    setActiveAction(null);
    setApplying(false);
    setReceipt(null);
  }, []);

  const applyAction = useCallback(
    async ({
      action,
      actionContract,
      applyIntent,
      packageSummary,
    }: {
      action: DeliveryAvailableAction;
      actionContract: ExecutionActionContract;
      applyIntent: DeliveryApplyIntent;
      packageSummary: DeliveryPackageSummary;
    }) => {
      if (!runtimeCapabilities.canSubmit) {
        return;
      }

      setApplying(true);

      try {
        const result = await submitExecutionActionCommand({
          action,
          actionContract,
          applyIntent,
          packageSummary,
        });

        if (result.run.state === "completed" && result.receipt) {
          const localReceipt = result.receipt.receipt;
          const projection = deliveryExecutionActionPosture(
            localReceipt.actionType,
            getDeliveryEffectivePackagePosture(packageSummary),
          );

          recordLocalDeliveryExecutionAction({
            deliveryPackage: packageSummary,
            record: {
              actionType: localReceipt.actionType,
              receiptId: localReceipt.receiptId,
              recordedAt: localReceipt.recordedAt,
              sourceRevision: localReceipt.sourceRevision,
              statusLabel: projection.statusLabel,
              summary: localReceipt.summary,
              tone: projection.tone,
            },
          });
          setReceipt(localReceipt);
          setActionStep("receipt");
        }
      } finally {
        setApplying(false);
      }
    },
    [runtimeCapabilities.canSubmit],
  );

  return {
    actionStep,
    activeAction,
    applyAction,
    applying,
    canSubmit: runtimeCapabilities.canSubmit,
    closeAction,
    openAction,
    receipt,
    setActionStep,
  };
}
