import type { DeliveryArtNode } from "../../../domain/delivery-types.ts";
import type { DeliveryReadModel } from "../../delivery-read-model.ts";

type LargeTreeWorkstream = {
  description: string;
  legacyId: number;
  slug: string;
  stories: Array<{
    description: string;
    legacyId: number;
    slug: string;
    title: string;
  }>;
  title: string;
};

const largeTreeWorkstreams: LargeTreeWorkstream[] = [
  {
    description: "Prepare source inventory and ownership notes for migration.",
    legacyId: 901,
    slug: "inventory",
    stories: [
      {
        description: "Confirm active source systems and archive boundaries.",
        legacyId: 902,
        slug: "sources",
        title: "Confirm source inventory",
      },
      {
        description: "Map source owners to migration review contacts.",
        legacyId: 903,
        slug: "owners",
        title: "Map source owners",
      },
      {
        description: "Tag records that must stay out of migration scope.",
        legacyId: 904,
        slug: "exclusions",
        title: "Tag excluded records",
      },
      {
        description: "Capture source schema drift before extraction.",
        legacyId: 905,
        slug: "schema",
        title: "Capture schema drift",
      },
      {
        description: "Prepare the extraction checklist for each source.",
        legacyId: 906,
        slug: "checklist",
        title: "Prepare extraction checklist",
      },
      {
        description:
          "Record inventory review evidence for the migration packet.",
        legacyId: 907,
        slug: "evidence",
        title: "Record inventory evidence",
      },
    ],
    title: "Inventory readiness",
  },
  {
    description: "Normalize extracted records before staging import begins.",
    legacyId: 908,
    slug: "normalization",
    stories: [
      {
        description:
          "Normalize identity fields against accepted owner records.",
        legacyId: 909,
        slug: "identity",
        title: "Normalize identity fields",
      },
      {
        description:
          "Normalize timestamp fields into delivery standard format.",
        legacyId: 910,
        slug: "timestamps",
        title: "Normalize timestamps",
      },
      {
        description: "Normalize status values against catalog vocabulary.",
        legacyId: 911,
        slug: "status",
        title: "Normalize status values",
      },
      {
        description: "Normalize attachment references before staging.",
        legacyId: 912,
        slug: "attachments",
        title: "Normalize attachment refs",
      },
      {
        description: "Normalize relation keys between source packages.",
        legacyId: 913,
        slug: "relations",
        title: "Normalize relation keys",
      },
      {
        description: "Record normalization evidence and rejected rows.",
        legacyId: 914,
        slug: "receipt",
        title: "Record normalization receipt",
      },
    ],
    title: "Data normalization",
  },
  {
    description: "Run staged import checks before platform write is allowed.",
    legacyId: 915,
    slug: "staging",
    stories: [
      {
        description: "Load normalized records into the staging workspace.",
        legacyId: 916,
        slug: "load",
        title: "Load staging records",
      },
      {
        description: "Validate staging counts against the source inventory.",
        legacyId: 917,
        slug: "counts",
        title: "Validate staging counts",
      },
      {
        description: "Validate required metadata before import preview.",
        legacyId: 918,
        slug: "metadata",
        title: "Validate required metadata",
      },
      {
        description: "Preview relation graph changes before apply.",
        legacyId: 919,
        slug: "relations",
        title: "Preview relation graph",
      },
      {
        description: "Review staging exceptions with the operator.",
        legacyId: 920,
        slug: "exceptions",
        title: "Review staging exceptions",
      },
      {
        description: "Record staging approval evidence.",
        legacyId: 921,
        slug: "approval",
        title: "Record staging approval",
      },
    ],
    title: "Staging validation",
  },
  {
    description: "Apply migration writes with bounded rollback evidence.",
    legacyId: 922,
    slug: "apply",
    stories: [
      {
        description: "Prepare apply batch order and rollback anchors.",
        legacyId: 923,
        slug: "batch",
        title: "Prepare apply batches",
      },
      {
        description: "Apply the first controlled migration batch.",
        legacyId: 924,
        slug: "first-batch",
        title: "Apply first batch",
      },
      {
        description: "Apply the remaining migration batches.",
        legacyId: 925,
        slug: "remaining",
        title: "Apply remaining batches",
      },
      {
        description: "Record write receipts for every applied batch.",
        legacyId: 926,
        slug: "receipts",
        title: "Record write receipts",
      },
      {
        description: "Verify rollback anchors remain available after apply.",
        legacyId: 927,
        slug: "rollback",
        title: "Verify rollback anchors",
      },
      {
        description: "Record apply completion evidence.",
        legacyId: 928,
        slug: "evidence",
        title: "Record apply evidence",
      },
    ],
    title: "Controlled apply",
  },
  {
    description: "Reconcile migrated data against delivery and catalog truth.",
    legacyId: 929,
    slug: "reconciliation",
    stories: [
      {
        description: "Compare migrated package counts against staging.",
        legacyId: 930,
        slug: "counts",
        title: "Reconcile package counts",
      },
      {
        description: "Compare owner repo values against catalog truth.",
        legacyId: 931,
        slug: "owners",
        title: "Reconcile owner repo values",
      },
      {
        description: "Compare milestone and target PI values.",
        legacyId: 932,
        slug: "planning",
        title: "Reconcile planning values",
      },
      {
        description: "Compare relation graph edges after migration.",
        legacyId: 933,
        slug: "relations",
        title: "Reconcile relation graph",
      },
      {
        description: "Review reconciliation exceptions with the operator.",
        legacyId: 934,
        slug: "exceptions",
        title: "Review reconciliation exceptions",
      },
      {
        description: "Record reconciliation evidence.",
        legacyId: 935,
        slug: "evidence",
        title: "Record reconciliation evidence",
      },
    ],
    title: "Reconciliation",
  },
  {
    description: "Close migration with audit, handoff, and archive evidence.",
    legacyId: 936,
    slug: "closeout",
    stories: [
      {
        description: "Prepare operator closeout notes.",
        legacyId: 937,
        slug: "notes",
        title: "Prepare closeout notes",
      },
      {
        description: "Attach migration receipts to the package.",
        legacyId: 938,
        slug: "receipts",
        title: "Attach migration receipts",
      },
      {
        description: "Archive source extract references.",
        legacyId: 939,
        slug: "archive",
        title: "Archive source extracts",
      },
      {
        description: "Confirm downstream consumers can read migrated records.",
        legacyId: 940,
        slug: "consumers",
        title: "Confirm downstream readout",
      },
      {
        description: "Record final audit trail entry.",
        legacyId: 941,
        slug: "audit",
        title: "Record final audit entry",
      },
      {
        description: "Close the migration package after evidence review.",
        legacyId: 942,
        slug: "close",
        title: "Close migration package",
      },
    ],
    title: "Migration closeout",
  },
];

function largeTreeWorkstreamNode(
  workstream: LargeTreeWorkstream,
): DeliveryArtNode {
  return {
    id: `node-900-${workstream.slug}`,
    legacy_work_package_id: workstream.legacyId,
    component_type: "Feature",
    title: workstream.title,
    description: workstream.description,
    backend_status: "ready",
    metadata_status: "complete",
    tone: "info",
    children: workstream.stories.map((story) => ({
      id: `node-900-${workstream.slug}-${story.slug}`,
      legacy_work_package_id: story.legacyId,
      component_type: "User story",
      title: story.title,
      description: story.description,
      backend_status: "ready",
      metadata_status: "complete",
      tone: "info",
      children: [],
    })),
  };
}

export const deliveryArtTreeFixture: DeliveryReadModel["art_tree"] = {
  roots: [
    {
      id: "node-698",
      legacy_work_package_id: 698,
      component_type: "Epic",
      title: "Governed AI Control Plane",
      description:
        "Delivery package shell with ready child work items and one milestone checkpoint.",
      backend_status: "ready",
      metadata_status: "complete",
      tone: "info",
      children: [
        {
          id: "node-698-feature-1",
          legacy_work_package_id: 710,
          component_type: "Feature",
          title: "Broker-owned orchestration path",
          description: "OOS mutation draft and apply path stays explicit.",
          backend_status: "ready",
          metadata_status: "complete",
          tone: "info",
          children: [
            {
              id: "node-698-story-1",
              legacy_work_package_id: 714,
              component_type: "User story",
              title: "Validate mutation draft before apply",
              description: "Selected execution target for the ready package.",
              backend_status: "ready",
              metadata_status: "complete",
              tone: "ok",
              children: [],
            },
            {
              id: "node-698-story-2",
              legacy_work_package_id: 715,
              component_type: "User story",
              title: "Render apply receipt in console",
              description:
                "Open execution target waiting behind the selected story.",
              backend_status: "new",
              metadata_status: "complete",
              tone: "info",
              children: [],
            },
          ],
        },
        {
          id: "node-698-feature-2",
          legacy_work_package_id: 720,
          component_type: "Feature",
          title: "Projection checkpoint handling",
          description:
            "Future orchestration path keeps stale projection visible.",
          backend_status: "new",
          metadata_status: "complete",
          tone: "warn",
          children: [],
        },
        {
          id: "node-698-risk-1",
          legacy_work_package_id: 721,
          component_type: "Risk",
          title: "Read-model drift after adapter write",
          description: "Risk remains visible but not executable.",
          backend_status: "new",
          metadata_status: "complete",
          tone: "warn",
          children: [],
        },
        {
          id: "node-698-milestone-1",
          legacy_work_package_id: 722,
          component_type: "Milestone",
          title: "Governance review checkpoint",
          description: "Checkpoint only; not an execution container.",
          backend_status: "ready",
          metadata_status: "complete",
          tone: "info",
          children: [],
        },
      ],
    },
    {
      id: "node-753",
      legacy_work_package_id: 753,
      component_type: "Epic",
      title: "Readiness Gate Repair",
      description:
        "Blocked execution package with a readiness gate still unresolved.",
      backend_status: "blocked",
      metadata_status: "partial",
      tone: "warn",
      children: [
        {
          id: "node-753-feature-1",
          legacy_work_package_id: 754,
          component_type: "Feature",
          title: "Readiness proof repair",
          description:
            "Feature owns the blocked readiness proof path before execution can continue.",
          backend_status: "blocked",
          metadata_status: "partial",
          tone: "warn",
          children: [
            {
              id: "node-753-story-1",
              legacy_work_package_id: 755,
              component_type: "User story",
              title: "Repair readiness proof",
              description:
                "Active execution target waits for blocker disposition before continuing.",
              backend_status: "blocked",
              metadata_status: "partial",
              tone: "warn",
              children: [],
            },
            {
              id: "node-753-story-2",
              legacy_work_package_id: 756,
              component_type: "User story",
              title: "Validate resumed execution state",
              description:
                "Resume execution after the readiness repair has been accepted.",
              backend_status: "ready",
              metadata_status: "partial",
              tone: "warn",
              children: [],
            },
          ],
        },
        {
          id: "node-753-risk-1",
          legacy_work_package_id: 757,
          component_type: "Risk",
          title: "Projection replay could overwrite newer receipt",
          description:
            "Risk stays visible until the repair path proves source revision alignment.",
          backend_status: "new",
          metadata_status: "partial",
          tone: "warn",
          children: [],
        },
      ],
    },
    {
      id: "node-681",
      legacy_work_package_id: 681,
      component_type: "Epic",
      title: "Broker Apply Controls",
      description: "Closeout package with remaining child work under review.",
      backend_status: "in-progress",
      metadata_status: "complete",
      tone: "warn",
      children: [
        {
          id: "node-681-feature-1",
          legacy_work_package_id: 682,
          component_type: "Feature",
          title: "Closeout evidence review",
          description:
            "Feature keeps completion evidence and remaining work decision together.",
          backend_status: "in-progress",
          metadata_status: "complete",
          tone: "warn",
          children: [
            {
              id: "node-681-story-1",
              legacy_work_package_id: 683,
              component_type: "User story",
              title: "Confirm remaining work decision",
              description:
                "Open child work prevents terminal closeout until reviewed.",
              backend_status: "ready",
              metadata_status: "complete",
              tone: "info",
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "node-087",
      legacy_work_package_id: 87,
      component_type: "Epic",
      title: "Security Baseline Review",
      description: "Parked package retained outside active focus.",
      backend_status: "parked",
      metadata_status: "complete",
      tone: "warn",
      children: [
        {
          id: "node-087-feature-1",
          legacy_work_package_id: 88,
          component_type: "Feature",
          title: "Security baseline review lane",
          description:
            "Deferred feature can resume when operator returns it to active focus.",
          backend_status: "parked",
          metadata_status: "complete",
          tone: "warn",
          children: [
            {
              id: "node-087-story-1",
              legacy_work_package_id: 89,
              component_type: "User story",
              title: "Review security baseline posture",
              description:
                "Operator review decides whether the deferred package should resume.",
              backend_status: "parked",
              metadata_status: "complete",
              tone: "warn",
              children: [],
            },
            {
              id: "node-087-story-2",
              legacy_work_package_id: 90,
              component_type: "User story",
              title: "Refresh threat model context",
              description:
                "Threat model context remains parked with the package.",
              backend_status: "parked",
              metadata_status: "complete",
              tone: "warn",
              children: [],
            },
          ],
        },
        {
          id: "node-087-feature-2",
          legacy_work_package_id: 91,
          component_type: "Feature",
          title: "Security acceptance evidence",
          description:
            "Evidence lane resumes only when the package returns to active delivery.",
          backend_status: "parked",
          metadata_status: "complete",
          tone: "warn",
          children: [
            {
              id: "node-087-story-3",
              legacy_work_package_id: 92,
              component_type: "User story",
              title: "Prepare acceptance evidence",
              description:
                "Acceptance evidence waits behind the deferred package decision.",
              backend_status: "parked",
              metadata_status: "complete",
              tone: "warn",
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "node-714",
      legacy_work_package_id: 714,
      component_type: "Epic",
      title: "Broker Draft Validation",
      description:
        "In-progress package where active execution can add or move work through OOS.",
      backend_status: "in-progress",
      metadata_status: "complete",
      tone: "ok",
      children: [
        {
          id: "node-714-feature-1",
          legacy_work_package_id: 716,
          component_type: "Feature",
          title: "Execution edit support",
          description:
            "Feature owns the currently active execution edit surface.",
          backend_status: "in-progress",
          metadata_status: "complete",
          tone: "ok",
          children: [
            {
              id: "node-714-story-1",
              legacy_work_package_id: 717,
              component_type: "User story",
              title: "Add missing execution task",
              description:
                "Execution edit adds the missing child under the selected parent.",
              backend_status: "ready",
              metadata_status: "complete",
              tone: "info",
              children: [],
            },
            {
              id: "node-714-story-2",
              legacy_work_package_id: 718,
              component_type: "User story",
              title: "Move validation task into active lane",
              description:
                "Execution edit can move the task through the bounded OOS route.",
              backend_status: "ready",
              metadata_status: "complete",
              tone: "info",
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "node-540",
      legacy_work_package_id: 540,
      component_type: "Epic",
      title: "Stale Open Closeout",
      description: "Completed package retained for audit-only inspection.",
      backend_status: "done",
      metadata_status: "complete",
      tone: "ok",
      children: [
        {
          id: "node-540-story-1",
          legacy_work_package_id: 541,
          component_type: "User story",
          title: "Accepted closeout receipt",
          description:
            "Completed child proves the package has no remaining active work.",
          backend_status: "done",
          metadata_status: "complete",
          tone: "ok",
          children: [],
        },
      ],
    },
    {
      id: "node-251",
      legacy_work_package_id: 251,
      component_type: "Epic",
      title: "Superseded AI Assist Slice",
      description: "Retired package retained for audit-only inspection.",
      backend_status: "retired",
      metadata_status: "not_applicable",
      tone: "muted",
      children: [
        {
          id: "node-251-story-1",
          legacy_work_package_id: 252,
          component_type: "User story",
          title: "Superseded implementation slice",
          description:
            "Retired child remains visible only for historical context.",
          backend_status: "retired",
          metadata_status: "not_applicable",
          tone: "muted",
          children: [],
        },
      ],
    },
    {
      id: "node-900",
      legacy_work_package_id: 900,
      component_type: "Epic",
      title: "Large Tree Migration Probe",
      description: "Large migration package with visible workstream structure.",
      backend_status: "ready",
      metadata_status: "complete",
      tone: "stale",
      children: largeTreeWorkstreams.map(largeTreeWorkstreamNode),
    },
    {
      id: "node-812",
      legacy_work_package_id: 812,
      component_type: "Epic",
      title: "Client Insight Delivery",
      description:
        "Execution package blocked by Owner Repo catalog value add/link/sync.",
      backend_status: "blocked",
      metadata_status: "partial",
      tone: "warn",
      children: [
        {
          id: "node-812-feature-1",
          legacy_work_package_id: 813,
          component_type: "Feature",
          title: "Client insight runtime slice",
          description:
            "Feature can continue after the admitted repo is available as an Owner Repo value.",
          backend_status: "blocked",
          metadata_status: "partial",
          tone: "warn",
          children: [
            {
              id: "node-812-story-1",
              legacy_work_package_id: 814,
              component_type: "User story",
              title: "Attach owner repo before execution continues",
              description:
                "Selected execution target waits for Catalog to add, link, and sync the Owner Repo value.",
              backend_status: "blocked",
              metadata_status: "partial",
              tone: "warn",
              children: [],
            },
            {
              id: "node-812-story-2",
              legacy_work_package_id: 815,
              component_type: "User story",
              title: "Apply accepted owner repo value",
              description:
                "Execution can apply the accepted Owner Repo value after Catalog sync completes.",
              backend_status: "blocked",
              metadata_status: "partial",
              tone: "warn",
              children: [],
            },
          ],
        },
      ],
    },
  ],
};
