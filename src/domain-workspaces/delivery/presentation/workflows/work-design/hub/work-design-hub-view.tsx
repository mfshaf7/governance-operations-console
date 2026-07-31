"use client";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";

import {
  workDesignStepStatusLabel,
  workDesignStepTone,
} from "../view-model/work-design-step-model.ts";
import {
  workDesignHubSelectedMetadata,
  type workDesignDesignHubProjection,
} from "../view-model/work-design-hub-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignStep,
} from "../model/work-design-model.ts";
import {
  TerasActionButton,
  TerasActionRow,
  TerasMetadataList,
  TerasPanelHeader,
  TerasPanelActionLayout,
  TerasProgressStepSelector,
  TerasHubFrame,
  TerasHubPanel,
  TerasHubStepList,
} from "@/teras";

type WorkDesignHubStepItem = {
  id: WorkDesignStep;
  label: string;
  summary: string;
};

type WorkDesignHubViewProps = {
  applyReceiptRecorded: boolean;
  contextBriefAccepted: boolean;
  contextDecision: WorkDesignContextDecision;
  deliveryPackage: DeliveryPackageSummary;
  draftTreePresent: boolean;
  designHubProjection: ReturnType<typeof workDesignDesignHubProjection>;
  onOpenBlockerRecovery: () => void;
  onSelectStep: (step: WorkDesignStep) => void;
  reviewReady: boolean;
  draftReviewAccepted: boolean;
  draftValidationAccepted: boolean;
  workDesignBlocked: boolean;
  workDesignSteps: WorkDesignHubStepItem[];
};

export function WorkDesignHubView({
  applyReceiptRecorded,
  contextBriefAccepted,
  contextDecision,
  deliveryPackage,
  draftTreePresent,
  designHubProjection,
  onOpenBlockerRecovery,
  onSelectStep,
  reviewReady,
  draftReviewAccepted,
  draftValidationAccepted,
  workDesignBlocked,
  workDesignSteps,
}: WorkDesignHubViewProps) {
  const sourceTerminalClosed =
    designHubProjection.sourceWorkDesignClosed && contextDecision !== "proceed";
  const workDesignClosed = designHubProjection.workDesignClosed;
  const showBlockerRecoveryButton =
    !workDesignBlocked && designHubProjection.blockerRecoveryHubActionAvailable;
  const hubProgressSteps = workDesignSteps.filter(
    (item) => item.id !== "history",
  );

  return (
    <TerasHubFrame
      selected={
        <TerasHubPanel slot="selected" tone="info">
          <TerasPanelHeader
            kicker="Selected Package"
            statusLabel={designHubProjection.hubPackageStatus.label}
            statusTone={designHubProjection.hubPackageStatus.tone}
            title={deliveryPackage.display_name}
            description={designHubProjection.hubPackageSummary}
          />
          <TerasMetadataList
            items={workDesignHubSelectedMetadata(deliveryPackage)}
            shape="line"
            treatment="chip"
            wrap
          />
        </TerasHubPanel>
      }
      primary={
        <TerasHubPanel
          slot="action"
          tone={designHubProjection.nextSessionAction.tone}
        >
          <TerasPanelActionLayout
            header={
              <TerasPanelHeader
                kicker={designHubProjection.designHubActionKicker}
                title={designHubProjection.designHubActionTitle}
                description={designHubProjection.designHubActionDescription}
              />
            }
            action={
              <TerasActionButton
                onClick={() => {
                  if (workDesignBlocked) {
                    onOpenBlockerRecovery();
                    return;
                  }

                  onSelectStep(designHubProjection.nextSessionAction.step);
                }}
                emphasis="primary"
              >
                {designHubProjection.designHubActionButtonLabel}
              </TerasActionButton>
            }
          />
        </TerasHubPanel>
      }
      status={
        <TerasHubPanel
          slot="status"
          tone={designHubProjection.hubDraftStatusTone}
        >
          <TerasPanelHeader
            kicker={designHubProjection.hubStatusKicker}
            statusLabel={designHubProjection.hubDraftStatusLabel}
            statusTone={designHubProjection.hubDraftStatusTone}
            title={designHubProjection.hubDraftStatusTitle}
            description={designHubProjection.hubDraftStatusSummary}
          />
          {showBlockerRecoveryButton ? (
            <TerasActionRow spacing="compact">
              <TerasActionButton
                onClick={onOpenBlockerRecovery}

                emphasis="secondary"
              >
                Open Blocker Recovery
              </TerasActionButton>
            </TerasActionRow>
          ) : null}
          <TerasMetadataList items={designHubProjection.hubDraftStatusRows} />
        </TerasHubPanel>
      }
      progress={
        <TerasHubPanel
          slot="progress"
          tone={
            designHubProjection.applyPathComplete
              ? "ok"
              : designHubProjection.nextSessionAction.tone
          }
        >
          <TerasPanelHeader
            description="Current work-design progress and the next available workflow move."
            kicker={designHubProjection.hubProgressKicker}
            title={designHubProjection.hubProgressTitle}
          />
          <TerasHubStepList ariaLabel="Work design steps">
            {hubProgressSteps.map((item, index) => {
              const current =
                !workDesignClosed &&
                item.id === designHubProjection.nextSessionAction.step;
              const available = !workDesignBlocked;
              const stepTone = workDesignStepTone(item.id, {
                applyReceiptRecorded,
                contextBriefAccepted,
                contextDecision,
                draftTreePresent,
                reviewReady,
                draftReviewAccepted,
                draftValidationAccepted,
                sourceWorkDesignClosed:
                  designHubProjection.sourceWorkDesignClosed,
              });
              const stepStateLabel =
                item.id === "history"
                  ? "Archive"
                  : sourceTerminalClosed
                    ? item.id === "context"
                      ? "Done"
                      : "Not Required"
                    : current
                      ? "Current"
                      : stepTone === "ok"
                        ? "Done"
                        : available
                          ? "Next"
                          : "Locked";

              return (
                <TerasProgressStepSelector
                  available={available}
                  current={current}
                  detail={workDesignStepStatusLabel(item.id, {
                    applyReceiptRecorded,
                    contextBriefAccepted,
                    contextDecision,
                    draftTreePresent,
                    reviewReady,
                    draftReviewAccepted,
                    draftValidationAccepted,
                    sourceWorkDesignClosed:
                      designHubProjection.sourceWorkDesignClosed,
                  })}
                  index={index + 1}
                  key={`work-design-hub-step-${item.id}`}
                  label={item.label}
                  onSelect={() => onSelectStep(item.id)}
                  stateLabel={stepStateLabel}
                  tone={stepTone}
                />
              );
            })}
          </TerasHubStepList>
        </TerasHubPanel>
      }
      history={
        <TerasHubPanel slot="history">
          <TerasPanelActionLayout
            header={
              <TerasPanelHeader
                kicker="History"
                title="Receipt Archive"
                description="Open finalized brief, draft review, apply receipt, and recovery records when they exist. History is read-only and never advances the active workflow."
              />
            }
            action={
              <TerasActionButton
                onClick={() => onSelectStep("history")}
                emphasis="secondary"
              >
                View History
              </TerasActionButton>
            }
          />
        </TerasHubPanel>
      }
    />
  );
}
