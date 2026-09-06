import type {
  WorkspaceInventoryLifecyclePreparation,
  WorkspaceInventoryResult,
  WorkspaceRegistryRecord,
  WorkspaceRegistrySnapshot,
} from "../model/workspace-registry-types.ts";

const authorityRevision = "9".repeat(40);
const sourceDigest = `sha256:${"1".repeat(64)}`;
const recordDigest = `sha256:${"2".repeat(64)}`;
const candidateDigest = `sha256:${"3".repeat(64)}`;
const intakeDigest = `sha256:${"4".repeat(64)}`;

export const workspaceRegistryFixture = {
  authority_revision: authorityRevision,
  canonical_authority: {
    branch: "main",
    intake_path: "contracts/intake-register.yaml",
    inventory_paths: {
      component: "contracts/components.yaml",
      product: "contracts/products.yaml",
      repo: "contracts/repos.yaml",
    },
    repo: "workspace-governance",
  },
  canonical_mutation: false,
  eligible_promotions: [
    {
      active_record: {
        id: "component:temporal",
        kind: "component",
        value: {
          component_class: "shared-platform",
          lifecycle: "active",
          owner_repo: "platform-engineering",
          posture: "active",
          product: null,
          security_owner: "security-architecture",
          validation_behavior: {
            catalog_refs: [
              "developer-integration",
              "security-bindings",
            ],
            notes: "Durable workflow runtime behind OOS.",
            posture: "profile-gated-external-owner",
            wgcf_graph_role: "shared-platform-component",
          },
        },
      },
      approval_refs: ["workspace-intake-decision:component:temporal:v2"],
      candidate_digest: candidateDigest,
      intake_entry_ref: {
        digest: intakeDigest,
        id: "component:temporal",
        version: 2,
      },
      owner_refs: ["platform-engineering", "security-architecture"],
      target: {
        kind: "component",
        name: "temporal",
        record_id: "component:temporal",
      },
    },
  ],
  projected_at: "2026-09-06T12:00:00.000Z",
  projection_digest: `sha256:${"5".repeat(64)}`,
  projection_id: "workspace-inventory-registry:fixture-v1",
  records: [
    registryRecord({
      id: "repo:workspace-governance",
      kind: "repo",
      maturity: null,
      name: "workspace-governance",
      ownerRefs: ["workspace-governance"],
    }),
    registryRecord({
      id: "product:governance-operations-console",
      kind: "product",
      maturity: "owner-managed",
      name: "governance-operations-console",
      ownerRefs: ["governance-operations-console", "platform-engineering"],
    }),
    registryRecord({
      id: "component:workspace-governance-control-fabric",
      kind: "component",
      maturity: null,
      name: "workspace-governance-control-fabric",
      ownerRefs: [
        "workspace-governance-control-fabric",
        "security-architecture",
      ],
    }),
  ],
  schema_version: 1,
  workflow_id: "workspace-inventory-registry",
} as const satisfies WorkspaceRegistrySnapshot;

export const workspaceInventoryResultFixture = {
  canonical_mutation: false,
  failure: null,
  history: [
    {
      at: "2026-09-06T12:03:00.000Z",
      details: null,
      sequence: 1,
      status: "accepted",
    },
  ],
  next_action: "continue",
  readback: null,
  receipt: null,
  request_id: "workspace-inventory-request:console-fixture",
  revision: 1,
  review: null,
  schema_version: 1,
  status: "accepted",
  workflow_id: "workspace-inventory-promotion",
} as const satisfies WorkspaceInventoryResult;

export function workspaceInventoryLifecyclePreparationFixture(
  record: WorkspaceRegistryRecord,
): WorkspaceInventoryLifecyclePreparation {
  return {
    authority_revision: authorityRevision,
    canonical_authority: {
      branch: "main",
      history_path: "contracts/workspace-inventory-history.yaml",
      inventory_path: ({
        component: "contracts/components.yaml",
        product: "contracts/products.yaml",
        repo: "contracts/repos.yaml",
      } as const)[record.kind],
      repo: "workspace-governance",
    },
    canonical_mutation: false,
    current_record: fixtureCurrentRecord(record),
    expected_state: {
      active_inventory_digest: `sha256:${"6".repeat(64)}`,
      history_digest: `sha256:${"7".repeat(64)}`,
      posture: record.posture,
      record_digest: record.record_digest,
      record_version: record.version,
    },
    latest_event_ref: null,
    schema_version: 1,
    target: { kind: record.kind, name: record.name, record_id: record.id },
    workflow_id: "workspace-inventory-lifecycle",
  };
}

function fixtureCurrentRecord(record: WorkspaceRegistryRecord) {
  const envelope = {
    id: record.id,
    last_mutation: {
      ...record.last_mutation,
      idempotency_key: `fixture:${record.id}`,
      readiness_digest: null,
      request_digest: null,
    },
    lineage: record.lineage,
    version: record.version,
  };
  if (record.kind === "product") {
    return {
      governed_prod_promotion: false,
      highest_real_endpoint: "owner-repository-local-preview",
      lifecycle: record.maturity ?? "owner-managed",
      maturity: record.maturity ?? "owner-managed",
      platform_owner: "platform-engineering",
      posture: record.posture,
      record: envelope,
      runtime_owner: record.owner_refs[0],
      security_owner: "security-architecture",
      source_owners: record.owner_refs,
      stage_supported: false,
      validation_behavior: {
        catalog_refs: ["component-contracts", "review-coverage"],
        notes: "Fixture-backed product inventory for interface verification.",
        posture: "covered-by-owner-repo",
        wgcf_graph_role: "product-readiness-aggregate",
      },
    };
  }
  if (record.kind === "component") {
    return {
      component_class: "shared-platform",
      lifecycle: record.posture,
      owner_repo: record.owner_refs[0],
      posture: record.posture,
      product: null,
      record: envelope,
      security_owner: "security-architecture",
      validation_behavior: {
        catalog_refs: ["component-contracts"],
        notes: "Fixture-backed component inventory for interface verification.",
        posture: "covered-by-owner-repo",
        wgcf_graph_role: "shared-platform-component",
      },
    };
  }
  return {
    allowed_authoritative_refs: record.owner_refs,
    lifecycle: record.posture,
    must_not_own: ["unapproved cross-repo authority"],
    owns: ["fixture-backed workspace responsibility"],
    posture: record.posture,
    record: envelope,
    repo_class: "governance",
    requires_security_bindings: false,
    security_review_subject: true,
    validation_behavior: {
      catalog_refs: ["contract-model"],
      notes: "Fixture-backed repository inventory for interface verification.",
      posture: "catalog-owner",
      wgcf_graph_role: "catalog-authority-source",
    },
  };
}

function registryRecord({
  id,
  kind,
  maturity,
  name,
  ownerRefs,
}: {
  id: string;
  kind: "component" | "product" | "repo";
  maturity: string | null;
  name: string;
  ownerRefs: readonly string[];
}) {
  return {
    id,
    kind,
    last_mutation: {
      action: "migrate",
      applied_at: "2026-08-30T18:27:30.000Z",
      id: `workspace-inventory-migration:${id}:v1-v2`,
      readiness_ref: null,
      request_ref: null,
    },
    lineage: {
      intake_entry_version: null,
      source: "legacy-migration",
      source_digest: sourceDigest,
      source_ref: `git://workspace-governance/${authorityRevision}`,
    },
    maturity,
    name,
    owner_refs: ownerRefs,
    posture: "active" as const,
    record_digest: recordDigest,
    version: 1,
  };
}
