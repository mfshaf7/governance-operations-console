import type { ReactNode } from "react";
import { TerasPanel, TerasPanelHeader, TerasActionRow, TerasRecordMetaText, TerasFieldStack } from "@/teras";
export function TechnicalPlanActionPanel({title,description,disabledReason,error,recorded,children,evidence}: {
  title:string;description:string;disabledReason?:string|null;error?:string|null;recorded:boolean;children:ReactNode;evidence?:ReactNode;
}) {
  return <TerasPanel frame="padded" fit="content" density="compact" spacing="normal" treatment="rail" tone={error?"danger":recorded?"ok":disabledReason?"warn":"info"} data-technical-plan-action="true">
    <TerasPanelHeader kicker="Next Action" title={title} description={description}/>
    <TerasFieldStack spacing="compact">
      {error?<TerasRecordMetaText>{error}</TerasRecordMetaText>:disabledReason?<TerasRecordMetaText>{disabledReason}</TerasRecordMetaText>:null}
      <TerasActionRow spacing="compact">{children}</TerasActionRow>
    </TerasFieldStack>
    {evidence}
  </TerasPanel>;
}
