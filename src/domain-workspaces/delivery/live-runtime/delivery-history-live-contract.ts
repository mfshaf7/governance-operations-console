export type DeliveryHistoryRecord = {
  id: string; title: string; state: string; at: string | null; actor: string | null;
  receipt_ref: string | null; digest: string | null; evidence_refs: string[]; tone: "ok" | "info" | "danger";
};
export type DeliveryIntakeRecord = {
  source_id: string; source_kind: "proposal" | "prototype"; source_ref: string;
  source_version: string; packet_ref: string; delivery_id: string; target_ref: string;
  title: string; owner_repo: string; state: "consumed";
  custody: { classification: "existing-repo" | "new-repo-required" | "non-source-work" | "platform-internal";
    owner: string; rationale: string; repository_gate_state: "resolved" | "not-required";
    source_ref?: string | null; repo_ref?: string | null };
  receipt_ref: string; receipt_digest: string | null; recorded_at: string | null;
  actor: string | null; evidence_refs: string[];
};
export type DeliveryHistorySection = {
  state: "current" | "unavailable" | "not-recorded"; detail: string;
  data: DeliveryIntakeRecord | { state: string; source_ref: string; records: DeliveryHistoryRecord[];
    total_records: number; truncated: boolean } | null;
};
export type DeliveryHistoryProjection = {
  schema_version: 1; workflow_id: "delivery-package-history"; delivery_id: string; record_ref: string;
  package: { title: string; status: string; owner_repo: string | null };
  sections: Record<"intake" | "work_design" | "refinement" | "closeout", DeliveryHistorySection>;
  events: Array<{ event_id: string; title: string; occurred_at: string; actor: string;
    receipt_ref: string | null; evidence_refs: string[]; tone: "ok" | "info" | "danger" }>;
  event_count: number; history_state: "current" | "partial"; mutation_authority: "none"; projected_at: string;
};
export type DeliveryIntakePage = {
  schema_version: 1; workflow_id: "delivery-intake-sources"; sources: DeliveryIntakeRecord[];
  issues: Array<{ target_ref: string; state: "unavailable"; detail: string }>;
  next_cursor: string | null; coverage: { state: "current" | "partial"; detail: string }; projected_at: string;
};

export function deliveryHistoryId(value: string) {
  if (!/^delivery-[1-9][0-9]*$/.test(value)) throw new Error("An exact Delivery package is required.");
  return value;
}
export function assertDeliveryIntakePage(value: unknown): DeliveryIntakePage {
  const v = object(value);
  if (v.schema_version !== 1 || v.workflow_id !== "delivery-intake-sources" ||
      !Array.isArray(v.sources) || v.sources.length > 20 || !Array.isArray(v.issues) || v.issues.length > 20 ||
      !(v.next_cursor === null || typeof v.next_cursor === "string" && /^after:[1-9][0-9]*$/.test(v.next_cursor)) ||
      !["current", "partial"].includes(String(object(v.coverage).state))) fail();
  timestamp(v.projected_at);text(object(v.coverage).detail);
  v.sources.forEach(assertDeliveryIntakeRecord);
  for (const issue of v.issues) { const i = object(issue); targetRef(i.target_ref); text(i.detail); if(i.state!=="unavailable") fail(); }
  return value as DeliveryIntakePage;
}
export function assertDeliveryIntakeRecord(value: unknown): DeliveryIntakeRecord {
  const v = object(value); const custody = object(v.custody);
  if (!["prototype", "proposal"].includes(String(v.source_kind)) || v.state !== "consumed" ||
      !["existing-repo", "new-repo-required", "non-source-work", "platform-internal"].includes(String(custody.classification)) ||
      !["resolved", "not-required"].includes(String(custody.repository_gate_state))) fail();
  for (const key of ["source_id", "source_ref", "source_version", "packet_ref", "title", "owner_repo", "receipt_ref"]) text(v[key]);
  text(custody.owner);text(custody.rationale);
  deliveryHistoryId(text(v.delivery_id));
  if (targetRef(v.target_ref) !== `openproject://work_packages/${text(v.delivery_id).slice(9)}`) fail();
  if (v.recorded_at !== null) timestamp(v.recorded_at);
  nullableText(v.receipt_digest);nullableText(v.actor);
  if(custody.source_ref!==undefined)nullableText(custody.source_ref);
  if(custody.repo_ref!==undefined)nullableText(custody.repo_ref);
  strings(v.evidence_refs);
  return value as DeliveryIntakeRecord;
}
export function assertDeliveryHistoryProjection(value: unknown, expectedId: string): DeliveryHistoryProjection {
  const v=object(value);deliveryHistoryId(expectedId);
  const ref=`openproject://work_packages/${expectedId.slice(9)}`;
  if(v.schema_version!==1 || v.workflow_id!=="delivery-package-history" || v.delivery_id!==expectedId || v.record_ref!==ref ||
    v.mutation_authority!=="none" || !["current","partial"].includes(String(v.history_state)) || !Array.isArray(v.events) || v.events.length>200) fail();
  const pkg=object(v.package);text(pkg.title);text(pkg.status);nullableText(pkg.owner_repo);timestamp(v.projected_at);
  if(!Number.isSafeInteger(v.event_count) || Number(v.event_count)<v.events.length)fail();
  const sections=object(v.sections);
  for(const key of ["intake","work_design","refinement","closeout"]){
    const section=object(sections[key]);if(!["current","unavailable","not-recorded"].includes(String(section.state)))fail();text(section.detail);
    if(section.state!=="current"){if(section.data!==null)fail();continue;}
    if(key==="intake"){const entry=assertDeliveryIntakeRecord(section.data);if(entry.target_ref!==ref)fail();continue;}
    const data=object(section.data);if(data.source_ref!==ref || !Array.isArray(data.records) || data.records.length>200 || !Number.isSafeInteger(data.total_records) || typeof data.truncated!=="boolean" || Number(data.total_records)<data.records.length || data.truncated!==(Number(data.total_records)>data.records.length))fail();text(data.state);
    if(new Set(data.records.map(item=>text(object(item).id))).size!==data.records.length)fail();
    for(const item of data.records){const row=object(item);text(row.id);text(row.title);text(row.state);if(row.at!==null)timestamp(row.at);nullableText(row.actor);nullableText(row.receipt_ref);nullableText(row.digest);if(!["ok","info","danger"].includes(String(row.tone)))fail();strings(row.evidence_refs);}
  }
  if(new Set(v.events.map(item=>text(object(item).event_id))).size!==v.events.length)fail();
  for(const item of v.events){const e=object(item);text(e.event_id);text(e.title);text(e.actor);nullableText(e.receipt_ref);timestamp(e.occurred_at);if(!["ok","info","danger"].includes(String(e.tone)))fail();strings(e.evidence_refs);}
  return value as DeliveryHistoryProjection;
}
function object(value: unknown): Record<string,unknown>{if(!value || typeof value!=="object" || Array.isArray(value))fail();return value as Record<string,unknown>;}
function text(value:unknown):string{if(typeof value!=="string" || !value.trim() || value.length>32000)fail();return value as string;}
function nullableText(value:unknown){if(value!==null)text(value);}
function timestamp(value:unknown){if(!Number.isFinite(Date.parse(text(value))))fail();}
function strings(value:unknown){if(!Array.isArray(value) || value.length>2048 || value.some(x=>typeof x!=="string"))fail();}
function targetRef(value:unknown){const s=text(value);if(!/^openproject:\/\/work_packages\/[1-9][0-9]*$/.test(s))fail();return s;}
function fail():never{throw new Error("Delivery owner history is missing, foreign or malformed.");}
