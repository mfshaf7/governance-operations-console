// Isolated synthetic UI/HTTP conformance, not live operating or app evidence.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { buildRepositoryProvisionRequest } from "../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
import { provisioningResult } from "../tests/support/repository-provisioning-result.mjs";
const base = process.env.CONSOLE_REPOSITORY_GATE_TEST_URL ?? "http://127.0.0.1:3318";
const parsed = new URL(base);
if (parsed.hostname !== "127.0.0.1" || parsed.port === "3317") throw new Error("Use a separate loopback test instance, never the operator Console.");
const digest = value => `sha256:${value.repeat(64)}`, now = new Date().toISOString(), owner = "isolated-bootstrap";
const config = { operatorId: "operator:synthetic-console", policyProfileRef: { uri: "repo://synthetic/custody", digest: digest("2") }, credentialBindingRef: { uri: "platform://synthetic/provisioning", digest: digest("3") } };
const custody = provisioningResult(buildRepositoryProvisionRequest({ approvalNote: "Synthetic isolated owner setup, no live provisioning.", custodyKind: "dedicated-owner-repo", repositoryDescription: "Isolated owner controls.",
  repositoryName: owner, repositoryOwner: "example-organization", requestedAt: now, requestId: "repository-custody-request:isolated-bootstrap", templateReviewed: true, visibility: "public", workspaceOwnerRef: `repo:${owner}` }, config));
const scope = "/api/repository-owner-bootstrap", commands = [], creates = [], preparations = [], errors = [];
let current = null, unavailable = false, uncertainCancel = true;
const summary = () => ({ requestId: "bootstrap-request:isolated-original", ownerRepo: owner, state: "prepared", revision: now, sourceRevision: now,
  sourceStartDigest: digest("a"), sessionId: "repository-bootstrap-session:isolated", sourceIntentRef: null,
  nextAction: "owner-bootstrap-authorization-and-start-required", draft: { state: "draft-ready", digest: digest("b"), revision: now }, sourceDelivery: {}, existingCheckout: null, cancellation: null });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  // Exercise the actual mounted server boundary before isolating browser APIs.
  for (const path of [`${scope}/preparations`, `${scope}/requests`, `${scope}/requests/original`]) {
    const denied = await page.request.post(`${base}${path}`, { data: {}, headers: { "x-oos-operator-id": "browser-forgery" } });
    assert.ok([401, 403, 503].includes(denied.status()), `Unverified session must not reach OOS: ${path}`);
    assert.equal((await denied.text()).includes("browser-forgery"), false);
  }
  await page.route("**/api/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const projection = value => route.fulfill({ json: { mode: "live", projection: value, error: null } });
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live",
      capabilities: ["repository-provisioning", "workspace-intake"].map(id => ({ id, mutation: { state: "available" }, source: { state: "available" } })) } });
    if (path === "/api/repositories/custody/requests") return route.fulfill({ json: { schema_version: 1, mode: "live", status: "current", error: null, records: [custody], next_cursor: null } });
    if (path === "/api/workspace-intake/requests" && request.method() === "GET") return route.fulfill({ json: { schema_version: 1, workflow_id: "workspace-intake", target: { kind: "repo", name: owner, record_id: `repo:${owner}` }, custody_request_id: custody.request.request_id,
      revision: 0, pending_request_count: 0, updated_at: null, next_cursor: null, records: [] } });
    if (path === "/api/platform-operations/source-authorizations") return projection([]);
    if (path.startsWith(scope)) {
      if (unavailable) return route.fulfill({ status: 503, json: { mode: "live", projection: null, error: "Synthetic owner unavailable; preserve the original request." } });
      if (request.method() === "GET") {
        if (path === `${scope}/requests`) return projection({ records: current ? [current] : [], pendingRequest: current && !["succeeded", "cancelled"].includes(current.state) ? current : null });
        if (path.endsWith("/draft")) return projection({ schema_version: 1, workflow_id: "repository-owner-bootstrap-draft", request_id: current.requestId, revision: now, digest: current.draft.digest,
          change_set: { operations: [{ path: "AGENTS.md", content: '<script>window.unsafeBootstrapExecuted = true</script>\n# Inert trusted fixture\n' }] } });
        return projection(current);
      }
      const input = request.postDataJSON();
      if (path === `${scope}/preparations`) {
        preparations.push(input);
        assert.equal(input.evidenceProfile.owner_repo, owner); assert.equal(input.withCi, true);
        assert.deepEqual(input.evidenceProfile.commands.map(value => [value.kind, value.executable, value.args, value.fidelity, value.conformance_binding]), [
          ["tests", "node", ["app/test.mjs"], "pure-unit", "matching-fidelity"], ["validations", "git", ["diff", "--check"], "real-git", "none"],
        ]);
        assert.equal(Object.hasOwn(input, "operatorId"), false);
        return projection({ preparation_digest: digest("c"), plan: { requires_workflow_permission: true,
          files: [{ path: ".github/workflows/validate.yaml", content: "# Reviewed synthetic workflow; inert text only.\n" }] } });
      }
      if (path === `${scope}/requests`) { creates.push(input); assert.equal(input.workflowApproved, true); assert.equal(input.expectedPreparationDigest, digest("c")); current = { ...summary(), requestId: input.requestId }; return projection(current); }
      commands.push(input);
      assert.equal(path, `${scope}/requests/${encodeURIComponent(current.requestId)}`);
      assert.equal(input.action, "cancel-unapplied");
      if (uncertainCancel) {
        uncertainCancel = false; current = { ...current, nextAction: "owner-bootstrap-cancellation-recovery-required", cancellation: { state: "unknown", command: { reason: input.reason } } };
        return route.fulfill({ status: 503, json: { mode: "live", projection: null, error: "Synthetic lost cancellation acknowledgement; recover original command." } });
      }
      current = { ...current, state: "cancelled", nextAction: "owner-bootstrap-cancelled", cancellation: { ...current.cancellation, state: "succeeded" } }; return projection(current);
    }
    assert.equal(request.method(), "GET", `No unrelated mutation is allowed: ${path}`);
    return route.fulfill({ status: 503, json: { error: "Unrelated owner deliberately isolated.", mode: "live", status: "offline" } });
  });
  async function openSetup() {
    console.log("Opening isolated Repository owner setup");
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /REPOSITORY/i }).first().click();
    console.log("Opened Repository register");
    await page.getByText(owner, { exact: true }).first().click();
    await page.getByRole("button", { name: "Prepare Workspace Intake", exact: true }).click();
    console.log("Opened Repository Intake");
    await page.getByRole("button", { name: "Prepare or recover repository owner controls", exact: true }).click();
    await page.getByRole("button", { name: "Refresh original owner requests", exact: true }).waitFor();
    return page.locator('[data-teras-surface="repository-owner-bootstrap"]');
  }
  async function select(label, index, choice) {
    await page.getByRole("button", { name: label, exact: true }).nth(index).click();
    await page.getByRole("option", { name: choice, exact: true }).click();
  }
  await openSetup();
  await page.getByLabel("Owner profile id", { exact: true }).fill("isolated-profile-v1");
  await page.getByLabel("Actual application marker paths (one per line)", { exact: true }).fill("app/main.mjs");
  await select("Does this project need optional CI?", 0, "Create the reviewed optional CI workflow");
  for (const [index, kind, executable, args, fidelity, binding] of [[0, "tests", "node", "app/test.mjs", "pure-unit", "matching-fidelity"], [1, "validations", "git", "diff\n--check", "real-git", "none"]]) {
    await page.getByLabel(`Check ${index + 1}: purpose/name`, { exact: true }).fill(`Actual selected ${kind}`);
    await select("Evidence kind", index, kind); await select("Executable", index, executable);
    // Controlled textarea DOM text can be part of wrapping-label text after
    // entry. Match the stable visible label prefix, not an exact empty value.
    await page.getByLabel(/^Arguments \(one argument per line\)/).nth(index).fill(args);
    await select("Required fidelity", index, fidelity); await select("Conformance binding", index, binding);
  }
  await page.getByRole("button", { name: "Inspect exact trusted owner plan", exact: true }).click();
  const accept = page.getByRole("button", { name: "Accept this preparation and retain one original request", exact: true });
  await accept.waitFor(); assert.equal(await accept.isEnabled(), false);
  await select("Separate approval to write this exact CI workflow", 0, "Approve the exact displayed workflow file");
  await accept.click();
  await page.getByRole("button", { name: "Start this approved owner-control session", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Start this approved owner-control session", exact: true }).isEnabled(), false);
  assert.equal(creates.length, 1); assert.equal(preparations.length, 1);
  await page.getByRole("button", { name: "Inspect exact trusted source bytes", exact: true }).click();
  await page.getByLabel(/^Inert source: AGENTS\.md/).waitFor();
  assert.equal(await page.evaluate(() => window.unsafeBootstrapExecuted), undefined);
  await page.getByLabel("Reason to withdraw this unapplied setup", { exact: true }).fill("Withdraw this unchanged synthetic owner setup without any source effect.");
  await page.getByRole("button", { name: "Cancel only unapplied setup and stop its owned access", exact: true }).click();
  await page.getByText("Synthetic lost cancellation acknowledgement; recover original command.", { exact: true }).waitFor();
  const originalId = current.requestId;
  await openSetup();
  const recover = page.getByRole("button", { name: "Reconcile original cancellation", exact: true });
  await recover.waitFor(); assert.equal(await recover.isEnabled(), true);
  await recover.click(); await page.getByText(/cancelled \/ owner-bootstrap-cancelled/).waitFor();
  await page.getByRole("button", { name: `${originalId} / cancelled`, exact: true }).waitFor();
  await page.getByRole("button", { name: "Prepare genuinely new owner inspection (terminal request stays unchanged)", exact: true }).waitFor();
  assert.equal(current.requestId, originalId); assert.equal(creates.length, 1); assert.equal(commands.length, 2);
  assert.equal(await page.getByRole("button", { name: "Start this approved owner-control session", exact: true }).count(), 0);
  await page.screenshot({ path: "/tmp/1275-owner-bootstrap-terminal-ui.png", fullPage: false });
  unavailable = true; await openSetup();
  await page.getByText("Synthetic owner unavailable; preserve the original request.", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Owner profile id", { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("Isolated owner-setup UI/HTTP passed: authorized mounts deny forged identity, project-specific profile, separate CI approval, inert source, blocked unapproved start, cold original cancellation, terminal and unavailable states. Zero live mutations.");
} catch (error) {
  const page = browser.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: "/tmp/1275-owner-bootstrap-failure.png", fullPage: true });
    console.error(JSON.stringify({ pageErrors: errors, textareas: await page.locator("textarea").evaluateAll(elements => elements.map(element => ({ label: element.closest("label")?.textContent?.slice(0, 160), value: element.value.slice(0, 80) }))) }));
  }
  throw error;
} finally { await browser.close(); }
