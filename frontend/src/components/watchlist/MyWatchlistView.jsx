'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WatchlistShell from './WatchlistShell';
import WatchlistSummaryMetrics from './WatchlistSummaryMetrics';
import WatchlistControls from './WatchlistControls';
import WatchlistCard from './WatchlistCard';
import {
  WatchlistBackendGapBanner,
  WatchlistEmptyState,
  WatchlistErrorState,
  WatchlistFilteredEmptyState,
  WatchlistLoadingSkeleton,
} from './WatchlistStates';
import { fetchAuctions } from '../../services/api';
import { useCatalogSocket } from '../../hooks/useCatalogSocket';
import { useThemePreference } from '../../hooks/useThemePreference';
import { formatINR } from '../../utils/formatters';

const WATCHLIST_STORAGE_KEY = 'auctionme-watchlist';

function readLocalWatchlistIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeLocalWatchlistIds(ids) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota/privacy errors
  }
}

export default function MyWatchlistView() {
  const { preference: themePreference, setPreference: setThemePreference } =
    useThemePreference();

  const [auctions, setAuctions] = useState([]);
  const [watchlistIds, setWatchlistIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authoritative server clock offset for live countdowns
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Filter, sort & view state
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Notifications & Undo feedback toast
  const [notifications, setNotifications] = useState([]);
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const versionsRef = useRef(new Map());
  const seenBidIdsRef = useRef(new Set());

  const syncClockOffset = useCallback((serverTimeIso) => {
    if (!serverTimeIso) return;
    const serverMs = new Date(serverTimeIso).getTime();
    if (!Number.isNaN(serverMs)) {
      setServerOffsetMs(serverMs - Date.now());
    }
  }, []);

  const pushNotification = useCallback((title, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((prev) =>
      [{ id, title, message, timestamp: new Date().toISOString() }, ...prev].slice(
        0,
        20
      )
    );
  }, []);

  const loadWatchlistData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const localIds = readLocalWatchlistIds();
        setWatchlistIds(localIds);

        const data = await fetchAuctions();
        const list = Array.isArray(data?.auctions) ? data.auctions : [];

        const serverTime = list.find((a) => a?.serverTime)?.serverTime;
        if (serverTime) {
          syncClockOffset(serverTime);
        }

        setAuctions((prev) => {
          const prevMap = new Map(prev.map((a) => [a.id, a]));
          return list.map((incoming) => {
            const knownVersion = versionsRef.current.get(incoming.id) ?? 0;
            const existing = prevMap.get(incoming.id);
            if (existing && incoming.version < knownVersion) {
              return existing;
            }
            versionsRef.current.set(incoming.id, incoming.version ?? 0);
            return incoming;
          });
        });

        setError(null);
      } catch (err) {
        if (!silent) {
          setError(
            err?.message || 'Please check your connection and try again.'
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [syncClockOffset]
  );

  useEffect(() => {
    loadWatchlistData();
  }, [loadWatchlistData]);

  // 1-second server-synced timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffsetMs]);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Only watch real auctions that match tracked IDs
  const watchedAuctions = useMemo(() => {
    const watchSet = new Set(watchlistIds);
    return auctions.filter((a) => watchSet.has(a.id));
  }, [auctions, watchlistIds]);

  const activeWatchedIds = useMemo(
    () =>
      watchedAuctions
        .filter((a) => a.status === 'LIVE' || a.status === 'SCHEDULED')
        .map((a) => a.id),
    [watchedAuctions]
  );

  const handleAuctionUpdate = useCallback(
    (payload) => {
      const incoming = payload?.auction;
      if (!incoming?.id) return;

      const incomingVersion = Number(payload.version ?? incoming.version ?? 0);
      const currentVersion = versionsRef.current.get(incoming.id) ?? 0;
      if (incomingVersion <= currentVersion) return;

      versionsRef.current.set(incoming.id, incomingVersion);
      if (payload.serverTime) {
        syncClockOffset(payload.serverTime);
      }

      const bidId = payload.bid?.id;
      const isNewBid = bidId ? !seenBidIdsRef.current.has(bidId) : false;
      if (bidId) {
        seenBidIdsRef.current.add(bidId);
      }

      setAuctions((prev) =>
        prev.map((existing) => {
          if (existing.id !== incoming.id) return existing;
          const nextBidCount =
            typeof incoming.bidCount === 'number'
              ? incoming.bidCount
              : (existing.bidCount ?? 0) + (isNewBid ? 1 : 0);
          return {
            ...existing,
            ...incoming,
            bidCount: nextBidCount,
            version: incomingVersion,
          };
        })
      );

      if (payload.extended) {
        pushNotification(
          'Anti-Sniping Extension (+30s)',
          `${incoming.title} extended after a late bid of ${formatINR(
            payload.bid?.amount ?? incoming.currentPrice
          )}.`
        );
      } else if (payload.bid) {
        pushNotification(
          'New Bid on Watched Lot',
          `${incoming.title} is now at ${formatINR(payload.bid.amount)}.`
        );
      }
    },
    [pushNotification, syncClockOffset]
  );

  const handleAuctionClosed = useCallback(
    (payload) => {
      const auctionId = payload?.auction?.id || payload?.auctionId;
      if (!auctionId) return;

      const incomingVersion = Number(
        payload.version ?? payload.auction?.version ?? 0
      );
      const currentVersion = versionsRef.current.get(auctionId) ?? 0;
      if (incomingVersion <= currentVersion) return;

      versionsRef.current.set(auctionId, incomingVersion);
      if (payload.serverTime) {
        syncClockOffset(payload.serverTime);
      }

      setAuctions((prev) =>
        prev.map((a) => {
          if (a.id !== auctionId) return a;
          return {
            ...a,
            ...(payload.auction || {}),
            status: 'CLOSED',
            winnerId: payload.winnerId ?? payload.auction?.winnerId ?? a.winnerId,
            currentPrice:
              payload.finalPrice ??
              payload.auction?.currentPrice ??
              a.currentPrice,
            closedAt: payload.closedAt ?? payload.auction?.closedAt ?? a.closedAt,
            version: incomingVersion,
          };
        })
      );

      pushNotification(
        'Watched Auction Closed',
        payload.winnerId
          ? `Auction ended at ${formatINR(payload.finalPrice)}.`
          : 'Auction ended with no accepted bids.'
      );
    },
    [pushNotification, syncClockOffset]
  );

  const { connectionStatus } = useCatalogSocket({
    activeAuctionIds: activeWatchedIds,
    enabled: !loading && !error && activeWatchedIds.length > 0,
    onAuctionUpdate: handleAuctionUpdate,
    onAuctionClosed: handleAuctionClosed,
    onReconnectSync: () => loadWatchlistData({ silent: true }),
  });

  // Remove from local watchlist (never mutates the auction itself) with Undo toast
  const handleRemoveFromWatchlist = useCallback((auction) => {
    setWatchlistIds((prev) => {
      const next = prev.filter((id) => id !== auction.id);
      writeLocalWatchlistIds(next);
      return next;
    });

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({
      auctionId: auction.id,
      title: auction.title,
    });
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 6000);
  }, []);

  const handleUndoRemove = useCallback(() => {
    if (!undoToast?.auctionId) return;
    const restoredId = undoToast.auctionId;
    setWatchlistIds((prev) => {
      if (prev.includes(restoredId)) return prev;
      const next = [restoredId, ...prev];
      writeLocalWatchlistIds(next);
      return next;
    });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast(null);
  }, [undoToast]);

  // Dynamic categories strictly from real API records
  const availableCategories = useMemo(() => {
    const set = new Set();
    watchedAuctions.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set).sort();
  }, [watchedAuctions]);

  // Summary & tab counts
  const counts = useMemo(() => {
    const res = { ALL: watchedAuctions.length, LIVE: 0, SCHEDULED: 0, CLOSED: 0 };
    watchedAuctions.forEach((a) => {
      if (a.status === 'LIVE') res.LIVE += 1;
      else if (a.status === 'SCHEDULED') res.SCHEDULED += 1;
      else if (a.status === 'CLOSED') res.CLOSED += 1;
    });
    return res;
  }, [watchedAuctions]);

  // Filtered & sorted list
  const filteredAuctions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = watchedAuctions.filter((a) => {
      if (activeTab !== 'ALL' && a.status !== activeTab) return false;
      if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;

      if (q) {
        const haystack = [
          a.title,
          a.description,
          a.id,
          a.lotNumber ? `lot #${a.lotNumber}` : '',
          a.id ? `id #${a.id.slice(0, 8)}` : '',
          a.category || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.startsAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.startsAt || 0).getTime();
      return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [watchedAuctions, activeTab, categoryFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    activeTab !== 'ALL' ||
    searchQuery.trim().length > 0 ||
    categoryFilter !== 'ALL';

  const resetFilters = () => {
    setActiveTab('ALL');
    setSearchQuery('');
    setCategoryFilter('ALL');
    setSortBy('newest');
  };

  return (
    <WatchlistShell
      connectionStatus={connectionStatus}
      themePreference={themePreference}
      onThemeChange={setThemePreference}
      notifications={notifications}
      onClearNotifications={() => setNotifications([])}
    >
      <div className="space-y-6">
        {/* Page Heading */}
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.5s-7.5-4.6-9.5-9A5.4 5.4 0 0112 6.4a5.4 5.4 0 019.5 5.1c-2 4.4-9.5 9-9.5 9z"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              My Watchlist
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Your saved auctions. Keep track and bid at the right moment.
            </p>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <WatchlistLoadingSkeleton viewMode={viewMode} />
        ) : error ? (
          <WatchlistErrorState
            message={error}
            onRetry={() => loadWatchlistData({ silent: false })}
          />
        ) : (
          <>
            {/* Honest Backend Persistence Disclosure */}
            <WatchlistBackendGapBanner />

            {/* Summary Metrics */}
            <WatchlistSummaryMetrics
              savedCount={counts.ALL}
              liveCount={counts.LIVE}
              upcomingCount={counts.SCHEDULED}
              completedCount={counts.CLOSED}
            />

            {/* Tabs, Search, Category Filter, Sort & Desktop Grid/List Toggle */}
            <WatchlistControls
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={counts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              availableCategories={availableCategories}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={resetFilters}
            />

            {/* Cards / Empty / Filtered Empty */}
            {watchedAuctions.length === 0 ? (
              <WatchlistEmptyState />
            ) : filteredAuctions.length === 0 ? (
              <WatchlistFilteredEmptyState onClearFilters={resetFilters} />
            ) : viewMode === 'list' ? (
              <div className="space-y-3.5">
                {filteredAuctions.map((auction) => (
                  <WatchlistCard
                    key={auction.id}
                    auction={auction}
                    nowMs={nowMs}
                    layout="list"
                    onRemove={handleRemoveFromWatchlist}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
                {filteredAuctions.map((auction) => (
                  <WatchlistCard
                    key={auction.id}
                    auction={auction}
                    nowMs={nowMs}
                    layout="grid"
                    onRemove={handleRemoveFromWatchlist}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Undo Feedback Toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-auctionme-lightBorder bg-slate-900 px-4 py-3 text-xs text-white shadow-2xl md:bottom-6 dark:border-auctionme-darkBorder dark:bg-[#141d26]"
        >
          <p className="min-w-0 flex-1 truncate">
            Removed <span className="font-semibold">{undoToast.title}</span> from
            watchlist.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleUndoRemove}
              className="rounded-lg bg-auctionme-emeraldDark px-3 py-1.5 text-[11px] font-bold text-[#061b12] transition hover:bg-auctionme-emeraldDarkHover"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setUndoToast(null)}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </WatchlistShell>
  );
}
