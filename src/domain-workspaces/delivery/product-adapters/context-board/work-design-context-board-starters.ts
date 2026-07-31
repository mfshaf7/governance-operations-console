import {
  contextBoardCustomKindCopy as workDesignBoardCustomKindCopy,
  contextBoardDiagramArrangePosition as workDesignDiagramArrangePosition,
  contextBoardDiagramCopy as workDesignDiagramCopy,
  contextBoardDiagramStarterItemSize as workDesignDiagramStarterItemSize,
  contextBoardDiagramStarterTone as workDesignDiagramStarterTone,
  contextBoardUmlRelationshipCopy as workDesignBoardUmlRelationshipCopy,
} from "../../../../product-apps/context-board/index.ts";
import type {
  WorkDesignBoardConnection,
  WorkDesignBoardConnectorShape,
  WorkDesignBoardConnectorStroke,
  WorkDesignBoardConnectorTone,
  WorkDesignBoardCustomItem,
  WorkDesignBoardCustomKind,
  WorkDesignBoardPortSide,
  WorkDesignBoardUmlRelationship,
  WorkDesignDiagramType,
} from "../../work-model/work-design/work-design-types.ts";

export function workDesignDiagramStarterItems(
  type: WorkDesignDiagramType,
  timestamp: number,
  existingItemCount = 0,
): WorkDesignBoardCustomItem[] {
  const starterKindsByType: Record<
    WorkDesignDiagramType,
    WorkDesignBoardCustomKind[]
  > = {
    c4: [
      "c4-system-boundary",
      "c4-person",
      "c4-software-system",
      "c4-container",
      "c4-container",
      "c4-component",
      "c4-external-system",
    ],
    dependency: ["component", "component", "component", "note", "process"],
    flowchart: [
      "start",
      "process",
      "decision",
      "process",
      "process",
      "end",
      "end",
      "text",
      "text",
    ],
    freeform: ["note", "diagram", "process"],
    mindmap: [
      "topic",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "branch",
      "note",
    ],
    sequence: [
      "sequence-fragment",
      "actor",
      "lifeline",
      "lifeline",
      "lifeline",
      "sequence-activation",
      "sequence-activation",
      "sequence-activation",
      "sequence-message",
      "sequence-message",
      "sequence-message",
      "sequence-return",
      "sequence-return",
    ],
    swimlane: [
      "lane",
      "lane",
      "lane",
      "lane",
      "process",
      "process",
      "process",
      "process",
      "process",
      "process",
    ],
    uml: [
      "uml-interface",
      "uml-class",
      "uml-class",
      "uml-class",
      "uml-class",
      "uml-class",
    ],
  };
  const starterLabelsByType: Record<WorkDesignDiagramType, string[]> = {
    c4: [
      "Delivery Work Design Boundary",
      "Operator",
      "Governance Operations Console",
      "Work Design Workspace",
      "OOS Workflow Adapter",
      "Canvas + Draft Builder",
      "OpenProject ART",
    ],
    dependency: [
      "Selected Package",
      "Required Upstream",
      "Downstream Package",
      "Risk / Blocker",
      "Sequencing Decision",
    ],
    flowchart: [
      "Start",
      "Inspect Context",
      "Duplicate?",
      "Attach / Retire",
      "Build Draft Tree",
      "Draft Ready",
      "Source Closed",
      "YES",
      "NO",
    ],
    freeform: ["Open Question", "Sketch Card", "Next Move"],
    mindmap: [
      "Delivery Idea",
      "Scope",
      "Operator Outcome",
      "ART Shape",
      "Dependencies",
      "Risks",
      "Decision Path",
      "In Scope",
      "Out Of Scope",
      "User Need",
      "Review Cue",
      "Epic Boundary",
      "Feature Ideas",
      "Required Upstream",
      "Duplicate Check",
      "Risk Trigger",
      "Mitigation",
      "Proceed / Attach / Retire",
      "Parking Lot",
    ],
    sequence: [
      "alt: duplicate or new tree",
      "Operator",
      "Console",
      "Advisor",
      "OOS",
      "Console Active",
      "Advisor Active",
      "OOS Active",
      "Ask For Context",
      "Inspect ART",
      "Fetch Evidence",
      "Bounded Context",
      "Suggest Draft Shape",
    ],
    swimlane: [
      "Operator",
      "AI Advisor",
      "OOS",
      "ART / OpenProject",
      "Request Context",
      "Inspect Signals",
      "Fetch Context",
      "Return Evidence",
      "Recommend Path",
      "Approve Direction",
    ],
    uml: [
      "IPlanningProvider",
      "WorkDesignSession",
      "DraftTree",
      "DraftNode",
      "FeatureNode",
      "UserStoryNode",
    ],
  };
  const diagramCopy = workDesignDiagramCopy(type);
  const kinds = starterKindsByType[type];

  return kinds.map((kind, index) => {
    const copy = workDesignBoardCustomKindCopy(kind);

    return {
      diagramType: type,
      detail:
        type === "flowchart"
          ? workDesignFlowchartStarterDetail(index)
          : type === "c4"
            ? workDesignC4StarterDetail(index)
            : type === "uml"
              ? workDesignUmlStarterDetail(index)
              : type === "sequence"
                ? workDesignSequenceStarterDetail(index)
                : type === "dependency"
                  ? workDesignDependencyStarterDetail(index)
                  : type === "mindmap"
                    ? workDesignMindmapStarterDetail(index)
                    : type === "swimlane"
                      ? workDesignSwimlaneStarterDetail(index)
                      : index === 0
                        ? `${diagramCopy.label} starter entry. Edit or replace this card.`
                        : copy.detail,
      id: `${type}-${timestamp}-${index}`,
      kind,
      label: starterLabelsByType[type][index] ?? `${copy.label} ${index + 1}`,
      tone: workDesignDiagramStarterTone(type, index),
      ...workDesignDiagramStarterItemSize(type, index),
      ...workDesignDiagramArrangePosition(
        type,
        index,
        kinds.length,
        existingItemCount,
      ),
    };
  });
}

export function workDesignFlowchartStarterDetail(index: number) {
  const details = [
    "Accepted source",
    "Inspect ART context",
    "Already represented?",
    "Attach or retire",
    "Create draft tree",
    "Tree ready",
    "No new tree",
    "",
    "",
  ];

  return details[index] ?? "Flowchart step. Edit or replace this card.";
}

export function workDesignC4StarterDetail(index: number) {
  const details = [
    "System context and container boundary for the selected delivery work.",
    "Reviews advisor output and approves draft moves.",
    "Operator-facing cockpit for context discussion and draft shaping.",
    "Visual canvas, bounded inputs, and templates.",
    "Routes approved work-design intent to governed adapters.",
    "Interactive diagram and draft-tree editing surface.",
    "Delivery ART source of truth for packages and child work items.",
  ];

  return details[index] ?? "C4 element. Edit or replace this card.";
}

export function workDesignUmlStarterDetail(index: number) {
  const details = [
    "+ buildPlan(context): DraftTree",
    "- sessionId: string\n+ attachContext()",
    "- root: DraftNode\n+ addFeature()",
    "- type: NodeKind\n+ addChild()",
    "- featureId: string\n+ addStory()",
    "- acceptanceCriteria: string\n+ attachMetadata()",
  ];

  return details[index] ?? "UML element. Edit or replace this card.";
}

export function workDesignSequenceStarterDetail(index: number) {
  const details = [
    "Alternate path frame for duplicate handling or new-tree creation.",
    "Human operator starts the interaction.",
    "Console work-design surface receives the request.",
    "Tool-enabled advisor inspects context.",
    "OOS supplies bounded delivery and ART context.",
    "",
    "",
    "",
    "Operator asks the console to inspect package context.",
    "Console invokes the advisor with bounded inputs.",
    "Advisor requests OOS evidence and ART context.",
    "OOS returns bounded context to the advisor.",
    "Advisor returns the recommended draft direction.",
  ];

  return details[index] ?? "Sequence element. Edit or replace this card.";
}

export function workDesignDependencyStarterDetail(index: number) {
  const details = [
    "Current package being shaped. Keep this as the anchor for dependency inspection.",
    "Package, service, repo, or ART work required before this package can move cleanly.",
    "Work that depends on the selected package and may be impacted by sequencing changes.",
    "Dependency risk, blocker, ownership gap, or evidence that can change the move decision.",
    "Record whether to sequence, reuse, defer, or clear the dependency before refinement.",
  ];

  return details[index] ?? "Dependency map item. Edit or replace this card.";
}

export function workDesignMindmapStarterDetail(index: number) {
  const details = [
    "Central idea being shaped into a work-design direction.",
    "What belongs in this work package and what must stay out.",
    "The operator-visible result this work should create.",
    "How the idea should become an Epic, Feature, User story, or Risk tree.",
    "Existing work, upstream packages, repos, or teams this idea depends on.",
    "Known uncertainty, blocked paths, and concerns the advisor should inspect.",
    "The first operator decision after context inspection.",
    "Candidate scope to include in the draft tree.",
    "Explicit exclusions that prevent scope drift.",
    "Primary user or operator need behind the idea.",
    "What the operator must be able to inspect before approving.",
    "Draft Epic boundary and ownership shape.",
    "Candidate Feature groupings or story clusters.",
    "Required upstream work or source-of-truth context.",
    "Existing ART work that may already cover this idea.",
    "Signal that may force defer, block, or retire.",
    "Potential mitigation, owner, or next evidence to request.",
    "Proceed with new tree, link to existing work, or retire duplicate scope.",
    "Loose ideas that should not become scope until deliberately pulled in.",
  ];

  return details[index] ?? "Mindmap item. Edit or replace this card.";
}

export function workDesignSwimlaneStarterDetail(index: number) {
  const details = [
    "Human owner for context request, decision, and final approval.",
    "Tool-enabled reasoning lane for context inspection and recommendation.",
    "Workflow and adapter lane for bounded reads, receipts, and apply intent.",
    "External source-of-truth lane for ART package and evidence state.",
    "Ask for duplicate, dependency, and package-boundary context.",
    "Inspect bounded signals and decide which evidence is needed.",
    "Request bounded package, child, and relation context.",
    "Return current ART evidence without mutating the source of truth.",
    "Propose proceed, attach, retire, or defer direction.",
    "Accept the path before work design creates or changes the draft tree.",
  ];

  return details[index] ?? "Swimlane handoff item. Edit or replace this card.";
}

export function workDesignDiagramStarterConnections(
  type: WorkDesignDiagramType,
  items: WorkDesignBoardCustomItem[],
  timestamp: number,
): WorkDesignBoardConnection[] {
  if (items.length < 2) {
    return [];
  }

  if (type === "sequence") {
    return [];
  }

  if (type === "freeform") {
    return [];
  }

  if (type === "mindmap") {
    const mindmapConnections: Array<{
      fromIndex: number;
      fromSide: WorkDesignBoardPortSide;
      label: string;
      toIndex: number;
      tone: WorkDesignBoardConnectorTone;
      toSide: WorkDesignBoardPortSide;
    }> = [
      {
        fromIndex: 0,
        fromSide: "left",
        label: "scope",
        toIndex: 1,
        tone: "green",
        toSide: "right",
      },
      {
        fromIndex: 0,
        fromSide: "right",
        label: "outcome",
        toIndex: 2,
        tone: "blue",
        toSide: "left",
      },
      {
        fromIndex: 0,
        fromSide: "right",
        label: "tree",
        toIndex: 3,
        tone: "purple",
        toSide: "left",
      },
      {
        fromIndex: 0,
        fromSide: "right",
        label: "depends",
        toIndex: 4,
        tone: "amber",
        toSide: "left",
      },
      {
        fromIndex: 0,
        fromSide: "left",
        label: "risk",
        toIndex: 5,
        tone: "red",
        toSide: "right",
      },
      {
        fromIndex: 0,
        fromSide: "bottom",
        label: "decision",
        toIndex: 6,
        tone: "amber",
        toSide: "top",
      },
      {
        fromIndex: 1,
        fromSide: "left",
        label: "include",
        toIndex: 7,
        tone: "green",
        toSide: "right",
      },
      {
        fromIndex: 1,
        fromSide: "left",
        label: "exclude",
        toIndex: 8,
        tone: "neutral",
        toSide: "right",
      },
      {
        fromIndex: 2,
        fromSide: "right",
        label: "need",
        toIndex: 9,
        tone: "blue",
        toSide: "left",
      },
      {
        fromIndex: 2,
        fromSide: "right",
        label: "cue",
        toIndex: 10,
        tone: "blue",
        toSide: "left",
      },
      {
        fromIndex: 3,
        fromSide: "right",
        label: "boundary",
        toIndex: 11,
        tone: "purple",
        toSide: "left",
      },
      {
        fromIndex: 3,
        fromSide: "right",
        label: "features",
        toIndex: 12,
        tone: "purple",
        toSide: "left",
      },
      {
        fromIndex: 4,
        fromSide: "right",
        label: "requires",
        toIndex: 13,
        tone: "amber",
        toSide: "left",
      },
      {
        fromIndex: 4,
        fromSide: "right",
        label: "overlap",
        toIndex: 14,
        tone: "amber",
        toSide: "left",
      },
      {
        fromIndex: 5,
        fromSide: "left",
        label: "trigger",
        toIndex: 15,
        tone: "red",
        toSide: "right",
      },
      {
        fromIndex: 5,
        fromSide: "left",
        label: "mitigate",
        toIndex: 16,
        tone: "green",
        toSide: "right",
      },
      {
        fromIndex: 6,
        fromSide: "right",
        label: "choose",
        toIndex: 17,
        tone: "amber",
        toSide: "left",
      },
    ];

    return mindmapConnections
      .filter(({ fromIndex, toIndex }) => items[fromIndex] && items[toIndex])
      .map(({ fromIndex, fromSide, label, toIndex, tone, toSide }, index) => ({
        from: {
          itemId: items[fromIndex].id,
          itemType: "custom",
          side: fromSide,
        },
        id: `${type}-${timestamp}-connection-${index}`,
        label,
        shape: "curve" as const,
        stroke: "solid" as const,
        to: {
          itemId: items[toIndex].id,
          itemType: "custom",
          side: toSide,
        },
        tone,
        tip: "plain" as const,
      }));
  }

  if (type === "dependency") {
    const dependencyConnections: Array<{
      fromIndex: number;
      fromSide: WorkDesignBoardPortSide;
      label: string;
      shape: WorkDesignBoardConnectorShape;
      stroke: WorkDesignBoardConnectorStroke;
      toIndex: number;
      tone: WorkDesignBoardConnectorTone;
      toSide: WorkDesignBoardPortSide;
    }> = [
      {
        fromIndex: 0,
        fromSide: "right",
        label: "requires",
        shape: "curve",
        stroke: "dashed",
        toIndex: 1,
        tone: "amber",
        toSide: "left",
      },
      {
        fromIndex: 2,
        fromSide: "right",
        label: "depends on",
        shape: "curve",
        stroke: "dashed",
        toIndex: 0,
        tone: "blue",
        toSide: "left",
      },
      {
        fromIndex: 3,
        fromSide: "left",
        label: "blocks",
        shape: "curve",
        stroke: "dashed",
        toIndex: 0,
        tone: "red",
        toSide: "right",
      },
      {
        fromIndex: 0,
        fromSide: "bottom",
        label: "sets order",
        shape: "straight",
        stroke: "solid",
        toIndex: 4,
        tone: "amber",
        toSide: "top",
      },
    ];

    return dependencyConnections
      .filter(({ fromIndex, toIndex }) => items[fromIndex] && items[toIndex])
      .map(
        (
          { fromIndex, fromSide, label, shape, stroke, toIndex, tone, toSide },
          index,
        ) => ({
          from: {
            itemId: items[fromIndex].id,
            itemType: "custom",
            side: fromSide,
          },
          id: `${type}-${timestamp}-connection-${index}`,
          label,
          shape,
          stroke,
          to: {
            itemId: items[toIndex].id,
            itemType: "custom",
            side: toSide,
          },
          tone,
          tip: "arrow",
        }),
      );
  }

  if (type === "swimlane") {
    const swimlaneConnections: Array<{
      fromIndex: number;
      fromSide: WorkDesignBoardPortSide;
      label: string;
      toIndex: number;
      tone: WorkDesignBoardConnectorTone;
      toSide: WorkDesignBoardPortSide;
    }> = [
      {
        fromIndex: 4,
        fromSide: "right",
        label: "request",
        toIndex: 5,
        tone: "amber",
        toSide: "left",
      },
      {
        fromIndex: 5,
        fromSide: "right",
        label: "needs context",
        toIndex: 6,
        tone: "blue",
        toSide: "left",
      },
      {
        fromIndex: 6,
        fromSide: "right",
        label: "read",
        toIndex: 7,
        tone: "blue",
        toSide: "left",
      },
      {
        fromIndex: 7,
        fromSide: "top",
        label: "evidence",
        toIndex: 8,
        tone: "green",
        toSide: "bottom",
      },
      {
        fromIndex: 8,
        fromSide: "right",
        label: "recommend",
        toIndex: 9,
        tone: "amber",
        toSide: "left",
      },
    ];

    return swimlaneConnections
      .filter(({ fromIndex, toIndex }) => items[fromIndex] && items[toIndex])
      .map(({ fromIndex, fromSide, label, toIndex, tone, toSide }, index) => ({
        from: {
          itemId: items[fromIndex].id,
          itemType: "custom",
          side: fromSide,
        },
        id: `${type}-${timestamp}-connection-${index}`,
        label,
        shape: "straight",
        stroke: "solid",
        to: {
          itemId: items[toIndex].id,
          itemType: "custom",
          side: toSide,
        },
        tone,
        tip: "arrow",
      }));
  }

  if (type === "flowchart") {
    const flowConnections: Array<{
      fromIndex: number;
      fromSide: WorkDesignBoardPortSide;
      toIndex: number;
      toSide: WorkDesignBoardPortSide;
    }> = [
      { fromIndex: 0, fromSide: "bottom", toIndex: 1, toSide: "top" },
      { fromIndex: 1, fromSide: "bottom", toIndex: 2, toSide: "top" },
      { fromIndex: 2, fromSide: "right", toIndex: 3, toSide: "left" },
      { fromIndex: 3, fromSide: "bottom", toIndex: 6, toSide: "top" },
      { fromIndex: 2, fromSide: "bottom", toIndex: 4, toSide: "top" },
      { fromIndex: 4, fromSide: "bottom", toIndex: 5, toSide: "top" },
    ];

    return flowConnections
      .filter(({ fromIndex, toIndex }) => items[fromIndex] && items[toIndex])
      .map(({ fromIndex, fromSide, toIndex, toSide }, index) => ({
        from: {
          itemId: items[fromIndex].id,
          itemType: "custom",
          side: fromSide,
        },
        id: `${type}-${timestamp}-connection-${index}`,
        shape: "straight",
        to: {
          itemId: items[toIndex].id,
          itemType: "custom",
          side: toSide,
        },
        tip: "arrow",
      }));
  }

  if (type === "c4") {
    const c4Connections: Array<{
      fromIndex: number;
      fromSide: WorkDesignBoardPortSide;
      label: string;
      toIndex: number;
      toSide: WorkDesignBoardPortSide;
    }> = [
      {
        fromIndex: 1,
        fromSide: "right",
        label: "uses",
        toIndex: 2,
        toSide: "left",
      },
      {
        fromIndex: 2,
        fromSide: "bottom",
        label: "hosts workspace",
        toIndex: 3,
        toSide: "top",
      },
      {
        fromIndex: 3,
        fromSide: "right",
        label: "submits intent",
        toIndex: 4,
        toSide: "left",
      },
      {
        fromIndex: 3,
        fromSide: "bottom",
        label: "renders + edits",
        toIndex: 5,
        toSide: "top",
      },
      {
        fromIndex: 4,
        fromSide: "right",
        label: "reads/writes ART",
        toIndex: 6,
        toSide: "left",
      },
      {
        fromIndex: 2,
        fromSide: "right",
        label: "inspects context",
        toIndex: 6,
        toSide: "top",
      },
    ];

    return c4Connections
      .filter(({ fromIndex, toIndex }) => items[fromIndex] && items[toIndex])
      .map(({ fromIndex, fromSide, label, toIndex, toSide }, index) => ({
        from: {
          itemId: items[fromIndex].id,
          itemType: "custom",
          side: fromSide,
        },
        id: `${type}-${timestamp}-connection-${index}`,
        label,
        shape: "straight" as const,
        stroke: "solid" as const,
        to: {
          itemId: items[toIndex].id,
          itemType: "custom",
          side: toSide,
        },
        tone: "amber" as const,
        tip: "arrow" as const,
      }));
  }

  if (type === "uml") {
    const umlConnections: Array<{
      fromIndex: number;
      fromSide: WorkDesignBoardPortSide;
      label: string;
      relationship: WorkDesignBoardUmlRelationship;
      toIndex: number;
      toSide: WorkDesignBoardPortSide;
    }> = [
      {
        fromIndex: 1,
        fromSide: "top",
        label: "implements",
        relationship: "realization",
        toIndex: 0,
        toSide: "bottom",
      },
      {
        fromIndex: 1,
        fromSide: "right",
        label: "builds",
        relationship: "directed-association",
        toIndex: 2,
        toSide: "left",
      },
      {
        fromIndex: 2,
        fromSide: "bottom",
        label: "owns",
        relationship: "composition",
        toIndex: 3,
        toSide: "top",
      },
      {
        fromIndex: 4,
        fromSide: "top",
        label: "extends",
        relationship: "generalization",
        toIndex: 3,
        toSide: "left",
      },
      {
        fromIndex: 5,
        fromSide: "top",
        label: "extends",
        relationship: "generalization",
        toIndex: 3,
        toSide: "right",
      },
    ];

    return umlConnections
      .filter(({ fromIndex, toIndex }) => items[fromIndex] && items[toIndex])
      .map(
        (
          { fromIndex, fromSide, label, relationship, toIndex, toSide },
          index,
        ) => {
          const copy = workDesignBoardUmlRelationshipCopy(relationship);

          return {
            from: {
              itemId: items[fromIndex].id,
              itemType: "custom",
              side: fromSide,
            },
            id: `${type}-${timestamp}-connection-${index}`,
            label,
            shape: "straight",
            startTip: copy.startTip,
            stroke: copy.stroke,
            to: {
              itemId: items[toIndex].id,
              itemType: "custom",
              side: toSide,
            },
            tone: copy.tone,
            tip: copy.endTip,
          };
        },
      );
  }

  return items.slice(0, -1).map((item, index) => ({
    from: { itemId: item.id, itemType: "custom", side: "right" },
    id: `${type}-${timestamp}-connection-${index}`,
    shape: "curve",
    to: { itemId: items[index + 1].id, itemType: "custom", side: "left" },
    tip: type === "freeform" ? "plain" : "arrow",
  }));
}
