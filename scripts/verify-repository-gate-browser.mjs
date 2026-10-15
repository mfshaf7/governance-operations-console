// Isolated UI conformance, not live operating or final-journey evidence.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const base = process.env.CONSOLE_REPOSITORY_GATE_TEST_URL ?? "http://127.0.0.1:3318";
const parsed = new URL(base);
if (parsed.hostname !== "127.0.0.1" || parsed.port === "3317") throw new Error("Use a separate loopback test instance, never the operator Console.");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.error(`Isolated page error: ${error.message}`); });
  let offline = false;
  let writes = 0;
  const projection = {
    schema_version: 1, proposal_id: "idea-851", title: "Isolated to-do repository request",
    record_ref: "openproject://work_packages/851", record_version: "version-2", record_system: "openproject", record_project: "workspace-proposals",
    status: "accepted", projection_state: "current", body: "Synthetic UI case only.", decision_notes: "Accepted.", triage_summary: "Reviewed.",
    route: { target: "prototype", rationale: "Test the handoff.", source_custody: { classification: "new-repo-required", repository_mode: "new", repository_gate_state: "pending", owner: null, source_ref: null, rationale: "Repository required." } },
    source: { ingress: "console", surface: "governance-operations-console", context_ref: {}, native_ref: {} },
    handoff: { state: "not-requested", packet_ref: null, target_receipt_ref: null, target_record_ref: null },
    last_event_ref: null, updated_at: new Date().toISOString(),
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") { writes++; return route.fulfill({ status: 503, json: { error: "Mutations are isolated in this UI test." } }); }
    if (path === "/api/console/capabilities") return route.fulfill({ json: { artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live", capabilities: [{ id: "repository-provisioning", mutation: { state: "available" }, source: { state: "available" } }] } });
    if (path === "/api/repositories/custody/requests") return route.fulfill({ json: { schema_version: 1, mode: "live", status: "current", error: null, records: [], next_cursor: null } });
    if (path === "/api/proposals") return route.fulfill({ status: offline ? 503 : 200, json: {
      mode: "live", status: offline ? "offline" : "current", error: offline ? "Owner unavailable" : null,
      ...(offline ? { code: "owner_unavailable" } : {}),
      observedAt: new Date().toISOString(), records: offline ? [] : [{ createdAt: projection.updated_at, projection, history: { schema_version: 1, proposal_id: "idea-851", record_version: "version-2", events: [], next_cursor: null } }],
    } });
    return route.fulfill({ status: 503, json: { error: "Unrelated owner deliberately unavailable in isolated UI test.", mode: "live", status: "offline" } });
  });
  async function openRepository() {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /REPOSITORY/i }).first().click({ timeout: 10000 });
  }
  await openRepository();
  await page.getByText(projection.title, { exact: true }).first().waitFor();
  assert.equal(await page.getByRole("button", { name: "Record Gate Resolution", exact: true }).isEnabled(), false);
  await page.getByRole("button", { name: "Provision Repository", exact: true }).click();
  await page.getByRole("heading", { name: "Provision New Repository", exact: true }).waitFor();
  await page.getByRole("button", { name: "Back to Register", exact: true }).click();
  await openRepository();
  await page.getByText(projection.title, { exact: true }).first().waitFor();
  offline = true;
  await openRepository();
  await page.getByText("Owner unavailable", { exact: true }).waitFor();
  assert.equal(await page.getByText(projection.title, { exact: true }).count(), 0);
  assert.equal(writes, 0);
  assert.deepEqual(errors, []);
  console.log("Repository UI conformance passed: empty-register provisioning, canonical pending request, reload, offline denial; no live mutations.");
} finally { await browser.close(); }
