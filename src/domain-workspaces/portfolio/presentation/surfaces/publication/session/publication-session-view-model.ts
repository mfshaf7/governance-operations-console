import type { TerasMetadataItem, TerasTone, TerasWizardStep } from "@/teras";
import type { ProductPortfolioScenarioProjection } from "../../../../read-model/types/product-portfolio-fixture-types.ts";
import type {
  ProductPublicationDecisionApplyResult,
  ProductPublicationDecisionDraft,
  ProductPublicationDecisionReceipt,
} from "../../../../work-model/publication/product-publication-decision-types.ts";
import type { ProductPortfolioPublicationSubmission } from "../../../../local-runtime/product-portfolio-runtime-model.ts";
import type {
  ProductPublicationOperatorRejectionReasonCode,
  ProductPublicationRequirement,
} from "../../../../work-model/publication/product-publication-review-types.ts";
import { validateProductPublicationDecision } from "../../../../work-model/publication/product-publication-decision-model.ts";
import {
  productPublicationRequirementDetail,
  productPublicationRequirementLabel,
  productPublicationRequirementStatus,
  productPublicationRequirementTone,
  productPublicationStateLabel,
} from "../publication-view-model.ts";
import { productListingScopeLabel } from "../../products/products-view-model.ts";

export type ProductPublicationSessionStepId = "checks" | "decision" | "result";
export type ProductPublicationDecisionChoice = "publish" | "reject";
export type ProductPublicationListingStateChoice = "listed" | "unlisted";
export type ProductPublicationPlacementChoice = "featured" | "standard";

export type ProductPublicationSessionDraft = {
  decision: ProductPublicationDecisionChoice;
  featured: boolean;
  listingState: ProductPublicationListingStateChoice;
  reasonCode: ProductPublicationOperatorRejectionReasonCode;
  reasonNote: string;
  scope: "client" | "internal" | "public";
};

export type ProductPublicationDecisionSubmission =
  ProductPortfolioPublicationSubmission;

export type ProductPublicationDecisionSubmitHandler = (
  submission: ProductPublicationDecisionSubmission,
) => Promise<ProductPublicationDecisionApplyResult>;

export type ProductPublicationSessionCheckRow = {
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
};

export const productPublicationDecisionOptions = [
  { id: "publish", label: "Publish", tone: "ok" },
  { id: "reject", label: "Reject", tone: "danger" },
] satisfies Array<{
  id: ProductPublicationDecisionChoice;
  label: string;
  tone: "danger" | "ok";
}>;

export const productPublicationListingStateOptions = [
  { id: "listed", label: "Listed", tone: "info" },
  { id: "unlisted", label: "Unlisted", tone: "muted" },
] satisfies Array<{
  id: ProductPublicationListingStateChoice;
  label: string;
  tone: "info" | "muted";
}>;

export const productPublicationPlacementOptions = [
  { id: "standard", label: "Standard", tone: "info" },
  { id: "featured", label: "Featured", tone: "warn" },
] satisfies Array<{
  id: ProductPublicationPlacementChoice;
  label: string;
  tone: "info" | "warn";
}>;

export const productPublicationRejectionOptions = [
  {
    id: "not-eligible-product",
    label: "Not Eligible",
    tone: "muted",
  },
  {
    id: "source-withdrawn",
    label: "Source Withdrawn",
    tone: "muted",
  },
  {
    id: "superseded-publication",
    label: "Superseded",
    tone: "muted",
  },
  { id: "other", label: "Other", tone: "muted" },
] satisfies Array<{
  id: ProductPublicationOperatorRejectionReasonCode;
  label: string;
  tone: "muted";
}>;

export function initialProductPublicationDraft(
  record: ProductPortfolioScenarioProjection,
): ProductPublicationSessionDraft {
  const packet = record.publicationPacket;
  const requestedScope = packet.listing.requestedScope;
  const permittedScopes =
    packet.experience.accessContract.permittedListingScopes;
  const scope = permittedScopes.includes(requestedScope)
    ? requestedScope
    : (permittedScopes[0] ?? requestedScope);
  const listingState =
    packet.listing.requestedState === "unlisted" ? "unlisted" : "listed";

  return {
    decision: "publish",
    featured: listingState === "listed" && packet.listing.featured,
    listingState,
    reasonCode: "not-eligible-product",
    reasonNote: "",
    scope,
  };
}

export function productPublicationDecisionDraft(
  draft: ProductPublicationSessionDraft,
): ProductPublicationDecisionDraft {
  if (draft.decision === "reject") {
    return {
      outcome: "reject",
      reasonCode: draft.reasonCode,
      reasonNote: draft.reasonNote,
    };
  }

  return {
    listing: {
      featured: draft.listingState === "listed" && draft.featured,
      scope: draft.scope,
      state: draft.listingState,
    },
    outcome: "publish",
  };
}

export function productPublicationDraftKey(draft: ProductPublicationSessionDraft) {
  return JSON.stringify(productPublicationDecisionDraft(draft));
}

export function productPublicationDecisionValidation(
  record: ProductPortfolioScenarioProjection,
  draft: ProductPublicationSessionDraft,
) {
  return validateProductPublicationDecision({
    context: record.projectionContext,
    draft: productPublicationDecisionDraft(draft),
    packet: record.publicationPacket,
  });
}

export function productPublicationDecisionSubmission({
  decidedAt,
  decidedByRef,
  draft,
  record,
}: {
  decidedAt: string;
  decidedByRef: string;
  draft: ProductPublicationSessionDraft;
  record: ProductPortfolioScenarioProjection;
}): ProductPublicationDecisionSubmission {
  const decisionDraft = productPublicationDecisionDraft(draft);
  const decisionKey = JSON.stringify(decisionDraft)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    decidedAt,
    decidedByRef,
    draft: decisionDraft,
    idempotencyKey: [
      "portfolio-publication",
      record.publicationPacket.packetId,
      record.projection.receipt.receiptRef,
      decisionKey,
    ].join(":"),
    record,
  };
}

export function productPublicationSessionSteps({
  activeStep,
  receipt,
  record,
}: {
  activeStep: ProductPublicationSessionStepId;
  receipt: ProductPublicationDecisionReceipt | null;
  record: ProductPortfolioScenarioProjection;
}): TerasWizardStep[] {
  const unresolved = productPublicationUnresolvedRequirements(record);
  const resultTone = receipt
    ? productPublicationResultTone(receipt)
    : ("muted" as const);

  return [
    {
      available: true,
      connectsToNext: true,
      detail:
        unresolved.length === 0
          ? "Source requirements are clear."
          : `${unresolved.length} requirement${
              unresolved.length === 1 ? "" : "s"
            } need attention.`,
      id: "checks",
      label: "Checks",
      stateLabel: activeStep === "checks" ? "Current" : "Reviewed",
      tone: unresolved.length === 0 ? "ok" : "warn",
    },
    {
      available: true,
      connectsToNext: true,
      detail: receipt
        ? "Decision recorded."
        : "Choose publication or a controlled rejection.",
      id: "decision",
      label: "Decision",
      stateLabel:
        activeStep === "decision" ? "Current" : receipt ? "Done" : "Ready",
      tone: receipt ? "ok" : activeStep === "decision" ? "warn" : "info",
    },
    {
      available: receipt !== null,
      connectsToNext: false,
      detail: receipt
        ? "Local decision receipt is available."
        : "Available after the decision is applied.",
      id: "result",
      label: "Result",
      stateLabel: receipt ? "Recorded" : "Pending",
      tone: resultTone,
    },
  ];
}

export function productPublicationUnresolvedRequirements(
  record: ProductPortfolioScenarioProjection,
) {
  return record.projection.requirements.filter(
    (requirement) => requirement.state !== "satisfied",
  );
}

export function productPublicationOnlyListingConflict(
  record: ProductPortfolioScenarioProjection,
) {
  const unresolved = productPublicationUnresolvedRequirements(record);
  return (
    unresolved.length > 0 &&
    unresolved.every((requirement) => requirement.code === "listing-scope")
  );
}

export function productPublicationOwnerRepairRequirement(
  record: ProductPortfolioScenarioProjection,
): ProductPublicationRequirement | null {
  return (
    productPublicationUnresolvedRequirements(record).find(
      (requirement) => requirement.code !== "listing-scope",
    ) ?? null
  );
}

export function productPublicationResultTone(
  receipt: ProductPublicationDecisionReceipt,
): TerasTone {
  return receipt.resultState === "published" ? "ok" : "muted";
}

export function productPublicationResultLabel(
  receipt: ProductPublicationDecisionReceipt,
) {
  return receipt.resultState === "published" ? "Published" : "Rejected";
}

export function productPublicationRequirementRows(
  record: ProductPortfolioScenarioProjection,
): ProductPublicationSessionCheckRow[] {
  return record.projection.requirements.map((requirement) => ({
    detail: productPublicationRequirementDetail(requirement),
    id: requirement.code,
    label: productPublicationRequirementLabel(requirement),
    status: productPublicationRequirementStatus(requirement),
    tone: productPublicationRequirementTone(requirement),
  }));
}

export function productPublicationDecisionRows(
  record: ProductPortfolioScenarioProjection,
  draft: ProductPublicationSessionDraft,
): ProductPublicationSessionCheckRow[] {
  const validation = productPublicationDecisionValidation(record, draft);
  const rows: ProductPublicationSessionCheckRow[] = [
    {
      detail:
        draft.decision === "publish"
          ? "Create the managed product entry."
          : "Retain the publication receipt without creating an entry.",
      id: "outcome",
      label: "Outcome",
      status: draft.decision === "publish" ? "Publish" : "Reject",
      tone: draft.decision === "publish" ? "ok" : "muted",
    },
  ];

  if (draft.decision === "publish") {
    const permitted =
      record.publicationPacket.experience.accessContract.permittedListingScopes.includes(
        draft.scope,
      );

    rows.push(
      {
        detail: `${productListingScopeLabel(draft.scope)} / ${draft.listingState}`,
        id: "listing",
        label: "Listing",
        status: permitted ? "Permitted" : "Conflict",
        tone: permitted ? "ok" : "warn",
      },
      {
        detail: validation.allowed
          ? "Publication checks and selected listing are clear."
          : (validation.findings[0] ??
            "Publication requirements remain unresolved."),
        id: "validation",
        label: "Decision Check",
        status: validation.allowed ? "Ready" : "Blocked",
        tone: validation.allowed ? "ok" : "danger",
      },
    );
  } else {
    const noteReady =
      draft.reasonCode !== "other" || draft.reasonNote.trim().length > 0;

    rows.push(
      {
        detail:
          productPublicationRejectionOptions.find(
            (option) => option.id === draft.reasonCode,
          )?.label ?? draft.reasonCode,
        id: "reason",
        label: "Reason",
        status: "Selected",
        tone: "ok",
      },
      {
        detail:
          draft.reasonCode === "other"
            ? noteReady
              ? "Required operator note recorded."
              : "Add a note for the Other reason."
            : "No additional note is required.",
        id: "note",
        label: "Note",
        status: noteReady ? "Ready" : "Needed",
        tone: noteReady ? "ok" : "warn",
      },
    );
  }

  return rows;
}

export function productPublicationResultFacts(
  receipt: ProductPublicationDecisionReceipt,
): TerasMetadataItem[] {
  const facts: TerasMetadataItem[] = [
    { label: "Result", value: productPublicationResultLabel(receipt) },
    { label: "Product ID", value: receipt.productId },
    { label: "Packet", value: receipt.packetId },
    { label: "Decision Owner", value: receipt.decision.decidedByRef },
    { label: "Recorded", value: formatPublicationTimestamp(receipt.recordedAt) },
    { label: "Receipt", value: receipt.receiptId },
  ];

  if (receipt.listing) {
    facts.push(
      {
        label: "Listing",
        value: receipt.listing.state === "listed" ? "Listed" : "Unlisted",
      },
      {
        label: "Scope",
        value: productListingScopeLabel(receipt.listing.scope),
      },
    );
  } else if (receipt.decision.outcome === "reject") {
    facts.push({
      label: "Reason",
      value:
        productPublicationRejectionOptions.find(
          (option) => option.id === receipt.decision.reasonCode,
        )?.label ?? receipt.decision.reasonCode,
    });
  }

  return facts;
}

export function productPublicationResultRows(
  receipt: ProductPublicationDecisionReceipt,
): ProductPublicationSessionCheckRow[] {
  return [
    {
      detail: receipt.summary,
      id: "decision",
      label: "Decision",
      status: productPublicationResultLabel(receipt),
      tone: productPublicationResultTone(receipt),
    },
    {
      detail: `${receipt.sourceVersions.length} source version${
        receipt.sourceVersions.length === 1 ? "" : "s"
      } retained.`,
      id: "source-snapshot",
      label: "Source Snapshot",
      status: "Recorded",
      tone: "ok",
    },
    {
      detail:
        receipt.resultingProductRef ??
        "No managed product entry was created by this decision.",
      id: "product-result",
      label: "Product Result",
      status: receipt.resultingProductRef ? "Created" : "None",
      tone: receipt.resultingProductRef ? "ok" : "muted",
    },
  ];
}

export function productPublicationSessionStatus(
  record: ProductPortfolioScenarioProjection,
  receipt: ProductPublicationDecisionReceipt | null,
) {
  if (receipt) {
    return {
      label: productPublicationResultLabel(receipt),
      tone: productPublicationResultTone(receipt),
    };
  }

  return {
    label: productPublicationStateLabel(record.projection.publicationState),
    tone:
      record.projection.publicationState === "captured"
        ? ("info" as const)
        : ("warn" as const),
  };
}

function formatPublicationTimestamp(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
