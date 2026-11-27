'use client';

const CARDS = [
  {
    key: 'total',
    label: 'Total Bids',
    border: 'border-slate-200 dark:border-slate-800',
    iconTone: 'text-auctionme-emeraldLight dark:text-auctionme-emeraldDark',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l5 5-3 3-5-5 3-3zM12 10l-7 7a1.4 1.4 0 002 2l7-7M14 20h6" />
      </svg>
    ),
  },
  {
    key: 'accepted',
    label: 'Accepted',
    border: 'border-emerald-200 dark:border-auctionme-emeraldDark/30',
    iconTone: 'text-auctionme-emeraldLight dark:text-auctionme-emeraldDark',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.2l2.3 2.3 4.7-4.8" />
      </svg>
    ),
  },
  {
    key: 'rejected',
    label: 'Rejected',
    border: 'border-rose-200 dark:border-rose-500/30',
    iconTone: 'text-rose-600 dark:text-rose-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M9.5 9.5l5 5m0-5l-5 5" />
      </svg>
    ),
  },
  {
    key: 'outbid',
    label: 'Outbid',
    border: 'border-amber-200 dark:border-amber-500/30',
    iconTone: 'text-amber-600 dark:text-amber-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10M7 20h10M8 4v3a4 4 0 004 4 4 4 0 004-4V4M8 20v-3a4 4 0 014-4 4 4 0 014 4v3" />
      </svg>
    ),
  },
  {
    key: 'won',
    label: 'Won',
    border: 'border-amber-300/80 dark:border-amber-400/35',
    iconTone: 'text-amber-500 dark:text-amber-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z" />
      </svg>
    ),
  },
];

export default function LedgerSummaryCards({ metrics, unavailable = false }) {
  return (
    <section
      aria-label="Bid summary metrics"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {CARDS.map((card, index) => {
        const value = unavailable ? '—' : metrics[card.key] ?? 0;
        const spanFullOnMobile = index === CARDS.length - 1 ? 'col-span-2 sm:col-span-1' : '';
        return (
          <div
            key={card.key}
            className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-sm dark:bg-[#10171f] ${card.border} ${spanFullOnMobile}`}
          >
            <div className={`shrink-0 ${card.iconTone}`} aria-hidden="true">
              {card.icon}
            </div>
            <div className="min-w-0">
              <div className="font-mono text-xl font-bold leading-none text-slate-900 dark:text-white">
                {value}
              </div>
              <div className="mt-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {card.label}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
