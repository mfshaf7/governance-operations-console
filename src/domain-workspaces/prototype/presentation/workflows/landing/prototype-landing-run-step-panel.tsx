import { TerasStatusItem, TerasList, TerasWizardPanel } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeLandingDraft,
  PrototypeLandingPlan,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeLandingRunChecklistRows } from "./prototype-landing-view-model.ts";

export function PrototypeLandingRunStepPanel({
  activeLandingDraft,
  landingPlan,
  landingBlocked,
  landingRunComplete,
  record,
  setupItemsDraft,
}: {
  activeLandingDraft: PrototypeLandingDraft;
  landingPlan: PrototypeLandingPlan;
  landingBlocked: boolean;
  landingRunComplete: boolean;
  record: PrototypeRecord;
  setupItemsDraft: string[];
}) {
  return (
    <TerasWizardPanel
      description="Run rows show what the local landing action will record, then flip to done or blocked after the run is recorded."
      kicker="Landing Run"
      title="Run checklist"
    >
      <TerasList frame="contained">
        {prototypeLandingRunChecklistRows({
          landingBlocked,
          landingPlan,
          landingRunComplete,
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
