export const dynamic='force-dynamic';
import type {NextRequest} from 'next/server';
import {authorizeConsoleMutation} from '@/console-integration/identity/server/console-session-authorization';
import {modelProfileLifecycleRoute} from '@/domain-workspaces/model-operations/server';
type Context={params:Promise<{requestId:string}>};
export async function GET(request:NextRequest,context:Context){return modelProfileLifecycleRoute(request,(await context.params).requestId);}
export async function POST(request:NextRequest,context:Context){const id=(await context.params).requestId;return authorizeConsoleMutation(request,()=>modelProfileLifecycleRoute(request,id));}
