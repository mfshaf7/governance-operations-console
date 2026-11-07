import {NextRequest,NextResponse} from "next/server";
import {readRepositoryRegister} from "../../../../domain-workspaces/repository/server/repository-register-query.ts";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  try{return NextResponse.json(await readRepositoryRegister(request.nextUrl.searchParams,request.signal),{headers:{"Cache-Control":"no-store"}});}
  catch(error){const failure=error as {status?:number;message?:string};return NextResponse.json({error:failure.message??"Repository search is unavailable.",status:"offline"},{status:failure.status??502,headers:{"Cache-Control":"no-store"}});}
}
