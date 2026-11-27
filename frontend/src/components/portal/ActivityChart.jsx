'use client';

import { useMemo } from 'react';

/**
 * Renders a lightweight SVG area chart strictly from real timestamped records.
 * Never fabricates data points.
 */
export default function ActivityChart({
  title,
  auctions = [],
  range = '30d', // '7d' | '30d' | 'all'
  onRangeChange,
  accent = 'emerald', // 'emerald' | 'purple'
}) {
  const buckets = useMemo(() => {
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 14 : 10;

    if (range === 'all') {
      const counts = new Map();
      auctions.forEach((a) => {
        const d = new Date(a.createdAt || a.startsAt);
        if (Number.isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const sortedKeys = Array.from(counts.keys()).sort().slice(-days);
      return sortedKeys.map((key) => ({
        label: new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        count: counts.get(key) || 0,
      }));
    }

    const bucketList = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      bucketList.push({
        key,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count: 0,
      });
    }

    const indexMap = new Map(bucketList.map((b, idx) => [b.key, idx]));
    auctions.forEach((a) => {
      const d = new Date(a.createdAt || a.startsAt);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const idx = indexMap.get(key);
      if (idx !== undefined) {
        bucketList[idx].count += 1;
      }
    });

    return bucketList;
  }, [auctions, range]);

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const totalInRange = buckets.reduce((sum, b) => sum + b.count, 0);

  const strokeColor = accent === 'purple' ? '#a855f7' : '#5ce1a0';
  const fillId = accent === 'purple' ? 'adminChartGrad' : 'hostChartGrad';

  const width = 560;
  const height = 160;
  const padX = 20;
  const padY = 18;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const points = buckets.map((b, idx) => {
    const x =
      buckets.length <= 1
        ? padX + plotW / 2
        : padX + (idx / (buckets.length - 1)) * plotW;
    const y = padY + plotH - (b.count / maxCount) * plotH;
    return { x, y, ...b };
  });

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : '';

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padY + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padY + plotH).toFixed(1)} Z`
      : '';

  return (
    <section className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm sm:p-5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-base font-semibold text-slate-900 sm:text-lg dark:text-white">
            {title}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {totalInRange} auction{totalInRange === 1 ? '' : 's'} created in selected window (server records)
          </p>
        </div>

        <select
          aria-label="Chart date filter"
          value={range}
          onChange={(e) => onRangeChange(e.target.value)}
          className="rounded-xl border border-auctionme-lightBorder bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 14 Days</option>
          <option value="all">All Recorded Dates</option>
        </select>
      </div>

      {buckets.length === 0 ? (
        <div className="mt-6 flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No auction activity recorded for this range.
        </div>
      ) : (
        <div className="mt-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-40 w-full overflow-visible"
            role="img"
            aria-label={`${title} showing ${totalInRange} auctions`}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal guides */}
            {[0, 0.5, 1].map((frac) => {
              const y = padY + plotH * frac;
              return (
                <line
                  key={frac}
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="3 3"
                />
              );
            })}

            {areaPath && <path d={areaPath} fill={`url(#${fillId})`} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {points.map((p, idx) => (
              <g key={`${p.label}-${idx}`}>
                <circle cx={p.x} cy={p.y} r="3.5" fill={strokeColor} />
                <title>{`${p.label}: ${p.count} auction(s)`}</title>
              </g>
            ))}
          </svg>

          <div className="mt-2 flex items-center justify-between px-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
            <span>{buckets[0]?.label}</span>
            {buckets.length > 2 && (
              <span>{buckets[Math.floor(buckets.length / 2)]?.label}</span>
            )}
            <span>{buckets[buckets.length - 1]?.label}</span>
          </div>
        </div>
      )}
    </section>
  );
}
