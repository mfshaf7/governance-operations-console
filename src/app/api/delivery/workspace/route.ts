import {readDeliveryRegister} from "../../../../domain-workspaces/delivery/server/delivery-register-query.ts";
import { NextResponse } from "next/server";
import { readCanonicalDeliveryInventory } from "../../../../domain-workspaces/delivery/server/delivery-workspace-oos-client.ts";
import { deliveryOosConfigured, DeliveryOosError } from "../../../../domain-workspaces/delivery/server/delivery-oos-client.ts";
import { readCatalogProjection } from "../../../../domain-workspaces/delivery/server/refinement-catalog-oos-client.ts";
import { catalogReadModelFromProjection } from "../../../../domain-workspaces/delivery/live-runtime/catalog-live-contract.ts";
import { ownerQueryFetch } from "../../../../console-integration/server/owner-query-fetch.ts";
import { currentPlanningIncrement } from "../../../../domain-workspaces/delivery/work-model/catalog/planning-calendar.ts";
import { targetPiCatalogId } from "../../../../domain-workspaces/delivery/work-model/catalog/catalog-selectors.ts";

export const dynamic = "force-dynamic";

export async function GET(request:Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!deliveryOosConfigured()) return NextResponse.json({ mode: "disconnected-preview", projection: null, error: null }, { headers });
  try {
    const query=new URL(request.url).searchParams;
    if(query.get("view")==="register")return NextResponse.json(await readDeliveryRegister(query,request.signal),{headers});
    if (query.get("view") === "planning") {
      const selectedPI = query.get("pi");
      const focus = query.get("focus");
      const fresh = query.get("fresh") === "1";
      if ([...query.keys()].some(key => !["view","pi","focus","fresh"].includes(key) || query.getAll(key).length !== 1) ||
          selectedPI !== null && (!/^PI-\d{4}-\d{2}$/.test(selectedPI) || focus !== null) ||
          focus !== null && !/^delivery-[1-9][0-9]*$/.test(focus) || query.has("fresh") && !fresh) {
        return NextResponse.json({ mode: "live", projection: null, error: "Select a valid PI Planning view." }, { headers, status: 400 });
      }
      const owner = ownerQueryFetch(request.signal);
      const catalog = catalogReadModelFromProjection(await readCatalogProjection({ fetchImpl: owner.fetchImpl }));
      const increments = catalog.values.filter(value => value.catalog_item_id === targetPiCatalogId &&
        ["active", "admitted"].includes(value.lifecycle_state) && /^PI-\d{4}-\d{2}$/.test(value.value_key));
      const pi = increments.some(value => value.value_key === selectedPI) ? selectedPI
        : currentPlanningIncrement(catalog.values) ?? increments[0]?.value_key;
      const inventory = await readCanonicalDeliveryInventory({
        planning: true, ...(focus ? { planningFocus: focus } : pi ? { planningPI: pi } : {}),
        refreshPlanning: fresh, fetchImpl: owner.fetchImpl,
      });
      return NextResponse.json({ mode: "live", projection: { ...inventory, catalog }, error: null }, { headers });
    }
    return NextResponse.json({ mode: "live", projection: await readCanonicalDeliveryInventory({overview:true}), error: null }, { headers });
  } catch (error) {
    const status=error instanceof DeliveryOosError && [401,403].includes(error.status)?error.status:503;
    return NextResponse.json({ mode: "live", projection: null, error: "Canonical Delivery records are unavailable; fixtures are not a fallback." }, { headers, status });
  }
}
