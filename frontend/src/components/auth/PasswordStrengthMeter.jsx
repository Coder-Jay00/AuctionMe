'use client';

export default function PasswordStrengthMeter({ rules }) {
  if (!rules || rules.strength === 'empty') return null;

  const config = {
    weak: {
      label: 'Weak password',
      bars: 1,
      barColor: 'bg-rose-500',
      textColor: 'text-rose-600 dark:text-rose-400',
    },
    fair: {
      label: 'Fair password',
      bars: 2,
      barColor: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    good: {
      label: 'Good password',
      bars: 3,
      barColor: 'bg-emerald-400',
      textColor: 'text-emerald-600 dark:text-emerald-300',
    },
    strong: {
      label: 'Strong password',
      bars: 4,
      barColor: 'bg-auctionme-emeraldLight dark:bg-auctionme-emeraldDark',
      textColor: 'text-auctionme-emeraldLight dark:text-auctionme-emeraldDark',
    },
  };

  const active = config[rules.strength] || config.weak;

  return (
    <div className="pt-1" aria-live="polite">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1 flex-1 rounded-full transition-colors ${
              segment <= active.bars
                ? active.barColor
                : 'bg-slate-200 dark:bg-slate-800'
            }`}
          />
        ))}
      </div>
      <div className={`mt-1 text-right text-[11px] font-medium ${active.textColor}`}>
        {active.label}
      </div>
    </div>
  );
}
