'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuctionMeLogo from '../auth/AuctionMeLogo';
import ThemeSegmentedControl from '../auth/ThemeSegmentedControl';
import { formatTimeShort, getAuctionStatusMeta } from '../../utils/formatters';

const DEMO_BIDDERS = [
  'demo-user-101',
  'demo-user-202',
  'demo-user-303',
  'bidder-aarav-01',
  'bidder-meera-02',
];

function RoomConnectionBadge({ status }) {
  const map = {
    connected: {
      dot: 'bg-emerald-400',
      ping: true,
      label: 'Connected',
      cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-auctionme-emeraldDark',
    },
    reconnecting: {
      dot: 'bg-amber-400',
      ping: true,
      label: 'Reconnecting...',
      cls: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    connecting: {
      dot: 'bg-sky-400',
      ping: true,
      label: 'Connecting...',
      cls: 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    disconnected: {
      dot: 'bg-rose-500',
      ping: false,
      label: 'Disconnected',
      cls: 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
  };
  const current = map[status] || map.disconnected;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${current.cls}`}
    >
      <span className="relative flex h-2 w-2">
        {current.ping && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${current.dot}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${current.dot}`} />
      </span>
      <span>{current.label}</span>
    </div>
  );
}

const SIDEBAR_ITEMS = [
  {
    id: 'discover',
    label: 'Discover Auctions',
    href: '/auctions',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <circle cx="9" cy="9" r="5.5" />
        <path strokeLinecap="round" d="M13.2 13.2L17 17" />
      </svg>
    ),
  },
  {
    id: 'live_floor',
    label: 'Live Floor',
    href: '/',
    active: true,
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <circle cx="10" cy="10" r="2.2" />
        <path strokeLinecap="round" d="M6.2 6.2a5.4 5.4 0 000 7.6M13.8 6.2a5.4 5.4 0 010 7.6M3.8 3.8a8.8 8.8 0 000 12.4M16.2 3.8a8.8 8.8 0 010 12.4" />
      </svg>
    ),
  },
  {
    id: 'ledger',
    label: 'My Ledger',
    href: '/ledger',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <rect x="3.5" y="3" width="13" height="14" rx="2" />
        <path strokeLinecap="round" d="M6.5 7h7M6.5 10h7M6.5 13h4" />
      </svg>
    ),
  },
  {
    id: 'holdings',
    label: 'My Holdings',
    href: '/auctions',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 7.5L10 4l6.5 3.5v6.5L10 17.5 3.5 14V7.5z" />
        <path strokeLinecap="round" d="M3.5 7.5L10 11l6.5-3.5M10 11v6.5" />
      </svg>
    ),
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    href: '/auctions',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 16.8s-6-3.7-7.6-7.2A4.3 4.3 0 0110 5.4a4.3 4.3 0 017.6 4.2c-1.6 3.5-7.6 7.2-7.6 7.2z"
        />
      </svg>
    ),
  },
];

export default function LiveRoomShell({
  auction,
  bidderId,
  onBidderIdChange,
  connectionStatus,
  themePreference,
  onThemeChange,
  notifications = [],
  onClearNotifications,
  children,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const statusMeta = getAuctionStatusMeta(auction?.status || 'LIVE');

  const renderBidderSelector = () => (
    <div className="border-t border-auctionme-lightBorder p-3.5 dark:border-auctionme-darkBorder">
      <div className="rounded-xl border border-auctionme-lightBorder bg-slate-50/90 p-2.5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Bidder
          </span>
          <Link
            href="/login"
            className="text-[10px] font-semibold text-auctionme-emeraldLight hover:underline dark:text-auctionme-emeraldDark"
          >
            Sign In
          </Link>
        </div>

        <select
          aria-label="Select demo bidder ID"
          value={DEMO_BIDDERS.includes(bidderId) ? bidderId : '__custom__'}
          onChange={(e) => {
            if (e.target.value !== '__custom__') {
              onBidderIdChange(e.target.value);
            }
          }}
          className="mt-1.5 w-full rounded-lg border border-auctionme-lightBorder bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-auctionme-emeraldDark dark:focus:border-auctionme-emeraldDark"
        >
          {DEMO_BIDDERS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
          {!DEMO_BIDDERS.includes(bidderId) && (
            <option value="__custom__">{bidderId || 'Custom Bidder'}</option>
          )}
        </select>

        <input
          type="text"
          value={bidderId}
          onChange={(e) => onBidderIdChange(e.target.value)}
          placeholder="Custom bidder ID"
          aria-label="Custom bidder ID"
          className="mt-1.5 w-full rounded-lg border border-auctionme-lightBorder bg-white px-2.5 py-1 text-xs text-slate-700 placeholder-slate-400 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkBg dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark"
        />
      </div>
    </div>
  );

  const renderNavLinks = () => (
    <nav aria-label="Bidder room navigation" className="flex-1 space-y-1 px-3 py-4">
      {SIDEBAR_ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => setDrawerOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
            item.active
              ? 'border border-auctionme-emeraldLight/25 bg-emerald-500/10 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/30 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
              : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-auctionme-lightBg text-slate-900 transition-colors duration-200 dark:bg-auctionme-darkBg dark:text-slate-100">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-auctionme-lightBorder lg:bg-auctionme-lightPanel dark:lg:border-auctionme-darkBorder dark:lg:bg-auctionme-darkPanel">
          <div className="flex h-16 items-center border-b border-auctionme-lightBorder px-5 dark:border-auctionme-darkBorder">
            <Link href="/auctions">
              <AuctionMeLogo align="left" size="sm" />
            </Link>
          </div>
          {renderNavLinks()}
          {renderBidderSelector()}
        </aside>

        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-auctionme-lightBorder bg-auctionme-lightPanel/95 px-4 backdrop-blur-md sm:px-6 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel/95">
            {/* Mobile / Tablet Hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-auctionme-lightBorder bg-white text-slate-700 hover:bg-slate-50 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
                </svg>
              </button>
            </div>

            {/* Mobile / Tablet Centered Logo */}
            <div className="flex flex-1 justify-center lg:hidden">
              <Link href="/auctions">
                <AuctionMeLogo align="center" size="sm" />
              </Link>
            </div>

            {/* Desktop Live Status Strip */}
            <div className="hidden items-center gap-3 lg:flex">
              {auction && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${statusMeta.badgeClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                  {auction.status === 'LIVE'
                    ? 'LIVE AUCTION'
                    : auction.status === 'SCHEDULED'
                    ? 'UPCOMING AUCTION'
                    : 'AUCTION CLOSED'}
                </span>
              )}
              {auction && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  v{auction.version} · {auction.bidCount ?? 0}{' '}
                  {(auction.bidCount ?? 0) === 1 ? 'bid' : 'bids'}
                </span>
              )}
            </div>

            {/* Right Controls */}
            <div className="relative flex items-center gap-2">
              <div className="hidden sm:flex sm:items-center sm:gap-2">
                <RoomConnectionBadge status={connectionStatus} />
                {connectionStatus === 'connected' && (
                  <span className="hidden items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 xl:inline-flex dark:text-amber-300">
                    REAL-TIME SYNC
                  </span>
                )}
              </div>

              {/* Notifications Bell */}
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setThemeMenuOpen(false);
                }}
                aria-label="Room notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-auctionme-lightBorder bg-white text-slate-600 transition hover:text-slate-900 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-300 dark:hover:text-white"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 13.5H5l1.2-1.5V8.5a3.8 3.8 0 017.6 0V12l1.2 1.5zM8.5 15.8a1.6 1.6 0 003 0"
                  />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark" />
                )}
              </button>

              {/* Theme Switcher */}
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => {
                    setThemeMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
                  aria-label="Change color theme"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-auctionme-lightBorder bg-white text-slate-600 transition hover:text-slate-900 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-300 dark:hover:text-white"
                >
                  {themePreference === 'light' ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                      <circle cx="10" cy="10" r="3.5" />
                      <path strokeLinecap="round" d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M15.3 4.7L14 6M6 14l-1.3 1.3" />
                    </svg>
                  ) : themePreference === 'system' ? (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                      <rect x="2.75" y="3.5" width="14.5" height="9.75" rx="1.5" />
                      <path strokeLinecap="round" d="M7 16.5h6M10 13.25V16.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.2 12.6A6.5 6.5 0 017.4 3.8a6.8 6.8 0 108.8 8.8z" />
                    </svg>
                  )}
                </button>
                {themeMenuOpen && (
                  <div className="absolute right-0 mt-2 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-2 shadow-xl dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                    <ThemeSegmentedControl
                      compact
                      value={themePreference}
                      onChange={(val) => {
                        onThemeChange(val);
                        setThemeMenuOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Notifications Popover */}
              {notifOpen && (
                <div className="absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-2xl dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                  <div className="flex items-center justify-between border-b border-auctionme-lightBorder pb-2.5 dark:border-auctionme-darkBorder">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Room Activity Alerts
                    </h2>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearNotifications}
                        className="text-[11px] font-medium text-auctionme-emeraldLight hover:underline dark:text-auctionme-emeraldDark"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      No alerts yet. Live bids, +30s extensions, and closures will appear here.
                    </p>
                  ) : (
                    <ul className="mt-2.5 max-h-60 space-y-2 overflow-y-auto">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 text-xs dark:border-slate-800 dark:bg-auctionme-darkInput"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatTimeShort(n.timestamp)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                            {n.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Mobile Status Sub-bar */}
          <div className="flex items-center justify-between gap-2 border-b border-auctionme-lightBorder bg-auctionme-lightPanel/60 px-4 py-2 sm:hidden dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel/60">
            {auction ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusMeta.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                {statusMeta.label}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Live Floor</span>
            )}
            <RoomConnectionBadge status={connectionStatus} />
          </div>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>

      {/* Collapsible Tablet/Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full w-72 max-w-[82vw] flex-col border-r border-auctionme-lightBorder bg-auctionme-lightPanel shadow-2xl dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
            <div className="flex h-16 items-center justify-between border-b border-auctionme-lightBorder px-4 dark:border-auctionme-darkBorder">
              <AuctionMeLogo align="left" size="sm" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
            {renderNavLinks()}
            <div className="border-t border-auctionme-lightBorder px-4 py-3 dark:border-auctionme-darkBorder">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Appearance
              </p>
              <ThemeSegmentedControl
                compact
                value={themePreference}
                onChange={onThemeChange}
              />
            </div>
            {renderBidderSelector()}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (< md) */}
      <nav
        aria-label="Mobile room navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-auctionme-lightBorder bg-auctionme-lightPanel/95 px-2 py-1.5 backdrop-blur-md md:hidden dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel/95"
      >
        <div className="grid grid-cols-4 gap-1">
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <circle cx="10" cy="10" r="2.2" />
              <path strokeLinecap="round" d="M6.2 6.2a5.4 5.4 0 000 7.6M13.8 6.2a5.4 5.4 0 010 7.6" />
            </svg>
            <span>Floor</span>
          </Link>

          <Link
            href="/auctions"
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <circle cx="9" cy="9" r="5.5" />
              <path strokeLinecap="round" d="M13.2 13.2L17 17" />
            </svg>
            <span>Catalog</span>
          </Link>

          <Link
            href="/ledger"
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <rect x="3.5" y="3" width="13" height="14" rx="2" />
              <path strokeLinecap="round" d="M6.5 7h7M6.5 10h7M6.5 13h4" />
            </svg>
            <span>Ledger</span>
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <circle cx="5" cy="10" r="1.2" fill="currentColor" />
              <circle cx="10" cy="10" r="1.2" fill="currentColor" />
              <circle cx="15" cy="10" r="1.2" fill="currentColor" />
            </svg>
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
