import 'server-only';

import { readFile } from 'fs/promises';
import { join } from 'path';

export async function readStaticMarkdown(
  directory: 'articles' | 'notes' | 'tenets' | 'readings' | 'watch',
  slug: string
): Promise<string> {
  try {
    return await readFile(
      join(process.cwd(), 'src', 'assets', 'content', directory, `${slug}.md`),
      'utf-8'
    );
  } catch {
    return '';
  }
}
