'use client';

export default function AuctionMeLogo({
  align = 'center',
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: {
      icon: 'h-7 w-7',
      title: 'text-xl',
      tagline: 'text-[9px] tracking-[0.22em]',
    },
    md: {
      icon: 'h-8 w-8',
      title: 'text-2xl',
      tagline: 'text-[10px] tracking-[0.22em]',
    },
    lg: {
      icon: 'h-10 w-10',
      title: 'text-3xl',
      tagline: 'text-[11px] tracking-[0.24em]',
    },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div
      className={`inline-flex items-center gap-3 ${
        align === 'center' ? 'justify-center' : 'justify-start'
      } ${className}`}
    >
      {/* AuctionMe Gavel Mark */}
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${s.icon} shrink-0 text-auctionme-emeraldLight dark:text-auctionme-emeraldDark`}
        aria-hidden="true"
      >
        <path
          d="M15.2 6.4L24.6 15.8L20.8 19.6L11.4 10.2L15.2 6.4Z"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M13.5 4.7L17 8.2M22.8 14L26.3 17.5"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M16.1 14.9L6.5 24.5C5.7 25.3 5.7 26.5 6.5 27.3C7.3 28.1 8.5 28.1 9.3 27.3L18.9 17.7"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 29H30.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      <div className="text-left leading-none">
        <div
          className={`font-serif font-semibold tracking-tight text-slate-900 dark:text-white ${s.title}`}
        >
          AuctionMe
        </div>
        <div
          className={`mt-1 font-sans font-medium uppercase text-slate-500 dark:text-slate-400 ${s.tagline}`}
        >
          THE ART OF THE BID.
        </div>
      </div>
    </div>
  );
}
