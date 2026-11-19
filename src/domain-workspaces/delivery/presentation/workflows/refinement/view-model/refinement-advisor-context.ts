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


/** A selected field carries its own facts, not the complete packet's target maps. */
export function refinementAdvisorTargetContext(selected: RefinementMetadataTarget[]) {
  return selected.map(target => {
    const { target_node_ids: _ids, target_values: _values,
      target_statuses: _statuses, target_allowed_values: _choices, ...field } = target.field;
    return { key: target.key, nodeId: target.node.id, sourceValue: target.sourceValue,
      field: { ...field, value: target.sourceValue, status: target.status } };
  });
}
