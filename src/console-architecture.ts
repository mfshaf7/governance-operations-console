import type {
  OperationWorkbenchPathLabel,
} from "./operation-workbench/operation-workbench-domain-registry";

export type ConsoleBoundary = {
  readonly id: string;
  readonly mustNotOwn: readonly string[];
  readonly owns: readonly string[];
  readonly status: "active-contract";
};

export type ConsoleSurfaceEntryMode =
  | "configure"
  | "inspect"
  | "resolve"
  | "resume"
  | "review";

export type ConsoleSurfaceEntryIntent = Readonly<{
  mode: ConsoleSurfaceEntryMode;
  requiredMoveRef: string;
  subjectRef: string;
}>;

export type ConsoleWorkspaceId =
  | "dev-integration"
  | "governed-releases"
  | "lifecycle-transitions";

export type ConsoleNavigationTarget =
  | Readonly<{
      id: "console";
      kind: "console";
    }>
  | Readonly<{
      id: `workbench:${Lowercase<OperationWorkbenchPathLabel>}`;
      kind: "workbench-domain";
      surfaceLabel: OperationWorkbenchPathLabel;
    }>
  | Readonly<{
      id: ConsoleWorkspaceId;
      kind: "workspace";
      workspaceId: ConsoleWorkspaceId;
    }>;

export type ConsoleEntryIntent = ConsoleSurfaceEntryIntent & Readonly<{
  target: ConsoleNavigationTarget;
}>;

export const consoleArchitectureDecisionRef =
  "docs/product/system-design.md";
