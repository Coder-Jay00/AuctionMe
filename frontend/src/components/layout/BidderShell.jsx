'use client';

import Link from 'next/link';
import AuctionMeLogo from '../auth/AuctionMeLogo';
import ThemeSegmentedControl from '../auth/ThemeSegmentedControl';
import { useThemePreference } from '../../hooks/useThemePreference';

const SIDEBAR_ITEMS = [
  { id: 'discover', label: 'Discover Auctions', href: '/' },
  { id: 'live', label: 'Live Floor', href: '/' },
  { id: 'ledger', label: 'My Ledger', href: '/ledger' },
  { id: 'result', label: 'Auction Result', href: '/result' },
  { id: 'notifications', label: 'Notifications', href: '/notifications' },
  { id: 'settings', label: 'Profile & Settings', href: '/settings' },
];

const MOBILE_ITEMS = [
  { id: 'discover', label: 'Discover', href: '/' },
  { id: 'ledger', label: 'Ledger', href: '/ledger' },
  { id: 'notifications', label: 'Alerts', href: '/notifications' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

export default function BidderShell({
  activeNav,
  title,
  subtitle,
  headerActions = null,
  children,
}) {
  const { preference, setPreference } = useThemePreference();

  return (
    <div className="flex min-h-screen w-full bg-auctionme-lightBg pb-16 text-slate-900 transition-colors duration-200 sm:pb-0 dark:bg-auctionme-darkBg dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white lg:flex dark:border-slate-800/80 dark:bg-[#0d131a]">
        <div>
          <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-800/80">
            <Link href="/" className="inline-block">
              <AuctionMeLogo align="left" size="sm" />
            </Link>
          </div>

          <nav aria-label="Bidder navigation" className="space-y-1 px-3 py-4">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = item.id === activeNav;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-emerald-50 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Account Link (No hardcoded user profile) */}
        <div className="border-t border-slate-200/80 p-4 dark:border-slate-800/80">
          <Link
            href="/login"
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:border-auctionme-emeraldLight/50 dark:border-slate-800 dark:bg-[#121922] dark:hover:border-auctionme-emeraldDark/50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
              ?
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                Guest Bidder
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Sign in →
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-slate-800/80 dark:bg-[#0d131a]/90">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Link href="/">
                <AuctionMeLogo align="left" size="sm" />
              </Link>
            </div>
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-auctionme-emeraldLight lg:inline-flex dark:text-slate-400 dark:hover:text-auctionme-emeraldDark"
            >
              <span aria-hidden="true">←</span>
              <span>Back to Live Auction</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            {headerActions}
            <ThemeSegmentedControl
              value={preference}
              onChange={setPreference}
              compact
            />
          </div>
        </header>

        {/* Page Body */}
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-md sm:hidden dark:border-slate-800 dark:bg-[#0d131a]/95"
      >
        {MOBILE_ITEMS.map((item) => {
          const isActive = item.id === activeNav;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
                isActive
                  ? 'bg-emerald-50 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
