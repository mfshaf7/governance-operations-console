import {
  TerasStatusItem,
  TerasContentTray,
  TerasFieldGrid,
  TerasFieldStack,
  TerasList,
  TerasSelectField,
  TerasReadoutField,
  TerasStatusPill,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";

import {
  type PrototypeLandingDraft,
  type PrototypeLandingPlan,
  prototypeLandingSetupTone,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import {
  prototypeBasePlatformLabel,
  prototypeBasePlatformOptions,
} from "@/domain-workspaces/prototype/domain/support/prototype-setup-profile-model";
import {
  prototypeRequestDataModeOptions,
  prototypeRequestMutationBoundaryOptions,
  prototypeRequestPreviewNeedOptions,
  prototypeRequestVisibilityOptions,
} from "../../../work-model/entry/prototype-request-model.ts";
import type { PrototypeLandingDraftChangeHandler } from "./prototype-landing-types.ts";

export function PrototypeLandingSetupPlanStepPanel({
  activeLandingDraft,
  landingDraftMutable,
  landingPlan,
  onDraftChange,
  sourceReadout,
}: {
  activeLandingDraft: PrototypeLandingDraft;
  landingDraftMutable: boolean;
  landingPlan: PrototypeLandingPlan;
  onDraftChange: PrototypeLandingDraftChangeHandler;
  sourceReadout: { label: string; detail: string };
}) {
  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill
          tone={prototypeLandingSetupTone(activeLandingDraft.basePlatform)}
        >
          {prototypeBasePlatformLabel(activeLandingDraft.basePlatform)}
        </TerasStatusPill>
      }
      description="Confirm only setup choices that affect the landing record."
      kicker="Landing Work"
      title="Setup Plan"
    >
      <TerasFieldStack spacing="loose">
        <TerasFieldGrid columns={2} spacing="compact">
          <TerasContentTray kicker="Base Setup" title="Source and preview" description={sourceReadout.detail}>
            <TerasReadoutField label="Source home" value={sourceReadout.label} />
            <TerasSelectField
              ariaLabel="Preview need"
              disabled={!landingDraftMutable}
              helper="Seeds Preview Runtime after Landing."
              label="Preview need"
              onValueChange={(value) =>
                onDraftChange(
                  "previewNeed",
                  value as PrototypeLandingDraft["previewNeed"],
                )
              }
              options={prototypeRequestPreviewNeedOptions}
              value={activeLandingDraft.previewNeed}
            />
            <TerasSelectField
              ariaLabel="Base platform"
              disabled={!landingDraftMutable}
              helper="Seeds local setup and preview profile only."
              label="Base platform"
              onValueChange={(value) =>
                onDraftChange(
                  "basePlatform",
                  value as PrototypeLandingDraft["basePlatform"],
                )
              }
              options={prototypeBasePlatformOptions}
              value={activeLandingDraft.basePlatform}
            />
          </TerasContentTray>
          <TerasTrayStack align="start" spacing="comfortable">
            <TerasContentTray
              kicker="Boundary"
              title="Data, mutation, visibility"
            >
              <TerasSelectField
                ariaLabel="Data mode"
                disabled={!landingDraftMutable}
                helper="Accepted data posture for this prototype record."
                label="Data mode"
                onValueChange={(value) =>
                  onDraftChange(
                    "dataMode",
                    value as PrototypeLandingDraft["dataMode"],
                  )
                }
                options={prototypeRequestDataModeOptions}
                value={activeLandingDraft.dataMode}
              />
              <TerasSelectField
                ariaLabel="Mutation boundary"
                disabled={!landingDraftMutable}
                helper="Accepted mutation boundary for this prototype."
                label="Mutation boundary"
                onValueChange={(value) =>
                  onDraftChange(
                    "mutationBoundary",
                    value as PrototypeLandingDraft["mutationBoundary"],
                  )
                }
                options={prototypeRequestMutationBoundaryOptions}
                value={activeLandingDraft.mutationBoundary}
              />
              <TerasSelectField
                ariaLabel="Visibility tier"
                disabled={!landingDraftMutable}
                helper="Accepted exposure posture."
                label="Visibility"
                onValueChange={(value) =>
                  onDraftChange(
                    "visibilityTier",
                    value as PrototypeLandingDraft["visibilityTier"],
                  )
                }
                options={prototypeRequestVisibilityOptions}
                value={activeLandingDraft.visibilityTier}
              />
            </TerasContentTray>
            <TerasContentTray kicker="Preview Seed" title="Launch adapter">
              <TerasList>
                <TerasStatusItem
                  tone={
                    landingPlan.previewLaunchAdapter === "unassigned"
                      ? "warn"
                      : "info"
                  }
                  detail={landingPlan.previewCommand}
                  label="Adapter"
                  status={landingPlan.previewLaunchAdapter}
                />
              </TerasList>
            </TerasContentTray>
          </TerasTrayStack>
        </TerasFieldGrid>
      </TerasFieldStack>
    </TerasWizardPanel>
  );
}
