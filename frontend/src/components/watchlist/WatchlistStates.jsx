'use client';

import Link from 'next/link';

export function WatchlistLoadingSkeleton({ viewMode = 'grid' }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading watchlist">
      {/* 4 Summary Metric Skeletons */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
          >
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Cards Skeleton */}
      <div
        className={
          viewMode === 'list'
            ? 'space-y-3.5'
            : 'grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5'
        }
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-7 w-7 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mt-3 aspect-[16/10] w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mt-4 h-9 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WatchlistEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-14 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20.5s-7.5-4.6-9.5-9A5.4 5.4 0 0112 6.4a5.4 5.4 0 019.5 5.1c-2 4.4-9.5 9-9.5 9z"
          />
        </svg>
      </div>
      <h2 className="mt-4 font-serif text-xl font-semibold text-slate-900 dark:text-white">
        Your watchlist is empty.
      </h2>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
        Save auctions you&apos;re interested in to track them here.
      </p>
      <Link
        href="/auctions"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" />
          <path strokeLinecap="round" d="M13.2 13.2L17 17" />
        </svg>
        <span>Discover Auctions</span>
      </Link>
    </div>
  );
}

export function WatchlistFilteredEmptyState({ onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-12 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-auctionme-darkInput dark:text-slate-500">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" />
          <path strokeLinecap="round" d="M13.2 13.2L17 17" />
        </svg>
      </div>
      <h2 className="mt-4 font-serif text-lg font-semibold text-slate-900 dark:text-white">
        No matching watched auctions.
      </h2>
      <p className="mt-1.5 max-w-sm text-xs text-slate-500 sm:text-sm dark:text-slate-400">
        No tracked auctions match your current tab, search query, or category filter.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
      >
        Clear Filters
      </button>
    </div>
  );
}

export function WatchlistErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-50/70 px-6 py-12 text-center shadow-sm dark:border-rose-500/35 dark:bg-rose-950/20"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.6 17.5a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
      </div>
      <h2 className="mt-4 font-serif text-lg font-semibold text-slate-900 dark:text-white">
        Unable to load your watchlist.
      </h2>
      <p className="mt-1.5 max-w-md text-xs text-slate-600 sm:text-sm dark:text-slate-300">
        {message || 'Please check your connection and try again.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-auctionme-emeraldLight/40 bg-white px-5 py-2.5 text-xs font-bold text-auctionme-emeraldLight shadow-sm transition hover:bg-emerald-50 dark:border-auctionme-emeraldDark/40 dark:bg-auctionme-darkInput dark:text-auctionme-emeraldDark dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 10a6 6 0 0110.5-4M16 4v3.5h-3.5M16 10a6 6 0 01-10.5 4M4 16v-3.5h3.5" />
        </svg>
        <span>Retry</span>
      </button>
    </div>
  );
}

export function WatchlistBackendGapBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-2xl border border-amber-500/35 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-200"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path strokeLinecap="round" d="M10 6.5v4M10 13.5h.01" />
      </svg>
      <div>
        <p className="font-semibold">
          Server-side watchlist persistence is not implemented yet
        </p>
        <p className="mt-0.5 text-[11px] opacity-90">
          The backend does not expose bidder-specific watchlist endpoints or a watchlist
          table yet. Auction prices, statuses, and timers below are live and
          server-authoritative, while your watchlist selection is stored only in this
          browser and is not saved to your account.
        </p>
      </div>
    </div>
  );
}
