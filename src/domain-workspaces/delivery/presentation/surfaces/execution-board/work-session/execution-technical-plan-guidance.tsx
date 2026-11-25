"use client";

import { useEffect, useRef, useState } from "react";
import { advisorWorkContext, useDraftAdvisor } from "@/agent-console";
import { TerasActionButton, TerasActionRow, TerasContentTray, TerasLoadingState, TerasPanel, TerasPanelHeader } from "@/teras";
import {
  parseTechnicalPlanGuidance, parseTechnicalPlanStarter, technicalPlanGuidancePrompt, technicalPlanStarterPrompt,
  type TechnicalPlanGuidanceScope, type TechnicalPlanStarter,
} from "../../../../work-model/execution/technical-plan-guidance.ts";
import { useArchitecturePacketLiveRuntime } from "../../../../live-runtime/use-architecture-packet-live-runtime.ts";
import { useArchitectureSavedContext } from "../architecture-packet/architecture-saved-context.tsx";

export type ExecutionPlanStarterTransfer = { scope: TechnicalPlanGuidanceScope; draft: TechnicalPlanStarter };

export function ExecutionTechnicalPlanGuidance({ scope, disabled, onDraft, onViewApproved }: {
  scope: TechnicalPlanGuidanceScope;
  disabled: boolean;
  onDraft: (transfer: ExecutionPlanStarterTransfer) => void;
  onViewApproved: () => void;
}) {
  const { inspectCurrent } = useArchitecturePacketLiveRuntime();
  const [recorded, setRecorded] = useState<{ key: string; status: "checking" | "approved" | "available" | "unavailable" } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const planKey = JSON.stringify([scope.deliveryId, scope.work.id, scope.sourceRevision, attempt]);
  const planStatus = recorded?.key === planKey ? recorded.status : "checking";
  useEffect(() => {
    let active = true;
    void inspectCurrent(scope.deliveryId).then(({ result }) => {
      if (!active) return;
      const artifact = result?.workflow_id === "delivery-art-architecture-packet-current" ? result.artifact : null;
      const matches = artifact?.delivery_id === scope.deliveryId;
      const approved = matches && result?.workflow_id === "delivery-art-architecture-packet-current" && result.contract_posture === "current" &&
        artifact.decision.status === "architecture-ready" && artifact.custody.state === "durable" &&
        artifact.covered_work_item_ids.includes(`work-item-${scope.work.id}`);
      setRecorded({ key: planKey, status: matches ? (approved ? "approved" : "available") : "unavailable" });
    }).catch(error => {
      if (active) setRecorded({ key: planKey, status: error?.code === "delivery_art_reference_missing" ? "available" : "unavailable" });
    });
    return () => { active = false; };
  }, [inspectCurrent, planKey, scope.deliveryId, scope.work.id]);
  const { brief, loading, error: briefError } = useArchitectureSavedContext(scope.deliveryId, planStatus === "available");
  const [result, setResult] = useState<{ key: string; advice: ReturnType<typeof parseTechnicalPlanGuidance> } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [operation, setOperation] = useState<"check" | "draft" | null>(null);
  const key = JSON.stringify([scope.sourceRevision, scope.basis, scope.work, scope.prerequisites, scope.dependentWork, brief?.briefVersionId]);
  const unavailable = disabled || planStatus !== "available";
  const latest = useRef({ key, unavailable });
  latest.current = { key, unavailable };
  const advice = result?.key === key ? result.advice : null;
  const stale = result !== null && advice === null;
  const advisor = useDraftAdvisor({
    disabled: true, registerScope: false, stopWaitingOnly: true,
    getScope: () => ({
      role: "execution-architecture", ref: `${scope.deliveryId}:plan-guidance:${scope.work.id}`, packageRef: scope.deliveryId,
      sourceRef: `openproject://work_packages/${scope.work.id}`, sourceRevision: scope.sourceRevision,
      context: advisorWorkContext({
        selectedWork: scope.work,
        prerequisites: scope.prerequisites,
        dependentWork: scope.dependentWork,
        finalizedBrief: brief?.finalizedBrief ? { name: brief.name, note: brief.finalizedBrief.note } : null,
      }, {
        provided: ["Selected Delivery work and recorded planning placement", "Recorded direct dependencies",
          ...(brief?.finalizedBrief ? ["Finalized Work Design note"] : [])],
        unavailable: ["Repository contents", "Runtime evidence", "Unrecorded relationships and other work in the iteration",
          ...(brief?.finalizedBrief ? [] : ["Finalized Work Design note"])],
      }),
      fields: [],
    }),
    apply: () => [],
  });

  async function request(action: "check" | "draft") {
    if (unavailable || loading || advisor.busy || operation || (action === "draft" && !advice?.recommendPlan)) return;
    setOperation(action);
    setFailure(null);
    try {
      const reply = await advisor.run(action === "check" ? technicalPlanGuidancePrompt : technicalPlanStarterPrompt, { conversation: [] });
      if (key !== latest.current.key || latest.current.unavailable) {
        setFailure("The work or its context changed while the advisor answered. Check the current scope again.");
        return;
      }
      if (action === "check") setResult({ key, advice: parseTechnicalPlanGuidance(reply) });
      else onDraft({ scope, draft: parseTechnicalPlanStarter(reply) });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Technical Plan advice is unavailable.");
    } finally {
      setOperation(null);
    }
  }

  if (planStatus === "approved") return <TerasContentTray title="Approved plan covers this work"
    description="Review the recorded approach for this work.">
    <TerasActionButton emphasis="secondary" onClick={onViewApproved}>View Approved Plan</TerasActionButton>
  </TerasContentTray>;
  if (planStatus === "checking") return <TerasLoadingState inline label="Checking for a recorded plan…" />;
  if (planStatus === "unavailable") return <TerasContentTray title="Recorded plan status unavailable"
    description="Read the recorded plan status before requesting advice.">
    <TerasActionButton emphasis="secondary" onClick={() => setAttempt(value => value + 1)}>Retry plan check</TerasActionButton>
  </TerasContentTray>;

  return <TerasPanel aria-label="Technical plan recommendation" frame="padded" treatment="neutral" spacing="compact" fit="content">
    <TerasPanelHeader kicker="Optional guidance" title="Technical plan recommendation"
      description="Assess the selected work, its recorded dependencies, and its saved schedule." />
    {loading ? <TerasLoadingState inline label="Reading the saved Work Design context…" /> : null}
    {operation ? <TerasLoadingState inline label={operation === "draft" ? "Preparing the technical plan…" : "Checking the selected work…"} /> : null}
    {advice ? <TerasContentTray title={advice.title} description={advice.reason} descriptionFormat="lines" /> : null}
    {stale ? <TerasContentTray description="The work or its schedule changed. Check the current scope again." /> : null}
    {briefError && !loading ? <TerasContentTray description="The saved brief is unavailable. Advice can use the verified work records." /> : null}
    {failure ? <TerasContentTray role="status" description={failure} /> : null}
    <TerasActionRow spacing="compact">
      {!advice || failure ? <TerasActionButton emphasis="secondary" disabled={disabled || loading || Boolean(operation)}
        onClick={() => void request("check")}>{stale || failure ? "Check again" : "Check recommendation"}</TerasActionButton> : null}
      {advice?.recommendPlan ? <TerasActionButton disabled={disabled || loading || Boolean(operation)}
        onClick={() => void request("draft")}>Draft Technical Plan</TerasActionButton> : null}
    </TerasActionRow>
  </TerasPanel>;
}
