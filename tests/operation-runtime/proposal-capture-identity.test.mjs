import assert from "node:assert/strict";
import test from "node:test";

test("new capture identities do not collide across fresh browser-module lifetimes", async () => {
  const moduleUrl = new URL("../../src/domain-workspaces/proposal/local-runtime/proposal-runtime.ts", import.meta.url);
  moduleUrl.searchParams.set("capture-session", "first-browser");
  const firstBrowser = await import(moduleUrl.href);
  moduleUrl.searchParams.set("capture-session", "second-browser");
  const secondBrowser = await import(moduleUrl.href);

  const first = firstBrowser.createProposalCaptureRequestId();
  const second = secondBrowser.createProposalCaptureRequestId();
  assert.notEqual(first, second, "a new browser must not reuse another capture's backend source identity");
  assert.notEqual(firstBrowser.createProposalCaptureRequestId(), first);
  assert.notEqual(secondBrowser.createProposalCaptureRequestId(), second);
});
