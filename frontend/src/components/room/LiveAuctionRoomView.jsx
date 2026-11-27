'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import LiveRoomShell from './LiveRoomShell';
import RoomProductGallery from './RoomProductGallery';
import RoomBiddingPanel from './RoomBiddingPanel';
import RoomActivityPanel from './RoomActivityPanel';
import AuctionResult from '../AuctionResult';
import NotificationToast from '../NotificationToast';
import { useAuctionSocket } from '../../hooks/useAuctionSocket';
import { useThemePreference } from '../../hooks/useThemePreference';
import {
  fetchAuction,
  fetchAuctionBids,
  fetchAuctionResult,
  fetchAuctions,
  submitBid,
} from '../../services/api';
import {
  formatINR,
  generateRequestId,
  maskBidderId,
} from '../../utils/formatters';

const WATCHLIST_STORAGE_KEY = 'auctionme-watchlist';

export default function LiveAuctionRoomView({ initialAuctionId = null }) {
  const { preference: themePreference, setPreference: setThemePreference } =
    useThemePreference();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [rejectedEvents, setRejectedEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [bidderId, setBidderId] = useState('demo-user-101');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [pendingRetryBid, setPendingRetryBid] = useState(null);

  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [lastExtensionAt, setLastExtensionAt] = useState(null);
  const [watchlistIds, setWatchlistIds] = useState([]);

  const versionRef = useRef(0);
  const auctionIdRef = useRef(initialAuctionId);

  // Load persisted watchlist
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setWatchlistIds(parsed);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleWatchlist = useCallback((id) => {
    setWatchlistIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const pushToast = useCallback((type, title, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
    setNotifications((prev) =>
      [{ id, title, message, timestamp: new Date().toISOString() }, ...prev].slice(
        0,
        20
      )
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const syncClockOffset = useCallback((serverTimeIso) => {
    if (!serverTimeIso) return;
    const serverMs = new Date(serverTimeIso).getTime();
    if (!Number.isNaN(serverMs)) {
      setServerOffsetMs(serverMs - Date.now());
    }
  }, []);

  const recordRejectedEvent = useCallback((entry) => {
    setRejectedEvents((prev) => {
      if (entry.requestId && prev.some((e) => e.requestId === entry.requestId)) {
        return prev;
      }
      return [entry, ...prev].slice(0, 30);
    });
  }, []);

  const loadAuctionState = useCallback(
    async (targetId = null) => {
      try {
        let idToLoad = targetId || auctionIdRef.current;

        if (!idToLoad) {
          const listData = await fetchAuctions();
          const first = listData.auctions?.[0];
          if (!first) {
            setError(
              'No auctions found in PostgreSQL. Run `npm run db:seed` inside backend/.'
            );
            setLoading(false);
            return;
          }
          idToLoad = first.id;
        }

        const [auctionData, bidsData] = await Promise.all([
          fetchAuction(idToLoad),
          fetchAuctionBids(idToLoad, 50),
        ]);

        const loadedAuction = auctionData.auction;
        const isSwitchingAuction =
          auctionIdRef.current && auctionIdRef.current !== loadedAuction.id;

        if (isSwitchingAuction || loadedAuction.version >= versionRef.current) {
          auctionIdRef.current = loadedAuction.id;
          versionRef.current = loadedAuction.version;
          setAuction(loadedAuction);
          setBids(bidsData.bids || []);
          syncClockOffset(loadedAuction.serverTime);
        }

        setError(null);

        if (loadedAuction.status === 'CLOSED') {
          const resData = await fetchAuctionResult(loadedAuction.id);
          setResult(resData.result);
        } else {
          setResult(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to load auction data from backend.');
      } finally {
        setLoading(false);
      }
    },
    [syncClockOffset]
  );

  useEffect(() => {
    let requestedId = initialAuctionId;
    if (!requestedId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      requestedId = params.get('auctionId') || null;
    }
    loadAuctionState(requestedId);
  }, [initialAuctionId, loadAuctionState]);

  const handleAuctionUpdate = useCallback(
    (payload) => {
      if (!payload?.auction) return;
      if (payload.version <= versionRef.current) return;

      versionRef.current = payload.version;
      syncClockOffset(payload.serverTime);

      setAuction((prev) => {
        const nextBidCount =
          typeof payload.auction.bidCount === 'number'
            ? payload.auction.bidCount
            : prev
            ? (prev.bidCount ?? 0) + (payload.bid ? 1 : 0)
            : 1;
        return {
          ...prev,
          ...payload.auction,
          bidCount: nextBidCount,
        };
      });

      if (payload.bid) {
        setBids((prev) => {
          if (prev.some((b) => b.id === payload.bid.id)) return prev;
          return [payload.bid, ...prev].slice(0, 50);
        });
      }

      if (payload.extended) {
        setLastExtensionAt(Date.now());
        pushToast(
          'extension',
          'Auction Extended +30s',
          `Late bid by ${maskBidderId(
            payload.bid?.bidderId,
            bidderId
          )} triggered anti-sniping protection.`
        );
      } else if (payload.bid) {
        pushToast(
          'info',
          'New Highest Bid',
          `${maskBidderId(payload.bid.bidderId, bidderId)} bid ${formatINR(
            payload.bid.amount
          )}`
        );
      }
    },
    [bidderId, pushToast, syncClockOffset]
  );

  const handleAuctionClosed = useCallback(
    (payload) => {
      if (!payload?.auction) return;
      if (payload.version <= versionRef.current) return;

      versionRef.current = payload.version;
      setAuction((prev) => ({
        ...prev,
        ...payload.auction,
        status: 'CLOSED',
      }));
      syncClockOffset(payload.serverTime);
      setResult({
        auctionId: payload.auctionId,
        status: 'CLOSED',
        winnerId: payload.winnerId,
        finalPrice: payload.finalPrice,
        closedAt: payload.closedAt,
        hadBids: payload.hadBids,
        version: payload.version,
      });

      if (payload.winnerId) {
        pushToast(
          'success',
          'Auction Closed',
          `Winner: ${maskBidderId(payload.winnerId, bidderId)} at ${formatINR(
            payload.finalPrice
          )}`
        );
      } else {
        pushToast(
          'info',
          'Auction Closed',
          'Auction ended with no accepted bids.'
        );
      }
    },
    [bidderId, pushToast, syncClockOffset]
  );

  const handleBidRejected = useCallback(
    (payload) => {
      if (!payload?.message) return;
      setFeedback({ type: 'error', message: payload.message });
      recordRejectedEvent({
        id: payload.requestId || `rej-${Date.now()}`,
        requestId: payload.requestId || null,
        bidderId: payload.bidderId || bidderId,
        amount: payload.details?.amount ?? null,
        code: payload.code,
        message: payload.message,
        timestamp: payload.timestamp || new Date().toISOString(),
      });
    },
    [bidderId, recordRejectedEvent]
  );

  const handleReconnectSync = useCallback(() => {
    pushToast('info', 'Reconnected', 'Syncing latest auction state from server...');
    loadAuctionState(auctionIdRef.current);
  }, [loadAuctionState, pushToast]);

  const { connectionStatus, socketId } = useAuctionSocket({
    auctionId: auction?.id,
    onAuctionUpdate: handleAuctionUpdate,
    onAuctionClosed: handleAuctionClosed,
    onBidRejected: handleBidRejected,
    onReconnectSync: handleReconnectSync,
  });

  // Core idempotent bid executor: preserves exact same requestId on uncertain network failures
  const executeBidSubmission = useCallback(
    async ({ amountPaise, requestId }) => {
      if (!auction) return;
      setIsSubmitting(true);
      setFeedback(null);

      const trimmedBidder = bidderId.trim();

      try {
        const response = await submitBid(auction.id, {
          bidderId: trimmedBidder,
          amount: amountPaise,
          requestId,
          socketId,
        });

        // Definitive server acceptance — clear any pending uncertain retry
        setPendingRetryBid(null);

        if (response.auction && response.auction.version > versionRef.current) {
          versionRef.current = response.auction.version;
          setAuction((prev) => ({
            ...prev,
            ...response.auction,
            bidCount:
              typeof response.auction.bidCount === 'number'
                ? response.auction.bidCount
                : prev
                ? (prev.bidCount ?? 0) + (response.idempotentReplay ? 0 : 1)
                : 1,
          }));
          syncClockOffset(response.serverTime);

          if (response.bid) {
            setBids((prev) => {
              if (prev.some((b) => b.id === response.bid.id)) return prev;
              return [response.bid, ...prev].slice(0, 50);
            });
          }
        }

        if (response.idempotentReplay) {
          setFeedback({
            type: 'success',
            message: `Bid of ${formatINR(
              response.bid.amount
            )} was already confirmed by the server (idempotent replay #${requestId.slice(
              0,
              8
            )}).`,
          });
        } else if (response.extended) {
          setLastExtensionAt(Date.now());
          setFeedback({
            type: 'warning',
            message: `Bid of ${formatINR(
              response.bid.amount
            )} accepted! Anti-sniping extended the deadline by 30 seconds.`,
          });
        } else {
          setFeedback({
            type: 'success',
            message: `Bid of ${formatINR(
              response.bid.amount
            )} accepted! You are currently the highest bidder.`,
          });
        }
      } catch (err) {
        const isDefinitiveClientRejection =
          typeof err.status === 'number' && err.status >= 400 && err.status < 500;

        if (isDefinitiveClientRejection) {
          setPendingRetryBid(null);
          recordRejectedEvent({
            id: requestId,
            requestId,
            bidderId: trimmedBidder,
            amount: amountPaise,
            code: err.code || 'BID_REJECTED',
            message: err.message || 'Bid was rejected by the server.',
            timestamp: new Date().toISOString(),
          });
          setFeedback({
            type: 'error',
            message: err.message || 'Bid was rejected by the server.',
          });
          pushToast('error', 'Bid Rejected', err.message || 'Bid rejected.');

          if (
            err.code === 'BID_TOO_LOW' ||
            err.code === 'AUCTION_CLOSED' ||
            err.code === 'AUCTION_EXPIRED'
          ) {
            loadAuctionState(auction.id);
          }
        } else {
          // Uncertain network/5xx outcome — preserve the EXACT SAME requestId for safe idempotent retry
          setPendingRetryBid({
            auctionId: auction.id,
            bidderId: trimmedBidder,
            amountPaise,
            requestId,
          });
          setFeedback({
            type: 'error',
            message:
              'Network error while submitting bid. Use "Retry Same Bid" to retry safely with the same request ID.',
          });
          pushToast(
            'error',
            'Network Interrupted',
            'Your request ID was preserved for safe idempotent retry.'
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      auction,
      bidderId,
      loadAuctionState,
      pushToast,
      recordRejectedEvent,
      socketId,
      syncClockOffset,
    ]
  );

  const handleConfirmAndSubmitBid = useCallback(
    async (amountPaise) => {
      if (!auction) return;
      const trimmedBidder = bidderId.trim();

      // Reuse preserved requestId if retrying the exact same logical bid after a network failure
      const shouldReuseRequestId =
        pendingRetryBid &&
        pendingRetryBid.auctionId === auction.id &&
        pendingRetryBid.bidderId === trimmedBidder &&
        pendingRetryBid.amountPaise === amountPaise;

      const requestId = shouldReuseRequestId
        ? pendingRetryBid.requestId
        : generateRequestId();

      await executeBidSubmission({ amountPaise, requestId });
    },
    [auction, bidderId, executeBidSubmission, pendingRetryBid]
  );

  const handleRetryPendingBid = useCallback(async () => {
    if (!pendingRetryBid) return;
    await executeBidSubmission({
      amountPaise: pendingRetryBid.amountPaise,
      requestId: pendingRetryBid.requestId,
    });
  }, [executeBidSubmission, pendingRetryBid]);

  return (
    <LiveRoomShell
      auction={auction}
      bidderId={bidderId}
      onBidderIdChange={setBidderId}
      connectionStatus={connectionStatus}
      themePreference={themePreference}
      onThemeChange={setThemePreference}
      notifications={notifications}
      onClearNotifications={() => setNotifications([])}
    >
      {loading ? (
        <div
          className="grid grid-cols-1 gap-5 lg:grid-cols-12"
          aria-busy="true"
          aria-label="Loading live auction room"
        >
          <div className="space-y-5 lg:col-span-8">
            <div className="h-72 animate-pulse rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel" />
            <div className="h-64 animate-pulse rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel" />
          </div>
          <div className="lg:col-span-4">
            <div className="h-[460px] animate-pulse rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel" />
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mx-auto max-w-xl rounded-2xl border border-rose-300 bg-rose-50/80 p-8 text-center dark:border-rose-500/40 dark:bg-rose-950/20"
        >
          <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-white">
            Unable to Connect to Auction Room
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadAuctionState(auctionIdRef.current);
              }}
              className="rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12]"
            >
              Retry Connection
            </button>
            <Link
              href="/auctions"
              className="rounded-xl border border-auctionme-lightBorder bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
            >
              Back to Catalog
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Authoritative Closed Banner (only rendered when backend status === CLOSED) */}
          <AuctionResult
            auction={auction}
            result={result}
            currentBidderId={bidderId}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left / Center Column: Product Gallery + Bid Activity Stream */}
            <div className="space-y-5 lg:col-span-8">
              <RoomProductGallery
                auction={auction}
                isWatched={watchlistIds.includes(auction.id)}
                onToggleWatch={toggleWatchlist}
              />

              {/* Mobile / Tablet Prominent Bidding Panel placed right below product gallery */}
              <div className="lg:hidden">
                <RoomBiddingPanel
                  auction={auction}
                  bidderId={bidderId}
                  serverOffsetMs={serverOffsetMs}
                  lastExtensionAt={lastExtensionAt}
                  isSubmitting={isSubmitting}
                  feedback={feedback}
                  pendingRetryBid={pendingRetryBid}
                  onConfirmAndSubmitBid={handleConfirmAndSubmitBid}
                  onRetryPendingBid={handleRetryPendingBid}
                  onCancelPendingRetry={() => setPendingRetryBid(null)}
                />
              </div>

              <RoomActivityPanel
                auction={auction}
                bids={bids}
                rejectedEvents={rejectedEvents}
                currentBidderId={bidderId}
              />
            </div>

            {/* Right Column (Desktop sticky): Live Bidding Controls */}
            <div className="hidden lg:col-span-4 lg:block">
              <RoomBiddingPanel
                auction={auction}
                bidderId={bidderId}
                serverOffsetMs={serverOffsetMs}
                lastExtensionAt={lastExtensionAt}
                isSubmitting={isSubmitting}
                feedback={feedback}
                pendingRetryBid={pendingRetryBid}
                onConfirmAndSubmitBid={handleConfirmAndSubmitBid}
                onRetryPendingBid={handleRetryPendingBid}
                onCancelPendingRetry={() => setPendingRetryBid(null)}
              />
            </div>
          </div>
        </div>
      )}

      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </LiveRoomShell>
  );
}
