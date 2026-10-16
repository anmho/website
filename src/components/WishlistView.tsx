'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import SectionContainer from '@/components/SectionContainer';
import Navbar from '@/components/Navbar';
import {
  createWishlistItem,
  parseWishlistItems,
  WISHLIST_STATUSES,
  WISHLIST_STORAGE_KEY,
  type WishlistItem,
  type WishlistStatus,
} from '@/lib/wishlist';

type WishlistForm = Omit<WishlistItem, 'id' | 'createdAt'>;

const EMPTY_FORM: WishlistForm = {
  name: '',
  maker: '',
  category: '',
  url: '',
  price: '',
  reason: '',
  status: 'considering',
};

const STATUS_LABELS: Record<WishlistStatus, string> = {
  considering: 'Considering',
  researching: 'Researching',
  ready: 'Ready to buy',
  owned: 'Owned',
};

function formatStatus(status: WishlistStatus) {
  return STATUS_LABELS[status];
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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
  const [form, setForm] = useState<WishlistForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const skipNextPersist = useRef(true);

  useEffect(() => {
    const storedItems = readStoredItems();
    if (window.localStorage.getItem(WISHLIST_STORAGE_KEY)) setItems(storedItems);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    setStatusMessage('Saved in this browser');
    const timeout = window.setTimeout(() => setStatusMessage(''), 1800);
    return () => window.clearTimeout(timeout);
  }, [hasHydrated, items]);

  const counts = useMemo(() => ({
    active: items.filter((item) => item.status !== 'owned').length,
    ready: items.filter((item) => item.status === 'ready').length,
  }), [items]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (item: WishlistItem) => {
    const { id: _id, createdAt: _createdAt, ...editable } = item;
    setEditingId(item.id);
    setForm(editable);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateForm = (field: keyof WishlistForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextItem = {
      ...form,
      name: form.name.trim(),
      maker: form.maker.trim(),
      category: form.category.trim(),
      url: normalizeUrl(form.url),
      price: form.price.trim(),
      reason: form.reason.trim(),
    };
    if (!nextItem.name || !nextItem.reason) return;

    if (editingId) {
      setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...nextItem } : item));
    } else {
      setItems((current) => [...current, createWishlistItem(nextItem)]);
    }
    closeForm();
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) closeForm();
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
      <SectionContainer className="pt-24 sm:pt-32">
        <div className="w-full text-left">
          <div className="flex flex-col gap-6 border-b border-gray-200 pb-10 dark:border-[#252525] lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                <span>Private studio / product radar</span>
                <span className="h-px w-8 bg-amber-500/50" aria-hidden="true" />
              </div>
              <h1 className="max-w-2xl text-5xl leading-[0.96] tracking-[-0.06em] sm:text-7xl">The things worth wanting.</h1>
              <p className="mt-7 max-w-2xl text-base font-light leading-relaxed tracking-wide text-gray-600 dark:text-gray-400 sm:text-lg">
                A ranked list of products that could make work, health, travel, or ordinary days better. Drag the thing that matters most to the top.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/decisions" className="rounded-sm border border-gray-200 px-4 py-3 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-[#252525] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white">Decisions</Link>
              <button type="button" onClick={() => window.location.assign('/cdn-cgi/access/logout')} className="rounded-sm border border-gray-200 px-4 py-3 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-[#252525] dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white">Sign out</button>
              <button type="button" onClick={openCreateForm} className="rounded-sm bg-gray-900 px-4 py-3 text-xs font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200">Add product</button>
            </div>
          </div>

          <div className="grid border-b border-gray-200 dark:border-[#252525] sm:grid-cols-3">
            <div className="border-b border-gray-200 py-5 sm:border-b-0 sm:border-r sm:pr-6 dark:border-[#252525]"><p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">Total radar</p><p className="mt-2 text-3xl tracking-[-0.05em]">{items.length}</p></div>
            <div className="border-b border-gray-200 py-5 sm:border-b-0 sm:border-r sm:px-6 dark:border-[#252525]"><p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">Still in play</p><p className="mt-2 text-3xl tracking-[-0.05em]">{counts.active}</p></div>
            <div className="py-5 sm:pl-6"><p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">Ready to act</p><p className="mt-2 text-3xl tracking-[-0.05em]">{counts.ready}</p></div>
          </div>

          {isFormOpen ? (
            <form onSubmit={saveItem} className="mt-10 border-y border-gray-200 py-8 dark:border-[#252525] sm:py-10" aria-label={editingId ? 'Edit product' : 'Add product'}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div><p className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">{editingId ? 'Refine product' : 'New product'}</p><h2 className="mt-2 text-2xl tracking-[-0.04em]">What belongs on the radar?</h2></div>
                <button type="button" onClick={closeForm} className="self-start text-xs text-gray-500 underline decoration-gray-300 underline-offset-4 hover:text-gray-900 dark:text-gray-500 dark:decoration-gray-700 dark:hover:text-white">Cancel</button>
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="text-xs font-medium">Product name <span className="text-amber-600">*</span></span><input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="A product worth considering" maxLength={160} className="mt-2 w-full border-b border-gray-200 bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-[#353535] dark:text-white" /></label>
                <label><span className="text-xs font-medium">Maker or brand</span><input value={form.maker} onChange={(event) => updateForm('maker', event.target.value)} placeholder="Who makes it?" maxLength={120} className="mt-2 w-full border-b border-gray-200 bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-[#353535] dark:text-white" /></label>
                <label><span className="text-xs font-medium">Category</span><input value={form.category} onChange={(event) => updateForm('category', event.target.value)} placeholder="Desk, travel, health..." maxLength={80} className="mt-2 w-full border-b border-gray-200 bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-[#353535] dark:text-white" /></label>
                <label><span className="text-xs font-medium">Price or range</span><input value={form.price} onChange={(event) => updateForm('price', event.target.value)} placeholder="$0 or under $0" maxLength={80} className="mt-2 w-full border-b border-gray-200 bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-[#353535] dark:text-white" /></label>
                <label><span className="text-xs font-medium">Status</span><select value={form.status} onChange={(event) => updateForm('status', event.target.value)} className="mt-2 w-full border-b border-gray-200 bg-transparent px-0 py-3 text-sm outline-none transition-colors focus:border-amber-500 dark:border-[#353535] dark:text-white">{WISHLIST_STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
                <label className="sm:col-span-2"><span className="text-xs font-medium">Product link</span><input type="text" inputMode="url" value={form.url} onChange={(event) => updateForm('url', event.target.value)} placeholder="https://..." maxLength={1000} className="mt-2 w-full border-b border-gray-200 bg-transparent px-0 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-[#353535] dark:text-white" /></label>
                <label className="sm:col-span-2"><span className="text-xs font-medium">Why this product? <span className="text-amber-600">*</span></span><textarea required value={form.reason} onChange={(event) => updateForm('reason', event.target.value)} placeholder="What problem would it solve, or what experience would it enable?" maxLength={1000} rows={4} className="mt-2 w-full resize-y border-b border-gray-200 bg-transparent px-0 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-gray-400 focus:border-amber-500 dark:border-[#353535] dark:text-white" /></label>
              </div>
              <div className="mt-6 flex justify-end"><button type="submit" className="rounded-sm bg-amber-500 px-4 py-3 text-xs font-semibold text-gray-950 transition-colors hover:bg-amber-400">{editingId ? 'Save changes' : 'Add to radar'}</button></div>
            </form>
          ) : null}

          <div className="mt-12 flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600">Priority order</p><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Drag to reorder. Use Alt plus the arrow keys when a card is focused.</p></div>
            <div className="flex items-center gap-3"><span role="status" aria-live="polite" className="text-xs text-amber-600 dark:text-amber-400">{statusMessage}</span>{items.length > 0 ? <button type="button" onClick={resetItems} className="text-xs text-gray-400 underline decoration-gray-300 underline-offset-4 hover:text-gray-900 dark:text-gray-600 dark:decoration-gray-800 dark:hover:text-white">Reset list</button> : null}</div>
          </div>

          {items.length > 0 ? (
            <div className="mt-5 border-t border-gray-200 dark:border-[#252525]" aria-label="Product wishlist">
              {items.map((item, index) => (
                <article key={item.id} tabIndex={0} aria-label={`${item.name}, priority ${index + 1}`} draggable onDragStart={(event) => handleDragStart(event, item.id)} onDragEnd={handleDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item.id)} onKeyDown={(event) => handleCardKeyDown(event, item.id)} className={`group border-b border-gray-200 py-5 outline-none transition-[border-color,opacity,transform] focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 dark:border-[#252525] sm:py-6 ${draggedId === item.id ? 'opacity-45' : 'hover:border-gray-400 dark:hover:border-gray-600'}`}>
                  <div className="flex gap-4 sm:gap-5">
                    <div className="flex shrink-0 flex-col items-center gap-3 pt-1"><span className="font-mono text-xs text-amber-600 dark:text-amber-400">{String(index + 1).padStart(2, '0')}</span><button type="button" aria-label={`Drag ${item.name}`} title="Drag to reorder" className="cursor-grab p-1 text-gray-400 transition-colors hover:text-gray-900 active:cursor-grabbing dark:hover:text-white"><span aria-hidden="true" className="block text-lg leading-none">⠿</span></button></div>
                    <div className="min-w-0 flex-1"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl tracking-[-0.04em] sm:text-2xl">{item.name}</h2><span className={`border-b pb-1 text-[10px] font-mono uppercase tracking-[0.1em] ${item.status === 'ready' ? 'border-amber-500/40 text-amber-700 dark:text-amber-400' : 'border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-500'}`}>{formatStatus(item.status)}</span></div><p className="mt-2 text-xs text-gray-500 dark:text-gray-500">{[item.maker, item.category, item.price].filter(Boolean).join(' · ') || 'Product details to fill in'}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => moveItem(item.id, -1)} disabled={index === 0} aria-label={`Move ${item.name} up`} className="border-b border-gray-200 px-1 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-25 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:text-white">↑</button><button type="button" onClick={() => moveItem(item.id, 1)} disabled={index === items.length - 1} aria-label={`Move ${item.name} down`} className="border-b border-gray-200 px-1 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-25 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:text-white">↓</button><button type="button" onClick={() => openEditForm(item)} className="border-b border-gray-200 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:text-white">Edit</button></div></div><p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.reason}</p><div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-amber-600 dark:text-white dark:decoration-gray-700 dark:hover:text-amber-400">Open product ↗</a> : null}<button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-red-600 dark:text-gray-600 dark:decoration-gray-800 dark:hover:text-red-400">Remove</button></div></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 border-y border-gray-300 px-6 py-16 text-center dark:border-[#353535]"><p className="text-3xl tracking-[-0.04em]">No products yet.</p><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-500">Start with the product you are most curious about. Keep the reason specific, then let the order reveal what deserves attention first.</p><button type="button" onClick={openCreateForm} className="mt-7 border-b border-gray-400 px-1 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-950 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-300 dark:hover:text-white">Add your first product</button></div>
          )}

          <p className="mt-10 border-t border-gray-200 pt-5 text-xs leading-relaxed text-gray-400 dark:border-[#252525] dark:text-gray-600">This private list is saved in this browser. The page and its controls remain protected by the site admin gate.</p>
        </div>
      </SectionContainer>
    </main>
  );
}
