'use client';

export default function NotificationToast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  const toneStyles = {
    success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
    extension: 'border-amber-400/50 bg-amber-950/90 text-amber-100',
    error: 'border-rose-500/40 bg-rose-950/90 text-rose-100',
    info: 'border-sky-500/40 bg-slate-900/95 text-slate-100',
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
            toneStyles[toast.type] || toneStyles.info
          }`}
        >
          <div className="space-y-0.5">
            {toast.title && (
              <div className="text-xs font-bold uppercase tracking-wider">
                {toast.title}
              </div>
            )}
            <div className="text-xs leading-relaxed opacity-90">
              {toast.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-xs opacity-60 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
