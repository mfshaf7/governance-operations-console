"use client";

import type { ComponentProps } from "react";

import { WorkDesignBuildTreeView } from "../../embedded-products/build-tree/index.ts";

type WorkDesignBuildTreeStepProps = ComponentProps<
  typeof WorkDesignBuildTreeView
>;

export function WorkDesignBuildTreeStep(props: WorkDesignBuildTreeStepProps) {
  return <WorkDesignBuildTreeView {...props} />;
}
