'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PortalShell from '../portal/PortalShell';
import {
  PortalEmptyState,
  PortalErrorState,
  PortalLoadingSkeleton,
} from '../portal/PortalStates';
import {
  fetchAuction,
  fetchAuctionBids,
  fetchAuctions,
} from '../../services/api';
import { useAuctionSocket } from '../../hooks/useAuctionSocket';
import { useThemePreference } from '../../hooks/useThemePreference';
import {
  formatCountdown,
  formatINR,
  formatTimeShort,
  getAuctionLotLabel,
  getAuctionStatusMeta,
} from '../../utils/formatters';

export default function HostLiveMonitorView({ initialAuctionId = null }) {
  const { preference, setPreference } = useThemePreference();

  const [auctions, setAuctions] = useState([]);
  const [selectedId, setSelectedId] = useState(initialAuctionId || '');
  const [auction, setAuction] = useState(null);
  const [bidStream, setBidStream] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const versionRef = useRef(0);

  const syncClock = useCallback((iso) => {
    if (!iso) return;
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms)) setServerOffsetMs(ms - Date.now());
  }, []);

  const loadAuctionList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuctions();
      const list = Array.isArray(res?.auctions) ? res.auctions : [];
      setAuctions(list);
      setSelectedId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        const preferred = list.find((a) => a.status === 'LIVE') || list[0];
        return preferred ? preferred.id : '';
      });
    } catch (err) {
      setError(err?.message || 'Unable to load auctions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSelectedAuction = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const [aRes, bRes] = await Promise.all([
          fetchAuction(id),
          fetchAuctionBids(id, 100),
        ]);
        if (aRes?.auction) {
          setAuction(aRes.auction);
          versionRef.current = Number(aRes.auction.version ?? 0);
          syncClock(aRes.auction.serverTime);
        }
        const bids = Array.isArray(bRes?.bids) ? bRes.bids : [];
        setBidStream(
          bids.map((b) => ({
            id: b.id,
            bidderId: b.bidderId,
            amount: b.amount,
            status: 'ACCEPTED',
            timestamp: b.createdAt,
            note: null,
          }))
        );
      } catch (err) {
        setError(err?.message || 'Unable to load selected auction.');
      }
    },
    [syncClock]
  );

  useEffect(() => {
    loadAuctionList();
  }, [loadAuctionList]);

  useEffect(() => {
    if (selectedId) {
      loadSelectedAuction(selectedId);
    }
  }, [selectedId, loadSelectedAuction]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffsetMs]);

  const handleAuctionUpdate = useCallback(
    (payload) => {
      const incoming = payload?.auction;
      if (!incoming || incoming.id !== selectedId) return;
      const incomingVer = Number(payload.version ?? incoming.version ?? 0);
      if (incomingVer <= versionRef.current) return;

      versionRef.current = incomingVer;
      syncClock(payload.serverTime);
      setAuction((prev) => ({
        ...prev,
        ...incoming,
        bidCount:
          typeof incoming.bidCount === 'number'
            ? incoming.bidCount
            : (prev?.bidCount ?? 0) + (payload.bid ? 1 : 0),
        version: incomingVer,
      }));

      if (payload.bid) {
        setBidStream((prev) => {
          if (prev.some((item) => item.id === payload.bid.id)) return prev;
          return [
            {
              id: payload.bid.id,
              bidderId: payload.bid.bidderId,
              amount: payload.bid.amount,
              status: 'ACCEPTED',
              timestamp: payload.bid.createdAt || payload.serverTime,
              note: payload.extended ? `Anti-sniping +${payload.extensionSeconds || 30}s` : null,
            },
            ...prev,
          ].slice(0, 100);
        });
      }
    },
    [selectedId, syncClock]
  );

  const handleAuctionClosed = useCallback(
    (payload) => {
      const closedId = payload?.auction?.id || payload?.auctionId;
      if (closedId !== selectedId) return;
      const incomingVer = Number(payload.version ?? payload.auction?.version ?? 0);
      if (incomingVer <= versionRef.current) return;

      versionRef.current = incomingVer;
      syncClock(payload.serverTime);
      setAuction((prev) => ({
        ...prev,
        ...(payload.auction || {}),
        status: 'CLOSED',
        winnerId: payload.winnerId ?? payload.auction?.winnerId ?? prev?.winnerId,
        currentPrice: payload.finalPrice ?? prev?.currentPrice,
        closedAt: payload.closedAt ?? prev?.closedAt,
        version: incomingVer,
      }));
    },
    [selectedId, syncClock]
  );

  const handleBidRejected = useCallback(
    (payload) => {
      if (payload?.auctionId !== selectedId) return;
      setBidStream((prev) => [
        {
          id: `rej-${payload.requestId || Date.now()}`,
          bidderId: payload.bidderId || 'Unknown bidder',
          amount: null,
          status: 'REJECTED',
          timestamp: payload.timestamp || new Date().toISOString(),
          note: payload.message || payload.code || 'Bid rejected by server',
        },
        ...prev,
      ].slice(0, 100));
    },
    [selectedId]
  );

  const { connectionStatus } = useAuctionSocket({
    auctionId: selectedId || null,
    onAuctionUpdate: handleAuctionUpdate,
    onAuctionClosed: handleAuctionClosed,
    onBidRejected: handleBidRejected,
    onReconnectSync: () => loadSelectedAuction(selectedId),
  });

  const activeBidderCount = useMemo(() => {
    const accepted = bidStream.filter((b) => b.status === 'ACCEPTED');
    return new Set(accepted.map((b) => b.bidderId).filter(Boolean)).size;
  }, [bidStream]);

  const remainingMs = auction?.endsAt
    ? new Date(auction.endsAt).getTime() - nowMs
    : 0;

  const statusMeta = getAuctionStatusMeta(auction?.status);

  const connBadge = {
    connected: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-auctionme-emeraldDark',
    reconnecting: 'border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300',
    connecting: 'border-sky-500/35 bg-sky-500/15 text-sky-700 dark:text-sky-300',
    disconnected: 'border-rose-500/35 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  }[connectionStatus] || 'border-slate-300 bg-slate-100 text-slate-600';

  return (
    <PortalShell
      role="host"
      activeNav="monitor"
      themePreference={preference}
      onThemeChange={setPreference}
      headerRight={
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${connBadge}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span className="hidden sm:inline">
            {connectionStatus === 'connected' ? 'Socket Live' : connectionStatus}
          </span>
        </span>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Live Auction Monitor
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Read-only real-time monitoring via Socket.IO. Accepted bids and winners are strictly server-controlled.
            </p>
          </div>

          {auctions.length > 0 && (
            <select
              aria-label="Select auction to monitor"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs font-semibold text-slate-800 sm:w-72 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white"
            >
              {auctions.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.status}] {getAuctionLotLabel(a)} — {a.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <PortalLoadingSkeleton />
        ) : error ? (
          <PortalErrorState
            title="Unable to connect to live monitor."
            message={error}
            onRetry={loadAuctionList}
          />
        ) : !auction ? (
          <PortalEmptyState
            title="No auctions available to monitor"
            description="Once auctions exist on the server, select one here for real-time monitoring."
          />
        ) : (
          <>
            {/* Top Status & KPI Panel */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm lg:col-span-7 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {getAuctionLotLabel(auction)}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusMeta.badgeClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                    {statusMeta.label}
                  </span>
                </div>

                <h2 className="mt-2 font-serif text-xl font-semibold text-slate-900 dark:text-white">
                  {auction.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {auction.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-4 sm:grid-cols-4 dark:border-auctionme-darkBorder/80">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-slate-400">
                      Current Highest
                    </span>
                    <span className="mt-0.5 block font-mono text-base font-bold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                      {formatINR(auction.currentPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-slate-400">
                      Min Next Bid
                    </span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {formatINR(auction.minNextBid)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-slate-400">
                      Total Bids
                    </span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {auction.bidCount ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-slate-400">
                      Active Bidders
                    </span>
                    <span className="mt-0.5 block font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {activeBidderCount}
                    </span>
                  </div>
                </div>
              </section>

              {/* Countdown & Server Sync Card */}
              <section className="flex flex-col justify-between rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm lg:col-span-5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {auction.status === 'LIVE' ? 'Time Remaining (Server-Synced)' : 'Auction Status'}
                  </span>
                  <div className="mt-2 font-mono text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {auction.status === 'LIVE'
                      ? remainingMs <= 0
                        ? 'Closing...'
                        : formatCountdown(remainingMs)
                      : auction.status}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Auto-Extend: <span className="font-semibold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">ON (+30s anti-sniping)</span>
                  </p>
                  {auction.highestBidderId && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Leading Bidder: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{auction.highestBidderId}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadSelectedAuction(selectedId)}
                    className="rounded-xl border border-auctionme-lightBorder bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
                  >
                    Sync Now
                  </button>
                  {auction.status === 'CLOSED' && (
                    <Link
                      href={`/auctions/${encodeURIComponent(auction.id)}/result`}
                      className="rounded-xl bg-auctionme-emeraldLight px-3.5 py-2 text-xs font-bold text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]"
                    >
                      View Official Result
                    </Link>
                  )}
                </div>
              </section>
            </div>

            {/* Live Bid Stream (Read-only) */}
            <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-semibold text-slate-900 dark:text-white">
                  Live Bid Stream (Read-Only)
                </h3>
                <span className="text-[11px] font-medium text-slate-400">
                  v{auction.version ?? 1} · {bidStream.length} events
                </span>
              </div>

              {bidStream.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No bids recorded for this auction yet. Accepted bids stream here in real time.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-200/80 dark:divide-auctionme-darkBorder/80">
                  {bidStream.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            entry.status === 'ACCEPTED'
                              ? 'bg-emerald-500/15 text-auctionme-emeraldLight dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {entry.bidderId}
                        </span>
                        {entry.note && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            · {entry.note}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {entry.amount !== null && (
                          <span className="font-mono font-bold tabular-nums text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                            {formatINR(entry.amount)}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-slate-400">
                          {formatTimeShort(entry.timestamp)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}
