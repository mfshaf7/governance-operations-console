import { platformOwnerRequest, PlatformOperationOosError } from "./platform-operation-oos-client.ts";
import { assertGovernedProductProjection } from "../live-runtime/governed-product-contract.ts";
export async function readGovernedProducts(query=new URLSearchParams(), options:Parameters<typeof platformOwnerRequest>[2]={}){
 if([...query].some(([key,value])=>!["limit","offset","q","maturity","endpoint","product_id"].includes(key)||value.length>200||query.getAll(key).length!==1))throw new PlatformOperationOosError("Use bounded product filters.","governed_product_query_invalid",400);
 return assertGovernedProductProjection(await platformOwnerRequest(`/v1/governed-products?${query}`,{method:"GET"},options));
}
