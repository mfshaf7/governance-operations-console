import type { ModelRegistry } from "../../work-model/model-runtime-contract.ts";

// Read-only design data. Never selected after a configured owner fails.
export function modelRuntimePreviewRegistry(): ModelRegistry {
  const cloud = "sha256:" + "a".repeat(64), local = "sha256:" + "b".repeat(64);
  const tasks = ["sample-advisor-v1/planning", "sample-assistant-v1/response"];
  return {
    schema_version: 1, tasks,
    backends: [
      { backend_id: "sample-cloud", provider: "codex-app-server", allowed_tasks: tasks, registered: true, account_login_supported: true, availability: "not-probed" },
      { backend_id: "sample-local", provider: "ollama", allowed_tasks: tasks, registered: true, account_login_supported: false, availability: "not-probed" },
    ],
    configuration: {
      revision: 1, current_revision: 1, digest: "sha256:" + "c".repeat(64), history: [],
      configuration: {
        backends: { "sample-cloud": { backend_id: "sample-cloud" }, "sample-local": { backend_id: "sample-local" } },
        models: {
          [cloud]: { backend_id: "sample-cloud", model: "Sample reasoning model", supported_efforts: ["medium", "high"], model_digest: null, runtime_version: "Sample runtime", verification_ref: cloud },
          [local]: { backend_id: "sample-local", model: "Sample local model", supported_efforts: [false, true], model_digest: null, runtime_version: "Sample runtime", verification_ref: local },
        },
        default: { primary: { model_id: cloud, effort: "high" }, fallbacks: [{ model_id: local, effort: false }], on_exhausted: "fail-closed" },
        overrides: { [tasks[1]]: null },
      },
    },
  };
}
