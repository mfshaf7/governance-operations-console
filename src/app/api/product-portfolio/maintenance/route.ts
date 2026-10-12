import { productMaintenanceModeRoute } from "@/domain-workspaces/portfolio/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return productMaintenanceModeRoute();
}
