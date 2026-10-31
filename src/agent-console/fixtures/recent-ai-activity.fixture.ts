import type { RecentAiActivity } from "../model/recent-ai-activity";

/** Visual-review examples only; no owner records, model calls or receipts. */
export const recentAiActivityExamples: readonly (Omit<RecentAiActivity, "occurredAt"> & { minutesAgo: number })[] = [
  { id: "preview-context", task: "Draft a context diagram", surface: "Work Design", subject: "Sample application", state: "completed", minutesAgo: 2,
    detail: "Example of a completed diagram request. Draft generation and final workflow acceptance are separate." },
  { id: "preview-proposal", task: "Review the proposal", surface: "Proposal", subject: "Sample developer tool", state: "working", minutesAgo: 4,
    detail: "Example of a request still being processed. Opening an advisor alone does not create an activity entry." },
  { id: "preview-refinement", task: "Suggest acceptance criteria", surface: "Refinement", subject: "Sample delivery feature", state: "failed", minutesAgo: 12,
    detail: "Example of a failed request. A failed generation must retain its outcome and must not automatically repeat the model call." },
  { id: "preview-prototype", task: "Review the prototype baseline", surface: "Prototype", subject: "Sample application", state: "completed", minutesAgo: 28,
    detail: "Example of a completed advisory review. It does not imply that the baseline was approved or promoted." },
  { id: "preview-tree", task: "Suggest a story breakdown", surface: "Work Design", subject: "Sample delivery feature", state: "cancelled", minutesAgo: 43,
    detail: "Example of an operator-cancelled request, distinguished from a failed or completed request." },
];
