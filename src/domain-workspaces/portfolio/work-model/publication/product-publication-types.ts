import type {
  PortfolioSegment,
  ProductAccessContract,
  ProductExperienceTarget,
  ProductForm,
  ProductListingScope,
  ProductListingState,
  ProductRegistryLifecycle,
  ProductRuntimeObservation,
  ProductSecurityPosture,
  ProductSourceVersion,
  ProductTag,
} from "../../domain/product-portfolio-vocabulary.ts";

export type ProductPublicationKind =
  "new-product" | "product-retirement" | "product-update" | "release-update";

export type ProductPublicationPacket = {
  causationId: string;
  classification: {
    clientRef: string | null;
    portfolioSegment: PortfolioSegment;
    productForm: ProductForm;
    tags: ProductTag[];
  };
  correlationId: string;
  delivery: {
    graduationRefs: string[];
    historyRefs: string[];
    latestOutcomeRef: string | null;
  };
  experience: {
    accessContract: ProductAccessContract;
    primaryTarget: ProductExperienceTarget | null;
    secondaryTargets: ProductExperienceTarget[];
  };
  idempotencyKey: string;
  listing: {
    featured: boolean;
    requestedScope: ProductListingScope;
    requestedState: ProductListingState;
    sortOrder: number;
  };
  manifest: {
    artworkRef: string | null;
    digest: string;
    displayName: string;
    purpose: string;
    ref: string;
    summary: string;
  };
  maturity: {
    governedProdPromotion: boolean;
    highestRealEndpoint: string;
    level: ProductRegistryLifecycle;
    stageSupported: boolean;
  };
  owners: {
    platformOwnerRef: string;
    productOwnerRef: string;
    runtimeOwnerRef: string;
    securityOwnerRef: string;
    sourceOwnerRefs: string[];
  };
  packetId: string;
  product: {
    productId: string;
    registryRef: string;
    registryVersion: string;
    lifecycle: ProductRegistryLifecycle;
  };
  publicationKind: ProductPublicationKind;
  release: {
    evidenceRefs: string[];
    ref: string;
    releasedAt: string;
    version: string;
  } | null;
  runtimeObservations: ProductRuntimeObservation[];
  schemaVersion: "1";
  security: {
    evidenceRefs: string[];
    ownerRef: string;
    posture: ProductSecurityPosture;
    reviewRefs: string[];
  };
  source: {
    documentationTargets: ProductExperienceTarget[];
    repositories: Array<{
      ownerRef: string;
      ref: string;
    }>;
  };
  sourceVersions: ProductSourceVersion[];
  supersedesPublicationRef: string | null;
};
