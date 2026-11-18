import { refinementFeedbackProjection } from "./refinement-feedback-fixture.mjs";

export function refinementWorkbenchProjection() {
  const projection = refinementFeedbackProjection(), packet = projection.packet;
  const description = "## What this achieves\n\n" + "Keep the complete work description readable without hiding the editing task. ".repeat(35)
    + "\n\n## Evidence\n\n- Inspect the complete source\n- Preserve the reviewed result\n\n## Literal example\n\n```html\n<script>literal work content, never executable</script>\n```\n\n[Documentation](https://example.com/docs)";
  packet.target_tree.description = description;
  packet.target_tree.children = Array.from({ length: 4 }, (_, f) => ({ id: String(1001 + f), kind: "Feature", title: `Feature ${f + 1} — reviewed outcome`,
    description, draft_body: description, remark: "Synthetic inspection only", children: Array.from({ length: 7 }, (_, s) => ({ id: String(1100 + f * 10 + s), kind: "User story",
      title: `Story ${f + 1}.${s + 1} — exact source outcome`, description, draft_body: description, remark: "Synthetic inspection only", children: [] })) }));
  packet.target_tree.children.push(...Array.from({ length: 3 }, (_, r) => ({ id: String(1201 + r), kind: "Risk", title: `Risk ${r + 1} — source uncertainty`, description, draft_body: description, remark: "Synthetic risk", children: [] })));
  const all = node => [node, ...(node.children ?? []).flatMap(all)], nodes = all(packet.target_tree).slice(1), ids = nodes.map(node => node.id);
  const field = (name, label, kind, values, options = {}) => ({ field_key: name, backend_field: name, label, field_kind: kind, required: false,
    value: "", status: "complete", validation_hint: `Review ${label.toLowerCase()} for this selected item.`, target_node_ids: ids,
    target_statuses: Object.fromEntries(ids.map(id => [id, "complete"])), target_values: Object.fromEntries(ids.map((id, i) => [id, values(i)])),
    route_binding: { operation_kind: "bulk_update", oos_route: "/v1/delivery-work-items/bulk-update", payload_key: name, target: "work_item" }, ...options });
  packet.draft_groups[0].fields[0].allowed_values.push("PI-2026-04");
  packet.draft_groups[0].fields.push({ ...packet.draft_groups[0].fields[0], field_key: "success_criteria", backend_field: "success_criteria", label: "Success Criteria", field_kind: "long_text", required: false,
    value: "", allowed_values: undefined, target_values: { 760: "" }, value_limit: 120, validation_hint: "Describe the intended successful outcome.",
    route_binding: { ...packet.draft_groups[0].fields[0].route_binding, payload_key: "success_criteria" } });
  packet.draft_groups.push({ group_id: "item-metadata", title: "Work item fields", summary: "Reviewed draft values", fields: [
    field("owner_repo", "Owner Repo", "short_text", i => i % 2 ? "repository-beta" : "repository-alpha", { required: true }),
    field("priority", "Priority", "select", () => "Normal", { allowed_values: ["Normal", "High"] }),
    field("effort", "Effort", "number", () => "1"),
    field("notes", "Notes", "long_text", () => "", { value_limit: 120 }),
    field("source_shape", "Source Shape", "generated", () => "Generated from the applied work tree"),
  ] });
  return projection;
}
