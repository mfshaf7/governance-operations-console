"use client";

import { useMemo, useState } from "react";
import { TerasActionButton, TerasFieldStack, TerasMetadataList, TerasModalShell,
  TerasNoteField, TerasSelectField, TerasTextField, TerasContentTray } from "@/teras";
import { WorkspaceIntakeDialog } from "@/console-integration/workspace-intake/presentation/workspace-intake-dialog.tsx";
import { useWorkspaceIntakeLiveRuntime } from "@/console-integration/workspace-intake/live-runtime/use-workspace-intake-live-runtime.ts";
import type { WorkspaceIntakeCandidate, WorkspaceIntakeCustodyPreparation } from "@/console-integration/workspace-intake/workspace-intake-live-types.ts";
import type { RepositoryCustodyWorkflowResult } from "../../../live-runtime/repository-custody-live-types.ts";
import type { RepositoryWorkspaceRecord } from "../../../read-model/repository-workspace-read-model.ts";
import { emptyRepositoryIntakeDraft, repositoryIntakeCustody, repositoryIntakeRecord,
  type RepositoryIntakeDraft } from "./repository-intake-candidate.ts";

const validationPostures = ["catalog-owner", "runtime-consumer", "profile-gated-external-owner",
  "covered-by-owner-repo", "interface-contract-backed", "proposed-profile-gated", "build-admitted-profile-gated"];

export function RepositoryIntakeDialog({ repository, custodyResult, onClose }: {
  repository: RepositoryWorkspaceRecord;
  custodyResult: RepositoryCustodyWorkflowResult;
  onClose: () => void;
}) {
  const runtime = useWorkspaceIntakeLiveRuntime();
  const [draft, setDraft] = useState(emptyRepositoryIntakeDraft);
  const [review, setReview] = useState<{ candidate: WorkspaceIntakeCandidate; custody: WorkspaceIntakeCustodyPreparation } | null>(null);
  const custody = repositoryIntakeCustody(repository, custodyResult);
  const requestedRecord = useMemo(() => repositoryIntakeRecord(draft), [draft]);
  function update(field: keyof RepositoryIntakeDraft, value: string) {
    if (!runtime.pending) setDraft((current) => ({ ...current, [field]: value }));
  }
  async function prepare() {
    if (!custody || !requestedRecord || runtime.pending) return;
    const selection = { request_id: custody.requestId, requested_record: requestedRecord };
    const preparation = await runtime.prepare({ target: custody.target }, selection).catch(() => null);
    const source = preparation?.source_candidate;
    if (!source || source.requested_record.kind !== "repo") return;
    setReview({ custody: selection, candidate: {
      label: repository.name, target: { kind: source.target.kind, name: source.target.name },
      source: source.source, requested_record: source.requested_record, evidence_refs: source.evidence_refs,
    } });
  }
  if (review) return <WorkspaceIntakeDialog candidate={review.candidate} repositoryCustody={review.custody}
    returnLabel="Back to Repository" onClose={onClose} />;
  return <TerasModalShell bodyLayout="scroll" height="content" width="standard"
    kicker="Workspace Intake" title="Prepare repository entrant" surfaceId="repository-intake-preparation"
    description="Prepare a candidate from successful OOS custody. Classification, trusted bootstrap, active Inventory and Delivery Catalog are separate reviewed actions."
    onClose={onClose} footer={<>
      <TerasActionButton emphasis="secondary" onClick={onClose}>Back to Repository</TerasActionButton>
      <TerasActionButton disabled={!custody || !requestedRecord || runtime.pending} onClick={() => void prepare()}>
        {runtime.pending ? "Reading custody and authority…" : "Prepare exact custody candidate"}
      </TerasActionButton>
    </>}>
    <TerasFieldStack spacing="loose">
      <TerasMetadataList items={[
        { label: "Provider repository", value: repository.githubUrl },
        { label: "Workspace entrant", value: custody ? `repo:${custody.target.name}` : "Successful matching custody required" },
        { label: "Custody request", value: custody?.requestId ?? "Unavailable" },
        { label: "Effect", value: "Read-only preparation; no admission or credential issuance" },
      ]} />
      <TerasTextField label="Repository class" value={draft.repoClass} onValueChange={(value) => update("repoClass", value)} />
      <TerasSelectField label="Requires security bindings" value={draft.securityBinding} onValueChange={(value) => update("securityBinding", value)}
        options={[{ label: "Select explicitly", value: "" }, { label: "Yes", value: "true" }, { label: "No", value: "false" }]} />
      {draft.securityBinding === "true" ? <TerasTextField label="Security owner repository" value={draft.securityOwner}
        onValueChange={(value) => update("securityOwner", value)} /> : null}
      <TerasNoteField label="Owner purpose and boundary" value={draft.notes} onValueChange={(value) => update("notes", value)} />
      <TerasSelectField label="Validation posture" value={draft.validationPosture} onValueChange={(value) => update("validationPosture", value)}
        options={[{ label: "Select owner validation posture", value: "" }, ...validationPostures.map((value) => ({ label: value, value }))]} />
      <TerasSelectField label="WGCF graph role" value={draft.graphRole} onValueChange={(value) => update("graphRole", value)}
        options={[{ label: "Select graph role", value: "" }, ...["catalog-authority-source", "wgcf-runtime-source", "platform-authority-source",
          "security-authority-source", "product-runtime-source"].map((value) => ({ label: value, value }))]} />
      <TerasTextField label="Applicable catalog references (comma-separated)" value={draft.catalogRefs} onValueChange={(value) => update("catalogRefs", value)} />
      <TerasNoteField label="Owner validation explanation" value={draft.validationNotes} onValueChange={(value) => update("validationNotes", value)} />
      {runtime.error || !custody ? <TerasContentTray kicker="Preparation unavailable"
        description={runtime.error?.message ?? "The retained custody result does not prove this exact active provider repository."} /> : null}
    </TerasFieldStack>
  </TerasModalShell>;
}
