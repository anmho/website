import 'server-only';

import tenetsData from '@/assets/static/json/tenets.json';
import { isPrivateContent } from '@/lib/contentVisibility';
import { readStaticMarkdown } from '@/lib/staticContent';

export type Tenet = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  source?: string;
  tags?: string[];
};

export type PublicTenet = Tenet & {
  body: string;
};

export async function getPublicTenets(): Promise<PublicTenet[]> {
  return Promise.all(
    (tenetsData as Tenet[])
      .filter((tenet) => !isPrivateContent(tenet.tags))
      .map(async (tenet) => ({
        ...tenet,
        body: await readStaticMarkdown('tenets', tenet.id),
      }))
  );
}
