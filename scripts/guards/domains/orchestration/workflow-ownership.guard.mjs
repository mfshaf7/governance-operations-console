import {
  assertAppFile,
  assertAppPathAbsent,
  assertIncludes,
  assertOmits,
  assertRepoIncludes,
} from "../../guard-lib.mjs";

const orchestrationRoot = "src/domain-workspaces/orchestration";
const workflowRoot =
  `${orchestrationRoot}/presentation/workflows/definition-design`;
const orchestrationContract =
  "docs/product/domain-contracts/orchestration.md";

export const guard = {
  id: "orchestration/workflow-ownership",
  run() {
    const failures = [];
    const workflow = `${workflowRoot}/definition-design-workflow.tsx`;
    const controller = `${workflowRoot}/use-definition-design-controller.ts`;
    const support = `${workflowRoot}/support/definition-design-support.tsx`;
    const review = `${workflowRoot}/steps/review-request-step.tsx`;

    assertRepoIncludes(failures, orchestrationContract, [
      "A durable candidate uses three stages",
      "classifications use a two-stage",
      "The final stage becomes the receipt surface",
      "no fourth result step",
      "draft-versus-baseline comparison",
    ]);

    for (const requiredPath of [
      workflow,
      `${workflowRoot}/definition-design-view-model.ts`,
      controller,
      `${workflowRoot}/steps/qualify-step.tsx`,
      `${workflowRoot}/steps/define-step.tsx`,
      review,
      `${workflowRoot}/support/definition-advisor-context.ts`,
      support,
      `${workflowRoot}/support/definition-section-editor.tsx`,
    ]) {
      assertAppFile(failures, requiredPath);
    }

    assertIncludes(failures, workflow, [
      "TerasWizardModal",
      "DefinitionQualifyStep",
      "DefinitionDefineStep",
      "DefinitionReviewRequestStep",
      "DefinitionDesignSupport",
      "TerasDraftCloseGuardDialog",
    ]);
    assertIncludes(failures, controller, [
      "loadOrchestrationDefinitionDraft",
      "saveOrchestrationDefinitionDraft",
      "orchestrationDefinitionDesignIsDirty",
      "recordOrchestrationImplementationRequest",
      "recordOrchestrationQualification",
      "closeGuardOpen",
    ]);
    assertIncludes(failures, support, [
      'draft.activeStage === "qualify"',
      'draft.activeStage === "define"',
      "DefinitionAdvisor",
      "DefinitionReviewSupport",
    ]);
    assertOmits(failures, review, ["TerasAdvisorPanel", "DefinitionAdvisor"]);

    for (const internalBarrel of [
      `${workflowRoot}/index.ts`,
      `${workflowRoot}/steps/index.ts`,
      `${workflowRoot}/support/index.ts`,
    ]) {
      assertAppPathAbsent(
        failures,
        internalBarrel,
        "Definition-design internals use concrete ownership imports",
      );
    }

    return failures;
  },
};

export default guard;
