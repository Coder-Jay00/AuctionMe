'use client';

import { useEffect, useState } from 'react';
import PortalShell from '../portal/PortalShell';
import { BackendRequirementNotice } from '../portal/PortalStates';
import { useThemePreference } from '../../hooks/useThemePreference';
import { formatINR } from '../../utils/formatters';

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Media' },
  { id: 3, label: 'Settings' },
  { id: 4, label: 'Review' },
];

export default function HostCreateAuctionView() {
  const { preference, setPreference } = useThemePreference();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    startingPriceRupees: '',
    minIncrementRupees: '',
    startsAt: '',
    endsAt: '',
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [submitFeedback, setSubmitFeedback] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setSubmitFeedback(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setValidationErrors((prev) => ({
        ...prev,
        media: 'Please select a valid image file (PNG, JPG, WebP).',
      }));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedFileName(file.name);
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy.media;
      return copy;
    });
  };

  const validateStep = (targetStep) => {
    const errs = {};
    if (targetStep === 1 || targetStep === 4) {
      if (!form.title.trim()) errs.title = 'Item title is required.';
      if (!form.description.trim()) errs.description = 'Description is required.';
      const startNum = Number(form.startingPriceRupees);
      if (!form.startingPriceRupees || Number.isNaN(startNum) || startNum < 0) {
        errs.startingPriceRupees = 'Starting price must be 0 or greater.';
      }
      const incNum = Number(form.minIncrementRupees);
      if (!form.minIncrementRupees || Number.isNaN(incNum) || incNum <= 0) {
        errs.minIncrementRupees = 'Minimum increment must be greater than 0.';
      }
    }
    if (targetStep === 3 || targetStep === 4) {
      if (!form.startsAt) errs.startsAt = 'Start time is required.';
      if (!form.endsAt) errs.endsAt = 'End time is required.';
      if (form.startsAt && form.endsAt) {
        const s = new Date(form.startsAt).getTime();
        const e = new Date(form.endsAt).getTime();
        if (Number.isNaN(s) || Number.isNaN(e) || e <= s) {
          errs.endsAt = 'End time must be strictly after start time (DB constraint: ends_at > starts_at).';
        }
      }
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(4, s + 1));
    }
  };

  const handleAction = (mode) => {
    setSubmitFeedback(null);
    if (mode === 'publish' && !validateStep(4)) {
      return;
    }
    // Never silently simulate success — report the real backend gap honestly
    setSubmitFeedback({
      type: 'error',
      title:
        mode === 'draft'
          ? 'Save Draft requires backend support'
          : 'Publish Auction requires backend support',
      message:
        mode === 'draft'
          ? 'Draft auction persistence (DRAFT status and POST /api/auctions/drafts) is not implemented in the Express backend or PostgreSQL schema yet.'
          : 'POST /api/auctions and Host role authentication are not implemented in the Express backend yet. No auction was created.',
    });
  };

  const startingPaise = Math.round((Number(form.startingPriceRupees) || 0) * 100);
  const incrementPaise = Math.round((Number(form.minIncrementRupees) || 0) * 100);

  return (
    <PortalShell
      role="host"
      activeNav="create"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Create Auction
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            List a new item for server-authoritative live bidding.
          </p>
        </div>

        <BackendRequirementNotice
          title="Backend creation endpoint & schema fields required"
          description="PostgreSQL auctions table currently supports title, description, starting_price, min_increment, starts_at, and ends_at. POST /api/auctions, Host authentication, category column, draft status, and image upload storage are not yet implemented."
        />

        {/* Stepper */}
        <ol className="grid grid-cols-4 gap-2" aria-label="Creation steps">
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.id < step || validateStep(step)) setStep(s.id);
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                    isActive
                      ? 'border-auctionme-emeraldLight bg-auctionme-emeraldLight text-white dark:border-auctionme-emeraldDark dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                      : isDone
                      ? 'border-emerald-500/35 bg-emerald-500/12 text-auctionme-emeraldLight dark:border-auctionme-emeraldDark/35 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark'
                      : 'border-auctionme-lightBorder bg-auctionme-lightPanel text-slate-500 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-slate-400'
                  }`}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/15 text-[10px]">
                    {s.id}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Form Card */}
        <div className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm sm:p-6 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                1. Auction Details
              </h2>

              <div>
                <label htmlFor="create-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Item Title *
                </label>
                <input
                  id="create-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g., Vintage Mechanical Chronograph"
                  className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
                />
                {validationErrors.title && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{validationErrors.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="create-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Category <span className="font-normal text-slate-400">(Pending DB column)</span>
                </label>
                <input
                  id="create-category"
                  type="text"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  placeholder="e.g., Timepieces, Photography, Fine Art"
                  className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
                />
              </div>

              <div>
                <label htmlFor="create-desc" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Description *
                </label>
                <textarea
                  id="create-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe provenance, condition, and specifications..."
                  className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
                />
                {validationErrors.description && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{validationErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-start-price" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Starting Price (₹) *
                  </label>
                  <input
                    id="create-start-price"
                    type="number"
                    min="0"
                    step="1"
                    value={form.startingPriceRupees}
                    onChange={(e) => updateField('startingPriceRupees', e.target.value)}
                    placeholder="50000"
                    className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
                  />
                  {validationErrors.startingPriceRupees && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {validationErrors.startingPriceRupees}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="create-min-inc" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Minimum Increment (₹) *
                  </label>
                  <input
                    id="create-min-inc"
                    type="number"
                    min="1"
                    step="1"
                    value={form.minIncrementRupees}
                    onChange={(e) => updateField('minIncrementRupees', e.target.value)}
                    placeholder="2500"
                    className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
                  />
                  {validationErrors.minIncrementRupees && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                      {validationErrors.minIncrementRupees}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                2. Product Media
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select an image to preview locally. Server-side media upload storage is not yet configured in the backend.
              </p>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-auctionme-lightBorder bg-slate-50/70 px-6 py-10 text-center transition hover:border-auctionme-emeraldLight dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/50 dark:hover:border-auctionme-emeraldDark">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {selectedFileName || 'Click to choose a product image (PNG, JPG, WebP)'}
                </span>
                <span className="mt-1 text-[11px] text-slate-400">
                  Local client preview only
                </span>
              </label>

              {validationErrors.media && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{validationErrors.media}</p>
              )}

              {previewUrl && (
                <div className="overflow-hidden rounded-2xl border border-auctionme-lightBorder dark:border-auctionme-darkBorder">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Selected product preview"
                    className="max-h-64 w-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                3. Schedule & Server Rules
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-starts-at" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Start Time *
                  </label>
                  <input
                    id="create-starts-at"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => updateField('startsAt', e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
                  />
                  {validationErrors.startsAt && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{validationErrors.startsAt}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="create-ends-at" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    End Time *
                  </label>
                  <input
                    id="create-ends-at"
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => updateField('endsAt', e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-auctionme-lightBorder bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white dark:focus:border-auctionme-emeraldDark"
                  />
                  {validationErrors.endsAt && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{validationErrors.endsAt}</p>
                  )}
                </div>
              </div>

              {/* Read-only server-enforced rules (no invented toggles) */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Platform-Enforced Bidding Rules (Read-only)
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-400">
                  <li>Anti-sniping: server automatically extends end time by +30s on bids placed in the final 30s.</li>
                  <li>Atomic row-locked bidding with request-ID idempotency and automated server closing worker.</li>
                  <li>All monetary amounts are persisted as integer paise (BIGINT).</li>
                </ul>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
                4. Review & Publish
              </h2>

              <dl className="divide-y divide-slate-200/80 rounded-xl border border-auctionme-lightBorder bg-slate-50/70 px-4 text-xs dark:divide-auctionme-darkBorder dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput/60">
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500 dark:text-slate-400">Title</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{form.title || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500 dark:text-slate-400">Category</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{form.category || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500 dark:text-slate-400">Starting Price</dt>
                  <dd className="font-mono font-bold text-auctionme-emeraldLight dark:text-auctionme-emeraldDark">
                    {formatINR(startingPaise)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500 dark:text-slate-400">Minimum Increment</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                    +{formatINR(incrementPaise)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500 dark:text-slate-400">Schedule</dt>
                  <dd className="text-right text-slate-700 dark:text-slate-300">
                    {form.startsAt || '—'} → {form.endsAt || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500 dark:text-slate-400">Media</dt>
                  <dd className="text-slate-700 dark:text-slate-300">{selectedFileName || 'None selected'}</dd>
                </div>
              </dl>

              {submitFeedback && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300"
                >
                  <p className="font-bold">{submitFeedback.title}</p>
                  <p className="mt-0.5">{submitFeedback.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-auctionme-lightBorder pt-4 dark:border-auctionme-darkBorder">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-xl border border-auctionme-lightBorder bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAction('draft')}
                className="rounded-xl border border-auctionme-lightBorder bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Save as Draft
              </button>
            </div>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
              >
                Next: {STEPS[step]?.label} →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAction('publish')}
                className="rounded-xl bg-auctionme-emeraldLight px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover"
              >
                Publish Auction
              </button>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
