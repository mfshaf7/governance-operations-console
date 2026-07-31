import type { ProductPortfolioReadModel } from "../../read-model/types/product-portfolio-fixture-types.ts";
import type { TerasTone } from "@/teras";
import type { OperationSurfaceStatusItem } from "@/domain-workspaces/operation-projections";

export type ProductPortfolioWorkspaceSurfaceId =
  "publication" | "curation" | "products";

export type ProductPortfolioWorkspaceSurface = {
  id: ProductPortfolioWorkspaceSurfaceId;
  kicker: string;
  title: string;
  tone: TerasTone;
};

export const productPortfolioWorkspaceSurfaces: ProductPortfolioWorkspaceSurface[] =
  [
    {
      id: "products",
      kicker: "01",
      title: "Products",
      tone: "warn",
    },
    {
      id: "publication",
      kicker: "02",
      title: "Publication",
      tone: "info",
    },
    {
      id: "curation",
      kicker: "03",
      title: "Curation",
      tone: "info",
    },
  ];

export function productPortfolioWorkspaceNavMeta(
  readModel: ProductPortfolioReadModel,
  surfaceId: ProductPortfolioWorkspaceSurfaceId,
) {
  switch (surfaceId) {
    case "publication":
      return String(readModel.publicationQueue.length);
    case "curation":
      return String(
        readModel.entries.filter((entry) => entry.listing.state !== "retired")
          .length,
      );
    case "products":
      return String(readModel.summary.listed);
  }
}

export function productPortfolioWorkspaceSummaryTitle(
  surfaceId: ProductPortfolioWorkspaceSurfaceId,
) {
  switch (surfaceId) {
    case "publication":
      return "Product Publication";
    case "curation":
      return "Portfolio Curation";
    case "products":
      return "Managed Products";
  }
}

export function productPortfolioWorkspaceSummaryMetrics(
  readModel: ProductPortfolioReadModel,
  surfaceId: ProductPortfolioWorkspaceSurfaceId,
) {
  switch (surfaceId) {
    case "publication":
      return [
        {
          id: "captured",
          label: "Captured",
          tone: "info" as const,
          value: String(readModel.publicationSummary.captured),
        },
        {
          id: "needs-review",
          label: "Needs Review",
          tone: "warn" as const,
          value: String(readModel.publicationSummary.needsReview),
        },
        {
          id: "published",
          label: "Published",
          tone: "ok" as const,
          value: String(readModel.publicationSummary.published),
        },
        {
          id: "rejected",
          label: "Rejected",
          tone: "muted" as const,
          value: String(readModel.publicationSummary.rejected),
        },
      ];
    case "curation":
      return [
        {
          id: "active",
          label: "Active",
          tone: "info" as const,
          value: String(readModel.summary.listed),
        },
        {
          id: "featured",
          label: "Featured",
          tone: "warn" as const,
          value: String(
            readModel.entries.filter(
              (entry) =>
                entry.listing.state === "listed" && entry.listing.featured,
            ).length,
          ),
        },
        {
          id: "internal",
          label: "Internal",
          tone: "info" as const,
          value: String(listedScopeCount(readModel, "internal")),
        },
        {
          id: "client",
          label: "Client",
          tone: "info" as const,
          value: String(listedScopeCount(readModel, "client")),
        },
        {
          id: "public",
          label: "Public",
          tone: "info" as const,
          value: String(listedScopeCount(readModel, "public")),
        },
      ];
    case "products":
      return [
        {
          id: "managed",
          label: "Managed",
          tone: "info" as const,
          value: String(readModel.summary.managed),
        },
        {
          id: "listed",
          label: "Listed",
          tone: "info" as const,
          value: String(readModel.summary.listed),
        },
        {
          id: "live",
          label: "Live",
          tone: "ok" as const,
          value: String(
            readModel.entries.filter(
              (entry) => entry.runtime.availability === "live",
            ).length,
          ),
        },
        {
          id: "unlisted",
          label: "Unlisted",
          tone: "muted" as const,
          value: String(readModel.summary.unlisted),
        },
        {
          id: "retired",
          label: "Retired",
          tone: "muted" as const,
          value: String(readModel.summary.retired),
        },
      ];
  }
}

export function productPortfolioWorkspaceStatuses(
  readModel: ProductPortfolioReadModel,
): OperationSurfaceStatusItem[] {
  const runtimeAttention = readModel.workspaceStatus.degradedProducts > 0;
  const stale = readModel.workspaceStatus.staleProducts > 0;

  return [
    {
      detail:
        "Product data is projected from the current local authority-shaped snapshot.",
      facts: [
        { label: "Mode", value: "Local projection" },
        { label: "Products", value: String(readModel.entries.length) },
      ],
      id: "source-mode",
      label: "Source Mode",
      state: "local",
    },
    {
      detail: "Current product publications resolve to stable product entries.",
      facts: [
        {
          label: "Records",
          value: String(readModel.scenarioProjections.length),
        },
        {
          label: "Publication records",
          value: String(readModel.publicationRecords.length),
        },
      ],
      id: "projection",
      label: "Projection",
      state: "current",
    },
    {
      detail: runtimeAttention
        ? "One or more product runtime observations require owner attention."
        : "No projected runtime observation currently requires attention.",
      facts: [
        {
          label: "Degraded",
          value: String(readModel.workspaceStatus.degradedProducts),
        },
      ],
      id: "runtime-evidence",
      label: "Runtime",
      state: runtimeAttention ? "degraded" : "current",
    },
    {
      detail: stale
        ? "One or more product observations have exceeded their freshness window."
        : "Projected product observations remain within their freshness window.",
      facts: [
        {
          label: "Stale",
          value: String(readModel.workspaceStatus.staleProducts),
        },
      ],
      id: "source-freshness",
      label: "Freshness",
      state: stale ? "stale" : "current",
    },
  ];
}

function listedScopeCount(
  readModel: ProductPortfolioReadModel,
  scope: "client" | "internal" | "public",
) {
  return readModel.entries.filter(
    (entry) =>
      entry.listing.state === "listed" && entry.listing.scope === scope,
  ).length;
}
