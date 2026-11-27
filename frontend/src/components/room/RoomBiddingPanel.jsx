'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  formatCountdown,
  formatINR,
  formatTimeShort,
  maskBidderId,
} from '../../utils/formatters';

export default function RoomBiddingPanel({
  auction,
  bidderId,
  serverOffsetMs,
  lastExtensionAt,
  isSubmitting,
  feedback,
  pendingRetryBid,
  onConfirmAndSubmitBid,
  onRetryPendingBid,
  onCancelPendingRetry,
}) {
  const [rupeeInput, setRupeeInput] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);
  const [validationError, setValidationError] = useState(null);
  const [confirmDraft, setConfirmDraft] = useState(null); // { amountPaise }

  // Sync default bid input to at least minNextBid when auction price advances
  useEffect(() => {
    if (!auction) return;
    setRupeeInput((prev) => {
      const parsed = Number(prev);
      if (!prev || Number.isNaN(parsed) || parsed < auction.minNextBid / 100) {
        return String(auction.minNextBid / 100);
      }
      return prev;
    });
  }, [auction?.minNextBid]);

  // Authoritative server-synced countdown timer
  useEffect(() => {
    if (!auction?.endsAt) return undefined;
    const targetIso =
      auction.status === 'SCHEDULED' ? auction.startsAt : auction.endsAt;

    const tick = () => {
      const serverNow = Date.now() + serverOffsetMs;
      const target = new Date(targetIso).getTime();
      setRemainingMs(Math.max(0, target - serverNow));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [auction?.endsAt, auction?.startsAt, auction?.status, serverOffsetMs]);

  if (!auction) return null;

  const isClosed = auction.status === 'CLOSED';
  const isScheduled = auction.status === 'SCHEDULED';
  const isLive = auction.status === 'LIVE';
  const isFinalizing = isLive && remainingMs <= 0;
  const isSnipingWindow = isLive && remainingMs > 0 && remainingMs <= 30_000;
  const recentlyExtended =
    Boolean(lastExtensionAt) && Date.now() - lastExtensionAt < 6000;

  const isLeading =
    Boolean(auction.highestBidderId) && auction.highestBidderId === bidderId;

  const minIncrement = auction.minIncrement || 50000;
  const minIncrementRupees = minIncrement / 100;

  const quickOptions = [
    {
      label: `+${formatINR(minIncrement)}`,
      paise: auction.minNextBid,
    },
    {
      label: `+${formatINR(minIncrement * 2)}`,
      paise: auction.currentPrice + minIncrement * 2,
    },
    {
      label: `+${formatINR(minIncrement * 5)}`,
      paise: auction.currentPrice + minIncrement * 5,
    },
  ];

  const parsedRupees = Number(rupeeInput);
  const parsedPaise =
    !rupeeInput || Number.isNaN(parsedRupees) ? 0 : Math.round(parsedRupees * 100);

  const handleStep = (direction) => {
    const base =
      !rupeeInput || Number.isNaN(parsedRupees)
        ? auction.minNextBid / 100
        : parsedRupees;
    const next = Math.max(
      auction.minNextBid / 100,
      base + direction * minIncrementRupees
    );
    setRupeeInput(String(next));
    setValidationError(null);
  };

  const handleRequestConfirmation = (e) => {
    e.preventDefault();
    setValidationError(null);

    if (!bidderId?.trim()) {
      setValidationError('Please enter or select a Bidder ID before placing a bid.');
      return;
    }

    if (isClosed) {
      setValidationError('This auction is closed and no longer accepting bids.');
      return;
    }

    if (isScheduled) {
      setValidationError('This auction has not started yet.');
      return;
    }

    if (!rupeeInput.trim() || Number.isNaN(parsedRupees) || parsedPaise <= 0) {
      setValidationError('Please enter a valid positive bid amount.');
      return;
    }

    if (parsedPaise < auction.minNextBid) {
      setValidationError(
        `Insufficient increment. Minimum next bid is ${formatINR(auction.minNextBid)}.`
      );
      return;
    }

    setConfirmDraft({ amountPaise: parsedPaise });
  };

  const handleConfirmSubmit = async () => {
    if (!confirmDraft) return;
    const amountToSubmit = confirmDraft.amountPaise;
    setConfirmDraft(null);
    await onConfirmAndSubmitBid(amountToSubmit);
  };

  const leaderDisplay = auction.highestBidderId
    ? isLeading
      ? `${bidderId} (You)`
      : maskBidderId(auction.highestBidderId, bidderId)
    : 'No bids yet';

  return (
    <aside className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm lg:sticky lg:top-20 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      {/* Current Highest Bid */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isClosed
              ? auction.winnerId
                ? 'Winning Bid'
                : 'Starting Price'
              : 'Current Highest Bid'}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-auctionme-darkInput dark:text-slate-300">
            {auction.bidCount ?? 0} {(auction.bidCount ?? 0) === 1 ? 'bid' : 'bids'}
          </span>
        </div>

        <div className="mt-1 font-sans text-3xl font-bold tracking-tight tabular-nums text-auctionme-emeraldLight sm:text-4xl dark:text-auctionme-emeraldDark">
          {formatINR(auction.currentPrice)}
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Leader:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            {leaderDisplay}
          </span>
          {isLeading && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
              Leading
            </span>
          )}
        </div>
      </div>

      {/* Round Timer */}
      <div
        className={`mt-4 rounded-xl border p-3.5 transition-all ${
          isSnipingWindow
            ? 'animate-sniping border-amber-500/50 bg-amber-500/10'
            : 'border-auctionme-lightBorder bg-slate-50/90 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isClosed ? 'Auction Ended' : isScheduled ? 'Starts In' : 'Round Timer'}
          </span>
          {isSnipingWindow && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              +30s Anti-Sniping
            </span>
          )}
          {recentlyExtended && !isClosed && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
              Extended +30s
            </span>
          )}
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div
            className={`font-mono text-2xl font-bold tracking-wider tabular-nums sm:text-3xl ${
              isClosed
                ? 'text-slate-400 dark:text-slate-500'
                : isSnipingWindow
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {isClosed ? '00:00' : formatCountdown(remainingMs)}
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {isClosed ? 'Closed ' : 'Ends '}
            {formatTimeShort(isClosed ? auction.closedAt || auction.endsAt : auction.endsAt)}
          </span>
        </div>

        {isFinalizing && (
          <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            Deadline reached — awaiting authoritative server close...
          </p>
        )}
      </div>

      {/* Min Next Bid Banner */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/25 dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark">
        <span>Min Next Bid</span>
        <span className="font-mono tabular-nums">
          {isClosed ? 'Auction Closed' : formatINR(auction.minNextBid)}
        </span>
      </div>

      {/* Bidding Controls */}
      <form onSubmit={handleRequestConfirmation} className="mt-4 space-y-4">
        {/* Quick Bid Increments */}
        {isLive && (
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick Bid Increment
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {quickOptions.map((opt) => {
                const isSelected = parsedPaise === opt.paise;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setRupeeInput(String(opt.paise / 100));
                      setValidationError(null);
                    }}
                    className={`rounded-xl border px-2 py-2 text-center transition disabled:opacity-50 ${
                      isSelected
                        ? 'border-auctionme-emeraldLight bg-emerald-50 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                        : 'border-auctionme-lightBorder bg-white text-slate-700 hover:border-auctionme-emeraldLight/60 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:hover:border-auctionme-emeraldDark/60'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{opt.label}</div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {formatINR(opt.paise)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Bid Amount Stepper */}
        <div>
          <label
            htmlFor="room-bid-amount"
            className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            Custom Bid Amount (INR)
          </label>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              type="button"
              disabled={!isLive || isSubmitting}
              onClick={() => handleStep(-1)}
              aria-label="Decrease bid by minimum increment"
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-auctionme-lightBorder bg-white text-base font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:hover:bg-slate-800"
            >
              −
            </button>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm font-semibold text-slate-400">
                ₹
              </span>
              <input
                id="room-bid-amount"
                type="number"
                step={minIncrementRupees >= 1 ? '1' : '0.01'}
                value={rupeeInput}
                onChange={(e) => {
                  setRupeeInput(e.target.value);
                  setValidationError(null);
                }}
                disabled={!isLive || isSubmitting}
                className="h-11 w-full rounded-xl border border-auctionme-lightBorder bg-white pl-7 pr-3 text-center font-mono text-base font-bold text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
              />
            </div>
            <button
              type="button"
              disabled={!isLive || isSubmitting}
              onClick={() => handleStep(1)}
              aria-label="Increase bid by minimum increment"
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-auctionme-lightBorder bg-white text-base font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:hover:bg-slate-800"
            >
              +
            </button>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {validationError}
          </div>
        )}

        {/* Confirmation Dialog Box (before submitting) */}
        {confirmDraft && !isSubmitting && (
          <div
            role="region"
            aria-label="Confirm your bid"
            className="rounded-xl border border-auctionme-emeraldLight/45 bg-emerald-50/90 p-3.5 dark:border-auctionme-emeraldDark/45 dark:bg-auctionme-emeraldDark/10"
          >
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              Confirm authoritative bid submission?
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Submit{' '}
              <span className="font-mono font-bold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                {formatINR(confirmDraft.amountPaise)}
              </span>{' '}
              as <span className="font-mono font-semibold">{bidderId}</span>. Bids
              committed by the server are binding.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="flex-1 rounded-lg bg-auctionme-emeraldLight px-3 py-2 text-xs font-bold text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
              >
                Confirm &amp; Submit
              </button>
              <button
                type="button"
                onClick={() => setConfirmDraft(null)}
                className="rounded-lg border border-auctionme-lightBorder bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Primary Place Bid CTA */}
        <button
          type="submit"
          disabled={!isLive || isSubmitting || !bidderId?.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-auctionme-emeraldLight px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Submitting Bid...</span>
            </>
          ) : isClosed ? (
            <span>Auction Closed</span>
          ) : isScheduled ? (
            <span>Auction Not Started</span>
          ) : (
            <span>
              Place Bid — {parsedPaise > 0 ? formatINR(parsedPaise) : formatINR(auction.minNextBid)}
            </span>
          )}
        </button>

        {isClosed && (
          <Link
            href={`/auctions/${auction.id}/result`}
            className="flex w-full items-center justify-center rounded-xl border border-auctionme-lightBorder bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-200/80 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:hover:bg-slate-800"
          >
            View Official Auction Result →
          </Link>
        )}
      </form>

      {/* Uncertain Network Failure — Idempotent Retry Banner (Preserves Exact Same request_id) */}
      {pendingRetryBid && !isSubmitting && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50 p-3.5 dark:border-amber-500/40 dark:bg-amber-950/30"
        >
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Network response uncertain for {formatINR(pendingRetryBid.amountPaise)}
          </p>
          <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-300/90">
            Retrying preserves the exact same idempotency key (
            <span className="font-mono">#{pendingRetryBid.requestId.slice(0, 8)}</span>) so
            your bid is never double-charged.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onRetryPendingBid}
              className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-500"
            >
              Retry Same Bid
            </button>
            <button
              type="button"
              onClick={onCancelPendingRetry}
              className="rounded-lg border border-amber-400/50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Server Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-500/35 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'
              : feedback.type === 'warning'
              ? 'border-amber-500/35 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
              : 'border-rose-500/35 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </aside>
  );
}
