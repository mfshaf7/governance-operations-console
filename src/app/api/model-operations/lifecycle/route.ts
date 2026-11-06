export const dynamic='force-dynamic';
import type {NextRequest} from 'next/server';
import {authorizeConsoleMutation} from '@/console-integration/identity/server/console-session-authorization';
import {modelProfileLifecycleRoute} from '@/domain-workspaces/model-operations/server';
export async function POST(request:NextRequest){return authorizeConsoleMutation(request,()=>modelProfileLifecycleRoute(request));}
