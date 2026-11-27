'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  formatCountdown,
  formatDurationCompact,
  formatINR,
  formatShortDate,
  getAuctionLotLabel,
  getAuctionStatusMeta,
} from '../../utils/formatters';

function WatchlistImageSlot({ auction, compact = false }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = auction?.imageUrl || auction?.image || auction?.thumbnailUrl || null;

  if (src && !imgFailed) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-[#0c1117] ${
          compact ? 'h-24 w-28 shrink-0 sm:h-28 sm:w-36' : 'aspect-[16/10] w-full'
        }`}
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
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200/70 dark:border-slate-800 dark:from-[#121a23] dark:via-[#0f1c1a] dark:to-[#0c1117] ${
        compact ? 'h-24 w-28 shrink-0 sm:h-28 sm:w-36' : 'aspect-[16/10] w-full'
      }`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${
          compact ? 'h-6 w-6' : 'h-9 w-9'
        } text-auctionme-emeraldLight/75 dark:text-auctionme-emeraldDark/70`}
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

function getTimingDisplay(auction, nowMs) {
  if (!auction) {
    return { label: 'Time', value: '—', toneClass: 'text-slate-400' };
  }

  if (auction.status === 'LIVE') {
    const endsMs = new Date(auction.endsAt).getTime();
    const remaining = endsMs - nowMs;
    const isUrgent = remaining <= 60_000 && remaining > 0;
    return {
      label: 'Time Left',
      value: remaining <= 0 ? 'Closing...' : formatCountdown(remaining),
      toneClass: isUrgent
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-amber-600 dark:text-amber-400',
    };
  }

  if (auction.status === 'SCHEDULED') {
    const startsMs = new Date(auction.startsAt).getTime();
    const untilStart = startsMs - nowMs;
    return {
      label: 'Starts In',
      value:
        untilStart > 0
          ? formatDurationCompact(untilStart)
          : formatShortDate(auction.startsAt),
      toneClass: 'text-amber-600 dark:text-amber-400',
    };
  }

  return {
    label: 'Ended',
    value: formatShortDate(auction.closedAt || auction.endsAt),
    toneClass: 'text-slate-500 dark:text-slate-400',
  };
}

export default function WatchlistCard({
  auction,
  nowMs,
  layout = 'grid', // 'grid' | 'list'
  onRemove,
}) {
  const statusMeta = getAuctionStatusMeta(auction.status);
  const lotLabel = getAuctionLotLabel(auction);
  const timing = getTimingDisplay(auction, nowMs);
  const bidCount = typeof auction.bidCount === 'number' ? auction.bidCount : 0;

  const isLive = auction.status === 'LIVE';
  const isUpcoming = auction.status === 'SCHEDULED';
  const isClosed = auction.status === 'CLOSED';

  const priceLabel = isUpcoming
    ? 'Starting Price'
    : isLive
    ? 'Current Bid'
    : bidCount > 0
    ? 'Final Bid'
    : 'Starting Price';

  const displayPrice = isUpcoming
    ? auction.startingPrice
    : auction.currentPrice ?? auction.startingPrice;

  const auctionHref = isClosed
    ? `/auctions/${encodeURIComponent(auction.id)}/result`
    : `/?auctionId=${encodeURIComponent(auction.id)}`;

  const specTags = Array.isArray(auction.tags)
    ? auction.tags.slice(0, 3)
    : Array.isArray(auction.specs)
    ? auction.specs.slice(0, 3)
    : auction.category
    ? [auction.category]
    : [];

  const renderStatusAndLot = () => (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${statusMeta.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
        {statusMeta.label}
      </span>
      <span className="font-mono text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
        {lotLabel}
      </span>
    </div>
  );

  const renderRemoveHeart = () => (
    <button
      type="button"
      onClick={() => onRemove(auction)}
      aria-label={`Remove ${auction.title} from watchlist`}
      title="Remove from watchlist"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-auctionme-emeraldLight/30 bg-emerald-50 text-auctionme-emeraldLight transition hover:border-rose-500/40 hover:bg-rose-50 hover:text-rose-600 dark:border-auctionme-emeraldDark/30 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark dark:hover:border-rose-400/40 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-9.5-9A5.4 5.4 0 0112 6.4a5.4 5.4 0 019.5 5.1c-2 4.4-9.5 9-9.5 9z" />
      </svg>
    </button>
  );

  // Horizontal Card (Desktop List View + Tablet Compact View)
  const renderHorizontalCard = () => (
    <article className="group flex flex-col gap-4 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm transition hover:border-auctionme-emeraldLight/50 hover:shadow-md sm:flex-row sm:items-center dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:hover:border-auctionme-emeraldDark/45">
      <Link href={auctionHref} className="shrink-0">
        <WatchlistImageSlot auction={auction} compact />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {renderStatusAndLot()}
          {renderRemoveHeart()}
        </div>

        <Link href={auctionHref} className="mt-1.5 block">
          <h3 className="truncate font-serif text-base font-semibold text-slate-900 transition group-hover:text-auctionme-emeraldLight sm:text-lg dark:text-white dark:group-hover:text-auctionme-emeraldDark">
            {auction.title}
          </h3>
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <div>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {priceLabel}
              </span>
              <span className="font-sans text-base font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                {formatINR(displayPrice)}
              </span>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {bidCount}
              </span>{' '}
              {bidCount === 1 ? 'bid' : 'bids'}
            </div>

            <div>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {timing.label}
              </span>
              <span className={`text-xs font-bold tabular-nums ${timing.toneClass}`}>
                {timing.value}
              </span>
            </div>
          </div>

          <Link
            href={auctionHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-auctionme-emeraldLight px-4 py-2 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
          >
            <span>View Auction</span>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-3.5 w-3.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4h5v5M16 4l-7 7M8 5H5.5A1.5 1.5 0 004 6.5v8A1.5 1.5 0 005.5 16h8a1.5 1.5 0 001.5-1.5V12" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );

  // Vertical Card (Desktop 3-col Grid + Mobile Single-Column)
  const renderVerticalCard = () => (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm transition hover:border-auctionme-emeraldLight/50 hover:shadow-md dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:hover:border-auctionme-emeraldDark/45">
      {/* Top Row: Status + Lot ID + Remove Heart */}
      <div className="mb-3 flex items-center justify-between gap-2">
        {renderStatusAndLot()}
        {renderRemoveHeart()}
      </div>

      {/* Product Image */}
      <Link href={auctionHref} className="block">
        <WatchlistImageSlot auction={auction} />
      </Link>

      {/* Title & Optional Metadata */}
      <div className="mt-3.5 flex-1">
        <Link href={auctionHref} className="block">
          <h3 className="line-clamp-2 font-serif text-base font-semibold leading-snug text-slate-900 transition group-hover:text-auctionme-emeraldLight dark:text-white dark:group-hover:text-auctionme-emeraldDark">
            {auction.title}
          </h3>
        </Link>
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
      </div>

      {/* Metrics Row: Price | Bids | Time */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200/80 pt-3 dark:border-auctionme-darkBorder/80">
        <div className="min-w-0">
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {priceLabel}
          </span>
          <span className="mt-0.5 block truncate text-sm font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
            {formatINR(displayPrice)}
          </span>
        </div>

        <div className="text-center">
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Bids
          </span>
          <span className="mt-0.5 block text-sm font-bold tabular-nums text-slate-900 dark:text-white">
            {bidCount}
          </span>
        </div>

        <div className="min-w-0 text-right">
          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {timing.label}
          </span>
          <span className={`mt-0.5 block truncate text-sm font-bold tabular-nums ${timing.toneClass}`}>
            {timing.value}
          </span>
        </div>
      </div>

      {/* Primary Action: View Auction */}
      <div className="mt-4">
        <Link
          href={auctionHref}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-auctionme-emeraldLight px-3.5 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
        >
          <span>View Auction</span>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-3.5 w-3.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 4h5v5M16 4l-7 7M8 5H5.5A1.5 1.5 0 004 6.5v8A1.5 1.5 0 005.5 16h8a1.5 1.5 0 001.5-1.5V12" />
          </svg>
        </Link>
      </div>
    </article>
  );

  if (layout === 'list') {
    return renderHorizontalCard();
  }

  // Tablet (md..lg) renders compact horizontal cards; Mobile (< md) and Desktop (lg+) render vertical cards
  return (
    <>
      <div className="hidden md:block lg:hidden">{renderHorizontalCard()}</div>
      <div className="block md:hidden lg:block">{renderVerticalCard()}</div>
    </>
  );
}
