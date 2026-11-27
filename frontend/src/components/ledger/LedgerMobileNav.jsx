'use client';

import Link from 'next/link';

const MOBILE_ITEMS = [
  { label: 'Discover', href: '/', active: false },
  { label: 'Live', href: '/', active: false },
  { label: 'Ledger', href: '/ledger', active: true },
  { label: 'Result', href: '/result', active: false },
  { label: 'Account', href: '/login', active: false },
];

export default function LedgerMobileNav() {
  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-md sm:hidden dark:border-slate-800 dark:bg-[#0d131a]/95"
    >
      {MOBILE_ITEMS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`flex flex-col items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
            item.active
              ? 'bg-emerald-50 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
