import type {
  ProductReleaseOperationCapability,
  ProductRuntimeLifecycleStateCapability,
  ProductRuntimeLifecycleTransitionCapability,
} from "../model/product-release-capability.ts";

export const openClawReleaseOperationFixtures = [
  {
    action: "record-release-candidate",
    adapter: {
      available: true,
      ref: "prototype-local://environment-lifecycle/product-release/record-release-candidate",
      unavailableReason: null,
    },
    description:
      "Record the immutable source bundle and image digest that define the stage candidate.",
    fields: [
      {
        description: "Immutable source-bundle reference.",
        id: "source-bundle-ref",
        kind: "text",
        label: "Source bundle reference",
        options: [],
        required: true,
      },
      {
        description: "Immutable image digest promoted through the release path.",
        id: "image-digest",
        kind: "text",
        label: "Image digest",
        options: [],
        required: true,
      },
    ],
    requiredCapability: "platform:openclaw-release-record",
    workflowOwner: "platform-engineering",
  },
  {
    action: "record-stage-verification",
    adapter: {
      available: true,
      ref: "prototype-local://environment-lifecycle/product-release/record-stage-verification",
      unavailableReason: null,
    },
    description:
      "Record operator-reviewable rehearsal evidence for the exact current candidate.",
    fields: [
      {
        description: "Reference to the complete stage rehearsal evidence.",
        id: "evidence-ref",
        kind: "text",
        label: "Evidence reference",
        options: [],
        required: true,
      },
      {
        description: "Optional operator context for the recorded result.",
        id: "note",
        kind: "textarea",
        label: "Operator note",
        options: [],
        required: false,
      },
    ],
    requiredCapability: "platform:openclaw-stage-verification",
    workflowOwner: "platform-engineering",
  },
  {
    action: "record-readiness",
    adapter: {
      available: true,
      ref: "prototype-local://environment-lifecycle/product-release/record-readiness",
      unavailableReason: null,
    },
    description:
      "Record the readiness decision for the verified stage candidate.",
    fields: [
      {
        description: "Approve the exact candidate or reset stale readiness.",
        id: "readiness-decision",
        kind: "select",
        label: "Readiness decision",
        options: [
          { label: "Select decision", value: "" },
          { label: "Approve", value: "approve" },
          { label: "Reset", value: "reset" },
        ],
        required: true,
      },
      {
        description: "Explain the decision for later review.",
        id: "reason",
        kind: "textarea",
        label: "Decision reason",
        options: [],
        required: true,
      },
    ],
    requiredCapability: "platform:openclaw-stage-readiness",
    workflowOwner: "platform-engineering",
  },
  {
    action: "request-prod-promotion",
    adapter: {
      available: true,
      ref: "prototype-local://environment-lifecycle/product-release/request-prod-promotion",
      unavailableReason: null,
    },
    description:
      "Request promotion of the exact approved stage candidate without rebuilding it.",
    fields: [
      {
        description: "Explain why the approved candidate should move to prod.",
        id: "reason",
        kind: "textarea",
        label: "Promotion reason",
        options: [],
        required: true,
      },
    ],
    requiredCapability: "platform:openclaw-prod-promotion",
    workflowOwner: "platform-engineering",
  },
  {
    action: "record-prod-verification",
    adapter: {
      available: true,
      ref: "prototype-local://environment-lifecycle/product-release/record-prod-verification",
      unavailableReason: null,
    },
    description:
      "Record post-promotion evidence for the exact current prod contract.",
    fields: [
      {
        description: "Reference to the complete prod verification evidence.",
        id: "evidence-ref",
        kind: "text",
        label: "Evidence reference",
        options: [],
        required: true,
      },
      {
        description: "Optional operator context for the recorded result.",
        id: "note",
        kind: "textarea",
        label: "Operator note",
        options: [],
        required: false,
      },
    ],
    requiredCapability: "platform:openclaw-prod-verification",
    workflowOwner: "platform-engineering",
  },
] as const satisfies readonly ProductReleaseOperationCapability[];

export const openClawRuntimeLifecycleStateFixtures = [
  {
    description:
      "Serve the governed prod runtime through its normal operator paths.",
    id: "live",
    label: "Live",
  },
  {
    description:
      "Keep supporting platform services while stopping OpenClaw traffic.",
    id: "traffic-stopped",
    label: "Traffic stopped",
  },
  {
    description:
      "Preserve the governed contract while the prod runtime remains inactive.",
    id: "suspended",
    label: "Suspended",
  },
  {
    description:
      "Isolate the prod runtime under an explicitly referenced incident.",
    id: "quarantined",
    label: "Quarantined",
  },
] as const satisfies readonly ProductRuntimeLifecycleStateCapability[];

export const openClawRuntimeLifecycleTransitionFixtures =
  openClawRuntimeLifecycleStateFixtures.flatMap((fromState) =>
    openClawRuntimeLifecycleStateFixtures
      .filter((toState) => toState.id !== fromState.id)
      .map((toState) =>
        openClawRuntimeLifecycleTransition(
          fromState.id,
          toState.id,
        ),
      ),
  );

assertOpenClawRuntimeLifecycleTransitions(
  openClawRuntimeLifecycleTransitionFixtures,
);

function openClawRuntimeLifecycleTransition(
  fromStateId: string,
  toStateId: string,
): ProductRuntimeLifecycleTransitionCapability {
  const quarantineRecovery =
    fromStateId === "quarantined" && toStateId === "live";

  return {
    description:
      toStateId === "live"
        ? quarantineRecovery
          ? "Restore the governed runtime after incident follow-up and reset production verification to pending."
          : "Restore the governed runtime and reset production verification to pending."
        : toStateId === "quarantined"
          ? "Isolate the runtime under an incident and make production verification inactive."
          : toStateId === "traffic-stopped"
            ? "Stop product traffic, retain declared support surfaces, and make production verification inactive."
            : "Suspend the governed runtime and make production verification inactive.",
    fromStateId,
    incidentRequirement:
      toStateId === "quarantined"
        ? "incident"
        : quarantineRecovery
          ? "incident-follow-up"
          : "none",
    toStateId,
    verificationEffect: toStateId === "live" ? "pending" : "inactive",
  };
}

function assertOpenClawRuntimeLifecycleTransitions(
  transitions: readonly ProductRuntimeLifecycleTransitionCapability[],
): void {
  if (
    transitions.some(
      (transition) =>
        transition.toStateId === "quarantined" &&
        transition.incidentRequirement === "none",
    )
  ) {
    throw new Error(
      "OpenClaw quarantine transitions require incident context.",
    );
  }

  const quarantineRecovery = transitions.find(
    (transition) =>
      transition.fromStateId === "quarantined" &&
      transition.toStateId === "live",
  );
  if (
    !quarantineRecovery ||
    quarantineRecovery.incidentRequirement !== "incident-follow-up" ||
    quarantineRecovery.verificationEffect !== "pending"
  ) {
    throw new Error(
      "OpenClaw quarantine recovery requires incident follow-up and fresh verification.",
    );
  }
}
