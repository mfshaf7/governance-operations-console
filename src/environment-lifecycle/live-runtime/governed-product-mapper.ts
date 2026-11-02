import type { GovernedProduct, GovernedProductProjection } from "./governed-product-contract.ts";
import { assertProductReleaseCapability, type ProductReleaseCapability } from "../model/product-release-capability.ts";
export function toGovernedProduct(item:GovernedProduct, projection:GovernedProductProjection):ProductReleaseCapability {
 const product:ProductReleaseCapability={
  productId:item.product_id,productLabel:item.label,maturity:item.maturity,
  platformOwner:item.platform_owner,securityOwner:item.security_owner,highestRealEndpoint:item.highest_real_endpoint,
  stageSupported:item.stage_supported,productionPromotionSupported:item.production_supported,
  nextMove:null,
  releaseOperations:[],releasePath:[],
  rollback:{supported:false,contractRef:null},runtimeLifecycle:null,
  source:{provenance:"authority-snapshot",source:"workspace-governance",ref:`workspace-governance://products/${item.product_id}`,version:projection.source_version,observedAt:projection.observed_at},
  supportingEvidenceRefs:item.evidence.map(e=>e.url),unavailableReason:item.unavailable_reason,
  operatorRoute:{label:"Read owner release guidance",ownerRef:item.platform_owner,ref:item.guidance_url},
  ownerWorkflows:item.workflows,ownerGuidanceUrl:item.guidance_url,recordedEvidence:item.evidence,recordedRuntime:item.runtime,
 };assertProductReleaseCapability(product);return product;
}
