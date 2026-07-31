import {
  operationWorkbenchDomainRegistry,
  type OperationWorkbenchDomainId,
} from "./operation-workbench-domain-registry.ts";

type OperationWorkbenchSelectorMetadata = {
  availability: "available" | "unavailable";
  detail: string;
  navigationDescription: string;
  runtimeReadiness: "interactive" | "read-only" | "unavailable";
  sourceMode: "prototype-local" | "source-projected" | "unavailable";
};

const selectorMetadata = {
  proposal: {
    availability: "available",
    detail:
      "Capture, triage, and decide Workspace Proposal ideas before accepted work moves to Prototype or Delivery / ART.",
    navigationDescription: "Capture and route ideas.",
    runtimeReadiness: "interactive",
    sourceMode: "prototype-local",
  },
  repository: {
    availability: "available",
    detail:
      "Manage repository, product, component, and client-app entry before owner and lifecycle routing.",
    navigationDescription: "Govern source ownership.",
    runtimeReadiness: "interactive",
    sourceMode: "prototype-local",
  },
  "model-operations": {
    availability: "available",
    detail:
      "Inspect governed model profiles, caller eligibility, access readiness, and control evidence.",
    navigationDescription: "Inspect model readiness.",
    runtimeReadiness: "read-only",
    sourceMode: "prototype-local",
  },
  delivery: {
    availability: "available",
    detail:
      "Shape governed delivery work only after metadata readiness and landing-unit gates pass.",
    navigationDescription: "Shape governed delivery.",
    runtimeReadiness: "interactive",
    sourceMode: "prototype-local",
  },
  prototype: {
    availability: "available",
    detail:
      "Manage prototype ideas, design baselines, and graduation decisions before durable delivery.",
    navigationDescription: "Manage prototype work.",
    runtimeReadiness: "interactive",
    sourceMode: "prototype-local",
  },
  portfolio: {
    availability: "available",
    detail:
      "Curate and publish active real products for public, client, personal, or internal audiences.",
    navigationDescription: "Manage real products.",
    runtimeReadiness: "interactive",
    sourceMode: "prototype-local",
  },
  orchestration: {
    availability: "available",
    detail:
      "Qualify durable backend operations, inspect immutable definition versions, and review aggregate orchestration runs.",
    navigationDescription: "Monitor durable workflows.",
    runtimeReadiness: "interactive",
    sourceMode: "prototype-local",
  },
} as const satisfies Record<
  OperationWorkbenchDomainId,
  OperationWorkbenchSelectorMetadata
>;

export const operationWorkbenchSelectorEntries =
  operationWorkbenchDomainRegistry.map((entry) => ({
    ...entry,
    ...selectorMetadata[entry.domain],
  }));

export type OperationWorkbenchSelectorEntry =
  (typeof operationWorkbenchSelectorEntries)[number];
