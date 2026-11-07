import type { DeliveryIntakeSource } from "../../../read-model/index.ts";

import { TerasActionButton, TerasSelectedPanel, TerasTechnicalDetails } from "@/teras";

import {
  intakeActionLabel,
  intakeActionTitle,
  intakeSelectedSourceActionEmphasis,
  intakeSelectedSourceFacts,
  intakeSelectedSourceProjection,
} from "./intake-view-model.ts";

export function DeliveryIntakeSelectedSource({
  onOpenAction,
  source,
}: {
  onOpenAction: (source: DeliveryIntakeSource) => void;
  source: DeliveryIntakeSource | null;
}) {
  const selectedProjection = intakeSelectedSourceProjection(source);

  return (
    <TerasSelectedPanel
      selected={Boolean(source)}
      tone={selectedProjection.tone}
      variant="rich"
      status={{
        label: selectedProjection.statusLabel,
        tone: selectedProjection.statusTone,
      }}
      kicker="Selected Source"
      title={selectedProjection.title}
      description={selectedProjection.description}
      facts={intakeSelectedSourceFacts(source)}
      action={
        source
          ? {
              node: (
                <TerasActionButton
                  data-delivery-intake-source-action={source.accepted_source_id}
                  emphasis={intakeSelectedSourceActionEmphasis(source)}
                  onClick={() => onOpenAction(source)}
                >
                  {intakeActionLabel(source)}
                </TerasActionButton>
              ),
              description: source.intake_status === "consumed" ? "Open history to review the source and its transfer to Delivery." : source.gate_summary,
              kicker: source.intake_status === "consumed" ? "Source history" : "Required Action",
              title: intakeActionTitle(source),
            }
          : null
      }
    >
      {source ? <TerasTechnicalDetails items={[
        {label:"Source record",value:source.source_ref},
        {label:"Accepted source",value:source.accepted_source_id},
        ...(source.delivery_package_id ? [{label:"Delivery reference",value:source.delivery_package_id}] : []),
        ...[...new Set(source.evidence_refs)].map((value,index)=>({label:`Evidence ${index+1}`,value})),
        ...(source.work_design_session_ref ? [{label:"Design session",value:source.work_design_session_ref}] : []),
        ...(source.consumed_at ? [{label:"Transferred at",value:source.consumed_at}] : []),
      ]}/> : null}
    </TerasSelectedPanel>
  );
}
