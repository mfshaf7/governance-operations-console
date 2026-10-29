"use client";

import { useEffect, useMemo, useState } from "react";
import { SavedWorkBoundary, SavedWorkStatus } from "@/console-integration/saved-work/saved-work-boundary";

import type { DeliveryPackageSummary } from "../../../../read-model/index.ts";
import type { WorkDesignApplyReceipt } from "../../../../work-model/work-design/work-design-types.ts";

import { useWorkDesignSessionController } from "../session-controller/use-work-design-session-controller.ts";
import { WorkDesignSessionDialogs } from "./work-design-session-dialogs.tsx";
import { WorkDesignSessionFooter } from "./work-design-session-footer.tsx";
import { TerasModalShell, TerasDialog, TerasEmptyState, TerasActionButton } from "@/teras";
import { loadWorkDesignSessionDraft } from "../../../../local-runtime/index.ts";
import { normalizeWorkDesignPersistedSession } from "../../../../local-runtime/persistence/work-design-session-persistence.ts";
import { useDeliveryChangeLiveRuntime } from "../../../../live-runtime/use-delivery-change-live-runtime.ts";
import { deliveryHistoryDesignTree } from "../../../../live-runtime/delivery-history-tree.ts";
import type { WorkDesignNode } from "../model/work-design-model.ts";
import { WorkDesignSessionStepRouter } from "./work-design-session-step-router.tsx";

type DeliveryWorkDesignWorkflow = {
  deliveryPackage: DeliveryPackageSummary;
};

type WorkDesignModalProps = {
  readOnly?: boolean;
  onApplied?: (record: WorkDesignApplyReceipt) => void;
  onClose: () => void;
  workflow: DeliveryWorkDesignWorkflow;
};

export function DeliveryWorkDesignSessionModal(props: WorkDesignModalProps) {
  return <SavedWorkBoundary storageKey={`delivery-work-design-session:${props.workflow.deliveryPackage.delivery_package_id}:v2`} onClose={props.onClose} readOnly={props.readOnly}
    normalize={value => normalizeWorkDesignPersistedSession(value, props.workflow.deliveryPackage.delivery_package_id)}>
    <DeliveryWorkDesignSessionBody {...props}/>
  </SavedWorkBoundary>;
}

function DeliveryWorkDesignSessionBody(props: WorkDesignModalProps) {
  const source = useDeliveryChangeLiveRuntime(props.readOnly ? props.workflow.deliveryPackage.legacy_epic_id ?? null : null);
  const [savedTree, setSavedTree] = useState<WorkDesignNode | undefined>();
  useEffect(() => {setSavedTree(props.readOnly ? loadWorkDesignSessionDraft(props.workflow.deliveryPackage.delivery_package_id)?.treeDraft?.tree : undefined);},[props.readOnly,props.workflow.deliveryPackage.delivery_package_id]);
  const retained = useMemo(() => {
    if (!props.readOnly) return {tree:undefined,error:null};
    if (savedTree) return {tree:savedTree,error:null};
    try {return {tree:deliveryHistoryDesignTree(source.projection,props.workflow.deliveryPackage.delivery_package_id) ?? undefined,error:null};}
    catch {return {tree:undefined,error:"The selected package tree could not be verified."};}
  }, [props.readOnly,props.workflow.deliveryPackage.delivery_package_id,source.projection,savedTree]);
  if (props.readOnly && !retained.tree) return <TerasDialog open title="Design Hub" kicker="Work Design Session" description={props.workflow.deliveryPackage.display_name} contentOverflow="auto" height="content" width="standard" closeLabel="Close Design Hub" onClose={props.onClose} actions={<TerasActionButton onClick={props.onClose}>Back to Register</TerasActionButton>}>
    <TerasEmptyState>{retained.error ?? source.projectionError ?? "Reading retained Work Design content…"}</TerasEmptyState>
  </TerasDialog>;
  return <WorkDesignSession {...props} retainedTree={retained.tree}/>;
}

function WorkDesignSession({
  readOnly = false,
  retainedTree,
  onApplied,
  onClose,
  workflow,
}: WorkDesignModalProps & {retainedTree?:WorkDesignNode}) {
  const controller = useWorkDesignSessionController({
    readOnly,
    retainedTree,
    deliveryPackage: workflow.deliveryPackage,
    onApplied,
    onClose,
  });

  return (
    <TerasModalShell
      height={controller.footerProps.activeStep === "hub" ? "content" : "fill"}
      width={controller.shellWidth}
      description={controller.sessionShellCopy.description}
      footer={<><SavedWorkStatus/><WorkDesignSessionFooter {...controller.footerProps} /></>}
      kicker={readOnly ? "Work Design Session · Read-only" : "Work Design Session"}
      bodyLayout="fill"
      modalAttributes={{
        "data-delivery-workflow-readonly": readOnly ? "true" : "false",
        "data-teras-active-step": controller.footerProps.activeStep,
      }}
      surfaceId="work-design-session"
      onClose={controller.requestClose}
      title={controller.sessionShellCopy.title}
    >
      <WorkDesignSessionStepRouter {...controller.stepContentProps} />
      <WorkDesignSessionDialogs {...controller.dialogsProps} />
    </TerasModalShell>
  );
}
