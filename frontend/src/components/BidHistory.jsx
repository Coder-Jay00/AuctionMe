'use client';

import { formatINR, formatTimeShort } from '../utils/formatters';

export default function BidHistory({ bids, currentBidderId }) {
  return (
    <section className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Recent Accepted Bids
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Authoritative committed bid ledger (newest first)
          </p>
        </div>
        <span className="rounded-full bg-surface-900 px-2.5 py-1 font-mono text-xs text-slate-400 ring-1 ring-slate-800">
          {bids.length} {bids.length === 1 ? 'bid' : 'bids'}
        </span>
      </div>

      {bids.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-slate-400">
            No accepted bids yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Be the first to place a bid on this lot.
          </p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-800/70 max-h-80 overflow-y-auto pr-1">
          {bids.map((bid, index) => {
            const isTop = index === 0;
            const isSelf = bid.bidderId === currentBidderId;
            return (
              <li
                key={bid.id}
                className={`flex items-center justify-between gap-3 py-3 ${
                  isTop ? 'text-white' : 'text-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm font-semibold">
                      {bid.bidderId}
                    </span>
                    {isTop && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                        Highest
                      </span>
                    )}
                    {isSelf && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        You
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {formatTimeShort(bid.createdAt)}
                  </div>
                </div>

                <div
                  className={`shrink-0 font-mono text-base font-bold ${
                    isTop ? 'text-amber-300' : 'text-slate-200'
                  }`}
                >
                  {formatINR(bid.amount)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
