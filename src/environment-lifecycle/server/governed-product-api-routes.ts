import { NextRequest, NextResponse } from "next/server";
import { consoleOosModeSelected } from "../../console-integration/configuration/console-runtime-configuration.ts";
import { PlatformOperationOosError } from "./platform-operation-oos-client.ts";
import { readGovernedProducts } from "./governed-product-oos-client.ts";
const headers={"Cache-Control":"no-store"};
export async function governedProductsRoute(request:NextRequest){
 if(!consoleOosModeSelected())return NextResponse.json({mode:"disconnected-preview",projection:null},{headers});
 try{return NextResponse.json({mode:"live",projection:await readGovernedProducts(request.nextUrl.searchParams)},{headers});}
 catch(error){return NextResponse.json({mode:"live",error:error instanceof PlatformOperationOosError?error.message:"Owner product records are unavailable."},{headers,status:error instanceof PlatformOperationOosError?error.status:502});}
}
