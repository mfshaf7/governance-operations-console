// Isolated synthetic browser/API conformance; never live model or provider evidence.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
const base = process.env.CONSOLE_MODEL_TEST_URL ?? "http://127.0.0.1:3318";
if (new URL(base).hostname !== "127.0.0.1" || new URL(base).port === "3317") throw Error("Use a separate loopback test instance.");
const hash = value => "sha256:" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
const cloud = hash("cloud"), local = hash("local"), tasks = ["synthetic-advisor-v1/planning", "synthetic-assistant-v1/response"];
let config = { backends: {}, models: {}, default: null, overrides: {} }, revision = 0, records = [], offline = false, loseNext = false, missingReads = 0;
const writes = [], errors = [];
function snapshot() { return { revision, current_revision: revision, digest: hash(config), configuration: structuredClone(config), history: Array.from({ length: revision + 1 }, (_, i) => ({ revision: i, digest: hash(i) })) }; }
function registry() { return { schema_version: 1, tasks, backends: [
  { backend_id: "cloud", provider: "codex-app-server", allowed_tasks: tasks, registered: Boolean(config.backends.cloud), account_login_supported: true, availability: "not-probed" },
  { backend_id: "local", provider: "ollama", allowed_tasks: tasks, registered: Boolean(config.backends.local), account_login_supported: false, availability: "not-probed" },
], configuration: snapshot() }; }
function operation(request, state = "completed") {
  const command = "oos-model:" + hash(request.request_id).slice(7) + ":1";
  return { schema_version: 1, workflow_id: "model-operations", request_id: request.request_id, revision: 1, request, state, owner_command_id: command, attempt: 1,
    owner_receipt: state === "completed" ? { command_id: command, command_digest: hash(request), actor: "operator:synthetic", action: request.action, previous_revision: request.expected_configuration_revision, revision, configuration_digest: hash(config), receipt_digest: hash(command) } : null,
    applied_configuration: state === "completed" ? snapshot() : null, account_login: state === "awaiting-account" ? {
      command_id: command, request_digest: hash(request), backend_id: "cloud", actor: "operator:synthetic", state: "waiting-for-operator", verification_url: "https://example.invalid/sign-in", user_code: "SYNTHETIC", failure: null,
    } : null, failure: null, history: [{ sequence: 1, type: "synthetic-owner-result", state, occurred_at: new Date().toISOString() }], next_action: state === "awaiting-account" ? "complete-account-sign-in" : "complete" };
}
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1560, height: 1100 } }); page.setDefaultTimeout(20000);
 page.on("pageerror", error => errors.push(error.message));
 await page.route("**/api/**", async route => {
  const req = route.request(), url = new URL(req.url()), path = url.pathname, method = req.method();
  if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [{ id: "model-operations", mutation: { state: "available" }, source: { state: "available" } }] } });
  if (!path.startsWith("/api/model-operations/runtime/")) { assert.equal(method, "GET"); return route.fulfill({ status: 503, json: { error: "Unrelated owner isolated" } }); }
  if (offline) return route.fulfill({ status: 503, json: { error: "Synthetic owner unavailable" } });
  if (path.endsWith("/connections") && method === "GET") return route.fulfill({ status: 503, json: { error: "Provider connections are outside this routing case" } });
  if (path.endsWith("/registry")) return route.fulfill({ json: registry() });
  if (path.endsWith("/catalogue")) return route.fulfill({ json: { backend_id: url.searchParams.get("backend_id"), models: [{ model: "synthetic-model", supported_efforts: null, model_digest: null, runtime_version: "synthetic" }] } });
  if (path.endsWith("/requests") && method === "GET") return route.fulfill({ json: { requests: records, next_cursor: null } });
  if (path.endsWith("/requests") && method === "POST") {
   const input = req.postDataJSON(); writes.push(input); assert.equal(input.expected_configuration_revision, revision);
   if (input.action === "backend.register") config.backends[input.input.backend_id] = { backend_id: input.input.backend_id };
   else if (input.action === "model.register") { const id = input.input.backend_id === "cloud" ? cloud : local; config.models[id] = { backend_id: input.input.backend_id, model: input.input.backend_id + "-model", supported_efforts: input.input.backend_id === "cloud" ? ["low", "high"] : [false, true], model_digest: null, runtime_version: "synthetic", verification_ref: hash(id) }; }
   else if (input.action === "routing.save") { config.default = input.input.default; config.overrides = input.input.overrides; }
   else if (input.action !== "account.login.start") throw Error("Unexpected browser mutation: " + input.action);
   const account = input.action === "account.login.start"; if (!account) revision++;
   const result = operation(input, account ? "awaiting-account" : "completed"); records.unshift(result);
   if (loseNext) { loseNext = false; missingReads = 1; return route.fulfill({ status: 503, json: { error: "Synthetic lost acknowledgement" } }); }
   return route.fulfill({ status: 202, json: result });
  }
  const id = decodeURIComponent(path.split("/")[5]), selected = records.find(item => item.request_id === id); assert.ok(selected, "Original request must exist");
  if (method === "GET") { if (missingReads-- > 0) return route.fulfill({ status: 503, json: { error: "Synthetic temporarily unreachable readback" } }); return route.fulfill({ json: selected }); }
  assert.ok(path.endsWith("/controls")); const control = req.postDataJSON(); writes.push(control); assert.equal(control.action, "cancel");
  selected.state = "cancelled"; selected.next_action = "complete"; selected.revision++; selected.account_login.state = "cancelled";
  return route.fulfill({ json: selected });
 });
 async function open() {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => { const n = [...document.querySelectorAll("button")].find(x => x.title === "Open MODEL"); const k = n && Object.keys(n).find(x => x.startsWith("__reactProps$")); return Boolean(k && n[k].onClick); });
  await page.locator('button[title="Open MODEL"]').click();
  await page.getByRole("button", { name: "Manage registrations", exact: true }).waitFor();
 }
 async function choose(label, option, index = 0) {
  await page.getByRole("button", { name: label, exact: true }).nth(index).click();
  await page.getByRole("option", { name: option, exact: true }).click();
 }
 async function back() { await page.getByRole("button", { name: "Back to Models & routing", exact: true }).click(); }
 async function registrations() { await page.getByRole("button", { name: "Manage registrations", exact: true }).click(); }
 async function routing() { await page.getByRole("button", { name: "Review routing", exact: true }).click(); }
 async function clear() { await page.getByRole("button", { name: "Clear selection", exact: true }).click(); await back(); }
 async function register(backend) {
  await registrations();
  await choose("Admitted backend", backend + " · " + (backend === "cloud" ? "codex-app-server" : "ollama"));
  await page.getByRole("button", { name: "Register backend", exact: true }).click(); await clear(); await registrations();
  await page.getByRole("button", { name: "Discover models", exact: true }).click();
  await choose("Model", "synthetic-model");
  await page.getByRole("button", { name: "Verify & register model", exact: true }).click(); await clear();
 }
 await open(); assert.equal(writes.length, 0); await register("cloud"); await register("local"); await routing();
 await choose("Selection mode", "Choose registered models");
 await choose("Primary model", "cloud-model · cloud");
 await choose("Native effort", "High");
 await page.getByRole("button", { name: "Add explicit fallback", exact: true }).click();
 await choose("Fallback 1", "local-model · local");
 await choose("Native effort", "Thinking off", 1);
 const prior = writes.length;
 await back();
 await page.getByRole("button", { name: "Keep editing", exact: true }).click(); assert.equal(writes.length, prior);
 loseNext = true; await page.getByRole("button", { name: "Save routing", exact: true }).click();
 await page.getByRole("dialog", { name: "Model operation history", exact: true }).getByText("Synthetic lost acknowledgement", { exact: true }).waitFor();
 assert.equal(writes.length, prior + 1); const original = records[0].request_id;
 assert.equal(records[0].request.input.default.primary.effort, "high"); assert.equal(records[0].request.input.default.fallbacks[0].effort, false);
 await open(); await page.getByText(original, { exact: true }).waitFor(); await clear(); assert.equal(writes.length, prior + 1, "Cold recovery reads the same ID and never resubmits");
 await page.getByText("Synthetic advisor · planning", { exact: true }).click(); await routing();
 await choose("Selection mode", "Use existing profile binding");
 await page.getByRole("button", { name: "Save routing", exact: true }).click(); await clear();
 assert.equal(config.overrides[tasks[0]], null); assert.equal(config.default.primary.model_id, cloud); await routing();
 await choose("Selection mode", "Choose registered models"); revision++;
 await page.getByRole("button", { name: "Refresh owner state", exact: true }).click();
 await page.getByText("Reload and review the current settings before saving.", { exact: true }).waitFor();
 assert.equal(await page.getByRole("button", { name: "Save routing", exact: true }).isEnabled(), false);
 await page.getByRole("button", { name: "Reload saved settings", exact: true }).click(); await page.getByRole("button", { name: "Discard draft", exact: true }).click();
 await back(); await registrations(); await choose("Admitted backend", "cloud · codex-app-server");
 await page.getByRole("button", { name: "Connect account", exact: true }).click();
 await page.getByText("SYNTHETIC", { exact: true }).waitFor();
 assert.equal(await page.getByRole("button", { name: "Open account sign-in", exact: true }).count(), 1);
 await page.getByRole("button", { name: "Cancel operation", exact: true }).click(); await clear();
 if (process.env.CONSOLE_MODEL_SCREENSHOT) await page.screenshot({ path: process.env.CONSOLE_MODEL_SCREENSHOT });
 offline = true; await page.getByRole("button", { name: "Refresh", exact: true }).click(); await page.getByText("Synthetic owner unavailable", { exact: true }).waitFor();
 await registrations(); assert.equal(await page.getByRole("button", { name: "Connect account", exact: true }).isEnabled(), false);
 assert.deepEqual(errors, []);
 console.log("Model runtime synthetic browser conformance PASS: cold registration, discovery, native efforts/fallback, dirty guard, lost acknowledgement/cold original-ID recovery, task source override, stale revision denial, native account cancellation, unavailable owner denial. No live provider or owner changes.");
} finally { await browser.close(); }
