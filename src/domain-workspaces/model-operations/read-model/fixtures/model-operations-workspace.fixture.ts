import type { ModelOperationsReadModel } from "../types/model-operations-types.ts";
import { modelOperationsSummaryFromProfiles } from "../selectors/model-profile-selectors.ts";
import { modelProfileRecords } from "./model-profile-records.fixture.ts";
import { modelOperationsWorkspaceStatus } from "./model-operations-workspace-status.fixture.ts";

export const modelOperationsWorkspaceFixture: ModelOperationsReadModel = {
  localExceptionRuntime: {
    endpoint: "http://127.0.0.1:11434",
    models: [],
    observedAt: null,
    provider: "Ollama",
    source: {
      authority: "local runtime",
      freshness: "unknown",
      observedAt: "not observed",
      ref: "local-runtime://ollama",
      schemaVersion: "1",
      sourceVersion: "unavailable",
    },
    state: "unknown",
  },
  profiles: modelProfileRecords,
  summary: modelOperationsSummaryFromProfiles(modelProfileRecords),
  workspaceStatus: modelOperationsWorkspaceStatus,
};
