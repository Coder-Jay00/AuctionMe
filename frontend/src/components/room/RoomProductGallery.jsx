'use client';

import { useState } from 'react';
import {
  formatINR,
  getAuctionLotLabel,
  getAuctionStatusMeta,
} from '../../utils/formatters';

export default function RoomProductGallery({
  auction,
  isWatched,
  onToggleWatch,
}) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  if (!auction) return null;

  const rawImages = Array.isArray(auction.images) && auction.images.length > 0
    ? auction.images
    : auction.imageUrl || auction.image
    ? [auction.imageUrl || auction.image]
    : [];

  // If API provides images, show them; otherwise render 3 themed gallery showcase slides
  const slides =
    rawImages.length > 0
      ? rawImages.map((url, idx) => ({ type: 'image', url, key: `img-${idx}` }))
      : [
          { type: 'artwork', variant: 'primary', label: 'Primary Lot Showcase', key: 'art-0' },
          { type: 'artwork', variant: 'provenance', label: 'Verified Lot Specifications', key: 'art-1' },
          { type: 'artwork', variant: 'protection', label: 'Anti-Sniping Protected Lot', key: 'art-2' },
        ];

  const safeIndex = slideIndex % slides.length;
  const activeSlide = slides[safeIndex];
  const lotLabel = getAuctionLotLabel(auction);
  const statusMeta = getAuctionStatusMeta(auction.status);

  const prevSlide = () =>
    setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const nextSlide = () => setSlideIndex((prev) => (prev + 1) % slides.length);

  const description = auction.description || '';
  const isLongDescription = description.length > 150;

  return (
    <section className="overflow-hidden rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm sm:p-5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        {/* Product Image Gallery */}
        <div className="md:col-span-6">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-auctionme-lightBorder bg-slate-100 dark:border-auctionme-darkBorder dark:bg-[#0c1117]">
            {/* Top Overlay Badges */}
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white backdrop-blur-xs">
                {lotLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs ${statusMeta.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                {statusMeta.label}
              </span>
            </div>

            {activeSlide.type === 'image' && !imgErrors[activeSlide.key] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={activeSlide.url}
                alt={auction.title}
                onError={() =>
                  setImgErrors((prev) => ({ ...prev, [activeSlide.key]: true }))
                }
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50/50 to-slate-200/80 p-6 text-center dark:from-[#121a23] dark:via-[#0d1c1a] dark:to-[#0a0f14]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 50% 42%, rgba(92, 225, 160, 0.35), transparent 64%)',
                  }}
                  aria-hidden="true"
                />
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="relative h-16 w-16 text-auctionme-emeraldLight dark:text-auctionme-emeraldDark"
                  aria-hidden="true"
                >
                  {activeSlide.variant === 'provenance' ? (
                    <>
                      <path d="M32 8l18 7v14c0 12.5-7.6 22-18 27-10.4-5-18-14.5-18-27V15l18-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M24 32l5.5 5.5L41 26" />
                    </>
                  ) : activeSlide.variant === 'protection' ? (
                    <>
                      <circle cx="32" cy="34" r="20" />
                      <path strokeLinecap="round" d="M32 22v12l8 5M26 9h12M32 9v5" />
                    </>
                  ) : (
                    <>
                      <path d="M26 12l16 16-6.5 6.5-16-16L26 12z" strokeLinejoin="round" />
                      <path
                        d="M27.5 26.5L11.5 42.5a3.5 3.5 0 005 5l16-16"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path d="M29 52h24" strokeLinecap="round" strokeWidth="2.2" />
                    </>
                  )}
                </svg>
                <p className="relative mt-3 font-serif text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-300">
                  {activeSlide.label}
                </p>
                <p className="relative mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  {lotLabel} · Authoritative PostgreSQL Lot
                </p>
              </div>
            )}

            {/* Carousel Controls */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous image"
                  className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur-xs transition hover:bg-slate-950/80"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 5l-5 5 5 5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next image"
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur-xs transition hover:bg-slate-950/80"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5l5 5-5 5" />
                  </svg>
                </button>

                {/* Dots */}
                <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5">
                  {slides.map((s, idx) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSlideIndex(idx)}
                      aria-label={`View slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === safeIndex
                          ? 'w-5 bg-auctionme-emeraldDark'
                          : 'w-1.5 bg-white/60 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Product Details Column */}
        <div className="flex flex-col justify-between md:col-span-6">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                {auction.hostName || auction.host || 'Verified AuctionMe Lot'}
              </span>
              <button
                type="button"
                onClick={() => onToggleWatch(auction.id)}
                aria-label={isWatched ? 'Remove from watchlist' : 'Save to watchlist'}
                aria-pressed={isWatched}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                  isWatched
                    ? 'border-auctionme-emeraldLight/40 bg-emerald-50 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/40 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                    : 'border-auctionme-lightBorder bg-white text-slate-400 hover:text-slate-700 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={isWatched ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 4h12a1 1 0 011 1v16l-7-4-7 4V5a1 1 0 011-1z"
                  />
                </svg>
              </button>
            </div>

            <h1 className="mt-1 font-serif text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {auction.title}
            </h1>

            {/* Spec Chips from real backend fields */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-lg border border-auctionme-lightBorder bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-300">
                Start: {formatINR(auction.startingPrice)}
              </span>
              <span className="rounded-lg border border-auctionme-lightBorder bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-300">
                Step: +{formatINR(auction.minIncrement)}
              </span>
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/30 dark:bg-auctionme-emeraldDark/10 dark:text-auctionme-emeraldDark">
                Anti-Sniping +30s
              </span>
            </div>

            {/* Description */}
            <p className="mt-3.5 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
              {isLongDescription && !expanded
                ? `${description.slice(0, 150).trim()}...`
                : description}
            </p>
            {isLongDescription && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-auctionme-emeraldLight hover:underline dark:text-auctionme-emeraldDark"
              >
                <span>{expanded ? 'Show Less' : 'Show Full Description'}</span>
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-auctionme-lightBorder pt-3 font-mono text-[10px] text-slate-500 dark:border-auctionme-darkBorder dark:text-slate-400">
            <span className="truncate">ID: {auction.id}</span>
            <span>State v{auction.version}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
