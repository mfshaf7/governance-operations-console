import type {
  DevIntegrationProfileHistoryEvent,
} from "../model/dev-integration-profile-history.ts";

export const devIntegrationProfileHistoryFixtures = [
  {
    detail:
      "Workspace Governance recorded the profile as active for self-serve local launch.",
    eventId: "env-history-gcf-001",
    kind: "lifecycle",
    label: "Profile activated",
    occurredAt: "2026-07-25T09:00:00Z",
    profileId: "governance-control-fabric",
    provenance: "authority-snapshot",
    sourceRef:
      "workspace-governance://developer-integration-profiles/governance-control-fabric",
  },
  {
    detail:
      "The profile-owned status adapter observed the persistent runtime running.",
    eventId: "env-history-gcf-002",
    kind: "runtime",
    label: "Runtime observed",
    occurredAt: "2026-07-26T08:00:00Z",
    profileId: "governance-control-fabric",
    provenance: "authority-snapshot",
    sourceRef:
      "devint://governance-control-fabric/status/20260726T080000Z",
  },
  {
    detail:
      "The latest promote check produced local handoff evidence marked ready.",
    eventId: "env-history-gcf-003",
    kind: "handoff",
    label: "Handoff evidence refreshed",
    occurredAt: "2026-07-26T08:05:00Z",
    profileId: "governance-control-fabric",
    provenance: "authority-snapshot",
    sourceRef:
      "devint://governance-control-fabric/promotion-report/latest",
  },
  {
    detail:
      "Workspace Governance recorded the disposable integration profile as active.",
    eventId: "env-history-idea-001",
    kind: "lifecycle",
    label: "Profile activated",
    occurredAt: "2026-07-24T10:30:00Z",
    profileId: "idea-workflow",
    provenance: "authority-snapshot",
    sourceRef:
      "workspace-governance://developer-integration-profiles/idea-workflow",
  },
  {
    detail:
      "The profile-owned status adapter observed no running disposable runtime.",
    eventId: "env-history-idea-002",
    kind: "runtime",
    label: "Runtime stopped",
    occurredAt: "2026-07-26T07:45:00Z",
    profileId: "idea-workflow",
    provenance: "authority-snapshot",
    sourceRef: "devint://idea-workflow/status/20260726T074500Z",
  },
] as const satisfies readonly DevIntegrationProfileHistoryEvent[];
