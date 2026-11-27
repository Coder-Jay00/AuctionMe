'use client';

import Link from 'next/link';

export function HoldingsLoadingSkeleton({ viewMode = 'grid' }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading holdings">
      {/* 4 Summary Metric Skeletons */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
          >
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Controls Skeleton */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-9 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"
          />
        ))}
      </div>

      {/* Cards Skeleton */}
      <div
        className={
          viewMode === 'list'
            ? 'space-y-3.5'
            : 'grid grid-cols-1 gap-4 lg:grid-cols-2'
        }
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mt-4 flex items-center gap-3.5">
              <div className="h-24 w-28 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-2.5">
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3.5 dark:border-auctionme-darkBorder/80">
              <div className="h-6 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HoldingsEmptyState({
  variant = 'won', // 'won' | 'leading' | 'completed' | 'filtered'
  onClearFilters,
}) {
  const copyMap = {
    won: {
      title: 'No Holdings yet.',
      description:
        "You haven't won any auctions yet. Keep bidding and this space will be filled with your wins.",
      ctaLabel: 'Discover Auctions',
      ctaHref: '/auctions',
    },
    leading: {
      title: 'Not leading any live auctions.',
      description:
        'Live auctions where you hold the current highest bid will appear here. Leading bids are not counted as won until the server closes the auction.',
      ctaLabel: 'Discover Auctions',
      ctaHref: '/auctions',
    },
    completed: {
      title: 'No completed auctions found.',
      description:
        'Server-closed auctions will appear here once auctions finish and results are finalized.',
      ctaLabel: 'Discover Auctions',
      ctaHref: '/auctions',
    },
    filtered: {
      title: 'No matching holdings.',
      description:
        'No auctions match your current search query or date filter. Try broadening your filters.',
      ctaLabel: 'Clear Filters',
      ctaHref: null,
    },
  };

  const content = copyMap[variant] || copyMap.won;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-14 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-auctionme-darkInput dark:text-slate-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.5l-9-5-9 5m18 0l-9 5m9-5v7l-9 5m0-7l-9-5m9 5v7m-9-12v7l9 5" />
        </svg>
      </div>
      <h2 className="mt-4 font-serif text-xl font-semibold text-slate-900 dark:text-white">
        {content.title}
      </h2>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
        {content.description}
      </p>

      {content.ctaHref ? (
        <Link
          href={content.ctaHref}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
        >
          {content.ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
        >
          {content.ctaLabel}
        </button>
      )}
    </div>
  );
}

export function HoldingsErrorState({ message, onRetry }) {
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
        Unable to load holdings.
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

export function BackendGapBanner({ reason, message }) {
  const isUnauth = reason === 'UNAUTHENTICATED';
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-2xl border border-amber-500/35 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-200"
    >
      <div className="flex items-start gap-2.5">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <path strokeLinecap="round" d="M10 6.5v4M10 13.5h.01" />
        </svg>
        <div>
          <p className="font-semibold">
            {isUnauth
              ? 'Bidder authentication required'
              : 'Backend bidder holdings API not available yet'}
          </p>
          <p className="mt-0.5 text-[11px] opacity-90">
            {message ||
              'GET /api/me/holdings is not implemented on the server. Summary metrics and personal Won/Leading lists remain at 0 instead of fabricated data; Completed displays server-authoritative closed auctions.'}
          </p>
        </div>
      </div>

      {isUnauth && (
        <Link
          href="/login"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-600/30 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-900/40 dark:text-amber-200"
        >
          Sign In
        </Link>
      )}
    </div>
  );
}
