'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PortalShell from '../portal/PortalShell';
import ActivityChart from '../portal/ActivityChart';
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

export default function HostOverviewView() {
  const { preference, setPreference } = useThemePreference();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartRange, setChartRange] = useState('7d');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuctions();
      setAuctions(Array.isArray(res?.auctions) ? res.auctions : []);
    } catch (err) {
      setError(err?.message || 'Unable to reach the auction server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let completed = 0;
    auctions.forEach((a) => {
      if (a.status === 'LIVE') live += 1;
      else if (a.status === 'SCHEDULED') upcoming += 1;
      else if (a.status === 'CLOSED') completed += 1;
    });
    return { total: auctions.length, live, upcoming, completed };
  }, [auctions]);

  const recentAuctions = useMemo(() => auctions.slice(0, 5), [auctions]);

  const recentActivity = useMemo(() => {
    const events = [];
    auctions.forEach((a) => {
      if (a.closedAt) {
        events.push({
          id: `${a.id}-closed`,
          label: `${getAuctionLotLabel(a)} closed${a.winnerId ? ` (Winner: ${a.winnerId})` : ' (No winner)'}`,
          timestamp: a.closedAt,
          tone: 'slate',
        });
      }
      if (a.createdAt) {
        events.push({
          id: `${a.id}-created`,
          label: `${getAuctionLotLabel(a)} — ${a.title} listed`,
          timestamp: a.createdAt,
          tone: 'emerald',
        });
      }
    });
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [auctions]);

  return (
    <PortalShell
      role="host"
      activeNav="overview"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        {/* Header + Create Auction Shortcut */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Host Overview
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Manage your auctions and track real-time floor performance.
            </p>
          </div>
          <Link
            href="/host/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-auctionme-emeraldLight px-4 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
          >
            <span>+ Create Auction</span>
          </Link>
        </div>

        <BackendRequirementNotice
          title="Host authentication & ownership scoping pending backend support"
          description="The backend does not yet store host_id on auctions or enforce Host session RBAC. Metrics below reflect live server-authoritative auctions from GET /api/auctions."
        />

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load Host Overview."
            message={error}
            onRetry={loadData}
          />
        ) : (
          <>
            {/* Summary KPIs */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {[
                { label: 'Total Auctions', value: stats.total, accent: 'text-auctionme-emeraldLight dark:text-auctionme-emeraldDark' },
                { label: 'Live Now', value: stats.live, accent: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Upcoming', value: stats.upcoming, accent: 'text-amber-600 dark:text-amber-400' },
                { label: 'Completed', value: stats.completed, accent: 'text-slate-700 dark:text-slate-200' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
                >
                  <p className={`font-sans text-2xl font-bold tabular-nums ${kpi.accent}`}>
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {kpi.label}
                  </p>
                </div>
              ))}
            </section>

            {/* Activity Chart */}
            <ActivityChart
              title="Auction Activity"
              auctions={auctions}
              range={chartRange}
              onRangeChange={setChartRange}
              accent="emerald"
            />

            {/* Recent Auctions + Recent Activity / Quick Actions */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm sm:p-5 lg:col-span-7 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                    Recent Auctions
                  </h2>
                  <Link
                    href="/host/auctions"
                    className="text-xs font-semibold text-auctionme-emeraldLight hover:underline dark:text-auctionme-emeraldDark"
                  >
                    View All →
                  </Link>
                </div>

                {recentAuctions.length === 0 ? (
                  <div className="mt-4">
                    <PortalEmptyState
                      title="No auctions yet"
                      description="Auctions returned by the server will appear here."
                    />
                  </div>
                ) : (
                  <div className="mt-4 divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                    {recentAuctions.map((a) => {
                      const statusMeta = getAuctionStatusMeta(a.status);
                      return (
                        <div key={a.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-semibold text-slate-400">
                              {getAuctionLotLabel(a)}
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {a.title}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusMeta.badgeClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                              {statusMeta.label}
                            </span>
                            <span className="font-mono text-xs font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                              {formatINR(a.currentPrice ?? a.startingPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="space-y-5 lg:col-span-5">
                {/* Quick Actions */}
                <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm sm:p-5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                  <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                    Quick Actions
                  </h2>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <Link
                      href="/host/create"
                      className="rounded-xl border border-auctionme-lightBorder bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-800 transition hover:border-auctionme-emeraldLight dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:hover:border-auctionme-emeraldDark"
                    >
                      Create Auction
                    </Link>
                    <Link
                      href="/host/monitor"
                      className="rounded-xl border border-auctionme-lightBorder bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-800 transition hover:border-auctionme-emeraldLight dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:hover:border-auctionme-emeraldDark"
                    >
                      Live Monitor
                    </Link>
                    <Link
                      href="/host/auctions"
                      className="rounded-xl border border-auctionme-lightBorder bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-800 transition hover:border-auctionme-emeraldLight dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:hover:border-auctionme-emeraldDark"
                    >
                      Manage Lots
                    </Link>
                    <Link
                      href="/host/results"
                      className="rounded-xl border border-auctionme-lightBorder bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-800 transition hover:border-auctionme-emeraldLight dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:hover:border-auctionme-emeraldDark"
                    >
                      View Results
                    </Link>
                  </div>
                </section>

                {/* Recent Activity */}
                <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm sm:p-5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                  <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                    Recent Activity
                  </h2>
                  {recentActivity.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      No recorded auction activity yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {recentActivity.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex items-start justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-700 dark:text-slate-300">{ev.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatShortDate(ev.timestamp)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
