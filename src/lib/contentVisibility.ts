export function isPrivateContent(tags?: string[]): boolean {
  return tags?.some((tag) => tag.trim().toLowerCase() === 'private') ?? false;
}
