'use client';

import { useEffect, useState } from 'react';
import { formatINR } from '../utils/formatters';

export default function BidForm({
  auction,
  bidderId,
  onPlaceBid,
  isSubmitting,
  feedback,
}) {
  const minNextRupees = auction ? auction.minNextBid / 100 : 0;
  const minIncrementRupees = auction ? auction.minIncrement / 100 : 500;

  const [rupeeInput, setRupeeInput] = useState('');

  // Keep default input synced to at least the minimum next bid when price advances
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

  const isDisabled = !auction || auction.status !== 'LIVE' || isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled) return;

    const numericRupees = Number(rupeeInput);
    const amountPaise = Math.round(numericRupees * 100);
    await onPlaceBid(amountPaise);
  };

  const quickOptions = auction
    ? [
        { label: 'Min Bid', paise: auction.minNextBid },
        {
          label: `+${formatINR(auction.minIncrement * 2)}`,
          paise: auction.currentPrice + auction.minIncrement * 2,
        },
        {
          label: `+${formatINR(auction.minIncrement * 5)}`,
          paise: auction.currentPrice + auction.minIncrement * 5,
        },
      ]
    : [];

  return (
    <section className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Place Your Bid
        </h3>
        <span className="text-xs text-slate-400">
          Bidding as <span className="font-mono text-amber-300">{bidderId || '—'}</span>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="bid-amount-input"
            className="block text-xs font-medium text-slate-400"
          >
            Bid Amount (INR)
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-mono text-lg font-semibold text-slate-400">
              ₹
            </span>
            <input
              id="bid-amount-input"
              type="number"
              step={minIncrementRupees >= 1 ? '1' : '0.01'}
              value={rupeeInput}
              onChange={(e) => setRupeeInput(e.target.value)}
              disabled={isDisabled}
              placeholder={String(minNextRupees)}
              className="w-full rounded-xl border border-slate-700 bg-surface-950 py-3.5 pl-9 pr-4 font-mono text-xl font-bold text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {auction && auction.status === 'LIVE' && (
            <p className="mt-1.5 text-xs text-slate-400">
              Minimum valid bid: <span className="font-mono text-slate-200">{formatINR(auction.minNextBid)}</span>
            </p>
          )}
        </div>

        {/* Quick Bid Presets */}
        {auction && auction.status === 'LIVE' && (
          <div className="grid grid-cols-3 gap-2">
            {quickOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                disabled={isDisabled}
                onClick={() => setRupeeInput(String(opt.paise / 100))}
                className="rounded-xl border border-slate-700/80 bg-surface-900 px-2.5 py-2 text-center transition hover:border-amber-500/50 hover:bg-surface-800 disabled:opacity-50"
              >
                <div className="text-[11px] font-medium text-slate-400">
                  {opt.label}
                </div>
                <div className="font-mono text-xs font-semibold text-slate-100">
                  {formatINR(opt.paise)}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isDisabled || !bidderId?.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
              <span>Submitting Bid...</span>
            </>
          ) : auction?.status === 'CLOSED' ? (
            <span>Auction Closed</span>
          ) : (
            <span>Place Bid</span>
          )}
        </button>
      </form>

      {/* Inline Bid Feedback */}
      {feedback && (
        <div
          className={`mt-4 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : feedback.type === 'warning'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </section>
  );
}
