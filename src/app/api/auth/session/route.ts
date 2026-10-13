import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSessionFromRequest,
  isAdminOAuthConfigured,
} from '@/lib/controlPlaneAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  const authenticated = isAdminOAuthConfigured() && Boolean(getAdminSessionFromRequest(req));
  return NextResponse.json(
    { authenticated },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
