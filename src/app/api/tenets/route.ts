import { NextResponse } from 'next/server';
import { getPublicTenets } from '@/lib/tenets';

export const runtime = 'nodejs';

export async function GET() {
  const tenets = await getPublicTenets();

  return NextResponse.json({
    name: 'Andrew Ho public tenets',
    description: 'Public principles used as a values lens by the Goals API.',
    tenets: tenets.map(({ tags: _tags, ...tenet }) => tenet),
  });
}
