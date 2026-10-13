import { NextResponse } from 'next/server';
import staticResources from '@/assets/static/json/resources.json';

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
  return NextResponse.json({ resources: staticResources as Bookmark[] });
}
