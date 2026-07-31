import {
  TerasEmptyState,
  TerasFieldStack,
  TerasNoteField,
  TerasSelectField,
  TerasTextField,
  TerasWizardPanel,
  type TerasTone,
} from "@/teras";

import type {
  ProductReleaseOperationCapability,
} from "../../../model/product-release-capability";
import type {
  ProductReleaseActionDraft,
} from "../../../work-model/product-release/product-release-action-draft";

export type ProductReleaseFieldCheck = Readonly<{
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: TerasTone;
}>;

export function buildProductReleaseFieldChecks(
  draft: ProductReleaseActionDraft,
  operation: ProductReleaseOperationCapability,
): readonly ProductReleaseFieldCheck[] {
  return operation.fields.map((field) => {
    const complete = Boolean(draft.values[field.id]?.trim());

    return {
      detail: field.description,
      id: field.id,
      label: field.label,
      status: field.required
        ? complete
          ? "Ready"
          : "Required"
        : complete
          ? "Recorded"
          : "Optional",
      tone: field.required
        ? complete
          ? "ok"
          : "warn"
        : complete
          ? "ok"
          : "muted",
    };
  });
}

export function ProductReleaseActionDetailsStep({
  draft,
  onUpdateValue,
  operation,
}: {
  draft: ProductReleaseActionDraft;
  onUpdateValue: (fieldId: string, value: string) => void;
  operation: ProductReleaseOperationCapability;
}) {
  return (
    <TerasWizardPanel
      description="Record only the operator input declared by this product operation."
      kicker="Action Details"
      title="Release input"
    >
      {operation.fields.length > 0 ? (
        <TerasFieldStack spacing="normal">
          {operation.fields.map((field) =>
            field.kind === "select" ? (
              <TerasSelectField
                helper={field.description}
                key={field.id}
                label={field.label}
                onValueChange={(value) =>
                  onUpdateValue(field.id, value)
                }
                options={field.options}
                value={draft.values[field.id] ?? ""}
              />
            ) : field.kind === "textarea" ? (
              <TerasNoteField
                key={field.id}
                label={field.label}
                minimumHeight="short"
                onValueChange={(value) =>
                  onUpdateValue(field.id, value)
                }
                placeholder={field.description}
                required={field.required}
                value={draft.values[field.id] ?? ""}
              />
            ) : (
              <TerasTextField
                key={field.id}
                label={field.label}
                onValueChange={(value) =>
                  onUpdateValue(field.id, value)
                }
                placeholder={field.description}
                required={field.required}
                value={draft.values[field.id] ?? ""}
              />
            ),
          )}
        </TerasFieldStack>
      ) : (
        <TerasEmptyState fill>
          This product operation declares no operator input.
        </TerasEmptyState>
      )}
    </TerasWizardPanel>
  );
}
