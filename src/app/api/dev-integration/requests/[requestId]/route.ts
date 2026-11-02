import { originalRequestRoute } from "@/environment-lifecycle/server/dev-integration-api-routes";
export async function GET(_request: Request, context: { params: Promise<{requestId:string}> }) {
  return originalRequestRoute((await context.params).requestId);
}
