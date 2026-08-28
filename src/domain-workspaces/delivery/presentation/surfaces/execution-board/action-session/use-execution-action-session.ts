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

export type ExecutionActionSubmission = {
  action: DeliveryAvailableAction;
  actionContract: ExecutionActionContract;
  applyIntent: DeliveryApplyIntent;
  packageSummary: DeliveryPackageSummary;
};

export function useExecutionActionSession({
  submitLive,
}: {
  submitLive?: (
    submission: ExecutionActionSubmission,
  ) => Promise<ExecutionActionReceipt | null>;
} = {}) {
  const runtimeCapabilities = getExecutionActionRuntimeCapabilities();
  const [activeAction, setActiveAction] =
    useState<DeliveryAvailableAction | null>(null);
  const [actionStep, setActionStep] = useState<ExecutionActionStep>("draft");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ExecutionActionReceipt | null>(null);

  const openAction = useCallback((action: DeliveryAvailableAction) => {
    setActiveAction(action);
    setActionStep("draft");
    setApplying(false);
    setError(null);
    setReceipt(null);
  }, []);

  const closeAction = useCallback(() => {
    setActiveAction(null);
    setApplying(false);
    setError(null);
    setReceipt(null);
  }, []);

  const applyAction = useCallback(
    async (submission: ExecutionActionSubmission) => {
      const { action, actionContract, applyIntent, packageSummary } = submission;
      if (!runtimeCapabilities.canSubmit) {
        return;
      }

      setApplying(true);
      setError(null);

      try {
        if (submitLive) {
          const liveReceipt = await submitLive(submission);
          if (liveReceipt) {
            setReceipt(liveReceipt);
            setActionStep("receipt");
            return;
          }
        }
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
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "The Delivery execution action could not be applied.",
        );
      } finally {
        setApplying(false);
      }
    },
    [runtimeCapabilities.canSubmit, submitLive],
  );

  return {
    actionStep,
    activeAction,
    applyAction,
    applying,
    canSubmit: runtimeCapabilities.canSubmit,
    closeAction,
    error,
    openAction,
    receipt,
    setActionStep,
  };
}
