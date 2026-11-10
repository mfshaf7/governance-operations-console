import type { SourcePreviewAdapter } from "../../../console-integration/source-authoring/source-preview-contract.ts";
import type { PrototypePreviewOwnerProjection } from "./prototype-preview-live-types.ts";

export function prototypeSourcePreviewAdapter(prototypeId: string): SourcePreviewAdapter {
  const slug = prototypeId.replace(/^prototype[:-]/, "");
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(slug)) throw Error("A canonical Prototype identity is required for preview.");
  return { id: `prototype:${slug}`, label: "Prototype application", read: async signal => {
    const response = await fetch(`/api/prototypes/${encodeURIComponent(slug)}/preview-runtime`, { cache: "no-store", signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw Error("The project's Preview Runtime could not be read. Check its existing runtime configuration, then retry.");
    const text = await response.text(); if (text.length > 32768) throw Error("The preview status exceeds its bounded metadata response.");
    const value = JSON.parse(text) as PrototypePreviewOwnerProjection;
    if (value.schema_version !== 1 || value.prototype_id !== `prototype:${slug}` || value.profile_id !== slug || value.maturity_claim !== "prototype-preview-only") throw Error("The preview owner returned a different project.");
    return { subjectId: value.prototype_id, state: value.runtime_state, endpoint: value.endpoint, instanceId: value.instance_id,
      sourceRevision: value.source_revision, sourceDigest: value.source_digest, embeddingOrigins: value.embedding?.allowed_origins ?? [] };
  } };
}
