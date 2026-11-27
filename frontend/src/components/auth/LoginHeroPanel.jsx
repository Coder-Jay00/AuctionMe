'use client';

import Link from 'next/link';
import AuctionMeLogo from './AuctionMeLogo';

export default function LoginHeroPanel({
  headlineLines = ['Discover.', 'Compete.', 'Win.'],
  subtitle = 'A more transparent and engaging way to participate in live auctions.',
}) {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:w-[57%] lg:flex-col lg:justify-between xl:w-[58%]">
      {/* Dark Theme Hero Backdrop */}
      <div
        className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat dark:block"
        style={{
          backgroundImage: `url('/images/hero-watch-dark.jpg')`,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 hidden bg-gradient-to-r from-[#090e13]/92 via-[#090e13]/65 to-[#090e13]/25 dark:block"
        aria-hidden="true"
      />

      {/* Light Theme Hero Backdrop */}
      <div
        className="absolute inset-0 block bg-cover bg-center bg-no-repeat dark:hidden"
        style={{
          backgroundImage: `url('/images/hero-gavel-light.jpg')`,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 block bg-gradient-to-r from-[#f4f7f6]/95 via-[#f4f7f6]/70 to-transparent dark:hidden"
        aria-hidden="true"
      />

      {/* Top Brand Logo */}
      <div className="relative z-10 p-10 xl:p-14">
        <Link
          href="/"
          className="inline-block rounded-lg focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight dark:focus:ring-auctionme-emeraldDark"
          title="Return to Live Auction"
        >
          <AuctionMeLogo align="left" size="lg" />
        </Link>
      </div>

      {/* Editorial Headline */}
      <div className="relative z-10 max-w-md px-10 pb-20 xl:px-14 xl:pb-24">
        <h1 className="font-serif text-5xl font-semibold leading-[1.08] tracking-tight text-slate-900 dark:text-white xl:text-6xl">
          {headlineLines.map((line, index) => (
            <span key={line}>
              {line}
              {index < headlineLines.length - 1 && <br />}
            </span>
          ))}
        </h1>

        <div className="my-6 h-0.5 w-14 rounded-full bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark" />

        <p className="max-w-xs text-sm leading-relaxed text-slate-700 dark:text-slate-300 xl:text-base">
          {subtitle}
        </p>
      </div>

      {/* Bottom link back to live room */}
      <div className="relative z-10 px-10 pb-8 xl:px-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-auctionme-emeraldLight dark:text-slate-400 dark:hover:text-auctionme-emeraldDark"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Live Auction Room</span>
        </Link>
      </div>
    </aside>
  );
}
