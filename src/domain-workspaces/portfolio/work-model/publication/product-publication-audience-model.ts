import type {
  ProductListingScope,
  ProductListingState,
} from "../../domain/product-portfolio-vocabulary.ts";

export type GovernedProductPublicationPosture =
  | "archived"
  | "client"
  | "internal"
  | "public"
  | "unlisted";

export type GovernedProductPublicationAction =
  | "archive"
  | "publish"
  | "unpublish"
  | "update";

export type GovernedProductPublicationTarget = Readonly<{
  access_class:
    | "client-authorized"
    | "historical-read-only"
    | "public-anonymous"
    | "workspace-authenticated"
    | null;
  audience:
    | "authorized-clients"
    | "historical"
    | "public"
    | "workspace-operators"
    | null;
  listing_scope:
    | "client-portfolio"
    | "historical-archive"
    | "public-catalog"
    | "workspace-portfolio"
    | null;
  posture: GovernedProductPublicationPosture;
}>;

export function governedProductPublicationTarget({
  scope,
  state,
}: {
  scope: ProductListingScope;
  state: Exclude<ProductListingState, "retired">;
}): GovernedProductPublicationTarget {
  if (state === "unlisted") {
    return {
      access_class: null,
      audience: null,
      listing_scope: null,
      posture: "unlisted",
    };
  }
  if (scope === "client") {
    return {
      access_class: "client-authorized",
      audience: "authorized-clients",
      listing_scope: "client-portfolio",
      posture: "client",
    };
  }
  if (scope === "public") {
    return {
      access_class: "public-anonymous",
      audience: "public",
      listing_scope: "public-catalog",
      posture: "public",
    };
  }
  return {
    access_class: "workspace-authenticated",
    audience: "workspace-operators",
    listing_scope: "workspace-portfolio",
    posture: "internal",
  };
}
