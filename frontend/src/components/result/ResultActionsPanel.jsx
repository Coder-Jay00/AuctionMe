'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatINR } from '../../utils/formatters';

export default function ResultActionsPanel({ auction, result }) {
  const [shareFeedback, setShareFeedback] = useState(null);

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined' ? window.location.href : '';
    const summary = result?.winnerId
      ? `${auction.title} closed at ${formatINR(result.finalPrice)} — Winner: ${result.winnerId}`
      : `${auction.title} — Auction Result (${result?.status})`;

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: `AuctionMe Result — ${auction.title}`,
          text: summary,
          url: shareUrl,
        });
        setShareFeedback('Shared successfully.');
      } else if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Result link copied to clipboard.');
      } else {
        setShareFeedback('Copy the URL from your browser address bar.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setShareFeedback('Unable to share result right now.');
      }
    }

    setTimeout(() => setShareFeedback(null), 3500);
  };

  return (
    <aside className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#10171f]">
      <Link
        href="/"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-auctionme-emeraldLight px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
      >
        <span>View Auction Details</span>
      </Link>

      <button
        type="button"
        onClick={handleShare}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#151e28] dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span>Share Result</span>
      </button>

      <Link
        href="/"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800/50"
      >
        <span aria-hidden="true">←</span>
        <span>Back to Discover</span>
      </Link>

      {shareFeedback && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-[11px] font-medium text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark"
        >
          {shareFeedback}
        </p>
      )}
    </aside>
  );
}
