'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchAuction,
  fetchAuctionBids,
  fetchAuctionResult,
} from '../../services/api';
import {
  formatAuctionPeriod,
  formatINR,
  getAuctionLotLabel,
} from '../../utils/formatters';
import { HoldingStatusBadge, resolveHoldingKind } from './HoldingCard';

export default function HoldingDetailsDrawer({
  auction,
  authenticatedBidderId,
  onClose,
}) {
  const [detailAuction, setDetailAuction] = useState(auction);
  const [result, setResult] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setDetailAuction(auction);
    setResult(null);
    setBids([]);
    setError(null);
    setImgFailed(false);

    if (!auction?.id) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchAuction(auction.id),
      fetchAuctionResult(auction.id),
      fetchAuctionBids(auction.id, 200),
    ])
      .then(([auctionRes, resultRes, bidsRes]) => {
        if (cancelled) return;
        if (auctionRes?.auction) setDetailAuction(auctionRes.auction);
        if (resultRes?.result) setResult(resultRes.result);
        if (Array.isArray(bidsRes?.bids)) setBids(bidsRes.bids);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.message || 'Could not refresh authoritative auction details.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auction]);

  // Close on Escape key
  useEffect(() => {
    if (!auction) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [auction, onClose]);

  if (!auction) return null;

  const activeAuction = detailAuction || auction;
  const kind = resolveHoldingKind(
    {
      ...activeAuction,
      winnerId: result?.winnerId ?? activeAuction.winnerId,
      hadBids: result?.hadBids ?? activeAuction.hadBids,
      bidCount: result?.bidCount ?? activeAuction.bidCount,
      status: result?.status ?? activeAuction.status,
    },
    authenticatedBidderId
  );

  const lotLabel = getAuctionLotLabel(activeAuction);
  const winningAmount =
    result?.finalPrice ?? activeAuction.currentPrice ?? activeAuction.startingPrice;
  const totalBids =
    typeof result?.bidCount === 'number'
      ? result.bidCount
      : typeof activeAuction.bidCount === 'number'
      ? activeAuction.bidCount
      : null;

  // Compute participants strictly from server data if available
  let participantsDisplay = 'Not available';
  if (typeof result?.totalParticipants === 'number') {
    participantsDisplay = String(result.totalParticipants);
  } else if (totalBids === 0) {
    participantsDisplay = '0';
  } else if (bids.length > 0 && totalBids !== null) {
    const distinctBidders = new Set(bids.map((b) => b.bidderId).filter(Boolean)).size;
    participantsDisplay =
      bids.length >= totalBids ? String(distinctBidders) : `${distinctBidders}+`;
  }

  // Extensions strictly from server data if exposed
  const extensionsDisplay =
    typeof result?.extensionCount === 'number'
      ? String(result.extensionCount)
      : typeof activeAuction.extensionCount === 'number'
      ? String(activeAuction.extensionCount)
      : 'Not available';

  const periodDisplay = formatAuctionPeriod(
    activeAuction.startsAt,
    result?.closedAt || activeAuction.closedAt || result?.endsAt || activeAuction.endsAt
  );

  const imgSrc =
    activeAuction.imageUrl || activeAuction.image || activeAuction.thumbnailUrl || null;

  const specTags = Array.isArray(activeAuction.tags)
    ? activeAuction.tags
    : Array.isArray(activeAuction.specs)
    ? activeAuction.specs
    : activeAuction.category
    ? [activeAuction.category]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="holding-details-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-auctionme-lightBorder bg-auctionme-lightPanel shadow-2xl dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-auctionme-lightBorder px-5 py-4 dark:border-auctionme-darkBorder">
          <h2
            id="holding-details-title"
            className="font-serif text-lg font-semibold text-slate-900 dark:text-white"
          >
            Holding Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close holding details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Hero Product Image */}
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 dark:border-slate-800 dark:bg-[#0c1117]">
            {imgSrc && !imgFailed ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imgSrc}
                alt={activeAuction.title || 'Auction item'}
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200/70 dark:from-[#121a23] dark:via-[#0f1c1a] dark:to-[#0c1117]">
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-auctionme-emeraldLight/75 dark:text-auctionme-emeraldDark/70"
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
                <span className="mt-2 font-mono text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {lotLabel}
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <HoldingStatusBadge kind={kind} />
              <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {lotLabel}
              </span>
            </div>

            <h3 className="mt-2.5 font-serif text-xl font-semibold leading-snug text-slate-900 dark:text-white">
              {activeAuction.title}
            </h3>

            {activeAuction.description && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {activeAuction.description}
              </p>
            )}

            {specTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {specTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-800 dark:bg-auctionme-darkInput dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-2.5 break-all font-mono text-[10px] text-slate-400 dark:text-slate-500">
              Auction ID: {activeAuction.id}
            </p>
          </div>

          {/* Refreshing indicator or inline error */}
          {loading && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-300">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-auctionme-emeraldLight border-t-transparent dark:border-auctionme-emeraldDark dark:border-t-transparent" />
              <span>Syncing authoritative auction result...</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Authoritative Key-Value Metrics */}
          <dl className="divide-y divide-slate-200/80 rounded-2xl border border-auctionme-lightBorder bg-slate-50/70 px-4 dark:divide-auctionme-darkBorder/80 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/70">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-auctionme-emeraldLight dark:text-auctionme-emeraldDark" aria-hidden="true">
                  <path d="M15 4h-1.5V2.5h-7V4H5a1.5 1.5 0 00-1.5 1.5V6a4 4 0 003.4 3.95A4.1 4.1 0 009.5 13v2H7v1.5h6V15h-2.5v-2a4.1 4.1 0 002.6-3.05A4 4 0 0016.5 6v-.5A1.5 1.5 0 0015 4z" />
                </svg>
                {kind === 'WON'
                  ? 'Winning Bid'
                  : kind === 'LEADING'
                  ? 'Current Leading Bid'
                  : 'Final Amount'}
              </dt>
              <dd className="font-mono text-sm font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                {formatINR(winningAmount)}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-4 py-3.5">
              <dt className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
                  <rect x="3" y="4" width="14" height="13" rx="2" />
                  <path strokeLinecap="round" d="M7 2.5v2.5M13 2.5v2.5M3 8h14" />
                </svg>
                Auction Period
              </dt>
              <dd className="text-right text-xs font-medium text-slate-800 dark:text-slate-200">
                {periodDisplay}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 15h12M6 12V9M10 12V6M14 12V8" />
                </svg>
                Total Accepted Bids
              </dt>
              <dd className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                {totalBids !== null ? totalBids : '—'}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
                  <circle cx="8" cy="7" r="2.5" />
                  <path strokeLinecap="round" d="M3.5 15.5c.7-2 2.3-3 4.5-3s3.8 1 4.5 3" />
                  <circle cx="14" cy="7.5" r="2" />
                  <path strokeLinecap="round" d="M13.5 12.8c1.4.3 2.4 1.1 3 2.7" />
                </svg>
                Participants
              </dt>
              <dd className="font-mono text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {participantsDisplay}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
                  <circle cx="10" cy="10" r="6.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6.5V10l2.5 1.5" />
                </svg>
                Extensions
              </dt>
              <dd className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                {extensionsDisplay}
              </dd>
            </div>

            {result?.status === 'CLOSED' && (
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Authoritative Winner
                </dt>
                <dd className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                  {result.winnerId ? result.winnerId : 'No Winner'}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Drawer Footer CTA */}
        <div className="border-t border-auctionme-lightBorder p-4 dark:border-auctionme-darkBorder">
          <Link
            href={`/auctions/${encodeURIComponent(activeAuction.id)}/result`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-auctionme-emeraldLight px-4 py-3 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
          >
            <span>View Auction Result</span>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 4h5v5M16 4l-7 7M8 5H5.5A1.5 1.5 0 004 6.5v8A1.5 1.5 0 005.5 16h8a1.5 1.5 0 001.5-1.5V12" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
