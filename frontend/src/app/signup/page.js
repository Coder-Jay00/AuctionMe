'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuctionMeLogo from '../../components/auth/AuctionMeLogo';
import LoginHeroPanel from '../../components/auth/LoginHeroPanel';
import SignupForm from '../../components/auth/SignupForm';
import ThemeSegmentedControl from '../../components/auth/ThemeSegmentedControl';
import { useThemePreference } from '../../hooks/useThemePreference';
import { fetchCurrentUser } from '../../services/authApi';
import { getDashboardPathForRole } from '../../utils/roleRouting';

export default function SignupPage() {
  const router = useRouter();
  const { preference, setPreference } = useThemePreference();

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((user) => {
      if (active && user?.role) {
        router.replace(getDashboardPathForRole(user.role));
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="relative flex min-h-screen w-full bg-auctionme-lightBg text-slate-900 transition-colors duration-200 dark:bg-auctionme-darkBg dark:text-slate-100">
      {/* Subtle atmospheric emerald glow on tablet/mobile */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden lg:hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl dark:bg-auctionme-emeraldDark/10" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl dark:bg-auctionme-emeraldDark/10" />
      </div>

      {/* Desktop Left Split-Screen Hero Showcase */}
      <LoginHeroPanel
        headlineLines={['Join', 'the Auction', 'Community.']}
        subtitle="Discover unique assets, place real-time bids, and win what you value."
      />

      {/* Right Column (Desktop) / Compact Centered Form (Tablet & Mobile) */}
      <main className="relative z-10 flex w-full flex-col justify-between bg-transparent px-5 py-5 sm:px-8 sm:py-7 lg:w-[43%] lg:border-l lg:border-slate-200/80 lg:bg-auctionme-lightPanel lg:px-10 lg:py-6 xl:w-[42%] dark:lg:border-slate-800/80 dark:lg:bg-auctionme-darkPanel">
        {/* Top Theme Selector */}
        <div className="flex w-full justify-center">
          <ThemeSegmentedControl
            value={preference}
            onChange={setPreference}
          />
        </div>

        {/* Center Registration Card */}
        <div className="mx-auto my-6 flex w-full max-w-[390px] flex-col items-center md:rounded-2xl md:border md:border-slate-200/80 md:bg-white/95 md:p-7 md:shadow-xl lg:my-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:md:border-slate-800/80 dark:md:bg-auctionme-darkPanel/95 dark:lg:border-0 dark:lg:bg-transparent">
          <AuctionMeLogo align="center" size="sm" />

          <div className="mt-5 mb-5 text-center">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Create your account.
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Discover rare finds. Compete with confidence.
            </p>
          </div>

          <SignupForm />
        </div>

        <div className="hidden h-1 lg:block" aria-hidden="true" />
      </main>
    </div>
  );
}
