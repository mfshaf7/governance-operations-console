// New operator selections describe repository layout. Historical custody kinds
// remain readable; they must not become selectable layout choices again.
export const repositoryUseOptions = [
  {label: "Dedicated — one project", value: "dedicated-owner-repo"},
  {label: "Shared — several projects", value: "shared-owner-repo"},
] as const;
export type RepositoryUse = typeof repositoryUseOptions[number]["value"];
export function isRepositoryUse(value: string): value is RepositoryUse {
  return repositoryUseOptions.some(option => option.value === value);
}
