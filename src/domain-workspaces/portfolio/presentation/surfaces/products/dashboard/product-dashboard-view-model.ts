import type { TerasMetadataItem, TerasTone } from "@/teras";
import type { ProductPortfolioEntry } from "@/domain-workspaces/portfolio/domain/product-portfolio-entry-types";
import type {
  ProductExperienceKind,
  ProductFreshness,
  ProductSecurityPosture,
} from "@/domain-workspaces/portfolio/domain/product-portfolio-vocabulary";
import type { ProductPortfolioHistoryEvent } from "@/domain-workspaces/portfolio/read-model/types/product-portfolio-history-types";
import {
  productAvailabilityLabel,
  productAvailabilityTone,
  productFormLabel,
  productListingLabel,
  productListingScopeLabel,
  productListingTone,
  productMaturityLabel,
  productMaturityTone,
  productPortfolioSegmentLabel,
} from "../products-view-model.ts";

export type ProductDashboardTabId = "history" | "operations" | "overview";

export const productDashboardTabs = [
  { label: "Overview", value: "overview" },
  { label: "Operations", value: "operations" },
  { label: "History", value: "history" },
] satisfies Array<{ label: string; value: ProductDashboardTabId }>;

export function productDashboardSummaryCards(entry: ProductPortfolioEntry) {
  return [
    {
      label: "Maturity",
      tone: productMaturityTone(entry.maturity.level),
      value: productMaturityLabel(entry.maturity.level),
    },
    {
      label: "Availability",
      tone: productAvailabilityTone(entry.runtime.availability),
      value: productAvailabilityLabel(entry.runtime.availability),
    },
    {
      label: "Release",
      tone: entry.release ? ("ok" as const) : ("muted" as const),
      value: entry.release?.version ?? "No release",
    },
    {
      label: "Listing",
      tone: productListingTone(entry),
      value: productListingLabel(entry),
    },
    {
      label: "Freshness",
      tone: productFreshnessTone(entry.provenance.freshness),
      value: productFreshnessLabel(entry.provenance.freshness),
    },
  ];
}

export function productDashboardIdentityFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    { label: "Product ID", value: entry.identity.productId },
    { label: "Form", value: productFormLabel(entry) },
    {
      label: "Segment",
      value: productPortfolioSegmentLabel(
        entry.classification.portfolioSegment,
      ),
    },
    { label: "Owner", value: entry.ownership.productOwnerRef },
  ];
}

export function productDashboardProfileFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  const facts: TerasMetadataItem[] = [
    { label: "Purpose", value: entry.identity.purpose },
    {
      label: "Product Form",
      value: productFormLabel(entry),
    },
    {
      label: "Portfolio Segment",
      value: productPortfolioSegmentLabel(
        entry.classification.portfolioSegment,
      ),
    },
    {
      label: "Tags",
      value:
        entry.classification.tags.length > 0
          ? entry.classification.tags.join(", ")
          : "No tags",
    },
  ];

  if (entry.classification.clientRef) {
    facts.push({
      label: "Client Ref",
      value: entry.classification.clientRef,
    });
  }

  return facts;
}

export function productDashboardOwnershipFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    { label: "Product Owner", value: entry.ownership.productOwnerRef },
    { label: "Runtime Owner", value: entry.ownership.runtimeOwnerRef },
    { label: "Platform Owner", value: entry.ownership.platformOwnerRef },
    { label: "Security Owner", value: entry.ownership.securityOwnerRef },
    {
      label: "Source Owners",
      value: entry.ownership.sourceOwnerRefs.join(", "),
    },
  ];
}

export function productDashboardSourceFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  const repositoryFacts = entry.source.repositories.map(
    (repository, index) => ({
      detail: repository.ref,
      label: `Repository ${index + 1}`,
      value: repository.ownerRef,
    }),
  );
  const documentationFacts = entry.source.documentationTargets.map(
    (target, index) => ({
      detail: target.sourceRef,
      label: `Documentation ${index + 1}`,
      value: target.label,
    }),
  );

  return [
    {
      label: "Registry",
      value: entry.identity.registryRef,
    },
    {
      label: "Manifest",
      value: entry.source.manifestRef,
    },
    ...repositoryFacts,
    ...documentationFacts,
  ];
}

export function productDashboardRuntimeFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    {
      label: "Availability",
      tone: productAvailabilityTone(entry.runtime.availability),
      value: productAvailabilityLabel(entry.runtime.availability),
    },
    {
      label: "Observed",
      value: formatProductTimestamp(entry.runtime.observedAt),
    },
    {
      label: "Environments",
      value:
        entry.runtime.environments.length > 0
          ? entry.runtime.environments.join(", ")
          : "No runtime environment",
    },
    {
      label: "Evidence",
      value: `${entry.runtime.evidenceRefs.length} reference${
        entry.runtime.evidenceRefs.length === 1 ? "" : "s"
      }`,
    },
  ];
}

export function productDashboardMaturityFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    {
      label: "Product Lifecycle",
      value: productMaturityLabel(entry.maturity.productLifecycle),
    },
    {
      label: "Maturity",
      tone: productMaturityTone(entry.maturity.level),
      value: productMaturityLabel(entry.maturity.level),
    },
    {
      label: "Highest Endpoint",
      value: entry.maturity.highestRealEndpoint,
    },
    {
      label: "Stage Support",
      value: entry.maturity.stageSupported ? "Supported" : "Not recorded",
    },
    {
      label: "Prod Promotion",
      value: entry.maturity.governedProdPromotion ? "Governed" : "Not recorded",
    },
  ];
}

export function productDashboardReleaseFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  if (!entry.release) {
    return [
      { label: "Release", value: "No release recorded", tone: "muted" },
      { label: "Evidence", value: "No release evidence", tone: "muted" },
    ];
  }

  return [
    { label: "Version", value: entry.release.version },
    {
      label: "Released",
      value: formatProductTimestamp(entry.release.releasedAt),
    },
    { label: "Release Ref", value: entry.release.ref },
    {
      label: "Evidence",
      value: `${entry.release.evidenceRefs.length} reference${
        entry.release.evidenceRefs.length === 1 ? "" : "s"
      }`,
    },
  ];
}

export function productDashboardSecurityFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return [
    {
      label: "Posture",
      tone: productSecurityTone(entry.security.posture),
      value: productSecurityLabel(entry.security.posture),
    },
    {
      label: "Access Class",
      value: titleCase(entry.experience.accessClass),
    },
    {
      label: "Permitted Listings",
      value: entry.security.permittedListingScopes
        .map(productListingScopeLabel)
        .join(", "),
    },
    {
      label: "Access Contract",
      value: entry.security.accessContractRef,
    },
    {
      label: "Reviews",
      value: String(entry.security.reviewRefs.length),
    },
  ];
}

export function productDashboardSourceVersionFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  return entry.provenance.sourceVersions.map((source) => ({
    detail: source.ref,
    label: titleCase(source.authority),
    value: source.version,
  }));
}

export function productDashboardRetainedReferences(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  const references: TerasMetadataItem[] = [
    {
      label: "Publication Receipt",
      value: entry.provenance.publicationReceiptRef,
    },
  ];

  if (entry.delivery.latestOutcomeRef) {
    references.push({
      label: "Latest Delivery Outcome",
      value: entry.delivery.latestOutcomeRef,
    });
  }

  references.push(
    ...entry.delivery.historyRefs.map((ref, index) => ({
      label: `Delivery History ${index + 1}`,
      value: ref,
    })),
    ...entry.runtime.evidenceRefs.map((ref, index) => ({
      label: `Runtime Evidence ${index + 1}`,
      value: ref,
    })),
    ...entry.security.reviewRefs.map((ref, index) => ({
      label: `Security Review ${index + 1}`,
      value: ref,
    })),
    ...(entry.release?.evidenceRefs ?? []).map((ref, index) => ({
      label: `Release Evidence ${index + 1}`,
      value: ref,
    })),
  );

  return references;
}

export function productDashboardHistoryRows(
  events: ProductPortfolioHistoryEvent[],
) {
  return events.map((event) => ({
    detail: event.summary,
    label: productDashboardHistoryEventLabel(event),
    status: titleCase(event.state),
    timestamp: event.occurredAt,
    tone: productDashboardHistoryEventTone(event),
  }));
}

export function productDashboardPrimaryTargetFacts(
  entry: ProductPortfolioEntry,
): TerasMetadataItem[] {
  const target = entry.experience.primaryTarget;

  return [
    { label: "Target", value: target.label },
    { label: "Kind", value: productExperienceKindLabel(target.kind) },
    { label: "Access", value: titleCase(target.accessClass) },
    {
      label: "Verification",
      tone: target.verified ? "ok" : "warn",
      value: target.verified ? "Verified" : "Unverified",
    },
  ];
}

export function productDashboardAccessTone(
  entry: ProductPortfolioEntry,
): TerasTone {
  const target = entry.experience.primaryTarget;

  if (!target.verified) return "warn";
  if (target.href === null) return "muted";
  return target.accessClass === "public" ? "ok" : "info";
}

export function productDashboardAccessLabel(entry: ProductPortfolioEntry) {
  const target = entry.experience.primaryTarget;

  if (!target.verified) return "Unverified";
  if (target.href === null) return "No direct target";
  return "Verified target";
}

export function productDashboardCanOpenTarget(entry: ProductPortfolioEntry) {
  const target = entry.experience.primaryTarget;
  return target.verified && target.href !== null;
}

export function productFreshnessLabel(freshness: ProductFreshness) {
  switch (freshness) {
    case "fresh":
      return "Fresh";
    case "stale":
      return "Stale";
    case "unknown":
      return "Unknown";
  }
}

export function productFreshnessTone(freshness: ProductFreshness): TerasTone {
  switch (freshness) {
    case "fresh":
      return "ok";
    case "stale":
      return "stale";
    case "unknown":
      return "muted";
  }
}

export function productExperienceKindLabel(kind: ProductExperienceKind) {
  return titleCase(kind);
}

export function formatProductTimestamp(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function productSecurityLabel(posture: ProductSecurityPosture) {
  switch (posture) {
    case "accepted":
      return "Accepted";
    case "not-applicable":
      return "Not applicable";
    case "review-required":
      return "Review required";
  }
}

function productSecurityTone(posture: ProductSecurityPosture): TerasTone {
  switch (posture) {
    case "accepted":
      return "ok";
    case "not-applicable":
      return "muted";
    case "review-required":
      return "warn";
  }
}

function productDashboardHistoryEventLabel(
  event: ProductPortfolioHistoryEvent,
) {
  switch (event.kind) {
    case "publication-capture":
      return "Publication source captured";
    case "publication-decision":
      return event.state === "published"
        ? "Product published"
        : "Publication rejected";
    case "listing-update":
      return "Portfolio listing updated";
    case "product-publication":
      return "Product publication";
    case "release":
      return "Product release";
    case "runtime-observation":
      return "Runtime observation";
  }
}

function productDashboardHistoryEventTone(
  event: ProductPortfolioHistoryEvent,
): TerasTone {
  switch (event.kind) {
    case "publication-capture":
      return "info";
    case "publication-decision":
      return event.state === "published" ? "ok" : "muted";
    case "listing-update":
      return event.state === "listed" ? "ok" : "muted";
    case "product-publication":
      if (event.state === "create") return "ok";
      if (event.state === "retire") return "muted";
      return "info";
    case "release":
      return "ok";
    case "runtime-observation":
      switch (event.state) {
        case "live":
          return "ok";
        case "degraded":
          return "warn";
        case "offline":
          return "danger";
        case "unknown":
        case "not-applicable":
        default:
          return "muted";
      }
  }
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
