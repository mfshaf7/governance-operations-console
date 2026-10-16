import { TerasActionButton, TerasActionRow, TerasFieldStack, TerasMetadataList, TerasPanel, TerasPanelHeader } from "@/teras";
import { openExternalConsoleRoute } from "@/console-integration/external-route";
import type { PrototypeMaturityLiveProjection } from "../../../live-runtime/prototype-maturity-live-types.ts";

export type PrototypeMaturityOwnerProgress = {
  mode: "disconnected-preview" | "live";
  projection: PrototypeMaturityLiveProjection | null;
  error: string | null;
  pending: boolean;
  read: () => Promise<unknown>;
  continueWork: () => Promise<unknown>;
  cancel: () => Promise<unknown>;
};

export function prototypeMaturityRequestPending(progress?: PrototypeMaturityOwnerProgress | null) {
  const status = progress?.projection?.result.status;
  return Boolean(progress?.pending || status && ["accepted", "evaluating", "decision-required", "preparing", "review-required", "cancelling"].includes(status));
}

export function PrototypeMaturityOwnerProgressPanel({ progress }: { progress?: PrototypeMaturityOwnerProgress | null }) {
  if (!progress || progress.mode !== "live") return null;
  const result = progress.projection?.result;
  const review = result?.review;
  const reviewUrl = typeof review?.url === "string" && /^https:\/\/github\.com\/[^/]+\/workspace-prototype-studio\/pull\/[1-9][0-9]*$/.test(review.url) ? review.url : null;
  const continuable = prototypeMaturityRequestPending(progress);
  const run = (operation: () => Promise<unknown>) => { void operation().catch(() => undefined); };
  return <TerasPanel frame="padded" layout="header-body" tone={progress.error || result?.failure ? "danger" : "info"} treatment="state">
    <TerasPanelHeader kicker="Canonical Owner Progress" title="Maturity source review"
      statusLabel={progress.pending ? "Working" : result?.status ?? "Not submitted"}
      description={progress.error ?? result?.failure?.message ?? "OOS owns this request and Studio owns its source. Only exact reviewed merge and owner readback can promote lifecycle."} />
    <TerasFieldStack spacing="normal">
      <TerasMetadataList items={[
        { label: "Request", value: result?.request_id ?? "Not submitted" },
        { label: "Next action", value: result?.next_action ?? "Review and submit the operator decision" },
        { label: "Source head", value: typeof review?.head_commit === "string" ? review.head_commit : "Not published" },
        { label: "Receipt", value: result?.receipt?.receipt_id ?? "Not issued" },
      ]} />
      <TerasActionRow layout="end" spacing="normal">
        {reviewUrl ? <TerasActionButton emphasis="secondary" onClick={() => openExternalConsoleRoute(reviewUrl)}>Open exact source review</TerasActionButton> : null}
        {result ? <TerasActionButton emphasis="secondary" disabled={progress.pending} onClick={() => run(progress.read)}>Refresh owner progress</TerasActionButton> : null}
        {continuable ? <TerasActionButton disabled={progress.pending} onClick={() => run(progress.continueWork)}>{result?.status === "decision-required" ? `Confirm ${progress.projection?.input.input.decision}` : "Continue owner request"}</TerasActionButton> : null}
        {continuable && result?.status !== "cancelling" ? <TerasActionButton emphasis="secondary" disabled={progress.pending} onClick={() => run(progress.cancel)}>Cancel current owner request</TerasActionButton> : null}
      </TerasActionRow>
    </TerasFieldStack>
  </TerasPanel>;
}
