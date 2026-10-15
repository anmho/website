import { handleDecisionRequest } from '@/lib/decisions/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  return handleDecisionRequest(request, (await context.params).path);
}
export { handle as GET, handle as PUT, handle as DELETE, handle as POST };
