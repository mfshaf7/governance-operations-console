import { TerasStatusItem, TerasList, TerasWizardPanel } from "@/teras";

import type { PrototypeRecord } from "../../../read-model/prototype-workspace-read-model.ts";
import type {
  PrototypeLandingDraft,
  PrototypeLandingPlan,
} from "../../../work-model/workflows/landing/prototype-landing-model.ts";
import { prototypeLandingRunChecklistRows } from "./prototype-landing-view-model.ts";
import { prototypeLandingLiveRunChecklistRows } from "./prototype-landing-checklist-model.ts";
import type { PrototypeLandingResult } from "../../../live-runtime/prototype-landing-live-types.ts";

export function PrototypeLandingRunStepPanel({
  activeLandingDraft,
  landingPlan,
  landingBlocked,
  landingRunComplete,
  liveResult,
  record,
  setupItemsDraft,
}: {
  activeLandingDraft: PrototypeLandingDraft;
  landingPlan: PrototypeLandingPlan;
  landingBlocked: boolean;
  landingRunComplete: boolean;
  liveResult: PrototypeLandingResult | null;
  record: PrototypeRecord;
  setupItemsDraft: string[];
}) {
  return (
    <TerasWizardPanel
      description="Run rows show the Landing phases and the evidence currently available for each one."
      kicker="Landing Run"
      title="Run checklist"
    >
      <TerasList frame="contained">
        {(liveResult
          ? prototypeLandingLiveRunChecklistRows(liveResult)
          : prototypeLandingRunChecklistRows({
              landingBlocked,
              landingPlan,
              landingRunComplete,
              record,
              setupItemsDraft,
              supportRowsDraft: activeLandingDraft.supportRows,
            })
        ).map((row) => (
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
