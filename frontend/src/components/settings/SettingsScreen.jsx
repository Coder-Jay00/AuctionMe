'use client';

import { useState } from 'react';
import Link from 'next/link';
import BidderShell from '../layout/BidderShell';
import ThemeSegmentedControl from '../auth/ThemeSegmentedControl';
import { useThemePreference } from '../../hooks/useThemePreference';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'account', label: 'Account' },
];

export default function SettingsScreen() {
  const { preference, setPreference } = useThemePreference();
  const [activeTab, setActiveTab] = useState('profile');

  // Local browser UI preferences (clearly labeled as local until backend preferences API exists)
  const [prefs, setPrefs] = useState({
    bidAccepted: true,
    outbidAlerts: true,
    antiSnipingAlerts: true,
    resultDeclared: true,
  });

  const togglePref = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <BidderShell
      activeNav="settings"
      title="Profile & Settings"
      subtitle="Manage your AuctionMe account, security, and display preferences."
    >
      {/* Section Tabs */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex items-center gap-1.5 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#10171f] dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#10171f]">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-xl font-bold text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/30 dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark">
                  ?
                </div>
                <div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    Not signed in
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    AuctionMe ID · Authenticated profile unavailable
                  </div>
                  <span className="mt-1.5 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Bidder
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled
                title="Profile editing requires a backend profile API endpoint"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-500"
              >
                Edit Profile
              </button>
            </div>

            <dl className="divide-y divide-slate-200/80 border-y border-slate-200/80 text-xs dark:divide-slate-800 dark:border-slate-800">
              <div className="flex items-center justify-between py-3.5">
                <dt className="text-slate-500 dark:text-slate-400">Display Name</dt>
                <dd className="font-medium text-slate-500 dark:text-slate-400">
                  Unavailable (not signed in)
                </dd>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <dt className="text-slate-500 dark:text-slate-400">AuctionMe ID</dt>
                <dd className="font-mono text-slate-500 dark:text-slate-400">
                  Unavailable (not signed in)
                </dd>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <dt className="text-slate-500 dark:text-slate-400">Account Status</dt>
                <dd>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    Guest Session
                  </span>
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#0d131a] dark:text-slate-400">
              Backend user profile endpoints (<code className="font-mono">GET /api/me</code> and{' '}
              <code className="font-mono">PATCH /api/me</code>) are not yet implemented. Profile editing is disabled until connected to the backend.
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Password &amp; Account Security
            </h2>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              AuctionMe uses AuctionMe ID and password authentication only. Password changes require a verified backend authentication session.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0d131a]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Change Password
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Unavailable until backend password update endpoint (<code className="font-mono">POST /api/auth/change-password</code>) is implemented.
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed dark:border-slate-700 dark:bg-transparent dark:text-slate-500"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            {/* Theme Preference (Live & Persisted) */}
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Appearance Theme
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Switch between Light, Dark, or your operating system preference.
                </p>
              </div>
              <ThemeSegmentedControl value={preference} onChange={setPreference} />
            </div>

            {/* Notification Preferences */}
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Notification Preferences
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Saved locally in this browser until a backend user preferences endpoint is implemented.
                </p>
              </div>

              <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {[
                  { key: 'bidAccepted', title: 'Bid accepted confirmations', desc: 'Alert when PostgreSQL commits your bid.' },
                  { key: 'outbidAlerts', title: 'Outbid notifications', desc: 'Alert when another bidder surpasses your bid.' },
                  { key: 'antiSnipingAlerts', title: '30-second anti-sniping extensions', desc: 'Alert when a late bid extends the auction deadline.' },
                  { key: 'resultDeclared', title: 'Final auction results', desc: 'Alert when an auction closes and declares a winner.' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.desc}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={prefs[item.key]}
                      onChange={() => togglePref(item.key)}
                      className="h-4 w-4 rounded border-slate-300 text-auctionme-emeraldLight focus:ring-auctionme-emeraldLight dark:border-slate-600 dark:bg-auctionme-darkInput dark:text-auctionme-emeraldDark"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Account Status &amp; Actions
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You are currently browsing as an unauthenticated guest. Sign in or create an AuctionMe account once backend authentication is enabled.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/login"
                className="rounded-xl bg-auctionme-emeraldLight px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
              >
                Go to Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </section>
    </BidderShell>
  );
}
