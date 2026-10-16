// Isolated synthetic UI conformance only. This is not live operating evidence.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { buildRepositoryProvisionRequest } from "../src/domain-workspaces/repository/server/repository-custody-oos-client.ts";
import { provisioningResult } from "../tests/support/repository-provisioning-result.mjs";

const base = process.env.CONSOLE_REPOSITORY_GATE_TEST_URL ?? "http://127.0.0.1:3318";
const parsed = new URL(base);
if (parsed.hostname !== "127.0.0.1" || parsed.port === "3317") throw new Error("Use a separate loopback test instance, never the operator Console.");
const digest = character => `sha256:${character.repeat(64)}`;
const config = {
  operatorId: "operator:synthetic-console",
  policyProfileRef: { uri: "repo://synthetic/custody", digest: digest("2") },
  credentialBindingRef: { uri: "platform://synthetic/provisioning", digest: digest("3") },
};
const intent = {
  approvalNote: "Synthetic isolated approval, not a live provider command.",
  custodyKind: "dedicated-owner-repo", repositoryDescription: "Isolated provisioning UI conformance.",
  repositoryName: "isolated-provisioning", repositoryOwner: "example-organization",
  requestedAt: new Date().toISOString(), requestId: "repository-custody-request:isolated-provisioning-001",
  templateReviewed: true, visibility: "private", workspaceOwnerRef: "repo:isolated-provisioning",
};
const failed = provisioningResult(buildRepositoryProvisionRequest(intent, config));
failed.status = "failed";
failed.next_action = "request-correction";
failed.failure = { code: "repository_provider_readback_stale", message: "Provider branch-deletion setting does not match the approved baseline.", retryable: false };
failed.provider_operation.state = "provider-acknowledged";
failed.provider_operation.completion_path = null;
failed.provider_readback.applied_provisioning.settings.merge_policy.delete_branch_on_merge = false;
failed.receipt.outcome = "failed";
failed.receipt.workflow_status = "failed";
failed.receipt.repository_identity = null;
failed.receipt.custody.after = "unrecorded";
for (const key of Object.keys(failed.receipt.downstream_handoffs)) failed.receipt.downstream_handoffs[key] = "not-requested";
const applyingRequest = buildRepositoryProvisionRequest({ ...intent,
  requestId: `${intent.requestId}-applying`, repositoryName: "isolated-resume" }, config);
const applying = provisioningResult(applyingRequest, { status: "applying" });
let records = [failed, applying];
const originalFailure = JSON.stringify(failed);
const submissions = [];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path === "/api/repositories/provisioning/requests") {
      const body = request.postDataJSON();
      submissions.push(body);
      let result;
      if (body.resume === true) {
        assert.deepEqual(body, { requestId: applyingRequest.request_id, resume: true });
        result = provisioningResult(applyingRequest);
        records = records.map(item => item.request.request_id === applyingRequest.request_id ? result : item);
      } else {
        assert.equal(body.correctionOfRequestId, intent.requestId);
        assert.notEqual(body.requestId, intent.requestId);
        assert.equal(body.repositoryName, intent.repositoryName);
        assert.equal(body.repositoryOwner, intent.repositoryOwner);
        assert.equal(body.templateReviewed, true);
        result = provisioningResult(buildRepositoryProvisionRequest(body, config));
        records = [...records, result];
      }
      return route.fulfill({ status: 201, json: result });
    }
    assert.equal(request.method(), "GET", "No unrelated mutation is permitted by this isolated case.");
    if (path === "/api/console/capabilities") return route.fulfill({ json: {
      artifactType: "console-runtime-capability-projection", schemaVersion: 1, mode: "live",
      capabilities: [{ id: "repository-provisioning", mutation: { state: "available" }, source: { state: "available" } }],
    } });
    if (path === "/api/repositories/custody/requests") return route.fulfill({ json: {
      schema_version: 1, mode: "live", status: "current", error: null, records, next_cursor: null,
    } });
    return route.fulfill({ status: 503, json: { error: "Unrelated owner isolated.", mode: "live", status: "offline" } });
  });
  async function openDialog() {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: /REPOSITORY/i }).first().click();
    await page.getByRole("button", { name: "Provision Repository", exact: true }).click();
    return page.getByRole("dialog").last();
  }
  async function chooseRetained(dialog, id) {
    await dialog.getByRole("button", { name: "Retained provisioning request", exact: true }).click();
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.getByRole("option", { name: new RegExp(`${escaped}$`) }).click();
  }
  let dialog = await openDialog();
  await chooseRetained(dialog, intent.requestId);
  await dialog.getByRole("heading", { name: "Repository exists; custody incomplete", exact: true }).waitFor();
  assert.equal(await dialog.getByLabel("Repository name", { exact: true }).isDisabled(), true);
  const complete = dialog.getByRole("button", { name: "Complete Approved Baseline", exact: true });
  assert.equal(await complete.isEnabled(), false);
  await dialog.getByLabel("Provisioning approval note", { exact: true }).fill("Approve completing the exact retained baseline without another create.");
  assert.equal(await complete.isEnabled(), false);
  await dialog.getByRole("button", { name: "Confirm provider baseline review", exact: true }).click();
  await complete.click();
  await dialog.getByRole("heading", { name: "Repository provisioned", exact: true }).waitFor();
  assert.equal(submissions.length, 1);
  assert.equal(JSON.stringify(failed), originalFailure);
  await page.screenshot({ path: "/tmp/1275-provisioning-baseline-ui-correction.png", fullPage: true });
  dialog = await openDialog();
  await chooseRetained(dialog, applyingRequest.request_id);
  const resume = dialog.getByRole("button", { name: "Resume Approved Request", exact: true });
  assert.equal(await resume.isEnabled(), true);
  assert.equal(await dialog.getByLabel("Provisioning approval note", { exact: true }).count(), 0);
  await resume.click();
  await dialog.getByRole("heading", { name: "Repository provisioned", exact: true }).waitFor();
  assert.equal(submissions.length, 2);
  assert.deepEqual(pageErrors, []);
  console.log("Isolated provisioning UI passed: retained failed readback, locked target, fresh correction review, immutable failure, reload and exact-request resume; zero live mutations.");
} finally { await browser.close(); }
