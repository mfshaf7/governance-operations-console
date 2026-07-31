export const domainWorkspacePublicSurfaceRule = {
  requiredExport: "index.ts",
  rule: "Domain workspaces expose public surfaces at the boundary and keep private workflow internals inside the domain.",
} as const;
