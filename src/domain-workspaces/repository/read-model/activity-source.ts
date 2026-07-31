import {
  getRepositoryRuntimeProjectionSnapshot,
  subscribeRepositoryRuntimeProjection,
} from "../local-runtime/repository-runtime.ts";

export const repositoryActivitySource = {
  getRuntimeSnapshot: getRepositoryRuntimeProjectionSnapshot,
  subscribeRuntime: subscribeRepositoryRuntimeProjection,
} as const;
