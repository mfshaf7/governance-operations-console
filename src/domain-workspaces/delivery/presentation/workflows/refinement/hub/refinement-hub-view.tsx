"use client";

import {
  TerasActionButton,
  TerasMetadataList,
  TerasPanelActionLayout,
  TerasPanelHeader,
  TerasProgressStepSelector,
  TerasHubFrame,
  TerasHubPanel,
  TerasHubStepList,
} from "@/teras";
import type {
  DeliveryPackageSummary,
  DeliveryRefinementApplyReceipt,
  DeliveryRefinementPacket,
  DeliveryRefinementStepId,
} from "../../../../read-model/index.ts";

import { type RefinementMetadataWorkbenchSummary } from "../view-model/refinement-metadata-model.ts";
import {
  refinementHubSelectedMetadata,
  refinementHubViewProjection,
  type RefinementHubAction,
} from "../view-model/refinement-hub-model.ts";
import { refinementPacketStatusLabel } from "../view-model/refinement-packet-model.ts";
import {
  refinementStepStateLabel,
  refinementSteps,
  refinementStepTone,
} from "../view-model/refinement-step-model.ts";
import type { DeliveryRefinementModalStep } from "../model/refinement-model.ts";

export function RefinementHubView({
  activeReceipt,
  deliveryPackage,
  hubAction,
  metadataWorkbenchSummary,
  onRunHubAction,
  onSelectStep,
  packet,
  progressActiveStep,
}: {
  activeReceipt: DeliveryRefinementApplyReceipt | null;
  deliveryPackage: DeliveryPackageSummary;
  hubAction: RefinementHubAction | null;
  metadataWorkbenchSummary: RefinementMetadataWorkbenchSummary;
  onRunHubAction: () => void;
  onSelectStep: (step: DeliveryRefinementModalStep) => void;
  packet: DeliveryRefinementPacket;
  progressActiveStep: DeliveryRefinementStepId;
}) {
  const hubProjection = refinementHubViewProjection({
    activeReceipt,
    deliveryPackage,
    hubAction,
    metadataReady: metadataWorkbenchSummary.ready,
    packet,
  });

  return (
    <TerasHubFrame
      selected={
        <TerasHubPanel slot="selected" tone="info">
          <TerasPanelHeader
            kicker="Selected Package"
            statusLabel={hubProjection.packageStatusLabel}
            statusTone={hubProjection.packageStatusTone}
            title={deliveryPackage.display_name}
            description={hubProjection.packageSummary}
          />
          <TerasMetadataList
            items={refinementHubSelectedMetadata({
              deliveryPackage,
              packet,
            })}
            shape="line"
            treatment="chip"
            wrap
          />
        </TerasHubPanel>
      }
      primary={
        <TerasHubPanel slot="action" tone={hubProjection.actionTone}>
          <TerasPanelActionLayout
            header={
              <TerasPanelHeader
                kicker="Current Required Move"
                title={hubProjection.actionTitle}
                description={hubProjection.actionDescription}
              />
            }
            action={
              <TerasActionButton onClick={onRunHubAction} emphasis="primary">
                {hubProjection.actionButtonLabel}
              </TerasActionButton>
            }
          />
        </TerasHubPanel>
      }
      status={
        <TerasHubPanel slot="status" tone={hubProjection.hubTone}>
          <TerasPanelHeader
            kicker="Current Status"
            statusLabel={refinementPacketStatusLabel(packet)}
            statusTone={hubProjection.hubTone}
            title={hubProjection.statusTitle}
            description={hubProjection.statusDescription}
          />
          <TerasMetadataList items={hubProjection.statusFacts} />
        </TerasHubPanel>
      }
      progress={
        <TerasHubPanel slot="progress" tone={hubProjection.progressTone}>
          <TerasPanelHeader
            kicker="Progress"
            title="Refinement Steps"
            description={hubProjection.progressDescription}
          />
          <TerasHubStepList ariaLabel="Refinement steps">
            {refinementSteps.map((step, index) => (
              <TerasProgressStepSelector
                available={!hubProjection.refinementBlocked}
                current={
                  !hubProjection.refinementBlocked &&
                  progressActiveStep === step.id
                }
                density="compact"
                detail={step.detail}
                index={index + 1}
                key={`refinement-hub-step-${step.id}`}
                label={step.label}
                onSelect={() => onSelectStep(step.id)}
                stateLabel={
                  hubProjection.refinementBlocked
                    ? "Locked"
                    : refinementStepStateLabel({
                        applyRecorded: Boolean(activeReceipt),
                        activeStep: progressActiveStep,
                        candidateStep: step.id,
                        packet,
                      })
                }
                tone={
                  hubProjection.refinementBlocked
                    ? "muted"
                    : refinementStepTone({
                        applyRecorded: Boolean(activeReceipt),
                        activeStep: progressActiveStep,
                        candidateStep: step.id,
                        packet,
                      })
                }
              />
            ))}
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
                description={
                  activeReceipt
                    ? "Open the immutable Refinement receipt for audit inspection. History does not advance the active workflow."
                    : "Receipt history is available after Refinement apply completes."
                }
              />
            }
            action={
              <TerasActionButton
                onClick={() => onSelectStep("receipt")}
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
