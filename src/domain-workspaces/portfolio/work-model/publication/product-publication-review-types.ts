import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type {
  ProductListingScope,
  ProductListingState,
  ProductSourceVersion,
} from "../../domain/product-portfolio-vocabulary.ts";

export type ProductPublicationState =
  "published" | "captured" | "needs-review" | "rejected";

export type ProductPublicationListingDecision = {
  featured: boolean;
  scope: ProductListingScope;
  state: Exclude<ProductListingState, "retired">;
};

export type ProductPublicationRejectionReasonCode =
  | "duplicate-product"
  | "not-eligible-product"
  | "other"
  | "source-withdrawn"
  | "superseded-publication";

export type ProductPublicationOperatorRejectionReasonCode = Exclude<
  ProductPublicationRejectionReasonCode,
  "duplicate-product"
>;

export type ProductPublicationRequirementCode =
  | "access-contract"
  | "classification"
  | "delivery-or-graduation-evidence"
  | "existing-product"
  | "experience-target"
  | "listing-scope"
  | "manifest"
  | "ownership"
  | "release-evidence"
  | "security-review"
  | "source-custody"
  | "active-product-inventory";

export type ProductPublicationRequirement = {
  code: ProductPublicationRequirementCode;
  evidenceRefs: string[];
  ownerRef: string;
  routeRef: string;
  state: "conflict" | "missing" | "satisfied";
};

export type ProductPortfolioCommand =
  | "publish-product"
  | "open-owner-route"
  | "open-primary-target"
  | "open-product"
  | "reject-publication"
  | "review-publication"
  | "review-listing"
  | "set-listing"
  | "view-history";

export type ProductPortfolioRequiredAction =
  | { kind: "none" }
  | {
      kind:
        | "open-existing-product"
        | "repair-publication"
        | "repair-runtime-evidence"
        | "review-publication"
        | "review-listing";
      ownerRef: string;
      requirementCodes: ProductPublicationRequirementCode[];
      routeRef: string;
    };

export type ProductEntryProjection =
  "create" | "none" | "replay" | "retain" | "retire" | "update";

export type ProductPublicationReceipt = {
  idempotencyKey: string;
  packetId: string;
  productId: string;
  reasonCode: ProductPublicationRejectionReasonCode | null;
  receiptRef: string;
  recordedAt: string;
  result:
    | "captured"
    | "created"
    | "needs-review"
    | "rejected"
    | "replayed"
    | "retired"
    | "updated";
  sourceVersions: ProductSourceVersion[];
};

type ProductPublicationDecisionBase = {
  decidedAt: string;
  decidedByRef: string;
  receiptRef: string;
};

export type ProductPublicationDecision =
  | (ProductPublicationDecisionBase & {
      listing: ProductPublicationListingDecision | null;
      outcome: "publish";
      reasonCode: null;
      reasonNote: null;
    })
  | (ProductPublicationDecisionBase & {
      listing: null;
      outcome: "reject";
      reasonCode: ProductPublicationOperatorRejectionReasonCode;
      reasonNote: string | null;
    });

export type ProductPortfolioProjectionContext = {
  publicationDecision: ProductPublicationDecision | null;
  appliedPublications: ProductPublicationReceipt[];
  evaluatedAt: string;
  existingEntry: ProductPortfolioEntry | null;
};

export type ProductPublicationProjection = {
  publicationState: ProductPublicationState;
  allowedCommands: ProductPortfolioCommand[];
  entry: ProductPortfolioEntry | null;
  entryProjection: ProductEntryProjection;
  forbiddenCommands: ProductPortfolioCommand[];
  receipt: ProductPublicationReceipt;
  requiredAction: ProductPortfolioRequiredAction;
  requirements: ProductPublicationRequirement[];
};
