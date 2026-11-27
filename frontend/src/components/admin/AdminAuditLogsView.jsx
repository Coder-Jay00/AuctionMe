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
import { formatDateTimeFull, getAuctionLotLabel } from '../../utils/formatters';

export default function AdminAuditLogsView() {
  const { preference, setPreference } = useThemePreference();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuctions();
      setAuctions(Array.isArray(res?.auctions) ? res.auctions : []);
    } catch (err) {
      setError(err?.message || 'Unable to load server records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Read-only immutable events strictly derived from real PostgreSQL auction timestamps
  const logEntries = useMemo(() => {
    const entries = [];
    auctions.forEach((a) => {
      if (a.createdAt) {
        entries.push({
          id: `${a.id}-created`,
          timestamp: a.createdAt,
          action: 'AUCTION_RECORD_CREATED',
          actor: 'Server / Seed',
          resource: `${getAuctionLotLabel(a)} (${a.title})`,
        });
      }
      if (a.closedAt) {
        entries.push({
          id: `${a.id}-closed`,
          timestamp: a.closedAt,
          action: a.winnerId
            ? `AUCTION_CLOSED_WINNER (${a.winnerId})`
            : 'AUCTION_CLOSED_NO_WINNER',
          actor: 'Closing Worker (System)',
          resource: `${getAuctionLotLabel(a)} (${a.title})`,
        });
      }
    });
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [auctions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    return logEntries.filter((e) => {
      if (dateFilter === '7d') {
        const diff = (now - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 7) return false;
      } else if (dateFilter === '30d') {
        const diff = (now - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 30) return false;
      }
      if (q) {
        const hay = `${e.action} ${e.actor} ${e.resource}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logEntries, searchQuery, dateFilter]);

  return (
    <PortalShell
      role="admin"
      activeNav="audit"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Audit &amp; Logs
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Read-only, tamper-resistant platform activity log.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Requires backend audit export endpoint (GET /api/admin/audit-logs/export)"
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-purple-500/35 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-700 opacity-55 dark:text-purple-300"
          >
            Export (API Required)
          </button>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Dedicated immutable audit_logs table & endpoint required"
          description="GET /api/admin/audit-logs and append-only audit_logs storage are not implemented yet. Below are read-only auction lifecycle timestamps derived directly from GET /api/auctions."
        />

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load audit records."
            message={error}
            onRetry={loadRecords}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by action, actor or resource..."
                aria-label="Search audit logs"
                className="flex-1 rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white"
              />
              <select
                aria-label="Filter audit logs by date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3 py-2 text-xs font-medium text-slate-700 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <PortalEmptyState
                title="No matching audit entries"
                description="No server-recorded lifecycle events match your current filters."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="border-b border-auctionme-lightBorder bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action / Event</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Related Resource</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                    {filtered.map((entry) => (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDateTimeFull(entry.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                          {entry.action}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          {entry.actor}
                        </td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                          {entry.resource}
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
    </PortalShell>
  );
}
