'use client';

export function ResultLoadingState() {
  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading auction result">
      <div className="h-56 rounded-2xl border border-slate-200 bg-slate-200/70 dark:border-slate-800 dark:bg-[#131b24]" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-64 rounded-2xl border border-slate-200 bg-slate-200/70 lg:col-span-8 dark:border-slate-800 dark:bg-[#131b24]" />
        <div className="h-44 rounded-2xl border border-slate-200 bg-slate-200/70 lg:col-span-4 dark:border-slate-800 dark:bg-[#131b24]" />
      </div>
    </div>
  );
}

export function ResultErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="mx-auto max-w-lg rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center dark:border-rose-500/35 dark:bg-rose-950/30"
    >
      <h2 className="font-serif text-xl font-semibold text-rose-900 dark:text-rose-200">
        Result Unavailable
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-rose-700 dark:text-rose-300/90">
        {message || 'Unable to load the authoritative auction result from the server.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
      >
        Retry
      </button>
    </div>
  );
}
