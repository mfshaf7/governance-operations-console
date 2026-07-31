import type { DeliveryApplyIntent } from "../../domain/delivery-types.ts";

export function executionActionIntentReady(applyIntent: DeliveryApplyIntent) {
  return executionActionIntentBlockers(applyIntent).length === 0;
}

export function executionActionIntentBlockers(
  applyIntent: DeliveryApplyIntent,
) {
  const blockers = applyIntent.gate_checks
    .filter((gate) => !gate.passed)
    .map((gate) => `${gate.label} is not clear.`);

  if (applyIntent.dirty_state === "stale") {
    blockers.push("The source revision is stale.");
  }

  for (const field of applyIntent.required_payload_fields) {
    const value = applyIntent.operator_payload[field]?.trim();
    if (!value || value.toUpperCase() === "CHECK") {
      blockers.push(`${field.replaceAll("_", " ")} is required.`);
    }
  }

  return blockers;
}
