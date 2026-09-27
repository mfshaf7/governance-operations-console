import { NextResponse } from "next/server";

import { composeGovernanceActivity } from "./governance-activity-composer.ts";
import { GovernanceActivityValidationError } from "./governance-activity-validation.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listGovernanceActivityRoute() {
  try {
    return NextResponse.json(await composeGovernanceActivity(), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    const normalized = error instanceof GovernanceActivityValidationError
      ? error
      : new GovernanceActivityValidationError(
          "Governance Activity composition failed.",
          "governance_activity_composition_failed",
        );
    return NextResponse.json(
      {
        code: normalized.code,
        error: "Governance Activity is unavailable because an owner projection was invalid.",
        events: [],
        mode: "live",
        observedAt: new Date().toISOString(),
        sources: [],
        status: "offline",
        truncated: false,
      },
      { headers: noStoreHeaders, status: normalized.status },
    );
  }
}
