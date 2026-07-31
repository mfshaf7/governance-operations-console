import type { ProposalWorkspaceScenario } from "../../domain/proposal-types.ts";

export const proposalWorkspaceScenarios: ProposalWorkspaceScenario[] = [
  {
    bodyPreview:
      "Operator-created request for Portfolio posture tracking. Proposal keeps it parked and owner-routes the operator to Portfolio registration.",
    evidence: [
      {
        detail:
          "The request is about visibility/readiness posture for an existing item, not new build work.",
        id: "request-purpose",
        label: "Wrong surface",
        observedAt: "2026-06-21 08:20",
        owner: "Workspace Proposals",
        requiredAction: "Register the existing item through Portfolio.",
        source: {
          kind: "source-record",
          label: "Proposal record",
          ref: "proposal://backend/PR-740",
        },
        state: "informational",
      },
      {
        detail:
          "Portfolio registration owns existing-item posture requests; Proposal should not route this directly.",
        id: "owner-route",
        label: "Owner-routed",
        observedAt: "2026-06-21 08:20",
        owner: "Workspace Proposals",
        source: {
          kind: "system",
          label: "Proposal routing assessment",
        },
        state: "reference",
      },
    ],
    handoffRule:
      "Keep parked in Proposal and handle this through Portfolio registration if the existing item needs posture tracking.",
    backendRecordId: "proposal://backend/PR-740",
    id: "PR-740",
    ingress: "console",
    lastEvent: "Draft saved from console capture",
    lastProjectionUpdate: "2026-06-21 08:20",
    owner: "Workspace Proposals",
    projectionState: "current",
    recordVersion: "v3",
    repoGate: {
      detail:
        "No Proposal repository gate is needed because this should be handled by Portfolio registration.",
      mode: "not-required",
      owner: null,
      ref: null,
      state: "not-required",
    },
    recordedAt: "2026-06-21 08:20",
    routeTarget: "Workspace Proposals",
    scenarioKind: "parked-decision-revisitable",
    status: "parked",
    title: "Portfolio posture registration request",
    tone: "muted",
  },
  {
    bodyPreview:
      "API-fed request asks for a prototype exploration of a lightweight onboarding checklist before any Delivery commitment.",
    evidence: [
      {
        detail:
          "The request needs product shape exploration before it can become governed delivery work.",
        id: "prototype-route",
        label: "Prototype route",
        observedAt: "2026-06-21 10:04",
        owner: "Workspace Proposals",
        source: {
          kind: "source-record",
          label: "Proposal record",
          ref: "proposal://backend/PR-855",
        },
        state: "clear",
      },
      {
        detail:
          "Prototype Studio owns Landing and support-profile completion after handoff.",
        id: "landing-required",
        label: "Landing required",
        observedAt: "2026-06-21 10:04",
        owner: "Workspace Prototype Studio",
        requiredAction: "Complete Prototype Landing after handoff.",
        source: {
          kind: "system",
          label: "Prototype handoff contract",
        },
        state: "review",
      },
    ],
    handoffRule:
      "Route to Prototype Studio. Landing must complete support profile, source home, preview need, and setup choices before candidate promotion.",
    backendRecordId: "proposal://backend/PR-855",
    id: "PR-855",
    ingress: "api",
    lastEvent: "Prototype route selected from proposal projection",
    lastProjectionUpdate: "2026-06-21 10:04",
    owner: "Workspace Prototype Studio",
    projectionState: "current",
    recordVersion: "v2",
    repoGate: {
      detail:
        "Workspace Prototype Studio is the incubation repo for this handoff.",
      mode: "existing",
      owner: "workspace-prototype-studio",
      ref: "repo://workspace-prototype-studio",
      state: "clear",
    },
    recordedAt: "2026-06-21 10:04",
    routeTarget: "Prototype",
    scenarioKind: "handoff-review-current",
    status: "ready-to-route",
    title: "Onboarding checklist prototype",
    tone: "warn",
  },
  {
    bodyPreview:
      "API-fed source packet proposed a Delivery work item after runtime packaging evidence changed.",
    evidence: [
      {
        detail:
          "The admitted source packet maps to a Delivery handoff candidate.",
        id: "source-packet",
        label: "Source packet",
        observedAt: "2026-06-21 09:42",
        owner: "Workspace Proposals",
        source: {
          kind: "source-record",
          label: "Proposal source packet",
          ref: "proposal://backend/PR-812",
        },
        state: "clear",
      },
      {
        detail:
          "Route target is already Delivery; operator review must record the handoff posture.",
        id: "route-clear",
        label: "Route clear",
        observedAt: "2026-06-21 09:42",
        owner: "Workspace Proposals",
        requiredAction: "Review and apply the Delivery handoff.",
        source: {
          kind: "system",
          label: "Proposal route assessment",
        },
        state: "clear",
      },
    ],
    handoffRule:
      "Route-clear proposals need handoff review; movement after handoff is owned outside Proposal.",
    backendRecordId: "proposal://backend/PR-812",
    id: "PR-812",
    ingress: "api",
    lastEvent: "Source packet admitted from proposal API",
    lastProjectionUpdate: "2026-06-21 09:42",
    owner: "Workspace Proposals",
    projectionState: "current",
    recordVersion: "v7",
    repoGate: {
      detail: "Registered owner repo is available for the Delivery handoff.",
      mode: "existing",
      owner: "operator-orchestration-service",
      ref: "repo://operator-orchestration-service",
      state: "clear",
    },
    recordedAt: "2026-06-21 09:42",
    routeTarget: "Delivery",
    scenarioKind: "handoff-review-current",
    status: "ready-to-route",
    title: "Runtime evidence handoff",
    tone: "warn",
  },
  {
    bodyPreview:
      "API-fed proposal references an unknown source event and needs source context before triage can continue.",
    evidence: [
      {
        detail:
          "Projection contains a source reference that the current proposal source cannot resolve.",
        id: "missing-source",
        label: "Missing source",
        observedAt: "2026-06-21 09:31",
        owner: "Source adapter",
        requiredAction: "Refresh the source context before triage resumes.",
        source: {
          kind: "source-record",
          label: "Proposal source projection",
          ref: "proposal://backend/PR-826",
        },
        state: "missing",
      },
      {
        detail:
          "Proposal must remain in Workspace Proposals until source context is refreshed.",
        id: "triage-hold",
        label: "Triage hold",
        observedAt: "2026-06-21 09:31",
        owner: "Workspace Proposals",
        requiredAction: "Restore source context.",
        source: {
          kind: "system",
          label: "Proposal triage gate",
        },
        state: "blocked",
      },
    ],
    handoffRule: "Do not route this proposal until source context is restored.",
    backendRecordId: "proposal://backend/PR-826",
    id: "PR-826",
    ingress: "system",
    lastEvent: "Source context missing",
    lastProjectionUpdate: "2026-06-21 09:31",
    owner: "Source adapter",
    projectionState: "stale",
    recordVersion: "v2",
    repoGate: {
      detail:
        "Repository decision is not evaluated until source context is restored.",
      mode: "not-required",
      owner: null,
      ref: null,
      state: "not-required",
    },
    recordedAt: "2026-06-21 09:31",
    routeTarget: "Workspace Proposals",
    scenarioKind: "source-context-stale",
    status: "waiting-on-source",
    title: "Unmatched backend trigger payload",
    tone: "warn",
  },
  {
    bodyPreview:
      "Accepted proposal requires a repository decision before the Delivery route packet can be assembled.",
    evidence: [
      {
        detail:
          "Triage selected Delivery, but the repository owner is not yet resolved.",
        id: "repository-needed",
        label: "Repository needed",
        observedAt: "2026-06-21 09:18",
        owner: "Repository operation",
        requiredAction: "Resolve the repository owner and reference.",
        source: {
          kind: "source-record",
          label: "Repository request",
          ref: "repo-request://governance-graph-repair-tooling",
        },
        state: "missing",
      },
      {
        detail:
          "Route packet must wait for repository operation context before handoff.",
        id: "handoff-blocked",
        label: "Handoff blocked",
        observedAt: "2026-06-21 09:18",
        owner: "Workspace Proposals",
        requiredAction: "Open Repository operation and resolve the request.",
        source: {
          kind: "system",
          label: "Proposal repository gate",
        },
        state: "blocked",
      },
    ],
    handoffRule:
      "Keep the selected Delivery route, but block handoff until Repository operation resolves the owner repo.",
    backendRecordId: "proposal://backend/PR-839",
    id: "PR-839",
    ingress: "console",
    lastEvent: "Triage selected Delivery route",
    lastProjectionUpdate: "2026-06-21 09:18",
    owner: "Workspace Delivery ART",
    projectionState: "current",
    recordVersion: "v4",
    repoGate: {
      detail:
        "Triage selected Delivery, but the repository owner is not yet resolved.",
      mode: "new",
      owner: null,
      ref: "repo-request://governance-graph-repair-tooling",
      state: "blocked",
    },
    recordedAt: "2026-06-21 09:18",
    routeTarget: "Delivery",
    scenarioKind: "repository-gate-blocked",
    status: "waiting-on-repository",
    title: "Governance graph repair tooling",
    tone: "warn",
  },
  {
    bodyPreview:
      "Agent-fed proposal selected Prototype Studio for exploration. Baseline and data-mode evidence are completed inside Prototype after handoff.",
    evidence: [
      {
        detail:
          "The proposal is accepted for Prototype exploration instead of governed Delivery work.",
        id: "prototype-route",
        label: "Prototype route",
        observedAt: "2026-06-21 08:56",
        owner: "Workspace Proposals",
        source: {
          kind: "source-record",
          label: "Proposal record",
          ref: "proposal://backend/PR-846",
        },
        state: "clear",
      },
      {
        detail:
          "Prototype landing owns baseline, data-mode, support profile, and preview setup after handoff.",
        id: "prototype-follow-up",
        label: "Prototype follow-up",
        observedAt: "2026-06-21 08:56",
        owner: "Workspace Prototype Studio",
        requiredAction: "Complete Prototype Landing after handoff.",
        source: {
          kind: "system",
          label: "Prototype handoff contract",
        },
        state: "review",
      },
    ],
    handoffRule:
      "Route to Prototype Studio. Proposal handoff only passes the accepted source context; Prototype owns landing and baseline evidence.",
    backendRecordId: "proposal://backend/PR-846",
    id: "PR-846",
    ingress: "agent",
    lastEvent: "Prototype route selected from proposal projection",
    lastProjectionUpdate: "2026-06-21 08:56",
    owner: "Workspace Proposals",
    projectionState: "current",
    recordVersion: "v5",
    repoGate: {
      detail:
        "Workspace Prototype Studio is the incubation repo for this handoff.",
      mode: "existing",
      owner: "workspace-prototype-studio",
      ref: "repo://workspace-prototype-studio",
      state: "clear",
    },
    recordedAt: "2026-06-21 08:56",
    routeTarget: "Prototype",
    scenarioKind: "handoff-review-current",
    status: "ready-to-route",
    title: "Prototype review workspace",
    tone: "warn",
  },
];
