'use client';

import { formatINR } from '../../utils/formatters';

function formatDateTimeIST(isoString) {
  if (!isoString) return 'Not available';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function getLotCode(auctionId) {
  if (!auctionId) return 'LOT #—';
  return `LOT #${auctionId.slice(0, 8).toUpperCase()}`;
}

export default function ResultOverviewCard({ auction, result, currentBidderId }) {
  const isClosed = result.status === 'CLOSED';
  const hasWinner = isClosed && Boolean(result.winnerId) && result.hadBids;
  const isCurrentUserWinner =
    hasWinner && result.winnerId === currentBidderId;

  const totalParticipantsDisplay =
    typeof result.totalParticipants === 'number'
      ? String(result.totalParticipants)
      : 'Not available';

  const extensionsDisplay =
    typeof result.extensionCount === 'number'
      ? `${result.extensionCount}`
      : 'Not available';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#10171f]">
      {/* Main Overview Row */}
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-12 md:p-6">
        {/* Product Image */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800">
            <img
              src="/images/hero-watch-dark.jpg"
              alt={auction.title}
              className="h-full w-full object-cover"
            />
            <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-200 backdrop-blur-sm">
              {getLotCode(auction.id)}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex flex-col justify-between space-y-3 md:col-span-8 lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                AuctionMe Verified Lot
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                ID: {auction.id}
              </span>
            </div>

            <h2 className="mt-1.5 font-serif text-xl font-semibold leading-snug text-slate-900 sm:text-2xl dark:text-white">
              {auction.title}
            </h2>

            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
              {auction.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-700 dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-300">
              Start: {formatINR(result.startingPrice)}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-700 dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-300">
              Min Increment: +{formatINR(auction.minIncrement)}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-500 dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-400">
              v{result.version}
            </span>
          </div>
        </div>

        {/* Winner / No-Winner / In-Progress Highlight Box */}
        <div className="md:col-span-12 lg:col-span-4">
          {hasWinner ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-50 to-amber-100/60 p-5 text-center dark:border-amber-500/35 dark:from-amber-950/35 dark:to-[#151b18]">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-[0.2em]">
                  Winner
                </span>
              </div>

              <div className="mt-2 flex items-center gap-1.5">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                  {result.winnerId}
                </span>
                {isCurrentUserWinner && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]">
                    You
                  </span>
                )}
              </div>

              <div className="mt-3 font-mono text-2xl font-bold tracking-tight text-auctionme-emeraldLight sm:text-3xl dark:text-auctionme-emeraldDark">
                {formatINR(result.finalPrice)}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800/80 dark:text-amber-300/80">
                Final Winning Price
              </div>
            </div>
          ) : isClosed ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-[#141c24]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-7 w-7 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 5h-2V3H7v2H5a2 2 0 00-2 2v1a5 5 0 004.39 4.94A5 5 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5 5 0 003.61-2.96A5 5 0 0021 8V7a2 2 0 00-2-2zM3 3l18 18"
                />
              </svg>
              <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                No Winner
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                This auction closed without any accepted bids.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {getLotCode(auction.id)}
                </span>
                <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  CLOSED
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-50/70 p-5 text-center dark:border-auctionme-emeraldDark/30 dark:bg-auctionme-emeraldDark/[0.07]">
              <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/20 dark:text-auctionme-emeraldDark">
                {result.status} — Result Pending
              </span>
              <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {formatINR(result.finalPrice)}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Final winner will be declared by the server once the auction closes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Authoritative Metrics Strip */}
      <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5 dark:border-slate-800 dark:bg-slate-800">
        <div className="bg-slate-50/80 px-4 py-3 dark:bg-[#0e141b]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Auction Started
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            {formatDateTimeIST(auction.startsAt)}
          </div>
        </div>

        <div className="bg-slate-50/80 px-4 py-3 dark:bg-[#0e141b]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Auction Closed
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            {result.closedAt ? formatDateTimeIST(result.closedAt) : 'Not closed yet'}
          </div>
        </div>

        <div className="bg-slate-50/80 px-4 py-3 dark:bg-[#0e141b]">
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Accepted Bids
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
            {result.bidCount}
          </div>
        </div>

        <div
          className="bg-slate-50/80 px-4 py-3 dark:bg-[#0e141b]"
          title="Server does not expose a participant count field in /result yet"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Participants
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
            {totalParticipantsDisplay}
          </div>
        </div>

        <div
          className="col-span-2 bg-slate-50/80 px-4 py-3 sm:col-span-1 dark:bg-[#0e141b]"
          title="Server does not expose an extension counter in /result yet"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Extensions
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
            {extensionsDisplay}
          </div>
        </div>
      </div>
    </section>
  );
}
