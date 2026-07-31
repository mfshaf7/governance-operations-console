import type { DeliveryProjectionStatus, DeliveryTone } from "./delivery-common.ts";

export type DeliveryCatalogGroup = {
  description: string;
  expected_route: string;
  group_id: DeliveryCatalogGroupId;
  item_ids: string[];
  route_status: DeliveryCatalogRouteStatus;
  source_authority: string;
  title: string;
};

export type DeliveryCatalogCapability =
  "create" | "owner_routed" | "read_only" | "request";

export type DeliveryCatalogGapStatus =
  | "backend_created"
  | "console_requestable"
  | "form_option_missing"
  | "missing_backend_route"
  | "owner_routed"
  | "projection_drift"
  | "read_only"
  | "stale_projection";

export type DeliveryCatalogLifecycleState =
  "active" | "admitted" | "missing" | "read_only" | "retired" | "stale";

export type DeliveryCatalogRouteStatus =
  "implemented" | "missing" | "owner_routed" | "partial" | "planned";

export type DeliveryCatalogGroupId =
  | "board"
  | "classification"
  | "evidence"
  | "metadata"
  | "organization"
  | "planning";

export type DeliveryCatalogItem = {
  backend_route: string;
  catalog_item_id: string;
  console_capability: DeliveryCatalogCapability;
  create_authority: string;
  description: string;
  evidence_refs: string[];
  gap_status: DeliveryCatalogGapStatus;
  group_id: DeliveryCatalogGroupId;
  label: string;
  last_projected_at: string | null;
  lifecycle_state: DeliveryCatalogLifecycleState;
  next_action_detail: string;
  next_action_label: string;
  owner_route: string;
  source_authority: string;
  tone: DeliveryTone;
  usage_count: number;
  usage_summary: string;
  value_key: string;
};

export type DeliveryCatalogValue = {
  catalog_item_id: string;
  catalog_value_id: string;
  description: string;
  evidence_refs: string[];
  label: string;
  last_projected_at: string | null;
  lifecycle_state: DeliveryCatalogLifecycleState;
  parent_catalog_item_id?: string | null;
  parent_catalog_value_key?: string | null;
  tone: DeliveryTone;
  usage_count: number;
  usage_summary: string;
  value_key: string;
};

export type DeliveryCatalogReadModel = {
  generated_at: string;
  groups: DeliveryCatalogGroup[];
  items: DeliveryCatalogItem[];
  projection_status: DeliveryProjectionStatus;
  summary: {
    drift_count: number;
    missing_route_count: number;
    owner_routed_count: number;
    requestable_count: number;
    total_items: number;
  };
  values: DeliveryCatalogValue[];
};
