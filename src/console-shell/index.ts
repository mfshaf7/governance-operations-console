import type { ConsoleBoundary } from "../console-architecture";

export { ConsoleShellFrame } from "./console-shell-frame";
export {
  ConsoleConnectedRegister,
  ConsoleConnectedSurface,
} from "./console-connected-surface";
export {
  ConsoleSurfaceActionGroup,
  ConsoleSurfaceButton,
  ConsoleSurfaceCheckboxGroup,
  ConsoleSurfaceChecklist,
  ConsoleSurfaceContentGroup,
  ConsoleSurfaceDialog,
  ConsoleSurfaceEmptyState,
  ConsoleSurfaceFieldGrid,
  ConsoleSurfaceFilterBar,
  ConsoleSurfaceHeader,
  ConsoleSurfaceMetadataList,
  ConsoleSurfacePanel,
  ConsoleSurfaceSelectField,
  ConsoleSurfaceStack,
  ConsoleSurfaceTabPanel,
  ConsoleSurfaceTabs,
  ConsoleSurfaceTagList,
  ConsoleSurfaceTextAreaField,
  ConsoleSurfaceTextField,
  ConsoleSurfaceTimeline,
  ConsoleSurfaceTwoZone,
  ConsoleSurfaceWizardSteps,
} from "./console-surface-controls";
export { GovernanceConsoleShell } from "./governance-console-shell";
export {
  ConsoleShellPanel,
  ConsoleShellSectionTitle,
} from "./console-shell-panel";
export {
  consoleStatusCardClass,
  consoleToneClass,
  consoleToneStatusLabel,
} from "./console-shell-status";
export { consoleOperatorAccountFixture } from "./fixtures/console-operator.fixture";
export {
  formatOperatorIdentityTimestamp,
  projectOperatorIdentity,
} from "./identity/operator-identity-projection";
export {
  alertContextCandidate,
  componentContextCandidate,
  defaultPageContextCandidate,
  operationWorkbenchContextCandidate,
  pulseContextCandidate,
  resourceContextCandidate,
  resolveConsoleAgentContextCandidate,
  systemMoodContextCandidate,
  workspaceContextCandidate,
} from "./context/agent-context-candidates";
export {
  contextCandidateBadgeLabel,
  createAgentContextCandidate,
  formatAgentContextCandidate,
} from "./context/agent-context-candidate";
export { useConsoleShellSelection } from "./use-console-shell-selection";
export type {
  AgentContextCandidate,
  AgentContextCandidateTone,
  AgentContextSourceMode,
} from "./context/agent-context-candidate";
export type { ConsoleShellFrameProps } from "./console-shell-frame";
export type {
  ConsoleConnectedRegisterCell,
  ConsoleConnectedRegisterRow,
  ConsoleConnectedSurfaceAccent,
  ConsoleConnectedSurfaceEntry,
} from "./console-connected-surface";
export type {
  ConsoleSurfaceButtonVariant,
  ConsoleSurfaceCheckItem,
  ConsoleSurfaceDialogSize,
  ConsoleSurfaceFilter,
  ConsoleSurfaceMetadataItem,
  ConsoleSurfaceTab,
  ConsoleSurfaceTimelineItem,
} from "./console-surface-controls";
export type { ConsoleTone } from "./console-shell-status";
export type {
  OperatorAccountCapability,
  OperatorAccountCapabilityState,
  OperatorAccountProfile,
  OperatorAccountProfileValidation,
  OperatorAccountSnapshot,
  OperatorClockFormat,
} from "./identity/operator-account-model";
export type {
  OperatorAuthenticationState,
  OperatorIdentityFreshness,
  OperatorIdentitySnapshot,
  OperatorIdentitySourceMode,
} from "./identity/operator-identity-model";
export type {
  OperatorIdentityPosture,
  OperatorIdentityProjection,
} from "./identity/operator-identity-projection";

export const consoleShellBoundary: ConsoleBoundary = {
  id: "console-shell",
  mustNotOwn: [
    "domain posture",
    "domain action eligibility",
    "domain workflow state",
    "domain receipts",
    "movement gate truth",
    "runtime readiness truth",
    "model access authority",
  ],
  owns: [
    "top-level layout and navigation",
    "active surface selection",
    "global visible context candidate propagation",
    "global close, dirty, and exit guards",
    "major surface composition",
  ],
  status: "active-contract",
};
