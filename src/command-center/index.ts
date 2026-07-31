import type { ConsoleBoundary } from "../console-architecture";

export {
  resolveWorkspacePulseFixture,
  workspacePulseDesignScenarios,
  workspacePulseFixture,
} from "./fixtures/workspace-pulse.fixture";
export type {
  WorkspacePulseScenarioSelections,
} from "./fixtures/workspace-pulse.fixture";
export {
  compareCommandCenterAttention,
  createStaticCommandCenterAttentionSource,
  projectCommandCenterAttention,
} from "./read-model/command-center-attention";
export {
  commandCenterAttentionSourceRegistrations,
  commandCenterAttentionSourceRegistry,
} from "./read-model/command-center-attention-source-registry";
export {
  commandCenterAttentionSources,
} from "./read-model/command-center-attention-sources";
export {
  useCommandCenterAttention,
} from "./read-model/use-command-center-attention";
export type {
  CommandCenterAttentionCandidate,
  CommandCenterAttentionClass,
  CommandCenterAttentionFreshness,
  CommandCenterAttentionProjectionIssue,
  CommandCenterAttentionRoute,
  CommandCenterAttentionSnapshot,
  CommandCenterAttentionSource,
  CommandCenterAttentionSourceDisposition,
  CommandCenterAttentionSourceMode,
  CommandCenterAttentionSourceRegistration,
  CommandCenterAttentionSourceSnapshot,
  CommandCenterAttentionUrgency,
} from "./read-model/command-center-attention";
export {
  projectWorkspacePulseSnapshot,
} from "./read-model/workspace-pulse";
export type {
  WorkspacePosture,
  WorkspacePostureId,
  WorkspacePulseDesignScenario,
  WorkspacePulseProjectionMode,
  WorkspacePulseRecord,
  WorkspacePulseRoute,
  WorkspacePulseSignal,
  WorkspacePulseSignalId,
  WorkspacePulseSnapshot,
  WorkspacePulseSnapshotInput,
  WorkspacePulseSource,
  WorkspacePulseSourceState,
  WorkspacePulseTone,
} from "./read-model/workspace-pulse";
export {
  CommandCenterFocus,
} from "./presentation/command-center-focus";
export {
  CommandCenterPulseMetricFocus,
  CommandCenterSystemMoodFocus,
  CommandCenterWorkspacePulse,
} from "./presentation/command-center-pulse";

export const commandCenterBoundary: ConsoleBoundary = {
  id: "command-center",
  mustNotOwn: [
    "operation-domain workflow state",
    "runtime readiness truth",
    "lifecycle-transition decisions",
    "agent conversation state",
    "cross-capability focus routing",
    "canonical backend mutation",
  ],
  owns: [
    "default cockpit posture",
    "operator priority briefing",
    "workspace pulse projection",
    "workspace pulse, system mood, and briefing presentation",
    "command-center scenario fixtures",
  ],
  status: "active-contract",
};
