'use client';

export default function AuthStatusAlert({ status, message }) {
  if (!status || !message) return null;

  if (status === 'success') {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-auctionme-emeraldDark/40 dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.8 10.2l2.2 2.2 4.3-4.6" />
        </svg>
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 3.2L17.6 16.5H2.4L10 3.2z"
        />
        <path strokeLinecap="round" d="M10 8v3.6M10 14.2h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
