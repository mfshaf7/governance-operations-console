import type { FormEvent } from "react";

import {
  TerasActionButton,
  TerasActionRow,
  TerasAdvisorPanel,
  TerasStatusItem,
  TerasChoiceGroup,
  TerasSelectableRow,
  TerasContentTray,
  TerasMetadataList,
  TerasList,
  TerasPanelStack,
  TerasStatusPill,
  TerasTextField,
  TerasTrayStack,
  TerasWizardPanel,
} from "@/teras";

import type {
  OrchestrationDefinitionAdvisorPatch,
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignReceipt,
  OrchestrationDefinitionDesignSection,
  OrchestrationDefinitionValidationFinding,
} from "../../../../work-model/definition-design/definition-design-types.ts";
import type { DefinitionAdvisorTranscriptLine } from "./definition-advisor-context.ts";
import { definitionAdvisorPatchLabel } from "./definition-advisor-context.ts";
import {
  definitionDesignClassificationLabel,
  definitionDesignClassificationTone,
  definitionReviewSummary,
  definitionSectionCheckRows,
  qualificationCheckRows,
  requestRouteOptions,
} from "../definition-design-view-model.ts";
import type { DefinitionDesignDraftEditor } from "../use-definition-design-controller.ts";

export function DefinitionDesignSupport({
  advisor,
  draft,
  editDraft,
  findings,
  receipt,
  setSection,
}: {
  advisor: {
    applyPatch: () => void;
    onPromptChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    pendingPatch: OrchestrationDefinitionAdvisorPatch | null;
    prompt: string;
    rejectPatch: () => void;
    transcript: DefinitionAdvisorTranscriptLine[];
  };
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
  findings: OrchestrationDefinitionValidationFinding[];
  receipt: OrchestrationDefinitionDesignReceipt | null;
  setSection: (section: OrchestrationDefinitionDesignSection) => void;
}) {
  if (receipt) {
    return <DefinitionReceiptSupport receipt={receipt} />;
  }

  if (draft.activeStage === "qualify") {
    return (
      <TerasPanelStack fill="last">
        <QualificationCheckPanel draft={draft} />
        <DefinitionAdvisor advisor={advisor} draft={draft} />
      </TerasPanelStack>
    );
  }

  if (draft.activeStage === "define") {
    return (
      <TerasPanelStack fill="last">
        <DefinitionSectionCheckPanel draft={draft} setSection={setSection} />
        <DefinitionAdvisor advisor={advisor} draft={draft} />
      </TerasPanelStack>
    );
  }

  return (
    <DefinitionReviewSupport
      draft={draft}
      editDraft={editDraft}
      findings={findings}
    />
  );
}

function QualificationCheckPanel({
  draft,
}: {
  draft: OrchestrationDefinitionDesignDraft;
}) {
  const rows = qualificationCheckRows(draft);
  const ready = rows.every((row) => row.tone === "ok");

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={ready ? "ok" : "warn"}>
          {ready ? "Ready" : "Needs fields"}
        </TerasStatusPill>
      }
      description="Check only the fields required to record the execution-boundary decision."
      treatment="rail"
      fit="content"
      kicker="Qualification Check"
      title="Boundary readiness"
      tone={ready ? "ok" : "warn"}
    >
      <TerasList frame="contained">
        {rows.map((row) => (
          <TerasStatusItem
            tone={row.tone}
            detail={row.detail}
            index={row.indexLabel}
            key={row.id}
            label={row.label}
            status={row.status}
          />
        ))}
      </TerasList>
    </TerasWizardPanel>
  );
}

function DefinitionSectionCheckPanel({
  draft,
  setSection,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  setSection: (section: OrchestrationDefinitionDesignSection) => void;
}) {
  const rows = definitionSectionCheckRows(draft);
  const ready = rows.every((row) => row.tone === "ok");

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={ready ? "ok" : "warn"}>
          {ready ? "Ready" : "Drafting"}
        </TerasStatusPill>
      }
      description="Open any definition section while keeping the advisor locked to the same draft."
      treatment="rail"
      fit="content"
      kicker="Definition Check"
      title="Section readiness"
      tone={ready ? "ok" : "warn"}
    >
      <TerasList frame="contained">
        {rows.map((row) => (
          <TerasStatusItem
            ariaLabel={`Open ${row.label}`}
            tone={row.tone}
            detail={row.detail}
            index={row.indexLabel}
            key={row.id}
            label={row.label}
            onSelect={() =>
              setSection(row.id as OrchestrationDefinitionDesignSection)
            }
            selected={draft.activeSection === row.id}
            status={row.status}
          />
        ))}
      </TerasList>
    </TerasWizardPanel>
  );
}

function DefinitionAdvisor({
  advisor,
  draft,
}: {
  advisor: {
    applyPatch: () => void;
    onPromptChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    pendingPatch: OrchestrationDefinitionAdvisorPatch | null;
    prompt: string;
    rejectPatch: () => void;
    transcript: DefinitionAdvisorTranscriptLine[];
  };
  draft: OrchestrationDefinitionDesignDraft;
}) {
  return (
    <TerasAdvisorPanel
      density="compact"
      fill
      footer={
        advisor.pendingPatch ? (
          <TerasContentTray
            actions={
              <TerasActionRow spacing="tight">
                <TerasActionButton
                  onClick={advisor.rejectPatch}

                  emphasis="secondary"
                >
                  Reject
                </TerasActionButton>
                <TerasActionButton
                  onClick={advisor.applyPatch}

                  emphasis="primary"
                >
                  Apply Patch
                </TerasActionButton>
              </TerasActionRow>
            }
            description={advisor.pendingPatch.rationale}
            kicker="Pending Patch"
            title={definitionAdvisorPatchLabel(advisor.pendingPatch)}
            tone="muted"
          >
            {advisor.pendingPatch.value}
          </TerasContentTray>
        ) : undefined
      }
      profileLabel="Definition Advisor"
      prompt={{
        ariaLabel: "Definition advisor prompt",
        onChange: advisor.onPromptChange,
        onSubmit: advisor.onSubmit,
        placeholder:
          draft.activeStage === "qualify"
            ? "Ask the advisor to challenge the durable execution boundary..."
            : "Ask the advisor to challenge the active definition section...",
        rows: 2,
        value: advisor.prompt,
      }}
      statusLabel="Prototype local"
      statusTitle="Synthetic advisor only. It cannot approve, route, mutate, or activate a definition."
      statusTone="info"
      transcript={advisor.transcript}
    />
  );
}

function DefinitionReviewSupport({
  draft,
  editDraft,
  findings,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
  findings: OrchestrationDefinitionValidationFinding[];
}) {
  const review = definitionReviewSummary(draft);
  const qualificationFindingCount = findings.filter(
    (finding) => finding.section === "qualification",
  ).length;
  const routeFindingCount = findings.filter(
    (finding) => finding.section === "request-route",
  ).length;
  const definitionFindingCount =
    findings.length - qualificationFindingCount - routeFindingCount;
  const durable = draft.qualification.classification === "durable-candidate";

  return (
    <TerasTrayStack align="start" spacing="wide">
      <TerasWizardPanel
        actions={
          <TerasStatusPill tone={review.tone}>{review.status}</TerasStatusPill>
        }
        description="Review current workflow evidence before recording the final local receipt."
        treatment="rail"
        fit="content"
        kicker="Review Check"
        title={durable ? "Implementation request state" : "Qualification state"}
        tone={review.tone}
      >
        <TerasList frame="contained">
          <TerasStatusItem
            tone={qualificationFindingCount > 0 ? "warn" : "ok"}
            detail={
              qualificationFindingCount > 0
                ? `${qualificationFindingCount} qualification fields remain.`
                : "Qualification evidence is ready."
            }
            index="01"
            label="Qualification"
            status={qualificationFindingCount > 0 ? "needed" : "ready"}
          />
          {durable ? (
            <>
              <TerasStatusItem
                tone={definitionFindingCount > 0 ? "warn" : "ok"}
                detail={
                  definitionFindingCount > 0
                    ? `${definitionFindingCount} definition fields remain.`
                    : "Definition contract is ready."
                }
                index="02"
                label="Definition"
                status={definitionFindingCount > 0 ? "needed" : "ready"}
              />
              <TerasStatusItem
                tone={routeFindingCount > 0 ? "warn" : "ok"}
                detail={
                  routeFindingCount > 0
                    ? `${routeFindingCount} route decisions remain.`
                    : "Work home and operator approval are ready."
                }
                index="03"
                label="Request Route"
                status={routeFindingCount > 0 ? "needed" : "ready"}
              />
            </>
          ) : null}
        </TerasList>
      </TerasWizardPanel>

      <TerasWizardPanel
        description={
          durable
            ? "Choose the implementation work home, provide its target reference, and confirm the final operator decision."
            : "Confirm the recorded classification. No durable implementation request will be created."
        }
        treatment="rail"
        fit="content"
        kicker="Decision Action"
        title={durable ? "Route implementation packet" : "Record qualification"}
        tone={
          durable
            ? "warn"
            : definitionDesignClassificationTone(
                draft.qualification.classification,
              )
        }
      >
        {durable ? (
          <TerasTrayStack spacing="loose">
            <TerasChoiceGroup
              ariaLabel="Implementation request work home"
              frame="none"
              onSelect={(target) =>
                editDraft((next) => {
                  next.requestRoute.target =
                    target === "unassigned" ? null : target;
                })
              }
              options={[
                {
                  id: "unassigned",
                  label: "Select work home",
                  tone: "muted",
                },
                ...requestRouteOptions,
              ]}
              selectedId={draft.requestRoute.target ?? "unassigned"}
            />
            <TerasTextField
              label="Target work reference"
              onValueChange={(targetRef) =>
                editDraft((next) => {
                  next.requestRoute.targetRef = targetRef;
                })
              }
              placeholder="Proposal or Delivery ART reference"
              value={draft.requestRoute.targetRef}
            />
            <TerasSelectableRow
              detail="Approval records this prototype-local implementation request only."
              label="Final operator approval"
              onSelect={() =>
                editDraft((next) => {
                  next.requestRoute.operatorApproved =
                    !next.requestRoute.operatorApproved;
                })
              }
              selected={draft.requestRoute.operatorApproved}
              status={
                draft.requestRoute.operatorApproved ? "Approved" : "Required"
              }
              tone={draft.requestRoute.operatorApproved ? "ok" : "warn"}
            />
          </TerasTrayStack>
        ) : (
          <TerasMetadataList
            columns={1}
            items={[
              {
                label: "Classification",
                value: definitionDesignClassificationLabel(
                  draft.qualification.classification,
                ),
              },
              {
                label: "Rationale",
                value: draft.qualification.rationale,
              },
              ...(draft.qualification.classification === "conditional"
                ? [
                    {
                      label: "Reevaluate when",
                      value: draft.qualification.reevaluationCondition,
                    },
                  ]
                : []),
            ]}
          />
        )}
      </TerasWizardPanel>
    </TerasTrayStack>
  );
}

function DefinitionReceiptSupport({
  receipt,
}: {
  receipt: OrchestrationDefinitionDesignReceipt;
}) {
  return (
    <TerasWizardPanel
      actions={<TerasStatusPill tone="ok">Recorded</TerasStatusPill>}
      description="The receipt is prototype-local evidence. Runtime activation and external work-system writes remain unavailable."
      treatment="rail"
      fit="content"
      kicker="Receipt State"
      title="Local decision retained"
      tone="ok"
    >
      <TerasMetadataList
        columns={1}
        items={[
          { label: "Receipt", value: receipt.receiptId },
          { label: "Draft", value: receipt.draftId },
          { label: "Result", value: receipt.resultState },
        ]}
      />
    </TerasWizardPanel>
  );
}
