import { assertDeliveryIntakePage, assertDeliveryHistoryProjection, deliveryHistoryId } from "../live-runtime/delivery-history-live-contract.ts";
import { projectDeliveryIntakeHistory } from "../live-runtime/delivery-history-projection.ts";
import type { DeliveryIntakeRecord } from "../live-runtime/delivery-history-live-contract.ts";
import { projectCanonicalDeliveryWorkspace } from "../live-runtime/delivery-workspace-live-projection.ts";
import { canonicalDigest, deliveryOosRequest, resolveDeliveryOosConfig } from "./delivery-oos-client.ts";
import { concurrentSourceRead } from "../../../console-integration/source-authority/concurrent-source-read.ts";
import { projectCanonicalDeliveryOverview } from "../live-runtime/delivery-overview-live-projection.ts";

type ReadOptions = { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; deliveryId?: string; overview?: boolean; page?: number; scope?: "current" | "history"; search?: string };

export async function readCanonicalDeliveryInventory({ env = process.env, fetchImpl = fetch, overview = false }: ReadOptions = {}) {
  const config = resolveDeliveryOosConfig(env);
  return concurrentSourceRead(`delivery-inventory:${overview ? "console-overview" : "full"}`, config, fetchImpl, async () => {
    const value = await deliveryOosRequest(config, "/v1/delivery-initiatives?include_done=true&include_inactive=true" + (overview ? "&view=console" : ""), { method: "GET" }, fetchImpl, 75000, {
      authority: "operator-orchestration-service", sourceOwner: "workspace-delivery-art", recordRef: "openproject://projects/workspace-delivery-art/initiatives",
    });
    const project = overview ? projectCanonicalDeliveryOverview : projectCanonicalDeliveryWorkspace;
    const model = project(value, canonicalDigest(value), new Date().toISOString());
    return { ...model, evidence_coverage: {
      intake: { state: "unavailable" as const, issue_count: 0, detail: "Original Intake evidence is loaded independently when its history is requested; empty rows are not an empty-admission claim." },
      activity: { state: "unavailable" as const, detail: "Original Intake activity is loaded independently with its history." },
    } };
  });
}

export async function readCanonicalDeliveryIntake({ env = process.env, fetchImpl = fetch, deliveryId, page: requestedPage, search = "" }: ReadOptions = {}) {
  const config = resolveDeliveryOosConfig(env);
  if (deliveryId) deliveryHistoryId(deliveryId);
  return concurrentSourceRead(`delivery-intake:${deliveryId ?? requestedPage ?? "recovery-all"}:${search}`, config, fetchImpl, async () => {
    const sources: DeliveryIntakeRecord[] = [], issues: Array<{ target_ref: string; detail: string }> = [];
    const cursors = new Set<string>(), identities = new Set<string>();
    let cursor: string | null = null;
    for (let page = 0; page < 26; page++) {
      const next = assertDeliveryIntakePage(await deliveryOosRequest(config, "/v1/delivery-intake/sources?limit=20" + (deliveryId ? `&delivery_id=${deliveryId}` : requestedPage ? `&page=${requestedPage}&search=${encodeURIComponent(search)}` : cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""), { method: "GET" }, fetchImpl, 75000, {
        authority: "operator-orchestration-service", sourceOwner: "workspace-delivery-art", recordRef: "openproject://projects/workspace-delivery-art/intake",
      }));
      for (const item of next.sources) {
        if (identities.has(item.source_id)) throw new Error("Conflicting Intake source identity.");
        identities.add(item.source_id); sources.push(item);
      }
      if (next.coverage.state === "partial" && next.issues.length === 0) throw new Error("Incomplete Intake coverage.");
      issues.push(...next.issues); cursor = next.next_cursor;
      if (!cursor) return { sources, issues, observed_at: new Date().toISOString(), source_revision: canonicalDigest({ sources, issues, page:next.page??null, inspected_target_refs:next.inspected_target_refs??null }), ...(next.page ? { page: next.page, inspected_target_refs: next.inspected_target_refs } : {}) };
      if (cursors.has(cursor)) throw new Error("Repeated Intake page cursor.");
      cursors.add(cursor);
    }
    throw new Error("Intake exceeds its bounded page limit.");
  });
}

export async function readCanonicalDeliveryWorkspace(options: ReadOptions = {}) {
  const model = await readCanonicalDeliveryInventory(options);
  try {
    const { sources, issues } = await readCanonicalDeliveryIntake(options);
    const complete = projectDeliveryIntakeHistory(model, sources, issues);
    return { ...complete, projection_state: { ...complete.projection_state,
      source_revision: canonicalDigest({ inventory: model.projection_state.source_revision, sources, issues }) } };
  } catch {
    return { ...model, projection_state: { ...model.projection_state,
      source_revision: canonicalDigest({ inventory: model.projection_state.source_revision, intake: "unavailable" }) },
      evidence_coverage: {
        intake: { state: "unavailable" as const, issue_count: 0, detail: "Native Intake evidence is unavailable. Empty rows do not mean there are no admitted sources." },
        activity: { state: "unavailable" as const, detail: "Original owner receipts could not be read. Retry owner history; no empty-history claim is made." },
      } };
  }
}

export async function readCanonicalDeliveryHistory(deliveryId: string, {env=process.env,fetchImpl=fetch,activityPage=1}: {env?:NodeJS.ProcessEnv;fetchImpl?:typeof fetch;activityPage?:number}={}) {
  deliveryHistoryId(deliveryId);
  if (!Number.isSafeInteger(activityPage) || activityPage<1 || activityPage>100000) throw new Error("Activity page is invalid.");
  const recordRef=`openproject://work_packages/${deliveryId.slice(9)}`;
  return assertDeliveryHistoryProjection(await deliveryOosRequest(resolveDeliveryOosConfig(env),
    `/v1/delivery-initiatives/${deliveryId}/history${activityPage===1?"":`?activity_page=${activityPage}`}`,{method:"GET"},fetchImpl,75000,
    {authority:"operator-orchestration-service",sourceOwner:"workspace-delivery-art",recordRef}),deliveryId);
}
