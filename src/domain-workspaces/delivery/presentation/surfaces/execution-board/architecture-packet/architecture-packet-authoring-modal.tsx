"use client";

import { useMemo, useState } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasEmptyState,
  TerasFieldStack,
  TerasList,
  TerasMetadataList,
  TerasModalShell,
  TerasNoteField,
  TerasPanel,
  TerasPanelHeader,
  TerasSignalItem,
  TerasTextField,
  TerasTextListField,
  TerasZone,
  TerasZoneLayout,
} from "@/teras";
import { useArchitecturePacketLiveRuntime } from "../../../../live-runtime/use-architecture-packet-live-runtime.ts";
import type {
  ArchitecturePacketArtifact,
  ArchitecturePacketCurrentResult,
  ArchitecturePacketDraftResult,
  ArchitecturePacketPersistResult,
} from "../../../../live-runtime/architecture-packet-live-types.ts";
import {
  architecturePacketEditorFromArtifact,
  architecturePacketEditorIssues,
  architecturePacketInputFromEditor,
  emptyArchitecturePacketEditor,
  type ArchitecturePacketEditor,
} from "./architecture-packet-editor-model.ts";

export function ArchitecturePacketAuthoringModal({
  defaultDeliveryId,
  defaultWorkItemId,
  onClose,
}: {
  defaultDeliveryId: string | null;
  defaultWorkItemId: number | null;
  onClose: () => void;
}) {
  const runtime = useArchitecturePacketLiveRuntime();
  const [editor, setEditor] = useState(() =>
    emptyArchitecturePacketEditor({
      deliveryId: defaultDeliveryId ?? "",
      workItemId: defaultWorkItemId,
    }),
  );
  const [current, setCurrent] = useState<ArchitecturePacketCurrentResult | null>(null);
  const [validated, setValidated] = useState<ArchitecturePacketDraftResult | null>(null);
  const [approved, setApproved] = useState<ArchitecturePacketDraftResult | null>(null);
  const [persisted, setPersisted] = useState<ArchitecturePacketPersistResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const draftIssues = useMemo(
    () => architecturePacketEditorIssues(editor, "draft"),
    [editor],
  );
  const approvalIssues = useMemo(
    () => architecturePacketEditorIssues(editor, "architecture-ready"),
    [editor],
  );
  const candidate = approved?.architecture_packet ?? validated?.architecture_packet ?? null;

  function edit(update: (current: ArchitecturePacketEditor) => ArchitecturePacketEditor) {
    setEditor(update);
    setValidated(null);
    setApproved(null);
    setPersisted(null);
    setError(null);
  }

  async function run(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Architecture Packet request failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function inspectCurrent() {
    const deliveryId = editor.deliveryId.trim();
    if (!/^delivery-[1-9][0-9]*$/.test(deliveryId)) {
      throw new Error("Enter a Delivery identity such as delivery-1275 first.");
    }
    const snapshot = await runtime.inspectCurrent(deliveryId);
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-current") {
      throw new Error("OOS did not return a current Architecture Packet.");
    }
    setCurrent(result);
  }

  async function validateDraft() {
    const snapshot = await runtime.draft(
      architecturePacketInputFromEditor(editor, "draft"),
    );
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-draft") {
      throw new Error("OOS did not return a validated Architecture Packet draft.");
    }
    setValidated(result);
    setApproved(null);
    setPersisted(null);
  }

  async function approveCandidate() {
    const snapshot = await runtime.draft(
      architecturePacketInputFromEditor(editor, "architecture-ready"),
    );
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-draft") {
      throw new Error("OOS did not return an operator-approved Architecture Packet.");
    }
    if (result.architecture_packet.decision.status !== "architecture-ready") {
      throw new Error("OOS did not preserve the architecture-ready decision.");
    }
    setApproved(result);
    setPersisted(null);
  }

  async function persistCandidate() {
    if (!approved) throw new Error("Approve the exact candidate before persistence.");
    const snapshot = await runtime.persist(approved.architecture_packet);
    const result = snapshot.result;
    if (!result || result.workflow_id !== "delivery-art-architecture-packet-persist") {
      throw new Error("OOS did not return durable Architecture Packet custody.");
    }
    setPersisted(result);
  }

  return (
    <TerasModalShell
      bodyLayout="scroll"
      description="Author, validate, approve, and persist one schema-v6 packet through OOS and WGCF without giving the browser identity or custody authority."
      footer={
        <TerasActionButton emphasis="secondary" onClick={onClose}>
          Back to Execution Board
        </TerasActionButton>
      }
      height="fill"
      kicker="Delivery Architecture"
      onClose={onClose}
      surfaceId="delivery-architecture-packet-authoring"
      title="Architecture Packet"
      width="viewport"
    >
      <TerasZoneLayout variant="main-aside">
        <TerasZone fit="fill">
          <TerasPanel frame="padded" layout="header-body" tone="info" treatment="state">
            <TerasPanelHeader
              description="The Console sends only editable design intent. OOS binds fresh ART truth and the server-held operator before returning a local candidate."
              kicker="Step 1"
              title="Author and validate"
            />
            <TerasFieldStack spacing="normal">
              <TerasTextField
                label="Delivery identity"
                onValueChange={(deliveryId) => edit((value) => ({ ...value, deliveryId }))}
                placeholder="delivery-1275"
                value={editor.deliveryId}
              />
              <TerasTextListField
                addLabel="Add covered work item"
                itemLabel={(index) => `Covered work item ${index + 1}`}
                items={editor.coveredWorkItemIds}
                label="Covered work items"
                maxItems={50}
                minItems={1}
                onItemsChange={(coveredWorkItemIds) =>
                  edit((value) => ({ ...value, coveredWorkItemIds }))
                }
                placeholder="work-item-1284"
                visibleItems={4}
              />
              <TerasNoteField
                label="Repository revisions (JSON array)"
                minimumHeight="tall"
                onValueChange={(repoRevisionsJson) =>
                  edit((value) => ({ ...value, repoRevisionsJson }))
                }
                spellCheck={false}
                value={editor.repoRevisionsJson}
              />
              <TerasNoteField
                label="Architecture design (JSON object)"
                minimumHeight="tall"
                onValueChange={(architectureJson) =>
                  edit((value) => ({ ...value, architectureJson }))
                }
                spellCheck={false}
                value={editor.architectureJson}
              />
              <TerasNoteField
                label="Conformance plan (JSON object)"
                minimumHeight="tall"
                onValueChange={(conformanceJson) =>
                  edit((value) => ({ ...value, conformanceJson }))
                }
                spellCheck={false}
                value={editor.conformanceJson}
              />
              <TerasNoteField
                label="Operator rationale"
                minimumHeight="short"
                onValueChange={(rationale) => edit((value) => ({ ...value, rationale }))}
                value={editor.rationale}
              />
            </TerasFieldStack>
          </TerasPanel>

          {candidate ? (
            <TerasPanel frame="padded" layout="header-body" tone="info" treatment="state">
              <TerasPanelHeader
                description="This is the exact OOS-authored local candidate. Editing any input invalidates it and requires fresh validation."
                kicker="Step 2"
                statusLabel={approved ? "Operator approved" : "Validated draft"}
                statusTone={approved ? "ok" : "info"}
                title="Review canonical candidate"
              />
              <TerasMetadataList items={candidateMetadata(candidate)} />
              <TerasNoteField
                aria-label="Canonical Architecture Packet JSON"
                fill
                label="Canonical packet"
                onValueChange={() => undefined}
                readOnly
                spellCheck={false}
                value={JSON.stringify(candidate, null, 2)}
              />
            </TerasPanel>
          ) : null}

          {persisted ? (
            <TerasPanel frame="padded" layout="header-body" tone="ok" treatment="state">
              <TerasPanelHeader
                description="WGCF custody and OOS owner evidence now bind the accepted packet."
                kicker="Step 3"
                statusLabel="Durable"
                statusTone="ok"
                title="Architecture Packet persisted"
              />
              <TerasMetadataList items={candidateMetadata(persisted.artifact)} />
              <TerasNoteField
                label="Custody receipt"
                minimumHeight="short"
                onValueChange={() => undefined}
                readOnly
                spellCheck={false}
                value={JSON.stringify(persisted.custody_receipt, null, 2)}
              />
              <TerasNoteField
                label="OOS owner receipt"
                minimumHeight="short"
                onValueChange={() => undefined}
                readOnly
                spellCheck={false}
                value={JSON.stringify(persisted.owner_receipt, null, 2)}
              />
            </TerasPanel>
          ) : null}
        </TerasZone>

        <TerasZone fit="content">
          <TerasPanel
            frame="padded"
            layout="header-body"
            tone={error ? "danger" : persisted ? "ok" : "info"}
            treatment="rail"
          >
            <TerasPanelHeader
              description={
                error ??
                "Validation, approval, and custody remain separate visible transitions."
              }
              kicker="Current move"
              statusLabel={runtime.mode ?? "Connecting"}
              statusTone={error ? "danger" : "info"}
              title={persisted ? "Packet is durable" : "Complete the packet"}
            />
            <TerasList frame="contained">
              <TerasSignalItem
                actions={
                  <TerasActionButton
                    disabled={submitting}
                    emphasis="secondary"
                    onClick={() => run(inspectCurrent)}
                  >
                    Inspect Current
                  </TerasActionButton>
                }
                detail="Read the current immutable packet and its custody posture from OOS."
                label="Read-only"
                title="Inspect canonical starting point"
                tone="info"
              />
              <TerasSignalItem
                actions={
                  <TerasActionButton
                    disabled={submitting || draftIssues.length > 0 || runtime.mode === "disconnected-preview"}
                    onClick={() => run(validateDraft)}
                  >
                    Validate Draft
                  </TerasActionButton>
                }
                detail={
                  draftIssues[0] ?? "Capture fresh ART truth and author a local schema-v6 candidate."
                }
                label={draftIssues.length > 0 ? "Blocked" : "Ready"}
                title="Author through OOS"
                tone={draftIssues.length > 0 ? "warn" : "info"}
              />
              <TerasSignalItem
                actions={
                  <TerasActionButton
                    disabled={
                      submitting ||
                      !validated ||
                      approvalIssues.length > 0 ||
                      runtime.mode === "disconnected-preview"
                    }
                    onClick={() => run(approveCandidate)}
                  >
                    Approve Candidate
                  </TerasActionButton>
                }
                detail={
                  approvalIssues[0] ??
                  "Re-author the exact reviewed input with the accountable operator decision."
                }
                label={approved ? "Approved" : validated ? "Operator action" : "Waiting"}
                title="Record architecture-ready decision"
                tone={approved ? "ok" : validated ? "info" : "warn"}
              />
              <TerasSignalItem
                actions={
                  <TerasActionButton
                    disabled={submitting || !approved || Boolean(persisted)}
                    onClick={() => run(persistCandidate)}
                  >
                    Persist Approved Packet
                  </TerasActionButton>
                }
                detail="Submit the exact approved candidate; OOS rechecks freshness and WGCF owns durable custody."
                label={persisted ? "Complete" : approved ? "Ready" : "Waiting"}
                title="Persist canonical packet"
                tone={persisted ? "ok" : approved ? "info" : "warn"}
              />
            </TerasList>
          </TerasPanel>

          {current ? (
            <TerasPanel frame="padded" layout="header-body" tone="info" treatment="state">
              <TerasPanelHeader
                description="Use this immutable packet as the editable starting point only when supersession is intended."
                kicker="Current packet"
                statusLabel={current.contract_posture}
                statusTone="info"
                title="Canonical readback"
              />
              <TerasMetadataList items={candidateMetadata(current.artifact)} />
              <TerasActionRow>
                <TerasActionButton
                  disabled={current.contract_posture !== "current"}
                  emphasis="secondary"
                  onClick={() => {
                    edit(() => architecturePacketEditorFromArtifact(current.artifact));
                    setCurrent(current);
                  }}
                >
                  Use as Starting Point
                </TerasActionButton>
              </TerasActionRow>
            </TerasPanel>
          ) : runtime.mode === "disconnected-preview" ? (
            <TerasEmptyState>
              Architecture authoring is unavailable in disconnected preview. No fixture packet will be persisted.
            </TerasEmptyState>
          ) : null}

          {draftIssues.length > 1 ? (
            <TerasPanel frame="padded" layout="header-body" tone="warn" treatment="state">
              <TerasPanelHeader
                description="Every missing ownership, topology, evidence, gate, and decision input remains visible before OOS is called."
                kicker="Input blockers"
                title={`${draftIssues.length} issues remain`}
              />
              <TerasList frame="contained">
                {draftIssues.map((issue) => (
                  <TerasSignalItem
                    detail={issue}
                    key={issue}
                    label="Required"
                    title="Incomplete packet input"
                    tone="warn"
                  />
                ))}
              </TerasList>
            </TerasPanel>
          ) : null}
        </TerasZone>
      </TerasZoneLayout>
    </TerasModalShell>
  );
}

function candidateMetadata(artifact: ArchitecturePacketArtifact) {
  return [
    { label: "Artifact", value: artifact.artifact_id },
    { label: "Delivery", value: artifact.delivery_id },
    { label: "Decision", value: artifact.decision.status },
    { label: "Operator", value: artifact.operator.id },
    { label: "Covered scope", value: `${artifact.covered_work_item_ids.length} work items` },
    { label: "Digest", value: artifact.integrity.content_digest },
    { label: "Custody", value: artifact.custody.state },
  ];
}
