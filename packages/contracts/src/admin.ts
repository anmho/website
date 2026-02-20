import { z } from 'zod';

export const articleFormatSchema = z.enum([
  'Article',
  'Blog',
  'Guide',
  'Paper',
  'Book',
  'Tutorial',
  'Documentation',
  'Course',
  'Newsletter',
  'Repository',
  'Video',
  'Wiki',
  'Pattern',
  'Report',
]);

export const createLearningRequestSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).min(1),
  date: z.string().trim().optional(),
  codeSnippet: z.string().optional(),
  codeLanguage: z.string().optional(),
});

export const createLearningResponseSchema = z.object({
  learning: z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
    tags: z.array(z.string()),
    date: z.string(),
    codeSnippet: z.string().optional(),
    codeLanguage: z.string().optional(),
  }),
});

export const createArticleRequestSchema = z.object({
  title: z.string().trim().min(1),
  excerpt: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  date: z.string().trim().optional(),
  readTime: z.string().trim().optional(),
  markdownBody: z.string().optional(),
});

export const createArticleResponseSchema = z.object({
  article: z.object({
    slug: z.string(),
    title: z.string(),
    date: z.string(),
    excerpt: z.string(),
    readTime: z.string(),
  }),
});

export const bookmarkMetadataSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(20).max(280),
  category: z.string().min(2),
  format: articleFormatSchema,
  author: z.string().min(1),
  tags: z.array(z.string().min(1)).min(3).max(8),
});

export const createBookmarkRequestSchema = z.object({
  url: z.string().url(),
});

export const createBookmarkResponseSchema = z.object({
  ok: z.literal(true),
  url: z.string().url(),
  storage: z.literal('db'),
  bookmark: bookmarkMetadataSchema,
});

export const validateResponseSchema = z.object({
  ok: z.boolean(),
  issueCount: z.number().int().nonnegative(),
  issues: z.array(
    z.object({
      scope: z.enum(['learnings', 'articles']),
      message: z.string(),
    })
  ),
});

export const adminErrorResponseSchema = z.object({
  error: z.string(),
});

export type CreateLearningRequest = z.infer<typeof createLearningRequestSchema>;
export type CreateLearningResponse = z.infer<typeof createLearningResponseSchema>;
export type CreateArticleRequest = z.infer<typeof createArticleRequestSchema>;
export type CreateArticleResponse = z.infer<typeof createArticleResponseSchema>;
export type CreateBookmarkRequest = z.infer<typeof createBookmarkRequestSchema>;
export type CreateBookmarkResponse = z.infer<typeof createBookmarkResponseSchema>;
export type ValidateResponse = z.infer<typeof validateResponseSchema>;
export type AdminErrorResponse = z.infer<typeof adminErrorResponseSchema>;
