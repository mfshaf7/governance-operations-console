import type { DeliverySelectedPackage } from "../../../domain/delivery-types.ts";

export const deliverySelectedPackageFixtures: DeliverySelectedPackage[] = [
  {
    delivery_package_id: "pkg-698",
    active_execution_target_id: null,
    advisor_summary:
      "Advisor recommends starting User story #714 after operator confirms source revision is current.",
    lineage_refs: {
      architecture_anchor_ref: "Epic #681",
      required_upstream_ref: "Epic #540",
    },
    milestones: [
      {
        checkpoint_kind: "governance_review",
        evidence_refs: ["WGCF-READY-698"],
        execution_context:
          "Review control-plane governance assumptions before reducing OpenProject dependency.",
        exit_condition:
          "Operator accepts WGCF readiness receipt and OOS draft route proof.",
        id: "milestone-698-governance-review",
        status: "ready",
        target_pi: "PI-2026-03",
        title: "Governance review checkpoint",
      },
    ],
    next_execution_target_id: "node-698-story-1",
    owner_repo: "workspace-governance-control-fabric",
    source_revision: "mock-delivery-v1:pkg-698",
  },
  {
    delivery_package_id: "pkg-812",
    active_execution_target_id: "node-812-story-1",
    advisor_summary:
      "Execution should wait for Delivery Catalog to add, link, and sync the admitted repo as an Owner Repo value before applying owner_repo.",
    lineage_refs: {
      architecture_anchor_ref: "Epic #698",
      required_upstream_ref: null,
    },
    milestones: [
      {
        checkpoint_kind: "integration_gate",
        evidence_refs: ["repository-admission-812"],
        execution_context:
          "Repository admission exists; Delivery Catalog Owner Repo value is not linked or synced yet.",
        exit_condition:
          "Catalog value client-insight-delivery is linked to the admitted repo and accepted by the backend value layer.",
        id: "milestone-812-owner-repo-sync",
        status: "new",
        target_pi: "PI-2026-03",
        title: "Owner Repo catalog sync",
      },
    ],
    next_execution_target_id: "node-812-story-1",
    owner_repo: "client-insight-delivery",
    source_revision: "mock-delivery-v1:pkg-812",
  },
];
