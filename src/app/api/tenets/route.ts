import { NextResponse } from 'next/server';
import { getPublicTenets } from '@/lib/tenets';

export const runtime = 'nodejs';

export async function GET() {
  const tenets = await getPublicTenets();

  return NextResponse.json({
    name: 'Andrew Ho public tenets',
    description: 'Public principles and their sources.',
    tenets: tenets.map(({ tags: _tags, ...tenet }) => tenet),
  });
}
