import type {
  DeliveryApplyIntent,
  DeliveryActionType,
  DeliveryAvailableAction,
  DeliveryReceiptCategory,
} from "../../domain/delivery-types.ts";

export type ExecutionActionStep = "apply" | "draft" | "receipt";

export type ExecutionActionFamily =
  | "advisor"
  | "blocker"
  | "closeout"
  | "inspect"
  | "lifecycle"
  | "parking"
  | "source-custody"
  | "work-tree";

export type ExecutionActionContract = {
  applyDescription: string;
  applyTitle: string;
  family: ExecutionActionFamily;
  familyLabel: string;
  modalDescription: string;
  modalKicker: string;
  receiptCategory: DeliveryReceiptCategory;
  receiptDescription: string;
  receiptProjection: string;
  receiptTitle: string;
  reviewActionLabel: string;
  receiptActionLabel: string;
  draftDescription: string;
  draftTitle: string;
  reviewable: boolean;
};

export type ExecutionActionReceipt = {
  actionLabel: string;
  actionType: DeliveryAvailableAction["action_type"];
  appliedIntent: DeliveryApplyIntent;
  category: string;
  commandName: `delivery.execution.${DeliveryAvailableAction["action_type"]}`;
  packageId: string;
  projectionResult: string;
  recordedAt: string;
  receiptId: string;
  resultState: "recorded";
  schemaVersion: 1;
  sourceRevision: string;
  summary: string;
};

export const executionActionContracts: Record<
  DeliveryActionType,
  ExecutionActionContract
> = {
  "ask-advisor": {
    applyDescription: "Advisor requests stay read-only in this prototype.",
    applyTitle: "Review Advisor Request",
    draftDescription:
      "Ask the board advisor for a bounded recommendation without changing ART.",
    draftTitle: "Prepare Advisor Question",
    family: "advisor",
    familyLabel: "Advisor",
    modalDescription:
      "Read-only advisor support for the selected Delivery Package.",
    modalKicker: "Advisor Request",
    receiptActionLabel: "Record Advisor Note",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records that advisor context was inspected.",
    receiptProjection: "advisor context inspected",
    receiptTitle: "Advisor Note Recorded",
    reviewActionLabel: "Review Advisor Context",
    reviewable: false,
  },
  block: {
    applyDescription:
      "Confirm the blocker target, route, and disposition gates before recording the blocker.",
    applyTitle: "Review Blocker Route",
    draftDescription:
      "Record a bounded blocker on the selected execution target. This does not clear or repair the source issue.",
    draftTitle: "Prepare Blocker Draft",
    family: "blocker",
    familyLabel: "Blocker",
    modalDescription:
      "Blocker actions route through the bounded blocker workflow and preserve recovery/disposition evidence.",
    modalKicker: "Blocker Action",
    receiptActionLabel: "Record Blocker Receipt",
    receiptCategory: "blocked_by_gate",
    receiptDescription:
      "The prototype records the blocker intent locally. Future OOS/WGCF wiring will return the durable blocker receipt.",
    receiptProjection:
      "package remains blocked until blocker disposition changes",
    receiptTitle: "Blocker Intent Recorded",
    reviewActionLabel: "Review Blocker",
    reviewable: true,
  },
  "clear-blocker": {
    applyDescription:
      "Confirm the blocker resolution source and expected resumed posture before clearing.",
    applyTitle: "Review Blocker Clear",
    draftDescription:
      "Clear a blocker only after the owning blocker workflow records repair, workaround, or accepted risk.",
    draftTitle: "Prepare Blocker Clear",
    family: "blocker",
    familyLabel: "Blocker",
    modalDescription:
      "Clear Blocker must use blocker workflow evidence; it is not a metadata-only board action.",
    modalKicker: "Blocker Action",
    receiptActionLabel: "Record Clear Receipt",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records the clear intent locally. Future wiring will bind it to blocker disposition evidence.",
    receiptProjection: "package returns to the next eligible execution posture",
    receiptTitle: "Blocker Clear Intent Recorded",
    reviewActionLabel: "Review Clear",
    reviewable: true,
  },
  "continue-remaining-work": {
    applyDescription:
      "Confirm the closeout finding and keep the package in progress for remaining child work.",
    applyTitle: "Review Remaining Work Decision",
    draftDescription:
      "Closeout found open scope. Keep the package active and continue the remaining work instead of closing it.",
    draftTitle: "Prepare Continue Decision",
    family: "closeout",
    familyLabel: "Closeout",
    modalDescription:
      "Closeout decisions separate completed evidence from remaining work before changing package posture.",
    modalKicker: "Closeout Decision",
    receiptActionLabel: "Record Continue Receipt",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records the decision to continue remaining work and keep the package nonterminal.",
    receiptProjection: "package stays in progress with remaining work visible",
    receiptTitle: "Continue Decision Recorded",
    reviewActionLabel: "Review Continue",
    reviewable: true,
  },
  defer: {
    applyDescription:
      "Confirm parking reason, retained history, and resume path before removing the package from active focus.",
    applyTitle: "Review Parking Decision",
    draftDescription:
      "Park open work outside active focus while preserving package history and a resume path.",
    draftTitle: "Prepare Defer Decision",
    family: "parking",
    familyLabel: "Parking",
    modalDescription:
      "Parking actions intentionally move work out of active focus without pretending the work is complete.",
    modalKicker: "Parking Action",
    receiptActionLabel: "Record Parking Receipt",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records the parking intent locally. Future OOS wiring will produce the durable receipt.",
    receiptProjection: "package projects as deferred after read-model refresh",
    receiptTitle: "Parking Intent Recorded",
    reviewActionLabel: "Review Parking",
    reviewable: true,
  },
  "edit-work-tree": {
    applyDescription:
      "Tree edits are made inline on the ART Tree surface; this modal fallback must not be used for the edit path.",
    applyTitle: "Inline Tree Edit",
    draftDescription:
      "Switch to ART Tree edit mode and adjust the selected tree directly.",
    draftTitle: "Open Inline Tree Edit",
    family: "work-tree",
    familyLabel: "Work Tree",
    modalDescription:
      "Execution tree editing belongs on the inline ART Tree surface, not in an action workflow modal.",
    modalKicker: "Inline Tree Edit",
    receiptActionLabel: "Back to Board",
    receiptCategory: "accepted",
    receiptDescription:
      "Inline tree edits stay as local draft state until future OOS work-item write wiring exists.",
    receiptProjection: "local tree draft only",
    receiptTitle: "Inline Edit Draft",
    reviewActionLabel: "Open ART Tree",
    reviewable: false,
  },
  "open-audit-trail": {
    applyDescription: "Audit Trail is read-only and has no apply step.",
    applyTitle: "Audit Trail",
    draftDescription: "Inspect package-scoped events, receipts, and decisions.",
    draftTitle: "Inspect Audit Trail",
    family: "inspect",
    familyLabel: "Inspect",
    modalDescription: "Read-only package-scoped history.",
    modalKicker: "Audit Trail",
    receiptActionLabel: "Close",
    receiptCategory: "accepted",
    receiptDescription: "Audit inspection does not create a mutation receipt.",
    receiptProjection: "no package mutation",
    receiptTitle: "Audit Trail Closed",
    reviewActionLabel: "Close",
    reviewable: false,
  },
  "open-closeout": {
    applyDescription:
      "Review completion evidence, remaining child work, and whether a terminal closeout path is actually ready.",
    applyTitle: "Review Closeout Evidence",
    draftDescription:
      "Inspect closeout evidence before deciding whether the package can close or must continue remaining work.",
    draftTitle: "Prepare Closeout Review",
    family: "closeout",
    familyLabel: "Closeout",
    modalDescription:
      "Closeout opens as evidence review first; final terminal mutation requires a later accepted closeout route.",
    modalKicker: "Closeout Review",
    receiptActionLabel: "Record Review Receipt",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records that closeout evidence was reviewed; it does not force terminal completion.",
    receiptProjection:
      "closeout evidence reviewed; package posture waits for final decision",
    receiptTitle: "Closeout Review Recorded",
    reviewActionLabel: "Review Closeout",
    reviewable: true,
  },
  "open-details": {
    applyDescription: "Package Details is read-only and has no apply step.",
    applyTitle: "Package Details",
    draftDescription: "Inspect package metadata, evidence, and tree context.",
    draftTitle: "Inspect Package Details",
    family: "inspect",
    familyLabel: "Inspect",
    modalDescription:
      "Read-only package context, lineage, and projected child shape.",
    modalKicker: "Package Details",
    receiptActionLabel: "Close",
    receiptCategory: "accepted",
    receiptDescription:
      "Package detail inspection does not create a mutation receipt.",
    receiptProjection: "no package mutation",
    receiptTitle: "Package Details Closed",
    reviewActionLabel: "Close",
    reviewable: false,
  },
  resume: {
    applyDescription:
      "Confirm the resume reason and expected ready posture before returning parked work to active focus.",
    applyTitle: "Review Resume Decision",
    draftDescription:
      "Return parked work to a nonterminal execution posture after operator review.",
    draftTitle: "Prepare Resume Decision",
    family: "parking",
    familyLabel: "Parking",
    modalDescription:
      "Resume actions bring intentionally parked work back into active delivery focus.",
    modalKicker: "Parking Action",
    receiptActionLabel: "Record Resume Receipt",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records the resume intent locally. Future OOS wiring will refresh package posture.",
    receiptProjection: "package projects as ready after read-model refresh",
    receiptTitle: "Resume Intent Recorded",
    reviewActionLabel: "Review Resume",
    reviewable: true,
  },
  retire: {
    applyDescription:
      "Confirm the superseded or invalid scope evidence before moving work to terminal inactive posture.",
    applyTitle: "Review Retirement",
    draftDescription:
      "Retire invalid or superseded work with explicit evidence and retained audit history.",
    draftTitle: "Prepare Retirement Decision",
    family: "lifecycle",
    familyLabel: "Lifecycle",
    modalDescription:
      "Retirement is terminal and should only happen with clear evidence.",
    modalKicker: "Lifecycle Action",
    receiptActionLabel: "Record Retirement Receipt",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records the retirement intent locally. Future OOS wiring will return durable evidence.",
    receiptProjection: "package projects as retired after read-model refresh",
    receiptTitle: "Retirement Intent Recorded",
    reviewActionLabel: "Review Retirement",
    reviewable: true,
  },
  "start-work": {
    applyDescription:
      "Confirm selected execution target, OOS route, and gate checks before moving work into progress.",
    applyTitle: "Review Start Work",
    draftDescription:
      "Move the selected execution target into active work after confirming readiness and source revision.",
    draftTitle: "Prepare Start Work",
    family: "lifecycle",
    familyLabel: "Lifecycle",
    modalDescription:
      "Start Work prepares an OOS action draft for the selected execution target.",
    modalKicker: "Lifecycle Action",
    receiptActionLabel: "Record Start Receipt",
    receiptCategory: "accepted",
    receiptDescription:
      "The prototype records the start-work intent locally. Future OOS/WGCF wiring will replace this with a durable receipt.",
    receiptProjection:
      "selected execution target projects as in progress after read-model refresh",
    receiptTitle: "Start Work Intent Recorded",
    reviewActionLabel: "Review Start",
    reviewable: true,
  },
  "sync-owner-repo": {
    applyDescription:
      "Confirm the Repository admission ref, Catalog add/link/sync requirement, and later OOS owner_repo update boundary.",
    applyTitle: "Review Owner Repo Gap",
    draftDescription:
      "Prepare the Owner Repo catalog handoff. Repository owns the repo record; Catalog must add, link, and sync the value before Execution applies it.",
    draftTitle: "Prepare Owner Repo Catalog Entry",
    family: "source-custody",
    familyLabel: "Source Custody",
    modalDescription:
      "Owner Repo repair records the execution gap without pretending the backend catalog add/link/sync route exists yet.",
    modalKicker: "Source Custody",
    receiptActionLabel: "Record Sync Requirement",
    receiptCategory: "projection_sync_required",
    receiptDescription:
      "The prototype records that a manual Catalog Owner Repo add/link/sync workflow is required before the OOS work-item update can apply the admitted repository.",
    receiptProjection:
      "package remains blocked until Catalog adds, links, and syncs the Owner Repo value",
    receiptTitle: "Owner Repo Sync Requirement Recorded",
    reviewActionLabel: "Review Sync Requirement",
    reviewable: true,
  },
  "view-art-tree": {
    applyDescription: "ART Tree inspection is read-only and has no apply step.",
    applyTitle: "View ART Tree",
    draftDescription: "Inspect package hierarchy without mutating ART.",
    draftTitle: "Inspect ART Tree",
    family: "inspect",
    familyLabel: "Inspect",
    modalDescription: "Read-only hierarchy inspection.",
    modalKicker: "ART Tree",
    receiptActionLabel: "Close",
    receiptCategory: "accepted",
    receiptDescription: "Tree inspection does not create a mutation receipt.",
    receiptProjection: "no package mutation",
    receiptTitle: "ART Tree Closed",
    reviewActionLabel: "Close",
    reviewable: false,
  },
};
