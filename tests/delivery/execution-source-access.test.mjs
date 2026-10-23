import assert from "node:assert/strict";
import test from "node:test";
import { canContinueApprovedSourceAccess } from "../../src/domain-workspaces/delivery/presentation/surfaces/execution-board/work-session/execution-source-access.ts";

test("source-access supporting action requires the current live owner credential gate", () => {
  const current = { mode: "live", projectionStatus: "current", projection: {
    session_id: "work-session:synthetic", session_revision: "revision:synthetic",
    next_action: { code: "agent-source-credential-required" },
  } };
  assert.equal(canContinueApprovedSourceAccess(current), true);
  for (const mode of [null, "disconnected-preview"]) {
    assert.equal(canContinueApprovedSourceAccess({ ...current, mode }), false);
  }
  for (const projectionStatus of ["loading", "offline"]) {
    assert.equal(canContinueApprovedSourceAccess({ ...current, projectionStatus }), false);
  }
  assert.equal(canContinueApprovedSourceAccess({ ...current, projection: null }), false);
  assert.equal(canContinueApprovedSourceAccess({ ...current, projection: { ...current.projection, next_action: null } }), false);
  for (const field of ["session_id", "session_revision"]) {
    assert.equal(canContinueApprovedSourceAccess({ ...current, projection: { ...current.projection, [field]: null } }), false);
  }
  for (const code of ["unknown", "source-intent-invalid", "source-intent-suspended", "source-work-required", "source-merge-approval-required"]) {
    assert.equal(canContinueApprovedSourceAccess({ ...current, projection: { ...current.projection, next_action: { code } } }), false, code);
  }
});
