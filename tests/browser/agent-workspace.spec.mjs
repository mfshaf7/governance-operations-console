import { test, expect } from "@playwright/test";
import { bodies } from "../console-architecture/agent-workspace-fixtures.mjs";
const agentContextSources = { continuity: "/api/workspace-continuity", registry: "/api/workspace-registry", proposals: "/api/proposals", prototypes: "/api/prototypes/records", delivery: "/api/delivery/workspace", orchestration: "/api/orchestration", lifecycle: "/api/lifecycle-transitions", platform: "/api/environment-operations", models: "/api/model-operations/runtime/registry" };
const base = process.env.CONSOLE_TEST_BASE_URL ?? "http://127.0.0.1:3320";
test.setTimeout(120_000);
test.use({ actionTimeout: 15_000, navigationTimeout: 60_000, viewport: { width: 1600, height: 1050 } });
test.beforeEach(async ({ page }) => {
 for (const [source, path] of Object.entries(agentContextSources)) {
  await page.route(`**${path}`, route => route.fulfill({ json: bodies[source] }));
 }
 await page.route("**/api/agent-interaction*", route => {
  if (route.request().method() === "DELETE") return route.fulfill({ json: { closed: true } });
  return route.fulfill({ json: { checkedAt: new Date().toISOString(), endpoint: null, freshness: "live", model: "agent-console-assistant-v1", modelCount: 1, observedAt: new Date().toISOString(), provider: "governed-ai-gateway", safetyMode: "oos-session/cgg-model-safe/governed-ai/manual-operator-request", status: "online" } });
 });
 await page.goto(base, { waitUntil: "domcontentloaded" });
 // Owner context arrives only after the client effect has mounted.
 await expect(page.locator('[data-agent-console-dock][aria-label="Agent Console"]').getByRole("button", { name: "Workspace", exact: true })).toBeEnabled({ timeout: 60_000 });
 // A real state transition proves interaction before navigation.
 await page.getByRole("button", { name: "Inspect context", exact: true }).first().click();
 await expect(page.getByRole("dialog", { name: "Context Candidate", exact: true })).toBeVisible();
 await page.keyboard.press("Escape");
});
const dockFor = page => page.locator('[data-agent-console-dock][aria-label="Docking Agent"]');
async function navigate(page, title) {
 await page.getByRole("navigation", { name: "Console navigation", exact: true }).hover();
 const button = page.locator(`button[title="${title}"]`);
 await button.focus(); await button.press("Enter");
 await expect(button).toHaveAttribute("aria-current", "page");
 await expect(dockFor(page)).toBeVisible();
}
test("Workspace is usable from home; changing mode preserves transcript and closes old session", async ({ page }) => {
 const embedded = page.locator('[data-agent-console-dock][aria-label="Agent Console"]');
 const workspace = embedded.getByRole("button", { name: "Workspace", exact: true });
 await expect(workspace).toBeEnabled();
 let closed = 0; page.on("request", r => { if (r.method() === "DELETE" && r.url().endsWith("/api/agent-interaction")) closed++; });
 await workspace.click();
 await expect(workspace).toHaveAttribute("aria-pressed", "true");
 await expect(embedded.locator(".model-dock-context-title")).toContainText("Console workspace");
 const input = embedded.getByRole("textbox", { name: "Agent terminal command input", exact: true });
 await input.fill("context"); await input.press("Enter");
 await expect(embedded.locator(".terminal-transcript")).toContainText("8/8 sources current");
 await embedded.getByRole("button", { name: "Focus", exact: true }).click();
 await expect(embedded.locator(".terminal-transcript")).toContainText("8/8 sources current");
 expect(closed).toBe(2);
});
for (const [title, id] of [["Dev Integration", "dev-integration"], ["Governed Releases", "governed-releases"], ["Lifecycle Transitions", "lifecycle-transitions"], ["Workspace Registry", "workspace-registry"]]) {
 test(`${title}: real native-dialog click, correct Focus, Workspace switch and Escape`, async ({ page }) => {
  const dock = dockFor(page);
  const input = dock.getByRole("textbox", { name: "Agent terminal command input", exact: true });
  await input.fill("Keep my unsent prompt");
  await navigate(page, title);
  await expect(dock.locator("xpath=ancestor::dialog")).toHaveCount(1);
  await dock.getByRole("button", { name: "Expand agent interaction console", exact: true }).click();
  await expect(input).toHaveValue("Keep my unsent prompt");
  await expect(dock.locator(".model-dock-context-title")).toContainText(title);
  await input.fill("context"); await input.press("Enter");
  await expect(dock.locator(".terminal-transcript")).toContainText(`PAGE CANDIDATE / ${id}`);
  await dock.getByRole("button", { name: "Workspace", exact: true }).click();
  await expect(dock.locator(".model-dock-context-title")).toContainText("Console workspace");
  await input.fill("context"); await input.press("Enter");
  await expect(dock.locator(".terminal-transcript")).toContainText("WORKSPACE CANDIDATE / console-workspace");
  await input.focus(); await page.keyboard.press("Escape");
  await expect(dock).not.toHaveClass(/model-dock-expanded/);
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  // Escape outside the Agent retains the workspace's native close behavior.
  await page.locator('dialog[open] button[aria-label="Close modal"]').first().focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(dock).toBeVisible();
  await expect(dock.getByRole("button", { name: "Floating agent context mode", exact: true })).toContainText("Workspace");
 });
}

test("a nested profile dialog hides the Agent and preserves prompt and native focus", async ({ page }) => {
 await page.route("**/api/environment-operations", route => route.fulfill({ json: { mode: "disconnected-preview", status: "current", catalog: null, operations: [], observedAt: new Date().toISOString(), error: null } }));
 const dock = dockFor(page);
 await dock.getByRole("textbox", { name: "Agent terminal command input", exact: true }).fill("Retain through nested dialog");
 await navigate(page, "Dev Integration");
 await page.locator('dialog[open]').first().getByRole("button", { name: "Request Profile", exact: true }).click();
 const nested = page.getByRole("dialog", { name: "Dev Integration Profile Request", exact: true });
 await expect(page.locator("dialog[open]")).toHaveCount(2);
 await expect(dock).toBeHidden();
 await expect(nested.getByRole("button", { name: "Close modal", exact: true })).toBeFocused();
 await page.keyboard.press("Escape");
 await expect(page.locator("dialog[open]")).toHaveCount(1);
 await expect(dock).toBeVisible();
 await dock.getByRole("button", { name: "Expand agent interaction console", exact: true }).click();
 await expect(dock.getByRole("textbox", { name: "Agent terminal command input", exact: true })).toHaveValue("Retain through nested dialog");
 expect(await page.locator("body").evaluate(body => body.style.overflow)).toBe("hidden");
});

test("moving the presentation during a pending invocation keeps one request and receives its response", async ({ page }) => {
 let complete; const release = new Promise(resolve => { complete = resolve; }); let submitted; let requests = 0;
 let completeClose; const closeReleased = new Promise(resolve => { completeClose = resolve; });
 await page.route("**/api/agent-interaction*", async route => {
  if (route.request().method() === "DELETE") { await closeReleased; return route.fallback(); }
  if (route.request().method() !== "POST") return route.fallback();
  requests++; submitted = route.request().postDataJSON();
  await release;
  await route.fulfill({ body: "Synthetic retained response", headers: {
   "Content-Type": "text/plain", "X-Agent-Context-Admitted": "true", "X-Agent-Context-Artifact": "sha256:" + "a".repeat(64),
   "X-Agent-CGG-Receipt": "synthetic:cgg-receipt", "X-Agent-Invocation": "synthetic:invocation", "X-Agent-Receipt": "synthetic:receipt",
   "X-Agent-Receipt-Digest": "sha256:" + "b".repeat(64), "X-Agent-Session": "synthetic:session",
  } });
 });
 const dock = dockFor(page);
 await dock.getByRole("button", { name: "Floating agent context mode", exact: true }).click();
 await dock.getByRole("button", { name: "Workspace", exact: true }).click();
 const input = dock.getByRole("textbox", { name: "Agent terminal command input", exact: true });
 await expect(input).toBeDisabled();
 await expect(dock.getByRole("button", { name: "Changing agent mode", exact: true })).toBeDisabled();
 completeClose();
 await expect(dock.getByRole("button", { name: "Floating agent context mode", exact: true })).toContainText("Workspace");
 const request = page.waitForRequest(r => r.url().endsWith("/api/agent-interaction") && r.method() === "POST");
 await input.fill("Explain this workspace without taking action"); await input.press("Enter"); await request;
 await navigate(page, "Workspace Registry");
 await dock.getByRole("button", { name: "Expand agent interaction console", exact: true }).click();
 await expect(dock.getByRole("button", { name: "Cancel agent request", exact: true })).toBeVisible();
 complete();
 await expect(dock.locator(".terminal-transcript")).toContainText("Synthetic retained response");
 expect(requests).toBe(1); expect(submitted.context.mode).toBe("workspace"); expect(submitted.context.candidate.id).toBe("workspace:console");
});

test("open-and-run commits the new mode and nonce before submitting its matching candidate", async ({ page }) => {
 let closed;
 await page.route("**/api/agent-interaction*", async route => {
  if (route.request().method() === "DELETE") { closed = route.request().postDataJSON(); return route.fallback(); }
  if (route.request().method() === "POST") return route.fulfill({ status: 409, json: { error: "Synthetic owner denial after request inspection" } });
  return route.fallback();
 });
 const submitted = page.waitForRequest(r => r.url().endsWith("/api/agent-interaction") && r.method() === "POST");
 await page.evaluate(() => window.dispatchEvent(new CustomEvent("governance-console:open-agent", { detail: { mode: "workspace", prompt: "Explain workspace coverage", autoRun: true } })));
 const request = (await submitted).postDataJSON();
 expect(request.context.mode).toBe("workspace"); expect(request.context.candidate.scope).toBe("workspace");
 expect(request.session.nonce).not.toBe(closed.session.nonce);
});
