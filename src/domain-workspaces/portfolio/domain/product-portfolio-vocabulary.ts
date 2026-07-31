export type ProductRegistryLifecycle = "fully-governed" | "platform-integrated";

export type PortfolioSegment = "client" | "personal" | "workspace";

export type ProductForm =
  | "application"
  | "cli"
  | "documentation"
  | "integration"
  | "library"
  | "operator-tool"
  | "package"
  | "service";

export type ProductTag =
  | "collaboration"
  | "delivery"
  | "developer-tool"
  | "documentation"
  | "governance"
  | "integration"
  | "operations";

export type ProductListingScope = "client" | "internal" | "public";

export type ProductAccessClass = "private" | "public" | "restricted";

export type ProductListingState = "listed" | "retired" | "unlisted";

export type ProductAvailability =
  "degraded" | "live" | "not-applicable" | "offline" | "unknown";

export type ProductFreshness = "fresh" | "stale" | "unknown";

export type ProductSecurityPosture =
  "accepted" | "not-applicable" | "review-required";

export type ProductExperienceKind =
  | "api"
  | "cli"
  | "documentation"
  | "download"
  | "operator-interface"
  | "package"
  | "service"
  | "web-application";

export type ProductPublicationAuthority =
  | "platform-engineering"
  | "product-owner"
  | "security-architecture"
  | "wgcf"
  | "workspace-delivery-art"
  | "workspace-governance";

export type ProductSourceVersion = {
  authority: ProductPublicationAuthority;
  ref: string;
  version: string;
};

export type ProductExperienceTarget = {
  accessClass: ProductAccessClass;
  href: string | null;
  kind: ProductExperienceKind;
  label: string;
  sourceRef: string;
  verified: boolean;
};

export type ProductRuntimeObservation = {
  availability: ProductAvailability;
  environment: string;
  evidenceRef: string;
  expiresAt: string | null;
  observedAt: string;
  sourceOwnerRef: string;
};

export type ProductAccessContract = {
  accessClass: ProductAccessClass;
  permittedListingScopes: ProductListingScope[];
  sourceRef: string;
  sourceVersion: string;
  verifiedAt: string;
};
