export const dynamic = "force-dynamic";
import type {NextRequest} from 'next/server';
import {modelProfileRequestHistoryRoute} from '@/domain-workspaces/model-operations/server';
export async function GET(request:NextRequest){return modelProfileRequestHistoryRoute(request);}
