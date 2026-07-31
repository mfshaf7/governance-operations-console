export type BuildTreeTone =
  | "danger"
  | "info"
  | "muted"
  | "ok"
  | "stale"
  | "warn";

export type BuildTreeNodeKind = "branch" | "leaf" | "risk" | "root";

export type BuildTreeNodeProfile = {
  canHaveChildren: boolean;
  label: string;
  pluralLabel: string;
  tone: BuildTreeTone;
};

export type BuildTreeProfile = {
  nodeProfiles: Record<BuildTreeNodeKind, BuildTreeNodeProfile>;
  rootKind: BuildTreeNodeKind;
  supportKinds: BuildTreeNodeKind[];
};

export type BuildTreeNode = {
  children?: BuildTreeNode[];
  description: string;
  draftBody: string;
  id: string;
  kind: BuildTreeNodeKind;
  metadata?: Record<string, string>;
  remark: string;
  title: string;
  tone: BuildTreeTone;
};

export type BuildTreeSubject = {
  contextBriefRef?: string;
  description?: string;
  evidenceRefs?: string[];
  id: string;
  sourceRef?: string;
  title: string;
};

export type BuildTreeDocument = {
  profile: BuildTreeProfile;
  root: BuildTreeNode;
  subject: BuildTreeSubject;
};

export type BuildTreeViewMode = "inline" | "structured";

export type BuildTreeDraft = {
  document: BuildTreeDocument;
  expandedNodeIds: string[];
  openDetailNodeId: string | null;
  savedAt: string;
  selectedNodeId: string;
  stale: boolean;
  structuredGroupIds: string[];
  viewMode: BuildTreeViewMode;
};

export type BuildTreeScaffoldOwner = "operator" | "system";

export type BuildTreeScaffoldState =
  | "auto"
  | "edited"
  | "inherited"
  | "optional"
  | "review";

export type BuildTreeScaffoldSection = {
  defaultValue: string;
  heading: string;
  id: string;
  owner: BuildTreeScaffoldOwner;
  placeholder: string;
  state: BuildTreeScaffoldState;
  value: string;
};

export type BuildTreeMetrics = {
  branchCount: number;
  leafCount: number;
  riskCount: number;
  totalCount: number;
};

export type BuildTreeAdvisorTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export type BuildTreeReviewPacket = {
  accepted: boolean;
  createdAt: string;
  draft: BuildTreeDraft;
  evidenceRefs: string[];
  id: string;
  validationAccepted: boolean;
};
