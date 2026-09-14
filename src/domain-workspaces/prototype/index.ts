export {
  PrototypeWorkspace,
  getPrototypeOperationWorkbenchContract,
} from "./presentation/workspace/index.ts";
export type { PrototypeWorkspaceProps } from "./presentation/workspace/index.ts";
export { prototypeActivitySource } from "./read-model/activity-source.ts";
export { prototypeAttentionSource } from "./read-model/attention-source.ts";
export {
  cancelPrototypeClosureRoute,
  continuePrototypeClosureRoute,
  decidePrototypeClosureRoute,
  preparePrototypeClosureRoute,
  readPrototypeClosureRoute,
  submitPrototypeClosureRoute,
} from "./server/prototype-closure-api-routes.ts";
