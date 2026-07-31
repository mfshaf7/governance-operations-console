import {
  TerasFieldStack,
  TerasNoteField,
  TerasSelectField,
  TerasTextField,
  TerasWizardPanel,
  type TerasTone,
} from "@/teras";

import type {
  ProductRuntimeLifecycleCapability,
} from "../../../model/product-release-capability";
import {
  selectProductRuntimeLifecycleTransition,
} from "../../../model/product-release-capability";
import type {
  ProductRuntimeLifecycleDraft,
} from "../../../work-model/product-release/product-release-action-draft";

export type ProductRuntimeLifecycleCheck = Readonly<{
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
}>;

export function buildProductRuntimeLifecycleChecks(
  draft: ProductRuntimeLifecycleDraft,
  lifecycle: ProductRuntimeLifecycleCapability,
): readonly ProductRuntimeLifecycleCheck[] {
  const transition = selectProductRuntimeLifecycleTransition(
    lifecycle,
    draft.targetState,
  );
  const incidentComplete =
    transition?.incidentRequirement === "none" ||
    Boolean(draft.incidentRef.trim());

  return [
    {
      detail: "Choose a state declared by this product lifecycle contract.",
      id: "target-state",
      label: "Target state",
      status: transition ? "Ready" : "Required",
      tone: transition ? "ok" : "warn",
    },
    {
      detail: "Explain why the runtime lifecycle should change.",
      id: "reason",
      label: "Lifecycle reason",
      status: draft.reason.trim() ? "Ready" : "Required",
      tone: draft.reason.trim() ? "ok" : "warn",
    },
    {
      detail:
        transition?.incidentRequirement === "incident-follow-up"
          ? "Returning from quarantine requires an incident follow-up reference."
          : transition?.incidentRequirement === "incident"
            ? "This transition requires an incident reference."
            : "The selected transition does not require incident context.",
      id: "incident-reference",
      label:
        transition?.incidentRequirement === "incident-follow-up"
          ? "Incident follow-up"
          : "Incident reference",
      status: transition
        ? transition.incidentRequirement !== "none"
          ? incidentComplete
            ? "Ready"
            : "Required"
          : "Not required"
        : "Pending target",
      tone: transition
        ? transition.incidentRequirement !== "none"
          ? incidentComplete
            ? "ok"
            : "warn"
          : "muted"
        : "muted",
    },
  ];
}

export function ProductRuntimeLifecycleIntentStep({
  draft,
  lifecycle,
  onChange,
}: {
  draft: ProductRuntimeLifecycleDraft;
  lifecycle: ProductRuntimeLifecycleCapability;
  onChange: (update: Partial<ProductRuntimeLifecycleDraft>) => void;
}) {
  const targetState =
    lifecycle.states.find(
      (state) => state.id === draft.targetState,
    ) ?? null;
  const targetTransition = selectProductRuntimeLifecycleTransition(
    lifecycle,
    draft.targetState,
  );
  const targetStateIds = new Set(
    lifecycle.transitions
      .filter(
        (transition) =>
          transition.fromStateId === lifecycle.currentState,
      )
      .map((transition) => transition.toStateId),
  );

  return (
    <TerasWizardPanel
      description="Select a declared lifecycle state and record the operator reason."
      kicker="Lifecycle Intent"
      title="Runtime transition"
    >
      <TerasFieldStack spacing="normal">
        <TerasSelectField
          helper="Release progression and runtime lifecycle remain separate."
          label="Target state"
          onValueChange={(targetStateId) => {
            const transition = selectProductRuntimeLifecycleTransition(
              lifecycle,
              targetStateId,
            );

            onChange({
              incidentRef:
                transition &&
                transition.incidentRequirement !== "none"
                  ? draft.incidentRef
                  : "",
              targetState: targetStateId,
            });
          }}
          options={[
            { label: "Select target state", value: "" },
            ...lifecycle.states
              .filter((state) => targetStateIds.has(state.id))
              .map((state) => ({
                label: state.label,
                value: state.id,
              })),
          ]}
          value={draft.targetState}
        />
        <TerasNoteField
          label="Lifecycle reason"
          minimumHeight="short"
          onValueChange={(reason) => onChange({ reason })}
          placeholder="Why this runtime state should change."
          value={draft.reason}
        />
        {targetTransition &&
        targetTransition.incidentRequirement !== "none" ? (
          <TerasTextField
            label={
              targetTransition?.incidentRequirement ===
              "incident-follow-up"
                ? "Incident follow-up reference"
                : "Incident reference"
            }
            onValueChange={(incidentRef) => onChange({ incidentRef })}
            placeholder={
              targetTransition?.incidentRequirement ===
              "incident-follow-up"
                ? "Required to return from quarantine."
                : "Required by the selected transition."
            }
            value={draft.incidentRef}
          />
        ) : null}
      </TerasFieldStack>
    </TerasWizardPanel>
  );
}
