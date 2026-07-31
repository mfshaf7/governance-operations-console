import type {
  TerasSurfaceStatusItem,
  TerasSurfaceSummaryMetric,
  TerasTone,
} from "@/teras";

import type {
  LifecycleTransitionOverviewItem,
  LifecycleTransitionRouteOverview,
} from "../lifecycle-transition-overview-view-model";
import type {
  LifecycleTransitionRouteId,
  LifecycleTransitionState,
} from "../../model/lifecycle-transition-types";

export function lifecycleTransitionWorkspaceMetrics(
  route: LifecycleTransitionRouteOverview,
): TerasSurfaceSummaryMetric[] {
  return [
    {
      id: "total",
      label: "Total",
      value: route.totalCount,
    },
    {
      id: "active",
      label: "Active",
      tone: route.activeCount > 0 ? "info" : "muted",
      value: route.activeCount,
    },
    {
      id: "attention",
      label: "Attention",
      tone: route.attentionCount > 0 ? "warn" : "muted",
      value: route.attentionCount,
    },
    {
      id: "applied",
      label: "Applied",
      tone: route.appliedCount > 0 ? "ok" : "muted",
      value: route.appliedCount,
    },
    {
      id: "closed",
      label: "Closed",
      tone: "muted",
      value: route.closedCount,
    },
  ];
}

export function lifecycleTransitionWorkspaceStatus(
  route: LifecycleTransitionRouteOverview,
): TerasSurfaceStatusItem[] {
  return [
    {
      detail: route.description,
      facts: [
        {
          label: "Next owners",
          value: String(route.nextOwnerCount),
        },
        {
          label: "Closed",
          value: String(route.closedCount),
        },
      ],
      id: route.routeId,
      label: "Route",
      stateLabel: route.statusLabel,
      tone: route.tone,
    },
  ];
}

export function lifecycleTransitionRouteNavLabel(
  routeId: LifecycleTransitionRouteId,
): string {
  switch (routeId) {
    case "proposal-to-prototype":
      return "Prototype";
    case "proposal-to-delivery":
      return "Delivery";
    case "prototype-to-delivery":
      return "Handoff";
  }
}

export function lifecycleTransitionStateOptions(
  items: readonly LifecycleTransitionOverviewItem[],
): Array<Readonly<{
  label: string;
  value: LifecycleTransitionState | "all";
}>> {
  const states = [...new Set(items.map((item) => item.state))].sort();

  return [
    {
      label: "All states",
      value: "all",
    },
    ...states.map((state) => ({
      label: lifecycleTransitionStateLabel(state),
      value: state,
    })),
  ];
}

export function lifecycleTransitionStateLabel(state: string): string {
  return state
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function lifecycleTransitionShortReference(reference: string): string {
  return reference.split("://").at(-1) ?? reference;
}

export function lifecycleTransitionTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export function lifecycleTransitionDomainLabel(
  domain: LifecycleTransitionOverviewItem["targetDomain"],
): string {
  switch (domain) {
    case "delivery":
      return "Delivery";
    case "proposal":
      return "Proposal";
    case "prototype":
      return "Prototype";
  }
}

export function lifecycleTransitionTargetFact(
  item: LifecycleTransitionOverviewItem,
): Readonly<{
  label: "Target home" | "Target record";
  value: string;
}> {
  if (item.targetRecordRef) {
    return {
      label: "Target record",
      value: lifecycleTransitionRecordLabel(item.targetRecordRef),
    };
  }

  return {
    label: "Target home",
    value: lifecycleTransitionHomeLabel(item.targetHomeRef),
  };
}

export function lifecycleTransitionTitle(
  item: LifecycleTransitionOverviewItem,
): string {
  return `${lifecycleTransitionShortReference(item.sourceRecordId)} to ${lifecycleTransitionDomainLabel(item.targetDomain)}`;
}

export function lifecycleTransitionTone(
  tone: LifecycleTransitionOverviewItem["tone"],
): TerasTone {
  return tone;
}

function lifecycleTransitionHomeLabel(homeRef: string): string {
  switch (homeRef) {
    case "workspace-delivery-art":
      return "Workspace Delivery ART";
    case "workspace-prototype-studio":
      return "Prototype Studio";
    default:
      return lifecycleTransitionShortReference(homeRef);
  }
}

function lifecycleTransitionRecordLabel(reference: string): string {
  const withoutScheme = lifecycleTransitionShortReference(reference);
  return withoutScheme.split("/").filter(Boolean).at(-1) ?? withoutScheme;
}
