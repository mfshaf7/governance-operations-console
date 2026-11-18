import type { RefinementMetadataTarget } from "./refinement-metadata-model.ts";

export function refinementAdvisorDraftContext(all: RefinementMetadataTarget[], selected: RefinementMetadataTarget[], drafts: Record<string, string>) {
  const scope = new Set(selected.flatMap(target => target.path.map(node => node.id)));
  selected.forEach(target => scope.add(target.node.id));
  const selectedKeys = new Set(selected.map(target => target.key));
  const values = all.filter(target => scope.has(target.node.id) && target.status !== "blocked" && target.field.field_kind !== "generated" &&
    (selectedKeys.has(target.key) || Object.hasOwn(drafts, target.key) && drafts[target.key] !== target.sourceValue))
    .map(target => ({ field_key: target.field.field_key ?? target.field.backend_field, node_id: target.node.id, value: drafts[target.key] ?? target.sourceValue }));
  if (values.length > 256 || values.some(item => item.value.length > 16000)) throw Error("This advice scope contains too much draft content. Select fewer items or shorten the draft; no values were omitted.");
  return values;
}
