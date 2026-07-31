import type { TerasTone } from "@/teras";
import type { ContextBoardDisposition } from "@/product-apps/context-board";

export type WorkDesignAdvisorTranscriptLine = {
  id: string;
  role: "advisor" | "operator";
  text: string;
};

export type WorkDesignContextDecisionCopy = {
  description: string;
  title: string;
  tone: TerasTone;
};

export type WorkDesignContextDecisionOption = {
  description: string;
  id: ContextBoardDisposition;
  label: string;
  tone: TerasTone;
};

export type WorkDesignContextSource = {
  detail: string;
  label: string;
  status: string;
  tone: TerasTone;
};
