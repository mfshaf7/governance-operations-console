import { assertDeliveryIntakePage, assertDeliveryHistoryProjection, deliveryHistoryId } from "../live-runtime/delivery-history-live-contract.ts";
import { projectDeliveryIntakeHistory } from "../live-runtime/delivery-history-projection.ts";
import type { DeliveryIntakeRecord } from "../live-runtime/delivery-history-live-contract.ts";
import { projectCanonicalDeliveryWorkspace } from "../live-runtime/delivery-workspace-live-projection.ts";
import { canonicalDigest, deliveryOosRequest, resolveDeliveryOosConfig } from "./delivery-oos-client.ts";

export async function readCanonicalDeliveryWorkspace({ env = process.env, fetchImpl = fetch }: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch } = {}) {
  const value = await deliveryOosRequest(resolveDeliveryOosConfig(env), "/v1/delivery-initiatives?include_done=true&include_inactive=true", { method: "GET" }, fetchImpl, 75000, {
    authority: "operator-orchestration-service", sourceOwner: "workspace-delivery-art", recordRef: "openproject://projects/workspace-delivery-art/initiatives",
  });
  const model = projectCanonicalDeliveryWorkspace(value, canonicalDigest(value), new Date().toISOString());
  try {
    const sources: DeliveryIntakeRecord[] = [], cursors = new Set<string>(), identities = new Set<string>();
    let cursor: string | null = null;
    const issues: Array<{target_ref:string;detail:string}> = [];
    for (let page = 0; page < 26; page++) {
      const path = "/v1/delivery-intake/sources?limit=20" + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const next = assertDeliveryIntakePage(await deliveryOosRequest(resolveDeliveryOosConfig(env), path, { method: "GET" }, fetchImpl, 75000, {
        authority: "operator-orchestration-service", sourceOwner: "workspace-delivery-art", recordRef: "openproject://projects/workspace-delivery-art/intake",
      }));
      for (const item of next.sources) {
        if (identities.has(item.source_id)) throw new Error("Conflicting Intake source identity.");
        identities.add(item.source_id); sources.push(item);
      }
      if(next.coverage.state === "partial" && next.issues.length === 0) throw new Error("Incomplete Intake coverage.");
      issues.push(...next.issues);
      cursor = next.next_cursor;
      if (!cursor) {
        const complete = projectDeliveryIntakeHistory(model, sources, issues);
        return { ...complete, projection_state: { ...complete.projection_state,
          source_revision: canonicalDigest({inventory:model.projection_state.source_revision,sources,issues}) } };
      }
      if (cursors.has(cursor)) throw new Error("Repeated Intake page cursor.");
      cursors.add(cursor);
    }
    throw new Error("Intake exceeds its bounded page limit.");
  } catch {
    return { ...model, projection_state:{...model.projection_state,source_revision:canonicalDigest({inventory:model.projection_state.source_revision,intake:"unavailable"})}, evidence_coverage: {
      intake: { state: "unavailable" as const, issue_count: 0, detail: "Native Intake evidence is unavailable. Empty rows do not mean there are no admitted sources." },
      activity: { state: "unavailable" as const, detail: "Original owner receipts could not be read. Retry owner history; no empty-history claim is made." },
    } };
  }
}

export async function readCanonicalDeliveryHistory(deliveryId: string, {env=process.env,fetchImpl=fetch}: {env?:NodeJS.ProcessEnv;fetchImpl?:typeof fetch}={}) {
  deliveryHistoryId(deliveryId);
  const recordRef=`openproject://work_packages/${deliveryId.slice(9)}`;
  return assertDeliveryHistoryProjection(await deliveryOosRequest(resolveDeliveryOosConfig(env),
    `/v1/delivery-initiatives/${deliveryId}/history`,{method:"GET"},fetchImpl,75000,
    {authority:"operator-orchestration-service",sourceOwner:"workspace-delivery-art",recordRef}),deliveryId);
}
