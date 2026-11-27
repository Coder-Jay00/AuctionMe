'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import HoldingsShell from './HoldingsShell';
import HoldingsSummaryMetrics from './HoldingsSummaryMetrics';
import HoldingsControls from './HoldingsControls';
import HoldingCard from './HoldingCard';
import HoldingDetailsDrawer from './HoldingDetailsDrawer';
import {
  BackendGapBanner,
  HoldingsEmptyState,
  HoldingsErrorState,
  HoldingsLoadingSkeleton,
} from './HoldingsStates';
import { fetchAuctions, fetchBidderHoldings } from '../../services/api';
import { useThemePreference } from '../../hooks/useThemePreference';

function matchesDateFilter(isoString, filter) {
  if (filter === 'all') return true;
  if (!isoString) return false;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  if (filter === 'this_month') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }
  if (filter === 'this_year') {
    return date.getFullYear() === now.getFullYear();
  }
  const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (filter === 'last_30_days') return diffDays >= 0 && diffDays <= 30;
  if (filter === 'last_90_days') return diffDays >= 0 && diffDays <= 90;
  return true;
}

function getRelevantTimestamp(auction) {
  if (!auction) return null;
  if (auction.status === 'LIVE') return auction.endsAt || auction.startsAt;
  return auction.closedAt || auction.endsAt || auction.createdAt;
}

export default function MyHoldingsView() {
  const { preference: themePreference, setPreference: setThemePreference } =
    useThemePreference();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Server-authoritative state
  const [authenticatedBidderId, setAuthenticatedBidderId] = useState(null);
  const [wonAuctions, setWonAuctions] = useState([]);
  const [leadingAuctions, setLeadingAuctions] = useState([]);
  const [completedAuctions, setCompletedAuctions] = useState([]);
  const [backendGap, setBackendGap] = useState(null);

  // UI filters & view state
  const [activeTab, setActiveTab] = useState('won'); // 'won' | 'leading' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedAuction, setSelectedAuction] = useState(null);

  const loadHoldings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const holdingsRes = await fetchBidderHoldings();

      if (holdingsRes.available && holdingsRes.data) {
        const payload = holdingsRes.data;
        const bidderId =
          payload.bidderId || payload.bidder?.id || payload.user?.id || null;
        setAuthenticatedBidderId(bidderId);
        setBackendGap(null);

        // Enforce server-authoritative lifecycle boundaries even if backend returns mixed arrays:
        // Never treat a LIVE leading bid as a WON auction.
        const rawWon = Array.isArray(payload.wonAuctions)
          ? payload.wonAuctions
          : Array.isArray(payload.holdings)
          ? payload.holdings
          : [];
        const rawLeading = Array.isArray(payload.leadingAuctions)
          ? payload.leadingAuctions
          : [];
        const rawCompleted = Array.isArray(payload.completedAuctions)
          ? payload.completedAuctions
          : [];

        const verifiedWon = rawWon.filter(
          (a) =>
            a &&
            a.status === 'CLOSED' &&
            Boolean(a.winnerId) &&
            (!bidderId || a.winnerId === bidderId)
        );
        const verifiedLeading = rawLeading.filter(
          (a) =>
            a &&
            a.status === 'LIVE' &&
            Boolean(a.highestBidderId) &&
            (!bidderId || a.highestBidderId === bidderId)
        );
        const verifiedCompleted = rawCompleted.filter(
          (a) => a && a.status === 'CLOSED'
        );

        setWonAuctions(verifiedWon);
        setLeadingAuctions(verifiedLeading);
        setCompletedAuctions(verifiedCompleted);
        return;
      }

      // Bidder holdings endpoint is missing (404) or unauthenticated (401/403).
      // Verify server connectivity via GET /api/auctions so we can show real
      // server-authoritative CLOSED auctions in Completed, while keeping
      // authenticated bidder Won/Leading lists strictly empty (never fabricated).
      setAuthenticatedBidderId(null);
      setWonAuctions([]);
      setLeadingAuctions([]);
      setBackendGap({
        reason: holdingsRes.reason,
        message: holdingsRes.message,
      });

      const auctionsRes = await fetchAuctions();
      const allAuctions = Array.isArray(auctionsRes?.auctions)
        ? auctionsRes.auctions
        : [];
      setCompletedAuctions(allAuctions.filter((a) => a.status === 'CLOSED'));
    } catch (err) {
      setError(err?.message || 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHoldings();
  }, [loadHoldings]);

  // Summary metrics calculated STRICTLY from actual authenticated bidder won auctions
  const summaryMetrics = useMemo(() => {
    const totalWon = wonAuctions.length;
    const totalValuePaise = wonAuctions.reduce((sum, a) => {
      const amount = a.finalPrice ?? a.currentPrice ?? 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);

    const now = new Date();
    const wonThisMonth = wonAuctions.filter((a) => {
      const ts = a.closedAt || a.endsAt;
      if (!ts) return false;
      const d = new Date(ts);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    }).length;

    const averageWinningBidPaise =
      totalWon > 0 ? Math.round(totalValuePaise / totalWon) : 0;

    return {
      totalWon,
      totalValuePaise,
      wonThisMonth,
      averageWinningBidPaise,
    };
  }, [wonAuctions]);

  const tabCounts = useMemo(
    () => ({
      won: wonAuctions.length,
      leading: leadingAuctions.length,
      completed: completedAuctions.length,
    }),
    [wonAuctions.length, leadingAuctions.length, completedAuctions.length]
  );

  const activeList = useMemo(() => {
    if (activeTab === 'leading') return leadingAuctions;
    if (activeTab === 'completed') return completedAuctions;
    return wonAuctions;
  }, [activeTab, wonAuctions, leadingAuctions, completedAuctions]);

  const filteredHoldings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = activeList.filter((auction) => {
      const ts = getRelevantTimestamp(auction);
      if (!matchesDateFilter(ts, dateFilter)) return false;

      if (q) {
        const haystack = [
          auction.title,
          auction.description,
          auction.id,
          auction.lotNumber ? `lot #${auction.lotNumber}` : '',
          auction.id ? `id #${auction.id.slice(0, 8)}` : '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const timeA = new Date(getRelevantTimestamp(a) || 0).getTime();
      const timeB = new Date(getRelevantTimestamp(b) || 0).getTime();
      return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [activeList, searchQuery, dateFilter, sortBy]);

  const hasActiveFilters = searchQuery.trim().length > 0 || dateFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setSortBy('newest');
  };

  return (
    <HoldingsShell
      themePreference={themePreference}
      onThemeChange={setThemePreference}
      authenticatedBidderId={authenticatedBidderId}
    >
      <div className="space-y-6">
        {/* Page Heading */}
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            My Holdings
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Auctions you won and the items you have acquired.
          </p>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <HoldingsLoadingSkeleton viewMode={viewMode} />
        ) : error ? (
          <HoldingsErrorState message={error} onRetry={loadHoldings} />
        ) : (
          <>
            {/* Honest Backend Gap Notice if GET /api/me/holdings is missing or unauthenticated */}
            {backendGap && (
              <BackendGapBanner
                reason={backendGap.reason}
                message={backendGap.message}
              />
            )}

            {/* 1. Summary Metrics */}
            <HoldingsSummaryMetrics
              totalWon={summaryMetrics.totalWon}
              totalValuePaise={summaryMetrics.totalValuePaise}
              wonThisMonth={summaryMetrics.wonThisMonth}
              averageWinningBidPaise={summaryMetrics.averageWinningBidPaise}
            />

            {/* 2 & 5. Holdings Tabs + Search, Date Filter, Sort & Grid/List Toggle */}
            <HoldingsControls
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={resetFilters}
            />

            {/* 3. Holding Cards / Empty State */}
            {activeList.length === 0 ? (
              <HoldingsEmptyState variant={activeTab} />
            ) : filteredHoldings.length === 0 ? (
              <HoldingsEmptyState
                variant="filtered"
                onClearFilters={resetFilters}
              />
            ) : viewMode === 'list' ? (
              <div className="space-y-3.5">
                {filteredHoldings.map((auction) => (
                  <HoldingCard
                    key={auction.id}
                    auction={auction}
                    authenticatedBidderId={authenticatedBidderId}
                    viewMode="list"
                    onViewDetails={setSelectedAuction}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredHoldings.map((auction) => (
                  <HoldingCard
                    key={auction.id}
                    auction={auction}
                    authenticatedBidderId={authenticatedBidderId}
                    viewMode="grid"
                    onViewDetails={setSelectedAuction}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Holding Details Drawer */}
      <HoldingDetailsDrawer
        auction={selectedAuction}
        authenticatedBidderId={authenticatedBidderId}
        onClose={() => setSelectedAuction(null)}
      />
    </HoldingsShell>
  );
}
