import type {
  OperationWorkbenchPathLabel,
} from "../../operation-workbench/operation-workbench-domain-registry";
import type {
  ConsoleNavigationTarget,
  ConsoleWorkspaceId,
} from "../../console-architecture";

type ConsoleWorkspaceEntry = Readonly<{
  description: string;
  group: "environment" | "work";
  id: ConsoleWorkspaceId;
  label: string;
}>;

export const consoleOverviewEntry = {
  description: "Monitor priorities.",
  id: "console",
  label: "Console",
} as const;

export const consoleWorkspaceEntryById = {
  "lifecycle-transitions": {
    description: "Coordinate boundary changes.",
    group: "work",
    id: "lifecycle-transitions",
    label: "Lifecycle Transitions",
  },
  "dev-integration": {
    description: "Manage integration profiles.",
    group: "environment",
    id: "dev-integration",
    label: "Dev Integration",
  },
  "governed-releases": {
    description: "Review release evidence.",
    group: "environment",
    id: "governed-releases",
    label: "Governed Releases",
  },
} as const satisfies Readonly<Record<ConsoleWorkspaceId, ConsoleWorkspaceEntry>>;

export const consoleWorkspaceEntries = Object.values(
  consoleWorkspaceEntryById,
);

export function consoleWorkbenchTargetId(
  label: OperationWorkbenchPathLabel,
): Extract<ConsoleNavigationTarget, { kind: "workbench-domain" }>["id"] {
  return `workbench:${label.toLowerCase()}` as Extract<
    ConsoleNavigationTarget,
    { kind: "workbench-domain" }
  >["id"];
}
