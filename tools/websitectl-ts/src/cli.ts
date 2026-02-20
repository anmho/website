#!/usr/bin/env node
import { input, password } from '@inquirer/prompts';
import { Command } from 'commander';
import os from 'os';
import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import {
  adminErrorResponseSchema,
  createArticleRequestSchema,
  createBookmarkRequestSchema,
  createLearningRequestSchema,
  createArticleResponseSchema,
  createBookmarkResponseSchema,
  createLearningResponseSchema,
  validateResponseSchema,
} from '../../../packages/contracts/src/admin';

type CliConfig = {
  baseUrl: string;
  apiKey: string;
};

const CONFIG_PATH = path.join(os.homedir(), '.config', 'websitectl', 'config.json');

async function loadConfig(): Promise<Partial<CliConfig>> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    return parsed;
  } catch {
    return {};
  }
}

async function saveConfig(config: CliConfig): Promise<void> {
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

async function setupConfig(existing: Partial<CliConfig> = {}): Promise<CliConfig> {
  const baseUrl = await input({
    message: 'Admin API base URL',
    default: existing.baseUrl || 'http://localhost:3000',
    validate: (v) => {
      try {
        const u = new URL(v);
        return !!u.origin || 'Enter a valid URL';
      } catch {
        return 'Enter a valid URL';
      }
    },
  });

  const apiKey = await password({
    message: 'Admin API key',
    mask: '*',
    validate: (v) => (v.trim().length > 0 ? true : 'API key is required'),
  });

  const cfg: CliConfig = { baseUrl: baseUrl.trim(), apiKey: apiKey.trim() };
  await saveConfig(cfg);
  return cfg;
}

async function resolveConfig(opts: { baseUrl?: string; apiKey?: string }): Promise<CliConfig> {
  const existing = await loadConfig();

  const baseUrl =
    opts.baseUrl?.trim() || process.env.WEBSITECTL_BASE_URL?.trim() || existing.baseUrl?.trim();
  const apiKey =
    opts.apiKey?.trim() || process.env.WEBSITECTL_API_KEY?.trim() || existing.apiKey?.trim();

  if (baseUrl && apiKey) {
    return { baseUrl, apiKey };
  }

  console.log('Missing CLI config. Starting setup...');
  return setupConfig({ baseUrl, apiKey });
}

async function callAdminApi<TReq, TRes>(params: {
  config: CliConfig;
  method: 'GET' | 'POST';
  endpoint: string;
  body?: TReq;
}): Promise<TRes> {
  const url = `${params.config.baseUrl.replace(/\/$/, '')}${params.endpoint}`;
  const res = await fetch(url, {
    method: params.method,
    headers: {
      'x-api-key': params.config.apiKey,
      ...(params.body ? { 'content-type': 'application/json' } : {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const maybeError = adminErrorResponseSchema.safeParse(parsed);
    if (maybeError.success) {
      throw new Error(`API ${res.status}: ${maybeError.data.error}`);
    }
    throw new Error(`API ${res.status}: ${text}`);
  }

  return parsed as TRes;
}

function splitTags(csv: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of csv.split(',')) {
    const t = raw.trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

const program = new Command();
program
  .name('websitectl')
  .description('CLI for website admin APIs')
  .version('0.1.0');

program
  .command('setup')
  .description('Configure base URL and API key for admin API')
  .action(async () => {
    const current = await loadConfig();
    const cfg = await setupConfig(current);
    console.log(`Saved config to ${CONFIG_PATH}`);
    console.log(`Base URL: ${cfg.baseUrl}`);
  });

const commonOptions = (cmd: Command) =>
  cmd
    .option('--base-url <url>', 'Admin API base URL')
    .option('--api-key <key>', 'Admin API key');

commonOptions(
  program
    .command('bookmark add <url>')
    .description('Fetch and parse a URL via server-side LLM, then store bookmark in DB')
    .action(async (url: string, opts: { baseUrl?: string; apiKey?: string }) => {
      const config = await resolveConfig(opts);
      const body = createBookmarkRequestSchema.parse({ url });
      const data = await callAdminApi<typeof body, unknown>({
        config,
        method: 'POST',
        endpoint: '/api/admin/bookmarks',
        body,
      });
      const parsed = createBookmarkResponseSchema.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    })
);

const api = program.command('api').description('Call admin API endpoints');

commonOptions(
  api
    .command('validate')
    .description('Validate content integrity on server')
    .action(async (opts: { baseUrl?: string; apiKey?: string }) => {
      const config = await resolveConfig(opts);
      const data = await callAdminApi<undefined, unknown>({
        config,
        method: 'GET',
        endpoint: '/api/admin/validate',
      });
      const parsed = validateResponseSchema.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    })
);

commonOptions(
  api
    .command('new-learning')
    .description('Create a learning entry')
    .option('--question <question>', 'Question')
    .option('--answer <answer>', 'Answer')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--date <yyyy-mm-dd>', 'Date (optional)')
    .option('--code-snippet <code>', 'Code snippet (optional)')
    .option('--code-language <lang>', 'Code language (optional)')
    .action(
      async (opts: {
        baseUrl?: string;
        apiKey?: string;
        question?: string;
        answer?: string;
        tags?: string;
        date?: string;
        codeSnippet?: string;
        codeLanguage?: string;
      }) => {
        const config = await resolveConfig(opts);
        const question = opts.question?.trim() || (await input({ message: 'Question' }));
        const answer = opts.answer?.trim() || (await input({ message: 'Answer' }));
        const tagCsv = opts.tags?.trim() || (await input({ message: 'Tags (comma-separated)' }));

        const body = createLearningRequestSchema.parse({
          question,
          answer,
          tags: splitTags(tagCsv),
          date: opts.date,
          codeSnippet: opts.codeSnippet,
          codeLanguage: opts.codeLanguage,
        });

        const data = await callAdminApi<typeof body, unknown>({
          config,
          method: 'POST',
          endpoint: '/api/admin/learnings',
          body,
        });
        const parsed = createLearningResponseSchema.parse(data);
        console.log(JSON.stringify(parsed, null, 2));
      }
    )
);

commonOptions(
  api
    .command('new-article')
    .description('Create an article entry')
    .option('--title <title>', 'Title')
    .option('--excerpt <excerpt>', 'Excerpt')
    .option('--slug <slug>', 'Slug (optional)')
    .option('--date <yyyy-mm-dd>', 'Date (optional)')
    .option('--read-time <readTime>', 'Read time (optional)')
    .option('--markdown-body <markdown>', 'Markdown body (optional)')
    .action(
      async (opts: {
        baseUrl?: string;
        apiKey?: string;
        title?: string;
        excerpt?: string;
        slug?: string;
        date?: string;
        readTime?: string;
        markdownBody?: string;
      }) => {
        const config = await resolveConfig(opts);
        const title = opts.title?.trim() || (await input({ message: 'Title' }));
        const excerpt = opts.excerpt?.trim() || (await input({ message: 'Excerpt' }));

        const body = createArticleRequestSchema.parse({
          title,
          excerpt,
          slug: opts.slug,
          date: opts.date,
          readTime: opts.readTime,
          markdownBody: opts.markdownBody,
        });

        const data = await callAdminApi<typeof body, unknown>({
          config,
          method: 'POST',
          endpoint: '/api/admin/articles',
          body,
        });
        const parsed = createArticleResponseSchema.parse(data);
        console.log(JSON.stringify(parsed, null, 2));
      }
    )
);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
