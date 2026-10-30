// Controlled UI conformance only. Every API is intercepted; no vendor/account proof.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";
const base = process.env.CONSOLE_MODEL_TEST_URL ?? "http://127.0.0.1:3341";
if (new URL(base).hostname !== "127.0.0.1" || new URL(base).port === "3317") throw Error("Use a separate loopback test instance.");
const stable = value => Array.isArray(value) ? "[" + value.map(stable).join(",") + "]" : value && typeof value === "object" ? "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}" : JSON.stringify(value);
const hash = value => "sha256:" + createHash("sha256").update(stable(value)).digest("hex");
const actor = "operator:synthetic", tasks = ["synthetic-advisor-v1/planning"];
const maturity = { experimental: true, qualification: "real-account-verification-pending" };
const presets = [
  { provider: "claude-api", label: "Claude API", endpoint_origin: "https://api.anthropic.com", catalogue_supported: true, ...maturity },
  { provider: "deepseek-api", label: "DeepSeek API", endpoint_origin: "https://api.deepseek.com", catalogue_supported: true, ...maturity },
  { provider: "glm-api", label: "GLM · Z.AI Standard API", endpoint_origin: "https://api.z.ai", catalogue_supported: false, ...maturity },
];
const connections = [], operations = new Map(), commands = [], errors = [];
let connectionRevision = 0, configurationRevision = 0, keyWrites = 0, loseKeyReply = true, rejectMetadata = false;
const configuration = { backends: {}, models: {}, default: null, overrides: {} };
const configurationSnapshot = () => ({ revision: configurationRevision, current_revision: configurationRevision, digest: hash(configuration), configuration, history: [{ revision: configurationRevision, digest: hash(configuration) }] });
const connectionSnapshot = () => ({ revision: connectionRevision, presets, connections });
function registry() {
  return { schema_version: 1, tasks, backends: [
    { backend_id: "managed-codex", provider: "codex-app-server", allowed_tasks: tasks, registered: false, account_login_supported: true, availability: "not-probed" },
    { backend_id: "local-ollama", provider: "ollama", allowed_tasks: tasks, registered: false, account_login_supported: false, availability: "not-probed" },
    ...connections.map(item => ({ backend_id: item.connection_id, provider: item.provider, allowed_tasks: tasks, registered: false, account_login_supported: false,
      availability: "not-probed", ...maturity, catalogue_supported: item.provider !== "glm-api", verification_max_tokens: 4096 })),
  ], configuration: configurationSnapshot() };
}
function finish(command, item) {
  const previous = connectionRevision++; item.pending_operation = null;
  const value = { command_id: command.command_id, command_digest: hash({ actor, command }), actor, action: command.action, connection_id: item.connection_id,
    previous_revision: previous, revision: connectionRevision, state_digest: hash(connectionSnapshot()) };
  const receipt = { ...value, receipt_digest: hash(value) };
  operations.set(command.command_id, { command_id: command.command_id, command_digest: receipt.command_digest, actor, action: command.action,
    connection_id: item.connection_id, state: "finished", receipt });
  return receipt;
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30_000); page.on("pageerror", error => errors.push(error.message));
try {
  await page.route("**/api/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [{ id: "model-operations", mutation: { state: "available" }, source: { state: "available" } }] } });
    if (!path.startsWith("/api/model-operations/runtime/")) {
      assert.equal(method, "GET", "Unrelated mutations are forbidden");
      return route.fulfill({ status: 503, json: { error: "Unrelated controlled preview read" } });
    }
    const suffix = path.slice("/api/model-operations/runtime".length);
    if (method === "GET" && suffix === "/registry") return route.fulfill({ json: registry() });
    if (method === "GET" && suffix === "/requests") return route.fulfill({ json: { requests: [], next_cursor: null } });
    if (method === "GET" && suffix === "/connections") return route.fulfill({ json: connectionSnapshot() });
    if (method === "GET" && suffix.startsWith("/connections/operations/")) {
      const op = operations.get(decodeURIComponent(suffix.split("/").at(-1)));
      return route.fulfill({ status: op ? 200 : 404, json: op ?? { error: "No original effect" } });
    }
    if (method === "POST" && suffix === "/connections/commands") {
      const command = req.postDataJSON(); commands.push(command);
      if (rejectMetadata) { rejectMetadata = false; return route.fulfill({ status: 409, json: { code: "model_operations_revision-conflict", error: "Synthetic known pre-effect conflict" } }); }
      assert.equal(command.expected_revision, connectionRevision);
      let item = connections.find(item => item.connection_id === command.input.connection_id);
      if (command.action === "connection.create") {
        item = { connection_id: "api-" + hash({ actor, command: command.command_id }).slice(7, 39), provider: command.input.provider, name: command.input.name,
          state: "active", credential_generation: null, credential_present: false, pending_operation: null, updated_at: new Date().toISOString(), ...maturity };
        connections.push(item);
      } else if (command.action === "connection.disconnect") {
        if (item.pending_operation) operations.get(item.pending_operation).state = "cancelled";
        item.state = "disconnected"; item.credential_generation = null; item.credential_present = false;
      } else if (command.action === "connection.reconnect") item.state = "active";
      else if (command.action === "connection.remove") connections.splice(connections.indexOf(item), 1);
      else throw Error("Unexpected metadata action");
      return route.fulfill({ json: finish(command, item) });
    }
    if (method === "POST" && suffix === "/connections/credentials") {
      const input = req.postDataJSON(); assert.equal(input.api_key, "synthetic-browser-test-key"); keyWrites++;
      const safe = { command_id: input.command_id, expected_revision: input.expected_revision, action: "connection.credentials", input: { connection_id: input.connection_id } };
      commands.push(safe); const item = connections.find(item => item.connection_id === input.connection_id);
      if (loseKeyReply) {
        loseKeyReply = false; item.pending_operation = safe.command_id;
        operations.set(safe.command_id, { command_id: safe.command_id, command_digest: hash({ actor, command: safe }), actor, action: safe.action,
          connection_id: item.connection_id, state: "pending", receipt: null });
        return route.abort("failed");
      }
      item.credential_generation = hash(safe); item.credential_present = true;
      return route.fulfill({ json: finish(safe, item) });
    }
    if (method === "POST" && suffix === "/connections/reconcile") {
      const input = req.postDataJSON(); assert.deepEqual(Object.keys(input), ["command_id"]);
      const safe = commands.find(item => item.command_id === input.command_id), item = connections.find(item => item.connection_id === safe.input.connection_id);
      item.credential_generation = hash(safe); item.credential_present = true; finish(safe, item);
      return route.fulfill({ json: operations.get(input.command_id) });
    }
    await route.abort("blockedbyclient"); throw Error("Unspecified model route was blocked: " + suffix);
  });
  async function open() {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator('button[title="Open MODEL"]').click({ timeout: 60_000 });
    await page.getByRole("heading", { name: "Backends & models", exact: true }).waitFor();
  }
  async function choose(label, option) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }
  async function dialog() { await page.getByRole("button", { name: "Add / manage API connections", exact: true }).click(); }
  async function noSecretStored() {
    const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    assert.equal(stored.includes("synthetic-browser-test-key"), false); assert.equal(stored.includes('"api_key"'), false);
  }
  await open(); await dialog();
  await expect(page.getByRole("dialog", { name: "API connections", exact: true })).toContainText("Experimental — real-account testing pending");
  for (const preset of presets) {
    await choose("Provider", preset.label + " · Experimental");
    await page.getByRole("textbox", { name: "Connection name", exact: true }).fill("Test " + preset.provider);
    await page.getByRole("button", { name: "Create named connection", exact: true }).click();
    await page.getByRole("button", { name: "Clear completed operation", exact: true }).click();
  }
  rejectMetadata = true;
  await page.getByRole("button", { name: "Create named connection", exact: true }).click();
  await page.getByRole("button", { name: "Clear rejected command", exact: true }).click();
  await choose("Named connection", "Test claude-api · active");
  await page.getByLabel("API key", { exact: true }).fill("synthetic-browser-test-key");
  await noSecretStored(); await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await dialog(); await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
  await page.getByLabel("API key", { exact: true }).fill("synthetic-browser-test-key");
  await page.getByRole("button", { name: "Store key securely", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "API connections", exact: true })).toContainText("Connection completion is unconfirmed");
  assert.equal(keyWrites, 1); await noSecretStored();
  await open(); await dialog(); await choose("Named connection", "Test claude-api · active");
  await expect(page.getByRole("button", { name: "Store key securely", exact: true })).toBeDisabled();
  assert.equal(keyWrites, 1, "Cold recovery cannot resubmit a key");
  await page.getByRole("button", { name: "Reconcile original operation", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "API connections", exact: true })).toContainText("Present in Platform custody");
  await page.getByRole("button", { name: "Clear completed operation", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "API connections", exact: true })).toContainText("Experimental — real-account testing pending");
  await page.getByLabel("Replacement API key", { exact: true }).fill("synthetic-browser-test-key");
  await choose("Named connection", "Test deepseek-api · active");
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
  await choose("Named connection", "Test claude-api · active");
  await page.getByRole("button", { name: "Disconnect & clear key", exact: true }).click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "API connections", exact: true })).toContainText("No stored key");
  await page.getByRole("button", { name: "Clear completed operation", exact: true }).click();
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await page.getByRole("button", { name: "Clear completed operation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Store key securely", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await choose("Admitted backend", "Test glm-api · GLM · Z.AI Standard API · Experimental");
  await expect(page.getByRole("textbox", { name: "Exact model ID", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Discover models", exact: true })).toBeDisabled();
  await expect(page.locator('[data-model-runtime-control="true"]')).toContainText("Experimental — real-account testing pending");
  await noSecretStored(); assert.equal(keyWrites, 1); assert.deepEqual(errors, []);
  if (process.env.CONSOLE_MODEL_TEST_SCREENSHOT) {
    await page.screenshot({ path: process.env.CONSOLE_MODEL_TEST_SCREENSHOT });
    await dialog(); await choose("Named connection", "Test glm-api · active");
    await page.getByRole("dialog", { name: "API connections", exact: true }).screenshot({ path: process.env.CONSOLE_MODEL_TEST_SCREENSHOT.replace(/\.png$/, "-connections.png") });
  }
  writeFileSync(process.env.CONSOLE_MODEL_TEST_RECEIPT ?? "/tmp/provider-connections-browser.json", JSON.stringify({ result: "passed", evidence: "controlled browser conformance only", real_account_qualification: "pending", key_writes: keyWrites, safe_commands: commands, errors }, null, 2));
  console.log("Provider connection browser conformance passed; no real-account or live configuration effects.");
} finally { await browser.close(); }
