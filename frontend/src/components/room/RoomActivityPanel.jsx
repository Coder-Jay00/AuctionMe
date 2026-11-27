'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  formatINR,
  formatShortDate,
  formatTimeShort,
  maskBidderId,
} from '../../utils/formatters';

export default function RoomActivityPanel({
  auction,
  bids = [],
  rejectedEvents = [],
  currentBidderId,
}) {
  const [sectionTab, setSectionTab] = useState('stream'); // stream | details | rules
  const [activityFilter, setActivityFilter] = useState('all'); // all | mine | accepted | rejected

  // Merge accepted bids + rejected bid events chronologically (newest first)
  const unifiedStream = useMemo(() => {
    const highestBidId = bids[0]?.id || null;

    const acceptedItems = bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      bidderId: bid.bidderId,
      createdAt: bid.createdAt,
      status: bid.id === highestBidId ? 'LEAD' : 'OUTBID',
      outcome: 'ACCEPTED',
      reason: null,
      requestId: bid.requestId,
    }));

    const rejectedItems = rejectedEvents.map((ev) => ({
      id: ev.id,
      amount: ev.amount,
      bidderId: ev.bidderId,
      createdAt: ev.timestamp,
      status: 'REJECTED',
      outcome: 'REJECTED',
      reason: ev.message || ev.code || 'Rejected by server',
      requestId: ev.requestId,
    }));

    return [...acceptedItems, ...rejectedItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bids, rejectedEvents]);

  const counts = useMemo(() => {
    return {
      all: unifiedStream.length,
      mine: unifiedStream.filter((e) => e.bidderId === currentBidderId).length,
      accepted: unifiedStream.filter((e) => e.outcome === 'ACCEPTED').length,
      rejected: unifiedStream.filter((e) => e.outcome === 'REJECTED').length,
    };
  }, [unifiedStream, currentBidderId]);

  const filteredStream = useMemo(() => {
    if (activityFilter === 'mine') {
      return unifiedStream.filter((e) => e.bidderId === currentBidderId);
    }
    if (activityFilter === 'accepted') {
      return unifiedStream.filter((e) => e.outcome === 'ACCEPTED');
    }
    if (activityFilter === 'rejected') {
      return unifiedStream.filter((e) => e.outcome === 'REJECTED');
    }
    return unifiedStream;
  }, [unifiedStream, activityFilter, currentBidderId]);

  return (
    <section className="overflow-hidden rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      {/* Top Section Tabs: LIVE BID STREAM | AUCTION DETAILS | BID RULES */}
      <div className="flex items-center border-b border-auctionme-lightBorder px-4 dark:border-auctionme-darkBorder">
        {[
          { id: 'stream', label: 'Live Bid Stream' },
          { id: 'details', label: 'Auction Details' },
          { id: 'rules', label: 'Bid Rules' },
        ].map((tab) => {
          const isActive = sectionTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSectionTab(tab.id)}
              className={`border-b-2 px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider transition ${
                isActive
                  ? 'border-auctionme-emeraldLight text-auctionme-emeraldLight dark:border-auctionme-emeraldDark dark:text-auctionme-emeraldDark'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Live Bid Stream */}
      {sectionTab === 'stream' && (
        <div className="p-4 sm:p-5">
          {/* Sub-tabs: All Activity | My Bids | Accepted | Rejected */}
          <div
            role="tablist"
            aria-label="Bid activity filter"
            className="mb-4 flex flex-wrap items-center justify-end gap-1.5"
          >
            {[
              { id: 'all', label: 'All Activity', count: counts.all },
              { id: 'mine', label: 'My Bids', count: counts.mine },
              { id: 'accepted', label: 'Accepted', count: counts.accepted },
              { id: 'rejected', label: 'Rejected', count: counts.rejected },
            ].map((sub) => {
              const active = activityFilter === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActivityFilter(sub.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'border-auctionme-emeraldLight/50 bg-emerald-50 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/50 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                      : 'border-auctionme-lightBorder bg-transparent text-slate-600 hover:bg-slate-100 dark:border-auctionme-darkBorder dark:text-slate-400 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span>{sub.label}</span>
                  <span className="font-mono text-[10px] opacity-80">
                    ({sub.count})
                  </span>
                </button>
              );
            })}
          </div>

          {filteredStream.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {activityFilter === 'rejected'
                  ? 'No rejected bids recorded in this session.'
                  : activityFilter === 'mine'
                  ? 'You have not placed any bids on this lot yet.'
                  : 'No bid activity yet. Be the first to bid.'}
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-200/80 overflow-y-auto pr-1 dark:divide-auctionme-darkBorder/80">
              {filteredStream.map((entry) => {
                const isSelf = entry.bidderId === currentBidderId;
                const isRejected = entry.outcome === 'REJECTED';
                const isLead = entry.status === 'LEAD';

                return (
                  <li
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-3 transition ${
                      isRejected
                        ? 'bg-rose-50/70 dark:bg-rose-950/20'
                        : isLead
                        ? 'bg-emerald-50/50 dark:bg-auctionme-emeraldDark/5'
                        : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${
                            isRejected
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLead
                              ? 'text-auctionme-emeraldLight dark:text-auctionme-emeraldDark'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {typeof entry.amount === 'number' && entry.amount > 0
                            ? formatINR(entry.amount)
                            : 'Invalid Bid'}
                        </span>

                        {isLead && (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/20 dark:text-auctionme-emeraldDark">
                            LEAD
                          </span>
                        )}
                        {isSelf && (
                          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
                            YOU
                          </span>
                        )}
                        {isRejected && (
                          <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300">
                            INVALID
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                        {isSelf
                          ? `${entry.bidderId} (Your Account)`
                          : maskBidderId(entry.bidderId, currentBidderId)}
                      </div>

                      {isRejected && entry.reason && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-300">
                          {entry.reason}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isRejected
                            ? 'text-rose-600 dark:text-rose-400'
                            : isLead
                            ? 'text-auctionme-emeraldLight dark:text-auctionme-emeraldDark'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isRejected ? 'REJECTED' : isLead ? '✓ ACCEPTED' : 'OUTBID'}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {formatTimeShort(entry.createdAt)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Tab 2: Auction Details */}
      {sectionTab === 'details' && auction && (
        <div className="space-y-4 p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {auction.description}
          </p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: 'Auction ID', value: auction.id, mono: true },
              { label: 'Status', value: auction.status },
              { label: 'Starting Price', value: formatINR(auction.startingPrice), mono: true },
              { label: 'Minimum Increment', value: `+${formatINR(auction.minIncrement)}`, mono: true },
              { label: 'Starts At', value: `${formatShortDate(auction.startsAt)} · ${formatTimeShort(auction.startsAt)}` },
              { label: 'Scheduled End', value: `${formatShortDate(auction.endsAt)} · ${formatTimeShort(auction.endsAt)}` },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-auctionme-lightBorder bg-slate-50/80 p-3 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {row.label}
                </dt>
                <dd
                  className={`mt-1 truncate text-xs font-semibold text-slate-900 dark:text-white ${
                    row.mono ? 'font-mono' : ''
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          {auction.status === 'CLOSED' && (
            <Link
              href={`/auctions/${auction.id}/result`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-auctionme-emeraldLight hover:underline dark:text-auctionme-emeraldDark"
            >
              Open Official Settlement Result →
            </Link>
          )}
        </div>
      )}

      {/* Tab 3: Bid Rules */}
      {sectionTab === 'rules' && auction && (
        <div className="space-y-3 p-4 text-xs leading-relaxed text-slate-600 sm:p-5 dark:text-slate-300">
          <div className="rounded-xl border border-auctionme-lightBorder bg-slate-50/80 p-3.5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              1. Authoritative Server Acceptance
            </h4>
            <p className="mt-1">
              Every bid is validated inside an atomic PostgreSQL transaction using
              row-level locking and authoritative database time. Client clocks never
              determine acceptance or winners.
            </p>
          </div>
          <div className="rounded-xl border border-auctionme-lightBorder bg-slate-50/80 p-3.5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              2. Minimum Increment ({formatINR(auction.minIncrement)})
            </h4>
            <p className="mt-1">
              Each new bid must equal or exceed the current highest bid plus the
              lot&apos;s minimum increment of {formatINR(auction.minIncrement)}.
            </p>
          </div>
          <div className="rounded-xl border border-auctionme-lightBorder bg-slate-50/80 p-3.5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              3. Anti-Sniping Protection (+30 Seconds)
            </h4>
            <p className="mt-1">
              Any accepted bid placed within the final 30 seconds automatically
              extends the auction deadline by 30 seconds so all bidders have fair
              time to respond.
            </p>
          </div>
          <div className="rounded-xl border border-auctionme-lightBorder bg-slate-50/80 p-3.5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput">
            <h4 className="font-semibold text-slate-900 dark:text-white">
              4. Idempotent Retries
            </h4>
            <p className="mt-1">
              Each logical bid carries a unique request ID. Retrying after an
              uncertain network response reuses the same request ID so duplicate
              bids are never created.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
