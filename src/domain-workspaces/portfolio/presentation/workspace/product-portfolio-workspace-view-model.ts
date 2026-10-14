import type { ProductPortfolioReadModel } from "../../read-model/types/product-portfolio-fixture-types.ts";
import type { TerasTone } from "@/teras";
import type { OperationSurfaceStatusItem } from "@/domain-workspaces/operation-projections";
import type { WorkspaceContinuityProjection } from "../../../../workspace-continuity/workspace-continuity-types.ts";
import { productContinuitySummary } from "../surfaces/products/product-continuity-view-model.ts";

export type ProductContinuityWorkspaceProjection = Readonly<{
  fixtureMode: boolean;
  mode: "disconnected-preview" | "live" | "loading" | "unavailable";
  projection: WorkspaceContinuityProjection | null;
}>;

const disconnectedFixtureContinuity: ProductContinuityWorkspaceProjection = {
  fixtureMode: true,
  mode: "disconnected-preview",
  projection: null,
};

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
  continuity: ProductContinuityWorkspaceProjection = disconnectedFixtureContinuity,
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
      return String(
        continuity.fixtureMode
          ? readModel.summary.listed
          : continuity.projection?.products.length ?? 0,
      );
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
  continuity: ProductContinuityWorkspaceProjection = disconnectedFixtureContinuity,
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
      if (!continuity.fixtureMode) {
        const summary = productContinuitySummary(
          continuity.projection?.products ?? [],
        );
        return [
          { id: "managed", label: "Managed", tone: "info" as const, value: String(summary.managed) },
          { id: "active", label: "Active", tone: "ok" as const, value: String(summary.active) },
          { id: "suspended", label: "Suspended", tone: "warn" as const, value: String(summary.suspended) },
          { id: "retired", label: "Retired", tone: "muted" as const, value: String(summary.retired) },
          { id: "readiness-attention", label: "Readiness attention", tone: "warn" as const, value: String(summary.readinessAttention) },
        ];
      }
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
  continuity: ProductContinuityWorkspaceProjection = disconnectedFixtureContinuity,
  surfaceId: ProductPortfolioWorkspaceSurfaceId = "products",
): OperationSurfaceStatusItem[] {
  if (surfaceId === "products" && !continuity.fixtureMode) {
    const projection = continuity.projection;
    const readinessAttention = productContinuitySummary(
      projection?.products ?? [],
    ).readinessAttention;
    return [
      {
        detail: projection
          ? "Canonical Workspace Governance product state projected read-only through WGCF."
          : continuity.mode === "loading"
            ? "Canonical product continuity is loading."
            : "Canonical product continuity is unavailable; fixtures are not used as fallback.",
        facts: [
          { label: "Mode", value: projection ? "Live authority" : continuity.mode },
          { label: "Products", value: String(projection?.products.length ?? 0) },
        ],
        id: "source-mode",
        label: "Source Mode",
        state: projection ? "current" : continuity.mode === "loading" ? "syncing" : "offline",
      },
      {
        detail: "Registry and Portfolio lifecycle identity is bound to one continuity projection.",
        facts: [
          { label: "Authority", value: projection?.authority.owner_repo ?? "Unavailable" },
          { label: "Revision", value: projection ? shortRevision(projection.authority.revision) : "Unavailable" },
        ],
        id: "projection",
        label: "Continuity",
        state: projection ? "current" : "offline",
      },
      {
        detail: readinessAttention
          ? "One or more products have stale or unavailable non-terminal publication readiness."
          : "Projected publication readiness is current for every managed product.",
        facts: [{ label: "Attention", value: String(readinessAttention) }],
        id: "readiness",
        label: "Readiness",
        state: readinessAttention ? "stale" : projection ? "current" : "offline",
      },
    ];
  }
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

function shortRevision(value: string) {
  return value.slice(0, 12);
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
