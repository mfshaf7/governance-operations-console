export function repositoryWorkspaceName(value: unknown): string | null {
  return typeof value === "string" ? /^repo:([a-z0-9][a-z0-9._-]*)$/.exec(value.trim())?.[1] ?? null : null;
}

export const repositoryWorkspaceReferenceHelp = "Use repo: followed by lowercase letters, numbers, dots, hyphens or underscores.";
