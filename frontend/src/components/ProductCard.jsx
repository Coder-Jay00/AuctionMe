'use client';

import { formatINR } from '../utils/formatters';

export default function ProductCard({ auction }) {
  if (!auction) return null;

  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      {/* Premium Collector Showcase Header */}
      <div className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-br from-slate-900 via-surface-850 to-slate-950 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <span>LOT #01</span>
              <span className="text-amber-500/60">•</span>
              <span>AUTHENTICATED HOROLOGY</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {auction.title}
            </h2>
          </div>

          {/* Minimalist SVG Watch Dial Emblem */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-slate-950/80 shadow-inner">
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 text-amber-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="32" cy="32" r="22" className="stroke-amber-400/80" />
              <circle cx="32" cy="32" r="18" className="stroke-slate-700" strokeDasharray="2 3" />
              <path d="M32 18v14l9 6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="32" cy="32" r="2.2" className="fill-amber-400" />
              <path d="M25 6h14M25 58h14" strokeLinecap="round" className="stroke-slate-500" />
            </svg>
          </div>
        </div>
      </div>

      {/* Item Description & Specs */}
      <div className="space-y-5 p-6 sm:p-8">
        <p className="text-sm leading-relaxed text-slate-300">
          {auction.description}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-surface-900/80 p-3.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Starting Price
            </div>
            <div className="mt-1 font-mono text-base font-semibold text-slate-100">
              {formatINR(auction.startingPrice)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-surface-900/80 p-3.5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Min Increment
            </div>
            <div className="mt-1 font-mono text-base font-semibold text-amber-300">
              +{formatINR(auction.minIncrement)}
            </div>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-800 bg-surface-900/80 p-3.5 sm:col-span-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Anti-Sniping Rule
            </div>
            <div className="mt-1 text-sm font-semibold text-emerald-300">
              +30s if ≤ 30s left
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4 text-xs text-slate-500">
          <span className="font-mono">Auction ID: {auction.id}</span>
          <span className="font-mono">State Version: v{auction.version}</span>
        </div>
      </div>
    </section>
  );
}
