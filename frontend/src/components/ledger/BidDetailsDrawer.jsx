'use client';

import Link from 'next/link';
import { formatINR } from '../../utils/formatters';

function formatISTDateTime(isoString) {
  if (!isoString) return 'Not available';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return 'Not available';
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

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const map = {
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
        map[s] || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {status || 'Unknown'}
    </span>
  );
}

export default function BidDetailsDrawer({ record, onClose }) {
  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bid-details-title"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0f161e]"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <h2
              id="bid-details-title"
              className="font-serif text-xl font-semibold text-slate-900 dark:text-white"
            >
              Bid Details
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bid details"
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Product Thumbnail */}
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-800">
            <img
              src={record.thumbnailUrl || '/images/hero-watch-dark.jpg'}
              alt={record.auctionTitle || 'Auction item'}
              className="h-44 w-full object-cover"
            />
          </div>

          <div className="mt-4">
            <div className="font-mono text-xs font-semibold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
              {record.lotNumber || `LOT #${String(record.auctionId || '').slice(0, 8).toUpperCase()}`}
            </div>
            <h3 className="mt-1 font-serif text-lg font-semibold text-slate-900 dark:text-white">
              {record.auctionTitle || 'Auction Item'}
            </h3>
          </div>

          {/* Key-Value Breakdown */}
          <dl className="mt-5 divide-y divide-slate-200/80 border-y border-slate-200/80 text-xs dark:divide-slate-800 dark:border-slate-800">
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 dark:text-slate-400">Your Bid</dt>
              <dd className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {formatINR(record.amount)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 dark:text-slate-400">Result</dt>
              <dd>
                <StatusBadge status={record.status} />
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 dark:text-slate-400">Bid Time (IST)</dt>
              <dd className="font-mono text-slate-800 dark:text-slate-200">
                {formatISTDateTime(record.createdAt)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 dark:text-slate-400">Min Increment</dt>
              <dd className="font-mono text-slate-800 dark:text-slate-200">
                {typeof record.minIncrement === 'number'
                  ? formatINR(record.minIncrement)
                  : 'Not available'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 dark:text-slate-400">Auction Status</dt>
              <dd className="font-semibold uppercase text-slate-800 dark:text-slate-200">
                {record.auctionStatus || 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 space-y-2.5">
          {record.auctionId && (
            <Link
              href={`/auctions/${record.auctionId}/result`}
              className="flex w-full items-center justify-center rounded-xl bg-auctionme-emeraldLight px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
            >
              View Auction Result
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
