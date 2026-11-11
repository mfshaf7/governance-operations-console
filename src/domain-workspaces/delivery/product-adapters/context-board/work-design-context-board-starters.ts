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
      "System under design",
      "User / operator",
      "Target system",
      "User interface",
      "Application service",
      "Domain component",
      "External system",
    ],
    dependency: [
      "Target component",
      "Required service",
      "Dependent component",
      "Dependency failure",
      "Fallback / recovery",
    ],
    flowchart: [
      "Request received",
      "Read input",
      "Allowed?",
      "Perform operation",
      "Handle rejection",
      "Request rejected",
      "Response returned",
      "YES",
      "NO",
    ],
    freeform: ["Open question", "System sketch", "Design decision"],
    mindmap: [
      "System under design",
      "Scope",
      "User outcome",
      "Responsibilities",
      "Interfaces",
      "Risks",
      "System decisions",
      "In Scope",
      "Out Of Scope",
      "User Need",
      "Observable behavior",
      "Component boundary",
      "Data ownership",
      "External dependency",
      "Input / output",
      "Failure condition",
      "Recovery",
      "Chosen approach",
      "Open questions",
    ],
    sequence: [
      "alt: accepted or rejected request",
      "User / operator",
      "Interface",
      "Application service",
      "Data / external system",
      "Interface active",
      "Service active",
      "Dependency active",
      "Submit request",
      "Validate / dispatch",
      "Read / write data",
      "Return result",
      "Show response",
    ],
    swimlane: [
      "User / operator",
      "Interface",
      "Application service",
      "Data / external system",
      "Submit request",
      "Validate input",
      "Process request",
      "Read / write data",
      "Return result",
      "Show response",
    ],
    uml: [
      "IService",
      "ApplicationService",
      "DomainModel",
      "DomainEntity",
      "SpecializedEntity",
      "ValueObject",
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
    "Identify the event that starts this system behavior.",
    "Describe the input and its source.",
    "Describe the actual permission or business rule.",
    "Describe the permitted operation and its effects.",
    "Describe the rejected operation without applying its effects.",
    "Show the failure response or recovery path.",
    "Show the successful response and observed state.",
    "",
    "",
  ];

  return details[index] ?? "Flowchart step. Edit or replace this card.";
}

export function workDesignC4StarterDetail(index: number) {
  const details = [
    "Placeholder boundary for the system being designed; replace or remove examples to fit its actual scope.",
    "Identify who uses the target system and what they need.",
    "Name the system and distinguish existing behavior from proposed changes.",
    "Describe the relevant user-facing interface, if this system has one.",
    "Describe the service responsibility and actual authorization boundary, if applicable.",
    "Describe a domain responsibility inside the target system.",
    "Name an actual external dependency, or remove this example.",
  ];

  return details[index] ?? "C4 element. Edit or replace this card.";
}

export function workDesignUmlStarterDetail(index: number) {
  const details = [
    "+ execute(input): Result",
    "- service: IService\n+ handleRequest()",
    "- state: DomainEntity\n+ applyRule()",
    "- id: string\n+ updateState()",
    "- variant: string\n+ specializeBehavior()",
    "- value: string\n+ validate()",
  ];

  return details[index] ?? "UML element. Edit or replace this card.";
}

export function workDesignSequenceStarterDetail(index: number) {
  const details = [
    "Describe an alternate path in the target system, not the schedule for building it.",
    "Identify the actor starting this system interaction.",
    "Describe the interface receiving the actor's request.",
    "Describe the component handling the request.",
    "Name the relevant data source or external participant, if any.",
    "",
    "",
    "",
    "Show the actor's request to the system.",
    "Show validation and dispatch to the responsible component.",
    "Show the actual data or dependency interaction.",
    "Show the response, including the relevant failure alternative.",
    "Show the outcome visible to the actor.",
  ];

  return details[index] ?? "Sequence element. Edit or replace this card.";
}

export function workDesignDependencyStarterDetail(index: number) {
  const details = [
    "Identify the target system component and its responsibility.",
    "Name the service, information or capability this component needs.",
    "Identify a component affected by this component's behavior.",
    "Explain the effect of an unavailable or incorrect dependency.",
    "Describe the relevant fallback or recovery behavior; mark unresolved choices explicitly.",
  ];

  return details[index] ?? "Dependency map item. Edit or replace this card.";
}

export function workDesignMindmapStarterDetail(index: number) {
  const details = [
    "Identify the target system; replace these examples with evidence-backed architectural context.",
    "What belongs inside the system boundary and what stays outside.",
    "The user-visible behavior this system should provide.",
    "Which parts of the system provide which responsibilities.",
    "How components exchange requests, data and results.",
    "Relevant failure, privacy, security and operational concerns.",
    "Architectural choices and why the selected approach fits.",
    "Behavior included in the target system.",
    "Explicit exclusions from the target system.",
    "Primary user or operator need behind the idea.",
    "What an observer can see or verify when the system operates.",
    "A component's responsibility and boundary.",
    "Where information lives and which component may change it.",
    "External systems or information needed by the target system.",
    "Requests, data or events exchanged across an interface.",
    "A relevant failure condition and its effects.",
    "How the system retains or restores correct state after interruption.",
    "The selected design and its material trade-offs.",
    "Unverified facts and questions requiring evidence or an operator decision.",
  ];

  return details[index] ?? "Mindmap item. Edit or replace this card.";
}

export function workDesignSwimlaneStarterDetail(index: number) {
  const details = [
    "The actor using the system.",
    "The user-facing or external request interface, if applicable.",
    "The component responsible for this operation.",
    "The relevant data owner or external participant.",
    "Identify the actor's request or event.",
    "Describe the input and authorization checks.",
    "Describe the system operation and its responsibility boundary.",
    "Describe the actual information exchange.",
    "Return the operation result or explain its failure.",
    "Show the outcome visible to the actor.",
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
        label: "responsibilities",
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
        label: "data",
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
        label: "exchanges",
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
        label: "recovers through",
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
        label: "dispatch",
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
        label: "result",
        toIndex: 8,
        tone: "green",
        toSide: "bottom",
      },
      {
        fromIndex: 8,
        fromSide: "right",
        label: "response",
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
        label: "presents",
        toIndex: 3,
        toSide: "top",
      },
      {
        fromIndex: 3,
        fromSide: "right",
        label: "calls",
        toIndex: 4,
        toSide: "left",
      },
      {
        fromIndex: 3,
        fromSide: "bottom",
        label: "uses",
        toIndex: 5,
        toSide: "top",
      },
      {
        fromIndex: 4,
        fromSide: "right",
        label: "integrates with",
        toIndex: 6,
        toSide: "left",
      },
      {
        fromIndex: 2,
        fromSide: "right",
        label: "depends on",
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
