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
} from '../../utils/formatters';

export default function AdminModerationView() {
  const { preference, setPreference } = useThemePreference();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [reason, setReason] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

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

  // Only classify by moderationStatus if the backend explicitly supplies it
  const categorized = useMemo(() => {
    const pending = [];
    const approved = [];
    const rejected = [];
    auctions.forEach((a) => {
      const mod = a.moderationStatus;
      if (mod === 'REJECTED') rejected.push(a);
      else if (mod === 'APPROVED') approved.push(a);
      else if (mod === 'PENDING') pending.push(a);
      else approved.push(a); // Currently live/seeded auctions have no moderation queue column yet
    });
    return { PENDING: pending, APPROVED: approved, REJECTED: rejected };
  }, [auctions]);

  const filtered = useMemo(() => {
    const list = categorized[activeTab] || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) =>
      `${a.title} ${a.id} ${getAuctionLotLabel(a)} ${a.hostId || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [categorized, activeTab, searchQuery]);

  const handleModerationAttempt = (decision) => {
    if (decision === 'REJECT' && !reason.trim()) {
      setActionNotice('Please provide a reason before rejecting a listing.');
      return;
    }
    setActionNotice(
      `Moderation ${decision.toLowerCase()} requires backend endpoint POST /api/admin/moderation/:id and Administrator RBAC. Accepted bids and auction results are never modified.`
    );
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
            Review product listings and uploaded media. Accepted bids and closed results are immutable.
          </p>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Moderation workflow schema & endpoints pending backend support"
          description="The auctions table does not yet include moderation_status, moderation_reason, or a moderation_history table. Existing listings from GET /api/auctions are shown read-only."
        />

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load moderation queue."
            message={error}
            onRetry={loadListings}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div role="tablist" className="flex flex-wrap gap-2">
                {[
                  { id: 'PENDING', label: 'Pending', count: categorized.PENDING.length },
                  { id: 'APPROVED', label: 'Published / Live', count: categorized.APPROVED.length },
                  { id: 'REJECTED', label: 'Rejected', count: categorized.REJECTED.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === tab.id
                        ? 'bg-purple-600 text-white dark:bg-purple-500'
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
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by lot, item or host..."
                aria-label="Search moderation listings"
                className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none sm:w-72 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white"
              />
            </div>

            {filtered.length === 0 ? (
              <PortalEmptyState
                title={`No ${activeTab.toLowerCase()} listings`}
                description="Listings matching this moderation queue will appear here once backend moderation state is enabled."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="border-b border-auctionme-lightBorder bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Lot / Item</th>
                      <th className="px-4 py-3">Auction Status</th>
                      <th className="px-4 py-3">Starting Price</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                    {filtered.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-[10px] font-semibold text-slate-400">
                            {getAuctionLotLabel(a)}
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {a.title}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {a.status}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-purple-700 dark:text-purple-400">
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
                              setActionNotice(null);
                            }}
                            className="rounded-lg border border-purple-500/35 bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-600 hover:text-white dark:border-purple-400/35 dark:bg-purple-500/15 dark:text-purple-300"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Moderation Review Drawer */}
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
                <p className="font-mono text-[10px] text-slate-400">
                  {getAuctionLotLabel(selectedAuction)} · {selectedAuction.status}
                </p>
                <h3 className="mt-1 font-serif text-base font-semibold text-slate-900 dark:text-white">
                  {selectedAuction.title}
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">
                  {selectedAuction.description}
                </p>
              </div>

              <div>
                <label htmlFor="mod-reason" className="block font-semibold text-slate-700 dark:text-slate-200">
                  Moderation Reason / Notes
                </label>
                <textarea
                  id="mod-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Required if rejecting a listing..."
                  className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3 py-2 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
                />
              </div>

              {actionNotice && (
                <div role="alert" className="rounded-xl border border-purple-500/35 bg-purple-500/10 p-3 text-xs text-purple-800 dark:text-purple-200">
                  {actionNotice}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleModerationAttempt('APPROVE')}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleModerationAttempt('REJECT')}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
