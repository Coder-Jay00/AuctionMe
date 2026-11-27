'use client';

import { useMemo, useState } from 'react';
import { formatINR, formatTimeShort } from '../../utils/formatters';

const TABS = [
  { id: 'all', label: 'All Bids' },
  { id: 'accepted', label: 'Accepted Bids' },
  { id: 'mine', label: 'My Bids' },
  { id: 'timeline', label: 'Auction Timeline' },
];

export default function ResultBidHistory({
  auction,
  result,
  bids,
  currentBidderId,
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Number accepted bids chronologically (oldest = #1, newest = #N)
  const numberedBids = useMemo(() => {
    const total = bids.length;
    return bids.map((bid, idx) => ({
      ...bid,
      bidNumber: total - idx,
      status: 'Accepted',
    }));
  }, [bids]);

  const filteredBids = useMemo(() => {
    if (activeTab === 'mine') {
      return numberedBids.filter((b) => b.bidderId === currentBidderId);
    }
    return numberedBids;
  }, [activeTab, numberedBids, currentBidderId]);

  const timelineEvents = useMemo(() => {
    const events = [];
    if (auction?.startsAt) {
      events.push({
        id: 'evt-start',
        label: 'Auction Started',
        detail: `Opening price ${formatINR(result.startingPrice)}`,
        timestamp: auction.startsAt,
        tone: 'neutral',
      });
    }
    // Chronological accepted bids (oldest first)
    [...numberedBids].reverse().forEach((b) => {
      events.push({
        id: `evt-bid-${b.id}`,
        label: `Bid #${b.bidNumber} Accepted`,
        detail: `${b.bidderId}${b.bidderId === currentBidderId ? ' (You)' : ''} — ${formatINR(b.amount)}`,
        timestamp: b.createdAt,
        tone: 'bid',
      });
    });
    if (result?.closedAt) {
      events.push({
        id: 'evt-close',
        label: 'Auction Closed',
        detail: result.winnerId
          ? `Winner finalized: ${result.winnerId} at ${formatINR(result.finalPrice)}`
          : 'Closed without accepted bids',
        timestamp: result.closedAt,
        tone: 'close',
      });
    }
    return events.reverse();
  }, [auction?.startsAt, numberedBids, result, currentBidderId]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#10171f]">
      {/* Mobile Expandable Header */}
      <button
        type="button"
        onClick={() => setMobileExpanded((prev) => !prev)}
        aria-expanded={mobileExpanded}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left sm:hidden"
      >
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          Bid History ({bids.length})
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`h-4 w-4 text-slate-500 transition-transform ${
            mobileExpanded ? 'rotate-90' : ''
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5l5 5-5 5" />
        </svg>
      </button>

      {/* Body (always visible >= sm, expandable on mobile) */}
      <div className={`${mobileExpanded ? 'block' : 'hidden sm:block'}`}>
        {/* Tab Bar */}
        <div
          role="tablist"
          aria-label="Auction bid history views"
          className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-4 py-3 dark:border-slate-800"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'timeline' ? (
          <div className="p-4 sm:p-5">
            {timelineEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No timeline events available.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
                {timelineEvents.map((evt) => (
                  <li key={evt.id} className="relative">
                    <span
                      className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-[#10171f] ${
                        evt.tone === 'close'
                          ? 'bg-amber-500'
                          : evt.tone === 'bid'
                          ? 'bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark'
                          : 'bg-slate-400'
                      }`}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {evt.label}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {formatTimeShort(evt.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {evt.detail}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'all' && (
              <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800/70 dark:bg-[#0d131a] dark:text-slate-400">
                Showing server-persisted accepted bids. Rejected bids are rolled back transactionally and are not stored by the backend.
              </div>
            )}

            {filteredBids.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'mine'
                  ? `No bids found for bidder "${currentBidderId}".`
                  : 'No accepted bids were recorded for this auction.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Bidder</th>
                    <th className="px-4 py-3">Bid Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Time (IST)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filteredBids.map((bid) => {
                    const isOwn = bid.bidderId === currentBidderId;
                    return (
                      <tr
                        key={bid.id}
                        className={
                          isOwn
                            ? 'bg-emerald-50/60 dark:bg-auctionme-emeraldDark/[0.06]'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                        }
                      >
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                          {bid.bidNumber}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                          <span>{bid.bidderId}</span>
                          {isOwn && (
                            <span className="ml-1.5 font-sans text-[11px] font-semibold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                              (You)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                          {formatINR(bid.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
                            {bid.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">
                          {formatTimeShort(bid.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
