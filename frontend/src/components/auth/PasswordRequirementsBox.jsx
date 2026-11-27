'use client';

import { useState } from 'react';

const ITEMS = [
  { key: 'minLength', text: 'Minimum 8 characters' },
  { key: 'hasUppercase', text: 'At least one uppercase letter (A–Z)' },
  { key: 'hasNumber', text: 'At least one number (0–9)' },
  { key: 'hasSpecial', text: 'At least one special character (! @ # $ % ^ & *)' },
];

export default function PasswordRequirementsBox({ rules }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/75 px-3.5 py-2.5 dark:border-auctionme-emeraldDark/25 dark:bg-auctionme-emeraldDark/[0.06]">
      {/* Header (interactive accordion on mobile/tablet, static header on lg+) */}
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-expanded={mobileOpen}
        className="flex w-full items-center justify-between text-left lg:pointer-events-none"
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4 text-auctionme-emeraldLight dark:text-auctionme-emeraldDark"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 2.5l6 2.4v4.6c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8V4.9l6-2.4z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 10.2l1.7 1.7 3.3-3.5"
            />
          </svg>
          <span>Password requirements</span>
        </span>

        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`h-4 w-4 text-slate-500 transition-transform lg:hidden dark:text-slate-400 ${
            mobileOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {/* Checklist: always visible on desktop (lg:block), toggled on mobile/tablet */}
      <ul
        className={`mt-2 space-y-1 pl-1 text-[11px] ${
          mobileOpen ? 'block' : 'hidden lg:block'
        }`}
      >
        {ITEMS.map((item) => {
          const met = Boolean(rules?.[item.key]);
          return (
            <li
              key={item.key}
              className={`flex items-center gap-2 transition-colors ${
                met
                  ? 'font-medium text-auctionme-emeraldLight dark:text-auctionme-emeraldDark'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span aria-hidden="true" className="text-[10px]">
                {met ? '✓' : '•'}
              </span>
              <span>{item.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
