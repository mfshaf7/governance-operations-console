import type { DeliveryTone } from "../../../../read-model/index.ts";

import type { WorkDesignContextDecision } from "../model/work-design-model.ts";

export type WorkDesignContextDecisionCopy = {
  description: string;
  historyDescription: string;
  historyTitle: string;
  label: string;
  title: string;
  tone: DeliveryTone;
};

export function workDesignContextDecisionCopy(
  decision: WorkDesignContextDecision,
): WorkDesignContextDecisionCopy {
  switch (decision) {
    case "attach":
      return {
        description:
          "Record that this accepted source should link to existing work instead of creating a new draft tree.",
        historyDescription:
          "The context session stopped new tree building and recorded a link-to-existing-work decision.",
        historyTitle: "Link Decision Recorded",
        label: "Link Existing Work",
        title: "Link To Existing Work",
        tone: "warn",
      };
    case "retire":
      return {
        description:
          "Record that this accepted source appears duplicative and should not create a new Work Design draft.",
        historyDescription:
          "The context session stopped new tree building and recorded a duplicate-retirement decision.",
        historyTitle: "Duplicate Decision Recorded",
        label: "Retire Duplicate",
        title: "Retire Duplicate Source",
        tone: "danger",
      };
    case "proceed":
    default:
      return {
        description:
          "Accept the context brief and continue into tree building with this context attached.",
        historyDescription:
          "The context session accepted a proceed decision and unlocked tree building.",
        historyTitle: "Context Brief Accepted",
        label: "Proceed",
        title: "Proceed With Work Design",
        tone: "ok",
      };
  }
}
