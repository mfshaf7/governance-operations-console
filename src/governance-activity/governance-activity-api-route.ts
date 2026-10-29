import { NextResponse } from "next/server";

import { composeGovernanceActivity } from "./governance-activity-composer.ts";
import { GovernanceActivityValidationError } from "./governance-activity-validation.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function listGovernanceActivityRoute(request: Request) {
  try {
    let continuation: {owner: "oos" | "wgcf"; cursor: string} | undefined;
    if (request) {
      const query = new URL(request.url).searchParams;
      if ([...query.keys()].some(key => key !== "owner" && key !== "cursor") || query.getAll("owner").length > 1 || query.getAll("cursor").length > 1) {
        throw new GovernanceActivityValidationError("Unsupported history query.", "governance_activity_query_invalid", 400);
      }
      const owner = query.get("owner"), cursor = query.get("cursor");
      if (owner !== null || cursor !== null) {
        if ((owner !== "oos" && owner !== "wgcf") || !cursor || cursor.length > 4096 || !/^[A-Za-z0-9_-]+={0,2}$/.test(cursor)) {
          throw new GovernanceActivityValidationError("Invalid owner history continuation.", "governance_activity_query_invalid", 400);
        }
        continuation = { owner, cursor };
      }
    }
    return NextResponse.json(await composeGovernanceActivity({ continuation }), {
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
