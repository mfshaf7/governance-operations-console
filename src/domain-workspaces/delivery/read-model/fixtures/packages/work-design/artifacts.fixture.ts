import type {
  DeliveryWorkDesignDraftNode,
  DeliveryPackageSummary,
} from "../../../../domain/delivery-types.ts";

type WorkDesignStorySeed = {
  evidence: string;
  focus: string;
  reason: string;
  title: string;
};

type WorkDesignFeatureSeed = {
  focus: string;
  operatorNote: string;
  stories: WorkDesignStorySeed[];
  title: string;
};

function complexDesignStory(
  globalStoryNumber: number,
  featureIndex: number,
  storyIndex: number,
  seed: WorkDesignStorySeed,
): DeliveryWorkDesignDraftNode {
  return {
    description: `Draft User story for ${seed.focus}.`,
    draft_body: `## What This Achieves\n${seed.focus}.\n\n## Why This Matters Now\n${seed.reason}.\n\n## Evidence Expectation\n${seed.evidence}.`,
    id: `pkg-design-756-feature-${featureIndex}-story-${storyIndex}`,
    kind: "User story",
    remark: seed.evidence,
    title: `User Story ${globalStoryNumber} - ${seed.title}`,
    tone: "info",
  };
}

function complexDesignFeature(
  featureIndex: number,
  storyOffset: number,
  seed: WorkDesignFeatureSeed,
): DeliveryWorkDesignDraftNode {
  return {
    children: seed.stories.map((story, storyIndex) =>
      complexDesignStory(
        storyOffset + storyIndex + 1,
        featureIndex,
        storyIndex + 1,
        story,
      ),
    ),
    description: `Feature branch for ${seed.focus}.`,
    draft_body: `## What This Achieves\n${seed.focus}.\n\n## Benefit Hypothesis\nThe operator can review a large package tree without losing source evidence, context, or scaffold intent.\n\n## Scope Boundaries\nWork Design owns draft-tree shape and narrative intent only. Refinement owns execution metadata, PI placement, ownership repair, and backend-safe materialization.\n\n## Evidence Expectation\nReview Draft shows count-level tree summary, full read-only tree inspection, finalized snapshot evidence, and finalization checks before Apply Draft.\n\n## Operator work notes\n${seed.operatorNote}`,
    id: `pkg-design-756-feature-${featureIndex}`,
    kind: "Feature",
    remark: seed.operatorNote,
    title: `Feature ${featureIndex} - ${seed.title}`,
    tone: "info",
  };
}

const complexWorkDesignFeatureSeeds: WorkDesignFeatureSeed[] = [
  {
    focus:
      "preserving the accepted context session, source evidence, and board snapshot across every Work Design step",
    operatorNote:
      "Confirm the finalized brief is visible before reviewing the large draft tree.",
    title: "Context Evidence Backbone",
    stories: [
      {
        evidence:
          "Review can show source identity, saved session, snapshot artifact, and metadata packet together",
        focus:
          "making finalized brief evidence inspectable before tree review begins",
        reason:
          "large packages become unsafe when the operator cannot tell which discussion produced the draft",
        title: "Finalized Brief Remains Inspectable",
      },
      {
        evidence:
          "Snapshot attachment candidate stays visible in Review Draft and Apply Draft",
        focus:
          "carrying the human-readable board snapshot forward as Work Design evidence",
        reason:
          "the visual discussion must not disappear once the draft tree is attached",
        title: "Snapshot Travels With Review",
      },
      {
        evidence:
          "Finalization checks derive from accepted source, saved session, snapshot, metadata packet, and decision state",
        focus:
          "keeping finalization checks short but complete enough for operator approval",
        reason:
          "the review gate should catch missing provenance before backend apply",
        title: "Finalization Checks Stay Compact",
      },
      {
        evidence:
          "Metadata packet ref is present without exposing backend-only field noise",
        focus:
          "showing the packet used by orchestration without flooding the review surface",
        reason: "operator needs traceability but not raw machine payloads",
        title: "Packet Ref Is Traceable",
      },
      {
        evidence:
          "Handoff note states what the next Work Design step must verify",
        focus:
          "turning context-session output into a clear review handoff note",
        reason: "large trees need a concise operator anchor before inspection",
        title: "Handoff Note Guides Review",
      },
    ],
  },
  {
    focus:
      "scaling the diagram workspace from a compact discussion board to a complex architecture sketch with multiple related decisions",
    operatorNote:
      "Use this branch to check whether the snapshot preview still reads when the board has many nodes.",
    title: "Complex Diagram Workspace",
    stories: [
      {
        evidence:
          "Finalized snapshot renders a large dependency-style board without hiding later nodes",
        focus:
          "recording a complex board with source context, related-work notes, architecture map, and handoff nodes",
        reason: "architecture work often needs more than four discussion cards",
        title: "Large Board Snapshot Renders",
      },
      {
        evidence:
          "Board node titles stay readable when the snapshot becomes wide",
        focus: "keeping board labels short enough for snapshot and export use",
        reason:
          "operators need the diagram to survive attachment and future inspection",
        title: "Snapshot Labels Stay Readable",
      },
      {
        evidence:
          "Diagram notes distinguish source context, decision context, and downstream apply context",
        focus:
          "separating design discussion evidence from backend mutation intent",
        reason:
          "the context board should not imply direct OpenProject mutation",
        title: "Diagram Boundaries Stay Clear",
      },
      {
        evidence: "Board snapshot ref and rendered image ref are both carried",
        focus:
          "preserving machine replay references and human screenshot references",
        reason:
          "future orchestration needs both replayable board data and operator-readable evidence",
        title: "Machine And Human Snapshot Refs",
      },
      {
        evidence:
          "Complex diagram remains tied to the same package and Epic source",
        focus:
          "preventing snapshot evidence from drifting away from the selected package",
        reason:
          "large package review needs stable identity across modal transitions",
        title: "Snapshot Identity Stays Stable",
      },
      {
        evidence: "Review can open the snapshot before full tree inspection",
        focus:
          "letting the operator inspect the visual context before approving the tree",
        reason: "the board may explain why the tree has many children",
        title: "Snapshot Before Tree Approval",
      },
    ],
  },
  {
    focus:
      "turning a broad accepted brief into a draft tree that has enough child branches to stress Review Draft and Full Tree inspection",
    operatorNote:
      "This branch intentionally carries many stories so the tree modal can prove bounded scrolling.",
    title: "Draft Tree Scale",
    stories: [
      {
        evidence:
          "Review summary uses counts instead of listing every story inline",
        focus:
          "summarizing many draft stories without crowding the review gate",
        reason:
          "an Epic with dozens of children should not make Review Draft unusable",
        title: "Counts Replace Inline Lists",
      },
      {
        evidence:
          "Full tree modal opens the read-only structured tree for detailed inspection",
        focus:
          "making the full tree available only when the operator asks for it",
        reason: "review needs a scalable default and a complete drill-in path",
        title: "Full Tree Opens On Demand",
      },
      {
        evidence:
          "Structured view preserves Feature lane, story summary, and risk branch distinction",
        focus: "keeping visual hierarchy intact across a large draft tree",
        reason: "operators need to scan Features before reading every story",
        title: "Structured Hierarchy Holds",
      },
      {
        evidence:
          "Collapsed and expanded tree modes use the same node ids and counts",
        focus: "preventing mode switching from losing selection or tree state",
        reason: "large trees make state loss expensive for the operator",
        title: "Tree State Stays Stable",
      },
      {
        evidence:
          "Risks remain separate support branches instead of pretending to be executable stories",
        focus:
          "keeping optional risk branches visible without inflating story count",
        reason: "risk context matters but should not confuse execution scope",
        title: "Risks Stay Support Branches",
      },
    ],
  },
  {
    focus:
      "keeping scaffold intent rich enough for Refinement while avoiding execution metadata fields in Work Design",
    operatorNote:
      "Confirm narrative scaffold sections are present without PI, owner, or iteration assignment.",
    title: "Scaffold Handoff Discipline",
    stories: [
      {
        evidence:
          "Feature draft body includes achieve, hypothesis, boundary, evidence, and operator notes sections",
        focus:
          "maintaining enough Feature intent for later metadata refinement",
        reason:
          "Refinement should not invent intent that Work Design already knew",
        title: "Feature Intent Is Complete",
      },
      {
        evidence:
          "Story draft body includes achieve, reason, and evidence sections",
        focus:
          "keeping User story narrative seeds aligned with the backend contract language",
        reason:
          "story text must survive later transformation into OpenProject fields",
        title: "Story Intent Is Complete",
      },
      {
        evidence:
          "System-owned source context stays in the snapshot and metadata packet, not editable story text",
        focus:
          "separating operator-owned narrative from system-owned references",
        reason:
          "editable scaffolds should not invite operators to overwrite backend refs",
        title: "System Context Is Not Editable Copy",
      },
      {
        evidence: "Refinement handoff remains explicit in carried metadata",
        focus:
          "making clear which downstream surface owns strict execution metadata",
        reason: "Work Design should not turn into hidden PI planning",
        title: "Refinement Boundary Is Visible",
      },
    ],
  },
  {
    focus:
      "preparing the review and apply path for a large draft without pretending the UI has already mutated ART",
    operatorNote:
      "Review should confirm snapshot, tree, and finalization checks before Apply Draft.",
    title: "Review And Apply Gate",
    stories: [
      {
        evidence:
          "Operator Review Gate shows snapshot, finalization checks, tree counts, and handoff note",
        focus: "making the review gate complete but not dense",
        reason:
          "operators should approve the actual package evidence, not a prose summary",
        title: "Review Gate Shows Real Evidence",
      },
      {
        evidence: "Apply Draft remains a separate final approval boundary",
        focus: "keeping draft review separate from backend mutation approval",
        reason: "the console must not treat review as an ART write",
        title: "Apply Boundary Stays Separate",
      },
      {
        evidence:
          "OOS route and snapshot attachment status are pending until apply",
        focus: "showing future backend handoff without claiming live upload",
        reason:
          "mock data must not imply the attachment is already in OpenProject",
        title: "Attachment Status Is Pending",
      },
      {
        evidence: "Read-only full tree view cannot edit draft content",
        focus: "preventing review inspection from becoming a second editor",
        reason: "edits belong in Build Tree before Review Draft is accepted",
        title: "Review Tree Is Read Only",
      },
    ],
  },
  {
    focus:
      "checking how the workflow behaves when a package has many children, several risk notes, and a large snapshot",
    operatorNote:
      "Use this branch to look for clipped rows, modal overflow, cramped cards, and weak scroll ownership.",
    title: "Large Package Usability",
    stories: [
      {
        evidence:
          "Review Draft remains usable at desktop size with count summary and modal drill-in",
        focus: "exercising modal layout with a wide tree and many stories",
        reason: "large real ART Epics can easily exceed the first viewport",
        title: "Review Modal Does Not Flood",
      },
      {
        evidence:
          "Full Tree modal gives the structured tree enough horizontal breathing room",
        focus: "checking whether feature-to-story rails stay readable",
        reason: "tree connectors should remain useful at scale",
        title: "Structured Rails Remain Readable",
      },
      {
        evidence:
          "Snapshot attachment preview uses a white backing surface for readability",
        focus: "checking whether dense diagram snapshots remain legible",
        reason: "future exports and attachments need readable contrast",
        title: "Snapshot Preview Stays Legible",
      },
      {
        evidence: "Footer and modal chrome remain reachable when content grows",
        focus: "verifying scroll ownership instead of whole-modal clipping",
        reason: "operators must not lose navigation controls in large packages",
        title: "Modal Controls Stay Reachable",
      },
      {
        evidence:
          "Review remains tied to Work Design, not Refinement or Execution Board",
        focus: "avoiding workflow grammar drift in a large-package test case",
        reason:
          "stress fixtures should test the intended workflow, not reintroduce old terms",
        title: "Workflow Grammar Holds",
      },
      {
        evidence:
          "Large package scenario has a distinct package identity for future regression checks",
        focus: "making the fixture easy to find in the Work Design register",
        reason: "visual testing needs a stable target row",
        title: "Stress Fixture Is Addressable",
      },
    ],
  },
];

function complexWorkDesignFeatures(): DeliveryWorkDesignDraftNode[] {
  let storyOffset = 0;

  return complexWorkDesignFeatureSeeds.map((feature, featureIndex) => {
    const node = complexDesignFeature(featureIndex + 1, storyOffset, feature);
    storyOffset += feature.stories.length;
    return node;
  });
}

export const complexWorkDesignGeneratedTree: DeliveryWorkDesignDraftNode = {
  children: [
    ...complexWorkDesignFeatures(),
    {
      description:
        "Risk branch for losing visual context when the finalized board grows wider than the review viewport.",
      draft_body:
        "## Risk Event\nLarge board snapshots may become too wide to inspect if the preview or export surface compresses them aggressively.\n\n## Impact\nThe operator could approve a draft tree without being able to verify the design discussion that produced it.\n\n## Current Handling\nKeep snapshot preview/export available and preserve the machine board snapshot reference for replay.",
      id: "pkg-design-756-risk-1",
      kind: "Risk",
      remark:
        "Watch snapshot preview, export, and full-size inspection behavior.",
      title: "Risk 1 - Wide Snapshot Loses Context",
      tone: "warn",
    },
    {
      description:
        "Risk branch for review surfaces becoming unusable when a package has many Features and User stories.",
      draft_body:
        "## Risk Event\nReview Draft can flood the operator if it renders every child inline by default.\n\n## Impact\nThe operator may miss finalization checks, handoff evidence, or the apply boundary.\n\n## Current Handling\nShow counts by default and open the full structured tree only on request.",
      id: "pkg-design-756-risk-2",
      kind: "Risk",
      remark: "Use count-first review and read-only full tree drill-in.",
      title: "Risk 2 - Large Tree Floods Review",
      tone: "warn",
    },
    {
      description:
        "Risk branch for advisor context drifting from operator-approved context when the draft is large.",
      draft_body:
        "## Risk Event\nAdvisor-proposed tree changes can drift from the finalized context session if review does not anchor the source evidence.\n\n## Impact\nThe draft tree may be coherent by itself but no longer match the accepted decision.\n\n## Current Handling\nReview Draft keeps finalized context snapshot, metadata packet, finalization checks, and draft tree metrics together.",
      id: "pkg-design-756-risk-3",
      kind: "Risk",
      remark:
        "Compare draft tree against finalized brief evidence before apply.",
      title: "Risk 3 - Advisor Context Drift",
      tone: "warn",
    },
    {
      description:
        "Risk branch for treating Work Design output as direct OpenProject mutation data.",
      draft_body:
        "## Risk Event\nA large draft could tempt the UI to bypass OOS and write tree data directly to OpenProject.\n\n## Impact\nThe system would lose apply review, receipt, attachment status, and projection checkpoint control.\n\n## Current Handling\nApply Draft submits an OOS-shaped intent with snapshot artifact and draft tree refs.",
      id: "pkg-design-756-risk-4",
      kind: "Risk",
      remark: "Do not bypass OOS apply, even for a mock large-tree package.",
      title: "Risk 4 - Apply Boundary Bypass",
      tone: "danger",
    },
  ],
  description:
    "Draft Epic shell for a deliberately large Work Design package. Review Draft should stay count-first, with full tree and snapshot inspection available on demand.",
  draft_body:
    "## What This Initiative Achieves\nStress the Work Design review path with a large draft package tree, complex finalized context diagram, and enough child scope to expose modal, scroll, and visual-cue defects.\n\n## Current Work Design Focus\nPrepare a backend-safe draft handoff without adding execution metadata, PI placement, or active movement decisions in Work Design.\n\n## Scope Boundaries\nWork Design owns context evidence, draft tree shape, scaffold intent, review gate, and apply handoff evidence. Refinement owns execution metadata and final backend-safe materialization.\n\n## Operator Handoff Note\nReview the large board snapshot, finalization checks, tree counts, full structured tree, risk branches, and apply boundary before accepting the draft.",
  id: "pkg-design-756-epic",
  kind: "Epic",
  remark:
    "Large-tree stress fixture stored from finalized Context Brief v2. Keep execution metadata out of Work Design.",
  title: "Epic #756 - Complex Package Review Stress",
  tone: "info",
};

export const complexWorkDesignBoardSnapshot: NonNullable<
  NonNullable<
    DeliveryPackageSummary["work_design_context_session"]
  >["board_snapshot"]
> = {
  title: "Complex Work Design Context Map",
  summary:
    "Finalized board snapshot records a large multi-branch Work Design discussion: source context, related-work notes, architecture context, diagram evidence, tree seed, review gate, apply route, and refinement handoff.",
  nodes: [
    {
      label: "SOURCE",
      title: "OpenProject Epic #756",
      summary:
        "Accepted source shell for the complex Work Design stress package.",
      tone: "info",
    },
    {
      label: "INTAKE",
      title: "Consumed Package Shell",
      summary:
        "Delivery package identity is available before Work Design begins.",
      tone: "ok",
    },
    {
      label: "ART MAP",
      title: "Adjacent Architecture Families",
      summary: "Context map lists governance, broker, and prototype families.",
      tone: "info",
    },
    {
      label: "DUPLICATE",
      title: "No Full Duplicate",
      summary:
        "Related work exists, but no active package owns this combined scope.",
      tone: "ok",
    },
    {
      label: "BOARD",
      title: "Complex Diagram Snapshot",
      summary:
        "Discussion board carries source, boundary, and draft-tree rationale.",
      tone: "warn",
    },
    {
      label: "BOUNDARY",
      title: "Work Design Only",
      summary:
        "No PI placement, iteration, owner assignment, or movement is applied here.",
      tone: "warn",
    },
    {
      label: "TREE",
      title: "Large Draft Tree Seed",
      summary:
        "Six Features, thirty User stories, and four Risks are attached to the draft tree.",
      tone: "warn",
    },
    {
      label: "SCAFFOLD",
      title: "Narrative Intent Preserved",
      summary: "Feature and story bodies carry intent for later Refinement.",
      tone: "info",
    },
    {
      label: "REVIEW",
      title: "Count-First Review",
      summary:
        "Review Draft must summarize first and open the full tree on demand.",
      tone: "warn",
    },
    {
      label: "SNAPSHOT",
      title: "Attachment Candidate",
      summary: "Human snapshot and machine board refs travel to Apply Draft.",
      tone: "info",
    },
    {
      label: "APPLY",
      title: "OOS Apply Intent",
      summary:
        "Console submits the draft through OOS, not directly to OpenProject.",
      tone: "warn",
    },
    {
      label: "NEXT",
      title: "Refinement Handoff",
      summary:
        "Refinement materializes execution metadata after Work Design apply.",
      tone: "ok",
    },
  ],
};

export const sketchOnlyWorkDesignBoardSnapshot: NonNullable<
  NonNullable<
    DeliveryPackageSummary["work_design_context_session"]
  >["board_snapshot"]
> = {
  title: "Ambiguous Freeform Sketch",
  summary:
    "Finalized board snapshot captured loose operator sketching only. No confirmed build seeds were produced, so Build Tree starts from the selected Epic shell.",
  nodes: [],
  sketch_strokes: [
    {
      id: "pkg-design-757-sketch-1",
      opacity: 0.9,
      points: [
        { x: 780, y: 680 },
        { x: 850, y: 636 },
        { x: 944, y: 660 },
        { x: 1025, y: 620 },
        { x: 1118, y: 668 },
        { x: 1200, y: 646 },
      ],
      tone: "black",
      tool: "marker",
      width: 7,
    },
    {
      id: "pkg-design-757-sketch-2",
      opacity: 0.62,
      points: [
        { x: 818, y: 778 },
        { x: 914, y: 742 },
        { x: 1006, y: 804 },
        { x: 1094, y: 760 },
        { x: 1192, y: 818 },
      ],
      tone: "amber",
      tool: "highlighter",
      width: 15,
    },
    {
      id: "pkg-design-757-sketch-3",
      opacity: 0.88,
      points: [
        { x: 732, y: 894 },
        { x: 832, y: 842 },
        { x: 928, y: 920 },
        { x: 1044, y: 856 },
        { x: 1164, y: 928 },
        { x: 1264, y: 872 },
      ],
      tone: "navy",
      tool: "pen",
      width: 4,
    },
    {
      id: "pkg-design-757-sketch-4",
      opacity: 0.78,
      points: [
        { x: 1338, y: 662 },
        { x: 1416, y: 730 },
        { x: 1362, y: 812 },
        { x: 1458, y: 888 },
        { x: 1388, y: 948 },
      ],
      tone: "burgundy",
      tool: "marker",
      width: 6,
    },
  ],
};

export const scatteredShapeWorkDesignBoardSnapshot: NonNullable<
  NonNullable<
    DeliveryPackageSummary["work_design_context_session"]
  >["board_snapshot"]
> = {
  title: "Unclassified Scattered Shapes",
  summary:
    "Finalized board snapshot captured disconnected shapes and labels with no confirmed relationship or build-tree meaning.",
  nodes: [],
  loose_items: [
    {
      detail: "",
      height: 124,
      id: "pkg-design-758-loose-diamond",
      kind: "shape-diamond",
      label: "??",
      tone: "amber",
      width: 148,
      x: 650,
      y: 560,
    },
    {
      detail: "",
      height: 126,
      id: "pkg-design-758-loose-circle",
      kind: "shape-circle",
      label: "loop",
      tone: "purple",
      width: 152,
      x: 1190,
      y: 730,
    },
    {
      detail: "",
      height: 112,
      id: "pkg-design-758-loose-note",
      kind: "note",
      label: "maybe later",
      tone: "neutral",
      width: 236,
      x: 905,
      y: 940,
    },
    {
      detail: "",
      height: 112,
      id: "pkg-design-758-loose-rect",
      kind: "shape-rounded",
      label: "box",
      tone: "blue",
      width: 228,
      x: 1450,
      y: 598,
    },
    {
      detail: "",
      height: 72,
      id: "pkg-design-758-loose-label",
      kind: "label-field",
      label: "unknown dependency",
      tone: "red",
      width: 260,
      x: 760,
      y: 1185,
    },
  ],
  sketch_strokes: [
    {
      id: "pkg-design-758-sketch-1",
      opacity: 0.8,
      points: [
        { x: 835, y: 705 },
        { x: 930, y: 662 },
        { x: 1050, y: 720 },
        { x: 1165, y: 684 },
      ],
      tone: "charcoal",
      tool: "pen",
      width: 4,
    },
  ],
};
