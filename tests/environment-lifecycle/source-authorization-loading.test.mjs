// Isolated hook/component units, not credential issuance or operating proof.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as contract from "../../src/environment-lifecycle/live-runtime/source-authorization-contract.ts";
import * as operationContract from "../../src/environment-lifecycle/live-runtime/platform-operation-contract.ts";

const require = createRequire(import.meta.url);
const hookPath = "../../src/environment-lifecycle/live-runtime/use-source-authorization.ts";
const panelPath = "../../src/environment-lifecycle/presentation/source-authorization-panel.tsx";
const hash = value => `sha256:${value.repeat(64)}`;
const sourceStart = hash("a"), base = "/api/platform-operations/source-authorizations";
const tick = () => new Promise(resolve => setImmediate(resolve));
const response = projection => Response.json({ mode: "live", projection, error: null });
function compile(path, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(name => dependencies[name] ?? require(name), module, module.exports);
  return module.exports;
}
// Only React's hook scheduling port is simulated. The real hook, HTTP handling,
// source parsers and scopes execute unchanged; no source-text behavior assertions.
function mount(subject, digest = sourceStart) {
  const slots = [], effects = []; let cursor = 0, scheduled = false, output;
  let args = [subject, digest, null, null];
  const equal = (a, b) => a?.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  function schedule() { if (!scheduled) { scheduled = true; queueMicrotask(() => { scheduled = false; render(); }); } }
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => {
      const next = typeof value === "function" ? value(slots[i]) : value;
      if (!Object.is(slots[i], next)) { slots[i] = next; schedule(); }
    }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; if (!slots[i] || !equal(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !equal(slots[i], deps)) { slots[i] = deps; effects.push(fn); } },
  };
  const { useSourceAuthorization } = compile(hookPath, { react: hooks,
    "./source-authorization-contract.ts": contract, "./platform-operation-contract.ts": operationContract });
  function render() { cursor = 0; output = useSourceAuthorization(...args); for (const effect of effects.splice(0)) effect(); }
  render();
  return { current: () => output, change: (...value) => { args = value; render(); } };
}
function scope(kind, name, state, created) {
  const subject = kind === "prototype" ? { kind, prototype_id: "prototype:sample", registry_ref: "record://prototypes/sample",
    registry_revision: "b".repeat(40), source_ref: "repo://studio/prototypes/sample", source_revision: "b".repeat(40) }
    : kind === "delivery" ? { kind, work_item_ref: "work-item-42", snapshot_digest: hash("b") }
      : { kind, owner_repo: "sample", intake_entry_ref: { id: "repo:sample", version: 1, digest: hash("b") },
        custody_receipt_digest: hash("b"), template_digest: hash("c"), plan_digest: hash("d"), decision_ref: "operator:synthetic",
        workflow_write: false, workflow_approval_ref: null, allowed_paths: ["AGENTS.md"] };
  const intent = { schema_version: 1, purpose: kind === "repository-bootstrap" ? "trusted-owner-bootstrap" : "ordinary-source",
    intent_id: `source-intent:${name}`, caller_id: "oos", operator_id: "operator:synthetic", subject, source_start_digest: sourceStart,
    repository: "example/sample", repository_id: 123, installation_id: 456, landing_unit_id: "source-sample", branch: "feature/sample",
    fetched_base: "b".repeat(40), human_reviewer_id: "synthetic-reviewer", expires_at: "2030-10-20T19:00:00.000Z", supersedes_intent_digest: null };
  const decision = { schema_version: 1, artifact_type: "delivery_art_work_session_decision", work_item_id: "work-item-42", covered_work_item_ids: ["work-item-42"], caller_id: "console",
    operator: { id: "operator:synthetic", decision_source: "operator" }, landing_unit: { id: "source-sample", decision: "feature_single_landing_unit", split_reason: "One owner.", base_ref: "origin/main", branch: "feature/sample", rollback_boundary: "Revert source." },
    architecture: { required: false, artifact_location: null }, human_gate_work_item_ids: { security_acceptance: [] } };
  return contract.assertSourceOperationPreparation({ schema_version: 1, workflow_id: "source-credential-preparation", intent_id: intent.intent_id,
    source_intent: intent, source_intent_digest: hash(name === "old" ? "c" : "d"), session_id: null, created_at: created,
    start_decision: kind === "delivery" ? decision : null, operation_refs: { issue: null, revoke: null },
    authorization: { state, approval_ref: null, credential_receipt: null }, authority: "operator-orchestration-service", secret_values_embedded: false });
}
const selector = kind => kind === "prototype" ? { kind, prototype_id: "prototype:sample", source_request_id: "source-request:sample" }
  : kind === "delivery" ? { kind, work_item_ref: "work-item-42" } : { kind, owner_repo: "sample", source_request_id: "bootstrap-request:sample" };

for (const kind of ["prototype", "delivery", "repository-bootstrap"]) {
  test(`${kind}: canonical loading/error is not empty; stale callbacks cannot prepare`, async t => {
    let release, posts = 0;
    const waiting = new Promise(resolve => { release = resolve; });
    t.mock.method(globalThis, "fetch", async (_path, init) => { if (init?.method === "POST") posts++; return waiting; });
    const app = mount(selector(kind));
    assert.equal(app.current().pending, true); assert.equal(app.current().ready, false);
    await app.current().prepare(); assert.equal(posts, 0);
    release(Response.json({ mode: "live", error: "Unavailable" }, { status: 503 })); await tick();
    assert.equal(app.current().ready, false); assert.equal(app.current().pending, false);
    assert.match(app.current().error, /unavailable/); await app.current().prepare(); assert.equal(posts, 0);
  });
  test(`${kind}: explicitly selected revoked predecessor survives refresh and binds successor`, async t => {
    const old = scope(kind, "old", "revoked", "2030-10-20T10:00:00.000Z");
    const newer = scope(kind, "newer", "prepared", "2030-10-20T11:00:00.000Z");
    let values = [newer, old], posted;
    t.mock.method(globalThis, "fetch", async (path, init) => {
      assert.equal(path, base);
      if (init?.method === "POST") {
        posted = JSON.parse(init.body);
        const next = scope(kind, "successor", "prepared", "2030-10-20T12:00:00.000Z");
        next.source_intent.supersedes_intent_digest = posted.supersedesIntentDigest;
        values = [next, newer, old]; return response(next);
      }
      return response(values);
    });
    const app = mount(selector(kind)); await tick();
    assert.equal(app.current().preparation.intent_id, newer.intent_id);
    await app.current().prepare(); assert.equal(posted, undefined); // prepared is not a revoked predecessor
    await app.current().refresh(); await tick();
    app.current().select(old); await tick(); assert.equal(app.current().preparation.intent_id, old.intent_id);
    await app.current().refresh(); await tick(); assert.equal(app.current().preparation.intent_id, old.intent_id);
    await app.current().prepare(); await tick();
    assert.equal(posted.supersedesIntentDigest, old.source_intent_digest);
    assert.deepEqual(posted.subject, selector(kind));
    assert.equal(app.current().preparation.intent_id, "source-intent:successor");
    assert.equal(app.current().preparation.source_intent.supersedes_intent_digest, old.source_intent_digest);
  });
}

test("late reads and changed/disappeared scopes cannot silently replace explicit selection", async t => {
  const old = scope("prototype", "old", "revoked", "2030-10-20T10:00:00.000Z");
  let values = [old], delayed = null;
  t.mock.method(globalThis, "fetch", async () => delayed ?? response(values));
  const app = mount(selector("prototype")); await tick();
  app.current().select(old); await tick();
  values = []; await app.current().refresh(); await tick();
  assert.equal(app.current().ready, false); assert.equal(app.current().preparation, null);
  let finish; delayed = new Promise(resolve => { finish = resolve; });
  const previous = app.current().refresh();
  app.change({ kind: "prototype", prototype_id: "prototype:other", source_request_id: "source-request:other" }, hash("e"), null, null);
  assert.equal(app.current().preparation, null); assert.equal(app.current().pending, true);
  delayed = null; finish(response([old])); await previous; await tick();
  await app.current().refresh(); await tick();
  assert.equal(app.current().preparation, null); assert.equal(app.current().candidates.length, 0);
});

test("actual panel renders loading/offline controls and retained Prototype/Bootstrap scopes", () => {
  let runtime = { ready: false, pending: true, error: null, preparation: null, operation: null, candidates: [], refresh() {}, command() {}, prepare() {}, select() {} };
  // Neutral Teras ports isolate panel branching; actual React SSR renders its JSX.
  const container = ({ children }) => React.createElement("section", null, children);
  const teras = { TerasActionButton: ({ children, disabled }) => React.createElement("button", { disabled }, children),
    TerasActionRow: container, TerasFieldStack: container, TerasPanel: container,
    TerasMetadataList: () => null, TerasPanelHeader: ({ statusLabel }) => React.createElement("span", null, statusLabel) };
  const { SourceAuthorizationPanel } = compile(panelPath, { "@/teras": teras,
    "../live-runtime/use-source-authorization.ts": { useSourceAuthorization: () => runtime } });
  const render = kind => renderToStaticMarkup(React.createElement(SourceAuthorizationPanel, { subject: selector(kind), sourceStartDigest: sourceStart, onIntentChange() {} }));
  assert.match(render("prototype"), /Loading/); assert.doesNotMatch(render("prototype"), /Prepare source scope/);
  runtime = { ...runtime, pending: false, error: "Unavailable" };
  assert.match(render("prototype"), /Unavailable/); assert.doesNotMatch(render("prototype"), /Prepare source scope/);
  runtime = { ...runtime, error: null, ready: true };
  assert.match(render("prototype"), /Prepare source scope/);
  for (const kind of ["prototype", "repository-bootstrap"]) {
    const old = scope(kind, "old", "revoked", "2030-10-20T10:00:00.000Z");
    runtime = { ...runtime, preparation: old, candidates: [old] };
    assert.match(render(kind), /Recover original source-intent:old \/ revoked/);
    assert.match(render(kind), /Prepare explicit successor scope/);
  }
});

test("approved source continuation uses the selected intent and keeps revocation independent", async () => {
  const buttons = [];
  let runtime = { ready: true, pending: false, error: null,
    preparation: scope("delivery", "old", "approved", "2030-10-20T10:00:00.000Z"),
    operation: null, candidates: [], refresh() {}, command() {}, prepare() {}, select() {} };
  const container = ({ children }) => React.createElement("section", null, children);
  const teras = { TerasActionButton: props => { buttons.push(props); return React.createElement("button", { disabled: props.disabled }, props.children); },
    TerasActionRow: container, TerasFieldStack: container, TerasPanel: container,
    TerasMetadataList: () => null, TerasPanelHeader: () => null };
  const { SourceAuthorizationPanel } = compile(panelPath, { "@/teras": teras,
    "../live-runtime/use-source-authorization.ts": { useSourceAuthorization: () => runtime } });
  const calls = [], callback = async intent => { calls.push(intent); };
  const render = (extra = {}) => {
    buttons.length = 0;
    return renderToStaticMarkup(React.createElement(SourceAuthorizationPanel, {
      subject: selector("delivery"), sourceStartDigest: sourceStart, onIntentChange() {},
      onContinueApprovedScope: callback, ...extra,
    }));
  };
  const continuation = () => buttons.find(button => button.children === "Continue Approved Source Access");
  assert.match(render(), /Continue Approved Source Access/);
  await continuation().onClick();
  runtime.preparation = scope("delivery", "newer", "approved", "2030-10-20T11:00:00.000Z");
  render(); await continuation().onClick();
  assert.deepEqual(calls, ["source-intent:old", "source-intent:newer"]);

  render({ continuePending: true }); assert.equal(continuation().disabled, true);
  assert.equal(buttons.find(button => button.children === "Stop and revoke this exact scope").disabled, false);
  runtime.pending = true; render(); assert.equal(continuation().disabled, true);
  runtime.pending = false;
  assert.doesNotMatch(render({ onContinueApprovedScope: undefined }), /Continue Approved Source Access/);
  runtime.ready = false; assert.doesNotMatch(render(), /Continue Approved Source Access/);
  runtime.ready = true;
  for (const state of ["prepared", "revoked", "revocation-requested", "expired"]) {
    runtime.preparation = { ...runtime.preparation, authorization: { state, credential_receipt: null } };
    assert.doesNotMatch(render(), /Continue Approved Source Access/, state);
  }
});
