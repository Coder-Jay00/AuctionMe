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
      setError(err?.message || 'Unable to reach platform API.');
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
          text: `${getAuctionLotLabel(a)} closed (${a.winnerId ? `Winner: ${a.winnerId}` : 'No winner'})`,
          timestamp: a.closedAt,
        });
      }
      if (a.startsAt) {
        events.push({
          id: `${a.id}-started`,
          text: `${getAuctionLotLabel(a)} scheduled/started — ${a.title}`,
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
            Platform health, live auction volume, and server-recorded activity.
          </p>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Administrator RBAC & user metrics endpoint required"
          description="Total Users requires a users table and GET /api/admin/overview with server-side Administrator authorization. Auction counts and bid value below are computed strictly from GET /api/auctions."
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
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <p className="font-mono text-lg font-bold text-slate-400 dark:text-slate-500">
                  N/A
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Users (API pending)
                </p>
              </div>
              <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <p className="font-sans text-2xl font-bold tabular-nums text-purple-700 dark:text-purple-400">
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
                <p className="truncate font-sans text-xl font-bold tabular-nums text-purple-700 dark:text-purple-400">
                  {formatINR(metrics.totalBidValuePaise)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Active &amp; Closed Bid Value
                </p>
              </div>
            </section>

            <ActivityChart
              title="Platform Activity"
              auctions={auctions}
              range={chartRange}
              onRangeChange={setChartRange}
              accent="purple"
            />

            <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                  Recent Platform Events
                </h2>
                <Link
                  href="/admin/audit"
                  className="text-xs font-semibold text-purple-700 hover:underline dark:text-purple-400"
                >
                  View Audit &amp; Logs →
                </Link>
              </div>
              {recentEvents.length === 0 ? (
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  No server events recorded yet.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                  {recentEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                    >
                      <span className="text-slate-800 dark:text-slate-200">{ev.text}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {formatShortDate(ev.timestamp)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}
