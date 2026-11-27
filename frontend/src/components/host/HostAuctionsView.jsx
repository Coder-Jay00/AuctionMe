'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PortalShell from '../portal/PortalShell';
import {
  BackendRequirementNotice,
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingSkeleton,
} from '../portal/PortalStates';
import { fetchAuctions } from '../../services/api';
import { useThemePreference } from '../../hooks/useThemePreference';
import {
  formatINR,
  formatShortDate,
  getAuctionLotLabel,
  getAuctionStatusMeta,
} from '../../utils/formatters';

const PAGE_SIZE = 6;

export default function HostAuctionsView() {
  const { preference, setPreference } = useThemePreference();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [editingAuction, setEditingAuction] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotice, setEditNotice] = useState(null);

  const loadAuctions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuctions();
      setAuctions(Array.isArray(res?.auctions) ? res.auctions : []);
    } catch (err) {
      setError(err?.message || 'Unable to load auctions from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  const counts = useMemo(() => {
    const c = { ALL: auctions.length, LIVE: 0, SCHEDULED: 0, CLOSED: 0 };
    auctions.forEach((a) => {
      if (a.status === 'LIVE') c.LIVE += 1;
      else if (a.status === 'SCHEDULED') c.SCHEDULED += 1;
      else if (a.status === 'CLOSED') c.CLOSED += 1;
    });
    return c;
  }, [auctions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auctions.filter((a) => {
      if (activeTab !== 'ALL' && a.status !== activeTab) return false;
      if (q) {
        const hay = `${a.title} ${a.id} ${getAuctionLotLabel(a)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auctions, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openEdit = (auction) => {
    setEditingAuction(auction);
    setEditTitle(auction.title || '');
    setEditDescription(auction.description || '');
    setEditNotice(null);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setEditNotice(
      'PATCH /api/auctions/:id and Host ownership authorization are not implemented in the backend yet. No server changes were made.'
    );
  };

  return (
    <PortalShell
      role="host"
      activeNav="auctions"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              My Auctions
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              View, inspect, and manage permitted auction details. Accepted bids and results are immutable.
            </p>
          </div>
          <Link
            href="/host/create"
            className="inline-flex items-center justify-center rounded-xl bg-auctionme-emeraldLight px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
          >
            + Create Auction
          </Link>
        </div>

        <BackendRequirementNotice
          title="Host edit / cancel / pause mutations are not enabled on the backend"
          description="Database schema only defines SCHEDULED, LIVE, and CLOSED states. Pause/cancel actions are disabled, and editing requires PATCH /api/auctions/:id with Host RBAC."
        />

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load auctions."
            message={error}
            onRetry={loadAuctions}
          />
        ) : (
          <>
            {/* Tabs & Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="tablist" className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL', label: 'All', count: counts.ALL },
                  { id: 'LIVE', label: 'Live', count: counts.LIVE },
                  { id: 'SCHEDULED', label: 'Upcoming', count: counts.SCHEDULED },
                  { id: 'CLOSED', label: 'Completed', count: counts.CLOSED },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPage(1);
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === tab.id
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
                placeholder="Search by lot, item or auction ID..."
                aria-label="Search auctions"
                className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-auctionme-emeraldLight focus:outline-none sm:w-72 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
              />
            </div>

            {paginated.length === 0 ? (
              <PortalEmptyState
                title="No matching auctions"
                description="Try adjusting your tab or search query."
              />
            ) : (
              <>
                <div className="overflow-x-auto rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="border-b border-auctionme-lightBorder bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Lot / Item</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Current / Start</th>
                        <th className="px-4 py-3">Bids</th>
                        <th className="px-4 py-3">Ends / Closed</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                      {paginated.map((a) => {
                        const statusMeta = getAuctionStatusMeta(a.status);
                        const canEditDetails = a.status === 'SCHEDULED';
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
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusMeta.badgeClass}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                              {formatINR(a.currentPrice ?? a.startingPrice)}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                              {a.bidCount ?? 0}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                              {formatShortDate(a.closedAt || a.endsAt)}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <Link
                                  href={
                                    a.status === 'CLOSED'
                                      ? `/auctions/${encodeURIComponent(a.id)}/result`
                                      : `/host/monitor?auctionId=${encodeURIComponent(a.id)}`
                                  }
                                  className="rounded-lg border border-auctionme-lightBorder bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  {a.status === 'CLOSED' ? 'Result' : 'Monitor'}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => openEdit(a)}
                                  disabled={!canEditDetails}
                                  title={
                                    canEditDetails
                                      ? 'Edit permitted metadata'
                                      : 'Live and closed auctions cannot be edited to protect bid integrity'
                                  }
                                  className="rounded-lg border border-auctionme-lightBorder bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Page {safePage} of {totalPages} ({filtered.length} total)
                    </span>
                    <div className="flex items-center gap-1.5">
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

      {/* Edit Drawer (Permitted Details Only) */}
      {editingAuction && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingAuction(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-2xl dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
            <div className="flex items-center justify-between border-b border-auctionme-lightBorder pb-3 dark:border-auctionme-darkBorder">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                Edit Auction Metadata
              </h2>
              <button
                type="button"
                onClick={() => setEditingAuction(null)}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 flex-1 space-y-4">
              <p className="font-mono text-[11px] text-slate-500">
                {getAuctionLotLabel(editingAuction)} · {editingAuction.status}
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3 py-2 text-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3 py-2 text-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
                />
              </div>
              {editNotice && (
                <div role="alert" className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  {editNotice}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-auctionme-emeraldLight py-2.5 text-xs font-bold text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
