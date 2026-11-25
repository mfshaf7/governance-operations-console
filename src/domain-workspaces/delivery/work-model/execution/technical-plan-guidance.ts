import type { AdvisorReply } from "../../../../agent-console/model/advisor-drafts.ts";
import type { DeliveryReadModel } from "../../read-model/index.ts";
import type { DeliveryChangeNode } from "../../live-runtime/delivery-change-live-types.ts";
import type { DeliveryArtNode } from "../../domain/delivery-execution.ts";
import { technicalPlanWorkItems } from "./technical-plan-model.ts";

type RelatedWork = {
  id: number;
  title: string | null;
  status: string | null;
  targetPI: string | null;
  iteration: string | null;
};

function workFacts(node: DeliveryArtNode) {
  return {
    title: node.title, status: node.backend_status,
    targetPI: node.planning?.targetPI ?? null, iteration: node.planning?.iteration ?? null,
  };
}

export type TechnicalPlanSourceContext = { tree: DeliveryChangeNode; revision: string };

export function technicalPlanGuidanceScope(
  model: DeliveryReadModel,
  deliveryId: string,
  workItemId: number,
  sourceContext?: TechnicalPlanSourceContext,
) {
  if (model.source_truth !== "OpenProject-backed OOS") return null;
  const target = technicalPlanWorkItems(model, deliveryId).find(node => node.legacy_work_package_id === workItemId);
  if (!target || ["done", "retired"].includes(target.backend_status)) return null;

  const nodes = [...model.art_tree.roots];
  const known = new Map<number, DeliveryArtNode>();
  const dependents: number[] = [];
  for (const node of nodes) {
    nodes.push(...node.children);
    if (!node.legacy_work_package_id) continue;
    known.set(node.legacy_work_package_id, node);
    if (node.depends_on_work_package_ids?.includes(workItemId)) dependents.push(node.legacy_work_package_id);
  }
  const external = new Map(model.planning_external_dependencies?.map(item => [item.id, item]));
  for (const item of external.values()) if (item.requires.includes(workItemId)) dependents.push(item.id);
  function related(ids: number[]): RelatedWork[] {
    return [...new Set(ids)].filter(id => id !== workItemId).sort((a, b) => a - b).map(id => {
      const local = known.get(id), remote = external.get(id);
      return local ? { id, ...workFacts(local) } : { id, title: remote?.title ?? null,
        status: remote?.status ?? null, targetPI: remote?.target_pi ?? null, iteration: remote?.iteration ?? null };
    });
  }
  const prerequisites = related(target.depends_on_work_package_ids ?? []);
  const dependentWork = related(dependents);
  // The overview is deliberately compact. Reuse the scoped Execution detail
  // read for the selected record's actual description and planning fields.
  const sourceNodes = sourceContext && `delivery-${sourceContext.tree.id}` === deliveryId ? [sourceContext.tree] : [];
  let detail: DeliveryChangeNode | undefined;
  for (const node of sourceNodes) {
    if (node.id === workItemId && node.record_ref === `openproject://work_packages/${workItemId}`) {
      detail = node;
      break;
    }
    sourceNodes.push(...node.children);
  }
  if (detail && ["done", "retired"].includes(detail.status)) return null;
  const work = {
    id: workItemId, ...workFacts(target),
    ...(detail ? {
      title: detail.subject,
      status: detail.status,
      ...(detail.target_pi === undefined ? {} : { targetPI: detail.target_pi }),
      ...(detail.iteration === undefined ? {} : { iteration: detail.iteration }),
    } : {}),
    description: detail?.description ?? target.description,
    repository: target.owner_repo ?? null,
  };
  const sourceRevision = detail ? sourceContext?.revision : model.projection_state.source_revision;
  if (!sourceRevision || prerequisites.length + dependentWork.length > 100) return null;
  const basis = JSON.stringify([workItemId, work.targetPI, work.iteration, work.repository,
    prerequisites.map(({ id, targetPI, iteration }) => [id, targetPI, iteration]),
    dependentWork.map(({ id, targetPI, iteration }) => [id, targetPI, iteration])]);
  return { deliveryId, work, prerequisites, dependentWork, sourceRevision, basis };
}

export type TechnicalPlanGuidanceScope = NonNullable<ReturnType<typeof technicalPlanGuidanceScope>>;
export type TechnicalPlanStarter = { rationale: string; verification: string; success: string; failure: string; rollback: string[] };

const adviceTitles = {
  "PLAN RECOMMENDED": "A Technical Plan would help",
  "LIGHTWEIGHT APPROACH": "A lightweight approach may be enough",
  "MORE INFORMATION": "More information needed",
} as const;

const guidanceBoundary = "Assess only the selected execution work. Use recorded dependencies and saved iterations as context. Include related work across iterations when it affects this item. Do not include unrelated work in the same iteration or claim a work-start requirement.";
export const technicalPlanGuidancePrompt = [
  guidanceBoundary,
  "Consider irreversible changes, dependencies, coordination, data or access changes, and release or recovery sequencing.",
  "Give advice only. Use intent=answer and edits=[].",
  "Start the message with exactly PLAN RECOMMENDED, LIGHTWEIGHT APPROACH, or MORE INFORMATION on its own line.",
  "Explain why in plain language using the supplied work. Identify missing information when needed.",
].join(" ");
export const technicalPlanStarterPrompt = [
  guidanceBoundary,
  "Propose an editable starter for this one selected work item. Describe the approach and implementation order in rationale.",
  "Propose one verification check with a success outcome and a failure outcome, and practical rollback steps.",
  "Do not claim completed work, source revisions, approvals, access, or authority.",
  "Use intent=answer and edits=[]. The message must contain only a JSON object with string keys rationale, verification, success and failure and an array of strings in rollback.",
].join(" ");

export function parseTechnicalPlanGuidance(reply: AdvisorReply) {
  if (reply.edits.length) throw Error("A Technical Plan recommendation must be read-only.");
  if (reply.intent === "clarify") return { title: adviceTitles["MORE INFORMATION"], reason: reply.message.trim(), recommendPlan: false };
  const [heading, ...text] = reply.message.trim().split(/\r?\n/);
  const label = heading.trim().replace(/^#{1,6}\s+/, "").replace(/^\*\*(.*)\*\*$/, "$1").replace(/[.:]$/, "").toUpperCase();
  const match = (Object.keys(adviceTitles) as Array<keyof typeof adviceTitles>).find(value => value === label);
  const reason = text.join("\n").trim();
  if (reply.intent !== "answer" || !match || !reason) throw Error("The advisor did not return a clear Technical Plan recommendation.");
  return { title: adviceTitles[match], reason, recommendPlan: match === "PLAN RECOMMENDED" };
}

export function parseTechnicalPlanStarter(reply: AdvisorReply): TechnicalPlanStarter {
  if (reply.intent !== "answer" || reply.edits.length) throw Error("The advisor did not return an editable starter plan.");
  let value: unknown;
  try { value = JSON.parse(reply.message.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1")); }
  catch { throw Error("The advisor returned a starter plan in an unreadable format."); }
  const requiredText = (text: unknown, max: number): text is string => typeof text === "string" && Boolean(text.trim()) && text.length <= max;
  const plan = value as Partial<TechnicalPlanStarter> | null;
  if (!plan || Object.keys(plan).sort().join() !== "failure,rationale,rollback,success,verification" ||
      !requiredText(plan.rationale, 8_000) || !requiredText(plan.verification, 500) ||
      !requiredText(plan.success, 2_000) || !requiredText(plan.failure, 2_000) ||
      !Array.isArray(plan.rollback) || plan.rollback.length < 1 || plan.rollback.length > 8 ||
      !plan.rollback.every(step => requiredText(step, 1_000))) throw Error("The advisor returned an incomplete starter plan.");
  return plan as TechnicalPlanStarter;
}
