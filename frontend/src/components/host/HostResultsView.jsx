'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PortalShell from '../portal/PortalShell';
import {
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingSkeleton,
} from '../portal/PortalStates';
import {
  fetchAuctionBids,
  fetchAuctionResult,
  fetchAuctions,
} from '../../services/api';
import { useThemePreference } from '../../hooks/useThemePreference';
import {
  formatDateTimeFull,
  formatINR,
  formatTimeShort,
  getAuctionLotLabel,
} from '../../utils/formatters';

const PAGE_SIZE = 6;

export default function HostResultsView() {
  const { preference, setPreference } = useThemePreference();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'WON' | 'NO_WINNER'
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);
  const [detailResult, setDetailResult] = useState(null);
  const [detailBids, setDetailBids] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadClosed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuctions();
      const list = Array.isArray(res?.auctions) ? res.auctions : [];
      setAuctions(list.filter((a) => a.status === 'CLOSED'));
    } catch (err) {
      setError(err?.message || 'Unable to load auction results.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClosed();
  }, [loadClosed]);

  const openDetail = async (auctionId) => {
    setSelectedId(auctionId);
    setDetailResult(null);
    setDetailBids([]);
    setDetailLoading(true);
    try {
      const [rRes, bRes] = await Promise.all([
        fetchAuctionResult(auctionId),
        fetchAuctionBids(auctionId, 100),
      ]);
      setDetailResult(rRes?.result || null);
      setDetailBids(Array.isArray(bRes?.bids) ? bRes.bids : []);
    } catch {
      setDetailResult(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const counts = useMemo(() => {
    const won = auctions.filter((a) => Boolean(a.winnerId) && (a.bidCount ?? 0) > 0).length;
    return { ALL: auctions.length, WON: won, NO_WINNER: auctions.length - won };
  }, [auctions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auctions.filter((a) => {
      const hasWinner = Boolean(a.winnerId) && (a.bidCount ?? 0) > 0;
      if (filter === 'WON' && !hasWinner) return false;
      if (filter === 'NO_WINNER' && hasWinner) return false;
      if (q) {
        const hay = `${a.title} ${a.id} ${a.winnerId || ''} ${getAuctionLotLabel(a)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auctions, filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <PortalShell
      role="host"
      activeNav="results"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Auction Results
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Server-authoritative final outcomes and immutable accepted bid histories.
          </p>
        </div>

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load auction results."
            message={error}
            onRetry={loadClosed}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="tablist" className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL', label: 'All Completed', count: counts.ALL },
                  { id: 'WON', label: 'Won', count: counts.WON },
                  { id: 'NO_WINNER', label: 'No Winner', count: counts.NO_WINNER },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === tab.id}
                    onClick={() => {
                      setFilter(tab.id);
                      setPage(1);
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      filter === tab.id
                        ? 'bg-auctionme-emeraldLight text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                        : 'border border-auctionme-lightBorder bg-auctionme-lightPanel text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-slate-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by lot, item or winner..."
                aria-label="Search auction results"
                className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-auctionme-emeraldLight focus:outline-none sm:w-72 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
              />
            </div>

            {paginated.length === 0 ? (
              <PortalEmptyState
                title="No completed auction results"
                description="Closed auctions and their server-verified winners will appear here automatically."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                  <table className="w-full min-w-[660px] text-left text-xs">
                    <thead className="border-b border-auctionme-lightBorder bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Lot / Item</th>
                        <th className="px-4 py-3">Winner</th>
                        <th className="px-4 py-3">Final Price</th>
                        <th className="px-4 py-3">Bids</th>
                        <th className="px-4 py-3">Closed At</th>
                        <th className="px-4 py-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                      {paginated.map((a) => {
                        const hasWinner = Boolean(a.winnerId) && (a.bidCount ?? 0) > 0;
                        return (
                          <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3.5">
                              <div className="font-mono text-[10px] font-semibold text-slate-400">
                                {getAuctionLotLabel(a)}
                              </div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {a.title}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {hasWinner ? (
                                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                  {a.winnerId}
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  No Winner
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                              {hasWinner ? formatINR(a.currentPrice) : '—'}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                              {a.bidCount ?? 0}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                              {formatDateTimeFull(a.closedAt || a.endsAt)}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => openDetail(a.id)}
                                className="rounded-lg border border-auctionme-emeraldLight/35 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-auctionme-emeraldLight hover:bg-auctionme-emeraldLight hover:text-white dark:border-auctionme-emeraldDark/35 dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark"
                              >
                                Summary
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Page {safePage} of {totalPages}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-auctionme-lightBorder px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-auctionme-darkBorder"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="rounded-lg border border-auctionme-lightBorder px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-auctionme-darkBorder"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Authoritative Result Drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setSelectedId(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-2xl dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
            <div className="flex items-center justify-between border-b border-auctionme-lightBorder pb-3 dark:border-auctionme-darkBorder">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                Official Auction Result
              </h2>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
              {detailLoading ? (
                <p className="text-xs text-slate-500">Loading server-authoritative result...</p>
              ) : !detailResult ? (
                <p className="text-xs text-rose-500">Unable to load result details.</p>
              ) : (
                <>
                  <div>
                    <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                      {detailResult.title}
                    </h3>
                    <p className="font-mono text-[10px] text-slate-400">
                      ID: {detailResult.auctionId}
                    </p>
                  </div>

                  <dl className="divide-y divide-slate-200/80 rounded-xl border border-auctionme-lightBorder bg-slate-50/70 px-3.5 text-xs dark:divide-auctionme-darkBorder dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60">
                    <div className="flex justify-between py-2.5">
                      <dt className="text-slate-500">Winner</dt>
                      <dd className="font-mono font-bold text-slate-900 dark:text-white">
                        {detailResult.hadBids && detailResult.winnerId
                          ? detailResult.winnerId
                          : 'No Winner'}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <dt className="text-slate-500">Final Price</dt>
                      <dd className="font-mono font-bold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                        {formatINR(detailResult.finalPrice)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <dt className="text-slate-500">Total Accepted Bids</dt>
                      <dd className="font-mono font-semibold">{detailResult.bidCount}</dd>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <dt className="text-slate-500">Closed At</dt>
                      <dd>{formatDateTimeFull(detailResult.closedAt)}</dd>
                    </div>
                  </dl>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Accepted Bid History ({detailBids.length})
                    </h4>
                    {detailBids.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">No accepted bids were placed.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-slate-200/80 rounded-xl border border-auctionme-lightBorder px-3 text-xs dark:divide-auctionme-darkBorder dark:border-auctionme-darkBorder">
                        {detailBids.map((b) => (
                          <li key={b.id} className="flex items-center justify-between py-2">
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {b.bidderId}
                            </span>
                            <span className="font-mono font-bold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                              {formatINR(b.amount)}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {formatTimeShort(b.createdAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 border-t border-auctionme-lightBorder pt-3 dark:border-auctionme-darkBorder">
              <Link
                href={`/auctions/${encodeURIComponent(selectedId)}/result`}
                className="flex w-full items-center justify-center rounded-xl bg-auctionme-emeraldLight py-2.5 text-xs font-bold text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]"
              >
                Open Full Result Page ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
