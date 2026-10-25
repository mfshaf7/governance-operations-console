import { createServer } from "node:http";
import { canonicalSourceResponse } from "./console-source-projection.mjs";
import { sourceCanonicalDigest as digest, sourceTextDigest as textDigest } from "../../src/console-integration/source-authoring/server/source-editor-evidence.ts";

// Explicit synthetic owner for consumer protocol tests. It never reaches an
// external service, invokes a model or claims real source-delivery authority.
export async function sourceEditorOwnerFixture(kind, { model = false } = {}) {
  const at = "2026-10-25T00:00:00.000Z", base = "a".repeat(40), sessionId = `source-session:${kind}`, requestId = "prototype-source-request:sample";
  const objective = "Update the accepted sample source through the Console.";
  const prefix = kind === "prototype" ? "prototypes/sample/" : "src/", filePath = `${prefix}app.ts`, original = "\uFEFFexport const complete = false;\r\n";
  const commands = new Map(), writes = [], reads = [];
  let revision = at, attempt = null, retainedDraft = null, tamper = null, sequence = 1;
  const sourceRequest = { schema_version: 1, request_id: requestId, prototype_id: "prototype:sample", expected_registry_revision: base, expected_source_revision: base, objective, requested_at: at };
  function realization() {
    return { schema_version: 1, workflow_id: kind === "prototype" ? "prototype-source-realization" : "delivery-art-source-realization", session_id: sessionId,
      ...(kind === "delivery" ? { work_item_id: "work-item-71" } : {}), revision, state: attempt?.state ?? "not-started", replayed: false, attempt: structuredClone(attempt),
      next_action: { code: attempt ? kind === "prototype" ? "prototype-source-acceptance-required" : "source-realization-acceptance-required" : kind === "prototype" ? "prototype-source-generation-required" : "source-realization-start-required", authority: "operator-orchestration-service", reason: "Review the bounded source draft." } };
  }
  function projectPrototype() {
    return { schema_version: 1, workflow_id: "prototype-source-authoring", request_id: requestId, prototype_id: "prototype:sample", session_id: sessionId, state: "source-work", created_at: at, updated_at: revision,
      source_start_digest: digest("source start"), subject: { kind: "prototype", prototype_id: "prototype:sample", registry_ref: "record://prototypes/sample", registry_revision: base, source_ref: "repo://workspace-prototype-studio/prototypes/sample", source_revision: base },
      source_scope: { source_root: "prototypes/sample", design_profile: "docs/prototypes/sample/design-profile.md" }, landing_unit: { landing_unit_id: "source-sample", branch: "feature/source-sample", fetched_base: base },
      next_action: { code: "prototype-source-acceptance-required", authority: "operator-orchestration-service" }, canonical_mutation: false, runtime_activation: false,
      source_request: sourceRequest, source_intent_ref: "source-intent:sample", source_delivery: {}, realization: realization() };
  }
  function save(command, initialModel = false) {
    revision = new Date(Date.parse(at) + sequence++ * 1000).toISOString();
    const change = { schema_version: 1, change_set_id: `operator-change-set:${digest(command).slice(7)}`, session_id: sessionId, base_commit: base, objective_digest: digest(command.objective), commit_message: command.commit_message, operations: command.operations };
    const previous = attempt, originalModel = previous?.operator_draft?.original_model ?? previous?.model ?? null;
    const provenance = initialModel ? null : { origin: originalModel ? "operator-amended-model" : "operator", input_origin: command.input_origin, operator_id: "operator:test-owner", command_id: command.command_id,
      amended_at: revision, previous_draft_ref: previous ? "history:previous" : null, previous_draft_digest: previous?.change_set.digest ?? null, original_model: originalModel };
    const generation = { schema_version: 1, request_id: command.command_id, execution_id: command.execution_id, expected_revision: at, budget_tokens: 4000, retry_of: null, requested_at: at, source_intent_ref: "source-intent:sample" };
    attempt = { request: previous?.request ?? (initialModel ? generation : { kind: "operator", command_id: command.command_id, execution_id: command.execution_id, objective: command.objective }),
      request_id: previous?.request_id ?? command.command_id, execution_id: command.execution_id, requested_at: at, completed_at: revision, retry_of: null, objective_digest: change.objective_digest, state: "draft-ready",
      context: initialModel ? { packet_ref: "cgg://synthetic-packet" } : null, model: initialModel ? { profile_id: kind === "prototype" ? "prototype-source-authoring-v1" : "source-realization-v1" } : null, source_receipt: null, failure: null,
      ...(provenance ? { operator_draft: provenance } : {}), change_set: { digest: digest(change), change_set_id: change.change_set_id, commit_message: command.commit_message, operations: command.operations.map(({ content, ...op }) => ({ ...op, content_digest: content === null ? null : digest(content) })) } };
    retainedDraft = { schema_version: 1, workflow_id: kind === "prototype" ? "prototype-source-draft" : "delivery-art-source-draft", ...(kind === "prototype" ? { request_id: requestId } : {}), session_id: sessionId, revision,
      digest: digest(change), objective: command.objective, change_set: change, accepted: false, operator_draft: provenance };
    return realization();
  }
  if (model) save({ command_id: "model-draft:initial", execution_id: "model-execution:initial", objective, commit_message: "Update model-proposed source", operations: [{ action: "replace", path: filePath, content: original.replace("false", "true"), expected_digest: textDigest(original) }] }, true);
  const server = createServer(async (request, response) => {
    try {
      if (request.headers["x-oos-caller-secret"] !== "synthetic-source-secret" || request.headers["x-oos-operator-id"] !== "operator:test-owner") { response.writeHead(401); response.end("{}"); return; }
      const url = new URL(request.url, "http://owner.invalid"), suffix = url.pathname.split("/").at(-1);
      let value;
      if (request.method === "POST") {
        const chunks = []; for await (const chunk of request) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString()), command = kind === "delivery" ? body.realization : body;
        writes.push(command);
        const prior = commands.get(command.command_id);
        if (prior) { if (prior.digest !== digest(command)) { response.writeHead(409); response.end("{}"); return; } value = { ...prior.ack, replayed: true }; }
        else {
          if (command.expected_revision !== revision || command.expected_change_set_digest !== (attempt?.change_set.digest ?? null)) { response.writeHead(409); response.end("{}"); return; }
          value = save(command); commands.set(command.command_id, { digest: digest(command), ack: structuredClone(value) });
        }
        if (tamper) value = tamper(structuredClone(value), "save");
        response.writeHead(200, { "Content-Type": "application/json" }); response.end(JSON.stringify(value)); return;
      }
      reads.push(request.url);
      if (suffix === "files") {
        const selected = url.searchParams.getAll("path");
        const body = { schema_version: 1, session_id: sessionId, owner_repo: kind === "prototype" ? "workspace-prototype-studio" : "independent-example-owner", landing_unit_id: "source-sample", head_commit: base, clean: true,
          tree: { paths: [filePath], total_path_count: 1, truncated: false }, files: selected.map(path => ({ path, content: original, content_digest: textDigest(original), size_bytes: Buffer.byteLength(original) })), admitted_bytes: selected.length * Buffer.byteLength(original) };
        value = { ...body, context_digest: textDigest(JSON.stringify(body)) };
      } else if (suffix === "draft") {
        if (!retainedDraft) { response.writeHead(404); response.end("{}"); return; } value = structuredClone(retainedDraft);
      } else if (kind === "prototype") value = projectPrototype();
      else if (suffix === "realization") value = realization();
      else value = { workflow_id: "delivery-art-work-session", delivery_id: "delivery-70", work_item_id: "work-item-71", landing_unit_id: "source-sample", session_id: sessionId, session_revision: at, state: "source-work",
        next_action: { authority: "operator-orchestration-service", code: "source-work-required", reason: "Complete the bounded source work." }, source: { base_commit: base, head_commit: base, branch: "feature/source-sample", changed_files: [], state: "clean", upstream_commit: null } };
      if (tamper) value = tamper(structuredClone(value), suffix);
      const recordRef = kind === "prototype" ? `oos://prototype-source-requests/${requestId}${["draft", "files"].includes(suffix) ? `/${suffix}` : ""}`
        : `openproject://work_packages/71${suffix === "work-session" ? "" : `/source-realization${suffix === "realization" ? "" : `/${suffix}`}`}`;
      const envelope = canonicalSourceResponse(value, { recordRef, sourceOwner: kind === "prototype" ? "operator-orchestration-service" : "workspace-delivery-art" });
      response.writeHead(200, { "Content-Type": "application/json" }); response.end(await envelope.text());
    } catch (error) { response.writeHead(500); response.end(JSON.stringify({ error: String(error.message) })); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`, config = { baseUrl, callerId: "governance-operations-console", callerSecret: "synthetic-source-secret", operatorId: "operator:test-owner" };
  return { base, sessionId, requestId, filePath, original, objective, writes, reads, get revision() { return revision; }, get draft() { return retainedDraft; }, setTamper: value => { tamper = value; }, config,
    env: { OOS_BASE_URL: baseUrl, OOS_CALLER_ID: config.callerId, OOS_CALLER_SECRET: config.callerSecret, GOVERNANCE_CONSOLE_OPERATOR_ID: config.operatorId }, close: () => new Promise(resolve => server.close(resolve)) };
}
