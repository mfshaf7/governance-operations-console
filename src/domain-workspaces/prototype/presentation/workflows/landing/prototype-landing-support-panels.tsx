import {
  TerasActionButton,
  TerasActionRow,
  TerasActivityLogPanel,
  TerasStatusItem,
  TerasList,
  TerasPanelStack,
  TerasWizardPanel,
} from "@/teras";
import type { TerasTone } from "@/teras";

import type {
  PrototypeRecord,
  PrototypeSupportProfile,
  PrototypeSupportRow,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  type PrototypeLandingDraft,
  type PrototypeLandingPlan,
  prototypeLandingSetupTone,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeSupportProfileLabel } from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";
import {
  type PrototypeLandingRunLogRow,
  type PrototypeLandingStatusProjection,
  prototypeLandingSetupPlanRows,
  prototypeLandingSupportRowDisplay,
} from "./prototype-landing-view-model.ts";

export function PrototypeLandingSupportCheckPanel({
  supportCheckTone,
  supportProfile,
  supportProfileCustom,
  visibleSupportRows,
}: {
  supportCheckTone: TerasTone;
  supportProfile: PrototypeSupportProfile;
  supportProfileCustom: boolean;
  visibleSupportRows: PrototypeSupportRow[];
}) {
  return (
    <TerasWizardPanel
      description={
        supportProfileCustom
          ? "Shows every editable support row in the custom profile."
          : "Shows only the support rows generated for the selected profile."
      }
      treatment="rail"
      kicker="Support Check"
      title={prototypeSupportProfileLabel(supportProfile)}
      tone={supportCheckTone}
    >
      <TerasList frame="contained">
        {visibleSupportRows.map((row, index) => {
          const rowDisplay = prototypeLandingSupportRowDisplay(row);

          return (
            <TerasStatusItem
              tone={rowDisplay.tone}
              detail={row.summary}
              index={String(index + 1).padStart(2, "0")}
              key={row.id}
              label={row.label}
              status={rowDisplay.status}
            />
          );
        })}
      </TerasList>
    </TerasWizardPanel>
  );
}

export function PrototypeLandingSetupCheckPanel({
  activeLandingDraft,
  landingPlan,
  landingBlocked,
  record,
  setupItemsDraft,
}: {
  activeLandingDraft: PrototypeLandingDraft;
  landingPlan: PrototypeLandingPlan;
  landingBlocked: boolean;
  record: PrototypeRecord;
  setupItemsDraft: string[];
}) {
  return (
    <TerasWizardPanel
      description="Checks the setup fields that will seed profile, preview, and validation planning."
      treatment="rail"
      fit="content"
      kicker="Setup Check"
      title="Recordable setup"
      tone={
        landingBlocked
          ? "warn"
          : prototypeLandingSetupTone(activeLandingDraft.basePlatform)
      }
    >
      <TerasList frame="contained">
        {prototypeLandingSetupPlanRows({
          landingPlan,
          record,
          setupItemsDraft,
          supportRowsDraft: activeLandingDraft.supportRows,
        }).map((row) => (
          <TerasStatusItem
            tone={row.tone}
            detail={row.detail}
            index={row.index}
            key={row.id}
            label={row.label}
            status={row.status}
          />
        ))}
      </TerasList>
    </TerasWizardPanel>
  );
}

export function PrototypeLandingRunSupportPanels({
  landingRunActionAvailable,
  landingRunActionStatus,
  landingRunComplete,
  landingRunLogRows,
  landingRunStatus,
  onRunLanding,
}: {
  landingRunActionAvailable: boolean;
  landingRunActionStatus: PrototypeLandingStatusProjection;
  landingRunComplete: boolean;
  landingRunLogRows: PrototypeLandingRunLogRow[];
  landingRunStatus: PrototypeLandingStatusProjection;
  onRunLanding: () => void;
}) {
  return (
    <TerasPanelStack fill="last">
      <TerasWizardPanel
        description="Run the local landing setup before the footer can record the landing result."
        treatment="rail"
        fit="content"
        kicker="Landing Action"
        title="Run landing setup"
        tone={landingRunStatus.tone}
      >
        <TerasList frame="contained">
          <TerasStatusItem
            tone={landingRunStatus.tone}
            detail={
              landingRunComplete
                ? "Current draft has been run and is ready for footer recording."
                : "Run the current draft before recording the landing result."
            }
            label="Run state"
            status={landingRunStatus.label}
          />
        </TerasList>
        <TerasActionRow spacing="normal">
          <TerasActionButton
            data-action="run-landing"
            disabled={!landingRunActionAvailable}
            emphasis={landingRunActionStatus.emphasis}
            onClick={onRunLanding}
            tone={
              landingRunActionStatus.tone === "danger" ? "danger" : "accent"
            }
          >
            {landingRunActionStatus.label}
          </TerasActionButton>
        </TerasActionRow>
      </TerasWizardPanel>
      <TerasActivityLogPanel
        description="Shows the local Landing setup before the footer records the result."
        kicker="Landing Run"
        rows={landingRunLogRows}
        statusLabel={landingRunStatus.label}
        statusTone={landingRunStatus.tone}
        title="Landing Run Log"
        tone={landingRunStatus.tone}
      />
    </TerasPanelStack>
  );
}
