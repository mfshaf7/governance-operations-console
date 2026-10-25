import { assertOperatorDraftCommand, sourcePathIssue } from "../../../console-integration/source-authoring/source-editor-contract.ts";
import { SourceEditorUnconfirmedSaveError, sourceBoundedFetch, sourceEditorState, verifySourceCapture, verifySourceSaveAcknowledgement } from "../../../console-integration/source-authoring/server/source-editor-evidence.ts";
import { resolveConsoleOosOperatorConfiguration, type ConsoleOosOperatorConfiguration } from "../../../console-integration/configuration/console-runtime-configuration.ts";
import { prototypeOwnerRequest } from "./prototype-landing-oos-client.ts";
import { readPrototypeSource } from "./prototype-source-oos-client.ts";
import { prototypeSourceRequestId } from "../live-runtime/prototype-source-contract.ts";

type Options = { config?: ConsoleOosOperatorConfiguration; fetchImpl?: typeof fetch };
async function request(id: string, suffix: string, options: Options, command?: unknown) {
  const config = options.config ?? resolveConsoleOosOperatorConfiguration(), base = `/v1/prototype-source-requests/${encodeURIComponent(prototypeSourceRequestId(id))}`;
  return prototypeOwnerRequest(`${base}/${suffix}`, { method: command === undefined ? "GET" : "POST", headers: { "x-oos-operator-id": config.operatorId },
    ...(command === undefined ? {} : { body: JSON.stringify(command) }), redirect: "error" }, { ...options, fetchImpl: sourceBoundedFetch(options.fetchImpl), config }, command === undefined ? {
    authority: "operator-orchestration-service", sourceOwner: "operator-orchestration-service", recordRef: `oos://prototype-source-requests/${id}/${suffix.split("?")[0]}`,
  } : undefined, 2 * 1024 * 1024, 75000);
}
export async function readPrototypeEditorFiles(id: string, paths: string[], options: Options = {}) {
  const current = await readPrototypeSource(id, options);
  if (!current.session_id || current.source_request.owner_preparation || paths.some(path => sourcePathIssue(path, current.source_scope))) throw new Error("Select a prepared app/design source session and its bounded paths.");
  const query = new URLSearchParams(); paths.forEach(path => query.append("path", path));
  const capture = verifySourceCapture(await request(id, `files${query.size ? `?${query}` : ""}`, options), { sessionId: current.session_id, base: current.landing_unit.fetched_base, ownerRepo: "workspace-prototype-studio" }, paths);
  if (capture.tree.paths.some(path => path !== current.source_scope.design_profile && !path.startsWith(`${current.source_scope.source_root}/`))) throw new Error("The owner tree escapes this Prototype's app/design scope.");
  if (!current.realization) throw new Error("The source request has no realization session.");
  return { capture, current: sourceEditorState(current.realization) };
}
export async function savePrototypeEditorDraft(id: string, value: unknown, options: Options = {}) {
  const command = assertOperatorDraftCommand(value), before = await readPrototypeSource(id, options);
  if (!before.session_id || before.source_request.owner_preparation || command.objective !== before.source_request.objective || command.operations.some(row => sourcePathIssue(row.path, before.source_scope))) throw new Error("Only this canonical app/design objective and scope are editable; trusted owner preparations remain inspect-only.");
  const response = await request(id, "draft", options, command);
  try {
    const acknowledged = verifySourceSaveAcknowledgement(response, command, { sessionId: before.session_id, base: before.landing_unit.fetched_base }), current = await readPrototypeSource(id, options);
    if (!current.realization || current.session_id !== before.session_id) throw new Error("The Prototype source session changed during save readback.");
    return { ...acknowledged, current: sourceEditorState(current.realization) };
  } catch { throw new SourceEditorUnconfirmedSaveError(); }
}
