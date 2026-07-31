import type {
  ProductReleaseOperationCapability,
  ProductRuntimeLifecycleCapability,
} from "../../model/product-release-capability.ts";
import {
  selectProductRuntimeLifecycleTransition,
} from "../../model/product-release-capability.ts";

export type ProductReleaseActionDraft = Readonly<{
  values: Readonly<Record<string, string>>;
}>;

export type ProductRuntimeLifecycleDraft = Readonly<{
  incidentRef: string;
  reason: string;
  targetState: string;
}>;

export function createProductReleaseActionDraft(
  operation: ProductReleaseOperationCapability,
): ProductReleaseActionDraft {
  return {
    values: Object.fromEntries(
      operation.fields.map((field) => [field.id, ""]),
    ),
  };
}

export function validateProductReleaseActionDraft(
  draft: ProductReleaseActionDraft,
  operation: ProductReleaseOperationCapability,
): readonly string[] {
  const errors: string[] = [];
  const declaredFieldIds = new Set(
    operation.fields.map((field) => field.id),
  );

  if (
    Object.keys(draft.values).some(
      (fieldId) => !declaredFieldIds.has(fieldId),
    )
  ) {
    errors.push("Action input contains unsupported fields.");
  }

  for (const field of operation.fields) {
    const value = draft.values[field.id]?.trim() ?? "";

    if (field.required && !value) {
      errors.push(`${field.label} is required.`);
    }
    if (
      field.kind === "select" &&
      value &&
      !field.options.some((option) => option.value === value)
    ) {
      errors.push(`${field.label} must use a supported option.`);
    }
  }

  return errors;
}

export function isProductReleaseActionDraftDirty(
  draft: ProductReleaseActionDraft,
  operation: ProductReleaseOperationCapability,
): boolean {
  return (
    JSON.stringify(draft) !==
    JSON.stringify(createProductReleaseActionDraft(operation))
  );
}

export function createProductRuntimeLifecycleDraft(): ProductRuntimeLifecycleDraft {
  return {
    incidentRef: "",
    reason: "",
    targetState: "",
  };
}

export function validateProductRuntimeLifecycleDraft(
  draft: ProductRuntimeLifecycleDraft,
  lifecycle: ProductRuntimeLifecycleCapability,
): readonly string[] {
  const errors: string[] = [];
  const transition = selectProductRuntimeLifecycleTransition(
    lifecycle,
    draft.targetState,
  );

  if (!transition) {
    errors.push("Select a supported target lifecycle state.");
  }
  if (!draft.reason.trim()) {
    errors.push("Lifecycle reason is required.");
  }
  if (
    transition &&
    transition.incidentRequirement !== "none" &&
    !draft.incidentRef.trim()
  ) {
    errors.push(
      transition?.incidentRequirement === "incident-follow-up"
        ? "This lifecycle transition requires an incident follow-up reference."
        : "This lifecycle transition requires an incident reference.",
    );
  }

  return errors;
}

export function isProductRuntimeLifecycleDraftDirty(
  draft: ProductRuntimeLifecycleDraft,
): boolean {
  return (
    JSON.stringify(draft) !==
    JSON.stringify(createProductRuntimeLifecycleDraft())
  );
}
