import { readWorkspaceRegistry } from "../../src/workspace-registry/server/workspace-registry-oos-client.ts";
import { workspaceRegistryFixture } from "../../src/workspace-registry/fixtures/workspace-registry.fixture.ts";
import { canonicalSourceResponse } from "./console-source-projection.mjs";
import { config, at, digest, bind, page } from "./instance-inventory-fixture.mjs";

export async function repositoryCatalogRegistrySnapshot({ query = "", posture = "active", more = false } = {}) {
  const current = { record: { posture, record: { lineage: { intake_entry_version: 1, source: "repository-custody", source_digest: digest("custody"), source_ref: "oos://synthetic/custody" },
    last_mutation: { id: "synthetic-promotion", action: "promote", applied_at: at, request_ref: "oos://synthetic/promotion", readiness_ref: "wgcf://synthetic/readiness" } } },
    receipt: { version: 2, record_digest: digest("active") } };
  const native = page("inventory", current);
  native.selection.query = query;
  if (more) { native.next_after = native.records.at(-1).id; native.counts.inventory.active += 1; }
  return readWorkspaceRegistry({ config, selection: { scope: "inventory", query }, now: () => new Date(at), fetchImpl: async url => {
    if (new URL(url).pathname.endsWith("/registry")) return canonicalSourceResponse(workspaceRegistryFixture, { recordRef: "repo://workspace-governance/contracts/inventory", sourceOwner: "workspace-governance", sourceRevision: workspaceRegistryFixture.authority_revision });
    const { projection_digest: _digest, ...content } = native;
    return canonicalSourceResponse(bind(content, "projection_digest"), { recordRef: `oos://workspace-inventory/instance-records?${new URL(url).searchParams}`, sourceOwner: "operator-orchestration-service" });
  } });
}

export function repositoryCatalogProjection() {
  return {
    groups: [{
      description: "Repository ownership metadata.",
      expected_route: "/v1/delivery-catalog/catalog-owner-repo/mutations",
      group_id: "organization",
      item_ids: ["catalog-owner-repo"],
      route_status: "implemented",
      source_authority: "OpenProject",
      title: "Organization",
    }],
    items: [{
      backend_route: "/v1/delivery-catalog/catalog-owner-repo/mutations",
      catalog_item_id: "catalog-owner-repo",
      console_capability: "request",
      create_authority: "OOS Catalog runtime",
      description: "Link an admitted owner repository.",
      evidence_refs: ["oos://catalog/projection"],
      gap_status: "console_requestable",
      group_id: "organization",
      label: "Owner Repo",
      last_projected_at: "2026-10-03T17:29:00.000Z",
      lifecycle_state: "active",
      next_action_detail: "Review and apply a repository link.",
      next_action_label: "Request Value",
      owner_route: "operator-orchestration-service",
      source_authority: "OpenProject",
      usage_count: 1,
      usage_summary: "Used by one Delivery package.",
      value_key: "owner_repo",
    }],
    projected_at: "2026-10-03T17:29:00.000Z",
    projection_status: "ready",
    schema_version: 1,
    source_revision: "catalog-version-9",
    summary: {
      drift_count: 0,
      missing_route_count: 0,
      owner_routed_count: 0,
      requestable_count: 1,
      total_items: 1,
    },
    values: [],
  };
}

