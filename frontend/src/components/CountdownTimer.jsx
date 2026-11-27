'use client';

import { useEffect, useState } from 'react';
import { formatCountdown, formatTimeShort } from '../utils/formatters';

/**
 * Displays a countdown synchronized to the server's authoritative clock.
 * Never enforces bid validity locally — backend PostgreSQL clock_timestamp() is authoritative.
 */
export default function CountdownTimer({
  endsAt,
  status,
  serverOffsetMs,
  lastExtensionAt,
}) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!endsAt) return undefined;

    const computeRemaining = () => {
      const estimatedServerNow = Date.now() + serverOffsetMs;
      const target = new Date(endsAt).getTime();
      setRemainingMs(Math.max(0, target - estimatedServerNow));
    };

    computeRemaining();
    const interval = setInterval(computeRemaining, 250);
    return () => clearInterval(interval);
  }, [endsAt, serverOffsetMs]);

  const isClosed = status === 'CLOSED';
  const isFinalizing = !isClosed && remainingMs <= 0;
  const isSnipingWindow = !isClosed && remainingMs > 0 && remainingMs <= 30000;
  const recentlyExtended =
    lastExtensionAt && Date.now() - lastExtensionAt < 6000;

  return (
    <section
      className={`glass-panel rounded-2xl p-6 transition-all ${
        isSnipingWindow ? 'animate-sniping' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Time Remaining
        </span>
        {isSnipingWindow && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Anti-Sniping Active (+30s)
          </span>
        )}
        {recentlyExtended && !isClosed && (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
            Extended +30s
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-4">
        <div
          className={`font-mono text-4xl font-bold tracking-wider sm:text-5xl ${
            isClosed
              ? 'text-slate-500'
              : isSnipingWindow
              ? 'text-amber-400'
              : 'text-white'
          }`}
        >
          {isClosed ? '00:00' : formatCountdown(remainingMs)}
        </div>

        <div className="text-right text-xs text-slate-400">
          <div>{isClosed ? 'Ended at' : 'Closes at'}</div>
          <div className="mt-0.5 font-mono text-slate-200">
            {formatTimeShort(endsAt)}
          </div>
        </div>
      </div>

      {isFinalizing && (
        <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Deadline reached — waiting for server closing worker to finalize winner...
        </p>
      )}
    </section>
  );
}
