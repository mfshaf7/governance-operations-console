import {
  TerasActionButton,
  TerasActionRow,
  TerasFieldGrid,
  TerasPanelStack,
  TerasSelectField,
  TerasTextListField,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";

import {
  devIntegrationRequestOptions,
} from "../../../fixtures/dev-integration-request-options.fixture";
import type {
  DevIntegrationProfileRequestDraft,
} from "../../../work-model/profile-request/dev-integration-profile-request-draft";
import { ProfileRequestSelectionList } from "./profile-request-selection-list";

export function ProfileRequestRuntimeStep({
  draft,
  onChange,
  onOpenPersistence,
}: {
  draft: DevIntegrationProfileRequestDraft;
  onChange: (update: Partial<DevIntegrationProfileRequestDraft>) => void;
  onOpenPersistence: () => void;
}) {
  return (
    <TerasPanelStack fill="first">
      <TerasWizardPanel
        description="Declare the host shape, state model, dependencies, and security triggers."
        kicker="Runtime Contract"
        title="Local runtime boundary"
      >
        <TerasFieldGrid>
          <TerasSelectField
            label="Runtime platform"
            onValueChange={(runtimePlatform) =>
              onChange({ runtimePlatform })
            }
            options={devIntegrationRequestOptions.runtimePlatforms.map(
              (value) => ({ label: value, value }),
            )}
            value={draft.runtimePlatform}
          />
          <TerasSelectField
            label="State model"
            onValueChange={(runtimeStateModel) =>
              onChange({
                runtimeStateModel:
                  runtimeStateModel as DevIntegrationProfileRequestDraft["runtimeStateModel"],
              })
            }
            options={devIntegrationRequestOptions.runtimeStateModels}
            value={draft.runtimeStateModel}
          />
        </TerasFieldGrid>

        <TerasTrayStack columns={2} spacing="normal">
          <ProfileRequestSelectionList
            ariaLabel="Runtime dependencies"
            label="Dependencies"
            onChange={(dependencies) => onChange({ dependencies })}
            options={devIntegrationRequestOptions.dependencyRefs.map(
              (value) => ({ label: value, value }),
            )}
            values={draft.dependencies}
          />
          <ProfileRequestSelectionList
            ariaLabel="Security review triggers"
            label="Security Triggers"
            onChange={(securityTriggers) =>
              onChange({ securityTriggers })
            }
            options={devIntegrationRequestOptions.securityTriggers.map(
              (option) => ({
                label: option.label,
                value: option.value,
              }),
            )}
            values={draft.securityTriggers}
          />
        </TerasTrayStack>

        {draft.runtimeStateModel === "persistent" ? (
          <TerasActionRow spacing="normal">
            <TerasActionButton
              emphasis="secondary"
              onClick={onOpenPersistence}
            >
              Configure persistence
            </TerasActionButton>
          </TerasActionRow>
        ) : null}
      </TerasWizardPanel>

      <TerasWizardPanel
        description="Bound the data this local runtime is expected to mutate."
        fit="content"
        kicker="Write Boundary"
        title="Expected writes"
      >
        <TerasFieldGrid>
          <TerasSelectField
            label="Write class"
            onValueChange={(expectedWriteClassification) =>
              onChange({
                expectedWriteClassification:
                  expectedWriteClassification as DevIntegrationProfileRequestDraft["expectedWriteClassification"],
                expectedWriteTargets:
                  expectedWriteClassification === "none"
                    ? []
                    : draft.expectedWriteTargets,
              })
            }
            options={devIntegrationRequestOptions.expectedWriteClasses}
            value={draft.expectedWriteClassification}
          />
          <TerasTextListField
            addLabel="Add target"
            description="Name each target when writes are allowed."
            disabled={draft.expectedWriteClassification === "none"}
            emptyLabel={
              draft.expectedWriteClassification === "none"
                ? "No write targets required."
                : "No write targets added."
            }
            itemLabel={(index) => `Write target ${index + 1}`}
            items={[...draft.expectedWriteTargets]}
            label="Write targets"
            maxItems={6}
            onItemsChange={(expectedWriteTargets) =>
              onChange({ expectedWriteTargets })
            }
            placeholder="Target name"
            visibleItems={2}
          />
        </TerasFieldGrid>
      </TerasWizardPanel>
    </TerasPanelStack>
  );
}
