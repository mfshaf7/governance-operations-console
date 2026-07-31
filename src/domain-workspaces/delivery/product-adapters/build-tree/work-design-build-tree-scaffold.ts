import type { DeliveryPackageSummary } from "../../read-model/index.ts";
import {
  buildTreeScaffoldCompactValue,
  buildTreeScaffoldSectionId,
  buildTreeScaffoldSectionsWithDraft,
  buildTreeScaffoldStateLabel,
  composeBuildTreeScaffoldSections,
  normalizeBuildTreeScaffoldValue,
} from "../../../../product-apps/build-tree/index.ts";
import type {
  BuildTreeScaffoldOwner,
  BuildTreeScaffoldSection,
  BuildTreeScaffoldState,
} from "../../../../product-apps/build-tree/index.ts";

import type { WorkDesignFinalizedBrief } from "../../work-model/work-design/work-design-artifact-types.ts";
import { workDesignNodeDisplayTitle } from "./work-design-tree-model.ts";
import type {
  WorkDesignContextDecision,
  WorkDesignNode,
} from "../../work-model/work-design/work-design-types.ts";

type WorkDesignScaffoldOwner = BuildTreeScaffoldOwner;
type WorkDesignScaffoldState = BuildTreeScaffoldState;

export type WorkDesignScaffoldSection = BuildTreeScaffoldSection;

function formatWorkDesignScaffoldDateTime(isoValue: string) {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function workDesignScaffoldContextDecisionLabel(
  decision: WorkDesignContextDecision,
) {
  switch (decision) {
    case "attach":
      return "Link Existing Work";
    case "retire":
      return "Retire Duplicate";
    case "proceed":
    default:
      return "Proceed";
  }
}

export function workDesignScaffoldSectionsForNode(
  node: WorkDesignNode,
  deliveryPackage: DeliveryPackageSummary,
  finalizedBrief: WorkDesignFinalizedBrief,
): WorkDesignScaffoldSection[] {
  const section = (
    heading: string,
    defaultValue: string,
    placeholder: string,
    state: WorkDesignScaffoldState = "auto",
    owner: WorkDesignScaffoldOwner = "operator",
  ): WorkDesignScaffoldSection => ({
    defaultValue,
    heading,
    id: workDesignScaffoldSectionId(heading),
    owner,
    placeholder,
    state,
    value: defaultValue,
  });
  const decisionLabel = workDesignScaffoldContextDecisionLabel(
    finalizedBrief.decision,
  );
  const finalizedAt = finalizedBrief.finalizedAt
    ? formatWorkDesignScaffoldDateTime(finalizedBrief.finalizedAt)
    : "not timestamped";
  const finalizedBriefSummary = [
    finalizedBrief.name,
    finalizedBrief.version,
    finalizedAt,
  ].join(" / ");
  const finalizedBriefNote =
    finalizedBrief.note.trim() || `Context decision: ${decisionLabel}.`;
  const sourceEvidence = [
    deliveryPackage.source_ref,
    `Epic #${deliveryPackage.legacy_epic_id}`,
    finalizedBrief.boardSnapshotRef,
  ].join("\n");
  const handoffPacket = [
    `Decision: ${decisionLabel}`,
    `Metadata: ${finalizedBrief.metadataPacketRef}`,
    `Snapshot: ${finalizedBrief.boardSnapshotRef}`,
  ].join("\n");
  const executionContextPlaceholder = [
    "Refinement materializes this section with final execution metadata.",
    "Required backend values include Owner Repo, Parent Item, Delivery Team, and Iteration when applicable.",
  ].join("\n");
  const classificationNote = [
    "Refinement selects Execution Classification and maps the heading to the final contract.",
    "If this becomes an Enabler, the final heading becomes What This Enables.",
  ].join("\n");
  const finalizedBriefSection = () =>
    section(
      "Finalized Brief",
      finalizedBriefSummary,
      "Context brief carried from the previous step.",
      "inherited",
      "system",
    );

  switch (node.kind) {
    case "Epic":
      return [
        section(
          "What This Initiative Achieves",
          `Shape ${deliveryPackage.display_name} into a clear Delivery Package tree using the accepted ${decisionLabel} decision.`,
          "What should this initiative achieve if the draft is accepted?",
        ),
        section(
          "Current Work Design Focus",
          "Refinement will decide concrete PI placement. Work Design should capture the near-term reason this package is worth refining.",
          "What is the near-term focus or why should this be prepared now?",
          "review",
        ),
        section(
          "Scope Boundaries",
          "Work Design owns the draft tree only. Refinement owns execution metadata, active movement, blockers, and closeout.",
          "What is included in this package and what must stay out of scope?",
        ),
        section(
          "Execution Context",
          executionContextPlaceholder,
          "Refinement-owned backend context.",
          "inherited",
          "system",
        ),
        section(
          "Source Evidence",
          sourceEvidence,
          "Which source should the draft remain traceable to?",
          "inherited",
          "system",
        ),
        finalizedBriefSection(),
        section(
          "Operator Handoff Note",
          `Context brief note: ${finalizedBriefNote}`,
          "What should Refinement inspect first after this draft is applied?",
        ),
      ];
    case "Feature":
      return [
        section(
          "What This Achieves",
          `${workDesignNodeDisplayTitle(node)} should represent one coherent operator-visible outcome.`,
          "What should this Feature accomplish or enable?",
        ),
        section(
          "Benefit Hypothesis",
          "Operators should be able to understand the value of this Feature before Refinement assigns execution metadata.",
          "What benefit should this Feature create?",
        ),
        section(
          "Scope Boundaries",
          "Keep this Feature focused on one coherent design outcome. Put unrelated execution or movement work elsewhere.",
          "What belongs inside this Feature, and what is explicitly excluded?",
        ),
        section(
          "Evidence Expectation",
          "Evidence should show that the drafted Feature shape and child stories preserve the accepted context brief.",
          "What evidence should prove this Feature is ready to refine?",
          "review",
        ),
        section(
          "Operator work notes",
          `Context note: ${finalizedBriefNote}`,
          "Add operator pickup notes, caveats, or review reminders.",
        ),
        finalizedBriefSection(),
        section(
          "Execution Context",
          executionContextPlaceholder,
          "Refinement-owned backend context.",
          "inherited",
          "system",
        ),
        section(
          "Execution Classification Note",
          classificationNote,
          "Refinement-owned classification mapping.",
          "inherited",
          "system",
        ),
        section(
          "Included User Stories",
          (node.children ?? [])
            .filter((child) => child.kind === "User story")
            .map(workDesignNodeDisplayTitle)
            .join("\n") || "No User stories drafted yet.",
          "Derived child summary.",
          (node.children ?? []).length > 0 ? "auto" : "review",
          "system",
        ),
      ];
    case "Risk":
      return [
        section(
          "Risk Event",
          "Describe the sequencing, ownership, dependency, or scope event that could affect this package.",
          "What risk event could block or distort the package?",
          "review",
        ),
        section(
          "Impact",
          "The risk may affect package sequencing, ownership clarity, or refinement readiness.",
          "What happens if the risk is not handled?",
        ),
        section(
          "Current Handling",
          "Describe the possible mitigation without assigning execution ownership here.",
          "How should this risk be carried into Refinement?",
          "review",
        ),
        section(
          "Execution Context",
          executionContextPlaceholder,
          "Refinement-owned backend context.",
          "inherited",
          "system",
        ),
        finalizedBriefSection(),
      ];
    case "User story":
      return [
        section(
          "What This Achieves",
          "This story should describe one clear outcome from its parent Feature.",
          "What should this User story achieve or enable?",
        ),
        section(
          "Why This Matters Now",
          "The story matters because it preserves a specific part of the accepted context brief.",
          "Why does this story matter now?",
        ),
        section(
          "Evidence Expectation",
          "Evidence should prove the story outcome is ready for Refinement to turn into backend-safe metadata.",
          "What evidence should prove this story is ready to refine?",
          "review",
        ),
        section(
          "Execution Context",
          executionContextPlaceholder,
          "Refinement-owned backend context.",
          "inherited",
          "system",
        ),
        section(
          "Source Evidence",
          `Apply path carries source evidence and the Work Design apply receipt.\n${handoffPacket}`,
          "System-owned handoff evidence.",
          "inherited",
          "system",
        ),
        finalizedBriefSection(),
      ];
  }
}

export function workDesignScaffoldSectionsWithDraft(
  sections: WorkDesignScaffoldSection[],
  draftBody: string,
) {
  return buildTreeScaffoldSectionsWithDraft(sections, draftBody);
}

export function composeWorkDesignScaffoldSections(
  sections: WorkDesignScaffoldSection[],
) {
  return composeBuildTreeScaffoldSections(sections);
}

export function normalizeWorkDesignScaffoldValue(value: string) {
  return normalizeBuildTreeScaffoldValue(value);
}

export function workDesignScaffoldIsTraceSection(
  section: WorkDesignScaffoldSection,
) {
  return ["Finalized Brief", "Source Evidence"].includes(section.heading);
}

export function workDesignScaffoldTraceSummary(
  sections: WorkDesignScaffoldSection[],
) {
  const headings = new Set(sections.map((section) => section.heading));

  if (headings.has("Finalized Brief") && headings.has("Source Evidence")) {
    return "source + accepted brief";
  }

  if (headings.has("Finalized Brief")) {
    return "accepted brief";
  }

  if (headings.has("Source Evidence")) {
    return "source evidence";
  }

  return "trace";
}

export function workDesignScaffoldCompactValue(value: string) {
  return buildTreeScaffoldCompactValue(value);
}

export function workDesignScaffoldStateLabel(state: WorkDesignScaffoldState) {
  return buildTreeScaffoldStateLabel(state);
}

function workDesignScaffoldSectionId(heading: string) {
  return buildTreeScaffoldSectionId(heading);
}
