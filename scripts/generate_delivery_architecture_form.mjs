// Presentation schema only. OOS remains the semantic/approval authority.
// Usage: node scripts/generate_delivery_architecture_form.mjs <owner-schema>
// Emits deterministic source; review the diff before replacing the UI snapshot.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const path = process.argv[2];
if (!path) throw Error("Pass the OOS delivery-art-architecture-packet.schema.json source.");
const raw = readFileSync(path), source = JSON.parse(raw);
function merge(base, overlay) {
  if (overlay?.$ref) return overlay;
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) return overlay;
  const result = { ...base };
  for (const [key, value] of Object.entries(overlay)) result[key] = key === "required"
    ? [...new Set([...(base?.required ?? []), ...value])]
    : value && typeof value === "object" && !Array.isArray(value) ? merge(base?.[key], value) : value;
  return result;
}
const v6 = source.allOf.find(rule => rule.if?.properties?.schema_version?.const === 6).then.properties;
const architecture = merge(source.properties.architecture, v6.architecture);
delete architecture.properties.dependency_merge_dag;
delete architecture.properties.work_dependency_graph;
const snapshot = source.properties.source_snapshot.$ref
  ? source.$defs[source.properties.source_snapshot.$ref.split("/").at(-1)] : source.properties.source_snapshot;
const requiredProtocolDimensions = source.properties.conformance_plan.allOf
  .find(rule => rule.if?.properties?.protocol_applicability?.properties?.applies?.const === true)
  .then.properties.dimensions.allOf.map(rule => rule.contains.const);
process.stdout.write("// Generated presentation snapshot; OOS retains semantic authority.\nexport default " + JSON.stringify({
  source: "operator-orchestration-service/contracts/delivery-art/delivery-art-architecture-packet.schema.json",
  sourceSha256: createHash("sha256").update(raw).digest("hex"), authoringVersion: 6,
  requiredProtocolDimensions,
  $defs: source.$defs, properties: { architecture, conformance_plan: merge(source.properties.conformance_plan, v6.conformance_plan), repo_revisions: snapshot.properties.repo_revisions },
}, null, 2) + ";\n");
