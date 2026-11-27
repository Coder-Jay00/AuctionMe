'use client';

export default function ConnectionStatus({ status }) {
  const styles = {
    connected: {
      dot: 'bg-emerald-400',
      ping: 'bg-emerald-400',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30 bg-emerald-500/10',
      label: 'Live Connected',
    },
    reconnecting: {
      dot: 'bg-amber-400',
      ping: 'bg-amber-400',
      text: 'text-amber-300',
      border: 'border-amber-500/30 bg-amber-500/10',
      label: 'Reconnecting...',
    },
    connecting: {
      dot: 'bg-sky-400',
      ping: 'bg-sky-400',
      text: 'text-sky-300',
      border: 'border-sky-500/30 bg-sky-500/10',
      label: 'Connecting...',
    },
    disconnected: {
      dot: 'bg-rose-500',
      ping: null,
      text: 'text-rose-300',
      border: 'border-rose-500/30 bg-rose-500/10',
      label: 'Disconnected',
    },
  };

  const current = styles[status] || styles.disconnected;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide ${current.border} ${current.text}`}
    >
      <span className="relative flex h-2 w-2">
        {current.ping && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${current.ping}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${current.dot}`}
        />
      </span>
      <span>{current.label}</span>
    </div>
  );
}
