import {
  getPrototypeRuntimeProjectionSnapshot,
  subscribePrototypeRuntimeProjection,
} from "../local-runtime/prototype-runtime.ts";
import { getPrototypeWorkspaceReadModel } from "./prototype-workspace-read-model.ts";

export const prototypeActivitySource = {
  getRuntimeSnapshot: getPrototypeRuntimeProjectionSnapshot,
  records: getPrototypeWorkspaceReadModel().records,
  subscribeRuntime: subscribePrototypeRuntimeProjection,
} as const;
