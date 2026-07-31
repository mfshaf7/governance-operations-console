import type { BuildTreeViewMode } from "./build-tree-model";

export const buildTreeEditorFieldProps = {
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;

export const buildTreeViewModeOptions = [
  {
    label: "Inline Tree",
    mode: "inline",
  },
  {
    label: "Structured Tree",
    mode: "structured",
  },
] satisfies Array<{
  label: string;
  mode: BuildTreeViewMode;
}>;

export const buildTreeReadOnlyModeLabel = "Read Only";

export function buildTreeToggleAllLabel(fullyExpanded: boolean) {
  return fullyExpanded ? "Collapse All" : "Expand All";
}

export function buildTreeToggleAllAriaLabel(fullyExpanded: boolean) {
  return fullyExpanded
    ? "Collapse all tree branches"
    : "Expand all tree branches";
}

export function buildTreeReadOnlyExpansionStateLabel(
  collapsedNodeIds: string[],
) {
  return collapsedNodeIds.length === 0 ? "Expanded" : "Collapsed";
}

export function buildTreeReadOnlyToggleAllLabel(collapsedNodeIds: string[]) {
  return collapsedNodeIds.length === 0 ? "Collapse All" : "Expand All";
}

export function buildTreeReadOnlyToggleAllAriaLabel(
  collapsedNodeIds: string[],
) {
  return collapsedNodeIds.length === 0
    ? "Collapse read-only tree branches"
    : "Expand read-only tree branches";
}
