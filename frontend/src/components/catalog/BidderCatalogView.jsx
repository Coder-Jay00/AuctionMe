'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CatalogShell from './CatalogShell';
import CatalogControls from './CatalogControls';
import AuctionCatalogCard from './AuctionCatalogCard';
import {
  CatalogErrorState,
  CatalogLoadingSkeleton,
  EmptyWatchlistState,
  NoAuctionsAvailableState,
  NoSearchResultsState,
} from './CatalogStates';
import { fetchAuction, fetchAuctions } from '../../services/api';
import { useCatalogSocket } from '../../hooks/useCatalogSocket';
import { useThemePreference } from '../../hooks/useThemePreference';
import { formatINR } from '../../utils/formatters';

const WATCHLIST_STORAGE_KEY = 'auctionme-watchlist';

function getAuctionHost(auction) {
  return auction?.hostName || auction?.host || auction?.hostId || null;
}

function getAuctionCategory(auction) {
  return auction?.category || null;
}

export default function BidderCatalogView() {
  const { preference: themePreference, setPreference: setThemePreference } =
    useThemePreference();

  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Navigation & filter state
  const [activeSection, setActiveSection] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [hostFilter, setHostFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('ending_soon');
  const [viewMode, setViewMode] = useState('grid');

  // Watchlist & notifications
  const [watchlistIds, setWatchlistIds] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Per-auction monotonic version tracker to prevent stale socket updates
  const versionsRef = useRef(new Map());
  const seenBidIdsRef = useRef(new Set());

  // Load persisted watchlist on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setWatchlistIds(parsed.filter((id) => typeof id === 'string'));
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const toggleWatchlist = useCallback((auctionId) => {
    setWatchlistIds((prev) => {
      const exists = prev.includes(auctionId);
      const next = exists
        ? prev.filter((id) => id !== auctionId)
        : [...prev, auctionId];
      try {
        window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

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

  const loadCatalog = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await fetchAuctions();
        const list = Array.isArray(data?.auctions) ? data.auctions : [];

        // Sync clock offset from the first auction's authoritative serverTime
        const serverTime = list.find((a) => a?.serverTime)?.serverTime;
        if (serverTime) {
          syncClockOffset(serverTime);
        }

        // Apply only newer or newly discovered auction versions to avoid regressing state
        setAuctions((prev) => {
          const prevMap = new Map(prev.map((a) => [a.id, a]));
          const nextList = list.map((incoming) => {
            const knownVersion = versionsRef.current.get(incoming.id) ?? 0;
            const existing = prevMap.get(incoming.id);
            if (existing && incoming.version < knownVersion) {
              return existing;
            }
            versionsRef.current.set(incoming.id, incoming.version ?? 0);
            return incoming;
          });
          return nextList;
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
    loadCatalog();
  }, [loadCatalog]);

  // 1-second tick for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffsetMs]);

  // Active auction IDs that need real-time Socket.IO room subscriptions
  const activeAuctionIds = useMemo(
    () =>
      auctions
        .filter((a) => a.status === 'LIVE' || a.status === 'SCHEDULED')
        .map((a) => a.id),
    [auctions]
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

      setAuctions((prev) => {
        const idx = prev.findIndex((a) => a.id === incoming.id);
        if (idx === -1) {
          // If an update arrives for an auction not in state, fetch authoritative record via GET /api/auctions/:id
          fetchAuction(incoming.id)
            .then((res) => {
              if (res?.auction) {
                versionsRef.current.set(res.auction.id, res.auction.version ?? 0);
                setAuctions((curr) =>
                  curr.some((a) => a.id === res.auction.id)
                    ? curr
                    : [res.auction, ...curr]
                );
              }
            })
            .catch(() => {});
          return prev;
        }

        const existing = prev[idx];
        const nextBidCount =
          typeof incoming.bidCount === 'number'
            ? incoming.bidCount
            : (existing.bidCount ?? 0) + (isNewBid ? 1 : 0);

        const merged = {
          ...existing,
          ...incoming,
          bidCount: nextBidCount,
          version: incomingVersion,
        };

        const copy = [...prev];
        copy[idx] = merged;
        return copy;
      });

      if (payload.extended) {
        pushNotification(
          'Anti-Sniping Extension (+30s)',
          `${incoming.title} extended after a late bid of ${formatINR(
            payload.bid?.amount ?? incoming.currentPrice
          )}.`
        );
      } else if (payload.bid) {
        pushNotification(
          'New Bid Placed',
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
        'Auction Closed',
        payload.winnerId
          ? `Auction ended at ${formatINR(payload.finalPrice)}.`
          : 'Auction ended with no accepted bids.'
      );
    },
    [pushNotification, syncClockOffset]
  );

  const handleReconnectSync = useCallback(() => {
    loadCatalog({ silent: true });
  }, [loadCatalog]);

  const { connectionStatus } = useCatalogSocket({
    activeAuctionIds,
    enabled: !loading && !error,
    onAuctionUpdate: handleAuctionUpdate,
    onAuctionClosed: handleAuctionClosed,
    onReconnectSync: handleReconnectSync,
  });

  // Base list depending on Discover vs Watchlist view
  const baseAuctions = useMemo(() => {
    if (activeSection === 'watchlist') {
      const watchSet = new Set(watchlistIds);
      return auctions.filter((a) => watchSet.has(a.id));
    }
    return auctions;
  }, [auctions, activeSection, watchlistIds]);

  // Dynamic filter options extracted strictly from real API records
  const availableCategories = useMemo(() => {
    const set = new Set();
    baseAuctions.forEach((a) => {
      const c = getAuctionCategory(a);
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [baseAuctions]);

  const availableHosts = useMemo(() => {
    const set = new Set();
    baseAuctions.forEach((a) => {
      const h = getAuctionHost(a);
      if (h) set.add(h);
    });
    return Array.from(set).sort();
  }, [baseAuctions]);

  // Tab counts (respecting active section: Discover vs Watchlist)
  const tabCounts = useMemo(() => {
    const counts = { ALL: baseAuctions.length, LIVE: 0, SCHEDULED: 0, CLOSED: 0 };
    baseAuctions.forEach((a) => {
      if (a.status === 'LIVE') counts.LIVE += 1;
      else if (a.status === 'SCHEDULED') counts.SCHEDULED += 1;
      else if (a.status === 'CLOSED') counts.CLOSED += 1;
    });
    return counts;
  }, [baseAuctions]);

  // Filtered and sorted auctions
  const filteredAuctions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = baseAuctions.filter((a) => {
      if (activeTab !== 'ALL' && a.status !== activeTab) return false;
      if (categoryFilter !== 'ALL' && getAuctionCategory(a) !== categoryFilter) {
        return false;
      }
      if (hostFilter !== 'ALL' && getAuctionHost(a) !== hostFilter) {
        return false;
      }
      if (q) {
        const haystack = [
          a.title,
          a.description,
          a.id,
          a.lotNumber ? String(a.lotNumber) : '',
          getAuctionHost(a) || '',
          getAuctionCategory(a) || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'recently_added') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'highest_bid') {
        const priceA = a.currentPrice ?? a.startingPrice ?? 0;
        const priceB = b.currentPrice ?? b.startingPrice ?? 0;
        return priceB - priceA;
      }
      // Default: ending_soon (LIVE by earliest endsAt, then SCHEDULED by earliest startsAt, then CLOSED by latest closedAt)
      const rank = { LIVE: 0, SCHEDULED: 1, CLOSED: 2 };
      const ra = rank[a.status] ?? 3;
      const rb = rank[b.status] ?? 3;
      if (ra !== rb) return ra - rb;
      if (a.status === 'LIVE') {
        return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
      }
      if (a.status === 'SCHEDULED') {
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
      }
      return (
        new Date(b.closedAt || b.endsAt).getTime() -
        new Date(a.closedAt || a.endsAt).getTime()
      );
    });

    return sorted;
  }, [baseAuctions, activeTab, categoryFilter, hostFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    activeTab !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    hostFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setActiveTab('ALL');
    setCategoryFilter('ALL');
    setHostFilter('ALL');
    setSortBy('ending_soon');
  };

  const renderNonCatalogSection = () => {
    const info = {
      ledger: {
        title: 'My Ledger',
        description:
          'Your bidder settlement history and bid receipts will appear here once account ledger APIs are connected.',
      },
      holdings: {
        title: 'My Holdings',
        description:
          'Won lots and acquired items will appear here once bidder portfolio APIs are connected.',
      },
      help: {
        title: 'Help & Support',
        description:
          'Need assistance with bidding, anti-sniping +30s extensions, or auction settlement? Contact AuctionMe Bidder Support.',
      },
    }[activeSection];

    return (
      <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-6 py-12 text-center shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
        <h1 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
          {info?.title}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {info?.description}
        </p>
        <button
          type="button"
          onClick={() => setActiveSection('discover')}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold tracking-wide text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
        >
          Back to Discover Auctions
        </button>
      </div>
    );
  };

  const renderCatalogBody = () => {
    if (loading) {
      return <CatalogLoadingSkeleton viewMode={viewMode} />;
    }

    if (error) {
      return (
        <CatalogErrorState
          message={error}
          onRetry={() => loadCatalog({ silent: false })}
        />
      );
    }

    if (activeSection === 'watchlist' && baseAuctions.length === 0) {
      return (
        <EmptyWatchlistState
          onBrowseAll={() => {
            setActiveSection('discover');
            resetFilters();
          }}
        />
      );
    }

    if (auctions.length === 0) {
      return (
        <NoAuctionsAvailableState
          onRefresh={() => loadCatalog({ silent: false })}
        />
      );
    }

    if (filteredAuctions.length === 0) {
      return (
        <NoSearchResultsState
          searchQuery={searchQuery.trim()}
          onReset={resetFilters}
        />
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="space-y-3.5">
          {filteredAuctions.map((auction) => (
            <AuctionCatalogCard
              key={auction.id}
              auction={auction}
              nowMs={nowMs}
              isWatched={watchlistIds.includes(auction.id)}
              onToggleWatch={toggleWatchlist}
              layout="list"
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        {filteredAuctions.map((auction) => (
          <AuctionCatalogCard
            key={auction.id}
            auction={auction}
            nowMs={nowMs}
            isWatched={watchlistIds.includes(auction.id)}
            onToggleWatch={toggleWatchlist}
            layout="grid"
          />
        ))}
      </div>
    );
  };

  const isCatalogView =
    activeSection === 'discover' || activeSection === 'watchlist';

  return (
    <CatalogShell
      activeSection={activeSection}
      onSelectSection={(sec) => {
        setActiveSection(sec);
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      connectionStatus={connectionStatus}
      themePreference={themePreference}
      onThemeChange={setThemePreference}
      watchlistCount={watchlistIds.length}
      notifications={notifications}
      onClearNotifications={() => setNotifications([])}
    >
      {isCatalogView ? (
        <div className="space-y-6">
          <CatalogControls
            heading={
              activeSection === 'watchlist'
                ? 'My Watchlist'
                : 'Discover Auctions'
            }
            subtitle={
              activeSection === 'watchlist'
                ? 'Tracked auctions with real-time price and closing updates.'
                : 'Find something worth bidding for.'
            }
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabCounts={tabCounts}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            availableCategories={availableCategories}
            hostFilter={hostFilter}
            onHostChange={setHostFilter}
            availableHosts={availableHosts}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filteredCount={filteredAuctions.length}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={resetFilters}
          />
          {renderCatalogBody()}
        </div>
      ) : (
        renderNonCatalogSection()
      )}
    </CatalogShell>
  );
}
