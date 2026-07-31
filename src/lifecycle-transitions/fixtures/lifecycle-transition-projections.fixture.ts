import {
  projectLifecycleTransitions,
} from "../read-model/lifecycle-transition-projector.ts";
import {
  allLifecycleTransitionArtifactFixtures,
} from "./lifecycle-transition-artifacts.fixture.ts";

export const lifecycleTransitionProjectionFixtures =
  projectLifecycleTransitions(allLifecycleTransitionArtifactFixtures);
