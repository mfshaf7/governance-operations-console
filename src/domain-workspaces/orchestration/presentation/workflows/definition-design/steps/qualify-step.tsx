import {
  TerasChoiceGroup,
  TerasSelectableRow,
  TerasContentTray,
  TerasFieldGrid,
  TerasFieldStack,
  TerasNoteField,
  TerasStatusPill,
  TerasTextField,
  TerasWizardPanel,
} from "@/teras";

import type { OrchestrationQualificationDraft } from "../../../../work-model/definition-design/definition-design-types.ts";
import type { DefinitionDesignDraftEditor } from "../use-definition-design-controller.ts";
import {
  definitionDesignClassificationTone,
  qualificationDecisionOptions,
} from "../definition-design-view-model.ts";

const durabilitySignals: Array<{
  detail: string;
  field:
    | "cancellationRequired"
    | "correlatedHistoryRequired"
    | "durableRetryRequired"
    | "externalWaitRequired"
    | "nonAtomicEffects"
    | "reconciliationRequired"
    | "restartSurvivalRequired";
  label: string;
}> = [
  {
    detail: "Execution must survive process or session loss.",
    field: "restartSurvivalRequired",
    label: "Restart survival",
  },
  {
    detail: "Execution waits for an external event or approval.",
    field: "externalWaitRequired",
    label: "External wait",
  },
  {
    detail: "Retries must continue beyond one request boundary.",
    field: "durableRetryRequired",
    label: "Durable retry",
  },
  {
    detail: "Cancellation must be recorded across execution nodes.",
    field: "cancellationRequired",
    label: "Cancellation",
  },
  {
    detail: "Partial effects require explicit reconciliation.",
    field: "reconciliationRequired",
    label: "Reconciliation",
  },
  {
    detail: "Material actions need one correlated event history.",
    field: "correlatedHistoryRequired",
    label: "Correlated history",
  },
  {
    detail: "The operation crosses non-atomic effect owners.",
    field: "nonAtomicEffects",
    label: "Non-atomic effects",
  },
];

export function DefinitionQualifyStep({
  draft,
  editDraft,
}: {
  draft: OrchestrationQualificationDraft;
  editDraft: DefinitionDesignDraftEditor;
}) {
  const classificationTone = definitionDesignClassificationTone(
    draft.classification,
  );

  function editQualification(
    edit: (qualification: OrchestrationQualificationDraft) => void,
  ) {
    editDraft((next) => edit(next.qualification));
  }

  return (
    <TerasWizardPanel
      actions={
        <TerasStatusPill tone={classificationTone}>
          {draft.classification ? "Decision selected" : "Decision needed"}
        </TerasStatusPill>
      }
      description="Capture the backend execution boundary before deciding whether durable orchestration is justified."
      kicker="Qualification Work"
      title="Backend operation qualification"
    >
      <TerasFieldStack spacing="loose">
        <TerasFieldGrid>
          <TerasTextField
            label="Operation title"
            onValueChange={(title) =>
              editQualification((next) => {
                next.title = title;
              })
            }
            placeholder="Example: Repository onboarding fulfillment"
            value={draft.title}
          />
          <TerasTextField
            label="Execution owner"
            onValueChange={(executionOwner) =>
              editQualification((next) => {
                next.executionOwner = executionOwner;
              })
            }
            placeholder="Accountable backend owner"
            value={draft.executionOwner}
          />
        </TerasFieldGrid>

        <TerasFieldGrid>
          <TerasTextField
            label="Source domain"
            onValueChange={(sourceDomain) =>
              editQualification((next) => {
                next.sourceDomain = sourceDomain;
              })
            }
            placeholder="Owning operation or product domain"
            value={draft.sourceDomain}
          />
          <TerasTextField
            label="Source record or command"
            onValueChange={(sourceRecordType) =>
              editQualification((next) => {
                next.sourceRecordType = sourceRecordType;
              })
            }
            placeholder="Accepted request type"
            value={draft.sourceRecordType}
          />
        </TerasFieldGrid>

        <TerasNoteField
          label="Execution problem"
          minimumHeight="short"
          onValueChange={(executionProblem) =>
            editQualification((next) => {
              next.executionProblem = executionProblem;
            })
          }
          placeholder="State the backend outcome and the boundary that makes it operationally significant."
          value={draft.executionProblem}
        />

        <TerasFieldGrid>
          <TerasNoteField
            label="Accepted trigger"
            minimumHeight="short"
            onValueChange={(trigger) =>
              editQualification((next) => {
                next.trigger = trigger;
              })
            }
            placeholder="What accepted source action starts execution?"
            value={draft.trigger}
          />
          <TerasNoteField
            label="Completion condition"
            minimumHeight="short"
            onValueChange={(completionCondition) =>
              editQualification((next) => {
                next.completionCondition = completionCondition;
              })
            }
            placeholder="What canonical result proves completion?"
            value={draft.completionCondition}
          />
        </TerasFieldGrid>

        <TerasNoteField
          label="Bounded synchronous alternative"
          minimumHeight="short"
          onValueChange={(synchronousAlternative) =>
            editQualification((next) => {
              next.synchronousAlternative = synchronousAlternative;
            })
          }
          placeholder="Explain why one bounded command is sufficient or where it stops being sufficient."
          value={draft.synchronousAlternative}
        />

        <TerasContentTray
          description="Select only requirements that the backend execution genuinely carries."
          kicker="Durability Signals"
          title="Execution characteristics"
        >
          <TerasFieldGrid>
            {durabilitySignals.map((signal) => (
              <TerasSelectableRow
                detail={signal.detail}
                key={signal.field}
                label={signal.label}
                onSelect={() =>
                  editQualification((next) => {
                    next[signal.field] = !next[signal.field];
                  })
                }
                selected={draft[signal.field]}
                status={draft[signal.field] ? "Required" : "Not required"}
                tone={draft[signal.field] ? "warn" : "muted"}
              />
            ))}
          </TerasFieldGrid>
        </TerasContentTray>

        <TerasChoiceGroup
          ariaLabel="Qualification decision"
          frame="tray"
          label="Qualification decision"
          onSelect={(classification) =>
            editQualification((next) => {
              next.classification =
                classification === "unassigned" ? null : classification;
            })
          }
          options={qualificationDecisionOptions}
          selectedId={draft.classification ?? "unassigned"}
        />

        <TerasNoteField
          label="Decision rationale"
          minimumHeight="short"
          onValueChange={(rationale) =>
            editQualification((next) => {
              next.rationale = rationale;
            })
          }
          placeholder="Record why this classification is correct for the accepted execution boundary."
          value={draft.rationale}
        />

        {draft.classification === "conditional" ? (
          <TerasNoteField
            label="Reevaluation condition"
            minimumHeight="short"
            onValueChange={(reevaluationCondition) =>
              editQualification((next) => {
                next.reevaluationCondition = reevaluationCondition;
              })
            }
            placeholder="State the condition that would require durable orchestration."
            value={draft.reevaluationCondition}
          />
        ) : null}
      </TerasFieldStack>
    </TerasWizardPanel>
  );
}
