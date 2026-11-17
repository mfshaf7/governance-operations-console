import { assertSelectedProject, type SelectedProject, type SelectedProjectKnowledge } from "../model/selected-project-context.ts";
import { hasSecretLikeMaterial } from "../model/agent-input-policy.ts";
import { readProposalLiveRecord } from "../../domain-workspaces/proposal/server/project-context.ts";
import { readCanonicalPrototypeWorkspace } from "../../domain-workspaces/prototype/server/project-context.ts";
import { readDeliveryRegister } from "../../domain-workspaces/delivery/server/project-context.ts";

export async function readSelectedProjectKnowledge(value: SelectedProject, signal?: AbortSignal,
  options: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } = {}): Promise<SelectedProjectKnowledge> {
  const selection = assertSelectedProject(value);
  const fetchImpl: typeof fetch = (input, init) => (options.fetchImpl ?? fetch)(input, {
    ...init, signal: AbortSignal.any([...(signal ? [signal] : []), ...(init?.signal ? [init.signal] : []), AbortSignal.timeout(30_000)]) });
  let title: string, sourceRef: string, sourceRevision: string, observations: Record<string, unknown>;
  let coverage: string;
  if (selection.kind === "proposal") {
    const record = await readProposalLiveRecord(selection.id, { ...options, fetchImpl }), source = record.projection;
    if (source.proposal_id !== selection.id || source.projection_state !== "current" || record.summaryOnly)
      throw Error("Selected Proposal details are unavailable. Refresh the item before asking again.");
    title = source.title; sourceRef = source.record_ref; sourceRevision = source.record_version;
    observations = { title, body: source.body, recordedTriage: source.triage_summary,
      recordedDecisionNotes: source.decision_notes, status: source.status, route: source.route, handoff: source.handoff };
    coverage = "Current recorded Proposal body, triage, decision and handoff. Local unsaved forms, linked document contents and target project details are not loaded.";
  } else if (selection.kind === "prototype") {
    const source = await readCanonicalPrototypeWorkspace({ ...options, fetchImpl, selection: { id: selection.id.slice("prototype-".length) } });
    const record = source.readModel.records.find(item => item.id === selection.id);
    if (!record) throw Error("Selected Prototype is unavailable. Refresh its register before asking again.");
    title = record.name; sourceRef = record.sourceRef; sourceRevision = record.projectionVersion;
    observations = { name: title, summary: record.summary, lifecycle: record.lifecycle,
      candidate: record.candidate, baseline: record.baseline, openIssues: record.openIssues,
      boundary: { dataMode: record.dataMode, mutation: record.mutationBoundary, visibility: record.visibilityTier } };
    coverage = "Current owner-projected Prototype intent, candidate, baseline and open issues. Setup defaults remain unaccepted input. Repository files, linked proof contents, live runtime and unsaved browser changes are not loaded.";
  } else {
    const result = await readDeliveryRegister(new URLSearchParams({ id: selection.id, surface: "work-design", scope: "current" }), signal,
      { ...options, fetchImpl, allowLegacy: false });
    const source = result.projection, record = source.packages.find(item => item.delivery_package_id === selection.id);
    if (!record || source.projection_state.status !== "fresh") throw Error("Selected Delivery details are unavailable. Refresh the item before asking again.");
    title = record.display_name; sourceRef = record.source_ref; sourceRevision = source.projection_state.source_revision;
    const context = record.work_design_context_session;
    observations = { title, summary: record.summary, status: record.backend_status, phase: record.workflow_phase,
      blocker: record.active_blocker ?? null, sourceCustody: record.source_custody,
      contextBrief: context ? { note: context.note, accepted: context.accepted, version: context.version ?? null, sessionRef: context.session_ref } : null };
    coverage = "Current selected Delivery summary, workflow posture and projected Context Brief if present. Complete architecture diagrams, child work, linked proof, repository files and unsaved drafts are not loaded.";
  }
  const knowledge = { selection, title, sourceRef, sourceRevision, observedAt: new Date().toISOString(), observations, coverage };
  const content = JSON.stringify(knowledge);
  if (content.length > 16_000) throw Error("This item's context is too large. Open its specific workflow and ask about the relevant field or diagram.");
  if (hasSecretLikeMaterial(content)) throw Error("Selected project details contain secret-like material and cannot enter model context.");
  return knowledge;
}
