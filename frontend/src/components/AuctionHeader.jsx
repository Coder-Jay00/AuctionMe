'use client';

import Link from 'next/link';
import ConnectionStatus from './ConnectionStatus';

const DEMO_BIDDERS = [
  'demo-user-101',
  'demo-user-202',
  'demo-user-303',
  'bidder-aarav-01',
  'bidder-meera-02',
];

export default function AuctionHeader({
  bidderId,
  onBidderIdChange,
  connectionStatus,
  auctionStatus,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-surface-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-bold text-slate-950 shadow-lg shadow-amber-500/20">
            AL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white">
                Aurelia Live Auctions
              </h1>
              {auctionStatus && (
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    auctionStatus === 'LIVE'
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                      : auctionStatus === 'CLOSED'
                      ? 'bg-slate-700/60 text-slate-300 ring-1 ring-slate-600'
                      : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                  }`}
                >
                  {auctionStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              PostgreSQL Transactional Bidding · Anti-Sniping Enabled
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-surface-900 px-3 py-1.5">
            <label
              htmlFor="bidder-select"
              className="text-xs font-medium text-slate-400"
            >
              Bidder ID:
            </label>
            <select
              id="bidder-select"
              value={DEMO_BIDDERS.includes(bidderId) ? bidderId : '__custom__'}
              onChange={(e) => {
                if (e.target.value !== '__custom__') {
                  onBidderIdChange(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-semibold text-amber-300 focus:outline-none"
            >
              {DEMO_BIDDERS.map((id) => (
                <option key={id} value={id} className="bg-surface-900 text-slate-100">
                  {id}
                </option>
              ))}
              {!DEMO_BIDDERS.includes(bidderId) && (
                <option value="__custom__" className="bg-surface-900 text-slate-100">
                  {bidderId}
                </option>
              )}
            </select>
            <input
              type="text"
              value={bidderId}
              onChange={(e) => onBidderIdChange(e.target.value)}
              placeholder="Custom ID"
              aria-label="Custom bidder ID"
              className="w-28 border-l border-slate-700/80 bg-transparent pl-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <ConnectionStatus status={connectionStatus} />

          <Link
            href="/auctions"
            className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20"
          >
            Discover Auctions
          </Link>

          <Link
            href="/ledger"
            className="rounded-xl border border-slate-700/80 bg-surface-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
          >
            My Ledger
          </Link>

          <Link
            href="/result"
            className="rounded-xl border border-slate-700/80 bg-surface-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
          >
            Results
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-slate-700/80 bg-surface-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
