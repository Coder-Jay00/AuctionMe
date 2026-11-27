'use client';

import { formatINR } from '../utils/formatters';

export default function CurrentBid({ auction, currentBidderId }) {
  if (!auction) return null;

  const isLeading =
    Boolean(auction.highestBidderId) &&
    auction.highestBidderId === currentBidderId;

  return (
    <section className="glass-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {auction.status === 'CLOSED'
              ? auction.winnerId
                ? 'Winning Bid'
                : 'Starting Price (No Bids)'
              : 'Current Highest Bid'}
          </span>
          <div className="mt-1.5 font-mono text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {formatINR(auction.currentPrice)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-surface-900 px-3 py-2 text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">
            Total Bids
          </div>
          <div className="font-mono text-lg font-bold text-slate-100">
            {auction.bidCount ?? 0}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-4 sm:grid-cols-2">
        <div>
          <div className="text-xs text-slate-400">Leading Bidder</div>
          <div className="mt-1 flex items-center gap-2">
            {auction.highestBidderId ? (
              <>
                <span className="font-mono text-sm font-semibold text-slate-100">
                  {auction.highestBidderId}
                </span>
                {isLeading && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                    You
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm italic text-slate-500">
                No bids placed yet
              </span>
            )}
          </div>
        </div>

        <div className="sm:text-right">
          <div className="text-xs text-slate-400">Minimum Next Bid</div>
          <div className="mt-1 font-mono text-sm font-semibold text-amber-300">
            {auction.status === 'CLOSED'
              ? 'Auction Closed'
              : formatINR(auction.minNextBid)}
          </div>
        </div>
      </div>
    </section>
  );
}
