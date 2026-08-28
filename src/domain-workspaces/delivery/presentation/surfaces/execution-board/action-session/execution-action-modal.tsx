import { useEffect, useState } from "react";

import type {
  DeliveryArtNode,
  DeliveryAvailableAction,
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../../../read-model/index.ts";
import {
  getChildCounts,
  getPackageAuditEvents,
  getPackageDetailsById,
} from "../../../../read-model/index.ts";

import {
  TerasActionButton,
  TerasDraftCloseGuardDialog,
  TerasEmptyState,
  TerasContentTray,
  TerasDialog,
  TerasFieldStack,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasList,
  TerasSignalItem,
  TerasTextField,
  TerasTrayStack,
} from "@/teras";
import {
  executionActionContracts,
  type ExecutionActionContract,
  type ExecutionActionReceipt,
  type ExecutionActionStep,
} from "../../../../work-model/execution/execution-action-contracts.ts";
import {
  executionActionApplyMetadata,
  executionActionDraftMetadata,
  executionActionReceiptMetadata,
} from "./execution-action-view-model.ts";
import {
  executionActionInitialOperatorPayload,
  executionActionIntentWithOperatorPayload,
  executionActionOperatorFieldSpecs,
  executionBoardApplyIntent,
} from "../../../../work-model/execution/execution-action-intent.ts";
import { executionPackageDetailsMetadata } from "../execution-board-view-model.ts";
import { executionActionIntentReady } from "../../../../work-model/execution/execution-action-eligibility.ts";

export function ExecutionActionModal({
  action,
  actionStep,
  auditEvents,
  canSubmit,
  details,
  error,
  model,
  onApplyAction,
  onClose,
  onActionStepChange,
  packageSummary,
  packageTree,
  receipt,
  sourceRevision,
  submitting,
}: {
  action: DeliveryAvailableAction;
  actionStep: ExecutionActionStep;
  auditEvents: ReturnType<typeof getPackageAuditEvents>;
  canSubmit: boolean;
  details: ReturnType<typeof getPackageDetailsById>;
  error: string | null;
  model: DeliveryReadModel;
  onApplyAction: (input: {
    action: DeliveryAvailableAction;
    actionContract: ExecutionActionContract;
    applyIntent: ReturnType<typeof executionBoardApplyIntent>;
    packageSummary: DeliveryPackageSummary;
  }) => void | Promise<void>;
  onClose: () => void;
  onActionStepChange: (step: ExecutionActionStep) => void;
  packageSummary: DeliveryPackageSummary;
  packageTree: DeliveryArtNode | null;
  receipt: ExecutionActionReceipt | null;
  sourceRevision?: string;
  submitting: boolean;
}) {
  const actionContract = executionActionContracts[action.action_type];
  const sourceApplyIntent = executionBoardApplyIntent({
    action,
    actionContract,
    model,
    packageSummary,
    packageTree,
    sourceRevision:
      sourceRevision ??
      details?.source_revision ??
      `mock-delivery-v1:${packageSummary.delivery_package_id}`,
  });
  const initialOperatorPayload = executionActionInitialOperatorPayload({
    action,
    applyIntent: sourceApplyIntent,
  });
  const [operatorPayload, setOperatorPayload] = useState<
    Record<string, string>
  >(initialOperatorPayload);
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);

  useEffect(() => {
    setOperatorPayload(
      executionActionInitialOperatorPayload({
        action,
        applyIntent: sourceApplyIntent,
      }),
    );
    setCloseGuardOpen(false);
  }, [action, sourceApplyIntent.intent_id]);

  const applyIntent = executionActionIntentWithOperatorPayload({
    applyIntent: sourceApplyIntent,
    operatorPayload,
  });
  const operatorFields = executionActionOperatorFieldSpecs(action);
  const operatorDraftDirty = operatorFields.some(
    (field) =>
      (operatorPayload[field.id] ?? "") !==
      (initialOperatorPayload[field.id] ?? ""),
  );
  const childCounts = packageTree ? getChildCounts(packageTree) : null;
  const reviewableAction = action.enabled && actionContract.reviewable;
  const applyReady = canSubmit && executionActionIntentReady(applyIntent);

  function updateOperatorPayload(fieldId: string, value: string) {
    setOperatorPayload((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  function requestClose() {
    if (actionStep !== "receipt" && operatorDraftDirty) {
      setCloseGuardOpen(true);
      return;
    }

    onClose();
  }

  if (action.action_type === "open-audit-trail") {
    return (
      <TerasDialog
        contentOverflow="auto"
        height="content"
        width="standard"
        closeLabel="Close package audit trail"
        description={`Read-only package-scoped history for ${packageSummary.source_ref}.`}
        kicker="Audit Trail"
        onClose={onClose}
        open
        title={packageSummary.display_name}
      >
        <TerasTrayStack spacing="compact">
          {auditEvents.length > 0 ? (
            <TerasList frame="contained">
              {auditEvents.map((event) => (
                <TerasSignalItem
                  detail={event.detail}
                  key={event.event_id}
                  label={event.category}
                  meta={`${event.occurred_at} / ${event.receipt_id ?? "no receipt"}`}
                  title={event.title}
                  tone={event.tone}
                />
              ))}
            </TerasList>
          ) : (
            <TerasEmptyState>
              No package-scoped audit events are projected for this package yet.
            </TerasEmptyState>
          )}
        </TerasTrayStack>
      </TerasDialog>
    );
  }

  if (action.action_type === "open-details") {
    return (
      <TerasDialog
        contentOverflow="auto"
        height="content"
        width="standard"
        closeLabel="Close package details"
        description="Read-only package context, lineage, and projected child shape."
        kicker="Package Details"
        onClose={onClose}
        open
        title={packageSummary.display_name}
      >
        <TerasMetadataList
          items={executionPackageDetailsMetadata({
            childCounts,
            details,
            packageSummary,
          })}
        />
      </TerasDialog>
    );
  }

  return (
    <>
      <TerasModalShell
        bodyLayout="scroll"
        height="content"
        width="standard"
        description={actionContract.modalDescription}
        footer={
          <>
            <TerasActionButton onClick={requestClose} emphasis="secondary">
              Back to Board
            </TerasActionButton>
            {actionStep === "draft" && reviewableAction ? (
              <TerasActionButton onClick={() => onActionStepChange("apply")}>
                {actionContract.reviewActionLabel}
              </TerasActionButton>
            ) : null}
            {actionStep === "apply" ? (
              <TerasActionButton
                disabled={!applyReady || submitting}
                onClick={() =>
                  onApplyAction({
                    action,
                    actionContract,
                    applyIntent,
                    packageSummary,
                  })
                }
                emphasis={!applyReady || submitting ? "secondary" : "primary"}
                tone={
                  applyReady && !submitting && action.tone === "danger"
                    ? "danger"
                    : "accent"
                }
              >
                {actionContract.receiptActionLabel}
              </TerasActionButton>
            ) : null}
          </>
        }
        kicker={actionContract.modalKicker}
        onClose={requestClose}
        surfaceId="delivery-execution-action"
        title="Execution Action"
      >
        {actionStep === "draft" ? (
          <TerasTrayStack spacing="compact">
            <TerasPanel
              frame="flush"
              treatment="state"
              spacing="compact"
              tone={action.tone}
            >
              <TerasPanelHeader
                kicker={actionContract.familyLabel}
                title={actionContract.draftTitle}
                description={actionContract.draftDescription}
              />
              <TerasMetadataList
                items={executionActionDraftMetadata({
                  action,
                  actionContract,
                  applyIntent,
                  packageSummary,
                })}
              />
              {applyIntent.advisor_reason ? (
                <TerasContentTray kicker="Advisor Reason">
                  {applyIntent.advisor_reason}
                </TerasContentTray>
              ) : null}
              {operatorFields.length > 0 ? (
                <TerasContentTray kicker="Operator Input">
                  <TerasFieldStack spacing="loose">
                    {operatorFields.map((field) => {
                      const value = operatorPayload[field.id] ?? "";

                      if (field.kind === "select") {
                        return (
                          <TerasSelectField
                            key={field.id}
                            label={field.label}
                            onValueChange={(nextValue) =>
                              updateOperatorPayload(field.id, nextValue)
                            }
                            options={field.options ?? []}
                            value={value}
                          />
                        );
                      }

                      if (field.kind === "date") {
                        return (
                          <TerasTextField
                            key={field.id}
                            label={field.label}
                            onValueChange={(nextValue) =>
                              updateOperatorPayload(field.id, nextValue)
                            }
                            placeholder={field.placeholder}
                            type="date"
                            value={value}
                          />
                        );
                      }

                      return (
                        <TerasNoteField
                          key={field.id}
                          label={field.label}
                          minimumHeight="short"
                          onValueChange={(nextValue) =>
                            updateOperatorPayload(field.id, nextValue)
                          }
                          placeholder={field.placeholder}
                          value={value}
                        />
                      );
                    })}
                  </TerasFieldStack>
                </TerasContentTray>
              ) : null}
            </TerasPanel>
          </TerasTrayStack>
        ) : null}

        {actionStep === "apply" ? (
          <TerasTrayStack spacing="compact">
            <TerasPanel
              frame="flush"
              treatment="state"
              spacing="compact"
              tone="warn"
            >
              <TerasPanelHeader
                kicker="Apply Review"
                title={actionContract.applyTitle}
                description={actionContract.applyDescription}
              />
              <TerasMetadataList
                items={executionActionApplyMetadata({
                  actionContract,
                  applyIntent,
                })}
              />
              <TerasList frame="contained">
                {applyIntent.gate_checks.map((gate) => (
                  <TerasSignalItem
                    statusLabel={gate.passed ? "Clear" : "Blocked"}
                    key={gate.label}
                    label="Gate Check"
                    title={gate.label}
                    tone={gate.tone}
                  />
                ))}
              </TerasList>
              {error ? (
                <TerasList frame="contained">
                  <TerasSignalItem
                    detail={error}
                    label="Apply stopped"
                    title="Canonical Delivery change was not completed"
                    tone="danger"
                  />
                </TerasList>
              ) : null}
            </TerasPanel>
          </TerasTrayStack>
        ) : null}

        {actionStep === "receipt" ? (
          <TerasTrayStack spacing="compact">
            <TerasPanel
              frame="flush"
              treatment="state"
              spacing="compact"
              tone="ok"
            >
              <TerasPanelHeader
                kicker="Action Receipt"
                title={actionContract.receiptTitle}
                description={actionContract.receiptDescription}
              />
              <TerasMetadataList
                items={executionActionReceiptMetadata({
                  action,
                  actionContract,
                  applyIntent,
                  packageSummary,
                  receipt,
                })}
              />
            </TerasPanel>
          </TerasTrayStack>
        ) : null}
      </TerasModalShell>
      <TerasDraftCloseGuardDialog
        description="This execution action has operator input that is not recorded. Leaving now will discard it."
        kicker="Execution Action"
        leaveLabel="Discard Draft"
        onKeepEditing={() => setCloseGuardOpen(false)}
        onLeave={onClose}
        open={closeGuardOpen}
        title="Discard Action Draft?"
      />
    </>
  );
}
