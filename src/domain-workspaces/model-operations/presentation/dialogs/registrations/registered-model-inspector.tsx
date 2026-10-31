"use client";

import {
  TerasActionButton, TerasActionRow, TerasList,
  TerasPanel, TerasPanelHeader, TerasStatusItem, TerasTechnicalDetails,
} from "@/teras";
import type { ModelRegistry } from "../../../work-model/model-runtime-contract.ts";
import { modelRegistrationInspection } from "./model-registrations-view-model.ts";

export function RegisteredModelInspector({
  registry, modelId, backendLabel, verificationBlocked, removalBlocked, onVerify, onRemove,
}: {
  registry: ModelRegistry;
  modelId: string;
  backendLabel: string;
  verificationBlocked: boolean;
  removalBlocked: boolean;
  onVerify: () => void;
  onRemove: () => void;
}) {
  const model = registry.configuration.configuration.models[modelId];
  const inspection = modelRegistrationInspection(registry, modelId);

  return <TerasPanel data-model-registration-selection="true" frame="padded" treatment="neutral"
    spacing="compact" fit="fill" overflow="auto">
    <TerasPanelHeader kicker="Selected model" title={model.model} description={backendLabel}
      statusLabel={inspection.healthLabel} statusTone={inspection.healthTone} />
    <TerasList ariaLabel="Model verification summary" frame="contained">
      {inspection.summary.map(row => <TerasStatusItem key={row.id} label={row.label}
        detail={row.detail} status={row.value} tone={row.tone} />)}
    </TerasList>
    <TerasActionRow>
      <TerasActionButton disabled={verificationBlocked} onClick={onVerify}>Verify & update registration</TerasActionButton>
      <TerasActionButton disabled={removalBlocked} emphasis="secondary" onClick={onRemove}>Remove selected registration</TerasActionButton>
    </TerasActionRow>
    <TerasTechnicalDetails items={inspection.technical} />
  </TerasPanel>;
}
