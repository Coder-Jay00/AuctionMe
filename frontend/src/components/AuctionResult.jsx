'use client';

import Link from 'next/link';
import { formatINR, formatTimeShort } from '../utils/formatters';

export default function AuctionResult({ auction, result, currentBidderId }) {
  if (!auction || auction.status !== 'CLOSED') return null;

  const winnerId = result?.winnerId ?? auction.winnerId;
  const finalPrice = result?.finalPrice ?? auction.currentPrice;
  const closedAt = result?.closedAt ?? auction.closedAt;
  const hadBids = result ? result.hadBids : Boolean(winnerId);
  const isCurrentUserWinner = Boolean(winnerId) && winnerId === currentBidderId;

  if (!hadBids || !winnerId) {
    return (
      <section className="rounded-2xl border border-slate-700/80 bg-gradient-to-r from-slate-900 via-surface-850 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-slate-700/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-300">
              Auction Closed · No Winner
            </span>
            <h2 className="mt-2 text-xl font-bold text-white">
              This auction ended with no accepted bids
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Closed atomically by the server at {formatTimeShort(closedAt)}. Reserve / starting price was{' '}
              <span className="font-mono text-slate-200">
                {formatINR(auction.startingPrice)}
              </span>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border p-6 shadow-xl ${
        isCurrentUserWinner
          ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/70 via-surface-900 to-emerald-950/40'
          : 'border-amber-500/40 bg-gradient-to-r from-amber-950/50 via-surface-900 to-slate-900'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
              isCurrentUserWinner
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
            }`}
          >
            {isCurrentUserWinner ? 'You Won This Auction!' : 'Auction Closed · Winner Finalized'}
          </span>
          <h2 className="mt-2.5 text-2xl font-bold text-white">
            Winner: <span className="font-mono text-amber-300">{winnerId}</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Finalized at {formatTimeShort(closedAt)} · State version v{auction.version}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-surface-950/80 px-5 py-3 text-left sm:text-right">
          <div className="text-xs uppercase tracking-wider text-slate-400">
            Final Winning Price
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-300">
            {formatINR(finalPrice)}
          </div>
          <Link
            href={`/auctions/${auction.id}/result`}
            className="mt-2 inline-block text-xs font-semibold text-amber-300 hover:underline"
          >
            View Full Result →
          </Link>
        </div>
      </div>
    </section>
  );
}
