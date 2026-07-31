import type {
  PortfolioSegment,
  ProductAccessClass,
  ProductAvailability,
  ProductExperienceTarget,
  ProductForm,
  ProductFreshness,
  ProductListingScope,
  ProductListingState,
  ProductRegistryLifecycle,
  ProductSecurityPosture,
  ProductSourceVersion,
  ProductTag,
} from "./product-portfolio-vocabulary.ts";

export type ProductPortfolioEntry = {
  classification: {
    clientRef: string | null;
    portfolioSegment: PortfolioSegment;
    productForm: ProductForm;
    tags: ProductTag[];
  };
  delivery: {
    historyRefs: string[];
    latestOutcomeRef: string | null;
  };
  experience: {
    accessClass: ProductAccessClass;
    primaryTarget: ProductExperienceTarget;
    secondaryTargets: ProductExperienceTarget[];
  };
  identity: {
    artworkRef: string | null;
    displayName: string;
    productId: string;
    purpose: string;
    registryRef: string;
    summary: string;
  };
  listing: {
    featured: boolean;
    scope: ProductListingScope;
    sortOrder: number;
    state: ProductListingState;
  };
  maturity: {
    governedProdPromotion: boolean;
    highestRealEndpoint: string;
    level: ProductRegistryLifecycle;
    productLifecycle: ProductRegistryLifecycle;
    stageSupported: boolean;
  };
  ownership: {
    platformOwnerRef: string;
    productOwnerRef: string;
    runtimeOwnerRef: string;
    securityOwnerRef: string;
    sourceOwnerRefs: string[];
  };
  provenance: {
    freshness: ProductFreshness;
    publicationReceiptRef: string;
    refreshedAt: string;
    sourceVersions: ProductSourceVersion[];
  };
  release: {
    evidenceRefs: string[];
    ref: string;
    releasedAt: string;
    version: string;
  } | null;
  runtime: {
    availability: ProductAvailability;
    environments: string[];
    evidenceRefs: string[];
    observedAt: string | null;
  };
  security: {
    accessContractRef: string;
    permittedListingScopes: ProductListingScope[];
    posture: ProductSecurityPosture;
    reviewRefs: string[];
  };
  source: {
    documentationTargets: ProductExperienceTarget[];
    manifestRef: string;
    repositories: Array<{
      ownerRef: string;
      ref: string;
    }>;
  };
};

export type ProductPortfolioSummary = {
  listed: number;
  managed: number;
  retired: number;
  unlisted: number;
};

export type ProductPortfolioPublicationSummary = {
  published: number;
  captured: number;
  needsReview: number;
  rejected: number;
};

export type ProductPortfolioWorkspaceStatus = {
  publicationQueue: number;
  degradedProducts: number;
  staleProducts: number;
  state: "attention" | "healthy";
};
