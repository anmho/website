export const WISHLIST_STORAGE_KEY = 'andrew-product-wishlist-v1';

export const WISHLIST_STATUSES = ['considering', 'researching', 'ready', 'owned'] as const;

export type WishlistStatus = (typeof WISHLIST_STATUSES)[number];

export type WishlistItem = {
  id: string;
  name: string;
  maker: string;
  category: string;
  url: string;
  price: string;
  reason: string;
  status: WishlistStatus;
  createdAt: string;
};

export type WishlistItemDraft = Omit<WishlistItem, 'id' | 'createdAt'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isStatus(value: unknown): value is WishlistStatus {
  return typeof value === 'string' && WISHLIST_STATUSES.includes(value as WishlistStatus);
}

export function parseWishlistItems(value: unknown): WishlistItem[] {
  if (!Array.isArray(value)) return [];

  const ids = new Set<string>();
  return value.filter((item): item is WishlistItem => {
    if (!isRecord(item) || !text(item.id, 100) || !item.id.trim() || ids.has(item.id)) return false;
    if (!text(item.name, 160) || !item.name.trim() || !text(item.maker, 120) || !text(item.category, 80)) return false;
    if (!text(item.url, 1000) || !text(item.price, 80) || !text(item.reason, 1000) || !text(item.createdAt, 80) || !isStatus(item.status)) return false;

    ids.add(item.id);
    return true;
  });
}

export function createWishlistItem(input: WishlistItemDraft): WishlistItem {
  return {
    ...input,
    id: `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
}
