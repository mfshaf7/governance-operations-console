import { assertOperatorDraftCommand, sourcePathIssue } from "../../../console-integration/source-authoring/source-editor-contract.ts";
import { SourceEditorUnconfirmedSaveError, sourceBoundedFetch, sourceEditorState, verifySourceCapture, verifySourceDraft, verifySourceSaveAcknowledgement } from "../../../console-integration/source-authoring/server/source-editor-evidence.ts";
import { readDeliverySourceRealization } from "./delivery-source-realization-oos-client.ts";
import { readDeliveryWorkSession } from "./delivery-work-session-oos-client.ts";
import { deliveryOosRequest, resolveDeliveryOosConfig } from "./delivery-oos-client.ts";
import { deliveryWorkSessionTargetId } from "../live-runtime/delivery-work-session-live-contract.ts";

type Options = { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch };
async function binding(workItemId: number, options: Options) {
  const [session, realization] = await Promise.all([readDeliveryWorkSession(workItemId, options), readDeliverySourceRealization(workItemId, options)]);
  if (!session.session_id || !session.source || session.session_id !== realization.session_id) throw new Error("Select the actual prepared source work session.");
  return { sessionId: session.session_id, base: session.source.base_commit, realization };
}
async function request(workItemId: number, suffix: string, options: Options, command?: unknown) {
  const target = deliveryWorkSessionTargetId(workItemId), config = resolveDeliveryOosConfig(options.env);
  return deliveryOosRequest(config, `/v1/delivery-work-items/${target}/work-session/realization/${suffix}`, {
    method: command === undefined ? "GET" : "POST", headers: { "x-oos-operator-id": config.operatorId },
    ...(command === undefined ? {} : { body: JSON.stringify({ realization: command }) }),
  }, sourceBoundedFetch(options.fetchImpl), 75000, command === undefined ? {
    authority: "operator-orchestration-service", sourceOwner: "workspace-delivery-art", recordRef: `openproject://work_packages/${target}/source-realization/${suffix.split("?")[0]}`,
  } : undefined);
}
export async function readDeliveryEditorFiles(workItemId: number, paths: string[], options: Options = {}) {
  const current = await binding(workItemId, options), query = new URLSearchParams(); paths.forEach(path => query.append("path", path));
  return { capture: verifySourceCapture(await request(workItemId, `files${query.size ? `?${query}` : ""}`, options), current, paths), current: sourceEditorState(current.realization) };
}
export async function readDeliveryEditorDraft(workItemId: number, options: Options = {}) {
  const current = await binding(workItemId, options), r = current.realization;
  return { ...verifySourceDraft(await request(workItemId, "draft", options), { ...current, revision: r.revision, digest: r.attempt?.change_set?.digest ?? null, accepted: r.state === "source-created" }, "delivery-art-source-draft"), editorState: sourceEditorState(r) };
}
export async function saveDeliveryEditorDraft(workItemId: number, value: unknown, options: Options = {}) {
  const command = assertOperatorDraftCommand(value);
  if (command.objective.length < 20 || command.objective.length > 12000 || command.operations.some(row => sourcePathIssue(row.path, null))) throw new Error("The draft is outside the Delivery text-source contract.");
  const before = await binding(workItemId, options);
  const response = await request(workItemId, "draft", options, command);
  try {
    const acknowledged = verifySourceSaveAcknowledgement(response, command, before), current = await readDeliverySourceRealization(workItemId, options);
    if (current.session_id !== before.sessionId) throw new Error("The owner source session changed during save readback.");
    return { ...acknowledged, current: sourceEditorState(current) };
  } catch { throw new SourceEditorUnconfirmedSaveError(); }
}
