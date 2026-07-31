import {
  TerasActionButton,
  TerasActionRow,
  TerasSelectableRow,
  TerasContentTray,
  TerasFieldGrid,
  TerasFieldStack,
  TerasTextListField,
  TerasNoteField,
  TerasSelectField,
  TerasTextField,
  TerasTrayStack,
} from "@/teras";

import type {
  OrchestrationDefinitionDesignDraft,
  OrchestrationDefinitionDesignSection,
  OrchestrationExecutionNodeDraft,
} from "../../../../work-model/definition-design/definition-design-types.ts";
import type { DefinitionDesignDraftEditor } from "../use-definition-design-controller.ts";
import {
  executionNodeTypeOptions,
  supportedDispositionOptions,
} from "../definition-design-view-model.ts";

type DefineSection = Exclude<
  OrchestrationDefinitionDesignSection,
  "qualification"
>;

export function DefinitionSectionEditor({
  activeSection,
  addExecutionNode,
  draft,
  editDraft,
  removeSelectedExecutionNode,
  selectedNodeId,
  setSelectedNodeId,
}: {
  activeSection: DefineSection;
  addExecutionNode: () => void;
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
  removeSelectedExecutionNode: () => void;
  selectedNodeId: string;
  setSelectedNodeId: (nodeId: string) => void;
}) {
  switch (activeSection) {
    case "identity-ownership":
      return <IdentityOwnershipEditor draft={draft} editDraft={editDraft} />;
    case "trigger-result":
      return <TriggerResultEditor draft={draft} editDraft={editDraft} />;
    case "execution-plan":
      return (
        <ExecutionPlanEditor
          addExecutionNode={addExecutionNode}
          draft={draft}
          editDraft={editDraft}
          removeSelectedExecutionNode={removeSelectedExecutionNode}
          selectedNodeId={selectedNodeId}
          setSelectedNodeId={setSelectedNodeId}
        />
      );
    case "failure-controls":
      return <FailureControlsEditor draft={draft} editDraft={editDraft} />;
    case "evidence-security":
      return <EvidenceSecurityEditor draft={draft} editDraft={editDraft} />;
    case "delivery-versioning":
      return <DeliveryVersioningEditor draft={draft} editDraft={editDraft} />;
  }
}

function IdentityOwnershipEditor({
  draft,
  editDraft,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
}) {
  const identity = draft.identityOwnership;

  return (
    <TerasFieldStack spacing="loose">
      <TerasFieldGrid>
        <TerasTextField
          label="Definition title"
          onValueChange={(title) =>
            editDraft((next) => {
              next.identityOwnership.title = title;
            })
          }
          value={identity.title}
        />
        <TerasTextField
          label="Definition id"
          onValueChange={(definitionId) =>
            editDraft((next) => {
              next.identityOwnership.definitionId = definitionId;
            })
          }
          placeholder="domain.operation.action"
          value={identity.definitionId}
        />
      </TerasFieldGrid>
      <TerasFieldGrid>
        <TerasTextField
          label="Definition family id"
          onValueChange={(definitionFamilyId) =>
            editDraft((next) => {
              next.identityOwnership.definitionFamilyId = definitionFamilyId;
            })
          }
          placeholder="Stable family across immutable versions"
          value={identity.definitionFamilyId}
        />
        <TerasTextField
          label="Version"
          onValueChange={(version) =>
            editDraft((next) => {
              next.identityOwnership.version = version;
            })
          }
          value={identity.version}
        />
      </TerasFieldGrid>
      <TerasNoteField
        label="Purpose"
        minimumHeight="short"
        onValueChange={(purpose) =>
          editDraft((next) => {
            next.identityOwnership.purpose = purpose;
          })
        }
        value={identity.purpose}
      />
      <TerasFieldGrid>
        <TerasTextField
          label="Source domain"
          onValueChange={(sourceDomain) =>
            editDraft((next) => {
              next.identityOwnership.sourceDomain = sourceDomain;
            })
          }
          value={identity.sourceDomain}
        />
        <TerasTextField
          label="Source record type"
          onValueChange={(sourceRecordType) =>
            editDraft((next) => {
              next.identityOwnership.sourceRecordType = sourceRecordType;
            })
          }
          value={identity.sourceRecordType}
        />
      </TerasFieldGrid>
      <TerasFieldGrid>
        <TerasTextField
          label="Business owner"
          onValueChange={(businessOwner) =>
            editDraft((next) => {
              next.identityOwnership.businessOwner = businessOwner;
            })
          }
          value={identity.businessOwner}
        />
        <TerasTextField
          label="Execution owner"
          onValueChange={(executionOwner) =>
            editDraft((next) => {
              next.identityOwnership.executionOwner = executionOwner;
            })
          }
          value={identity.executionOwner}
        />
      </TerasFieldGrid>
      <TerasTextField
        label="Implementation owner repo"
        onValueChange={(implementationRepo) =>
          editDraft((next) => {
            next.identityOwnership.implementationRepo = implementationRepo;
          })
        }
        value={identity.implementationRepo}
      />
      <TerasTextListField
        description="List the component owners that execute individual nodes."
        itemLabel={(index) => `Execution owner ${index + 1}`}
        items={identity.executionNodeOwners}
        label="Execution-node owners"
        maxItems={8}
        minItems={1}
        onItemsChange={(executionNodeOwners) =>
          editDraft((next) => {
            next.identityOwnership.executionNodeOwners = executionNodeOwners;
          })
        }
        placeholder="Owner component or service"
        visibleItems={3}
      />
    </TerasFieldStack>
  );
}

function TriggerResultEditor({
  draft,
  editDraft,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
}) {
  const trigger = draft.triggerResult;

  return (
    <TerasFieldStack spacing="loose">
      <TerasFieldGrid>
        <TerasNoteField
          label="Accepted trigger"
          minimumHeight="short"
          onValueChange={(value) =>
            editDraft((next) => {
              next.triggerResult.trigger = value;
            })
          }
          value={trigger.trigger}
        />
        <TerasNoteField
          label="Completion condition"
          minimumHeight="short"
          onValueChange={(completionCondition) =>
            editDraft((next) => {
              next.triggerResult.completionCondition = completionCondition;
            })
          }
          value={trigger.completionCondition}
        />
      </TerasFieldGrid>
      <TerasFieldGrid>
        <TerasTextField
          label="Expected receipt"
          onValueChange={(expectedReceipt) =>
            editDraft((next) => {
              next.triggerResult.expectedReceipt = expectedReceipt;
            })
          }
          value={trigger.expectedReceipt}
        />
        <TerasTextField
          label="Return projection"
          onValueChange={(returnProjection) =>
            editDraft((next) => {
              next.triggerResult.returnProjection = returnProjection;
            })
          }
          value={trigger.returnProjection}
        />
      </TerasFieldGrid>
      <TerasNoteField
        label="Idempotency strategy"
        minimumHeight="short"
        onValueChange={(idempotencyStrategy) =>
          editDraft((next) => {
            next.triggerResult.idempotencyStrategy = idempotencyStrategy;
          })
        }
        value={trigger.idempotencyStrategy}
      />
      <TerasFieldGrid>
        <TerasNoteField
          label="Source lock strategy"
          minimumHeight="short"
          onValueChange={(sourceLockStrategy) =>
            editDraft((next) => {
              next.triggerResult.sourceLockStrategy = sourceLockStrategy;
            })
          }
          value={trigger.sourceLockStrategy}
        />
        <TerasNoteField
          label="Target lock strategy"
          minimumHeight="short"
          onValueChange={(targetLockStrategy) =>
            editDraft((next) => {
              next.triggerResult.targetLockStrategy = targetLockStrategy;
            })
          }
          value={trigger.targetLockStrategy}
        />
      </TerasFieldGrid>
      <TerasFieldGrid>
        <TerasTextListField
          itemLabel={(index) => `Approval requirement ${index + 1}`}
          items={trigger.approvalRequirements}
          label="Approval requirements"
          maxItems={6}
          onItemsChange={(approvalRequirements) =>
            editDraft((next) => {
              next.triggerResult.approvalRequirements = approvalRequirements;
            })
          }
          placeholder="Required approval evidence"
          visibleItems={3}
        />
        <TerasTextListField
          itemLabel={(index) => `Immutable input ${index + 1}`}
          items={trigger.immutableInputRefs}
          label="Immutable input references"
          maxItems={8}
          minItems={1}
          onItemsChange={(immutableInputRefs) =>
            editDraft((next) => {
              next.triggerResult.immutableInputRefs = immutableInputRefs;
            })
          }
          placeholder="Content-addressed packet or evidence ref"
          visibleItems={3}
        />
      </TerasFieldGrid>
    </TerasFieldStack>
  );
}

function ExecutionPlanEditor({
  addExecutionNode,
  draft,
  editDraft,
  removeSelectedExecutionNode,
  selectedNodeId,
  setSelectedNodeId,
}: {
  addExecutionNode: () => void;
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
  removeSelectedExecutionNode: () => void;
  selectedNodeId: string;
  setSelectedNodeId: (nodeId: string) => void;
}) {
  const selectedNode =
    draft.executionPlan.nodes.find((node) => node.id === selectedNodeId) ??
    null;
  const nodeOptions =
    draft.executionPlan.nodes.length > 0
      ? draft.executionPlan.nodes.map((node, index) => ({
          label: node.label || `Node ${index + 1}`,
          value: node.id,
        }))
      : [{ label: "No execution nodes", value: "" }];

  function editNode(edit: (node: OrchestrationExecutionNodeDraft) => void) {
    if (!selectedNode) {
      return;
    }

    editDraft((next) => {
      const node = next.executionPlan.nodes.find(
        (candidate) => candidate.id === selectedNode.id,
      );

      if (node) {
        edit(node);
      }
    });
  }

  return (
    <TerasFieldStack spacing="loose">
      <TerasNoteField
        label="Verified result summary"
        minimumHeight="short"
        onValueChange={(resultSummary) =>
          editDraft((next) => {
            next.executionPlan.resultSummary = resultSummary;
          })
        }
        value={draft.executionPlan.resultSummary}
      />

      <TerasContentTray
        actions={
          <TerasActionRow spacing="tight">
            <TerasActionButton
              onClick={addExecutionNode}

              emphasis="primary"
            >
              Add Node
            </TerasActionButton>
            <TerasActionButton
              disabled={!selectedNode}
              onClick={removeSelectedExecutionNode}

              emphasis="secondary"
            >
              Remove
            </TerasActionButton>
          </TerasActionRow>
        }
        description="Select one bounded node and define its owner, adapter, dependencies, and execution controls."
        kicker="Execution Node"
        title="Node editor"
      >
        <TerasTrayStack spacing="loose">
          <TerasSelectField
            disabled={draft.executionPlan.nodes.length === 0}
            label="Selected node"
            onValueChange={setSelectedNodeId}
            options={nodeOptions}
            value={selectedNodeId}
          />

          {selectedNode ? (
            <TerasFieldStack spacing="loose">
              <TerasFieldGrid>
                <TerasTextField
                  label="Node id"
                  onValueChange={(id) => {
                    const previousId = selectedNode.id;
                    editNode((node) => {
                      node.id = id;
                    });
                    if (id.trim() && id !== previousId) {
                      setSelectedNodeId(id);
                    }
                  }}
                  value={selectedNode.id}
                />
                <TerasTextField
                  label="Node label"
                  onValueChange={(label) =>
                    editNode((node) => {
                      node.label = label;
                    })
                  }
                  value={selectedNode.label}
                />
              </TerasFieldGrid>
              <TerasFieldGrid>
                <TerasSelectField
                  label="Node type"
                  onValueChange={(type) =>
                    editNode((node) => {
                      node.type = type;
                    })
                  }
                  options={[...executionNodeTypeOptions]}
                  value={selectedNode.type}
                />
                <TerasTextField
                  label="Execution owner"
                  onValueChange={(owner) =>
                    editNode((node) => {
                      node.owner = owner;
                    })
                  }
                  value={selectedNode.owner}
                />
              </TerasFieldGrid>
              <TerasFieldGrid>
                <TerasTextField
                  label="Adapter"
                  onValueChange={(adapter) =>
                    editNode((node) => {
                      node.adapter = adapter;
                    })
                  }
                  value={selectedNode.adapter}
                />
                <TerasTextField
                  label="Timeout"
                  onValueChange={(timeout) =>
                    editNode((node) => {
                      node.timeout = timeout;
                    })
                  }
                  placeholder="Example: 2m"
                  value={selectedNode.timeout}
                />
              </TerasFieldGrid>
              <TerasNoteField
                label="Idempotency rule"
                minimumHeight="short"
                onValueChange={(idempotency) =>
                  editNode((node) => {
                    node.idempotency = idempotency;
                  })
                }
                value={selectedNode.idempotency}
              />
              <TerasFieldGrid>
                <TerasTextField
                  label="Branch condition"
                  onValueChange={(branchCondition) =>
                    editNode((node) => {
                      node.branchCondition = branchCondition;
                    })
                  }
                  value={selectedNode.branchCondition}
                />
                <TerasTextField
                  label="Parallel group"
                  onValueChange={(parallelGroup) =>
                    editNode((node) => {
                      node.parallelGroup = parallelGroup;
                    })
                  }
                  value={selectedNode.parallelGroup}
                />
              </TerasFieldGrid>
              <TerasTextListField
                itemLabel={(index) => `Dependency ${index + 1}`}
                items={selectedNode.dependencies}
                label="Dependencies"
                maxItems={8}
                onItemsChange={(dependencies) =>
                  editNode((node) => {
                    node.dependencies = dependencies;
                  })
                }
                placeholder="Required node id"
                visibleItems={3}
              />
              <TerasSelectableRow
                detail="Optional nodes require an explicit skip rule."
                label="Optional node"
                onSelect={() =>
                  editNode((node) => {
                    node.optional = !node.optional;
                  })
                }
                selected={selectedNode.optional}
                status={selectedNode.optional ? "Optional" : "Required"}
                tone={selectedNode.optional ? "warn" : "info"}
              />
              {selectedNode.optional ? (
                <TerasNoteField
                  label="Skip rule"
                  minimumHeight="short"
                  onValueChange={(skipReason) =>
                    editNode((node) => {
                      node.skipReason = skipReason;
                    })
                  }
                  value={selectedNode.skipReason}
                />
              ) : null}
            </TerasFieldStack>
          ) : null}
        </TerasTrayStack>
      </TerasContentTray>
    </TerasFieldStack>
  );
}

function FailureControlsEditor({
  draft,
  editDraft,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
}) {
  const failure = draft.failureControls;

  return (
    <TerasFieldStack spacing="loose">
      <TerasFieldGrid>
        <TerasNoteField
          label="Retry policy"
          minimumHeight="short"
          onValueChange={(retryPolicy) =>
            editDraft((next) => {
              next.failureControls.retryPolicy = retryPolicy;
            })
          }
          value={failure.retryPolicy}
        />
        <TerasNoteField
          label="Retry exhaustion"
          minimumHeight="short"
          onValueChange={(retryExhaustion) =>
            editDraft((next) => {
              next.failureControls.retryExhaustion = retryExhaustion;
            })
          }
          value={failure.retryExhaustion}
        />
      </TerasFieldGrid>
      <TerasFieldGrid>
        <TerasNoteField
          label="Terminal failure condition"
          minimumHeight="short"
          onValueChange={(terminalFailureCondition) =>
            editDraft((next) => {
              next.failureControls.terminalFailureCondition =
                terminalFailureCondition;
            })
          }
          value={failure.terminalFailureCondition}
        />
        <TerasNoteField
          label="Operator remediation"
          minimumHeight="short"
          onValueChange={(operatorRemediation) =>
            editDraft((next) => {
              next.failureControls.operatorRemediation = operatorRemediation;
            })
          }
          value={failure.operatorRemediation}
        />
      </TerasFieldGrid>
      <TerasFieldGrid>
        <TerasNoteField
          label="Cancellation boundary"
          minimumHeight="short"
          onValueChange={(cancellationBoundary) =>
            editDraft((next) => {
              next.failureControls.cancellationBoundary = cancellationBoundary;
            })
          }
          value={failure.cancellationBoundary}
        />
        <TerasNoteField
          label="Compensation strategy"
          minimumHeight="short"
          onValueChange={(compensationStrategy) =>
            editDraft((next) => {
              next.failureControls.compensationStrategy = compensationStrategy;
            })
          }
          value={failure.compensationStrategy}
        />
      </TerasFieldGrid>
      <TerasTextListField
        itemLabel={(index) => `Signal ${index + 1}`}
        items={failure.signalAvailability}
        label="Available signals"
        maxItems={8}
        onItemsChange={(signalAvailability) =>
          editDraft((next) => {
            next.failureControls.signalAvailability = signalAvailability;
          })
        }
        placeholder="Signal name or explicit none"
        visibleItems={3}
      />
      <TerasContentTray
        description="Select only dispositions the workflow can support without bypassing authority or canonical verification."
        kicker="Blocker Handling"
        title="Supported dispositions"
      >
        <TerasFieldGrid>
          {supportedDispositionOptions.map((option) => {
            const selected = failure.supportedDispositions.includes(option.id);

            return (
              <TerasSelectableRow
                key={option.id}
                label={option.label}
                onSelect={() =>
                  editDraft((next) => {
                    next.failureControls.supportedDispositions = selected
                      ? next.failureControls.supportedDispositions.filter(
                          (entry) => entry !== option.id,
                        )
                      : [
                          ...next.failureControls.supportedDispositions,
                          option.id,
                        ];
                  })
                }
                selected={selected}
                status={selected ? "Supported" : "Not supported"}
                tone={selected ? option.tone : "muted"}
              />
            );
          })}
        </TerasFieldGrid>
      </TerasContentTray>
    </TerasFieldStack>
  );
}

function EvidenceSecurityEditor({
  draft,
  editDraft,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
}) {
  const evidence = draft.evidenceSecurity;

  return (
    <TerasFieldStack spacing="loose">
      <TerasFieldGrid>
        <TerasNoteField
          label="Correlation strategy"
          minimumHeight="short"
          onValueChange={(correlationStrategy) =>
            editDraft((next) => {
              next.evidenceSecurity.correlationStrategy = correlationStrategy;
            })
          }
          value={evidence.correlationStrategy}
        />
        <TerasNoteField
          label="Causation strategy"
          minimumHeight="short"
          onValueChange={(causationStrategy) =>
            editDraft((next) => {
              next.evidenceSecurity.causationStrategy = causationStrategy;
            })
          }
          value={evidence.causationStrategy}
        />
      </TerasFieldGrid>
      <TerasNoteField
        label="Approval attribution"
        minimumHeight="short"
        onValueChange={(approvalAttribution) =>
          editDraft((next) => {
            next.evidenceSecurity.approvalAttribution = approvalAttribution;
          })
        }
        value={evidence.approvalAttribution}
      />
      <TerasFieldGrid>
        <TerasTextField
          label="Sensitive data classification"
          onValueChange={(sensitiveDataClassification) =>
            editDraft((next) => {
              next.evidenceSecurity.sensitiveDataClassification =
                sensitiveDataClassification;
            })
          }
          value={evidence.sensitiveDataClassification}
        />
        <TerasTextField
          label="Redaction policy"
          onValueChange={(redactionPolicy) =>
            editDraft((next) => {
              next.evidenceSecurity.redactionPolicy = redactionPolicy;
            })
          }
          value={evidence.redactionPolicy}
        />
      </TerasFieldGrid>
      <TerasNoteField
        label="Retention policy"
        minimumHeight="short"
        onValueChange={(retentionPolicy) =>
          editDraft((next) => {
            next.evidenceSecurity.retentionPolicy = retentionPolicy;
          })
        }
        value={evidence.retentionPolicy}
      />
      <TerasFieldGrid>
        <TerasTextListField
          itemLabel={(index) => `Event requirement ${index + 1}`}
          items={evidence.eventRequirements}
          label="Event requirements"
          maxItems={8}
          minItems={1}
          onItemsChange={(eventRequirements) =>
            editDraft((next) => {
              next.evidenceSecurity.eventRequirements = eventRequirements;
            })
          }
          visibleItems={3}
        />
        <TerasTextListField
          itemLabel={(index) => `Evidence reference ${index + 1}`}
          items={evidence.evidenceReferences}
          label="Evidence references"
          maxItems={8}
          minItems={1}
          onItemsChange={(evidenceReferences) =>
            editDraft((next) => {
              next.evidenceSecurity.evidenceReferences = evidenceReferences;
            })
          }
          visibleItems={3}
        />
      </TerasFieldGrid>
      <TerasFieldGrid>
        <TerasTextListField
          itemLabel={(index) => `Credential reference ${index + 1}`}
          items={evidence.credentialReferences}
          label="Credential references"
          maxItems={6}
          onItemsChange={(credentialReferences) =>
            editDraft((next) => {
              next.evidenceSecurity.credentialReferences = credentialReferences;
            })
          }
          placeholder="Reference only, never a secret value"
          visibleItems={3}
        />
        <TerasTextListField
          itemLabel={(index) => `Security trigger ${index + 1}`}
          items={evidence.securityReviewTriggers}
          label="Security review triggers"
          maxItems={8}
          minItems={1}
          onItemsChange={(securityReviewTriggers) =>
            editDraft((next) => {
              next.evidenceSecurity.securityReviewTriggers =
                securityReviewTriggers;
            })
          }
          placeholder="Trigger or explicit not-required rationale"
          visibleItems={3}
        />
      </TerasFieldGrid>
    </TerasFieldStack>
  );
}

function DeliveryVersioningEditor({
  draft,
  editDraft,
}: {
  draft: OrchestrationDefinitionDesignDraft;
  editDraft: DefinitionDesignDraftEditor;
}) {
  const delivery = draft.deliveryVersioning;
  const update = (
    field: keyof OrchestrationDefinitionDesignDraft["deliveryVersioning"],
    value: string,
  ) =>
    editDraft((next) => {
      next.deliveryVersioning[field] = value;
    });

  return (
    <TerasFieldStack spacing="loose">
      <TerasContentTray
        description="Define the proof required before an immutable version can be admitted."
        kicker="Validation"
        title="Definition test plan"
      >
        <TerasFieldStack spacing="loose">
          <TerasFieldGrid>
            <TerasNoteField
              label="Replay tests"
              minimumHeight="short"
              onValueChange={(value) => update("workflowReplayTests", value)}
              value={delivery.workflowReplayTests}
            />
            <TerasNoteField
              label="Idempotency tests"
              minimumHeight="short"
              onValueChange={(value) => update("idempotencyTests", value)}
              value={delivery.idempotencyTests}
            />
          </TerasFieldGrid>
          <TerasFieldGrid>
            <TerasNoteField
              label="Failure injection tests"
              minimumHeight="short"
              onValueChange={(value) => update("failureInjectionTests", value)}
              value={delivery.failureInjectionTests}
            />
            <TerasNoteField
              label="Timeout tests"
              minimumHeight="short"
              onValueChange={(value) => update("timeoutTests", value)}
              value={delivery.timeoutTests}
            />
          </TerasFieldGrid>
          <TerasFieldGrid>
            <TerasNoteField
              label="Cancellation tests"
              minimumHeight="short"
              onValueChange={(value) => update("cancellationTests", value)}
              value={delivery.cancellationTests}
            />
            <TerasNoteField
              label="Signal tests"
              minimumHeight="short"
              onValueChange={(value) => update("signalTests", value)}
              value={delivery.signalTests}
            />
          </TerasFieldGrid>
        </TerasFieldStack>
      </TerasContentTray>
      <TerasContentTray
        description="Keep adoption, rollback, compatibility, suspension, and retirement explicit."
        kicker="Lifecycle"
        title="Delivery and version controls"
      >
        <TerasFieldStack spacing="loose">
          <TerasFieldGrid>
            <TerasNoteField
              label="Rollout plan"
              minimumHeight="short"
              onValueChange={(value) => update("rolloutPlan", value)}
              value={delivery.rolloutPlan}
            />
            <TerasNoteField
              label="Rollback plan"
              minimumHeight="short"
              onValueChange={(value) => update("rollbackPlan", value)}
              value={delivery.rollbackPlan}
            />
          </TerasFieldGrid>
          <TerasFieldGrid>
            <TerasNoteField
              label="Compatibility plan"
              minimumHeight="short"
              onValueChange={(value) => update("compatibilityPlan", value)}
              value={delivery.compatibilityPlan}
            />
            <TerasNoteField
              label="Suspension plan"
              minimumHeight="short"
              onValueChange={(value) => update("suspensionPlan", value)}
              value={delivery.suspensionPlan}
            />
          </TerasFieldGrid>
          <TerasNoteField
            label="Retirement plan"
            minimumHeight="short"
            onValueChange={(value) => update("retirementPlan", value)}
            value={delivery.retirementPlan}
          />
        </TerasFieldStack>
      </TerasContentTray>
    </TerasFieldStack>
  );
}
