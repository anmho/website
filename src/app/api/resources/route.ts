import { NextResponse } from 'next/server';
import staticResources from '@/assets/static/json/resources.json';
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
    const dbRows = await listBookmarksFromDb();
    const staticRows = staticResources as Bookmark[];
    const merged = [...dbRows, ...staticRows];

    const seen = new Set<string>();
    const deduped = merged.filter((b) => {
      if (seen.has(b.url)) return false;
      seen.add(b.url);
      return true;
    });

    return NextResponse.json({ resources: deduped });
  } catch (err) {
    return NextResponse.json(
      {
        resources: staticResources,
        warning: `db unavailable, serving static resources: ${String(err)}`,
      },
      { status: 200 }
    );
  }
}
