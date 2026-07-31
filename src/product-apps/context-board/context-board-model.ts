export type ContextBoardTone =
  | "amber"
  | "blue"
  | "default"
  | "green"
  | "neutral"
  | "purple"
  | "red";

export type ContextBoardConnectorTone = Exclude<
  ContextBoardTone,
  "default"
>;

export type ContextBoardStyle = "architecture" | "flow" | "map" | "plain";

export type ContextBoardDiagramType =
  | "c4"
  | "dependency"
  | "flowchart"
  | "freeform"
  | "mindmap"
  | "sequence"
  | "swimlane"
  | "uml";

export type ContextBoardTool = "connect" | "move" | "select" | "sketch";

export type ContextBoardToolDrawer =
  | "arrange"
  | "connector"
  | "diagram"
  | "general"
  | "sketch"
  | "style";

export type ContextBoardToolSection =
  | ContextBoardToolDrawer
  | "component"
  | "diagram-label";

export type ContextBoardItemType = "core" | "custom" | "template";

export type ContextBoardCustomKind =
  | "actor"
  | "branch"
  | "c4-component"
  | "c4-container"
  | "c4-external-system"
  | "c4-person"
  | "c4-relationship"
  | "c4-software-system"
  | "c4-system-boundary"
  | "component"
  | "container"
  | "decision"
  | "diagram"
  | "end"
  | "lane"
  | "label-area"
  | "label-field"
  | "label-pill"
  | "label-tag"
  | "lifeline"
  | "note"
  | "process"
  | "sequence-activation"
  | "sequence-fragment"
  | "sequence-message"
  | "sequence-return"
  | "shape-circle"
  | "shape-diamond"
  | "shape-rect"
  | "shape-rounded"
  | "start"
  | "text"
  | "topic"
  | "uml-class"
  | "uml-interface"
  | "uml-package"
  | "uml-state"
  | "uml-usecase";

export type ContextBoardConnectorShape = "curve" | "straight";

export type ContextBoardConnectorStroke = "dashed" | "solid";

export type ContextBoardConnectorTip =
  | "arrow"
  | "diamond"
  | "filled-diamond"
  | "plain"
  | "triangle";

export type ContextBoardUmlRelationship =
  | "aggregation"
  | "association"
  | "composition"
  | "dependency"
  | "directed-association"
  | "generalization"
  | "realization";

export type ContextBoardPortSide = "bottom" | "left" | "right" | "top";

export type ContextBoardPosition = {
  x: number;
  y: number;
};

export type ContextBoardCustomItem = ContextBoardPosition & {
  detail: string;
  diagramType?: ContextBoardDiagramType;
  height?: number;
  id: string;
  kind: ContextBoardCustomKind;
  label: string;
  tone?: ContextBoardTone;
  width?: number;
};

export type ContextBoardSelectionItem = {
  id: string;
  itemType: ContextBoardItemType;
};

export type ContextBoardSurfaceBox = ContextBoardSelectionItem &
  ContextBoardPosition & {
    height: number;
    width: number;
  };

export type ContextBoardSurfaceBounds = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
};

export type ContextBoardAlignAction =
  | "align-bottom"
  | "align-center-x"
  | "align-center-y"
  | "align-left"
  | "align-right"
  | "align-top";

export type ContextBoardDistributeAction =
  | "distribute-horizontal"
  | "distribute-vertical";

export type ContextBoardLayerAction = "bring-front" | "send-back";

export type ContextBoardSelectionBox = {
  current: ContextBoardPosition;
  pointerId: number;
  start: ContextBoardPosition;
};

export type ContextBoardSketchTool =
  | "eraser"
  | "highlighter"
  | "marker"
  | "pen";

export type ContextBoardSketchDrawTool = Exclude<
  ContextBoardSketchTool,
  "eraser"
>;

export type ContextBoardSketchTone =
  | ContextBoardConnectorTone
  | "black"
  | "burgundy"
  | "charcoal"
  | "forest"
  | "navy"
  | "white";

export type ContextBoardSketchStroke = {
  id: string;
  opacity: number;
  points: ContextBoardPosition[];
  tone: ContextBoardSketchTone;
  tool: ContextBoardSketchDrawTool;
  width: number;
};

export type ContextBoardTemplateTray = ContextBoardPosition & {
  diagramType: ContextBoardDiagramType;
  height: number;
  id: string;
  itemIds: string[];
  label: string;
  manual?: boolean;
  tone?: ContextBoardTone;
  width: number;
};

export type ContextBoardPortConnectionEndpoint = {
  endpointType?: "port";
  itemId: string;
  itemType: ContextBoardItemType;
  side: ContextBoardPortSide;
};

export type ContextBoardFreeConnectionEndpoint = ContextBoardPosition & {
  endpointType: "free";
  side: ContextBoardPortSide;
};

export type ContextBoardConnectionEndpoint =
  | ContextBoardFreeConnectionEndpoint
  | ContextBoardPortConnectionEndpoint;

export type ContextBoardConnection = {
  from: ContextBoardConnectionEndpoint;
  id: string;
  label?: string;
  relationship?: ContextBoardUmlRelationship;
  shape: ContextBoardConnectorShape;
  startTip?: ContextBoardConnectorTip;
  stroke?: ContextBoardConnectorStroke;
  tone?: ContextBoardConnectorTone;
  to: ContextBoardConnectionEndpoint;
  tip: ContextBoardConnectorTip;
};

export type ContextBoardConnectionSide = "from" | "to";

export type ContextBoardSnapshot = {
  connections: ContextBoardConnection[];
  customItems: ContextBoardCustomItem[];
  positions: Record<string, ContextBoardPosition>;
  removedCoreIds: string[];
  sketchStrokes: ContextBoardSketchStroke[];
  style: ContextBoardStyle;
  templateTrays: ContextBoardTemplateTray[];
};

export type ContextBoardCoreNode = {
  detail: string;
  id: string;
  kicker: string;
  label: string;
  tone: ContextBoardTone;
};

export type ContextBoardConnectionDraft = {
  from: ContextBoardConnectionEndpoint;
  pointerSide?: ContextBoardPortSide;
  pointer: ContextBoardPosition;
  pointerId: number;
  reconnect?: {
    connectionId: string;
    originSnapshot: ContextBoardSnapshot;
    side: ContextBoardConnectionSide;
  };
  shape?: ContextBoardConnectorShape;
  startTip?: ContextBoardConnectorTip;
  stroke?: ContextBoardConnectorStroke;
  tip?: ContextBoardConnectorTip;
  tone?: ContextBoardConnectorTone;
};

export type ContextBoardDragState = {
  id: string;
  itemType: ContextBoardItemType;
  memberOrigins?: Record<string, ContextBoardPosition>;
  originX: number;
  originY: number;
  originSnapshot: ContextBoardSnapshot;
  pointerId: number;
  startX: number;
  startY: number;
};

export type ContextBoardSketchDragState = {
  changed: boolean;
  originSnapshot: ContextBoardSnapshot;
  pointerId: number;
  tool: ContextBoardSketchTool;
};

export type ContextBoardResizeState = {
  id: string;
  itemType: Extract<ContextBoardItemType, "custom" | "template">;
  originHeight: number;
  originSnapshot: ContextBoardSnapshot;
  originWidth: number;
  pointerId: number;
  startX: number;
  startY: number;
};

export type ContextBoardSubject = {
  description?: string;
  evidenceRefs?: string[];
  id: string;
  sourceRef?: string;
  title: string;
};

export type ContextBoardDisposition = "attach" | "proceed" | "retire";

export type ContextBoardFinalizedBrief = {
  boardSnapshotRef: string;
  disposition: ContextBoardDisposition;
  finalizedAt: string;
  fingerprint: string;
  id: string;
  metadataPacketRef: string;
  name: string;
  note: string;
  savedSessionId: string | null;
  snapshot: ContextBoardSnapshot;
  versionLabel: string;
};

export type ContextBoardSavedSession = {
  disposition: ContextBoardDisposition;
  fingerprint: string;
  id: string;
  name: string;
  note: string;
  savedAt: string;
  sequence: number;
  snapshot: ContextBoardSnapshot;
};

export type ContextBoardExport = {
  attachmentId: string;
  createdAt: string;
  fileName: string;
  mimeType: string;
  snapshotRef: string;
};
