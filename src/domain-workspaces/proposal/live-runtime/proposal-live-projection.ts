import type { OperationSurfaceStatusModel } from "../../operation-contracts/surface-status.ts";
import type { ProposalRepositoryGateResolution } from "../../operation-contracts/proposal-repository-request.ts";
import type { ProposalWorkspaceScenario } from "../domain/proposal-types.ts";
import type {
  ProposalDecisionDraft,
  ProposalRouteSelectionDraft,
} from "../work-model/proposal-disposition-model.ts";
import type { ProposalHandoffDraft } from "../work-model/proposal-handoff-model.ts";
import type { ProposalTriageDraft } from "../work-model/proposal-triage-model.ts";
import type { ProposalWorkflowLocalReceipt } from "../local-runtime/proposal-runtime-model.ts";
import type {
  ProposalLiveRecord,
  ProposalLiveSnapshot,
  ProposalOosEvent,
  ProposalOosProjection,
} from "./proposal-live-types.ts";

export type ProposalCanonicalDrafts = {
  decisionDrafts: Record<string, ProposalDecisionDraft>;
  handoffDrafts: Record<string, ProposalHandoffDraft>;
  repositoryGateResolutions: Record<string, ProposalRepositoryGateResolution>;
  routeSelectionDrafts: Record<string, ProposalRouteSelectionDraft>;
  triageDrafts: Record<string, ProposalTriageDraft>;
  workflowReceipts: Record<string, ProposalWorkflowLocalReceipt[]>;
};

export function projectProposalLiveRecords(
  records: ProposalLiveRecord[],
): ProposalWorkspaceScenario[] {
  return records.map(({ createdAt, projection }) =>
    projectProposalLiveRecord(projection, createdAt),
  );
}

export function projectProposalLiveRecord(
  projection: ProposalOosProjection,
  createdAt: string,
): ProposalWorkspaceScenario {
  const custody = projection.route?.source_custody ?? null;
  const repositoryPending = custody?.repository_gate_state === "pending";
  const status = proposalSurfaceStatus(projection);

  return {
    backendRecordId: projection.record_ref,
    bodyPreview: projection.body ?? "No supporting context was recorded.",
    evidence: [
      {
        detail: `${projection.record_project} / ${projection.record_version}`,
        id: `${projection.proposal_id}-source`,
        label: "Canonical source",
        observedAt: projection.updated_at,
        owner: "Workspace Proposals",
        source: {
          kind: "source-record",
          label: "OpenProject Proposal record",
          ref: projection.record_ref,
        },
        state: projection.projection_state === "current" ? "clear" : "stale",
      },
      {
        detail: projection.last_event_ref ?? "No workflow event recorded yet.",
        id: `${projection.proposal_id}-workflow`,
        label: "Workflow evidence",
        observedAt: projection.updated_at,
        owner: "Operator Orchestration Service",
        source: {
          kind: projection.last_event_ref ? "receipt" : "system",
          label: "OOS Proposal projection",
          ref: projection.last_event_ref ?? undefined,
        },
        state: projection.last_event_ref ? "reference" : "informational",
      },
    ],
    handoffRule:
      projection.route?.rationale ??
      "Triage and Disposition must be recorded before Handoff.",
    id: projection.proposal_id,
    ingress: projection.source.ingress,
    lastEvent: projection.last_event_ref ?? "Captured",
    lastProjectionUpdate: projection.updated_at,
    owner: "Workspace Proposals",
    projectionState: projection.projection_state,
    recordedAt: createdAt || projection.updated_at,
    recordVersion: projection.record_version,
    repoGate: custody
      ? {
          detail: custody.rationale,
          mode: custody.repository_mode,
          owner: custody.owner,
          ref: custody.source_ref,
          state: repositoryPending
            ? "blocked"
            : custody.repository_gate_state === "resolved"
              ? "clear"
              : "not-required",
        }
      : {
          detail: "Repository custody has not been selected.",
          mode: "not-required",
          owner: null,
          ref: null,
          state: "not-required",
        },
    routeTarget:
      projection.route?.target === "delivery"
        ? "Delivery"
        : projection.route?.target === "prototype"
          ? "Prototype"
          : "Workspace Proposals",
    scenarioKind:
      projection.projection_state === "stale"
        ? "source-context-stale"
        : repositoryPending
          ? "repository-gate-blocked"
          : status === "captured" || status === "triaged"
            ? "operator-capture-current"
            : status === "parked"
              ? "parked-decision-revisitable"
              : "handoff-review-current",
    status,
    title: projection.title,
    tone: proposalSurfaceTone(projection),
  };
}

export function projectProposalCanonicalDrafts(
  records: ProposalLiveRecord[],
): ProposalCanonicalDrafts {
  const projection: ProposalCanonicalDrafts = {
    decisionDrafts: {},
    handoffDrafts: {},
    repositoryGateResolutions: {},
    routeSelectionDrafts: {},
    triageDrafts: {},
    workflowReceipts: {},
  };

  for (const record of records) {
    const source = proposalSourceStamp(record.projection);
    const { proposal_id: proposalId, route, status } = record.projection;
    const triageEvent = latestEvent(record, "triaged");
    const dispositionEvent = latestEvent(record, "disposition-recorded");
    const handoffEvent = latestHandoffEvent(record);

    if (record.projection.triage_summary) {
      projection.triageDrafts[proposalId] = {
        ...source,
        advisorDraft: "",
        advisorPrompt: "",
        appliedAt: triageEvent?.occurred_at ?? record.projection.updated_at,
        appliedReceiptId: triageEvent?.receipt_refs[0],
        proposalId,
        savedAt: triageEvent?.occurred_at ?? record.projection.updated_at,
        summary: record.projection.triage_summary,
      };
    }

    if (
      record.projection.decision_notes &&
      ["accepted", "implemented", "parked", "rejected"].includes(status)
    ) {
      const outcome =
        status === "parked" || status === "rejected" ? status : "accepted";
      projection.decisionDrafts[proposalId] = {
        ...source,
        appliedAt: dispositionEvent?.occurred_at ?? record.projection.updated_at,
        appliedReceiptId: dispositionEvent?.receipt_refs[0],
        notes: record.projection.decision_notes,
        outcome,
        proposalId,
        savedAt: dispositionEvent?.occurred_at ?? record.projection.updated_at,
      };
    }

    if (route) {
      projection.routeSelectionDrafts[proposalId] = {
        ...source,
        appliedAt: dispositionEvent?.occurred_at ?? record.projection.updated_at,
        appliedReceiptId: dispositionEvent?.receipt_refs[0],
        proposalId,
        rationale: route.rationale,
        repoMode: route.source_custody.repository_mode,
        repoOwner: route.source_custody.owner ?? "Repository Operation",
        repoRef:
          route.source_custody.source_ref ??
          `repo-request://proposal/${proposalId.replace(/^idea-/, "idea-")}`,
        routeTarget: route.target === "delivery" ? "Delivery" : "Prototype",
        savedAt: dispositionEvent?.occurred_at ?? record.projection.updated_at,
      };

      if (
        route.source_custody.repository_gate_state === "resolved" &&
        route.source_custody.owner &&
        route.source_custody.source_ref
      ) {
        projection.repositoryGateResolutions[proposalId] = {
          notes: route.source_custody.rationale,
          proposalId,
          recordedAt: record.projection.updated_at,
          receiptId: `repository-resolution:${proposalId}:${record.projection.record_version}`,
          repoRequestRef: `repo-request://proposal/${proposalId}`,
          resolvedOwner: route.source_custody.owner,
          resolvedRepoRef: route.source_custody.source_ref,
          result: "resolved",
          sourceVersion: record.projection.record_version,
        };
      }
    }

    if (record.projection.handoff.state !== "not-requested") {
      projection.handoffDrafts[proposalId] = {
        ...source,
        appliedAt: handoffEvent?.occurred_at ?? record.projection.updated_at,
        appliedReceiptId: handoffEvent?.receipt_refs[0],
        notes: handoffEvent?.summary ?? "Canonical handoff review recorded.",
        proposalId,
        result:
          record.projection.handoff.state === "blocked" ? "blocked" : "ready",
        savedAt: handoffEvent?.occurred_at ?? record.projection.updated_at,
      };
    }

    projection.workflowReceipts[proposalId] = proposalLiveReceipts(record);
  }

  return projection;
}

export function proposalLiveWorkspaceStatus(
  snapshot: ProposalLiveSnapshot | null,
): OperationSurfaceStatusModel {
  if (!snapshot) {
    return statusModel("syncing", "Proposal source is loading", "Loading canonical Proposal records.");
  }
  if (snapshot.mode === "disconnected-preview") {
    return statusModel(
      "local",
      "Proposal workspace is in disconnected preview",
      "Synthetic Proposal records and local receipts are active because no OOS endpoint is configured.",
    );
  }
  if (snapshot.status === "offline") {
    return statusModel(
      "offline",
      "Proposal source is unavailable",
      snapshot.error ?? "OOS could not provide canonical Proposal state.",
    );
  }
  return statusModel(
    "current",
    "Proposal source is current",
    "Canonical Proposal projections and writes are connected through OOS.",
  );
}

function proposalSurfaceStatus(
  projection: ProposalOosProjection,
): ProposalWorkspaceScenario["status"] {
  if (projection.projection_state !== "current") return "waiting-on-source";
  if (projection.status === "captured") return "captured";
  if (projection.status === "triaged") return "triaged";
  if (projection.status === "parked") return "parked";
  if (projection.status === "rejected" || projection.status === "implemented") {
    return "done";
  }
  return projection.route?.source_custody.repository_gate_state === "pending"
    ? "waiting-on-repository"
    : "ready-to-route";
}

function proposalSurfaceTone(
  projection: ProposalOosProjection,
): ProposalWorkspaceScenario["tone"] {
  if (projection.projection_state !== "current") return "warn";
  if (projection.status === "implemented") return "ok";
  if (projection.status === "rejected" || projection.status === "parked") {
    return "muted";
  }
  return projection.status === "accepted" ? "warn" : "info";
}

function proposalSourceStamp(projection: ProposalOosProjection) {
  return {
    sourceBackendRecordId: projection.record_ref,
    sourceProjectionState: projection.projection_state,
    sourceRecordVersion: projection.record_version,
  } as const;
}

function proposalLiveReceipts(record: ProposalLiveRecord): ProposalWorkflowLocalReceipt[] {
  return record.history.events.flatMap((event) => {
    const payload = eventPayload(event, record.projection);
    if (!payload) return [];
    return [
      {
        commandName: `proposal.${payload.step}.apply`,
        kind: "workflow",
        payload,
        proposalId: record.projection.proposal_id,
        receiptId: event.receipt_refs[0] ?? event.event_id,
        recordedAt: event.occurred_at,
        resultState: "recorded",
        schemaVersion: 1,
        sourceBackendRecordId: record.projection.record_ref,
        sourceProjectionState: "current",
        sourceRecordVersion: event.record_version,
        step: payload.step,
        summary: event.summary,
      },
    ];
  });
}

function eventPayload(event: ProposalOosEvent, projection: ProposalOosProjection) {
  if (event.event_type === "triaged") {
    return {
      advisorDraft: "",
      advisorPrompt: "",
      step: "triage" as const,
      summary: event.summary,
    };
  }
  if (event.event_type === "disposition-recorded") {
    const outcome = event.status_after === "implemented" ? "accepted" : event.status_after;
    if (outcome !== "accepted" && outcome !== "parked" && outcome !== "rejected") {
      return null;
    }
    return {
      decision: {
        advisorDraft: "",
        advisorPrompt: "",
        notes: projection.decision_notes ?? event.summary,
        outcome,
      },
      route: projection.route
        ? {
            rationale: projection.route.rationale,
            repoMode: projection.route.source_custody.repository_mode,
            repoOwner: projection.route.source_custody.owner ?? "Repository Operation",
            repoRef: projection.route.source_custody.source_ref ?? "",
            routeTarget: projection.route.target === "delivery" ? "Delivery" as const : "Prototype" as const,
          }
        : null,
      step: "disposition" as const,
    };
  }
  if (["handoff-applied", "handoff-blocked", "handoff-prepared"].includes(event.event_type)) {
    return {
      notes: event.summary,
      result: event.event_type === "handoff-blocked" ? "blocked" as const : "ready" as const,
      step: "handoff" as const,
    };
  }
  return null;
}

function latestEvent(record: ProposalLiveRecord, eventType: ProposalOosEvent["event_type"]) {
  return record.history.events.filter((event) => event.event_type === eventType).at(-1);
}

function latestHandoffEvent(record: ProposalLiveRecord) {
  return record.history.events
    .filter((event) => event.event_type.startsWith("handoff-"))
    .at(-1);
}

function statusModel(
  state: "current" | "local" | "offline" | "syncing",
  title: string,
  summary: string,
): OperationSurfaceStatusModel {
  const tone = state === "current" ? "ok" : state === "offline" ? "warn" : "info";
  return {
    ariaLabel: "Proposal workspace status details",
    detailDataAttribute: "data-proposal-status-modal",
    items: [
      {
        detail: summary,
        facts: [
          { label: "Record Authority", value: state === "local" ? "Synthetic preview" : "Workspace Proposals" },
          { label: "Mutation Adapter", value: state === "local" ? "Prototype local" : "Operator Orchestration Service" },
        ],
        id: "backend",
        label: "Proposal Source",
        state,
        tone,
      },
    ],
    kicker: "Workspace Status",
    statusLabel: state,
    summary,
    title,
    tone,
  };
}
