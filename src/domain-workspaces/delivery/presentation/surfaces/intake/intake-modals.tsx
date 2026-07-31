import { useState } from "react";

import type { DeliveryIntakeSource } from "../../../read-model/index.ts";

import {
  TerasActionButton,
  TerasDetailGrid,
  TerasContentTray,
  TerasMetadataList,
  TerasModalShell,
  TerasPanel,
  TerasPanelHeader,
  TerasTrayStack,
} from "@/teras";

import {
  intakeConsumeReceiptMetadata,
  intakeConsumedHandoffMetadata,
  intakeConsumeModalProjection,
  intakeEvidenceMetadata,
  intakeModalStatusDescription,
  intakeModalStatusTitle,
  intakeOperatorActionDetail,
  intakeOperatorActionTitle,
  intakeRequiredFixDetail,
  intakeRequiredFixTitle,
  intakeReviewRequestButtonLabel,
  intakeReviewRequestReceiptMetadata,
  intakeReviewRequestReceiptDetail,
  intakeReviewRequestReceiptTitle,
  intakeSourceCustodyDescription,
  intakeSourceCustodyMetadata,
  intakeSourceCustodyTitle,
  intakeSourceHandoffMetadata,
} from "./intake-view-model.ts";

export function DeliveryIntakeConsumeModal({
  onClose,
  onConsume,
  source,
}: {
  onClose: () => void;
  onConsume: () => void;
  source: DeliveryIntakeSource;
}) {
  const consumeProjection = intakeConsumeModalProjection(source);
  const [reviewRequestRecorded, setReviewRequestRecorded] = useState(false);

  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Approve only the consume handoff. Intake creates or links one Delivery Package shell and then hands the work to Work Design."
      footer={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Back to Register
          </TerasActionButton>
          {consumeProjection.canConsume ? (
            <TerasActionButton onClick={onConsume}>
              Consume Source
            </TerasActionButton>
          ) : consumeProjection.needsRepair ? (
            <TerasActionButton
              disabled={reviewRequestRecorded}
              onClick={() => setReviewRequestRecorded(true)}
              tone="danger"
              emphasis="primary"
            >
              {intakeReviewRequestButtonLabel({
                reviewRequestRecorded,
                source,
              })}
            </TerasActionButton>
          ) : null}
        </>
      }
      kicker="Intake Workflow"
      onClose={onClose}
      surfaceId="delivery-intake-consume"
      title="Consume Handoff"
    >
      <TerasDetailGrid variant="balanced">
        <TerasPanel frame="padded" treatment="state" tone={source.tone}>
          <TerasPanelHeader
            kicker="Accepted Proposal"
            statusLabel={source.status_label}
            statusTone={source.tone}
            title={source.title}
            description={source.summary}
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasContentTray
              description={source.gate_summary}
              kicker="Proposal Summary"
            />
            <TerasMetadataList items={intakeSourceHandoffMetadata(source)} />
            <TerasContentTray
              description={intakeSourceCustodyDescription(source)}
              kicker="Source Custody"
              title={intakeSourceCustodyTitle(source)}
            >
              <TerasMetadataList items={intakeSourceCustodyMetadata(source)} />
            </TerasContentTray>
          </TerasTrayStack>
        </TerasPanel>

        <TerasPanel
          frame="padded"
          treatment="rail"
          tone={consumeProjection.tone}
        >
          <TerasPanelHeader
            kicker="Consume Handoff"
            statusLabel={consumeProjection.statusLabel}
            statusTone={consumeProjection.statusTone}
            title={intakeModalStatusTitle(source)}
            description={intakeModalStatusDescription(source)}
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasContentTray
              description={intakeOperatorActionDetail(source)}
              kicker="Operator Action"
              title={intakeOperatorActionTitle(source)}
            />
            <TerasTrayStack columns={2} spacing="comfortable">
              <TerasContentTray
                description={intakeRequiredFixDetail(source)}
                kicker={intakeRequiredFixTitle(source)}
              />
              <TerasContentTray
                description={consumeProjection.ownerRouteDescription}
                kicker={consumeProjection.ownerRouteKicker}
              />
            </TerasTrayStack>
            {consumeProjection.needsRepair ? (
              <TerasContentTray kicker="Retry Evidence">
                <TerasMetadataList
                  columns={1}
                  items={intakeEvidenceMetadata(source)}
                  shape="list"
                />
              </TerasContentTray>
            ) : null}
            {reviewRequestRecorded ? (
              <TerasContentTray
                description={intakeReviewRequestReceiptDetail(source)}
                kicker="Local Request Receipt"
                title={intakeReviewRequestReceiptTitle(source)}
              >
                <TerasMetadataList
                  items={intakeReviewRequestReceiptMetadata(source)}
                />
              </TerasContentTray>
            ) : null}
            <TerasContentTray
              description={`${source.expected_backend_route}. OOS owns the consume endpoint; WGCF supplies consume-gate readiness; CGG attaches context packets only when projection is needed.`}
              kicker="Backend Signal"
            />
          </TerasTrayStack>
        </TerasPanel>
      </TerasDetailGrid>
    </TerasModalShell>
  );
}

export function DeliveryIntakeConsumedSummaryModal({
  onClose,
  source,
}: {
  onClose: () => void;
  source: DeliveryIntakeSource;
}) {
  return (
    <TerasModalShell
      bodyLayout="scroll"
      height="content"
      width="standard"
      description="Review the recorded movement from accepted proposal source into the Delivery package shell."
      footer={
        <TerasActionButton onClick={onClose} emphasis="secondary">
          Back to Register
        </TerasActionButton>
      }
      kicker="Intake Receipt"
      onClose={onClose}
      surfaceId="delivery-intake-consumed-summary"
      title="Consumed Source Summary"
    >
      <TerasDetailGrid variant="balanced">
        <TerasPanel frame="padded" treatment="state" tone={source.tone}>
          <TerasPanelHeader
            kicker="Accepted Source"
            statusLabel={source.status_label}
            statusTone={source.tone}
            title={source.title}
            description={source.summary}
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasContentTray
              description={source.gate_summary}
              kicker="Recorded Handoff"
            />
            <TerasMetadataList items={intakeConsumedHandoffMetadata(source)} />
            <TerasContentTray
              description={intakeSourceCustodyDescription(source)}
              kicker="Source Custody"
              title={intakeSourceCustodyTitle(source)}
            >
              <TerasMetadataList items={intakeSourceCustodyMetadata(source)} />
            </TerasContentTray>
          </TerasTrayStack>
        </TerasPanel>

        <TerasPanel frame="padded" treatment="rail" tone="ok">
          <TerasPanelHeader
            kicker="Consume Receipt"
            statusLabel="receipt"
            statusTone="ok"
            title="Handoff Recorded"
            description="Intake is read-only for this item; the receipt is the useful action here."
          />
          <TerasTrayStack spacing="loose" topOffset="section">
            <TerasMetadataList items={intakeConsumeReceiptMetadata(source)} />
            <TerasContentTray
              description={source.expected_backend_route}
              kicker="Recorded Backend Signal"
            />
            <TerasContentTray kicker="Evidence Captured">
              <TerasMetadataList
                columns={1}
                items={intakeEvidenceMetadata(source)}
                shape="list"
              />
            </TerasContentTray>
          </TerasTrayStack>
        </TerasPanel>
      </TerasDetailGrid>
    </TerasModalShell>
  );
}
