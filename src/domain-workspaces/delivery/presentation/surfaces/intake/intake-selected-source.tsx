import type { DeliveryIntakeSource } from "../../../read-model/index.ts";

import { TerasActionButton, TerasSelectedPanel } from "@/teras";

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
              description: source.gate_summary,
              kicker: "Required Action",
              title: intakeActionTitle(source),
            }
          : null
      }
    />
  );
}
