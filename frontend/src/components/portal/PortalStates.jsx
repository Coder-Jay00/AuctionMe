'use client';

export function PortalLoadingSkeleton({ cards = 4 }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading data">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="h-56 w-full animate-pulse rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel" />
    </div>
  );
}

export function PortalErrorState({ title = 'Unable to load data.', message, onRetry }) {
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
        {title}
      </h2>
      <p className="mt-1.5 max-w-md text-xs text-slate-600 sm:text-sm dark:text-slate-300">
        {message || 'Please check your connection and try again.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-auctionme-darkInput dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function PortalEmptyState({ title, description, action = null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-12 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-auctionme-darkInput dark:text-slate-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.5l-9-5-9 5m18 0l-9 5m9-5v7l-9 5m0-7l-9-5m9 5v7m-9-12v7l9 5" />
        </svg>
      </div>
      <h2 className="mt-4 font-serif text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function BackendRequirementNotice({
  title,
  description,
  accent = 'amber', // 'amber' | 'purple'
}) {
  const cls =
    accent === 'purple'
      ? 'border-purple-500/35 bg-purple-50/80 text-purple-950 dark:border-purple-400/30 dark:bg-purple-950/25 dark:text-purple-200'
      : 'border-amber-500/35 bg-amber-50/80 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-200';

  const iconCls =
    accent === 'purple'
      ? 'text-purple-600 dark:text-purple-400'
      : 'text-amber-600 dark:text-amber-400';

  return (
    <div role="status" className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs ${cls}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`mt-0.5 h-4 w-4 shrink-0 ${iconCls}`} aria-hidden="true">
        <circle cx="10" cy="10" r="7.5" />
        <path strokeLinecap="round" d="M10 6.5v4M10 13.5h.01" />
      </svg>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] opacity-90">{description}</p>
      </div>
    </div>
  );
}
