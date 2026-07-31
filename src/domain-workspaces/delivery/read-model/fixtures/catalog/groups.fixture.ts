import type { DeliveryCatalogGroup } from "../../../domain/delivery-types.ts";

export const deliveryCatalogGroupFixtures: DeliveryCatalogGroup[] = [
  {
    group_id: "planning",
    title: "Planning",
    description:
      "Target PI requests, iteration values, PI date facets, and roadmap/version projections used by Intake, Refinement, and board grouping.",
    expected_route: "GET /v1/delivery-catalog/planning",
    route_status: "missing",
    source_authority:
      "OOS catalog projection with OpenProject form/schema and platform PI version sync.",
    item_ids: [
      "catalog-target-pi",
      "catalog-pi-planning-date",
      "catalog-iteration",
    ],
  },
  {
    group_id: "classification",
    title: "Classification",
    description:
      "Initiative Family, architecture family wording, lineage role, and upstream reference rules.",
    expected_route: "GET /v1/delivery-catalog/classification",
    route_status: "missing",
    source_authority:
      "OOS delivery-domain taxonomy, with future workspace-governance promotion where policy-owned.",
    item_ids: ["catalog-initiative-family", "catalog-lineage-role"],
  },
  {
    group_id: "organization",
    title: "Organization",
    description:
      "Delivery Team, owner repo, and assignable principal values projected from backend authority.",
    expected_route: "GET /v1/delivery-catalog/organization",
    route_status: "partial",
    source_authority:
      "OOS projection over workspace-governance repo truth and OpenProject assignability.",
    item_ids: [
      "catalog-delivery-team",
      "catalog-owner-repo",
      "catalog-principal-lookup",
    ],
  },
  {
    group_id: "metadata",
    title: "Metadata",
    description:
      "Controlled refinement metadata, blocker disposition, and planning/objective values.",
    expected_route: "GET /v1/delivery-catalog/metadata",
    route_status: "planned",
    source_authority:
      "OOS workflow taxonomy plus WGCF readiness and receipt contracts.",
    item_ids: ["catalog-pi-objective-type", "catalog-blocker-disposition"],
  },
  {
    group_id: "board",
    title: "Board And Actions",
    description:
      "Execution Board grouping, posture order, stale handling, and action eligibility matrix.",
    expected_route: "GET /v1/delivery-catalog/board",
    route_status: "planned",
    source_authority:
      "OOS board projection and package-scoped action-intent contracts.",
    item_ids: ["catalog-family-map-groups", "catalog-action-matrix"],
  },
  {
    group_id: "evidence",
    title: "Evidence And Receipts",
    description:
      "Receipt categories, evidence kinds, audit event categories, and readiness proof references.",
    expected_route: "GET /v1/delivery-catalog/evidence",
    route_status: "planned",
    source_authority:
      "OOS audit contract with WGCF readiness and receipt catalog inputs.",
    item_ids: ["catalog-evidence-kind", "catalog-receipt-category"],
  },
];
