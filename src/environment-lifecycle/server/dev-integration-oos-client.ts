import { platformOwnerRequest, platformCanonicalDigest, PlatformOperationOosError } from "./platform-operation-oos-client.ts";
import { assertOwnerProfileProjection, assertProfileRequestRecord } from "../live-runtime/dev-integration-profile-contract.ts";
type Options = Parameters<typeof platformOwnerRequest>[2];
function verifiedRequest(value: unknown) {
  const record = assertProfileRequestRecord(value);
  const {digest,...claims} = record.receipt;
  if (platformCanonicalDigest(claims) !== digest || platformCanonicalDigest({request_id:record.request_id,expected_source_version:record.expected_source_version,request:record.request}) !== record.intent_digest)
    throw new PlatformOperationOosError("The original request receipt does not match its intent.", "dev_integration_receipt_invalid", 502);
  return record;
}

export async function readOwnerProfiles(query = new URLSearchParams(), options: Options = {}) {
  const allowed = new Set(["offset", "limit", "q", "owner", "lane", "lifecycle", "profile_id"]);
  if ([...query].some(([key, value]) => !allowed.has(key) || value.length > 200 || query.getAll(key).length !== 1))
    throw new PlatformOperationOosError("Unsupported profile filter.", "dev_integration_query_invalid", 400);
  return assertOwnerProfileProjection(await platformOwnerRequest(`/v1/dev-integration/profiles?${query}`, { method: "GET" }, options));
}
export async function readProfileRequest(requestId: string, options: Options = {}) {
  if (!/^devint-request:[A-Za-z0-9._:-]{1,113}$/.test(requestId))
    throw new PlatformOperationOosError("An exact original request ID is required.", "dev_integration_request_invalid", 400);
  const record = verifiedRequest(await platformOwnerRequest(`/v1/dev-integration/requests/${encodeURIComponent(requestId)}`, { method: "GET" }, options));
  if (record.request_id !== requestId) throw new PlatformOperationOosError("The owner returned a different request.", "dev_integration_request_mismatch", 502);
  return record;
}
export async function listProfileRequests(query = new URLSearchParams(), options: Options = {}) {
  if ([...query].some(([key, value]) => !["offset", "limit"].includes(key) || !/^\d{1,6}$/.test(value) || query.getAll(key).length !== 1))
    throw new PlatformOperationOosError("Use bounded request pagination.", "dev_integration_query_invalid", 400);
  const body = await platformOwnerRequest(`/v1/dev-integration/requests?${query}`, { method: "GET" }, options);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid request history.");
  const result = body as { schema_version: number; requests: unknown[]; page: {offset:number;limit:number;total:number;next_offset:number|null} };
  if (Object.keys(result).length !== 3 || Object.keys(result).some(key => !["schema_version","requests","page"].includes(key)) ||
      result.schema_version !== 1 || !Array.isArray(result.requests) || result.requests.length > 25 || !result.page ||
      Object.keys(result.page).length !== 4 || Object.keys(result.page).some(key => !["offset","limit","total","next_offset"].includes(key)) ||
      ![result.page.offset,result.page.limit,result.page.total].every(value => Number.isSafeInteger(value) && value >= 0) ||
      result.page.limit < 1 || result.page.limit > 25 || (result.page.next_offset !== null && (!Number.isSafeInteger(result.page.next_offset) || result.page.next_offset <= result.page.offset))) throw new Error("Invalid request history.");
  return { schema_version:1 as const, page:result.page, requests: result.requests.map(verifiedRequest) };
}
export async function submitProfileRequest(value: unknown, options: Options = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Review the profile request first.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["requestId", "reviewedSourceVersion", "request", "approved"].includes(key)) ||
      typeof input.requestId !== "string" || !/^devint-request:[A-Za-z0-9._:-]{1,113}$/.test(input.requestId) ||
      typeof input.reviewedSourceVersion !== "string" || !/^registry:[a-f0-9]{40}$/.test(input.reviewedSourceVersion) ||
      input.approved !== true || !input.request || typeof input.request !== "object" || Array.isArray(input.request) || JSON.stringify(input).length > 32768)
    throw new PlatformOperationOosError("Review and explicitly submit the complete profile request.", "dev_integration_request_invalid", 400);
  // The form's preview actor/time are never write authority. OOS supplies both.
  const { requestedAt: _time, requestedBy: _actor, ...request } = input.request as Record<string, unknown>;
  const intent = { request_id: input.requestId, expected_source_version: input.reviewedSourceVersion, request };
  const result = verifiedRequest(await platformOwnerRequest("/v1/dev-integration/requests", {
    method: "POST", body: JSON.stringify({ ...intent, approval: { decision: "approved", intent_digest: platformCanonicalDigest(intent) } }),
  }, options));
  if (result.request_id !== input.requestId || result.intent_digest !== platformCanonicalDigest(intent))
    throw new PlatformOperationOosError("The owner returned a different request intent.", "dev_integration_request_mismatch", 502);
  return result;
}
