"use client";
import { useWorkspaceViewState } from "../../../../console-integration/registers/workspace-view-state.ts";

import {useDeliveryRegisterPage} from "../../live-runtime/use-delivery-register-page.ts";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  DeliveryReadModel,
  DeliveryPackageSummary,
} from "../../read-model/index.ts";

import {
  TerasEmptyState,
  TerasFilterBar,
  TerasRecordControlLayout,
  TerasRegisterPanel,
  TerasRegisterPagination,
  TerasLoadingState,
  TerasActionButton,
} from "@/teras";
import { packageActionForSurface } from "../workflows/shared/package-actions/package-action-routing.ts";
import { loadWorkDesignSessionDraft } from "../../local-runtime/index.ts";
import type { WorkDesignApplyReceipt } from "../../work-model/work-design/work-design-types.ts";
import type { DeliveryPackageActionState } from "../workflows/shared/package-actions/package-action-types.ts";
import type {
  DeliverySurfaceConfig,
  DeliverySurfaceId,
} from "../workspace/workspace-types.ts";
import { projectDeliveryPackageRegisterPackage, getDeliveryPackageRegisterPackages } from "./package-register-data.ts";
import {
  deliveryWorkflowPhaseLabel,
  deliveryPackageRegisterPackageStepLabel,
  deliveryPackageRegisterStatusLabel,
  deliveryPackageRegisterStep,
  type DeliveryPackageRegisterStatusLabel,
} from "./package-register-view-model.ts";
import type { DeliveryPackageRegisterPackage } from "./package-register-types.ts";
import { DeliveryPackageWorkflowRouter } from "./package-workflow-router.tsx";
import { DeliveryPackageRegisterTable } from "./package-register-table.tsx";
import { DeliveryPackageRegisterSelectedPanel } from "./package-register-selected-panel.tsx";

export function DeliveryPackageRegisterSurface({
  focusPackageId,
  focusToken,
  model,
  onRequestPackageRegisterFocus,
  onWorkDesignApplied,
  surface,
}: {
  focusPackageId?: string | null;
  focusToken?: number | null;
  model: DeliveryReadModel;
  onRequestPackageRegisterFocus?: (
    surfaceId: Extract<DeliverySurfaceId, "refinement" | "work-design">,
    packageId: string,
  ) => void;
  onWorkDesignApplied?: (
    deliveryPackage: DeliveryPackageSummary,
    record: WorkDesignApplyReceipt,
  ) => void;
  surface: DeliverySurfaceConfig;
}) {
  const [packageAction, setPackageAction] =
    useState<DeliveryPackageActionState | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useWorkspaceViewState<string | null>(`delivery-register:${surface.id}:selectedPackageId`,
    null,
  );
  const [packagePostureFilter, setPackagePostureFilter] = useWorkspaceViewState<
    DeliveryPackageRegisterStatusLabel | "all"
  >(`delivery-register:${surface.id}:packagePostureFilter`, "all");
  const [packageSearch, setPackageSearch] = useWorkspaceViewState(`delivery-register:${surface.id}:packageSearch`, "");
  const [registerRevision, setRegisterRevision] = useState(0);
  const live=model.source_truth==="OpenProject-backed OOS";
  const page=useDeliveryRegisterPage({surface:surface.id,scope:model.history_scope??"current",query:packageSearch.trim().toLowerCase(),status:packagePostureFilter},live,focusPackageId);
  const registerModel=useMemo(()=>{
    const base=live?page.model??{...model,packages:[],selected_packages:[],art_tree:{...model.art_tree,roots:[]}}:model;
    const exact=page.original;
    return exact?{...base,packages:[...base.packages,...exact.packages],selected_packages:[...base.selected_packages,...exact.selected_packages],art_tree:{...base.art_tree,roots:[...base.art_tree.roots,...exact.art_tree.roots]}}:base;
  },[live,model,page.model,page.original]);
  const handledFocusTokenRef = useRef<number | null>(null);
  const packages: DeliveryPackageRegisterPackage[] = useMemo(() => {
    return getDeliveryPackageRegisterPackages({
      model:registerModel,
      surface,
      workDesignSessionForPackage: loadWorkDesignSessionDraft,
    });
  }, [registerModel, surface, registerRevision]);
  const packagePostureOptions: Array<DeliveryPackageRegisterStatusLabel|"all">=live?["all","New","Ready","In Progress","Blocked","Done","Deferred","Retired","Closeout Pending"]:["all",...Array.from(new Set(packages.map(deliveryPackageRegisterStatusLabel)))];
  const normalizedPackageSearch = packageSearch.trim().toLowerCase();
  const filteredPackages = live ? packages.filter(row=>page.model?.packages.some(source=>source.delivery_package_id===row.delivery_package_id)) : packages.filter((deliveryPackage) => {
    const matchesPosture =
      packagePostureFilter === "all" ||
      deliveryPackageRegisterStatusLabel(deliveryPackage) ===
        packagePostureFilter;
    const matchesSearch = normalizedPackageSearch
      ? [
          deliveryPackage.backend_status,
          deliveryPackage.delivery_package_id,
          deliveryPackage.display_name,
          deliveryPackage.package_posture,
          deliveryPackageRegisterStatusLabel(deliveryPackage),
          deliveryPackage.source_ref,
          deliveryPackage.summary,
          deliveryPackage.delivery_package_register_recovery?.recoveryAction ??
            "",
          deliveryPackage.delivery_package_register_recovery?.statusLabel ?? "",
          deliveryPackage.target_pi ?? "",
          deliveryWorkflowPhaseLabel(deliveryPackage.workflow_phase),
          deliveryPackageRegisterPackageStepLabel(deliveryPackage),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedPackageSearch)
      : true;

    return matchesPosture && matchesSearch;
  });
  const defaultSelectedPackage =
    surface.id === "work-design"
      ? (filteredPackages.find(
          (deliveryPackage) =>
            deliveryPackageRegisterStep(deliveryPackage) === "build",
        ) ??
        filteredPackages.find(
          (deliveryPackage) =>
            deliveryPackageRegisterStatusLabel(deliveryPackage) === "Ready",
        ) ??
        filteredPackages[0])
      : filteredPackages[0];
  const selectedPackage =
    packages.find(
      (deliveryPackage) =>
        deliveryPackage.delivery_package_id === selectedPackageId,
    ) ??
    defaultSelectedPackage ??
    packages[0] ??
    null;
  const focusedOriginal=page.original?.packages[0];
  const selectedOriginal=focusedOriginal&&selectedPackageId===focusedOriginal.delivery_package_id?projectDeliveryPackageRegisterPackage(surface,focusedOriginal,model.history_scope==="history"?null:loadWorkDesignSessionDraft(focusedOriginal.delivery_package_id)):null;
  const displayedPackage=selectedOriginal??selectedPackage;
  const packageActionSummary = displayedPackage
    ? packageActionForSurface(surface, displayedPackage)
    : null;

  useEffect(() => {
    if (surface.id === "work-design" || surface.id === "refinement") {
      setRegisterRevision((revision) => revision + 1);
    }
  }, [surface.id]);

  useEffect(() => {
    if (
      !focusPackageId ||
      !focusToken ||
      handledFocusTokenRef.current === focusToken ||
      !packages.some(
        (deliveryPackage) => deliveryPackage.delivery_package_id === focusPackageId,
      ) && page.original?.packages[0]?.delivery_package_id!==focusPackageId
    ) {
      return;
    }

    handledFocusTokenRef.current = focusToken;
    setPackagePostureFilter("all");
    setPackageSearch("");
    setSelectedPackageId(focusPackageId);
  }, [focusPackageId, focusToken, packages,page.original]);

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-delivery-surface-register={surface.id}
        mode="register-selected"
        register={
          <TerasRegisterPanel
            footer={live?<TerasRegisterPagination label={`${surface.title} packages`} preferenceKey={"Delivery packages:"+surface.id} offset={page.offset} count={filteredPackages.length} page={page.pageNumber} pending={page.loading} unavailable={Boolean(page.error)}
              hasPrevious={page.hasPrevious} hasNext={Boolean(page.nextCursor)} onReset={page.error&&page.hasPrevious?page.first:undefined} onPrevious={page.previous} onNext={page.next} nextLabel={filteredPackages.length?"Next page":"Continue search"}/>:undefined}
            description={model.history_scope === "history" ? "All retained packages. Inspect the full workflow without editing, applying or restarting work." : "Filter projected packages, then select a row to inspect the current context."}
            filterBar={
              <TerasFilterBar
                search={{
                  ariaLabel: `Search ${surface.title} packages`,
                  onValueChange: setPackageSearch,
                  placeholder: "Search package, source, evidence...",
                  value: packageSearch,
                }}
                filters={[
                  {
                    label: live?"Filter project status":`Filter ${surface.title} status`,
                    onValueChange: setPackagePostureFilter,
                    options: packagePostureOptions.map((posture) => ({
                      label: posture === "all" ? live?"All project statuses":"All status" : posture,
                      value: posture,
                    })),
                    value: packagePostureFilter,
                  },
                ]}
              />
            }
            kicker={surface.title}
            statusLabel={live?`${filteredPackages.length} on this page`:`${filteredPackages.length}/${packages.length} shown`}
            statusTone="warn"
            title={`${surface.title} Register`}
          >
            {live&&page.loading?<TerasLoadingState fill label="Loading matching packages…"/>:live&&page.error?<TerasEmptyState fill><p role="alert">{page.error}</p><TerasActionButton emphasis="secondary" onClick={()=>void page.refresh()}>Retry package search</TerasActionButton></TerasEmptyState>:filteredPackages.length > 0 ? (
              <DeliveryPackageRegisterTable
                onSelectPackage={(deliveryPackage) =>
                  setSelectedPackageId(deliveryPackage.delivery_package_id)
                }
                onViewPackage={(deliveryPackage) =>
                  setSelectedPackageId(deliveryPackage.delivery_package_id)
                }
                rowOffset={live?page.offset:0}
                packages={filteredPackages}
                selectedPackageId={selectedPackage?.delivery_package_id ?? null}
              />
            ) : (
              <TerasEmptyState fill>
                {live&&page.nextCursor?"No matches in this search window. Continue search to check remaining packages.":"No projected package matches the current filters."}
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <DeliveryPackageRegisterSelectedPanel
            action={packageActionSummary}
            deliveryPackage={displayedPackage}
            onOpenAction={(deliveryPackage) => {
              if (!packageActionSummary) {
                return;
              }

              setPackageAction({
                deliveryPackage,
                route: packageActionSummary.route,
                surface,
              });
            }}
            surface={surface}
          />
        }
      />

      <DeliveryPackageWorkflowRouter
        model={registerModel}
        onCloseRefinement={() => {
          setPackageAction(null);
          setRegisterRevision((revision) => revision + 1);
          if(live)void page.refresh();
        }}
        onCloseWorkDesign={() => {
          setPackageAction(null);
        }}
        onOpenRefinementPackage={onRequestPackageRegisterFocus}
        onRefreshRegister={() => {
          setRegisterRevision((revision) => revision + 1);
          if(live)void page.refresh();
        }}
        onWorkDesignApplied={onWorkDesignApplied}
        packageAction={packageAction}
      />
    </>
  );
}
