import {
  TerasStatusItem,
  TerasMetadataList,
  TerasList,
  TerasStatusPill,
  TerasWizardPanel,
} from "@/teras";

import type {
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignReceipt,
  OrchestrationDefinitionValidationFinding,
} from "../../../../work-model/definition-design/definition-design-types.ts";
import {
  definitionDesignClassificationLabel,
  definitionReviewObligations,
  definitionReviewSummary,
} from "../definition-design-view-model.ts";

export function DefinitionReviewRequestStep({
  actionError,
  draft,
  navigateToFinding,
  receipt,
}: {
  actionError: string | null;
  draft: OrchestrationDefinitionDesignDraft;
  navigateToFinding: (
    finding: OrchestrationDefinitionValidationFinding,
  ) => void;
  receipt: OrchestrationDefinitionDesignReceipt | null;
}) {
  if (receipt) {
    return <DefinitionReceiptStep draft={draft} receipt={receipt} />;
  }

  const review = definitionReviewSummary(draft);
  const obligations = definitionReviewObligations(draft);
  const durable = draft.qualification.classification === "durable-candidate";

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={review.tone}>{review.status}</TerasStatusPill>
      }
      description={
        durable
          ? "Review architecture, security, platform, owner-repo, validation, rollout, and work-home obligations before requesting implementation."
          : "Review the bounded execution decision before retaining this qualification outside the durable lifecycle."
      }
      kicker={durable ? "Implementation Review" : "Qualification Review"}
      title={durable ? "Definition obligations" : "Qualification decision"}
    >
      <TerasList frame="contained">
        {obligations.map((obligation, index) => {
          const item = {
            detail: obligation.detail,
            index: String(index + 1).padStart(2, "0"),
            label: obligation.label,
            status: obligation.status,
            tone: obligation.tone,
          };

          return obligation.finding ? (
            <TerasStatusItem
              {...item}
              ariaLabel={`Open ${obligation.label} finding`}
              key={obligation.id}
              onSelect={() => navigateToFinding(obligation.finding)}
            />
          ) : (
            <TerasStatusItem {...item} key={obligation.id} />
          );
        })}
        {actionError ? (
          <TerasStatusItem
            tone="danger"
            detail={actionError}
            label="Receipt"
            status="failed"
          />
        ) : null}
      </TerasList>
    </TerasWizardPanel>
  );
}

function DefinitionReceiptStep({
  draft,
  receipt,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  receipt: OrchestrationDefinitionDesignReceipt;
}) {
  const qualificationReceipt = "classification" in receipt;
  const outcome = qualificationReceipt
    ? definitionDesignClassificationLabel(receipt.classification)
    : `${receipt.routeTarget === "delivery-art" ? "Delivery ART" : "Workspace Proposals"} / ${receipt.targetRef}`;

  return (
    <TerasWizardPanel
      actions={<TerasStatusPill tone="ok">Recorded</TerasStatusPill>}
      description="The prototype-local receipt records the operator decision without activating runtime source or mutating an external work system."
      kicker="Workflow Receipt"
      title={
        qualificationReceipt
          ? "Qualification recorded"
          : "Implementation request recorded"
      }
    >
      <TerasMetadataList
        columns={2}
        items={[
          { label: "Receipt", value: receipt.receiptId },
          { label: "Recorded", value: formatTimestamp(receipt.recordedAt) },
          {
            label: qualificationReceipt ? "Classification" : "Route",
            value: outcome,
          },
          {
            label: "Definition",
            value:
              draft.identityOwnership.definitionId || draft.qualification.title,
          },
        ]}
      />
      <TerasList frame="contained">
        <TerasStatusItem
          tone="ok"
          detail="The operator decision is retained by the local receipt projection."
          index="01"
          label="Decision"
          status="recorded"
        />
        <TerasStatusItem
          tone="info"
          detail="No executable definition, backend request, or runtime activation was created."
          index="02"
          label="Mutation boundary"
          status="local only"
        />
        <TerasStatusItem
          tone="muted"
          detail={
            qualificationReceipt
              ? "Reopen qualification only when the execution boundary materially changes."
              : "Future governed wiring must route this packet to the recorded work home."
          }
          index="03"
          label="Next move"
          status="external"
        />
      </TerasList>
    </TerasWizardPanel>
  );
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
