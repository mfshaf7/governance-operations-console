import assert from "node:assert/strict";
import test from "node:test";
import { sourceEditorOwnerFixture } from "../support/source-editor-owner-fixture.mjs";
import { readDeliveryEditorFiles, readDeliveryEditorDraft, saveDeliveryEditorDraft } from "../../src/domain-workspaces/delivery/server/delivery-source-editor-oos-client.ts";
import { readPrototypeEditorFiles, savePrototypeEditorDraft } from "../../src/domain-workspaces/prototype/server/prototype-source-editor-oos-client.ts";
import { readPrototypeSourceDraft } from "../../src/domain-workspaces/prototype/server/prototype-source-oos-client.ts";
import { sourceSaveCommand } from "../../src/console-integration/source-authoring/source-editor-model.ts";
import { sourceCanonicalDigest as digest } from "../../src/console-integration/source-authoring/server/source-editor-evidence.ts";

for (const kind of ["prototype", "delivery"]) {
  test(`case:1326-adapter-binding-negative: ${kind} keeps an invalid post-save acknowledgement uncertain and recovers the same command`, async () => {
    const owner = await sourceEditorOwnerFixture(kind);
    const options = kind === "delivery" ? { env: owner.env } : { config: owner.config }, id = kind === "delivery" ? 71 : owner.requestId;
    const files = kind === "delivery" ? readDeliveryEditorFiles : readPrototypeEditorFiles, save = kind === "delivery" ? saveDeliveryEditorDraft : savePrototypeEditorDraft;
    try {
      const initial = await files(id, [owner.filePath], options), command = sourceSaveCommand(initial.current, owner.objective, "Retain an exact immutable source save", [{ path: owner.filePath, content: "// retained source\n", expectedDigest: initial.capture.files[0].content_digest, changed: true, deleted: false }], "manual", "uncertain-ack", new Date().toISOString());
      owner.setTamper((value, suffix) => suffix === "save" ? { ...value, session_id: "source-session:foreign" } : value);
      await assert.rejects(save(id, command, options), { code: "source_editor_save_unconfirmed", status: 502 });
      assert.equal(owner.writes.length, 1);
      owner.setTamper(null);
      const ack = await save(id, command, options); assert.equal(ack.replayed, true); assert.equal(ack.savedDigest, owner.draft.digest);
      assert.deepEqual(owner.writes[0], owner.writes[1]);
    } finally { await owner.close(); }
  });
  test(`case:1326-consumer-contract-positive / adapter-binding-positive: ${kind} uses authenticated actual owner scope for manual save, retained diff and immutable replay`, async () => {
    const owner = await sourceEditorOwnerFixture(kind);
    const options = kind === "delivery" ? { env: owner.env } : { config: owner.config }, id = kind === "delivery" ? 71 : owner.requestId;
    const files = kind === "delivery" ? readDeliveryEditorFiles : readPrototypeEditorFiles, save = kind === "delivery" ? saveDeliveryEditorDraft : savePrototypeEditorDraft, readDraft = kind === "delivery" ? readDeliveryEditorDraft : readPrototypeSourceDraft;
    try {
      const tree = await files(id, [], options); assert.equal(tree.capture.files.length, 0); assert.deepEqual(tree.capture.tree.paths, [owner.filePath]);
      const captured = await files(id, [owner.filePath], options); assert.equal(captured.capture.files[0].content, owner.original);
      const first = sourceSaveCommand(tree.current, owner.objective, "Update imported app source", [{ path: owner.filePath, content: owner.original.replace("false", "true"), expectedDigest: captured.capture.files[0].content_digest, changed: true, deleted: false }], "import", `${kind}-first`, new Date().toISOString());
      const ack = await save(id, first, options); assert.equal(ack.current.state, "draft-ready"); assert.equal(ack.current.attempt.executionId, first.execution_id);
      const draft = await readDraft(id, options); assert.equal(draft.digest, ack.savedDigest); assert.equal(draft.objective, owner.objective); assert.equal(draft.change_set.operations[0].content, owner.original.replace("false", "true")); assert.equal(draft.provenance.inputOrigin, "import");
      const second = sourceSaveCommand(ack.current, owner.objective, "Revise the retained app source", [{ path: owner.filePath, content: owner.original.replace("false", "true") + "// reviewed\r\n", expectedDigest: captured.capture.files[0].content_digest, changed: true, deleted: false }], "manual", `${kind}-second`, new Date().toISOString());
      const next = await save(id, second, options); assert.notEqual(next.savedDigest, ack.savedDigest); assert.equal(next.current.attempt.executionId, first.execution_id);
      const replay = await save(id, first, options); assert.equal(replay.replayed, true); assert.equal(replay.savedDigest, ack.savedDigest); assert.equal(replay.current.attempt.digest, next.savedDigest); assert.notEqual(replay.current.revision, replay.savedRevision);
      await assert.rejects(save(id, { ...first, objective: first.objective + "changed" }, options));
      assert.ok(owner.writes.every(value => !Object.hasOwn(value, "operator_id") && !Object.hasOwn(value, "repository")));
      assert.equal((await fetch(`${owner.config.baseUrl}/v1/anything`)).status, 401);
    } finally { await owner.close(); }
  });
  test(`case:1326-consumer-contract-negative / adapter-binding-negative: ${kind} rejects browser authority, cross-session and corrupt owner text`, async () => {
    const owner = await sourceEditorOwnerFixture(kind);
    const options = kind === "delivery" ? { env: owner.env } : { config: owner.config }, id = kind === "delivery" ? 71 : owner.requestId;
    const files = kind === "delivery" ? readDeliveryEditorFiles : readPrototypeEditorFiles, save = kind === "delivery" ? saveDeliveryEditorDraft : savePrototypeEditorDraft;
    try {
      const initial = await files(id, [], options), command = sourceSaveCommand(initial.current, owner.objective, "Update sample source safely", [{ path: `${kind === "prototype" ? "prototypes/sample/" : "src/"}new.ts`, content: "export const value = 1;\n", expectedDigest: null, changed: true, deleted: false }], "manual", "negative", new Date().toISOString());
      for (const addition of [{ operator_id: "forged" }, { repository: "other/owner" }, { context: {} }, { source_intent_ref: "ambient" }]) await assert.rejects(save(id, { ...command, ...addition }, options));
      assert.equal(owner.writes.length, 0);
      owner.setTamper((value, suffix) => suffix === "files" ? { ...value, session_id: "source-session:other" } : value);
      await assert.rejects(files(id, [], options));
      owner.setTamper((value, suffix) => suffix === "files" ? { ...value, files: value.files.map(file => ({ ...file, content: "altered text" })) } : value);
      await assert.rejects(files(id, [owner.filePath], options));
      owner.setTamper(null);
      if (kind === "prototype") await assert.rejects(save(id, { ...command, operations: [{ ...command.operations[0], path: "prototypes/other/new.ts" }] }, options), /scope/);
      else await assert.rejects(save(id, { ...command, operations: [{ ...command.operations[0], path: ".env" }] }, options));
      assert.equal(owner.writes.length, 0);
    } finally { await owner.close(); }
  });
  test(`case:1326-adapter-binding-positive: ${kind} amendments retain original model history without claiming model attestation for edited bytes`, async () => {
    const owner = await sourceEditorOwnerFixture(kind, { model: true });
    const options = kind === "delivery" ? { env: owner.env } : { config: owner.config }, id = kind === "delivery" ? 71 : owner.requestId;
    const files = kind === "delivery" ? readDeliveryEditorFiles : readPrototypeEditorFiles, save = kind === "delivery" ? saveDeliveryEditorDraft : savePrototypeEditorDraft, readDraft = kind === "delivery" ? readDeliveryEditorDraft : readPrototypeSourceDraft;
    try {
      const captured = await files(id, [owner.filePath], options), originalDigest = owner.draft.digest;
      const command = sourceSaveCommand(captured.current, owner.objective, "Amend the model draft explicitly", [{ path: owner.filePath, content: owner.original + "// manual amendment\r\n", expectedDigest: captured.capture.files[0].content_digest, changed: true, deleted: false }], "manual", "amend-model", new Date().toISOString());
      assert.equal(command.execution_id, "model-execution:initial");
      const ack = await save(id, command, options), draft = await readDraft(id, options);
      assert.notEqual(ack.savedDigest, originalDigest); assert.equal(draft.provenance.origin, "operator-amended-model"); assert.equal(draft.provenance.originalModel, true);
      assert.equal(draft.change_set.objective_digest, digest(owner.objective)); assert.equal(owner.draft.operator_draft.previous_draft_digest, originalDigest);
      assert.equal(Object.hasOwn(draft, "model"), false);
      owner.setTamper((value, suffix) => suffix === "draft" ? { ...value, objective: "Forged original objective that cannot match this saved change." } : value);
      await assert.rejects(readDraft(id, options), /objective|digest/);
    } finally { await owner.close(); }
  });
}
