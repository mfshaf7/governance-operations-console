import type { ConsoleSurfaceEntryIntent } from "../../../../console-architecture.ts";
import { parseExternalConsoleRoute } from "../../../../console-integration/external-route.ts";
import type { ProductPortfolioReadModel } from "../../read-model/types/product-portfolio-fixture-types.ts";

export type ProductPortfolioRouteResolution =
  | {
      kind: "publication";
      productId: string;
    }
  | {
      kind: "curation";
      productId: string;
    }
  | {
      kind: "external";
      href: string;
    }
  | {
      kind: "product-dashboard";
      productId: string;
    }
  | {
      kind: "unavailable";
      reason: string;
    };

export function resolveProductPortfolioEntryIntent(
  intent: ConsoleSurfaceEntryIntent,
  readModel: ProductPortfolioReadModel,
): ProductPortfolioRouteResolution | null {
  switch (intent.requiredMoveRef) {
    case "portfolio.open-existing-product":
    case "portfolio.repair-runtime-evidence":
      return productDashboardRoute(intent.subjectRef, readModel);
    case "portfolio.review-listing":
      return productCurationRoute(intent.subjectRef, readModel);
    case "portfolio.repair-publication":
    case "portfolio.review-publication":
      return productPublicationRouteByProduct(intent.subjectRef, readModel);
    default:
      return null;
  }
}

export function resolveProductPortfolioRoute(
  routeRef: string,
  readModel: ProductPortfolioReadModel,
): ProductPortfolioRouteResolution {
  if (routeRef.startsWith("portfolio://products/")) {
    return productDashboardRoute(
      routeRef.slice("portfolio://products/".length),
      readModel,
    );
  }

  if (routeRef.startsWith("portfolio://listing/")) {
    return productCurationRoute(
      routeRef.slice("portfolio://listing/".length),
      readModel,
    );
  }

  if (routeRef.startsWith("portfolio://publication/")) {
    const packetId = routeRef.slice("portfolio://publication/".length);
    const record = readModel.publicationRecords.find(
      (candidate) => candidate.publicationPacket.packetId === packetId,
    );

    return record
      ? {
          kind: "publication",
          productId: record.publicationPacket.product.productId,
        }
      : unavailableRoute("The referenced publication record is unavailable.");
  }

  const externalRoute = parseExternalConsoleRoute(routeRef);
  if (externalRoute) {
    return { href: externalRoute.href, kind: "external" };
  }

  if (routeRef.startsWith("owner://")) {
    return unavailableRoute(
      "This owner does not yet expose a console or external route.",
    );
  }

  return unavailableRoute("The referenced route is not supported.");
}

function productPublicationRouteByProduct(
  productId: string,
  readModel: ProductPortfolioReadModel,
): ProductPortfolioRouteResolution {
  const record = readModel.publicationRecords.find(
    (candidate) => candidate.publicationPacket.product.productId === productId,
  );

  return record
    ? { kind: "publication", productId }
    : unavailableRoute("The referenced publication record is unavailable.");
}

function productCurationRoute(
  productId: string,
  readModel: ProductPortfolioReadModel,
): ProductPortfolioRouteResolution {
  const entry = readModel.entries.find(
    (candidate) => candidate.identity.productId === productId,
  );

  if (!entry) {
    return unavailableRoute("The referenced product is unavailable.");
  }
  if (entry.listing.state === "retired") {
    return unavailableRoute("Retired product listings are read-only.");
  }

  return { kind: "curation", productId };
}

function productDashboardRoute(
  productId: string,
  readModel: ProductPortfolioReadModel,
): ProductPortfolioRouteResolution {
  return readModel.entries.some(
    (candidate) => candidate.identity.productId === productId,
  )
    ? { kind: "product-dashboard", productId }
    : unavailableRoute("The referenced product is unavailable.");
}

function unavailableRoute(reason: string): ProductPortfolioRouteResolution {
  return { kind: "unavailable", reason };
}
