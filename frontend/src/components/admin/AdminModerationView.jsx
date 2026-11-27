'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function AdminModerationView() {
  const { preference, setPreference } = useThemePreference();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [reason, setReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuctions();
      setAuctions(Array.isArray(res?.auctions) ? res.auctions : []);
    } catch (err) {
      setError(err?.message || 'Unable to load auction listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Backend currently has no moderation_status column; existing LIVE/SCHEDULED/CLOSED
  // rows are already published on the server, so PENDING and REJECTED are strictly 0.
  const categorized = useMemo(() => {
    const pending = [];
    const approved = [];
    const rejected = [];
    auctions.forEach((a) => {
      if (a.moderationStatus === 'PENDING') pending.push(a);
      else if (a.moderationStatus === 'REJECTED') rejected.push(a);
      else approved.push(a);
    });
    return { pending, approved, rejected };
  }, [auctions]);

  const activeList = useMemo(() => {
    const source =
      tab === 'PENDING'
        ? categorized.pending
        : tab === 'REJECTED'
        ? categorized.rejected
        : categorized.approved;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter((a) =>
      `${a.title} ${a.id} ${a.hostId || ''} ${getAuctionLotLabel(a)}`.toLowerCase().includes(q)
    );
  }, [tab, categorized, searchQuery]);

  const handleModerationDecision = (decision) => {
    if (decision === 'REJECT' && !reason.trim()) {
      setActionFeedback({
        type: 'validation',
        text: 'Please provide a rejection reason before submitting.',
      });
      return;
    }
    setActionFeedback({
      type: 'error',
      text: `POST /api/admin/moderation/:id/${decision.toLowerCase()} and moderation_history persistence are not implemented on the backend yet. No server state was changed.`,
    });
  };

  return (
    <PortalShell
      role="admin"
      activeNav="moderation"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Auction Moderation
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Review auction listings prior to publication. Accepted bids and closed outcomes cannot be modified.
          </p>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Moderation workflow columns & endpoints pending backend implementation"
          description="PostgreSQL auctions table does not yet include moderation_status, moderation_reason, or a moderation_history table. Existing published auctions appear under Approved for read-only inspection."
        />

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load listings for moderation."
            message={error}
            onRetry={loadListings}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="tablist" className="flex flex-wrap gap-2">
                {[
                  { id: 'PENDING', label: 'Pending', count: categorized.pending.length },
                  { id: 'APPROVED', label: 'Approved / Published', count: categorized.approved.length },
                  { id: 'REJECTED', label: 'Rejected', count: categorized.rejected.length },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      tab === t.id
                        ? 'bg-purple-600 text-white dark:bg-purple-500 dark:text-[#12071f]'
                        : 'border border-auctionme-lightBorder bg-auctionme-lightPanel text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-slate-300'
                    }`}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by lot, item or host..."
                aria-label="Search moderation queue"
                className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs sm:w-72 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
              />
            </div>

            {activeList.length === 0 ? (
              <PortalEmptyState
                title={`No ${tab.toLowerCase()} listings`}
                description={
                  tab === 'PENDING'
                    ? 'Pending host submissions will appear here once moderation_status is added to the backend.'
                    : 'No listings match this moderation filter.'
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="border-b border-auctionme-lightBorder bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Lot / Item</th>
                      <th className="px-4 py-3">Lifecycle</th>
                      <th className="px-4 py-3">Starting Price</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                    {activeList.map((a) => {
                      const statusMeta = getAuctionStatusMeta(a.status);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-[10px] text-slate-400">{getAuctionLotLabel(a)}</div>
                            <div className="font-semibold text-slate-900 dark:text-white">{a.title}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatINR(a.startingPrice)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                            {formatShortDate(a.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAuction(a);
                                setReason('');
                                setActionFeedback(null);
                              }}
                              className="rounded-lg border border-purple-500/35 bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-600 hover:text-white dark:border-purple-400/35 dark:bg-purple-500/15 dark:text-purple-300"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Drawer */}
      {selectedAuction && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setSelectedAuction(null)} />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-2xl dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
            <div className="flex items-center justify-between border-b border-auctionme-lightBorder pb-3 dark:border-auctionme-darkBorder">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                Listing Review
              </h2>
              <button
                type="button"
                onClick={() => setSelectedAuction(null)}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto text-xs">
              <div>
                <p className="font-mono text-[10px] text-slate-400">{getAuctionLotLabel(selectedAuction)}</p>
                <h3 className="mt-1 font-serif text-base font-semibold text-slate-900 dark:text-white">
                  {selectedAuction.title}
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">
                  {selectedAuction.description}
                </p>
              </div>

              <div className="rounded-xl border border-auctionme-lightBorder bg-slate-50/70 p-3 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Moderation Reason</p>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for approval note or rejection..."
                  className="mt-2 w-full rounded-lg border border-auctionme-lightBorder bg-white p-2 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
                />
              </div>

              {actionFeedback && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
                >
                  {actionFeedback.text}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-auctionme-lightBorder pt-3 dark:border-auctionme-darkBorder">
              <button
                type="button"
                onClick={() => handleModerationDecision('APPROVE')}
                className="rounded-xl bg-auctionme-emeraldLight py-2.5 text-xs font-bold text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleModerationDecision('REJECT')}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
