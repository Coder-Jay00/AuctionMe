'use client';

import { useState } from 'react';
import {
  formatDateTimeFull,
  formatINR,
  formatShortDate,
  getAuctionLotLabel,
} from '../../utils/formatters';

function HoldingThumbnail({ auction, size = 'md' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = auction?.imageUrl || auction?.image || auction?.thumbnailUrl || null;

  const sizeClass =
    size === 'sm'
      ? 'h-16 w-20 shrink-0 rounded-xl'
      : size === 'list'
      ? 'h-20 w-28 shrink-0 rounded-xl'
      : 'h-24 w-28 shrink-0 rounded-xl sm:h-28 sm:w-32';

  if (src && !imgFailed) {
    return (
      <div
        className={`relative overflow-hidden border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-[#0c1117] ${sizeClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={auction.title || 'Auction item'}
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden border border-slate-200/90 bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200/70 dark:border-slate-800 dark:from-[#121a23] dark:via-[#0f1c1a] dark:to-[#0c1117] ${sizeClass}`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7 text-auctionme-emeraldLight/75 dark:text-auctionme-emeraldDark/70"
        aria-hidden="true"
      >
        <path
          d="M15.2 6.4L24.6 15.8L20.8 19.6L11.4 10.2L15.2 6.4Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M16.1 14.9L6.5 24.5C5.7 25.3 5.7 26.5 6.5 27.3C7.3 28.1 8.5 28.1 9.3 27.3L18.9 17.7"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M17.5 29H30.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function HoldingStatusBadge({ kind }) {
  if (kind === 'WON') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-auctionme-emeraldLight uppercase dark:border-auctionme-emeraldDark/40 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-amber-500 dark:text-amber-300" aria-hidden="true">
          <path d="M15 4h-1.5V2.5h-7V4H5a1.5 1.5 0 00-1.5 1.5V6a4 4 0 003.4 3.95A4.1 4.1 0 009.5 13v2H7v1.5h6V15h-2.5v-2a4.1 4.1 0 002.6-3.05A4 4 0 0016.5 6v-.5A1.5 1.5 0 0015 4z" />
        </svg>
        WON
      </span>
    );
  }

  if (kind === 'LEADING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/35 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-sky-700 uppercase dark:border-sky-400/35 dark:bg-sky-400/15 dark:text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-300" />
        LEADING (LIVE)
      </span>
    );
  }

  if (kind === 'NO_WINNER') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-600 uppercase dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
        NO WINNER
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-700 uppercase dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
      CLOSED
    </span>
  );
}

export function resolveHoldingKind(auction, authenticatedBidderId) {
  if (!auction) return 'CLOSED';
  const isClosed = auction.status === 'CLOSED';
  const hadBids =
    typeof auction.hadBids === 'boolean'
      ? auction.hadBids
      : typeof auction.bidCount === 'number'
      ? auction.bidCount > 0
      : Boolean(auction.winnerId);

  if (isClosed) {
    if (authenticatedBidderId && auction.winnerId === authenticatedBidderId && hadBids) {
      return 'WON';
    }
    if (!auction.winnerId || !hadBids) {
      return 'NO_WINNER';
    }
    return 'CLOSED';
  }

  if (
    auction.status === 'LIVE' &&
    authenticatedBidderId &&
    auction.highestBidderId === authenticatedBidderId
  ) {
    return 'LEADING';
  }

  return 'CLOSED';
}

export default function HoldingCard({
  auction,
  authenticatedBidderId,
  viewMode = 'grid',
  onViewDetails,
}) {
  const kind = resolveHoldingKind(auction, authenticatedBidderId);
  const lotLabel = getAuctionLotLabel(auction);
  const amountPaise = auction.finalPrice ?? auction.currentPrice ?? auction.startingPrice ?? 0;

  const priceLabel =
    kind === 'WON'
      ? 'Winning Bid'
      : kind === 'LEADING'
      ? 'Current Leading Bid'
      : kind === 'NO_WINNER'
      ? 'Starting Price'
      : 'Final Bid';

  const timestampLabel = auction.status === 'LIVE' ? 'Ends On' : 'Closed On';
  const timestampIso =
    auction.status === 'LIVE'
      ? auction.endsAt
      : auction.closedAt || auction.endsAt;

  // Optional tags strictly from API response (never fabricated)
  const specTags = Array.isArray(auction.tags)
    ? auction.tags.slice(0, 3)
    : Array.isArray(auction.specs)
    ? auction.specs.slice(0, 3)
    : auction.category
    ? [auction.category]
    : [];

  // Desktop List View
  if (viewMode === 'list') {
    return (
      <article className="group flex flex-col gap-4 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm transition hover:border-auctionme-emeraldLight/50 hover:shadow-md sm:flex-row sm:items-center dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:hover:border-auctionme-emeraldDark/45">
        <HoldingThumbnail auction={auction} size="list" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <HoldingStatusBadge kind={kind} />
              <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {lotLabel}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {timestampLabel}:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {formatDateTimeFull(timestampIso)}
              </span>
            </span>
          </div>

          <h3 className="mt-1.5 truncate font-serif text-base font-semibold text-slate-900 sm:text-lg dark:text-white">
            {auction.title}
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-4">
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {priceLabel}
                </span>
                <span className="font-sans text-base font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                  {formatINR(amountPaise)}
                </span>
              </div>
              {typeof auction.bidCount === 'number' && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                    {auction.bidCount}
                  </span>{' '}
                  {auction.bidCount === 1 ? 'bid' : 'bids'}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onViewDetails(auction)}
              className="inline-flex items-center justify-center rounded-xl border border-auctionme-emeraldLight/35 bg-emerald-50 px-4 py-2 text-xs font-bold text-auctionme-emeraldLight transition hover:bg-auctionme-emeraldLight hover:text-white dark:border-auctionme-emeraldDark/35 dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark dark:hover:bg-auctionme-emeraldDark dark:hover:text-[#061b12]"
            >
              View Details
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Responsive Grid Card (Desktop 2-col card; Mobile/Tablet compact clickable horizontal card)
  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm transition hover:border-auctionme-emeraldLight/50 hover:shadow-md dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:hover:border-auctionme-emeraldDark/45">
      {/* Top Row: Status + Lot Number */}
      <div className="flex items-center justify-between gap-2">
        <HoldingStatusBadge kind={kind} />
        <span className="font-mono text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
          {lotLabel}
        </span>
      </div>

      {/* Middle Row: Thumbnail + Title + Optional Specs */}
      <div className="mt-3.5 flex items-center gap-3.5">
        <HoldingThumbnail auction={auction} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-serif text-base font-semibold leading-snug text-slate-900 sm:text-lg dark:text-white">
            {auction.title}
          </h3>
          {specTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-800 dark:bg-auctionme-darkInput dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1.5 truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">
            ID: {auction.id}
          </p>
        </div>
      </div>

      {/* Bottom Row: Winning Bid | Closed On | View Details */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200/80 pt-3.5 dark:border-auctionme-darkBorder/80">
        <div className="flex items-end gap-4 sm:gap-6">
          <div>
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {priceLabel}
            </span>
            <span className="mt-0.5 block font-sans text-base font-bold tabular-nums text-auctionme-emeraldLight sm:text-lg dark:text-auctionme-emeraldDark">
              {formatINR(amountPaise)}
            </span>
          </div>

          <div className="min-w-0">
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {timestampLabel}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              {formatShortDate(timestampIso)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails(auction)}
          className="inline-flex items-center gap-1 rounded-xl border border-auctionme-emeraldLight/35 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-auctionme-emeraldLight transition hover:bg-auctionme-emeraldLight hover:text-white dark:border-auctionme-emeraldDark/35 dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark dark:hover:bg-auctionme-emeraldDark dark:hover:text-[#061b12]"
        >
          <span>View Details</span>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 lg:hidden" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5l5 5-5 5" />
          </svg>
        </button>
      </div>
    </article>
  );
}
