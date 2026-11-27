'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuctionMeLogo from '../auth/AuctionMeLogo';
import ThemeSegmentedControl from '../auth/ThemeSegmentedControl';
import { formatTimeShort } from '../../utils/formatters';

function ConnectionPill({ status }) {
  const map = {
    connected: {
      dot: 'bg-emerald-400',
      ping: true,
      label: 'Live Sync',
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
      label: 'Offline',
      cls: 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    idle: {
      dot: 'bg-slate-400',
      ping: false,
      label: 'Standby',
      cls: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400',
    },
  };
  const current = map[status] || map.idle;

  return (
    <div
      title={`Real-time status: ${current.label}`}
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
      <span className="hidden sm:inline">{current.label}</span>
    </div>
  );
}

const NAV_ITEMS = [
  {
    id: 'discover',
    label: 'Discover Auctions',
    mobileLabel: 'Discover',
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
    mobileLabel: 'Live',
    href: '/',
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
    mobileLabel: 'Ledger',
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
    mobileLabel: 'Holdings',
    href: '/holdings',
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
    mobileLabel: 'Watchlist',
    href: '/watchlist',
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
  {
    id: 'notifications',
    label: 'Notifications',
    mobileLabel: 'Alerts',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 13.5H5l1.2-1.5V8.5a3.8 3.8 0 017.6 0V12l1.2 1.5zM8.5 15.8a1.6 1.6 0 003 0"
        />
      </svg>
    ),
  },
];

export default function CatalogShell({
  activeSection,
  onSelectSection,
  searchQuery,
  onSearchChange,
  connectionStatus,
  themePreference,
  onThemeChange,
  watchlistCount,
  notifications = [],
  onClearNotifications,
  bidderId = 'bidder_9192',
  children,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const handleNavClick = (itemId) => {
    if (itemId === 'notifications') {
      setNotifOpen((prev) => !prev);
      setDrawerOpen(false);
      return;
    }
    onSelectSection(itemId);
    setDrawerOpen(false);
  };

  const renderNavList = () => (
    <nav aria-label="Bidder navigation" className="flex-1 space-y-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.id;
        const badge =
          item.id === 'watchlist' && watchlistCount > 0
            ? watchlistCount
            : item.id === 'notifications' && notifications.length > 0
            ? notifications.length
            : null;

        const baseCls = `flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'border border-auctionme-emeraldLight/25 bg-emerald-500/10 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/30 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
            : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
        }`;

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={baseCls}
            >
              <span className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </span>
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            className={baseCls}
          >
            <span className="flex items-center gap-3">
              {item.icon}
              <span>{item.label}</span>
            </span>
            {badge !== null && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-auctionme-emeraldLight px-1.5 text-[10px] font-bold text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const renderProfileFooter = () => (
    <div className="border-t border-auctionme-lightBorder p-3.5 dark:border-auctionme-darkBorder">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100/80 px-3 py-2.5 dark:bg-auctionme-darkInput">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <circle cx="10" cy="6.8" r="3" />
              <path strokeLinecap="round" d="M4.5 16c.9-2.4 3-3.7 5.5-3.7s4.6 1.3 5.5 3.7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
              {bidderId}
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Bidder
            </p>
          </div>
        </div>
        <Link
          href="/login"
          title="Sign in or switch account"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5l5 5-5 5" />
          </svg>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-auctionme-lightBg text-slate-900 transition-colors duration-200 dark:bg-auctionme-darkBg dark:text-slate-100">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar (lg+) */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-auctionme-lightBorder lg:bg-auctionme-lightPanel dark:lg:border-auctionme-darkBorder dark:lg:bg-auctionme-darkPanel">
          <div className="flex h-16 items-center border-b border-auctionme-lightBorder px-5 dark:border-auctionme-darkBorder">
            <Link href="/auctions" className="focus:outline-none">
              <AuctionMeLogo align="left" size="sm" />
            </Link>
          </div>
          {renderNavList()}
          {renderProfileFooter()}
        </aside>

        {/* Main Content Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Branded Top Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-auctionme-lightBorder bg-auctionme-lightPanel/95 px-4 backdrop-blur-md sm:px-6 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel/95">
            {/* Left: Mobile/Tablet Hamburger + Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-auctionme-lightBorder bg-white text-slate-700 transition hover:bg-slate-50 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
                </svg>
              </button>
            </div>

            {/* Center on Mobile/Tablet: AuctionMe Logo */}
            <div className="flex flex-1 justify-center lg:hidden">
              <Link href="/auctions">
                <AuctionMeLogo align="center" size="sm" />
              </Link>
            </div>

            {/* Desktop Search Bar */}
            <div className="relative hidden max-w-md flex-1 lg:block">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="5.5" />
                <path strokeLinecap="round" d="M13.2 13.2L17 17" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search auctions, items, host or auction ID..."
                aria-label="Search auctions"
                className="w-full rounded-xl border border-auctionme-lightBorder bg-slate-50/90 py-2 pl-4 pr-10 text-xs text-slate-900 placeholder-slate-400 transition focus:border-auctionme-emeraldLight focus:bg-white focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight/20 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark"
              />
            </div>

            {/* Right Controls: Connection Status + Notifications + Theme Switcher */}
            <div className="relative flex items-center gap-2 sm:gap-2.5">
              <ConnectionPill status={connectionStatus} />

              {/* Notifications Bell */}
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  setThemeMenuOpen(false);
                }}
                aria-label="Notifications"
                aria-expanded={notifOpen}
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

              {/* Theme Switcher Button (Dark / Light / System) */}
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => {
                    setThemeMenuOpen((prev) => !prev);
                    setNotifOpen(false);
                  }}
                  aria-label="Change color theme"
                  aria-expanded={themeMenuOpen}
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
                      Live Activity Alerts
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
                      No real-time alerts yet. Live bid updates and auction closings
                      will appear here.
                    </p>
                  ) : (
                    <ul className="mt-2.5 max-h-64 space-y-2 overflow-y-auto">
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

          {/* Main Workspace Container */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8 lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
      </div>

      {/* Tablet & Mobile Collapsible Slide-Over Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
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

            {renderNavList()}

            {/* Theme selector inside drawer for mobile convenience */}
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

            {renderProfileFooter()}
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation (< md) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-auctionme-lightBorder bg-auctionme-lightPanel/95 px-2 py-1.5 backdrop-blur-md md:hidden dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel/95"
      >
        <div className="grid grid-cols-5 gap-1">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const isActive = activeSection === item.id;
            const cls = `flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
              isActive
                ? 'text-auctionme-emeraldLight dark:text-auctionme-emeraldDark'
                : 'text-slate-500 dark:text-slate-400'
            }`;
            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className={cls}>
                  {item.icon}
                  <span>{item.mobileLabel}</span>
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={cls}
              >
                {item.icon}
                <span>{item.mobileLabel}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold text-slate-500 transition dark:text-slate-400"
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
