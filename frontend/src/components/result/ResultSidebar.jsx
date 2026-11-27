'use client';

import Link from 'next/link';
import AuctionMeLogo from '../auth/AuctionMeLogo';

const NAV_ITEMS = [
  { label: 'Discover Auctions', href: '/', active: false },
  { label: 'Live Floor', href: '/', active: false },
  { label: 'My Ledger', href: '/ledger', active: true },
  { label: 'My Holdings', href: '/holdings', active: false },
  { label: 'Watchlist', href: '/watchlist', active: false },
  { label: 'Notifications', href: '/notifications', active: false },
  { label: 'Profile & Settings', href: '/settings', active: false },
];

export default function ResultSidebar({ currentBidderId }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white lg:flex dark:border-slate-800/80 dark:bg-[#0d131a]">
      <div>
        <div className="border-b border-slate-200/80 px-5 py-5 dark:border-slate-800/80">
          <Link href="/" className="inline-block">
            <AuctionMeLogo align="left" size="sm" />
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                item.active
                  ? 'bg-emerald-50 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              }`}
            >
              <span>{item.label}</span>
              {item.active && (
                <span className="h-1.5 w-1.5 rounded-full bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Bidder Identity Pill (Read-only display) */}
      <div className="border-t border-slate-200/80 p-4 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-[#121922]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
            {(currentBidderId || 'B').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
              {currentBidderId}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Bidder (Read-only)
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
