import {
  TerasActionButton,
  TerasFieldGrid,
  TerasFieldStack,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSelectField,
  TerasTextField,
} from "@/teras";

import {
  prototypeRequestDataModeOptions,
  prototypeRequestMutationBoundaryOptions,
  prototypeRequestPreviewNeedOptions,
  prototypeRequestSourceHomeOptions,
  prototypeRequestVisibilityOptions,
  type PrototypeRequestDraft,
} from "../../../work-model/entry/prototype-request-model.ts";
import { prototypeBasePlatformOptions } from "@/domain-workspaces/prototype/domain/support/prototype-setup-profile-model";
import { prototypeSupportProfileOptions } from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";
import type {
  PrototypeBasePlatform,
  PrototypeDataMode,
  PrototypeMutationBoundary,
  PrototypePreviewNeed,
  PrototypeSourceHome,
  PrototypeSupportProfile,
  PrototypeVisibilityTier,
} from "../../../read-model/prototype-workspace-read-model.ts";

type PrototypeRequestDraftChangeHandler = <
  Field extends keyof PrototypeRequestDraft,
>(
  field: Field,
  value: PrototypeRequestDraft[Field],
) => void;

export function PrototypeRequestEntryPanel({
  draft,
  onDraftChange,
  onOpenSelectionGuide,
}: {
  draft: PrototypeRequestDraft;
  onDraftChange: PrototypeRequestDraftChangeHandler;
  onOpenSelectionGuide: () => void;
}) {
  return (
    <TerasPanel
      frame="padded"
      treatment="neutral"
      layout="header-body"
      overflow="auto"
    >
      <TerasPanelHeader
        actions={
          <TerasActionButton
            onClick={onOpenSelectionGuide}
            emphasis="secondary"
          >
            Selection Guide
          </TerasActionButton>
        }
        actionsLayout="inline"
        description="Capture intent, support direction, and the starting platform preference."
        kicker="Entry Packet"
        title="Request details"
      />
      <TerasFieldStack spacing="compact">
        <TerasFieldGrid columns={2} spacing="compact">
          <TerasTextField
            aria-label="Prototype name"
            label="Prototype name"
            onValueChange={(value) => onDraftChange("name", value)}
            placeholder="Client review portal"
            value={draft.name}
          />
          <TerasTextField
            aria-label="Owner"
            label="Owner"
            onValueChange={(value) => onDraftChange("owner", value)}
            placeholder="Prototype Studio"
            value={draft.owner}
          />
        </TerasFieldGrid>
        <TerasFieldGrid columns={2} spacing="compact">
          <TerasNoteField
            aria-label="Prototype objective"
            label="Prototype objective"
            onValueChange={(value) =>
              onDraftChange("prototypeObjective", value)
            }
            placeholder="What should this prototype prove or make reviewable?"
            value={draft.prototypeObjective}
          />
          <TerasNoteField
            aria-label="Source context"
            label="Source context"
            onValueChange={(value) => onDraftChange("sourceContext", value)}
            placeholder="Where did this come from, what exists now, and what is unresolved?"
            value={draft.sourceContext}
          />
        </TerasFieldGrid>
        <TerasFieldGrid align="end" columns={2} spacing="compact">
          <TerasSelectField
            ariaLabel="Support profile"
            helper="Suggested profile only; Landing records the accepted rows."
            label="Support profile"
            onValueChange={(value) =>
              onDraftChange("supportProfile", value as PrototypeSupportProfile)
            }
            options={prototypeSupportProfileOptions}
            value={draft.supportProfile}
          />
          <TerasSelectField
            ariaLabel="Base platform"
            helper="Seeds setup and preview profile."
            label="Base platform"
            onValueChange={(value) =>
              onDraftChange("basePlatform", value as PrototypeBasePlatform)
            }
            options={prototypeBasePlatformOptions}
            value={draft.basePlatform}
          />
        </TerasFieldGrid>
        <TerasFieldGrid columns={3} spacing="compact">
          <TerasSelectField
            ariaLabel="Source home"
            label="Source home"
            onValueChange={(value) =>
              onDraftChange("sourceHome", value as PrototypeSourceHome)
            }
            options={prototypeRequestSourceHomeOptions}
            value={draft.sourceHome}
          />
          <TerasSelectField
            ariaLabel="Preview need"
            label="Preview"
            onValueChange={(value) =>
              onDraftChange("previewNeed", value as PrototypePreviewNeed)
            }
            options={prototypeRequestPreviewNeedOptions}
            value={draft.previewNeed}
          />
          <TerasSelectField
            ariaLabel="Visibility tier"
            label="Visibility"
            onValueChange={(value) =>
              onDraftChange("visibilityTier", value as PrototypeVisibilityTier)
            }
            options={prototypeRequestVisibilityOptions}
            value={draft.visibilityTier}
          />
          <TerasSelectField
            ariaLabel="Data mode"
            label="Data mode"
            onValueChange={(value) =>
              onDraftChange("dataMode", value as PrototypeDataMode)
            }
            options={prototypeRequestDataModeOptions}
            value={draft.dataMode}
          />
          <TerasSelectField
            ariaLabel="Mutation boundary"
            label="Boundary"
            onValueChange={(value) =>
              onDraftChange(
                "mutationBoundary",
                value as PrototypeMutationBoundary,
              )
            }
            options={prototypeRequestMutationBoundaryOptions}
            value={draft.mutationBoundary}
          />
        </TerasFieldGrid>
      </TerasFieldStack>
    </TerasPanel>
  );
}
