import { useEffect, useState } from "react";

import type {
  DeliveryArtNode,
  DeliveryAvailableAction,
  DeliveryPackageSummary,
  DeliveryReadModel,
} from "../../../../read-model/index.ts";
import {
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
  const itemBlockerReview = action.action_type === "clear-blocker" && action.scope === "execution_target";
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
  const returnStatus = operatorFields.find(field => field.id === "resume_status")?.options
    ?.find(option => option.value && option.value === operatorPayload.resume_status)?.label;
  const operatorDraftDirty = operatorFields.some(
    (field) =>
      (operatorPayload[field.id] ?? "") !==
      (initialOperatorPayload[field.id] ?? ""),
  );
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
                  textOverflow="wrap"
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

  return (
    <>
      <TerasModalShell
        bodyLayout="scroll"
        height="content"
        width="standard"
        modalAttributes={itemBlockerReview ? { style: { maxWidth: "42rem" } } : undefined}
        description={itemBlockerReview ? "Review the recorded blocker before returning this item to active work." : actionContract.modalDescription}
        footer={
          <>
            <TerasActionButton onClick={requestClose} emphasis="secondary">
              Back to Board
            </TerasActionButton>
            {actionStep === "draft" && reviewableAction ? (
              <TerasActionButton onClick={() => onActionStepChange("apply")}>
                {itemBlockerReview ? "Review Changes" : actionContract.reviewActionLabel}
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
                {itemBlockerReview ? "Clear Blocker" : actionContract.receiptActionLabel}
              </TerasActionButton>
            ) : null}
          </>
        }
        kicker={actionContract.modalKicker}
        onClose={requestClose}
        surfaceId="delivery-execution-action"
        title={itemBlockerReview ? "Review Blocker" : "Execution Action"}
      >
        {actionStep === "draft" ? (
          <TerasTrayStack spacing="compact">
            <TerasPanel
              frame="padded"
              treatment="state"
              spacing="compact"
              tone={action.tone}
            >
              <TerasPanelHeader
                kicker={actionContract.familyLabel}
                title={itemBlockerReview ? "What’s blocking this item" : actionContract.draftTitle}
                description={itemBlockerReview ? packageTree?.blocker?.statement : actionContract.draftDescription}
              />
              {itemBlockerReview ? <TerasMetadataList items={[
                { label: "Work item", value: applyIntent.target_display_name },
                { label: "Package", value: packageSummary.display_name },
              ]} /> : <TerasMetadataList
                items={executionActionDraftMetadata({
                  action,
                  actionContract,
                  applyIntent,
                  packageSummary,
                })}
              />}
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
                            label={itemBlockerReview && field.id === "resume_status" ? "Return to" : field.label}
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
              frame="padded"
              treatment="state"
              spacing="compact"
              tone="warn"
            >
              <TerasPanelHeader
                kicker={itemBlockerReview ? "Confirmation" : "Apply Review"}
                title={itemBlockerReview ? "Clear this blocker?" : actionContract.applyTitle}
                description={itemBlockerReview ? "Confirm the blocker has been resolved and the item can return to the selected status." : actionContract.applyDescription}
              />
              {itemBlockerReview ? <TerasMetadataList items={[
                { label: "Work item", value: applyIntent.target_display_name },
                { label: "Return to", value: returnStatus ?? "Choose a status" },
              ]} /> : <TerasMetadataList
                items={executionActionApplyMetadata({
                  actionContract,
                  applyIntent,
                })}
              />}
              {!itemBlockerReview ? <TerasList frame="contained">
                {applyIntent.gate_checks.map((gate) => (
                  <TerasSignalItem
                    statusLabel={gate.passed ? "Clear" : "Blocked"}
                    key={gate.label}
                    label="Gate Check"
                    title={gate.label}
                    tone={gate.tone}
                  />
                ))}
              </TerasList> : null}
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
              frame="padded"
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
