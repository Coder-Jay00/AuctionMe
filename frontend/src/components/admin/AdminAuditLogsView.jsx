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
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all');

  const loadLogs = useCallback(async () => {
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
    loadLogs();
  }, [loadLogs]);

  // Derive strictly real, immutable server-recorded auction lifecycle entries
  const logEntries = useMemo(() => {
    const entries = [];
    auctions.forEach((a) => {
      if (a.createdAt) {
        entries.push({
          id: `${a.id}-created`,
          timestamp: a.createdAt,
          action: 'AUCTION_CREATED',
          description: `Auction listed: ${a.title}`,
          actor: 'system / seed',
          resource: getAuctionLotLabel(a),
        });
      }
      if (a.closedAt) {
        entries.push({
          id: `${a.id}-closed`,
          timestamp: a.closedAt,
          action: 'AUCTION_CLOSED',
          description: a.winnerId
            ? `Auction closed automatically (Winner: ${a.winnerId})`
            : 'Auction closed automatically (No winner)',
          actor: 'closing_worker',
          resource: getAuctionLotLabel(a),
        });
      }
    });
    return entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [auctions]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    return logEntries.filter((entry) => {
      if (actionFilter !== 'ALL' && entry.action !== actionFilter) return false;
      if (dateFilter !== 'all') {
        const diffDays = (now - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
      }
      if (q) {
        const hay = `${entry.action} ${entry.description} ${entry.actor} ${entry.resource}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logEntries, actionFilter, dateFilter, searchQuery]);

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
              Audit & Logs
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Read-only, tamper-resistant record of platform lifecycle events.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Export requires a backend audit export endpoint (GET /api/admin/audit-logs/export)"
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-auctionme-lightBorder bg-slate-100 px-4 py-2 text-xs font-bold text-slate-400 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-500"
          >
            Export (Backend Required)
          </button>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Dedicated append-only audit_logs table & /api/admin/audit-logs API required"
          description="Showing real server-recorded auction lifecycle timestamps from GET /api/auctions as read-only entries. Full actor/admin audit logging and export require a backend append-only audit service."
        />

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load audit records."
            message={error}
            onRetry={loadLogs}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search action, actor, or resource..."
                aria-label="Search audit logs"
                className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs sm:max-w-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Filter by action"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3 py-2 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
                >
                  <option value="ALL">All Events</option>
                  <option value="AUCTION_CREATED">Auction Created</option>
                  <option value="AUCTION_CLOSED">Auction Closed</option>
                </select>
                <select
                  aria-label="Filter by date range"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3 py-2 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <PortalEmptyState
                title="No matching log entries"
                description="No recorded events match your current filters."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <table className="w-full min-w-[660px] text-left text-xs">
                  <thead className="border-b border-auctionme-lightBorder bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action / Event</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Resource</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                    {filteredLogs.map((entry) => (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDateTimeFull(entry.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-md bg-purple-500/12 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                            {entry.action}
                          </span>
                          <p className="mt-1 text-slate-800 dark:text-slate-200">
                            {entry.description}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          {entry.actor}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
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
