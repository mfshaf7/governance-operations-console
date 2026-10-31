import assert from "node:assert/strict";
import test from "node:test";
import { modelRuntimePreviewRegistry } from "../../src/domain-workspaces/model-operations/read-model/fixtures/model-runtime.fixture.ts";
import { modelRegistrationInspection } from "../../src/domain-workspaces/model-operations/presentation/dialogs/registrations/model-registrations-view-model.ts";

function observed() {
  const registry = modelRuntimePreviewRegistry(), id = Object.keys(registry.configuration.configuration.models)[0];
  const now = Date.now();
  registry.health = {
    configuration_revision: registry.configuration.revision, configuration_digest: registry.configuration.digest,
    checked_at: new Date(now - 1000).toISOString(), expires_at: new Date(now + 60000).toISOString(), backends: [],
    models: [{ model_id: id, state: "verification-needed", code: "registration-changed",
      observed_runtime_version: "Changed runtime", observed_model_digest: "changed-content",
      last_success: { kind: "verification", at: new Date(now - 2000).toISOString(), reference: "sha256:" + "f".repeat(64) } }],
  };
  return { registry, id };
}

test("model inspection keeps runtime and content changes in the visible summary with exact technical evidence", () => {
  const { registry, id } = observed();
  registry.configuration.configuration.models[id].model_digest = "registered-content";
  const inspection = modelRegistrationInspection(registry, id);
  assert.equal(inspection.healthTone, "warn");
  assert.equal(inspection.summary.find(row => row.id === "content").value, "Changed");
  assert.equal(inspection.summary.find(row => row.id === "runtime-change").tone, "warn");
  assert.match(inspection.summary.find(row => row.id === "success").value, /^Verification/);
  assert.equal(inspection.technical.find(row => row.label === "Registered digest").value, "registered-content");
  assert.equal(inspection.technical.find(row => row.label === "Observed digest").value, "changed-content");
});

test("an absent registered digest does not claim a content mismatch and request success retains its meaning", () => {
  const { registry, id } = observed();
  registry.health.models[0].last_success.kind = "request";
  const inspection = modelRegistrationInspection(registry, id);
  assert.equal(inspection.summary.find(row => row.id === "content").value, "No registered digest");
  assert.match(inspection.summary.find(row => row.id === "success").value, /^Request/);
});

test("expired owner observations do not present a current success or mismatch", () => {
  const { registry, id } = observed();
  registry.health.expires_at = new Date(Date.now() - 100).toISOString();
  const inspection = modelRegistrationInspection(registry, id);
  assert.equal(inspection.healthLabel, "Health unknown");
  assert.equal(inspection.summary.find(row => row.id === "success").value, "Not available");
  assert.equal(inspection.summary.some(row => row.id === "runtime-change"), false);
});
