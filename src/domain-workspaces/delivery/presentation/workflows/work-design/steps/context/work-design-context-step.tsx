"use client";

import type { ComponentProps } from "react";

import {
  WorkDesignContextBoardView,
  type WorkDesignContextDecisionOption,
} from "../../embedded-products/context-board/index.ts";

type WorkDesignContextStepProps = Omit<
  ComponentProps<typeof WorkDesignContextBoardView>,
  "contextDecisionOptions"
>;

const workDesignContextDecisionOptions: WorkDesignContextDecisionOption[] = [
  {
    description: "Create a new draft tree from the accepted context brief.",
    id: "proceed",
    label: "Proceed With Work Design",
    tone: "ok",
  },
  {
    description: "Link this source to existing work; do not create a new tree.",
    id: "attach",
    label: "Link To Existing Work",
    tone: "warn",
  },
  {
    description:
      "Stop tree building when the source is likely duplicate scope.",
    id: "retire",
    label: "Retire Duplicate",
    tone: "danger",
  },
];

export function WorkDesignContextStep(props: WorkDesignContextStepProps) {
  return (
    <WorkDesignContextBoardView
      {...props}
      contextDecisionOptions={workDesignContextDecisionOptions}
    />
  );
}
