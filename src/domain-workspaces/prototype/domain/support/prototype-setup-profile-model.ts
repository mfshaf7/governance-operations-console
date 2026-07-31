import type {
  PrototypeBasePlatform,
  PrototypePreviewLaunchAdapter,
  PrototypePreviewNeed,
  PrototypeSourceHome,
  PrototypeSupportRow,
} from "../prototype-types.ts";

export const prototypeBasePlatformOptions: Array<{
  label: string;
  value: PrototypeBasePlatform;
}> = [
  { label: "Unassigned / custom", value: "custom-unassigned" },
  { label: "Next.js app", value: "nextjs-app" },
  { label: "Vite React app", value: "vite-react" },
  { label: "Node.js Express API", value: "node-express" },
  { label: "FastAPI service", value: "fastapi" },
  { label: "Flask service", value: "flask" },
  { label: "Static site", value: "static-site" },
  { label: "Container Compose", value: "container-compose" },
  { label: "Existing source", value: "existing-source" },
  { label: "Docs only", value: "docs-only" },
];

export function prototypeBasePlatformLabel(value: PrototypeBasePlatform) {
  return (
    prototypeBasePlatformOptions.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function prototypeBasePlatformLaunchAdapter(
  value: PrototypeBasePlatform,
  previewNeed: PrototypePreviewNeed,
): PrototypePreviewLaunchAdapter {
  if (previewNeed === "none") {
    return "none";
  }

  if (previewNeed === "static-review") {
    return value === "custom-unassigned" ? "unassigned" : "static-server";
  }

  switch (value) {
    case "container-compose":
      return "container-compose";
    case "custom-unassigned":
    case "existing-source":
      return "unassigned";
    case "docs-only":
      return "none";
    case "fastapi":
      return "python-uv";
    case "flask":
      return "python-pip";
    case "nextjs-app":
    case "node-express":
    case "vite-react":
      return "node-npm";
    case "static-site":
      return "static-server";
  }
}

export function prototypeBasePlatformPreviewCommand(
  value: PrototypeBasePlatform,
) {
  switch (value) {
    case "container-compose":
      return "docker compose up";
    case "custom-unassigned":
    case "existing-source":
      return "not configured";
    case "docs-only":
      return "none";
    case "fastapi":
      return "uv run uvicorn main:app --reload";
    case "flask":
      return "python -m flask --app app run";
    case "nextjs-app":
    case "vite-react":
    case "node-express":
      return "npm run dev";
    case "static-site":
      return "npx serve .";
  }
}

export function prototypeBasePlatformSetupItem(value: PrototypeBasePlatform) {
  switch (value) {
    case "container-compose":
      return "compose runtime setup";
    case "custom-unassigned":
      return "custom platform decision";
    case "docs-only":
      return "docs-only setup";
    case "existing-source":
      return "existing source custody note";
    case "fastapi":
      return "FastAPI service setup";
    case "flask":
      return "Flask service setup";
    case "nextjs-app":
      return "Next.js app setup";
    case "node-express":
      return "Express API setup";
    case "static-site":
      return "static site setup";
    case "vite-react":
      return "Vite React app setup";
  }
}

export function prototypeSetupItemsForProfile({
  basePlatform,
  sourceHome,
  supportRows,
}: {
  basePlatform: PrototypeBasePlatform;
  sourceHome: PrototypeSourceHome;
  supportRows: PrototypeSupportRow[];
}) {
  const items = [
    "prototype registry record",
    "brief",
    "backlog",
    "design profile",
    "decision log",
    "change log",
    prototypeBasePlatformSetupItem(basePlatform),
  ];

  if (
    supportRows.some(
      (row) => row.id === "interface" && row.state !== "not-needed",
    )
  ) {
    items.push("mock or synthetic fixture");
  }

  if (
    supportRows.some(
      (row) => row.id === "runtime" && row.state !== "not-needed",
    )
  ) {
    items.push("preview profile draft");
  }

  if (
    supportRows.some(
      (row) => row.id === "integration" && row.state !== "not-needed",
    )
  ) {
    items.push("adapter or integration boundary draft");
  }

  if (sourceHome !== "docs-only") {
    items.push(prototypeSourceHomeSetupItem(sourceHome));
  }

  return items;
}

function prototypeSourceHomeSetupItem(sourceHome: PrototypeSourceHome) {
  switch (sourceHome) {
    case "app-folder":
      return "app source folder";
    case "console-domain-module":
      return "console domain module";
    case "docs-only":
      return "docs setup";
    case "existing-source":
      return "existing source custody note";
    case "future-owner-repo":
      return "future owner repo intake note";
    case "new-prototype-folder":
      return "new prototype source folder";
  }
}
