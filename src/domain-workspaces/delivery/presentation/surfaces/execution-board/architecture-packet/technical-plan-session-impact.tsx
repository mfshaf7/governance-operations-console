import { TerasActionButton, TerasList, TerasPlanning, TerasSignalItem } from "@/teras";
import type {
  ArchitectureSessionImpact,
  ArchitectureSessionImpactReason,
} from "../../../../live-runtime/architecture-packet-live-types.ts";
import { TechnicalPlanWorkTitle } from "./technical-plan-overview.tsx";

const descriptions: Record<ArchitectureSessionImpactReason, string> = {
  "plan-not-required": "This session can continue under its current approval.",
  "session-operator": "Review this session with the account or tool that opened it.",
  "operation-pending": "Finish or recover the in-progress source operation before changing this session.",
  "binding-unavailable": "The session’s current work or earlier plan could not be verified. Review it before continuing.",
  "scope-unchanged": "The approved work for this session stays the same. Reopen the session to refresh its plan link.",
  "scope-regrouped": "The work is grouped differently in the revised plan. Review where it should continue.",
  "scope-changed-clean": "The requirements changed. No code changes have been applied and there is no review evidence yet.",
  "source-or-evidence-exists": "The requirements changed after work or evidence was recorded. Review how to carry that work forward.",
};

const labels = {
  refresh: { text: "Refresh plan link", tone: "info" },
  rebuild: { text: "Rebuild available", tone: "warn" },
  review: { text: "Review needed", tone: "warn" },
  continues: { text: "Continue as planned", tone: "ok" },
} as const;

export function TechnicalPlanSessionImpact({ impact, titles, recorded, onOpenSession }: {
  impact: ArchitectureSessionImpact;
  titles: Record<string, string>;
  recorded: boolean;
  onOpenSession?: (workItemId: number) => void;
}) {
  const description = !impact.sessions.length ? "There are no active work sessions affected by this plan." :
    recorded ? "The revised plan is recorded. Open an affected session to see its current next action." :
    "Review these sessions before recording the revised plan.";
  return <TerasPlanning.ReviewSection title="Impact on work in progress" description={description}>
    {impact.sessions.length ? <TerasList ariaLabel="Affected work sessions" frame="contained">
      {impact.sessions.map(session => {
        const label = labels[session.disposition];
        const workItemId = session.open_work_item_id
          ? Number(session.open_work_item_id.slice("work-item-".length)) : null;
        return <TerasSignalItem key={session.work_item_ids.join("/")} label={label.text} tone={label.tone}
          title={session.work_item_ids.map((id, index) => (
            <span key={id}>{index > 0 ? " · " : null}<TechnicalPlanWorkTitle label={titles[id] ?? id.replace("work-item-", "Work item #")} /></span>
          ))} textOverflow="wrap" detail={descriptions[session.reason]}
          actions={onOpenSession && workItemId !== null
            ? <TerasActionButton size="table-compact" emphasis="secondary"
                onClick={() => onOpenSession(workItemId)}>Open Work Session</TerasActionButton>
            : undefined} />;
      })}
    </TerasList> : null}
  </TerasPlanning.ReviewSection>;
}
