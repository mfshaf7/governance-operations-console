import type { ReactNode } from "react";
import { TerasPanel, TerasPanelHeader, TerasActionRow, TerasRecordMetaText, TerasFieldStack, TerasTechnicalDetails } from "@/teras";

type PlanFeedback = { disabledReason?: string | null; error?: string | null; validationIssues?: string[] };

function TechnicalPlanActionFeedback({ disabledReason, error, validationIssues = [] }: PlanFeedback) {
  return <>
    {error ? <TerasRecordMetaText>{error}</TerasRecordMetaText> : disabledReason ? <TerasRecordMetaText>{disabledReason}</TerasRecordMetaText> : null}
    {error && validationIssues.length ? <TerasTechnicalDetails summary={`Plan checks requiring attention · ${validationIssues.length}`}
      items={validationIssues.map((value, index) => ({ label: `Check ${index + 1}`, value }))} /> : null}
  </>;
}

export function TechnicalPlanActionPanel({kicker="Next action",title,description,disabledReason,error,validationIssues=[],recorded,children,evidence}: {
  kicker?:string;title:string;description:string;recorded:boolean;children:ReactNode;evidence?:ReactNode;
} & PlanFeedback) {
  return <TerasPanel frame="padded" fit="content" density="compact" spacing="normal" treatment="rail" tone={error?"danger":recorded?"ok":disabledReason?"warn":"info"} data-technical-plan-action="true">
    <TerasPanelHeader kicker={kicker} title={title} description={description}/>
    <TerasFieldStack spacing="compact">
      <TechnicalPlanActionFeedback disabledReason={disabledReason} error={error} validationIssues={validationIssues} />
      <TerasActionRow spacing="compact">{children}</TerasActionRow>
    </TerasFieldStack>
    {evidence}
  </TerasPanel>;
}
