'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuctionMeLogo from '../auth/AuctionMeLogo';
import ThemeSegmentedControl from '../auth/ThemeSegmentedControl';

const HOST_NAV = [
  {
    id: 'overview',
    label: 'Overview',
    mobileLabel: 'Overview',
    href: '/host',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <rect x="3" y="3" width="6" height="6" rx="1.2" />
        <rect x="11" y="3" width="6" height="4" rx="1.2" />
        <rect x="11" y="9" width="6" height="8" rx="1.2" />
        <rect x="3" y="11" width="6" height="6" rx="1.2" />
      </svg>
    ),
  },
  {
    id: 'create',
    label: 'Create Auction',
    mobileLabel: 'Create',
    href: '/host/create',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <circle cx="10" cy="10" r="7" />
        <path strokeLinecap="round" d="M10 6.5v7M6.5 10h7" />
      </svg>
    ),
  },
  {
    id: 'auctions',
    label: 'My Auctions',
    mobileLabel: 'Auctions',
    href: '/host/auctions',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <rect x="3.5" y="4" width="13" height="12" rx="2" />
        <path strokeLinecap="round" d="M6.5 8h7M6.5 11.5h4.5" />
      </svg>
    ),
  },
  {
    id: 'monitor',
    label: 'Live Monitor',
    mobileLabel: 'Monitor',
    href: '/host/monitor',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <circle cx="10" cy="10" r="2.2" />
        <path
          strokeLinecap="round"
          d="M6.2 6.2a5.4 5.4 0 000 7.6M13.8 6.2a5.4 5.4 0 010 7.6M3.8 3.8a8.8 8.8 0 000 12.4M16.2 3.8a8.8 8.8 0 010 12.4"
        />
      </svg>
    ),
  },
  {
    id: 'results',
    label: 'Results',
    mobileLabel: 'Results',
    href: '/host/results',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 4h-1.5V2.5h-7V4H5a1.5 1.5 0 00-1.5 1.5V6a4 4 0 003.4 3.95A4.1 4.1 0 009.5 13v2H7v1.5h6V15h-2.5v-2a4.1 4.1 0 002.6-3.05A4 4 0 0016.5 6v-.5A1.5 1.5 0 0015 4z" />
      </svg>
    ),
  },
];

const ADMIN_NAV = [
  {
    id: 'overview',
    label: 'Overview',
    mobileLabel: 'Overview',
    href: '/admin',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <rect x="3" y="3" width="6" height="6" rx="1.2" />
        <rect x="11" y="3" width="6" height="4" rx="1.2" />
        <rect x="11" y="9" width="6" height="8" rx="1.2" />
        <rect x="3" y="11" width="6" height="6" rx="1.2" />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users & Roles',
    mobileLabel: 'Users',
    href: '/admin/users',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <circle cx="8" cy="7" r="2.6" />
        <path strokeLinecap="round" d="M3.5 15.5c.8-2.2 2.4-3.2 4.5-3.2s3.7 1 4.5 3.2" />
        <circle cx="14" cy="7.5" r="2" />
        <path strokeLinecap="round" d="M13.6 12.6c1.5.3 2.5 1.1 3 2.9" />
      </svg>
    ),
  },
  {
    id: 'moderation',
    label: 'Moderation',
    mobileLabel: 'Moderate',
    href: '/admin/moderation',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 2.5l6 2.5v4.8c0 3.7-2.5 6.6-6 7.7-3.5-1.1-6-4-6-7.7V5l6-2.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.2l1.7 1.7 3.5-3.6" />
      </svg>
    ),
  },
  {
    id: 'complaints',
    label: 'Complaints',
    mobileLabel: 'Disputes',
    href: '/admin/complaints',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 7v3.5M10 13.5h.01M8.7 3.6L2.5 14.5A1.5 1.5 0 003.8 16.7h12.4a1.5 1.5 0 001.3-2.2L11.3 3.6a1.5 1.5 0 00-2.6 0z" />
      </svg>
    ),
  },
  {
    id: 'audit',
    label: 'Audit & Logs',
    mobileLabel: 'Audit',
    href: '/admin/audit',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
        <rect x="4" y="3" width="12" height="14" rx="2" />
        <path strokeLinecap="round" d="M7 7h6M7 10h6M7 13h4" />
      </svg>
    ),
  },
];

export default function PortalShell({
  role = 'host', // 'host' | 'admin'
  activeNav,
  themePreference,
  onThemeChange,
  headerRight = null,
  children,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const isAdmin = role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : HOST_NAV;

  const badgeCls = isAdmin
    ? 'border-purple-500/35 bg-purple-500/12 text-purple-700 dark:border-purple-400/35 dark:bg-purple-500/15 dark:text-purple-300'
    : 'border-auctionme-emeraldLight/30 bg-emerald-500/12 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/35 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark';

  const activeLinkCls = isAdmin
    ? 'border border-purple-500/30 bg-purple-500/15 text-purple-700 dark:border-purple-400/35 dark:bg-purple-500/20 dark:text-purple-300'
    : 'border border-auctionme-emeraldLight/25 bg-emerald-500/15 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/30 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark';

  const activeMobileCls = isAdmin
    ? 'bg-purple-500/12 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
    : 'bg-emerald-500/12 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark';

  const renderNavList = () => (
    <nav aria-label={`${isAdmin ? 'Administrator' : 'Host'} navigation`} className="flex-1 space-y-1 px-3 py-4">
      <div className="mb-3 px-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeCls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? 'bg-purple-500 dark:bg-purple-400' : 'bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark'}`} />
          {isAdmin ? 'Admin Panel' : 'Host Panel'}
        </span>
      </div>

      {navItems.map((item) => {
        const isActive = activeNav === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => setDrawerOpen(false)}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              isActive
                ? activeLinkCls
                : 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Quick Portal Switcher */}
      <div className="pt-4">
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Portals
        </p>
        <div className="space-y-1">
          <Link
            href="/auctions"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
          >
            <span>Bidder Floor</span>
            <span aria-hidden="true">↗</span>
          </Link>
          {isAdmin ? (
            <Link
              href="/host"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
            >
              <span>Host Panel</span>
              <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <Link
              href="/admin"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
            >
              <span>Admin Panel</span>
              <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );

  const renderProfileFooter = () => (
    <div className="border-t border-auctionme-lightBorder p-3.5 dark:border-auctionme-darkBorder">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100/80 px-3 py-2.5 dark:bg-auctionme-darkInput">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isAdmin
                ? 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                : 'bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
              <circle cx="10" cy="6.8" r="3" />
              <path strokeLinecap="round" d="M4.5 16c.9-2.4 3-3.7 5.5-3.7s4.6 1.3 5.5 3.7" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-white">
              Unauthenticated
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {isAdmin ? 'Admin RBAC Pending' : 'Host RBAC Pending'}
            </p>
          </div>
        </div>
        <Link
          href="/login"
          title="Sign in"
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
        {/* Desktop Sidebar */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-auctionme-lightBorder lg:bg-auctionme-lightPanel dark:lg:border-auctionme-darkBorder dark:lg:bg-auctionme-darkPanel">
          <div className="flex h-16 items-center border-b border-auctionme-lightBorder px-5 dark:border-auctionme-darkBorder">
            <Link href={isAdmin ? '/admin' : '/host'} className="focus:outline-none">
              <AuctionMeLogo align="left" size="sm" />
            </Link>
          </div>
          {renderNavList()}
          {renderProfileFooter()}
        </aside>

        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-auctionme-lightBorder bg-auctionme-lightPanel/95 px-4 backdrop-blur-md sm:px-6 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel/95">
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

            <div className="flex flex-1 justify-center lg:hidden">
              <Link href={isAdmin ? '/admin' : '/host'}>
                <AuctionMeLogo align="center" size="sm" />
              </Link>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeCls}`}>
                {isAdmin ? 'Administrator Operations' : 'Host Control Room'}
              </span>
            </div>

            <div className="relative flex items-center gap-2">
              {headerRight}

              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setThemeMenuOpen((prev) => !prev)}
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
            </div>
          </header>

          {/* Main Workspace */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8 lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
      </div>

      {/* Tablet & Mobile Slide-Over Drawer */}
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
            <div className="border-t border-auctionme-lightBorder px-4 py-3 dark:border-auctionme-darkBorder">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Appearance
              </p>
              <ThemeSegmentedControl compact value={themePreference} onChange={onThemeChange} />
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
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition ${
                  isActive ? activeMobileCls : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.icon}
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
