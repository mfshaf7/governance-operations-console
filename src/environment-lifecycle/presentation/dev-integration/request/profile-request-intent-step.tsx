import {
  TerasFieldGrid,
  TerasFieldStack,
  TerasNoteField,
  TerasSelectField,
  TerasTextField,
  TerasWizardPanel,
} from "@/teras";

import {
  devIntegrationRequestOptions,
} from "../../../fixtures/dev-integration-request-options.fixture";
import type {
  DevIntegrationProfileRequestDraft,
} from "../../../work-model/profile-request/dev-integration-profile-request-draft";
import { ProfileRequestSelectionList } from "./profile-request-selection-list";

export function ProfileRequestIntentStep({
  draft,
  existingProfileIds,
  onChange,
}: {
  draft: DevIntegrationProfileRequestDraft;
  existingProfileIds: readonly string[];
  onChange: (update: Partial<DevIntegrationProfileRequestDraft>) => void;
}) {
  return (
    <TerasWizardPanel
      description="Identify the environment, accountable owner, and participating repositories."
      kicker="Profile Intent"
      title="Request identity"
    >
      <TerasFieldStack spacing="normal">
        <TerasFieldGrid>
          <TerasTextField
            label="Profile ID"
            onValueChange={(profileId) => onChange({ profileId })}
            placeholder="lowercase-kebab-case"
            value={draft.profileId}
          />
          <TerasSelectField
            label="Owning repository"
            onValueChange={(ownerRepo) =>
              onChange({
                ownerRepo,
                participatingRepos: ownerRepo
                  ? [...new Set([...draft.participatingRepos, ownerRepo])]
                  : draft.participatingRepos,
              })
            }
            options={[
              { label: "Select owner", value: "" },
              ...devIntegrationRequestOptions.ownerRepos.map((value) => ({
                label: value,
                value,
              })),
            ]}
            value={draft.ownerRepo}
          />
          <TerasSelectField
            label="Lane class"
            onValueChange={(laneClass) =>
              onChange({
                laneClass:
                  laneClass as DevIntegrationProfileRequestDraft["laneClass"],
              })
            }
            options={devIntegrationRequestOptions.laneClasses}
            value={draft.laneClass}
          />
          <TerasSelectField
            helper="Use only when this request replaces an existing profile."
            label="Replacement profile"
            onValueChange={(replacesProfileId) =>
              onChange({
                replacesProfileId: replacesProfileId || null,
              })
            }
            options={[
              { label: "New profile", value: "" },
              ...existingProfileIds.map((value) => ({
                label: value,
                value,
              })),
            ]}
            value={draft.replacesProfileId ?? ""}
          />
        </TerasFieldGrid>

        <TerasNoteField
          label="Operational purpose"
          minimumHeight="short"
          onValueChange={(purpose) => onChange({ purpose })}
          placeholder="Why this local environment needs to exist."
          value={draft.purpose}
        />

        <ProfileRequestSelectionList
          ariaLabel="Participating repositories"
          label="Participating Repositories"
          onChange={(participatingRepos) =>
            onChange({ participatingRepos })
          }
          options={devIntegrationRequestOptions.participatingRepos.map(
            (value) => ({ label: value, value }),
          )}
          values={draft.participatingRepos}
        />
      </TerasFieldStack>
    </TerasWizardPanel>
  );
}
