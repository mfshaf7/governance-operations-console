import type {
  PrototypeBasePlatform,
  PrototypeDataMode,
  PrototypeMutationBoundary,
  PrototypePreviewNeed,
  PrototypeSourceHome,
  PrototypeVisibilityTier,
} from "../../../read-model/prototype-workspace-read-model.ts";
import {
  prototypeRequestDataModeOptions,
  prototypeRequestMutationBoundaryOptions,
  prototypeRequestPreviewNeedOptions,
  prototypeRequestSourceHomeOptions,
  prototypeRequestVisibilityOptions,
} from "../../../work-model/entry/prototype-request-model.ts";
import { prototypeBasePlatformOptions } from "@/domain-workspaces/prototype/domain/support/prototype-setup-profile-model";
import { prototypeSupportProfileGuidance } from "@/domain-workspaces/prototype/domain/support/prototype-support-profile-model";

export type PrototypeRequestSelectionGuideGroup = {
  detail: string;
  id: string;
  options: Array<{
    detail: string;
    label: string;
    value: string;
  }>;
  title: string;
};

export function prototypeRequestSelectionGuideGroups(): PrototypeRequestSelectionGuideGroup[] {
  return [
    {
      detail:
        "Shortcut that pre-fills Landing support expectations. It does not decide final lifecycle or project type.",
      id: "support-preset",
      options: prototypeSupportProfileGuidance.map((option) => ({
        detail: option.detail,
        label: option.label,
        value: option.value,
      })),
      title: "Support profile",
    },
    {
      detail:
        "Starting platform preference while the prototype is still in Prototype Studio.",
      id: "base-platform",
      options: prototypeBasePlatformOptions.map((option) => ({
        detail: prototypeBasePlatformGuideDetail(option.value),
        label: option.label,
        value: option.value,
      })),
      title: "Base platform",
    },
    {
      detail:
        "Where Prototype should expect the first source or record home to live.",
      id: "source-home",
      options: prototypeRequestSourceHomeOptions.map((option) => ({
        detail: prototypeSourceHomeGuideDetail(
          option.value as PrototypeSourceHome,
        ),
        label: option.label,
        value: option.value,
      })),
      title: "Source home",
    },
    {
      detail:
        "Preview shape needed to inspect the prototype during incubation.",
      id: "preview-need",
      options: prototypeRequestPreviewNeedOptions.map((option) => ({
        detail: prototypePreviewNeedGuideDetail(
          option.value as PrototypePreviewNeed,
        ),
        label: option.label,
        value: option.value,
      })),
      title: "Preview",
    },
    {
      detail: "Who can safely review the prototype at request capture time.",
      id: "visibility-tier",
      options: prototypeRequestVisibilityOptions.map((option) => ({
        detail: prototypeVisibilityGuideDetail(
          option.value as PrototypeVisibilityTier,
        ),
        label: option.label,
        value: option.value,
      })),
      title: "Visibility",
    },
    {
      detail:
        "Data posture allowed for this prototype request before stronger review.",
      id: "data-mode",
      options: prototypeRequestDataModeOptions.map((option) => ({
        detail: prototypeDataModeGuideDetail(option.value as PrototypeDataMode),
        label: option.label,
        value: option.value,
      })),
      title: "Data mode",
    },
    {
      detail:
        "Mutation boundary allowed while the work remains in Prototype Studio.",
      id: "mutation-boundary",
      options: prototypeRequestMutationBoundaryOptions.map((option) => ({
        detail: prototypeMutationBoundaryGuideDetail(
          option.value as PrototypeMutationBoundary,
        ),
        label: option.label,
        value: option.value,
      })),
      title: "Boundary",
    },
  ];
}

function prototypeBasePlatformGuideDetail(value: PrototypeBasePlatform) {
  switch (value) {
    case "custom-unassigned":
      return "Use when the starting platform is still unknown or custom.";
    case "nextjs-app":
      return "Use for a Next.js application or console-style UI prototype.";
    case "vite-react":
      return "Use for a lightweight React prototype with a local frontend preview.";
    case "node-express":
      return "Use for a Node.js HTTP API or backend service prototype.";
    case "fastapi":
      return "Use for a Python FastAPI service or API-backed prototype.";
    case "flask":
      return "Use for a Python Flask service or smaller backend prototype.";
    case "static-site":
      return "Use when static files are enough for review.";
    case "container-compose":
      return "Use when the prototype needs multiple local services together.";
    case "existing-source":
      return "Use when source already exists and needs tracking instead of new setup work.";
    case "docs-only":
      return "Use when the request only needs records, notes, or design docs.";
  }
}

function prototypeSourceHomeGuideDetail(value: PrototypeSourceHome) {
  switch (value) {
    case "new-prototype-folder":
      return "Create or track a new prototype-owned folder under Prototype Studio.";
    case "console-domain-module":
      return "Use when the work belongs in the Governance Operations Console domain modules.";
    case "app-folder":
      return "Use when the request needs a dedicated app folder in the prototype repo.";
    case "docs-only":
      return "Use when docs and records are enough to continue.";
    case "existing-source":
      return "Use when the request starts from an existing source path.";
    case "future-owner-repo":
      return "Use when the likely durable home is a future owner repo after movement.";
  }
}

function prototypePreviewNeedGuideDetail(value: PrototypePreviewNeed) {
  switch (value) {
    case "static-review":
      return "Use when screenshots, static pages, or read-only review are enough.";
    case "local-dev-server":
      return "Use when an operator must run a local frontend or app server.";
    case "local-backend-stub":
      return "Use when the prototype needs a local API to make the preview meaningful.";
    case "prototype-devint":
      return "Use when the prototype needs a Prototype dev-integration preview profile.";
    case "future-dev-integration":
      return "Use when a future shared dev-integration profile is expected later.";
    case "none":
      return "Use when there is no runnable or visual preview requirement.";
  }
}

function prototypeVisibilityGuideDetail(value: PrototypeVisibilityTier) {
  switch (value) {
    case "private-internal":
      return "Workspace-internal only; safest default for early incubation.";
    case "operator-review":
      return "Safe for internal operator review once content is understandable.";
    case "client-review":
      return "Requires client-safe content and boundary review before exposure.";
    case "public-demo":
      return "Requires public-safe content and stronger review before exposure.";
  }
}

function prototypeDataModeGuideDetail(value: PrototypeDataMode) {
  switch (value) {
    case "synthetic":
      return "Generated realistic data with no real secrets, client data, or operational exports.";
    case "mock":
      return "Invented local data used only to prove interaction and layout.";
    case "real-readonly":
      return "Real read-only data; requires the appropriate security and review evidence.";
    case "real-mutable":
      return "Real mutable data is not allowed through normal request capture.";
  }
}

function prototypeMutationBoundaryGuideDetail(
  value: PrototypeMutationBoundary,
) {
  switch (value) {
    case "none":
      return "No write path is expected.";
    case "prototype-local":
      return "Writes stay local and disposable inside the prototype.";
    case "read-only":
      return "The surface may read data but must not mutate it.";
    case "external-sandbox":
      return "Writes are limited to an isolated sandbox boundary.";
    case "real-system":
      return "Real-system mutation is blocked from normal request capture.";
  }
}
