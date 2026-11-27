'use client';

import { formatINR } from '../../utils/formatters';

export default function HoldingsSummaryMetrics({
  totalWon,
  totalValuePaise,
  wonThisMonth,
  averageWinningBidPaise,
}) {
  const metrics = [
    {
      id: 'total_won',
      label: 'Won Auctions',
      value: String(totalWon),
      iconTone:
        'bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
        </svg>
      ),
    },
    {
      id: 'total_value',
      label: 'Total Value',
      value: formatINR(totalValuePaise),
      iconTone:
        'bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
      ),
    },
    {
      id: 'won_this_month',
      label: 'Won This Month',
      value: String(wonThisMonth),
      iconTone:
        'bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
          <path strokeLinecap="round" d="M8 2.5v3M16 2.5v3M3.5 9.5h17" />
        </svg>
      ),
    },
    {
      id: 'avg_winning_bid',
      label: 'Avg. Winning Bid',
      value: formatINR(averageWinningBidPaise),
      iconTone:
        'bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 15v-4M12 15V7M17 15v-6" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-label="Holdings summary metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
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
            <p className="truncate font-sans text-lg font-bold tracking-tight tabular-nums text-slate-900 sm:text-xl dark:text-white">
              {metric.value}
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">
              {metric.label}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
