'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BidderShell from '../layout/BidderShell';
import { formatTimeShort } from '../../utils/formatters';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'bids', label: 'Bids' },
  { id: 'auctions', label: 'Auctions' },
  { id: 'results', label: 'Results' },
  { id: 'account', label: 'Account' },
];

function CategoryIcon({ category }) {
  const styles = {
    bids: 'bg-emerald-100 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
    auctions: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    results: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    account: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase ${
        styles[category] || styles.account
      }`}
      aria-hidden="true"
    >
      {(category || 'N').slice(0, 1)}
    </span>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const healthRes = await fetch(`${API_BASE}/api/health`, {
        cache: 'no-store',
      });
      if (!healthRes.ok) {
        throw new Error('Unable to connect to the AuctionMe backend.');
      }

      // Backend inspection confirmed no notifications feed endpoint exists yet.
      // Never fabricate notification events.
      setNotifications([]);
      setError(
        'Notifications API endpoint (e.g. GET /api/notifications) is not yet implemented on the backend. Real bidder notifications will appear here once connected.'
      );
    } catch (err) {
      setNotifications([]);
      setError(
        err.message || 'Unable to load notifications. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleMarkAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <BidderShell
      activeNav="notifications"
      title="Notifications"
      subtitle="Stay updated on your bids, auctions, results, and account activity."
    >
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#10171f]">
        {/* Category Tabs */}
        <div
          role="tablist"
          aria-label="Notification categories"
          className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 px-4 py-3 dark:border-slate-800"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count =
              tab.id === 'all'
                ? notifications.length
                : notifications.filter((n) => n.category === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
                {!error && <span className="ml-1 opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 text-xs dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1.5 font-semibold text-auctionme-emeraldLight transition hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-auctionme-emeraldDark"
          >
            <span>✓ Mark all as read</span>
          </button>
        </div>

        {/* States: Loading | Error | Empty | List */}
        {loading ? (
          <div className="space-y-3 p-5 animate-pulse" aria-busy="true">
            <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
            <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="m-5 rounded-xl border border-rose-300 bg-rose-50 p-6 text-center dark:border-rose-500/35 dark:bg-rose-950/30"
          >
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Notifications Unavailable
            </h2>
            <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-rose-700 dark:text-rose-300/90">
              {error}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={loadNotifications}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
              >
                Retry
              </button>
              <Link
                href="/"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Go to Live Auction
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
              No notifications yet.
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              We&apos;ll notify you about your bids, auction extensions, and final results here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.map((item) => (
              <li
                key={item.id}
                className={`flex items-start justify-between gap-4 px-4 py-4 transition ${
                  item.read
                    ? 'bg-transparent'
                    : 'bg-emerald-50/50 dark:bg-auctionme-emeraldDark/[0.05]'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <CategoryIcon category={item.category} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      {!item.read && (
                        <span
                          className="h-2 w-2 rounded-full bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark"
                          aria-label="Unread"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="font-mono text-[11px] text-slate-400">
                    {formatTimeShort(item.createdAt)}
                  </span>
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(item.id)}
                      className="text-[11px] font-semibold text-auctionme-emeraldLight hover:underline dark:text-auctionme-emeraldDark"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </BidderShell>
  );
}
