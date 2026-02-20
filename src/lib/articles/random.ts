import resourcesData from '@/assets/static/json/resources.json';

export type Article = {
  title: string;
  description: string;
  category: string;
  format: string;
  url: string;
  author: string;
  tags: string[];
};

/**
 * Returns a deterministic random article based on the current date.
 * Same date = same article, different dates = different articles.
 */
export function getRandomArticleForDate(date: Date = new Date()): Article {
  const articles = resourcesData as Article[];

  // Create a seed from the date (YYYY-MM-DD format)
  const dateString = date.toISOString().split('T')[0];
  const seed = hashString(dateString);

  // Use the seed to pick an article
  const index = Math.abs(seed) % articles.length;
  return articles[index];
}

/**
 * Simple string hash function for deterministic randomness.
 * Uses djb2 algorithm.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Get all articles.
 */
export function getAllArticles(): Article[] {
  return resourcesData as Article[];
}
