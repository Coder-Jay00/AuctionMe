'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuctionMeLogo from '../auth/AuctionMeLogo';
import ThemeSegmentedControl from '../auth/ThemeSegmentedControl';
import ResultSidebar from '../result/ResultSidebar';
import LedgerSummaryCards from './LedgerSummaryCards';
import BidDetailsDrawer from './BidDetailsDrawer';
import LedgerMobileNav from './LedgerMobileNav';
import { useThemePreference } from '../../hooks/useThemePreference';
import { fetchMyBids } from '../../services/api';
import { formatINR } from '../../utils/formatters';
import {
  buildLedgerCsv,
  computeLedgerMetrics,
  filterLedgerRecords,
  paginateRecords,
} from '../../utils/ledgerUtils';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const TABS = [
  { id: 'all', label: 'All Bids', metricKey: 'total' },
  { id: 'accepted', label: 'Accepted', metricKey: 'accepted' },
  { id: 'rejected', label: 'Rejected', metricKey: 'rejected' },
  { id: 'outbid', label: 'Outbid', metricKey: 'outbid' },
  { id: 'won', label: 'Won', metricKey: 'won' },
];

function formatIST(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  const styles = {
    accepted:
      'bg-emerald-100 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
    rejected:
      'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    outbid:
      'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    won:
      'bg-amber-200/80 text-amber-900 dark:bg-amber-400/20 dark:text-amber-300',
  };
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
        styles[s] || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {status}
    </span>
  );
}

export default function LedgerScreen() {
  const { preference, setPreference } = useThemePreference();

  const [records, setRecords] = useState([]);
  const [authenticatedBidderId, setAuthenticatedBidderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadPersonalLedger = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMyBids(200);
      setAuthenticatedBidderId(data?.bidderId || null);
      setRecords(Array.isArray(data?.bids) ? data.bids : []);
    } catch (err) {
      setAuthenticatedBidderId(null);
      setRecords([]);
      if (err?.status === 401 || err?.status === 403) {
        setError({
          code: 'UNAUTHENTICATED',
          message: 'Sign in with your AuctionMe account to view your personal bid ledger.',
        });
      } else {
        setError({
          code: 'API_ERROR',
          message:
            err?.message ||
            'Unable to load your ledger. Please check your connection and try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPersonalLedger();
  }, [loadPersonalLedger]);

  const metrics = useMemo(() => computeLedgerMetrics(records), [records]);

  const filtered = useMemo(
    () =>
      filterLedgerRecords(records, {
        tab: activeTab,
        statusFilter,
        dateRange,
        search,
      }),
    [records, activeTab, statusFilter, dateRange, search]
  );

  const pagination = useMemo(
    () => paginateRecords(filtered, page, 10),
    [filtered, page]
  );

  const hasActiveFilters =
    activeTab !== 'all' ||
    statusFilter !== 'all' ||
    dateRange !== 'all' ||
    search.trim().length > 0;

  const resetFilters = () => {
    setActiveTab('all');
    setStatusFilter('all');
    setDateRange('all');
    setSearch('');
    setPage(1);
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const csv = buildLedgerCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auctionme-my-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen w-full bg-auctionme-lightBg pb-16 text-slate-900 transition-colors duration-200 sm:pb-0 dark:bg-auctionme-darkBg dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <ResultSidebar currentBidderId={authenticatedBidderId || 'Not signed in'} />

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
              <span>Back to Auctions</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeSegmentedControl
              value={preference}
              onChange={setPreference}
              compact
            />
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              title={
                filtered.length === 0
                  ? 'Export is available once personal bid records are loaded'
                  : 'Export visible ledger records to CSV'
              }
              className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex dark:border-slate-800 dark:bg-[#121922] dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-6">
          {/* Header */}
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              My Ledger
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Your complete bidding activity and auction history.
            </p>
          </div>

          {/* Summary Metrics */}
          <LedgerSummaryCards
            metrics={metrics}
            unavailable={Boolean(error)}
          />

          {/* Tabs + Filter Toolbar + Table/Cards Container */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#10171f]">
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Filter ledger by bid result"
              className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 px-4 py-3 dark:border-slate-800"
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = error ? null : metrics[tab.metricKey];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPage(1);
                    }}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                    }`}
                  >
                    {tab.label}
                    {count !== null && (
                      <span className="ml-1 opacity-80">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search & Filters */}
            <div className="grid grid-cols-1 gap-2.5 border-b border-slate-200 p-4 sm:grid-cols-12 dark:border-slate-800">
              <div className="relative sm:col-span-6">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by lot, item, or auction ID..."
                  aria-label="Search by lot, item, or auction ID"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3.5 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-auctionme-emeraldLight focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Date range filter"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-auctionme-emeraldLight focus:outline-none dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-200 dark:focus:border-auctionme-emeraldDark"
                >
                  <option value="all">All Time</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Bid status filter"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-auctionme-emeraldLight focus:outline-none dark:border-slate-800 dark:bg-[#151e28] dark:text-slate-200 dark:focus:border-auctionme-emeraldDark"
                >
                  <option value="all">All Status</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="outbid">Outbid</option>
                  <option value="won">Won</option>
                </select>
              </div>
            </div>

            {/* Body States: Loading | Error | Empty | No Matching Filters | Table/Cards */}
            {loading ? (
              <div className="space-y-3 p-5 animate-pulse" aria-busy="true">
                <div className="h-12 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-12 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
                <div className="h-12 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            ) : error ? (
              <div
                role="alert"
                className="m-5 rounded-xl border border-rose-300 bg-rose-50 p-6 text-center dark:border-rose-500/35 dark:bg-rose-950/30"
              >
                <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Unable to load your ledger.
                </h2>
                <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-rose-700 dark:text-rose-300/90">
                  {error.message}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  {error.code === 'UNAUTHENTICATED' ? (
                    <Link
                      href="/login"
                      className="rounded-lg bg-auctionme-emeraldLight px-4 py-2 text-xs font-semibold text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12]"
                    >
                      Sign In
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={loadPersonalLedger}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
                    >
                      Retry
                    </button>
                  )}
                  <Link
                    href="/"
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Discover Auctions
                  </Link>
                </div>
              </div>
            ) : records.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  No bidding activity yet.
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Participate in auctions and your personal bids will appear here.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
                >
                  Discover Auctions
                </Link>
              </div>
            ) : pagination.items.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  No matching bids found.
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Try clearing your search query or adjusting the date/status filters.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Auction / Item</th>
                        <th className="px-4 py-3">Your Bid</th>
                        <th className="px-4 py-3">Result</th>
                        <th className="px-4 py-3">Bid Time (IST)</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {pagination.items.map((rec, idx) => (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                            {pagination.showingFrom + idx}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={rec.thumbnailUrl || '/images/hero-watch-dark.jpg'}
                                alt={rec.auctionTitle || 'Auction item'}
                                className="h-9 w-12 shrink-0 rounded-md object-cover"
                              />
                              <div className="min-w-0">
                                <div className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  {rec.lotNumber || `LOT #${String(rec.auctionId || '').slice(0, 8).toUpperCase()}`}
                                </div>
                                <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                                  {rec.auctionTitle}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                            {formatINR(rec.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={rec.status} />
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                            {formatIST(rec.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(rec)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-auctionme-emeraldLight hover:text-auctionme-emeraldLight dark:border-slate-700 dark:text-slate-200 dark:hover:border-auctionme-emeraldDark dark:hover:text-auctionme-emeraldDark"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Cards */}
                <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
                  {pagination.items.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={rec.thumbnailUrl || '/images/hero-watch-dark.jpg'}
                          alt={rec.auctionTitle || 'Auction item'}
                          className="h-11 w-14 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {rec.lotNumber || `LOT #${String(rec.auctionId || '').slice(0, 8).toUpperCase()}`}
                          </div>
                          <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                            {rec.auctionTitle}
                          </div>
                          <div className="mt-1">
                            <StatusPill status={rec.status} />
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {formatINR(rec.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="mt-1.5 text-[11px] font-semibold text-auctionme-emeraldLight hover:underline dark:text-auctionme-emeraldDark"
                        >
                          Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span>
                    Showing {pagination.showingFrom}–{pagination.showingTo} of{' '}
                    {pagination.totalItems} bids
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={pagination.currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium disabled:opacity-40 dark:border-slate-700"
                    >
                      Prev
                    </button>
                    <span className="px-2 font-mono">
                      {pagination.currentPage} / {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={pagination.currentPage >= pagination.totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      className="rounded-lg border border-slate-200 px-2.5 py-1 font-medium disabled:opacity-40 dark:border-slate-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {/* Bid Details Drawer */}
      <BidDetailsDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />

      {/* Mobile Bottom Navigation */}
      <LedgerMobileNav />
    </div>
  );
}
