'use client';

import Link from 'next/link';
import { useEffect, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import SectionContainer from '@/components/SectionContainer';
import Navbar from '@/components/Navbar';
import {
  createWishlistItem,
  parseWishlistItems,
  WISHLIST_STORAGE_KEY,
  type WishlistItem,
  type WishlistItemDraft,
  type WishlistStatus,
} from '@/lib/wishlist';

const STATUS_LABELS: Record<WishlistStatus, string> = {
  considering: 'Considering',
  researching: 'Researching',
  ready: 'Ready to buy',
  owned: 'Owned',
};

function formatStatus(status: WishlistStatus) {
  return STATUS_LABELS[status];
}

function readStoredItems() {
  try {
    return parseWishlistItems(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) || 'null'));
  } catch {
    return [];
  }
}

export default function WishlistView({ initialItems }: { initialItems: WishlistItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    const storedItems = readStoredItems();
    if (window.localStorage.getItem(WISHLIST_STORAGE_KEY)) setItems(storedItems);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  }, [hasHydrated, items]);

  const openEditForm = (item: WishlistItem) => {
    setEditingId(item.id);
    setUrl(item.url);
    setScrapeError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setUrl('');
    setScrapeError('');
  };

  const importProduct = async (requestedUrl = url) => {
    const productUrl = requestedUrl.trim();
    if (!productUrl || isScraping) return;

    setIsScraping(true);
    setScrapeError('');
    try {
      const response = await fetch('/api/wishlist/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl }),
      });
      const payload = await response.json() as { item?: WishlistItemDraft; error?: string };
      if (!response.ok || !payload.item) throw new Error(payload.error || 'Could not read that product page.');
      const importedItem = payload.item;

      if (editingId) {
        setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...importedItem, status: item.status } : item));
      } else {
        setItems((current) => [...current, createWishlistItem(importedItem)]);
      }
      setEditingId(null);
      setUrl('');
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : 'Could not read that product page.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleUrlPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedUrl = event.clipboardData.getData('text').trim();
    if (!pastedUrl) return;
    event.preventDefault();
    setUrl(pastedUrl);
    void importProduct(pastedUrl);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) cancelEdit();
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, moved);
      return reordered;
    });
  };

  const moveItemAfter = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(reordered.findIndex((item) => item.id === targetId), 0, moved);
      return reordered;
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => setDraggedId(null);

  const handleDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggedId;
    if (sourceId) moveItemAfter(sourceId, targetId);
    setDraggedId(null);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      moveItem(id, -1);
    }
    if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault();
      moveItem(id, 1);
    }
  };

  const resetItems = () => {
    setItems(initialItems);
    window.localStorage.removeItem(WISHLIST_STORAGE_KEY);
  };

  return (
    <main className="min-h-screen w-full pb-24 text-gray-900 dark:text-white">
      <Navbar />
      <SectionContainer className="pt-20 sm:pt-24">
        <div className="w-full text-left">
          <div className="flex flex-col gap-5 border-b border-gray-200 pb-7 dark:border-[#252525] lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Private / Wishlist</p>
              <h1 className="mt-3 text-2xl tracking-[-0.04em] sm:text-3xl">Product wishlist</h1>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/decisions" className="rounded-sm border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-[#252525] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white">Decisions</Link>
              <button type="button" onClick={() => window.location.assign('/cdn-cgi/access/logout')} className="rounded-sm border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-[#252525] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white">Sign out</button>
            </div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void importProduct(); }} className="mt-6 border-b border-gray-200 pb-5 dark:border-[#252525]" aria-label={editingId ? 'Refresh product' : 'Add product'} aria-busy={isScraping}>
            <div className="flex gap-3">
              <label htmlFor="wishlist-url" className="sr-only">Product URL</label>
              <input id="wishlist-url" type="url" inputMode="url" autoFocus value={url} onChange={(event) => setUrl(event.target.value)} onPaste={handleUrlPaste} placeholder="Paste a product link" disabled={isScraping} required className="min-w-0 flex-1 border-b border-gray-300 bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 disabled:opacity-50 dark:border-[#353535] dark:text-white" />
              <button type="submit" disabled={isScraping} className="shrink-0 border-b border-gray-900 px-1 py-2 text-xs font-medium text-gray-900 transition-colors hover:border-amber-500 hover:text-amber-600 disabled:cursor-wait disabled:opacity-50 dark:border-white dark:text-white dark:hover:border-amber-400 dark:hover:text-amber-400">{isScraping ? 'Reading...' : editingId ? 'Refresh' : 'Add'}</button>
              {editingId ? <button type="button" onClick={cancelEdit} disabled={isScraping} className="shrink-0 border-b border-gray-300 px-1 py-2 text-xs text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:hover:border-gray-400 dark:hover:text-white">Cancel</button> : null}
            </div>
            {scrapeError ? <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">{scrapeError}</p> : null}
          </form>

          <>
              <div className="mt-8 flex items-end justify-between gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Drag to prioritize.</p>
                {items.length > 0 ? <button type="button" onClick={resetItems} className="text-xs text-gray-400 underline decoration-gray-300 underline-offset-4 hover:text-gray-900 dark:text-gray-600 dark:decoration-gray-800 dark:hover:text-white">Reset</button> : null}
              </div>

              {items.length > 0 ? (
                <div className="mt-5 border-t border-gray-200 dark:border-[#252525]" aria-label="Product wishlist">
                  {items.map((item, index) => (
                    <article key={item.id} tabIndex={0} aria-label={`${item.name}, priority ${index + 1}`} draggable onDragStart={(event) => handleDragStart(event, item.id)} onDragEnd={handleDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item.id)} onKeyDown={(event) => handleCardKeyDown(event, item.id)} className={`group border-b border-gray-200 py-5 outline-none transition-[border-color,opacity,transform] focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 dark:border-[#252525] sm:py-6 ${draggedId === item.id ? 'opacity-45' : 'hover:border-gray-400 dark:hover:border-gray-600'}`}>
                      <div className="flex gap-4 sm:gap-5">
                        <div className="flex shrink-0 flex-col items-center gap-3 pt-1"><span className="font-mono text-xs text-amber-600 dark:text-amber-400">{String(index + 1).padStart(2, '0')}</span><button type="button" aria-label={`Drag ${item.name}`} title="Drag to reorder" className="cursor-grab p-1 text-gray-400 transition-colors hover:text-gray-900 active:cursor-grabbing dark:hover:text-white"><span aria-hidden="true" className="block text-lg leading-none">⠿</span></button></div>
                        <div className="min-w-0 flex-1"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-medium tracking-[-0.02em] sm:text-xl">{item.name}</h2><span className={`border-b pb-1 text-[10px] font-mono uppercase tracking-[0.1em] ${item.status === 'ready' ? 'border-amber-500/40 text-amber-700 dark:text-amber-400' : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-500'}`}>{formatStatus(item.status)}</span></div><p className="mt-2 text-xs text-gray-500 dark:text-gray-500">{[item.maker, item.category, item.price].filter(Boolean).join(' · ') || 'Product details to fill in'}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => moveItem(item.id, -1)} disabled={index === 0} aria-label={`Move ${item.name} up`} className="border-b border-gray-200 px-1 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-25 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:text-white">↑</button><button type="button" onClick={() => moveItem(item.id, 1)} disabled={index === items.length - 1} aria-label={`Move ${item.name} down`} className="border-b border-gray-200 px-1 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-25 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:text-white">↓</button><button type="button" onClick={() => openEditForm(item)} className="border-b border-gray-200 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:text-white">Refresh</button></div></div><p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.reason}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-amber-600 dark:text-white dark:decoration-gray-700 dark:hover:text-amber-400">Open product ↗</a> : null}<button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-red-600 dark:text-gray-600 dark:decoration-gray-800 dark:hover:text-red-400">Remove</button></div></div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 border-y border-gray-300 px-6 py-10 text-center dark:border-[#353535]"><p className="text-lg font-medium tracking-[-0.02em]">No products yet.</p></div>
              )}
          </>
        </div>
      </SectionContainer>
    </main>
  );
}
