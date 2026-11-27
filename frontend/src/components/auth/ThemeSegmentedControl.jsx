'use client';

const OPTIONS = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5">
        <circle cx="10" cy="10" r="3.5" />
        <path strokeLinecap="round" d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7L14 6M6 14l-1.3 1.3" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.2 12.6A6.5 6.5 0 017.4 3.8a6.8 6.8 0 108.8 8.8z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5">
        <rect x="2.75" y="3.5" width="14.5" height="9.75" rx="1.5" />
        <path strokeLinecap="round" d="M7 16.5h6M10 13.25V16.5" />
      </svg>
    ),
  },
];

export default function ThemeSegmentedControl({ value, onChange, compact = false }) {
  return (
    <div
      role="radiogroup"
      aria-label="Color theme preference"
      className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-[#131a22]"
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all ${
              compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'
            } ${
              isActive
                ? 'border border-auctionme-emeraldLight/50 bg-emerald-50 text-auctionme-emeraldLight shadow-sm dark:border-auctionme-emeraldDark/60 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                : 'border border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
