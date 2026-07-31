import type { CSSProperties } from "react";

import {
  CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT,
  CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH,
  CONTEXT_BOARD_CUSTOM_NOTE_HEIGHT,
  CONTEXT_BOARD_CUSTOM_NOTE_WIDTH,
  CONTEXT_BOARD_HEIGHT,
  CONTEXT_BOARD_WIDTH,
} from "./context-board-core";
import type {
  ContextBoardTone,
  ContextBoardConnectorShape,
  ContextBoardConnectorStroke,
  ContextBoardConnectorTip,
  ContextBoardConnectorTone,
  ContextBoardCustomItem,
  ContextBoardCustomKind,
  ContextBoardItemType,
  ContextBoardPosition,
  ContextBoardSketchTool,
  ContextBoardStyle,
  ContextBoardTemplateTray,
  ContextBoardUmlRelationship,
  ContextBoardDiagramType,
} from "./context-board-model";

export type ContextBoardStyleTarget = {
  id: string;
  itemType: Extract<ContextBoardItemType, "custom" | "template">;
};

export type ContextBoardCustomKindCopy = {
  detail: string;
  kicker: string;
  label: string;
  offsetX: number;
  offsetY: number;
};

export type ContextBoardUmlRelationshipCopy = {
  connectionLabel: string;
  endTip: ContextBoardConnectorTip;
  label: string;
  startTip: ContextBoardConnectorTip;
  stroke: ContextBoardConnectorStroke;
  title: string;
  tone: ContextBoardConnectorTone;
};

export type ContextBoardDiagramLabelPreset = {
  id: string;
  label: string;
  relationship?: ContextBoardUmlRelationship;
  title: string;
  tone: ContextBoardConnectorTone;
};

export function contextBoardSnapshotToneColors(tone: ContextBoardTone) {
  switch (tone) {
    case "green":
      return {
        border: "rgba(130,236,151,0.62)",
        fill: "rgba(130,236,151,0.055)",
        text: "#82ec97",
      };
    case "amber":
      return {
        border: "rgba(255,193,90,0.58)",
        fill: "rgba(255,193,90,0.055)",
        text: "#ffc15a",
      };
    case "red":
      return {
        border: "rgba(255,106,61,0.58)",
        fill: "rgba(255,106,61,0.06)",
        text: "#ff8f6b",
      };
    case "purple":
      return {
        border: "rgba(181,151,255,0.58)",
        fill: "rgba(181,151,255,0.055)",
        text: "#c7b6ff",
      };
    case "neutral":
    case "default":
      return {
        border: "rgba(169,163,150,0.38)",
        fill: "rgba(169,163,150,0.045)",
        text: "#c4b9a8",
      };
    case "blue":
    default:
      return {
        border: "rgba(139,181,255,0.58)",
        fill: "rgba(139,181,255,0.055)",
        text: "#8bb5ff",
      };
  }
}

export const contextBoardUmlRelationships: ContextBoardUmlRelationship[] = [
  "association",
  "directed-association",
  "dependency",
  "realization",
  "generalization",
  "aggregation",
  "composition",
];
export const contextBoardDiagramTypes: ContextBoardDiagramType[] = [
  "flowchart",
  "sequence",
  "uml",
  "c4",
  "dependency",
  "swimlane",
  "mindmap",
];
export const contextBoardBasicShapeKinds: ContextBoardCustomKind[] = [
  "shape-rect",
  "shape-rounded",
  "shape-circle",
  "shape-diamond",
];
export const contextBoardLabelKinds: ContextBoardCustomKind[] = [
  "label-tag",
  "label-pill",
  "label-field",
  "label-area",
];
export const contextBoardGeneralComponentKinds: ContextBoardCustomKind[] = [
  "component",
  "diagram",
  "note",
  "process",
  "text",
];
export const contextBoardGeneralItemKinds: ContextBoardCustomKind[] = [
  ...contextBoardGeneralComponentKinds,
  ...contextBoardLabelKinds,
  ...contextBoardBasicShapeKinds,
];
export const contextBoardDiagramSharedToolKinds: ContextBoardCustomKind[] = [
  "diagram",
  "note",
  "text",
  ...contextBoardLabelKinds,
  ...contextBoardBasicShapeKinds,
];
export function contextBoardCustomKindIsGeneral(kind: ContextBoardCustomKind) {
  return contextBoardDiagramSharedToolKinds.includes(kind);
}

export function contextBoardKeyboardTargetIsEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function contextBoardStyleCopy(style: ContextBoardStyle): {
  label: string;
  title: string;
} {
  switch (style) {
    case "flow":
      return {
        label: "Line Grid",
        title: "Structured line-grid canvas background",
      };
    case "map":
      return {
        label: "Dot Grid",
        title: "Open dot-grid canvas background",
      };
    case "plain":
      return {
        label: "Plain",
        title: "Plain white canvas for screenshots and future export",
      };
    case "architecture":
    default:
      return {
        label: "Grid",
        title: "Default canvas grid background",
      };
  }
}

export function contextBoardConnectionTone(
  tone?: ContextBoardConnectorTone,
): ContextBoardConnectorTone {
  return tone ?? "amber";
}

export function contextBoardSketchToolCopy(tool: ContextBoardSketchTool): {
  description: string;
  label: string;
  opacity: number;
  width: number;
} {
  switch (tool) {
    case "marker":
      return {
        description: "Bold opaque stroke for emphasis and rough blocking.",
        label: "Marker",
        opacity: 0.78,
        width: 8,
      };
    case "highlighter":
      return {
        description: "Wide translucent stroke for grouping and visual emphasis.",
        label: "Highlighter",
        opacity: 0.3,
        width: 18,
      };
    case "eraser":
      return {
        description: "Remove nearby freeform sketch strokes.",
        label: "Eraser",
        opacity: 1,
        width: 28,
      };
    case "pen":
    default:
      return {
        description: "Thin freehand stroke for quick sketching.",
        label: "Pen",
        opacity: 0.9,
        width: 3,
      };
  }
}

export function contextBoardSketchPath(points: ContextBoardPosition[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} l 0.01 0`;
  }

  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ");
}

export function contextBoardUmlRelationshipCopy(
  relationship: ContextBoardUmlRelationship,
): ContextBoardUmlRelationshipCopy {
  switch (relationship) {
    case "aggregation":
      return {
        connectionLabel: "aggregates",
        endTip: "plain",
        label: "Aggregation",
        startTip: "diamond",
        stroke: "solid",
        title: "Whole-to-part aggregation with a hollow diamond at the whole side",
        tone: "purple",
      };
    case "composition":
      return {
        connectionLabel: "owns",
        endTip: "plain",
        label: "Composition",
        startTip: "filled-diamond",
        stroke: "solid",
        title: "Strong whole-to-part composition with a filled diamond at the owner side",
        tone: "purple",
      };
    case "dependency":
      return {
        connectionLabel: "depends on",
        endTip: "arrow",
        label: "Dependency",
        startTip: "plain",
        stroke: "dashed",
        title: "Dashed dependency from client to supplier",
        tone: "amber",
      };
    case "directed-association":
      return {
        connectionLabel: "uses",
        endTip: "arrow",
        label: "Directed",
        startTip: "plain",
        stroke: "solid",
        title: "Navigable association toward the known target",
        tone: "blue",
      };
    case "generalization":
      return {
        connectionLabel: "extends",
        endTip: "triangle",
        label: "Generalization",
        startTip: "plain",
        stroke: "solid",
        title: "Subclass-to-parent generalization with a hollow triangle",
        tone: "purple",
      };
    case "realization":
      return {
        connectionLabel: "implements",
        endTip: "triangle",
        label: "Realization",
        startTip: "plain",
        stroke: "dashed",
        title: "Class-to-interface realization with dashed hollow triangle",
        tone: "blue",
      };
    case "association":
    default:
      return {
        connectionLabel: "",
        endTip: "plain",
        label: "Association",
        startTip: "plain",
        stroke: "solid",
        title: "Plain class association",
        tone: "neutral",
      };
  }
}

export function contextBoardConnectorMarkerId(
  tone: ContextBoardConnectorTone,
  tip: Exclude<ContextBoardConnectorTip, "plain">,
) {
  return `work-design-board-${tip}-${tone}`;
}

export function contextBoardConnectorPathStyle(
  tone: ContextBoardConnectorTone,
  shape: ContextBoardConnectorShape,
  stroke?: ContextBoardConnectorStroke,
): CSSProperties {
  const colors = contextBoardSnapshotToneColors(tone);

  return {
    fill: "none",
    filter: `drop-shadow(0 0 7px ${contextBoardConnectorGlowColor(tone)})`,
    opacity: 0.82,
    stroke: colors.text,
    strokeDasharray: stroke === "dashed" ? "8 7" : "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: shape === "straight" ? 2.45 : 2.75,
    vectorEffect: "non-scaling-stroke",
  } as CSSProperties;
}

export function contextBoardConnectorMarkerStyle(
  tone: ContextBoardConnectorTone,
  tip: ContextBoardConnectorTip,
): CSSProperties {
  const colors = contextBoardSnapshotToneColors(tone);
  const fill =
    tip === "diamond" || tip === "triangle"
      ? "rgba(5, 8, 12, 0.95)"
      : colors.text;

  return {
    fill,
    opacity: 0.94,
    stroke: colors.text,
    strokeWidth: 1.45,
  } as CSSProperties;
}

export function contextBoardConnectorGlowColor(tone: ContextBoardConnectorTone) {
  switch (tone) {
    case "green":
      return "rgba(130, 236, 151, 0.28)";
    case "amber":
      return "rgba(255, 193, 90, 0.3)";
    case "red":
      return "rgba(255, 106, 61, 0.28)";
    case "purple":
      return "rgba(190, 143, 255, 0.28)";
    case "neutral":
      return "rgba(174, 181, 194, 0.22)";
    case "blue":
    default:
      return "rgba(139, 181, 255, 0.28)";
  }
}

export function contextBoardDiagramCopy(type: ContextBoardDiagramType): {
  description: string;
  label: string;
} {
  switch (type) {
    case "c4":
      return {
        description: "Context, container, and component framing for architecture discussion.",
        label: "C4",
      };
    case "dependency":
      return {
        description: "Dependency cues, blocker signals, and sequencing choices.",
        label: "Dependency Map",
      };
    case "freeform":
      return {
        description: "Loose notes, evidence cards, and sketch blocks.",
        label: "Freeform",
      };
    case "mindmap":
      return {
        description: "Central topic with branches for brainstorming.",
        label: "Mindmap",
      };
    case "sequence":
      return {
        description: "Actors, lifelines, and message flow.",
        label: "Sequence",
      };
    case "swimlane":
      return {
        description: "Role or system lanes with handoff steps.",
        label: "Swimlane",
      };
    case "uml":
      return {
        description: "UML class diagram with interface and class relationships.",
        label: "UML Class",
      };
    case "flowchart":
    default:
      return {
        description: "Start, process, decision, and output flow.",
        label: "Flowchart",
      };
  }
}

export function contextBoardDiagramToolLabel(type: ContextBoardDiagramType) {
  if (type === "dependency") {
    return "Dependency";
  }

  return contextBoardDiagramCopy(type).label;
}

export function contextBoardDiagramComponentKinds(
  type: ContextBoardDiagramType,
): ContextBoardCustomKind[] {
  switch (type) {
    case "c4":
      return [
        "c4-person",
        "c4-external-system",
        "c4-software-system",
        "c4-system-boundary",
        "c4-container",
        "c4-component",
        "c4-relationship",
        "note",
      ];
    case "dependency":
      return ["component", "process", "note", "text"];
    case "freeform":
      return ["note", "diagram", "process", "component"];
    case "mindmap":
      return ["topic", "branch", "note"];
    case "sequence":
      return [
        "actor",
        "lifeline",
        "sequence-activation",
        "sequence-message",
        "sequence-return",
        "sequence-fragment",
        "note",
      ];
    case "swimlane":
      return ["lane", "process", "decision", "note"];
    case "uml":
      return [
        "uml-class",
        "uml-interface",
        "uml-package",
        "uml-usecase",
        "uml-state",
        "note",
      ];
    case "flowchart":
    default:
      return ["start", "process", "decision", "end", "note"];
  }
}

export function contextBoardDiagramLabelSectionLabel(type: ContextBoardDiagramType) {
  switch (type) {
    case "c4":
      return "Relationship Labels";
    case "dependency":
      return "Dependency Labels";
    case "flowchart":
      return "Flow Labels";
    case "mindmap":
      return "Branch Labels";
    case "sequence":
      return "Message Labels";
    case "swimlane":
      return "Lane Labels";
    case "uml":
      return "UML Labels";
    case "freeform":
    default:
      return "Diagram Labels";
  }
}

export function contextBoardDiagramLabelPresets(
  type: ContextBoardDiagramType,
): ContextBoardDiagramLabelPreset[] {
  switch (type) {
    case "c4":
      return [
        contextBoardDiagramLabelPreset("c4-uses", "uses", "Common C4 relationship label", "blue"),
        contextBoardDiagramLabelPreset("c4-calls", "calls", "Service call relationship label", "blue"),
        contextBoardDiagramLabelPreset("c4-reads-writes", "reads/writes", "Read/write data relationship label", "amber"),
        contextBoardDiagramLabelPreset("c4-publishes", "publishes", "Event publication relationship label", "green"),
        contextBoardDiagramLabelPreset("c4-subscribes", "subscribes", "Event subscription relationship label", "green"),
        contextBoardDiagramLabelPreset("c4-hosts", "hosts", "Hosting or deployment relationship label", "purple"),
        contextBoardDiagramLabelPreset("c4-owns", "owns", "Ownership relationship label", "purple"),
      ];
    case "dependency":
      return [
        contextBoardDiagramLabelPreset("dependency-depends", "depends on", "Dependency edge label", "amber"),
        contextBoardDiagramLabelPreset("dependency-requires", "requires", "Requirement dependency label", "amber"),
        contextBoardDiagramLabelPreset("dependency-blocks", "blocks", "Blocking dependency label", "red"),
        contextBoardDiagramLabelPreset("dependency-consumes", "consumes", "Consumer dependency label", "blue"),
        contextBoardDiagramLabelPreset("dependency-publishes", "publishes", "Publisher dependency label", "green"),
        contextBoardDiagramLabelPreset("dependency-owned", "owned by", "Ownership dependency label", "purple"),
      ];
    case "flowchart":
      return [
        contextBoardDiagramLabelPreset("flowchart-yes", "YES", "Decision branch label for yes path", "green"),
        contextBoardDiagramLabelPreset("flowchart-no", "NO", "Decision branch label for no path", "red"),
        contextBoardDiagramLabelPreset("flowchart-pass", "PASS", "Validation or gate pass path label", "green"),
        contextBoardDiagramLabelPreset("flowchart-fail", "FAIL", "Validation or gate fail path label", "red"),
        contextBoardDiagramLabelPreset("flowchart-rework", "REWORK", "Rework loop path label", "amber"),
        contextBoardDiagramLabelPreset("flowchart-next", "NEXT", "Forward step path label", "blue"),
      ];
    case "mindmap":
      return [
        contextBoardDiagramLabelPreset("mindmap-idea", "idea", "Mindmap idea branch label", "blue"),
        contextBoardDiagramLabelPreset("mindmap-option", "option", "Alternative branch label", "amber"),
        contextBoardDiagramLabelPreset("mindmap-risk", "risk", "Risk branch label", "red"),
        contextBoardDiagramLabelPreset("mindmap-evidence", "evidence", "Evidence branch label", "green"),
        contextBoardDiagramLabelPreset("mindmap-question", "question", "Open question branch label", "purple"),
        contextBoardDiagramLabelPreset("mindmap-follow-up", "follow-up", "Follow-up branch label", "neutral"),
      ];
    case "sequence":
      return [
        contextBoardDiagramLabelPreset("sequence-call", "call", "Synchronous message label", "blue"),
        contextBoardDiagramLabelPreset("sequence-return", "return", "Return message label", "neutral"),
        contextBoardDiagramLabelPreset("sequence-async", "async", "Asynchronous message label", "amber"),
        contextBoardDiagramLabelPreset("sequence-create", "create", "Create object or session label", "green"),
        contextBoardDiagramLabelPreset("sequence-emit", "emit", "Event emission label", "purple"),
        contextBoardDiagramLabelPreset("sequence-timeout", "timeout", "Timeout or failure response label", "red"),
      ];
    case "swimlane":
      return [
        contextBoardDiagramLabelPreset("swimlane-handoff", "handoff", "Lane handoff label", "blue"),
        contextBoardDiagramLabelPreset("swimlane-approve", "approve", "Approval path label", "green"),
        contextBoardDiagramLabelPreset("swimlane-reject", "reject", "Rejection path label", "red"),
        contextBoardDiagramLabelPreset("swimlane-rework", "rework", "Rework loop label", "amber"),
        contextBoardDiagramLabelPreset("swimlane-escalate", "escalate", "Escalation path label", "purple"),
        contextBoardDiagramLabelPreset("swimlane-done", "done", "Completion path label", "green"),
      ];
    case "uml":
      return contextBoardUmlRelationships.map((relationship) => {
        const copy = contextBoardUmlRelationshipCopy(relationship);

        return {
          id: `uml-${relationship}`,
          label: copy.connectionLabel || copy.label,
          relationship,
          title: copy.title,
          tone: copy.tone,
        };
      });
    case "freeform":
    default:
      return [];
  }
}

export function contextBoardDiagramLabelPreset(
  id: string,
  label: string,
  title: string,
  tone: ContextBoardConnectorTone,
): ContextBoardDiagramLabelPreset {
  return {
    id,
    label,
    title,
    tone,
  };
}

export function contextBoardCustomKindCopy(
  kind: ContextBoardCustomKind,
): ContextBoardCustomKindCopy {
  switch (kind) {
    case "actor":
      return {
        detail: "External operator, system, team, or actor.",
        kicker: "actor",
        label: "Actor",
        offsetX: -380,
        offsetY: -140,
      };
    case "branch":
      return {
        detail: "Branch idea or supporting thought.",
        kicker: "branch",
        label: "Branch",
        offsetX: 300,
        offsetY: 120,
      };
    case "c4-component":
      return {
        detail: "C4 component inside a container boundary.",
        kicker: "C4 component",
        label: "Component",
        offsetX: 180,
        offsetY: 190,
      };
    case "c4-container":
      return {
        detail: "C4 container, app, service, datastore, or deployable unit.",
        kicker: "C4 container",
        label: "Container",
        offsetX: -40,
        offsetY: 90,
      };
    case "c4-external-system":
      return {
        detail: "External software system, platform, or system-of-record boundary.",
        kicker: "C4 external system",
        label: "External System",
        offsetX: 410,
        offsetY: -40,
      };
    case "c4-person":
      return {
        detail: "Human actor or role interacting with the system.",
        kicker: "C4 person",
        label: "Person",
        offsetX: -430,
        offsetY: -40,
      };
    case "c4-relationship":
      return {
        detail: "",
        kicker: "C4 relationship",
        label: "Relationship",
        offsetX: 40,
        offsetY: -40,
      };
    case "c4-software-system":
      return {
        detail: "Primary software system under discussion.",
        kicker: "C4 software system",
        label: "Software System",
        offsetX: 0,
        offsetY: -80,
      };
    case "c4-system-boundary":
      return {
        detail: "Boundary that groups related software systems, containers, or components.",
        kicker: "C4 boundary",
        label: "System Boundary",
        offsetX: -190,
        offsetY: -120,
      };
    case "component":
      return {
        detail: "System component, service, package, or bounded part.",
        kicker: "component",
        label: "Component",
        offsetX: 120,
        offsetY: -120,
      };
    case "container":
      return {
        detail: "C4 container boundary or deployable runtime.",
        kicker: "container",
        label: "Container",
        offsetX: -120,
        offsetY: -180,
      };
    case "decision":
      return {
        detail: "Operator or system decision point.",
        kicker: "decision",
        label: "Decision",
        offsetX: 80,
        offsetY: 120,
      };
    case "diagram":
      return {
        detail: "Freeform visual card for a generated sketch or artifact.",
        kicker: "canvas card",
        label: "Canvas Card",
        offsetX: 260,
        offsetY: -50,
      };
    case "end":
      return {
        detail: "Flowchart terminal state or output.",
        kicker: "end",
        label: "End",
        offsetX: 0,
        offsetY: 220,
      };
    case "lane":
      return {
        detail: "Ownership lane, team lane, or system lane.",
        kicker: "lane",
        label: "Lane",
        offsetX: -420,
        offsetY: 160,
      };
    case "label-area":
      return {
        detail: "Editable label note.",
        kicker: "label",
        label: "Textarea",
        offsetX: 220,
        offsetY: 130,
      };
    case "label-field":
      return {
        detail: "",
        kicker: "label",
        label: "Text Field",
        offsetX: 180,
        offsetY: 100,
      };
    case "label-pill":
      return {
        detail: "",
        kicker: "label",
        label: "Pill",
        offsetX: 150,
        offsetY: 70,
      };
    case "label-tag":
      return {
        detail: "",
        kicker: "label",
        label: "Tag",
        offsetX: 120,
        offsetY: 40,
      };
    case "lifeline":
      return {
        detail: "Sequence participant with vertical message space.",
        kicker: "lifeline",
        label: "Lifeline",
        offsetX: 0,
        offsetY: -160,
      };
    case "process":
      return {
        detail: "Action, activity, transformation, or workflow step.",
        kicker: "process",
        label: "Process",
        offsetX: -80,
        offsetY: 30,
      };
    case "sequence-activation":
      return {
        detail: "",
        kicker: "activation",
        label: "Activation",
        offsetX: 40,
        offsetY: 20,
      };
    case "sequence-fragment":
      return {
        detail: "Optional, alternate, loop, or parallel interaction frame.",
        kicker: "fragment",
        label: "Fragment",
        offsetX: -260,
        offsetY: 170,
      };
    case "sequence-message":
      return {
        detail: "",
        kicker: "message",
        label: "Message",
        offsetX: -40,
        offsetY: 120,
      };
    case "sequence-return":
      return {
        detail: "",
        kicker: "return",
        label: "Return",
        offsetX: 100,
        offsetY: 170,
      };
    case "shape-circle":
      return {
        detail: "",
        kicker: "shape",
        label: "Circle",
        offsetX: 160,
        offsetY: 80,
      };
    case "shape-diamond":
      return {
        detail: "",
        kicker: "shape",
        label: "Diamond",
        offsetX: 220,
        offsetY: 120,
      };
    case "shape-rect":
      return {
        detail: "",
        kicker: "shape",
        label: "Rectangle",
        offsetX: 120,
        offsetY: 40,
      };
    case "shape-rounded":
      return {
        detail: "",
        kicker: "shape",
        label: "Rounded",
        offsetX: 180,
        offsetY: 60,
      };
    case "start":
      return {
        detail: "Start, trigger, input, or entry condition.",
        kicker: "start",
        label: "Start",
        offsetX: -320,
        offsetY: 20,
      };
    case "text":
      return {
        detail: "",
        kicker: "label",
        label: "Text",
        offsetX: 40,
        offsetY: -40,
      };
    case "topic":
      return {
        detail: "Central topic or organizing idea.",
        kicker: "topic",
        label: "Topic",
        offsetX: 0,
        offsetY: 0,
      };
    case "uml-class":
      return {
        detail: "- attribute: Type\n+ operation(): Result",
        kicker: "UML class",
        label: "Class",
        offsetX: -120,
        offsetY: -80,
      };
    case "uml-interface":
      return {
        detail: "+ operation(): Result",
        kicker: "UML interface",
        label: "Interface",
        offsetX: 160,
        offsetY: -140,
      };
    case "uml-package":
      return {
        detail: "Package boundary for related classes or interfaces.",
        kicker: "UML package",
        label: "Package",
        offsetX: -420,
        offsetY: -160,
      };
    case "uml-state":
      return {
        detail: "Entry, transition, or lifecycle state.",
        kicker: "UML state",
        label: "State",
        offsetX: 220,
        offsetY: 100,
      };
    case "uml-usecase":
      return {
        detail: "User-facing capability or interaction goal.",
        kicker: "UML use case",
        label: "Use Case",
        offsetX: -360,
        offsetY: 90,
      };
    case "note":
    default:
      return {
        detail: "Operator note, evidence snippet, or open question.",
        kicker: "note",
        label: "Note",
        offsetX: 180,
        offsetY: 120,
      };
  }
}

export function contextBoardCustomItemSize(
  kind: ContextBoardCustomKind,
  diagramType?: ContextBoardDiagramType,
): { height: number; width: number } {
  if (diagramType === "flowchart") {
    switch (kind) {
      case "decision":
        return { height: 164, width: 164 };
      case "process":
        return { height: 82, width: 224 };
      case "end":
      case "start":
        return { height: 62, width: 160 };
      case "text":
        return { height: 28, width: 64 };
      default:
        break;
    }
  }

  if (diagramType === "sequence") {
    switch (kind) {
      case "actor":
        return { height: 620, width: 150 };
      case "lifeline":
        return { height: 620, width: 160 };
      case "sequence-activation":
        return { height: 220, width: 22 };
      case "sequence-fragment":
        return { height: 470, width: 930 };
      case "sequence-message":
      case "sequence-return":
        return { height: 42, width: 285 };
      case "note":
        return { height: 94, width: 218 };
      default:
        break;
    }
  }

  if (diagramType === "dependency") {
    switch (kind) {
      case "component":
        return { height: 132, width: 308 };
      case "note":
        return { height: 126, width: 292 };
      case "process":
        return { height: 118, width: 308 };
      case "text":
        return { height: 34, width: 110 };
      default:
        break;
    }
  }

  if (diagramType === "swimlane") {
    switch (kind) {
      case "lane":
        return { height: 136, width: 1060 };
      case "process":
        return { height: 70, width: 198 };
      case "decision":
        return { height: 132, width: 132 };
      case "note":
        return { height: 86, width: 230 };
      default:
        break;
    }
  }

  switch (kind) {
    case "actor":
      return { height: 99, width: 200 };
    case "branch":
      return { height: 86, width: 224 };
    case "c4-component":
      return { height: 96, width: 220 };
    case "c4-container":
      return { height: 108, width: 220 };
    case "c4-external-system":
      return { height: 112, width: 220 };
    case "c4-person":
      return { height: 108, width: 190 };
    case "c4-relationship":
      return { height: 34, width: 138 };
    case "c4-software-system":
      return { height: 126, width: 288 };
    case "c4-system-boundary":
      return { height: 730, width: 800 };
    case "component":
      return { height: 115, width: 288 };
    case "container":
      return { height: 132, width: 320 };
    case "decision":
      return { height: 224, width: 224 };
    case "diagram":
      return {
        height: CONTEXT_BOARD_CUSTOM_DIAGRAM_HEIGHT,
        width: CONTEXT_BOARD_CUSTOM_DIAGRAM_WIDTH,
      };
    case "label-area":
      return { height: 92, width: 230 };
    case "label-field":
      return { height: 42, width: 190 };
    case "label-pill":
      return { height: 34, width: 140 };
    case "label-tag":
      return { height: 28, width: 120 };
    case "lane":
      return { height: 150, width: 368 };
    case "lifeline":
      return { height: 144, width: 200 };
    case "process":
      return { height: 109, width: 280 };
    case "sequence-activation":
      return { height: 154, width: 22 };
    case "sequence-fragment":
      return { height: 238, width: 610 };
    case "sequence-message":
    case "sequence-return":
      return { height: 42, width: 190 };
    case "shape-circle":
      return { height: 126, width: 126 };
    case "shape-diamond":
      return { height: 136, width: 136 };
    case "shape-rect":
      return { height: 96, width: 180 };
    case "shape-rounded":
      return { height: 96, width: 180 };
    case "end":
    case "start":
      return { height: 74, width: 192 };
    case "text":
      return { height: 34, width: 96 };
    case "topic":
      return { height: 96, width: 240 };
    case "uml-class":
      return { height: 142, width: 268 };
    case "uml-interface":
      return { height: 116, width: 252 };
    case "uml-package":
      return { height: 138, width: 310 };
    case "uml-state":
      return { height: 82, width: 210 };
    case "uml-usecase":
      return { height: 86, width: 230 };
    case "note":
    default:
      return {
        height: CONTEXT_BOARD_CUSTOM_NOTE_HEIGHT,
        width: CONTEXT_BOARD_CUSTOM_NOTE_WIDTH,
      };
  }
}

export function contextBoardCustomItemResolvedSize(
  item: ContextBoardCustomItem,
): { height: number; width: number } {
  const fallbackSize = contextBoardCustomItemSize(item.kind, item.diagramType);
  const height =
    item.height ??
    (contextBoardCustomKindAutoSizesText(item.kind, item.diagramType)
      ? contextBoardCustomAutoHeight(item, fallbackSize.height)
      : fallbackSize.height);

  return {
    height,
    width: item.width ?? fallbackSize.width,
  };
}

export function contextBoardDuplicatePosition(
  item: ContextBoardPosition,
  size: { height: number; width: number },
) {
  const offset = 44;
  const maxX = CONTEXT_BOARD_WIDTH - size.width - 16;
  const maxY = CONTEXT_BOARD_HEIGHT - size.height - 16;
  const canOffsetRight = item.x + offset <= maxX;
  const canOffsetDown = item.y + offset <= maxY;

  return {
    x: Math.max(16, Math.min(maxX, item.x + (canOffsetRight ? offset : -offset))),
    y: Math.max(16, Math.min(maxY, item.y + (canOffsetDown ? offset : -offset))),
  };
}

export function contextBoardCustomDetailRows(item: ContextBoardCustomItem) {
  if (item.kind === "c4-person") {
    return contextBoardEstimatedRows(item.detail, 18, 2, 24);
  }

  const profile = contextBoardCustomTextProfile(item);

  return contextBoardEstimatedRows(
    item.detail,
    profile.charactersPerLine,
    profile.minRows,
    profile.maxRows,
  );
}

export function contextBoardCustomAutoHeight(
  item: ContextBoardCustomItem,
  fallbackHeight: number,
) {
  if (item.kind === "c4-person") {
    return contextBoardC4PersonHeight(item, fallbackHeight);
  }

  const profile = contextBoardCustomTextProfile(item);
  const detailRows = contextBoardCustomDetailRows(item);
  const titleRows = contextBoardEstimatedRows(
    item.label,
    profile.titleCharactersPerLine,
    1,
    profile.maxTitleRows,
  );
  const extraDetailRows = Math.max(0, detailRows - profile.minRows);
  const extraTitleRows = Math.max(0, titleRows - 1);

  return Math.max(
    fallbackHeight,
    fallbackHeight +
      extraDetailRows * profile.rowHeight +
      extraTitleRows * profile.titleRowHeight,
  );
}

export function contextBoardCustomTextProfile(item: ContextBoardCustomItem) {
  const fallbackSize = contextBoardCustomItemSize(item.kind, item.diagramType);
  const width = item.width ?? fallbackSize.width;
  const usableWidth = Math.max(72, width - 36);
  const charactersPerLine = Math.max(10, Math.floor(usableWidth / 9.2));
  const titleCharactersPerLine = Math.max(12, Math.floor(usableWidth / 9));

  if (item.diagramType === "flowchart") {
    return {
      charactersPerLine: Math.max(10, Math.floor(usableWidth / 8.8)),
      maxRows: 20,
      maxTitleRows: 2,
      minRows: 1,
      rowHeight: 13,
      titleCharactersPerLine,
      titleRowHeight: 12,
    };
  }

  if (item.kind.startsWith("uml-")) {
    return {
      charactersPerLine: Math.max(14, Math.floor(usableWidth / 8.4)),
      maxRows: 28,
      maxTitleRows: 2,
      minRows: 2,
      rowHeight: 16,
      titleCharactersPerLine,
      titleRowHeight: 16,
    };
  }

  return {
    charactersPerLine,
    maxRows: 24,
    maxTitleRows: 2,
    minRows: 2,
    rowHeight: 17,
    titleCharactersPerLine,
    titleRowHeight: 17,
  };
}

export function contextBoardC4PersonHeight(
  item: ContextBoardCustomItem,
  fallbackHeight: number,
) {
  const titleRows = contextBoardEstimatedRows(item.label, 20, 1, 2);
  const detailRows = contextBoardCustomDetailRows(item);

  return Math.max(fallbackHeight, 64 + titleRows * 18 + detailRows * 13);
}

export function contextBoardEstimatedRows(
  value: string,
  charactersPerLine: number,
  minRows: number,
  maxRows: number,
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return minRows;
  }

  const rowCount = trimmed
    .split(/\r?\n/)
    .reduce(
      (count, line) =>
        count + Math.max(1, Math.ceil(line.trim().length / charactersPerLine)),
      0,
    );

  return Math.min(maxRows, Math.max(minRows, rowCount));
}

export function contextBoardCustomItemMinimumSize(
  kind: ContextBoardCustomKind,
  diagramType?: ContextBoardDiagramType,
): { height: number; width: number } {
  const defaultSize = contextBoardCustomItemSize(kind, diagramType);

  if (contextBoardCustomKindIsShape(kind)) {
    return { height: 54, width: 72 };
  }

  if (kind === "text") {
    return { height: 24, width: 48 };
  }

  if (contextBoardCustomKindIsLabel(kind)) {
    return {
      height: kind === "label-area" ? 58 : 24,
      width: kind === "label-area" ? 128 : 68,
    };
  }

  return {
    height: Math.max(52, Math.round(defaultSize.height * 0.56)),
    width: Math.max(96, Math.round(defaultSize.width * 0.56)),
  };
}

export function contextBoardCustomKindIsShape(kind: ContextBoardCustomKind) {
  return contextBoardBasicShapeKinds.includes(kind);
}

export function contextBoardCustomKindIsLabel(kind: ContextBoardCustomKind) {
  return contextBoardLabelKinds.includes(kind);
}

export function contextBoardCustomKindHasDetail(
  kind: ContextBoardCustomKind,
  diagramType?: ContextBoardDiagramType,
) {
  if (contextBoardCustomKindIsLabel(kind)) {
    return kind === "label-area";
  }

  if (
    diagramType === "sequence" &&
    (kind === "actor" ||
      kind === "lifeline" ||
      kind === "sequence-activation" ||
      kind === "sequence-fragment" ||
      kind === "sequence-message" ||
      kind === "sequence-return")
  ) {
    return false;
  }

  if (kind === "c4-relationship" || kind === "c4-system-boundary") {
    return false;
  }

  return kind !== "text" && !contextBoardCustomKindIsShape(kind);
}

export function contextBoardCustomKindAutoSizesText(
  kind: ContextBoardCustomKind,
  diagramType?: ContextBoardDiagramType,
) {
  return contextBoardCustomKindHasDetail(kind, diagramType);
}

export function contextBoardCustomKindHasKicker(
  kind: ContextBoardCustomKind,
  diagramType?: ContextBoardDiagramType,
) {
  if (contextBoardCustomKindIsLabel(kind)) {
    return false;
  }

  if (
    diagramType === "sequence" &&
    (kind === "actor" ||
      kind === "lifeline" ||
      kind === "sequence-activation" ||
      kind === "sequence-fragment" ||
      kind === "sequence-message" ||
      kind === "sequence-return")
  ) {
    return false;
  }

  if (kind === "c4-relationship") {
    return false;
  }

  return kind !== "text" && !contextBoardCustomKindIsShape(kind);
}

export function contextBoardCustomKindHasPorts(kind: ContextBoardCustomKind) {
  if (contextBoardCustomKindIsLabel(kind)) {
    return false;
  }

  return ![
    "c4-relationship",
    "c4-system-boundary",
    "sequence-activation",
    "sequence-fragment",
    "sequence-message",
    "sequence-return",
    "text",
  ].includes(kind);
}

export function contextBoardItemsCenteredAt(
  items: ContextBoardCustomItem[],
  center: ContextBoardPosition,
): ContextBoardCustomItem[] {
  if (items.length === 0) {
    return items;
  }

  const bounds = contextBoardItemsBounds(items);
  const currentCenterX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
  const currentCenterY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const desiredMinX = Math.max(
    16,
    Math.min(CONTEXT_BOARD_WIDTH - width - 16, center.x - width / 2),
  );
  const desiredMinY = Math.max(
    16,
    Math.min(CONTEXT_BOARD_HEIGHT - height - 16, center.y - height / 2),
  );
  const deltaX = desiredMinX + width / 2 - currentCenterX;
  const deltaY = desiredMinY + height / 2 - currentCenterY;

  return items.map((item) => ({
    ...item,
    x: item.x + deltaX,
    y: item.y + deltaY,
  }));
}

export function contextBoardItemsBounds(items: ContextBoardCustomItem[]) {
  return items.reduce(
    (accumulator, item) => {
      const size = contextBoardCustomItemResolvedSize(item);
      return {
        maxX: Math.max(accumulator.maxX, item.x + size.width),
        maxY: Math.max(accumulator.maxY, item.y + size.height),
        minX: Math.min(accumulator.minX, item.x),
        minY: Math.min(accumulator.minY, item.y),
      };
    },
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
}

export function contextBoardStyleTargetSurface(
  target: ContextBoardStyleTarget | null,
  customItems: ContextBoardCustomItem[],
  templateTrays: ContextBoardTemplateTray[],
): (ContextBoardPosition & {
  height: number;
  label: string;
  tone: ContextBoardTone;
  width: number;
}) | null {
  if (!target) {
    return null;
  }

  if (target.itemType === "template") {
    const tray = templateTrays.find((templateTray) => templateTray.id === target.id);

    if (!tray) {
      return null;
    }

    return {
      height: tray.height,
      label: tray.label,
      tone: tray.tone ?? "default",
      width: tray.width,
      x: tray.x,
      y: tray.y,
    };
  }

  const item = customItems.find((customItem) => customItem.id === target.id);

  if (!item) {
    return null;
  }

  const size = contextBoardCustomItemResolvedSize(item);
  return {
    height: size.height,
    label: item.label,
    tone: item.tone ?? "default",
    width: size.width,
    x: item.x,
    y: item.y,
  };
}

export function contextBoardStylePalettePosition(
  surface: ContextBoardPosition & { height: number; width: number },
  canvas: HTMLDivElement | null,
  zoom: number,
): ContextBoardPosition {
  const paletteWidth = 162;
  const paletteHeight = 32;
  const paletteGap = 6;
  const visibleMinX = canvas ? canvas.scrollLeft / zoom + 12 : 16;
  const visibleMaxX = canvas
    ? (canvas.scrollLeft + canvas.clientWidth) / zoom - 12
    : CONTEXT_BOARD_WIDTH - 16;
  const visibleMinY = canvas ? canvas.scrollTop / zoom + 12 : 16;
  const visibleMaxY = canvas
    ? (canvas.scrollTop + canvas.clientHeight) / zoom - 12
    : CONTEXT_BOARD_HEIGHT - 16;
  const x = Math.max(
    visibleMinX,
    Math.min(
      visibleMaxX - paletteWidth,
      surface.x + surface.width - paletteWidth,
    ),
  );
  const preferredY = surface.y - paletteHeight - paletteGap;
  const y =
    preferredY > visibleMinY
      ? preferredY
      : Math.min(
          visibleMaxY - paletteHeight,
          surface.y + surface.height + paletteGap,
        );

  return {
    x: Math.max(16, Math.min(CONTEXT_BOARD_WIDTH - paletteWidth - 16, x)),
    y: Math.max(16, Math.min(CONTEXT_BOARD_HEIGHT - paletteHeight - 16, y)),
  };
}

export function contextBoardDiagramArrangePosition(
  type: ContextBoardDiagramType,
  index: number,
  count: number,
  existingItemCount = 0,
): ContextBoardPosition {
  const safeCount = Math.max(count, 1);
  const centerX = CONTEXT_BOARD_WIDTH / 2;
  const centerY = CONTEXT_BOARD_HEIGHT / 2;
  const batchOffset = Math.min(Math.floor(existingItemCount / 4), 3) * 170;

  switch (type) {
    case "c4": {
      const c4Positions: ContextBoardPosition[] = [
        { x: centerX - 190, y: centerY - 255 + batchOffset },
        { x: centerX - 560, y: centerY - 85 + batchOffset },
        { x: centerX - 115, y: centerY - 155 + batchOffset },
        { x: centerX - 125, y: centerY + 105 + batchOffset },
        { x: centerX + 275, y: centerY + 105 + batchOffset },
        { x: centerX - 88, y: centerY + 318 + batchOffset },
        { x: centerX + 620, y: centerY - 105 + batchOffset },
      ];

      return c4Positions[index] ?? {
        x: centerX - 470 + (index % 3) * 320,
        y: centerY + 420 + Math.floor(index / 3) * 160 + batchOffset,
      };
    }
    case "dependency": {
      const dependencyPositions: ContextBoardPosition[] = [
        { x: centerX - 100, y: centerY - 70 + batchOffset },
        { x: centerX + 250, y: centerY - 265 + batchOffset },
        { x: centerX - 430, y: centerY + 150 + batchOffset },
        { x: centerX + 250, y: centerY + 145 + batchOffset },
        { x: centerX - 100, y: centerY + 330 + batchOffset },
      ];

      return dependencyPositions[index] ?? {
        x: centerX - 480 + (index % 3) * 360,
        y: centerY + 520 + Math.floor(index / 3) * 170 + batchOffset,
      };
    }
    case "mindmap": {
      const mindmapPositions: ContextBoardPosition[] = [
        { x: centerX - 140, y: centerY - 58 + batchOffset },
        { x: centerX - 610, y: centerY - 320 + batchOffset },
        { x: centerX + 300, y: centerY - 340 + batchOffset },
        { x: centerX + 360, y: centerY - 58 + batchOffset },
        { x: centerX + 280, y: centerY + 260 + batchOffset },
        { x: centerX - 610, y: centerY + 220 + batchOffset },
        { x: centerX - 120, y: centerY + 470 + batchOffset },
        { x: centerX - 980, y: centerY - 410 + batchOffset },
        { x: centerX - 980, y: centerY - 245 + batchOffset },
        { x: centerX + 705, y: centerY - 430 + batchOffset },
        { x: centerX + 725, y: centerY - 260 + batchOffset },
        { x: centerX + 765, y: centerY - 120 + batchOffset },
        { x: centerX + 790, y: centerY + 45 + batchOffset },
        { x: centerX + 675, y: centerY + 235 + batchOffset },
        { x: centerX + 675, y: centerY + 400 + batchOffset },
        { x: centerX - 980, y: centerY + 120 + batchOffset },
        { x: centerX - 980, y: centerY + 295 + batchOffset },
        { x: centerX + 255, y: centerY + 540 + batchOffset },
        { x: centerX - 930, y: centerY + 520 + batchOffset },
      ];

      return mindmapPositions[index] ?? {
        x: centerX - 760 + (index % 4) * 360,
        y: centerY + 690 + Math.floor(index / 4) * 150 + batchOffset,
      };
    }
    case "sequence":
      {
        const sequenceCenterX = centerX + 240;
        const participantY = centerY - 245 + batchOffset;
        const actorX = sequenceCenterX - 500;
        const consoleX = sequenceCenterX - 220;
        const advisorX = sequenceCenterX + 60;
        const oosX = sequenceCenterX + 340;
        const actorCenterX = actorX + 75;
        const consoleCenterX = consoleX + 80;
        const advisorCenterX = advisorX + 80;
        const oosCenterX = oosX + 80;
        const sequencePositions: ContextBoardPosition[] = [
          { x: actorCenterX - 40, y: participantY + 160 },
          { x: actorX, y: participantY },
          { x: consoleX, y: participantY },
          { x: advisorX, y: participantY },
          { x: oosX, y: participantY },
          { x: consoleCenterX - 11, y: participantY + 210 },
          { x: advisorCenterX - 11, y: participantY + 295 },
          { x: oosCenterX - 11, y: participantY + 380 },
          { x: actorCenterX, y: participantY + 180 },
          { x: consoleCenterX, y: participantY + 265 },
          { x: advisorCenterX, y: participantY + 350 },
          { x: advisorCenterX, y: participantY + 445 },
          { x: consoleCenterX, y: participantY + 540 },
        ];

        return sequencePositions[index] ?? {
          x: centerX - (safeCount - 1) * 155 + index * 310,
          y: centerY + 230 + (index - sequencePositions.length + 1) * 80 + batchOffset,
        };
      }
    case "swimlane":
      {
        const laneX = centerX - 610;
        const laneTop = centerY - 345 + batchOffset;
        const laneGap = 154;
        const lanePositions: ContextBoardPosition[] = [
          { x: laneX, y: laneTop },
          { x: laneX, y: laneTop + laneGap },
          { x: laneX, y: laneTop + laneGap * 2 },
          { x: laneX, y: laneTop + laneGap * 3 },
          { x: laneX + 170, y: laneTop + 48 },
          { x: laneX + 325, y: laneTop + laneGap + 48 },
          { x: laneX + 500, y: laneTop + laneGap * 2 + 48 },
          { x: laneX + 675, y: laneTop + laneGap * 3 + 48 },
          { x: laneX + 675, y: laneTop + laneGap + 48 },
          { x: laneX + 850, y: laneTop + 48 },
        ];

        return lanePositions[index] ?? {
          x: laneX + 170 + ((index - lanePositions.length) % 4) * 185,
          y:
            laneTop +
            laneGap * 3 +
            170 +
            Math.floor((index - lanePositions.length) / 4) * 110,
        };
      }
    case "uml": {
      const umlPositions: ContextBoardPosition[] = [
        { x: centerX - 126, y: centerY - 360 + batchOffset },
        { x: centerX - 470, y: centerY - 86 + batchOffset },
        { x: centerX - 40, y: centerY - 86 + batchOffset },
        { x: centerX - 40, y: centerY + 178 + batchOffset },
        { x: centerX - 470, y: centerY + 455 + batchOffset },
        { x: centerX + 250, y: centerY + 455 + batchOffset },
      ];

      return umlPositions[index] ?? {
        x: centerX - 480 + (index % 3) * 360,
        y: centerY + 560 + Math.floor(index / 3) * 190 + batchOffset,
      };
    }
    case "freeform":
      return {
        x: centerX - 380 + (index % 3) * 330,
        y: centerY - 180 + Math.floor(index / 3) * 190 + batchOffset,
      };
    case "flowchart": {
      const flowchartPositions: ContextBoardPosition[] = [
        { x: centerX - 80, y: centerY - 430 + batchOffset },
        { x: centerX - 112, y: centerY - 300 + batchOffset },
        { x: centerX - 82, y: centerY - 130 + batchOffset },
        { x: centerX + 390, y: centerY - 130 + batchOffset },
        { x: centerX - 112, y: centerY + 150 + batchOffset },
        { x: centerX - 80, y: centerY + 320 + batchOffset },
        { x: centerX + 390, y: centerY + 150 + batchOffset },
        { x: centerX + 210, y: centerY - 112 + batchOffset },
        { x: centerX - 32, y: centerY + 46 + batchOffset },
      ];

      return flowchartPositions[index] ?? {
        x: centerX - 140,
        y: centerY + 285 + (index - flowchartPositions.length + 1) * 150 + batchOffset,
      };
    }
    default:
      return {
        x: centerX - (safeCount - 1) * 155 + index * 310,
        y: centerY - 120 + batchOffset,
      };
  }
}
