import { NextRequest, NextResponse } from 'next/server';
import { getAuthError } from '@/lib/controlPlaneAuth';
import { validateContent } from '@/lib/controlPlaneStore';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authError = getAuthError(req);
  if (authError) {
    return NextResponse.json(
      { error: authError },
      { status: authError === 'unauthorized' ? 401 : 500 }
    );
  }

  const issues = await validateContent();
  return NextResponse.json({
    ok: issues.length === 0,
    issueCount: issues.length,
    issues,
  });
}
