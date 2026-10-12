import type { ProductPortfolioEntry } from "../../domain/product-portfolio-entry-types.ts";
import type { ProductSourceVersion } from "../../domain/product-portfolio-vocabulary.ts";
import type {
  ProductPublicationDecision,
  ProductPublicationListingDecision,
  ProductPublicationOperatorRejectionReasonCode,
  ProductPublicationRequirement,
  ProductPublicationProjection,
} from "./product-publication-review-types.ts";
import type { GovernedProductPublicationTarget } from "./product-publication-audience-model.ts";

export type ProductPublicationDecisionDraft =
  | {
      listing: ProductPublicationListingDecision;
      outcome: "publish";
    }
  | {
      outcome: "reject";
      reasonCode: ProductPublicationOperatorRejectionReasonCode;
      reasonNote: string;
    };

export type ProductPublicationDecisionValidation = {
  allowed: boolean;
  findings: string[];
};

export type ProductPublicationDecisionReceipt = {
  authorityEvidence?: {
    authorityRevision: string;
    ownerManifest: {
      manifestDigest: string;
      manifestRevision: string;
      path: string;
      repo: string;
      sourceRevision: string;
    };
    ownerReceiptRef: string;
    publicationVersion: number | null;
    readinessReceiptRef: string;
    receiptDigest: string;
    requestDigest: string;
    requestId: string;
    resolution: "created" | "read" | "replayed";
    targetPublication: GovernedProductPublicationTarget;
  };
  commandName: "portfolio.publication.apply";
  decision: ProductPublicationDecision;
  idempotencyKey: string;
  listing: ProductPortfolioEntry["listing"] | null;
  packetId: string;
  productId: string;
  publicationReceiptRef: string;
  receiptId: string;
  recordedAt: string;
  requirementSnapshot: ProductPublicationRequirement[];
  resultState: "published" | "rejected";
  resultingProductRef: string | null;
  schemaVersion: 1;
  sourceVersions: ProductSourceVersion[];
  summary: string;
};

export type ProductPublicationAuthorityEvidence = NonNullable<
  ProductPublicationDecisionReceipt["authorityEvidence"]
>;

export type ProductPublicationDecisionApplyResult = {
  projection: ProductPublicationProjection;
  receipt: ProductPublicationDecisionReceipt;
};
