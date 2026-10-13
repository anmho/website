import { NextResponse } from 'next/server';
import { listBookmarksFromDb } from '@/lib/bookmarksDb';

export const runtime = 'nodejs';

type Bookmark = {
  title: string;
  description: string;
  category: string;
  format: string;
  url: string;
  author: string;
  tags: string[];
};

export async function GET() {
  try {
    return NextResponse.json({ resources: await listBookmarksFromDb() });
  } catch (err) {
    return NextResponse.json(
      {
        error: `database unavailable: ${String(err)}`,
      },
      { status: 500 }
    );
  }
}
