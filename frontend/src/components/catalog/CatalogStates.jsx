'use client';

function GavelIcon({ className = 'h-10 w-10' }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M15.2 6.4L24.6 15.8L20.8 19.6L11.4 10.2L15.2 6.4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 4.7L17 8.2M22.8 14L26.3 17.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.1 14.9L6.5 24.5C5.7 25.3 5.7 26.5 6.5 27.3C7.3 28.1 8.5 28.1 9.3 27.3L18.9 17.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 29H30.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 1. Loading Skeleton (responsive across desktop grid/list, tablet compact list, mobile cards)
 */
export function CatalogLoadingSkeleton({ viewMode = 'grid' }) {
  const items = [0, 1, 2, 3, 4, 5];

  if (viewMode === 'list') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading auctions">
        {items.slice(0, 4).map((i) => (
          <div
            key={i}
            className="flex animate-pulse flex-col gap-4 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 sm:flex-row sm:items-center dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
          >
            <div className="h-24 w-full shrink-0 rounded-xl bg-slate-200/80 sm:w-36 dark:bg-slate-800/80" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="flex gap-6 pt-1">
                <div className="h-4 w-24 rounded bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-4 w-20 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
            <div className="h-10 w-full shrink-0 rounded-xl bg-slate-200 sm:w-32 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5"
      aria-busy="true"
      aria-label="Loading auctions"
    >
      {items.map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
        >
          {/* Tablet compact skeleton row vs mobile/desktop card */}
          <div className="hidden md:flex md:items-center md:gap-4 lg:hidden">
            <div className="h-24 w-32 shrink-0 rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-4">
                <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-14 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </div>

          <div className="md:hidden lg:block">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-20 rounded bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
              <div className="h-6 w-6 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="aspect-[16/10] w-full rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
            <div className="mt-4 space-y-2">
              <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200/70 pt-3 dark:border-slate-800/80">
              <div className="space-y-1.5">
                <div className="h-3 w-14 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-10 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-5 w-10 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-14 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
            <div className="mt-4 flex gap-2.5">
              <div className="h-9 flex-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
              <div className="h-9 flex-[1.4] rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 2. Empty State — No Auctions Available in Database
 */
export function NoAuctionsAvailableState({ onRefresh }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-14 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark">
        <GavelIcon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 font-serif text-xl font-semibold text-slate-900 dark:text-white">
        No auctions available.
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
        There are currently no live, upcoming, or closed auctions published on the
        catalog. Check back soon for new listings.
      </p>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
        >
          Refresh Catalog
        </button>
      )}
    </div>
  );
}

/**
 * 3. Empty State — No Search / Filter Results
 */
export function NoSearchResultsState({ searchQuery, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-14 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark">
        <GavelIcon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 font-serif text-xl font-semibold text-slate-900 dark:text-white">
        No auctions found.
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {searchQuery
          ? `No auctions matched "${searchQuery}". Try adjusting your search or filters.`
          : 'Try adjusting your filters or check back later for new auctions.'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
      >
        Browse All Auctions
      </button>
    </div>
  );
}

/**
 * 4. Error State — API / Network Failure with Retry
 */
export function CatalogErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-red-300 bg-red-50/70 px-6 py-12 text-center dark:border-red-500/40 dark:bg-red-950/20"
    >
      <div className="flex items-center gap-2.5 text-auctionme-dangerLight dark:text-auctionme-dangerDark">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          className="h-6 w-6 shrink-0"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Unable to load auctions.
        </h3>
      </div>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
        {message || 'Please check your connection and try again.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-auctionme-emeraldLight/60 bg-white px-5 py-2 text-xs font-semibold text-auctionme-emeraldLight shadow-sm transition hover:bg-emerald-50 dark:border-auctionme-emeraldDark/50 dark:bg-auctionme-darkInput dark:text-auctionme-emeraldDark dark:hover:bg-auctionme-emeraldDark/15"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.5 10a6.5 6.5 0 111.9 4.6M3.5 14.5v-4.5H8"
          />
        </svg>
        <span>Retry</span>
      </button>
    </div>
  );
}

/**
 * 5. Empty Watchlist State
 */
export function EmptyWatchlistState({ onBrowseAll }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-14 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20.5s-7.5-4.6-9.5-9A5.4 5.4 0 0112 6.4a5.4 5.4 0 019.5 5.1c-2 4.4-9.5 9-9.5 9z"
          />
        </svg>
      </div>
      <h3 className="mt-4 font-serif text-xl font-semibold text-slate-900 dark:text-white">
        Your watchlist is empty.
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Tap the Watch button on any live or upcoming auction to keep track of bids
        and closing times here.
      </p>
      <button
        type="button"
        onClick={onBrowseAll}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
      >
        Discover Auctions
      </button>
    </div>
  );
}
