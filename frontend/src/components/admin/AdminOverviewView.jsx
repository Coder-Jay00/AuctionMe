'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PortalShell from '../portal/PortalShell';
import ActivityChart from '../portal/ActivityChart';
import {
  BackendRequirementNotice,
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

export default function AdminOverviewView() {
  const { preference, setPreference } = useThemePreference();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartRange, setChartRange] = useState('30d');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuctions();
      setAuctions(Array.isArray(res?.auctions) ? res.auctions : []);
    } catch (err) {
      setError(err?.message || 'Unable to load platform overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const metrics = useMemo(() => {
    const liveCount = auctions.filter((a) => a.status === 'LIVE').length;
    const totalBidValuePaise = auctions.reduce((sum, a) => {
      if ((a.bidCount ?? 0) > 0 && typeof a.currentPrice === 'number') {
        return sum + a.currentPrice;
      }
      return sum;
    }, 0);
    return {
      totalAuctions: auctions.length,
      liveCount,
      totalBidValuePaise,
    };
  }, [auctions]);

  const recentEvents = useMemo(() => {
    const events = [];
    auctions.forEach((a) => {
      if (a.closedAt) {
        events.push({
          id: `${a.id}-closed`,
          label: `${getAuctionLotLabel(a)} closed (${a.winnerId ? `Winner: ${a.winnerId}` : 'No winner'})`,
          timestamp: a.closedAt,
        });
      }
      if (a.startsAt) {
        events.push({
          id: `${a.id}-started`,
          label: `${getAuctionLotLabel(a)} — ${a.title} scheduled/started`,
          timestamp: a.startsAt,
        });
      }
    });
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [auctions]);

  return (
    <PortalShell
      role="admin"
      activeNav="overview"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Admin Overview
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Platform health, auction volume, and operational visibility.
          </p>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Administrator RBAC & user metrics API not implemented yet"
          description="Total Users requires a backend users table and authenticated GET /api/admin/metrics endpoint. Auction counts, live count, and active/closed bid value below come from real GET /api/auctions records."
        />

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to load Admin Overview."
            message={error}
            onRetry={loadOverview}
          />
        ) : (
          <>
            {/* KPI Row */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <p className="font-mono text-lg font-bold text-slate-400 sm:text-xl dark:text-slate-500">
                  Not available
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Users (No Users API)
                </p>
              </div>
              <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <p className="font-sans text-2xl font-bold tabular-nums text-purple-700 dark:text-purple-300">
                  {metrics.totalAuctions}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Auctions
                </p>
              </div>
              <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <p className="font-sans text-2xl font-bold tabular-nums text-emerald-600 dark:text-auctionme-emeraldDark">
                  {metrics.liveCount}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Live Now
                </p>
              </div>
              <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <p className="truncate font-mono text-xl font-bold tabular-nums text-purple-700 dark:text-purple-300">
                  {formatINR(metrics.totalBidValuePaise)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Top-Bid Value
                </p>
              </div>
            </section>

            {/* Platform Activity Chart */}
            <ActivityChart
              title="Platform Activity"
              auctions={auctions}
              range={chartRange}
              onRangeChange={setChartRange}
              accent="purple"
            />

            {/* Recent Platform Events & Operational Links */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm lg:col-span-7 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                    Recent Platform Events
                  </h2>
                  <Link
                    href="/admin/audit"
                    className="text-xs font-semibold text-purple-700 hover:underline dark:text-purple-300"
                  >
                    Audit Logs →
                  </Link>
                </div>

                {recentEvents.length === 0 ? (
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    No auction events recorded yet.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                    {recentEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-xs"
                      >
                        <span className="text-slate-700 dark:text-slate-200">{ev.label}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatShortDate(ev.timestamp)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm lg:col-span-5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                  Governance Modules
                </h2>
                <div className="mt-4 space-y-2.5 text-xs">
                  {[
                    { href: '/admin/users', title: 'Users & Roles', note: 'Requires users table + RBAC' },
                    { href: '/admin/moderation', title: 'Auction Moderation', note: 'Inspect live/scheduled lots' },
                    { href: '/admin/complaints', title: 'Complaints & Disputes', note: 'Requires complaints API' },
                    { href: '/admin/audit', title: 'Audit & Logs', note: 'Read-only tamper-resistant view' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between rounded-xl border border-auctionme-lightBorder bg-slate-50/70 px-3.5 py-2.5 transition hover:border-purple-500/40 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/70 dark:hover:border-purple-400/40"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.note}</p>
                      </div>
                      <span className="text-purple-600 dark:text-purple-400">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
