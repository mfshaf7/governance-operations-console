import type { ReactNode } from "react";
import { TerasPanel, TerasPanelHeader, TerasActionRow, TerasRecordMetaText, TerasFieldStack } from "@/teras";

type PlanFeedback = { disabledReason?: string | null; error?: string | null };

export function TechnicalPlanActionPanel({kicker="Next action",title,description,disabledReason,error,recorded,children,evidence}: {
  kicker?:string;title:string;description:string;recorded:boolean;children:ReactNode;evidence?:ReactNode;
} & PlanFeedback) {
  return <TerasPanel frame="padded" fit="content" density="compact" spacing="normal" treatment="rail" tone={error?"danger":recorded?"ok":disabledReason?"warn":"info"} data-technical-plan-action="true">
    <TerasPanelHeader kicker={kicker} title={title} description={description}/>
    <TerasFieldStack spacing="compact">
      {error || disabledReason ? <TerasRecordMetaText>{error ?? disabledReason}</TerasRecordMetaText> : null}
      <TerasActionRow spacing="compact">{children}</TerasActionRow>
    </TerasFieldStack>
    {evidence}
  </TerasPanel>;
}
