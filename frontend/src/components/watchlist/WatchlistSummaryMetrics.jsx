'use client';

export default function WatchlistSummaryMetrics({
  savedCount,
  liveCount,
  upcomingCount,
  completedCount,
}) {
  const metrics = [
    {
      id: 'saved',
      label: 'Saved Auctions',
      shortLabel: 'Saved',
      value: savedCount,
      iconTone:
        'bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5v16l-6-3.5-6 3.5v-16z" />
        </svg>
      ),
    },
    {
      id: 'live',
      label: 'Live Now',
      shortLabel: 'Live',
      value: liveCount,
      iconTone:
        'bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="12" r="2.2" />
          <path
            strokeLinecap="round"
            d="M8.2 8.2a5.4 5.4 0 000 7.6M15.8 8.2a5.4 5.4 0 010 7.6M5.4 5.4a9.3 9.3 0 000 13.2M18.6 5.4a9.3 9.3 0 010 13.2"
          />
        </svg>
      ),
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      shortLabel: 'Upcoming',
      value: upcomingCount,
      iconTone:
        'bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
          <path strokeLinecap="round" d="M8 2.5v3M16 2.5v3M3.5 9.5h17" />
        </svg>
      ),
    },
    {
      id: 'completed',
      label: 'Completed',
      shortLabel: 'Completed',
      value: completedCount,
      iconTone:
        'bg-slate-500/15 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.2l2.3 2.3 4.7-4.8" />
        </svg>
      ),
    },
  ];

  return (
    <section
      aria-label="Watchlist summary metrics"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4"
    >
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="flex items-center gap-3 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-3.5 shadow-sm transition-colors sm:px-4 sm:py-4 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.iconTone}`}
          >
            {metric.icon}
          </div>
          <div className="min-w-0">
            <p className="font-sans text-lg font-bold tracking-tight tabular-nums text-slate-900 sm:text-xl dark:text-white">
              {metric.value}
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">
              <span className="hidden sm:inline">{metric.label}</span>
              <span className="sm:hidden">{metric.shortLabel}</span>
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
