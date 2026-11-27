'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuctionMeLogo from '../auth/AuctionMeLogo';
import ThemeSegmentedControl from '../auth/ThemeSegmentedControl';
import ResultSidebar from './ResultSidebar';
import ResultOverviewCard from './ResultOverviewCard';
import ResultBidHistory from './ResultBidHistory';
import ResultActionsPanel from './ResultActionsPanel';
import { ResultErrorState, ResultLoadingState } from './ResultStates';
import { useThemePreference } from '../../hooks/useThemePreference';
import {
  fetchAuction,
  fetchAuctionBids,
  fetchAuctionResult,
  fetchAuctions,
} from '../../services/api';

export default function AuctionResultScreen({ initialAuctionId = null }) {
  const { preference, setPreference } = useThemePreference();

  const [auction, setAuction] = useState(null);
  const [result, setResult] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read-only bidder identifier used purely to highlight "(You)" and filter "My Bids"
  const [currentBidderId] = useState('bidder-aarav-01');

  const loadResultData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let targetId = initialAuctionId;

      if (!targetId) {
        const list = await fetchAuctions();
        const auctions = list?.auctions || [];
        const preferred =
          auctions.find((a) => a.status === 'CLOSED') || auctions[0];
        if (!preferred) {
          throw new Error('No auctions found on the server.');
        }
        targetId = preferred.id;
      }

      const [auctionRes, resultRes, bidsRes] = await Promise.all([
        fetchAuction(targetId),
        fetchAuctionResult(targetId),
        fetchAuctionBids(targetId, 100),
      ]);

      setAuction(auctionRes.auction);
      setResult(resultRes.result);
      setBids(bidsRes.bids || []);
    } catch (err) {
      setError(
        err.message || 'Unable to load auction result from the Express API.'
      );
    } finally {
      setLoading(false);
    }
  }, [initialAuctionId]);

  useEffect(() => {
    loadResultData();
  }, [loadResultData]);

  const lotLabel = auction?.id
    ? `LOT #${auction.id.slice(0, 8).toUpperCase()}`
    : null;

  return (
    <div className="flex min-h-screen w-full bg-auctionme-lightBg text-slate-900 transition-colors duration-200 dark:bg-auctionme-darkBg dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <ResultSidebar currentBidderId={currentBidderId} />

      {/* Main Content */}
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
              <span>Back to Auctions</span>
            </Link>
          </div>

          <ThemeSegmentedControl
            value={preference}
            onChange={setPreference}
            compact
          />
        </header>

        {/* Page Body */}
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          {/* Mobile/Tablet Back Link */}
          <div className="lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-auctionme-emeraldLight dark:text-slate-400 dark:hover:text-auctionme-emeraldDark"
            >
              <span aria-hidden="true">←</span>
              <span>Back to Auctions</span>
            </Link>
          </div>

          {/* Screen Title & Status Pills */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="7.5" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.8 10.2l2.1 2.1 4.4-4.5"
                  />
                </svg>
              </div>
              <div>
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Auction Result
                </h1>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {result?.status === 'CLOSED'
                    ? 'This auction has ended. View the server-authoritative final result and complete bid ledger.'
                    : 'Viewing live auction status. Final winner is declared automatically upon server closure.'}
                </p>
              </div>
            </div>

            {result && (
              <div className="flex items-center gap-2">
                {lotLabel && (
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-[#121922] dark:text-slate-300">
                    {lotLabel}
                  </span>
                )}
                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    result.status === 'CLOSED'
                      ? 'bg-amber-100 text-amber-800 dark:bg-slate-800 dark:text-slate-200'
                      : 'bg-emerald-100 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                  }`}
                >
                  {result.status}
                </span>
              </div>
            )}
          </div>

          {/* State Switching: Loading / Error / Loaded */}
          {loading ? (
            <ResultLoadingState />
          ) : error ? (
            <ResultErrorState message={error} onRetry={loadResultData} />
          ) : auction && result ? (
            <>
              <ResultOverviewCard
                auction={auction}
                result={result}
                currentBidderId={currentBidderId}
              />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <ResultBidHistory
                    auction={auction}
                    result={result}
                    bids={bids}
                    currentBidderId={currentBidderId}
                  />
                </div>
                <div className="lg:col-span-4">
                  <ResultActionsPanel auction={auction} result={result} />
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
