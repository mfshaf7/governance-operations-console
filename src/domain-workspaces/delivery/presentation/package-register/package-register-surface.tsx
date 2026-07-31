"use client";

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
} from "@/teras";
import { packageActionForSurface } from "../workflows/shared/package-actions/package-action-routing.ts";
import { loadWorkDesignSessionDraft } from "../../local-runtime/index.ts";
import type { WorkDesignApplyReceipt } from "../../work-model/work-design/work-design-types.ts";
import type { DeliveryPackageActionState } from "../workflows/shared/package-actions/package-action-types.ts";
import type {
  DeliverySurfaceConfig,
  DeliverySurfaceId,
} from "../workspace/workspace-types.ts";
import { getDeliveryPackageRegisterPackages } from "./package-register-data.ts";
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
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null,
  );
  const [packagePostureFilter, setPackagePostureFilter] = useState<
    DeliveryPackageRegisterStatusLabel | "all"
  >("all");
  const [packageSearch, setPackageSearch] = useState("");
  const [registerRevision, setRegisterRevision] = useState(0);
  const handledFocusTokenRef = useRef<number | null>(null);
  const packages: DeliveryPackageRegisterPackage[] = useMemo(() => {
    return getDeliveryPackageRegisterPackages({
      model,
      surface,
      workDesignSessionForPackage: loadWorkDesignSessionDraft,
    });
  }, [model, surface, registerRevision]);
  const packagePostureOptions: Array<
    DeliveryPackageRegisterStatusLabel | "all"
  > = [
    "all",
    ...Array.from(new Set(packages.map(deliveryPackageRegisterStatusLabel))),
  ];
  const normalizedPackageSearch = packageSearch.trim().toLowerCase();
  const filteredPackages = packages.filter((deliveryPackage) => {
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
  const packageActionSummary = selectedPackage
    ? packageActionForSurface(surface, selectedPackage)
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
        (deliveryPackage) =>
          deliveryPackage.delivery_package_id === focusPackageId,
      )
    ) {
      return;
    }

    handledFocusTokenRef.current = focusToken;
    setPackagePostureFilter("all");
    setPackageSearch("");
    setSelectedPackageId(focusPackageId);
  }, [focusPackageId, focusToken, packages]);

  return (
    <>
      <TerasRecordControlLayout
        composition="fullscreen-register"
        data-delivery-surface-register={surface.id}
        mode="register-selected"
        register={
          <TerasRegisterPanel
            description="Filter projected packages, then select a row to inspect the current context."
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
                    label: `Filter ${surface.title} status`,
                    onValueChange: setPackagePostureFilter,
                    options: packagePostureOptions.map((posture) => ({
                      label: posture === "all" ? "All status" : posture,
                      value: posture,
                    })),
                    value: packagePostureFilter,
                  },
                ]}
              />
            }
            kicker={surface.title}
            statusLabel={`${filteredPackages.length}/${packages.length} shown`}
            statusTone="warn"
            title={`${surface.title} Register`}
          >
            {filteredPackages.length > 0 ? (
              <DeliveryPackageRegisterTable
                onSelectPackage={(deliveryPackage) =>
                  setSelectedPackageId(deliveryPackage.delivery_package_id)
                }
                onViewPackage={(deliveryPackage) =>
                  setSelectedPackageId(deliveryPackage.delivery_package_id)
                }
                packages={filteredPackages}
                selectedPackageId={selectedPackage?.delivery_package_id ?? null}
              />
            ) : (
              <TerasEmptyState fill>
                No projected package matches the current filters.
              </TerasEmptyState>
            )}
          </TerasRegisterPanel>
        }
        selected={
          <DeliveryPackageRegisterSelectedPanel
            action={packageActionSummary}
            deliveryPackage={selectedPackage}
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
        model={model}
        onCloseRefinement={() => {
          setPackageAction(null);
          setRegisterRevision((revision) => revision + 1);
        }}
        onCloseWorkDesign={() => {
          setPackageAction(null);
        }}
        onOpenRefinementPackage={onRequestPackageRegisterFocus}
        onRefreshRegister={() => {
          setRegisterRevision((revision) => revision + 1);
        }}
        onWorkDesignApplied={onWorkDesignApplied}
        packageAction={packageAction}
      />
    </>
  );
}
