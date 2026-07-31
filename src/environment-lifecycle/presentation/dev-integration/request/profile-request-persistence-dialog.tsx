import {
  TerasActionButton,
  TerasDialog,
  TerasFieldGrid,
  TerasNoteField,
  TerasSelectField,
} from "@/teras";

import type {
  DevIntegrationProfileRequestDraft,
} from "../../../work-model/profile-request/dev-integration-profile-request-draft";

export function ProfileRequestPersistenceDialog({
  disposableProfileIds,
  draft,
  onChange,
  onClose,
  open,
}: {
  disposableProfileIds: readonly string[];
  draft: DevIntegrationProfileRequestDraft;
  onChange: (draft: DevIntegrationProfileRequestDraft) => void;
  onClose: () => void;
  open: boolean;
}) {
  function updatePersistence(
    field: keyof DevIntegrationProfileRequestDraft["persistence"],
    value: string,
  ) {
    onChange({
      ...draft,
      persistence: {
        ...draft.persistence,
        [field]: value,
      },
    });
  }

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      actions={
        <TerasActionButton onClick={onClose}>
          Done
        </TerasActionButton>
      }
      closeLabel="Close persistence configuration"
      description="Define retained data, reset, suspension, and replacement semantics for a persistent local runtime."
      kicker="Persistent Runtime"
      onClose={onClose}
      open={open}
      title="Persistence Configuration"
      width="large"
    >
      <TerasFieldGrid>
        <TerasNoteField
          label="Justification"
          minimumHeight="short"
          onValueChange={(value) =>
            updatePersistence("justification", value)
          }
          value={draft.persistence.justification}
        />
        <TerasNoteField
          label="Retained data scope"
          minimumHeight="short"
          onValueChange={(value) =>
            updatePersistence("retainedDataScope", value)
          }
          value={draft.persistence.retainedDataScope}
        />
        <TerasNoteField
          label="Storage requirement"
          minimumHeight="short"
          onValueChange={(value) =>
            updatePersistence("storageRequirement", value)
          }
          value={draft.persistence.storageRequirement}
        />
        <TerasNoteField
          label="Suspend and resume semantics"
          minimumHeight="short"
          onValueChange={(value) =>
            updatePersistence("suspendResumeSemantics", value)
          }
          value={draft.persistence.suspendResumeSemantics}
        />
        <TerasNoteField
          label="Destructive reset semantics"
          minimumHeight="short"
          onValueChange={(value) =>
            updatePersistence("destructiveResetSemantics", value)
          }
          value={draft.persistence.destructiveResetSemantics}
        />
        <TerasSelectField
          helper="Optional disposable partner for clean rehearsals."
          label="Disposable companion profile"
          onValueChange={(value) =>
            updatePersistence("disposableCompanionProfileId", value)
          }
          options={[
            { label: "No companion", value: "" },
            ...disposableProfileIds.map((profileId) => ({
              label: profileId,
              value: profileId,
            })),
          ]}
          value={draft.persistence.disposableCompanionProfileId}
        />
        {draft.replacesProfileId ? (
          <TerasNoteField
            label="Replacement cutover plan"
            minimumHeight="short"
            onValueChange={(value) =>
              updatePersistence("cutoverPlan", value)
            }
            value={draft.persistence.cutoverPlan}
          />
        ) : null}
      </TerasFieldGrid>
    </TerasDialog>
  );
}
