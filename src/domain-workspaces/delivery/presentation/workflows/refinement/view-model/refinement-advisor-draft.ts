import {
  refinementMetadataResolutionLabel,
  type RefinementMetadataTarget,
} from "./refinement-metadata-model.ts";

export function refinementAdvisorDraft({
  deliveryPackageName,
  draftValue,
  selectedTarget,
  sharedTargetCount,
}: {
  deliveryPackageName: string;
  draftValue: string;
  selectedTarget: RefinementMetadataTarget | undefined;
  sharedTargetCount?: number;
}): {
  reply: string;
  value: string | null;
} {
  if (!selectedTarget) {
    return {
      reply:
        "Select a metadata field first. I can read the package context and draft a local value for review.",
      value: null,
    };
  }

  const { field, group, node, sourceValue, status } = selectedTarget;
  const fieldState =
    status === "complete"
      ? "This field is already clean. Inspect it or change it only if the Work Design handoff says the value is wrong."
      : status === "blocked"
        ? "This field is blocked. Do not guess a value here; route the blocker first."
        : "This field needs an operator decision before readiness review.";
  const valueLine = `Current source value: ${sourceValue || "empty"}. Draft value: ${draftValue || "empty"}.`;
  const targetContext =
    sharedTargetCount && sharedTargetCount > 1
      ? `${sharedTargetCount} selected ART items sharing ${field.label}`
      : `selected ${node.kind} "${node.title}"`;
  const packageContext = `I used the local ${deliveryPackageName} Refinement packet, Work Design handoff summary, ${targetContext}, and metadata group ${group.title}.`;

  if (field.field_kind === "select") {
    const value = advisorSelectValue(field.allowed_values, sourceValue);

    return {
      reply: `${packageContext} I drafted ${field.label} as "${value}". ${fieldState} Allowed values are ${
        field.allowed_values?.join(", ") ?? "not loaded"
      }. ${valueLine} This is local draft metadata only and will be visible as ${refinementMetadataResolutionLabel("ai_drafted")} for review.`,
      value,
    };
  }

  if (field.field_kind === "number") {
    const value = sourceValue.match(/^\d+$/) ? sourceValue : "8";

    return {
      reply: `${packageContext} I drafted ${field.label} as "${value}" because this field expects a numeric planning value. ${fieldState} ${valueLine} Review it before apply.`,
      value,
    };
  }

  if (field.field_kind === "generated") {
    return {
      reply: `${field.label} belongs to ${node.title}. This value is generated from Work Design or plan/apply source, so I did not mutate it. ${valueLine} If it is wrong, fix the source tree or plan reconciliation instead.`,
      value: null,
    };
  }

  const narrativeValue = advisorNarrativeValue({
    deliveryPackageName,
    fieldLabel: field.label,
    sourceValue,
  });

  return {
    reply: `${packageContext} I drafted ${field.label} as: "${narrativeValue}". ${fieldState} ${valueLine} This local draft is marked ${refinementMetadataResolutionLabel("ai_drafted")} and must still be reviewed before apply.`,
    value: narrativeValue,
  };
}

function advisorSelectValue(
  allowedValues: string[] | undefined,
  sourceValue: string,
) {
  if (allowedValues?.includes(sourceValue)) {
    return sourceValue;
  }

  return allowedValues?.[0] ?? sourceValue;
}

function advisorNarrativeValue({
  deliveryPackageName,
  fieldLabel,
  sourceValue,
}: {
  deliveryPackageName: string;
  fieldLabel: string;
  sourceValue: string;
}) {
  if (fieldLabel === "Definition of Ready") {
    return `Ready when ${deliveryPackageName} stories have owner, execution classification, acceptance criteria, and dependency notes confirmed against the applied Work Design handoff.`;
  }

  if (sourceValue && sourceValue !== "Missing") {
    return sourceValue;
  }

  return `Drafted from ${deliveryPackageName} ART context; operator must confirm before apply.`;
}
