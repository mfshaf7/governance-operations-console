import type { ConsoleBoundary } from "../console-architecture.ts";

export {
  lifecycleTransitionProjectionFixtures,
} from "./fixtures/lifecycle-transition-projections.fixture.ts";
export {
  LifecycleTransitionsWorkspace,
} from "./presentation/workspace/lifecycle-transitions-workspace.tsx";
export type {
  LifecycleTransitionArtifact,
} from "./model/lifecycle-transition-artifacts.ts";
export type {
  LifecycleTransitionProjection,
} from "./read-model/lifecycle-transition-projection-types.ts";
export {
  lifecycleTransitionAttentionSource,
} from "./read-model/attention-source.ts";

export const lifecycleTransitionsBoundary: ConsoleBoundary = {
  id: "lifecycle-transitions",
  mustNotOwn: [
    "source or target domain mutation",
    "validation decisions",
    "authority decisions",
    "target admission",
    "target adapter execution",
  ],
  owns: [
    "correlated cross-domain transition status",
    "transition receipt history",
    "next-owner projection",
    "truthful owner-workspace routing",
  ],
  status: "active-contract",
};
