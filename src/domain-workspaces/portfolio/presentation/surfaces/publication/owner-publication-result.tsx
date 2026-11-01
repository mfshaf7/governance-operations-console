import { TerasList, TerasMetadataList, TerasPanel, TerasPanelHeader, TerasSignalItem, TerasTechnicalDetails } from "@/teras";
import type { GovernedProductPublicationResult } from "../../../live-runtime/product-publication-live-types.ts";

export function OwnerPublicationResult({ result }: { result: GovernedProductPublicationResult }) {
  const posture = result.maintenance_projection;
  const findings = posture.evidence_posture.findings;
  return <TerasPanel frame="padded" fit="content" tone={result.state === "applied" ? "ok" : "warn"} treatment="state">
    <TerasPanelHeader kicker="Owner result" title={result.state === "applied" ? "Catalog updated" : "Change rejected"}
      description="Verified publication result and owner receipt. Publication does not grant product access or operating approval." />
    <TerasMetadataList columns={2} items={[
      { label: "Request", value: result.request_id }, { label: "Product", value: result.receipt.product_id },
      { label: "Publication", value: posture.publication.posture }, { label: "Version", value: String(posture.publication.version) },
      { label: "Readiness", value: posture.evidence_posture.state }, { label: "Lifecycle", value: posture.lifecycle.state },
      { label: "Next action", value: result.state === "applied" ? "Load current product information before another change" : "Correct the owner information before trying again" },
    ]} />
    <TerasTechnicalDetails summary="Publication evidence" items={[
      { label: "Receipt", value: result.receipt.receipt_id }, { label: "Receipt digest", value: result.receipt_digest },
      { label: "Owner receipt", value: result.owner_receipt.uri },
      { label: "Owner source", value: posture.owner_route.repo }, { label: "Manifest digest", value: posture.owner_route.manifest_digest },
    ]} />
    {findings.length ? <TerasList frame="contained">{findings.map((finding, index) => <TerasSignalItem key={index} label={String(finding.code ?? "owner-finding")}
      title="Owner readiness finding" detail={typeof finding.message === "string" ? finding.message : "Inspect current owner evidence."} tone="warn" />)}</TerasList> : null}
  </TerasPanel>;
}
