import type { DeliveryCatalogItem } from "../../../domain/delivery-types.ts";

export const deliveryCatalogItemFixtures: DeliveryCatalogItem[] = [
  {
    catalog_item_id: "catalog-target-pi",
    group_id: "planning",
    label: "Target PI",
    value_key: "PI-2026-03",
    description:
      "Canonical planning placement used by Delivery packages and projected to OpenProject roadmap versions.",
    source_authority:
      "OOS delivery planning projection plus OpenProject Target PI custom field.",
    create_authority:
      "Platform/OpenProject version sync provisions roadmap versions; OOS should accept Target PI value requests from Catalog once the backend route exists.",
    console_capability: "request",
    backend_route:
      "GET /v1/delivery-catalog/planning missing; create/request route not admitted yet.",
    owner_route:
      "platform-engineering/products/openproject delivery ART sync plus OOS planning contract.",
    lifecycle_state: "active",
    gap_status: "missing_backend_route",
    usage_count: 7,
    usage_summary:
      "Seven projected packages use PI-2026-03; new Target PI creation still needs the planned catalog request route.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "stale",
    next_action_label: "Request Value",
    next_action_detail:
      "Prepare a Target PI request with its planning window; durable creation belongs to platform/OpenProject sync and the future OOS catalog route.",
    evidence_refs: [
      "oos:GET /v1/delivery-session/workflow-health",
      "platform-engineering/products/openproject/delivery-art-contract.md",
    ],
  },
  {
    catalog_item_id: "catalog-pi-planning-date",
    group_id: "planning",
    label: "PI Planning Date",
    value_key: "PI-2026-03/date-range",
    description:
      "PI date and lifecycle window needed for capacity, cutoff, and planning context.",
    source_authority:
      "Platform/OpenProject PI/version registry; optional future PI calendar registry.",
    create_authority:
      "Platform Engineering owns PI version/date provisioning until a dedicated PI calendar backend exists.",
    console_capability: "owner_routed",
    backend_route:
      "No console route. Planned catalog should expose date/lifecycle read model when backend source exists.",
    owner_route:
      "platform-engineering/products/openproject/scripts/openproject_sync_delivery_art_views_runner.rb",
    lifecycle_state: "missing",
    gap_status: "owner_routed",
    usage_count: 0,
    usage_summary:
      "No PI date window is projected into the prototype catalog yet.",
    last_projected_at: null,
    tone: "danger",
    next_action_label: "Open Owner Route",
    next_action_detail:
      "Record or request PI date source in the platform/OpenProject owner path, not as a console-local value.",
    evidence_refs: [
      "platform-engineering/products/openproject/delivery-art-contract.md",
      "platform-engineering/products/openproject/scripts/openproject_sync_delivery_art_views_runner.rb",
    ],
  },
  {
    catalog_item_id: "catalog-iteration",
    group_id: "planning",
    label: "Iteration",
    value_key: "PI-2026-03 / Iteration 2",
    description:
      "Iteration value nested under Target PI, used by Refinement when placing Feature and User story work.",
    source_authority:
      "OOS delivery planning rules and OpenProject custom-field allowed values.",
    create_authority:
      "OOS should request iteration creation when Delivery owns the planning horizon; OpenProject adapter supplies allowed values.",
    console_capability: "request",
    backend_route:
      "GET /v1/delivery-catalog/planning missing; create/request route not admitted yet.",
    owner_route: "operator-orchestration-service delivery planning workflow.",
    lifecycle_state: "admitted",
    gap_status: "missing_backend_route",
    usage_count: 5,
    usage_summary:
      "Five refinement packets have iteration-ready metadata but still consume prototype option sets.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "stale",
    next_action_label: "Request Value",
    next_action_detail:
      "Keep this as a request intent until OOS exposes the catalog planning route and create/request contract.",
    evidence_refs: [
      "operator-orchestration-service/src/delivery-planning-workflow.json",
      "operator-orchestration-service/docs/api/openapi.json",
    ],
  },
  {
    catalog_item_id: "catalog-initiative-family",
    group_id: "classification",
    label: "Initiative Family",
    value_key: "product-prototype-delivery",
    description:
      "Architecture family / Initiative Family classification used for lineage, board grouping, and reporting.",
    source_authority:
      "OOS delivery-initiative-lineage taxonomy; workspace-governance may own canonical policy if promoted.",
    create_authority:
      "OOS taxonomy owner for current phase; workspace governance if the family becomes workspace policy.",
    console_capability: "request",
    backend_route:
      "GET /v1/delivery-catalog/classification missing; no safe create/request route documented yet.",
    owner_route:
      "operator-orchestration-service/src/delivery-initiative-lineage.json",
    lifecycle_state: "active",
    gap_status: "missing_backend_route",
    usage_count: 11,
    usage_summary:
      "All Delivery packages rely on family grouping, but the console still consumes local read-model values.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "stale",
    next_action_label: "Request Value",
    next_action_detail:
      "Expose the OOS classification catalog before allowing family creation or retirement from the console.",
    evidence_refs: [
      "operator-orchestration-service/src/delivery-initiative-lineage.json",
    ],
  },
  {
    catalog_item_id: "catalog-lineage-role",
    group_id: "classification",
    label: "Lineage Role",
    value_key: "architecture-anchor",
    description:
      "Role rule that decides whether architecture anchor and upstream references are required.",
    source_authority: "OOS delivery-initiative-lineage rule set.",
    create_authority: "OOS contract evolution; not normal console mutation.",
    console_capability: "read_only",
    backend_route:
      "POST /v1/delivery-initiatives/{delivery_id}/governance consumes role values; catalog route is planned.",
    owner_route: "operator-orchestration-service delivery governance contract.",
    lifecycle_state: "read_only",
    gap_status: "read_only",
    usage_count: 6,
    usage_summary:
      "Six packages carry lineage metadata that should stay validated by OOS.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "info",
    next_action_label: "View Rules",
    next_action_detail:
      "Inspect rule usage here; change lineage roles only through OOS contract review.",
    evidence_refs: [
      "operator-orchestration-service/src/delivery-initiative-lineage.json",
      "POST /v1/delivery-initiatives/{delivery_id}/governance",
    ],
  },
  {
    catalog_item_id: "catalog-delivery-team",
    group_id: "organization",
    label: "Delivery Team",
    value_key: "Workspace Prototype Studio",
    description:
      "Team value used to route Delivery work and default owner/repo context.",
    source_authority:
      "OpenProject custom option projected through OOS delivery work-item forms.",
    create_authority:
      "Delivery/OOS backend only after the team catalog is admitted; OpenProject option source remains adapter-owned.",
    console_capability: "request",
    backend_route:
      "GET /v1/delivery-catalog/organization missing; create/request route not admitted yet.",
    owner_route: "operator-orchestration-service OpenProject adapter.",
    lifecycle_state: "active",
    gap_status: "missing_backend_route",
    usage_count: 8,
    usage_summary:
      "Eight packages use team defaults; console currently mirrors prototype option sets.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "stale",
    next_action_label: "Request Value",
    next_action_detail:
      "Keep team creation as a request intent until OOS exposes organization catalog projection.",
    evidence_refs: [
      "operator-orchestration-service/src/openproject-client.js",
      "POST /v1/delivery-work-items",
    ],
  },
  {
    catalog_item_id: "catalog-owner-repo",
    group_id: "organization",
    label: "Owner Repo",
    value_key: "workspace-prototype-studio",
    description:
      "Repository ownership value used by Delivery packages, validation, and review evidence routing.",
    source_authority: "workspace-governance contracts projected through OOS.",
    create_authority:
      "Repository admits the repo; Delivery Catalog requests the backend add/link/sync value so OOS can expose it as owner_repo.",
    console_capability: "request",
    backend_route:
      "POST /v1/delivery-catalog/organization/owner-repos planned for add/link/sync; POST /v1/delivery-initiatives/{delivery_id}/governance can apply accepted owner_repo values.",
    owner_route:
      "Delivery Catalog Owner Repo add/link/sync backed by Repository admission and workspace-governance repo contracts.",
    lifecycle_state: "active",
    gap_status: "missing_backend_route",
    usage_count: 11,
    usage_summary:
      "Owner repo values are selectable in package metadata after Catalog links and syncs the admitted repository value.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "stale",
    next_action_label: "Request Value",
    next_action_detail:
      "Prepare the Owner Repo value request after Repository admits or links the repository; durable sync belongs to the future backend route.",
    evidence_refs: [
      "workspace-governance/contracts/repos.yaml",
      "workspace-governance/contracts/intake-register.yaml",
    ],
  },
  {
    catalog_item_id: "catalog-principal-lookup",
    group_id: "organization",
    label: "Assignee / Responsible",
    value_key: "assignable-principal",
    description:
      "Assignable principal lookup for responsible and assignee fields.",
    source_authority:
      "OpenProject form schema and backing identity membership.",
    create_authority:
      "Backing identity/OpenProject admin; the Delivery console can only consume allowed values.",
    console_capability: "owner_routed",
    backend_route:
      "OOS OpenProject adapter resolves allowed value links from form schema.",
    owner_route: "OpenProject identity/project membership administration.",
    lifecycle_state: "read_only",
    gap_status: "owner_routed",
    usage_count: 4,
    usage_summary:
      "Four package actions need assignable-principal checks before mutation.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "info",
    next_action_label: "Open Owner Route",
    next_action_detail:
      "Display available principals from backend forms; do not create identities in the console.",
    evidence_refs: ["operator-orchestration-service/src/openproject-client.js"],
  },
  {
    catalog_item_id: "catalog-pi-objective-type",
    group_id: "metadata",
    label: "PI Objective Type",
    value_key: "committed/stretch/enabler",
    description:
      "Controlled objective classification used when creating or refining PI Objective work items.",
    source_authority:
      "OOS workflow taxonomy and OpenProject custom-field allowed values.",
    create_authority: "OOS/OpenProject contract evolution.",
    console_capability: "read_only",
    backend_route:
      "POST /v1/delivery-work-items consumes allowed values; catalog metadata route is planned.",
    owner_route: "operator-orchestration-service delivery metadata contract.",
    lifecycle_state: "read_only",
    gap_status: "read_only",
    usage_count: 3,
    usage_summary:
      "Three objective candidates need projected objective-type values.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "info",
    next_action_label: "View Usage",
    next_action_detail:
      "Keep the value read-only until OOS exposes metadata catalog projection.",
    evidence_refs: [
      "POST /v1/delivery-work-items",
      "operator-orchestration-service/src/openproject-client.js",
    ],
  },
  {
    catalog_item_id: "catalog-blocker-disposition",
    group_id: "metadata",
    label: "Blocker Disposition",
    value_key: "remove/workaround/accept-risk/defer",
    description:
      "Disposition values that make blocker handling auditable instead of a generic blocked flag.",
    source_authority:
      "OOS workflow contract and workspace governance blocker policy.",
    create_authority:
      "OOS/WGCF contract evolution; not normal console mutation.",
    console_capability: "read_only",
    backend_route:
      "Package blocker actions consume disposition intent; catalog metadata route is planned.",
    owner_route: "operator-orchestration-service blocker workflow contract.",
    lifecycle_state: "read_only",
    gap_status: "read_only",
    usage_count: 5,
    usage_summary:
      "Five active blocker paths require explicit disposition semantics.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "info",
    next_action_label: "View Usage",
    next_action_detail:
      "Use the owning blocker workflow for disposition decisions; Catalog only exposes the controlled set.",
    evidence_refs: [
      "workspace-governance/contracts/work-home-routing.yaml",
      "operator-orchestration-service delivery blocker workflow",
    ],
  },
  {
    catalog_item_id: "catalog-family-map-groups",
    group_id: "board",
    label: "Family Map Groups",
    value_key: "family-map/lane-set",
    description:
      "Execution Board groups derived from Initiative Family and package posture.",
    source_authority:
      "OOS board projection from catalog-classified package read model.",
    create_authority: "OOS/future Workspace Delivery backend.",
    console_capability: "read_only",
    backend_route:
      "GET /v1/delivery-catalog/board planned; current prototype uses Delivery read-model family_map.",
    owner_route: "operator-orchestration-service board projection contract.",
    lifecycle_state: "stale",
    gap_status: "stale_projection",
    usage_count: 11,
    usage_summary:
      "All board packages group by local family_map until OOS board catalog projection exists.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "warn",
    next_action_label: "View Projection",
    next_action_detail:
      "Keep groups read-only and mark stale until Execution Board consumes backend catalog projection.",
    evidence_refs: [
      "src/domain-workspaces/delivery/read-model/projections/root-projection.ts family_map",
    ],
  },
  {
    catalog_item_id: "catalog-action-matrix",
    group_id: "board",
    label: "Package Action Matrix",
    value_key: "action-matrix/posture-gates",
    description:
      "Allowed action matrix by package posture, backend status, gate checks, and dirty state.",
    source_authority:
      "OOS package-scoped action intent contract projected into Delivery package read model.",
    create_authority: "OOS/future Workspace Delivery backend.",
    console_capability: "read_only",
    backend_route:
      "Package action intents exist in the prototype read model; board catalog route is planned.",
    owner_route: "operator-orchestration-service action-intent contract.",
    lifecycle_state: "stale",
    gap_status: "stale_projection",
    usage_count: 18,
    usage_summary:
      "Eighteen available package actions use local package action-intent fixtures.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "warn",
    next_action_label: "View Projection",
    next_action_detail:
      "Replace local action-matrix fixtures after OOS exposes board/action catalog projection.",
    evidence_refs: [
      "src/domain-workspaces/delivery/read-model/projections/root-projection.ts apply_intents",
      "src/domain-workspaces/delivery/delivery-package-action-routing.ts",
    ],
  },
  {
    catalog_item_id: "catalog-evidence-kind",
    group_id: "evidence",
    label: "Evidence Kind",
    value_key: "validation/source/review/receipt",
    description:
      "Evidence kind values used by review packets, workflow actions, and audit trails.",
    source_authority: "WGCF readiness contract and OOS audit event projection.",
    create_authority: "WGCF/OOS contract evolution.",
    console_capability: "read_only",
    backend_route:
      "GET /v1/delivery-catalog/evidence planned; evidence currently appears through receipts and audit events.",
    owner_route:
      "workspace-governance-control-fabric receipt/readiness contracts.",
    lifecycle_state: "read_only",
    gap_status: "read_only",
    usage_count: 9,
    usage_summary:
      "Nine projected evidence references appear in current package and audit records.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "info",
    next_action_label: "View Usage",
    next_action_detail:
      "Catalog should expose evidence kinds for inspection; creation belongs to WGCF/OOS contract review.",
    evidence_refs: [
      "workspace-governance-control-fabric receipt/readiness contracts",
      "oos audit event projection",
    ],
  },
  {
    catalog_item_id: "catalog-receipt-category",
    group_id: "evidence",
    label: "Receipt Category",
    value_key:
      "accepted/apply_failed/blocked_by_gate/projection_sync_required/rejected",
    description:
      "Receipt outcome categories used by action intents, apply records, and audit trails.",
    source_authority: "OOS action-intent contract with WGCF receipt semantics.",
    create_authority: "OOS/WGCF contract evolution.",
    console_capability: "read_only",
    backend_route:
      "GET /v1/delivery-catalog/evidence planned; receipt categories currently live in action intent types.",
    owner_route:
      "operator-orchestration-service and workspace-governance-control-fabric contracts.",
    lifecycle_state: "read_only",
    gap_status: "read_only",
    usage_count: 12,
    usage_summary: "Twelve action or audit paths reference receipt categories.",
    last_projected_at: "2026-06-20T09:10:00.000Z",
    tone: "info",
    next_action_label: "View Usage",
    next_action_detail:
      "Keep receipt categories read-only in Catalog; workflow surfaces record concrete receipts.",
    evidence_refs: [
      "src/domain-workspaces/delivery/domain/delivery-package.ts DeliveryReceiptCategory",
    ],
  },
];
