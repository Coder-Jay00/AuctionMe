'use client';

export default function AuthInputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  disabled = false,
  error = null,
  leadingIcon = null,
  trailingAction = null,
}) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        {leadingIcon && (
          <span
            className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 ${
              hasError
                ? 'text-rose-500 dark:text-rose-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {leadingIcon}
          </span>
        )}

        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full rounded-lg border py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            leadingIcon ? 'pl-10' : 'pl-3.5'
          } ${trailingAction ? 'pr-10' : 'pr-3.5'} ${
            hasError
              ? 'border-rose-500 bg-rose-50/70 text-slate-900 placeholder-rose-400/70 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/70 dark:bg-rose-950/25 dark:text-white dark:placeholder-slate-400'
              : 'border-auctionme-lightBorder bg-auctionme-lightInput text-slate-900 placeholder-slate-400 focus:border-auctionme-emeraldLight focus:ring-auctionme-emeraldLight/20 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark dark:focus:ring-auctionme-emeraldDark/20'
          }`}
        />

        {trailingAction && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
            {trailingAction}
          </div>
        )}
      </div>

      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
