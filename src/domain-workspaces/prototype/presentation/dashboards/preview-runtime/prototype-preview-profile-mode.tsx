import {
  TerasActionButton,
  TerasActionRow,
  TerasStatusItem,
  TerasContentRegion,
  TerasContentTray,
  TerasDetailGrid,
  TerasDialog,
  TerasFieldGrid,
  TerasFieldStack,
  TerasMetadataList,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasList,
  TerasStatusPill,
  TerasTextField,
} from "@/teras";
import type { TerasTone } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import { prototypeSupportProfileLabel } from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";
import type { PrototypePreviewProfileDraft } from "./prototype-preview-runtime-model.ts";
import {
  prototypePreviewAddressFromDraft,
  prototypePreviewHostOptions,
  prototypePreviewLaunchAdapterOptions,
  prototypePreviewProfileCompactLabel,
  prototypePreviewProfileControlProjection,
  prototypePreviewProfileDraftChangeProjection,
  prototypePreviewProfileDraftCompletionProjection,
  prototypePreviewProfileDraftFacts,
  prototypePreviewProfileLabel,
  prototypePreviewProfileReadinessRows,
  prototypePreviewResolvedProfileFacts,
  prototypePreviewSelectedProfileFacts,
  prototypePreviewValidationRows,
} from "./prototype-preview-runtime-model.ts";

export function PrototypePreviewProfileMode({
  previewTone,
  record,
}: {
  previewTone: TerasTone;
  record: PrototypeRecord;
}) {
  const selectedProfileFacts = prototypePreviewSelectedProfileFacts(record);
  const resolvedProfileFacts = prototypePreviewResolvedProfileFacts(record);

  return (
    <TerasContentRegion fill gap="normal" scroll>
      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone="info">
              {prototypeSupportProfileLabel(record.landing.supportProfile)}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Operator-selected setup choices from Landing that drive the preview profile."
          kicker="Selected Setup"
          title="Profile selection"
        />
        <TerasMetadataList items={selectedProfileFacts} />
      </TerasPanel>

      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={previewTone}>
              {prototypePreviewProfileLabel(record)}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Resolved runtime values used by Runtime controls and local proof checks."
          kicker="Resolved Profile"
          title="Saved Preview Profile"
        />
        <TerasMetadataList items={resolvedProfileFacts} />
      </TerasPanel>
    </TerasContentRegion>
  );
}

export function PrototypePreviewProfileModeDock({
  onEditProfile,
  previewTone,
  record,
}: {
  onEditProfile: () => void;
  previewTone: TerasTone;
  record: PrototypeRecord;
}) {
  const profileControl = prototypePreviewProfileControlProjection(record);
  const validationRows = prototypePreviewValidationRows(record);

  return (
    <TerasContentRegion data-layout="profile" fill gap="normal" scroll>
      <TerasPanel
        frame="padded"
        treatment="rail"
        spacing="compact"
        tone={profileControl.tone}
      >
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={profileControl.tone}>
              {profileControl.statusLabel}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Open the profile editor only when the saved preview profile needs to change."
          kicker="Profile Control"
          title={record.preview.profileRef}
        />
        <TerasContentTray kicker="Edit boundary">
          Profile edits are explicit and prototype-local. Runtime uses the saved
          profile shown on the left until a new draft is confirmed.
        </TerasContentTray>
        <TerasActionRow spacing="normal">
          <TerasActionButton onClick={onEditProfile}>
            Edit Profile
          </TerasActionButton>
        </TerasActionRow>
      </TerasPanel>

      <TerasPanel frame="padded" treatment="neutral" spacing="compact">
        <TerasPanelHeader
          actions={
            <TerasStatusPill tone={previewTone}>
              {prototypePreviewProfileCompactLabel(record)}
            </TerasStatusPill>
          }
          actionsLayout="inline"
          description="Activation path and admission state for the saved profile."
          kicker="Profile Readiness"
          title="Runtime admission"
        />
        <TerasList frame="contained">
          {validationRows.map((row) => (
            <TerasStatusItem
              tone={row.tone}
              detail={row.detail}
              key={row.label}
              label={row.label}
              status={row.status}
            />
          ))}
        </TerasList>
      </TerasPanel>
    </TerasContentRegion>
  );
}

export function PrototypePreviewProfileEditDialog({
  draft,
  draftComplete,
  onClose,
  onConfirmProfile,
  onDraftChange,
  onSaveProfile,
  open,
  previewTone,
  record,
}: {
  draft: PrototypePreviewProfileDraft;
  draftComplete: boolean;
  onClose: () => void;
  onConfirmProfile: () => void;
  onDraftChange: <Field extends keyof PrototypePreviewProfileDraft>(
    field: Field,
    value: PrototypePreviewProfileDraft[Field],
  ) => void;
  onSaveProfile: () => void;
  open: boolean;
  previewTone: TerasTone;
  record: PrototypeRecord;
}) {
  const draftChange = prototypePreviewProfileDraftChangeProjection(
    record,
    draft,
    previewTone,
  );
  const draftCompletion = prototypePreviewProfileDraftCompletionProjection(
    draftComplete,
    previewTone,
  );
  const readinessRows = prototypePreviewProfileReadinessRows(record, draft);

  return (
    <TerasDialog
      contentOverflow="auto"
      height="content"
      actions={
        <>
          <TerasActionButton onClick={onClose} emphasis="secondary">
            Cancel
          </TerasActionButton>
          <TerasActionButton disabled={!draftComplete} onClick={onSaveProfile}>
            Save Draft
          </TerasActionButton>
          <TerasActionButton
            disabled={!draftComplete}
            onClick={onConfirmProfile}
          >
            Confirm Profile
          </TerasActionButton>
        </>
      }
      closeLabel="Close profile editor"
      description="Edit the prototype-local preview profile. Runtime keeps using the saved profile until a draft is confirmed."
      kicker="Profile Editor"
      onClose={onClose}
      open={open}
      width="large"
      title="Preview Profile Editor"
    >
      <TerasDetailGrid
        data-prototype-preview-profile-editor="true"
        variant="balanced"
      >
        <TerasPanel
          frame="padded"
          treatment="state"
          spacing="compact"
          tone={draftChange.tone}
        >
          <TerasPanelHeader
            actions={
              <TerasStatusPill tone={draftChange.tone}>
                {draftChange.statusLabel}
              </TerasStatusPill>
            }
            actionsLayout="inline"
            description="Change the fields that define the local preview endpoint and launch boundary."
            kicker="Profile Fields"
            title={prototypePreviewAddressFromDraft(draft)}
          />
          <TerasContentTray kicker="Editable draft">
            <TerasFieldStack>
              <TerasFieldGrid columns={2} spacing="compact">
                <TerasTextField
                  label="Profile"
                  onValueChange={(value) => onDraftChange("profileRef", value)}
                  value={draft.profileRef}
                />
                <TerasSelectField
                  ariaLabel="Select launch adapter"
                  label="Launch adapter"
                  onValueChange={(value) =>
                    onDraftChange(
                      "launchAdapter",
                      value as PrototypePreviewProfileDraft["launchAdapter"],
                    )
                  }
                  options={prototypePreviewLaunchAdapterOptions}
                  value={draft.launchAdapter}
                />
                <TerasSelectField
                  ariaLabel="Select preview host"
                  label="Host / IP"
                  onValueChange={(value) => onDraftChange("host", value)}
                  options={prototypePreviewHostOptions}
                  value={draft.host}
                />
                <TerasTextField
                  inputMode="numeric"
                  label="Port"
                  onValueChange={(value) => onDraftChange("port", value)}
                  value={draft.port}
                />
                <TerasTextField
                  label="Healthcheck"
                  onValueChange={(value) =>
                    onDraftChange("healthcheckPath", value)
                  }
                  value={draft.healthcheckPath}
                />
              </TerasFieldGrid>
              <TerasTextField
                label="Command"
                onValueChange={(value) => onDraftChange("command", value)}
                value={draft.command}
              />
              <TerasFieldGrid columns={2} spacing="compact">
                <TerasTextField
                  label="Working directory"
                  onValueChange={(value) =>
                    onDraftChange("workingDirectory", value)
                  }
                  value={draft.workingDirectory}
                />
                <TerasTextField
                  label="Profile source"
                  onValueChange={(value) =>
                    onDraftChange("profileSource", value)
                  }
                  value={draft.profileSource}
                />
              </TerasFieldGrid>
            </TerasFieldStack>
          </TerasContentTray>
        </TerasPanel>

        <TerasPanel
          frame="padded"
          treatment="rail"
          spacing="compact"
          tone={draftCompletion.tone}
        >
          <TerasPanelHeader
            actions={
              <TerasStatusPill tone={draftCompletion.tone}>
                {draftCompletion.statusLabel}
              </TerasStatusPill>
            }
            actionsLayout="inline"
            description="Review the draft before saving or confirming it for Runtime controls."
            kicker="Draft Check"
            title={prototypePreviewAddressFromDraft(draft)}
          />
          <TerasMetadataList items={prototypePreviewProfileDraftFacts(draft)} />
          <TerasList frame="contained">
            {readinessRows.map((row) => (
              <TerasStatusItem
                tone={row.tone}
                detail={row.detail}
                key={row.label}
                label={row.label}
                status={row.status}
              />
            ))}
          </TerasList>
        </TerasPanel>
      </TerasDetailGrid>
    </TerasDialog>
  );
}
