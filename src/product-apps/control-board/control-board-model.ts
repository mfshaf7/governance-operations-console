import type { TerasTone } from "@/teras";

export type ControlBoardViewMode = "art-tree" | "control-board" | "family-map";

export type ControlBoardPackagePosture =
  | "Ready"
  | "In Progress"
  | "Blocked"
  | "Closeout Pending"
  | "Deferred"
  | "Done"
  | "Retired";

export type ControlBoardPostureTerm = {
  description: string;
  label: string;
};

export type ControlBoardPostureTerms = Record<
  ControlBoardPackagePosture,
  ControlBoardPostureTerm
>;

export type ControlBoardPackageProgress = {
  completedChildCount: number;
  progressPercent: number;
  totalChildCount: number;
};

export type ControlBoardPackage = {
  displayName: string;
  openChildCount: number;
  packageId: string;
  posture: ControlBoardPackagePosture;
  progress: ControlBoardPackageProgress;
  sourceRef: string;
  tone: TerasTone;
};

export type ControlBoardTreeNode = {
  children: ControlBoardTreeNode[];
  componentType: string;
  description: string;
  id: string;
  title: string;
  totalChildCount: number;
};

export type ControlBoardPackageTreeById = Record<
  ControlBoardPackage["packageId"],
  ControlBoardTreeNode | null
>;

export type ControlBoardFamilyGroup = {
  id: string;
  label: string;
  packageIds: Array<ControlBoardPackage["packageId"]>;
};
