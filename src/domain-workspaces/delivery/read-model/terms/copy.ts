import type {
  DeliveryActionType,
  DeliveryReceiptCategory,
} from "../../domain/delivery-package.ts";
import type {
  DeliveryPackagePosture,
  DeliveryProjectionStatus,
} from "../../domain/delivery-common.ts";

export type DeliverySurfaceId =
  "audit-trail" | "execution-board" | "intake" | "refinement" | "work-design";

export type DeliverySurfaceTerm = {
  description: string;
  label: string;
};

export const deliverySurfaceTerms: Record<
  DeliverySurfaceId,
  DeliverySurfaceTerm
> = {
  "audit-trail": {
    description:
      "Package-scoped receipts, decisions, evidence, and projection notes.",
    label: "Audit Trail",
  },
  "execution-board": {
    description:
      "Visual package control for ready, active, blocked, deferred, closeout, done, and retired work.",
    label: "Execution Board",
  },
  intake: {
    description: "Accepted proposal consumption into a Delivery Package shell.",
    label: "Intake",
  },
  refinement: {
    description:
      "Whole-package metadata repair and readiness before execution control.",
    label: "Refinement",
  },
  "work-design": {
    description: "AI/operator shaping of a new package tree before refinement.",
    label: "Work Design",
  },
};

export const deliveryPostureTerms: Record<
  DeliveryPackagePosture,
  { description: string; label: string }
> = {
  Blocked: {
    description: "Next committed step is blocked; use the blocker workflow.",
    label: "Blocked",
  },
  "Closeout Pending": {
    description: "Needs evidence review before package closeout.",
    label: "Closeout Pending",
  },
  Deferred: {
    description: "Open work is intentionally parked outside active focus.",
    label: "Deferred",
  },
  Done: {
    description: "Required descendants are terminal; closeout gates passed.",
    label: "Done",
  },
  "In Progress": {
    description: "Execution has started; required work remains.",
    label: "In Progress",
  },
  Ready: {
    description:
      "Refinement accepted; a next execution target can be selected.",
    label: "Ready",
  },
  Retired: {
    description:
      "Work is terminal inactive and retained only for traceability.",
    label: "Retired",
  },
};

export const deliveryActionTerms: Record<
  DeliveryActionType,
  { description: string; label: string }
> = {
  "ask-advisor": {
    description: "Request a bounded recommendation without mutating ART.",
    label: "Ask Advisor",
  },
  block: {
    description: "Record a bounded blocker through the blocker workflow.",
    label: "Block",
  },
  "clear-blocker": {
    description: "Resolve a blocker through the bounded blocker workflow.",
    label: "Clear Blocker",
  },
  "continue-remaining-work": {
    description: "Return to remaining executable scope after closeout review.",
    label: "Continue Remaining Work",
  },
  defer: {
    description: "Park open work outside active focus with review metadata.",
    label: "Defer",
  },
  "edit-work-tree": {
    description:
      "Edit the selected execution tree draft inline before future OOS work-item writes.",
    label: "Edit Work",
  },
  "open-audit-trail": {
    description: "Inspect package-scoped receipts, evidence, and decisions.",
    label: "Audit Trail",
  },
  "open-closeout": {
    description: "Review completion evidence before final closeout mutation.",
    label: "Open Closeout",
  },
  "open-details": {
    description: "Inspect package metadata, evidence, and tree context.",
    label: "Open Details",
  },
  resume: {
    description: "Return parked work to a nonterminal execution posture.",
    label: "Resume",
  },
  retire: {
    description:
      "Move invalid or superseded work to terminal inactive posture.",
    label: "Retire",
  },
  "start-work": {
    description: "Move the selected executable child target toward execution.",
    label: "Start Work",
  },
  "sync-owner-repo": {
    description:
      "Open the manual Catalog add/link/sync path for an admitted repository value.",
    label: "Catalog Owner Repo",
  },
  "view-art-tree": {
    description: "Inspect package hierarchy without mutating ART.",
    label: "View ART Tree",
  },
};

export const deliveryProjectionTerms: Record<
  DeliveryProjectionStatus,
  { description: string; label: string }
> = {
  backend_unavailable: {
    description: "The backing source is unavailable; do not imply live truth.",
    label: "Backend Unavailable",
  },
  fresh: {
    description: "The read model is current enough for operator inspection.",
    label: "Fresh",
  },
  permission_denied: {
    description: "The operator cannot read enough source truth to act.",
    label: "Permission Denied",
  },
  projection_sync_required: {
    description:
      "A write was accepted or may have been accepted, but derived projection is not final.",
    label: "Projection Sync Required",
  },
  read_error: {
    description:
      "The read path failed before trustworthy package truth could be produced.",
    label: "Read Error",
  },
  stale: {
    description: "The read model is too old or unsafe for mutation decisions.",
    label: "Stale",
  },
};

export const deliveryReceiptTerms: Record<
  DeliveryReceiptCategory,
  { description: string; label: string }
> = {
  accepted: {
    description:
      "OOS/backend accepted the mutation and the read model can refresh.",
    label: "Accepted",
  },
  apply_failed: {
    description:
      "OOS, adapter, or backend failed before a trustworthy accepted result.",
    label: "Apply Failed",
  },
  blocked_by_gate: {
    description:
      "The draft is meaningful, but route validation or readiness blocked mutation.",
    label: "Blocked By Gate",
  },
  projection_sync_required: {
    description:
      "The write outcome needs conservative projection handling before final trust.",
    label: "Projection Sync Required",
  },
  rejected: {
    description:
      "The payload or action is invalid for the selected route or target.",
    label: "Rejected",
  },
};

export const deliveryBannedImplementationTerms = [
  "Activate Epic",
  "Commitment",
  "Drafting",
  "Front Control",
  "Fronts",
  "Metadata Readiness",
  "Movement",
  "Package #",
] as const;

export const deliveryAllowedIdentityPattern =
  "Delivery Package with visible OpenProject Epic identity, for example: Epic #698.";
