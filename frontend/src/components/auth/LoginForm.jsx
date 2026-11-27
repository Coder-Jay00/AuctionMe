'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthInputField from './AuthInputField';
import AuthStatusAlert from './AuthStatusAlert';
import { loginWithAuctionMeId } from '../../services/authApi';
import { resolvePostLoginDestination } from '../../utils/roleRouting';

export default function LoginForm() {
  const router = useRouter();

  const [auctionMeId, setAuctionMeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({
    auctionMeId: null,
    password: null,
  });
  const [formStatus, setFormStatus] = useState('idle'); // idle | loading | error | success
  const [alertMessage, setAlertMessage] = useState(null);
  const [infoNote, setInfoNote] = useState(null);

  const validate = () => {
    const nextErrors = { auctionMeId: null, password: null };
    if (!auctionMeId.trim()) {
      nextErrors.auctionMeId = 'Please enter your AuctionMe ID.';
    }
    if (!password) {
      nextErrors.password = 'Please enter your password.';
    }
    setFieldErrors(nextErrors);
    return !nextErrors.auctionMeId && !nextErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMessage(null);
    setInfoNote(null);

    if (!validate()) {
      setFormStatus('idle');
      return;
    }

    setFormStatus('loading');

    try {
      const data = await loginWithAuctionMeId({
        auctionMeId,
        password,
        rememberMe,
      });

      const nextParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next')
          : null;
      const destination = resolvePostLoginDestination(
        data?.user?.role,
        nextParam
      );

      // Only reached when the real backend authentication endpoint returns 2xx
      setFormStatus('success');
      setAlertMessage('Login successful. Redirecting...');
      setTimeout(() => {
        router.replace(destination);
      }, 600);
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setFormStatus('error');
        setFieldErrors({
          auctionMeId: null,
          password: err.message || 'Invalid AuctionMe ID or password.',
        });
      } else {
        setFormStatus('error');
        setAlertMessage(err.message || 'Unable to connect. Please try again.');
      }
    }
  };

  const isLoading = formStatus === 'loading';
  const isSuccess = formStatus === 'success';

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-4">
      <AuthInputField
        id="auctionme-id"
        label="AuctionMe ID"
        type="text"
        value={auctionMeId}
        onChange={(e) => {
          setAuctionMeId(e.target.value);
          if (fieldErrors.auctionMeId) {
            setFieldErrors((prev) => ({ ...prev, auctionMeId: null }));
          }
        }}
        placeholder="Enter your AuctionMe ID"
        autoComplete="username"
        disabled={isLoading || isSuccess}
        error={fieldErrors.auctionMeId}
        leadingIcon={
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <circle cx="10" cy="6.5" r="3" />
            <path
              strokeLinecap="round"
              d="M4.2 16.2c.9-2.5 3.1-3.9 5.8-3.9s4.9 1.4 5.8 3.9"
            />
          </svg>
        }
      />

      <AuthInputField
        id="auctionme-password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (fieldErrors.password) {
            setFieldErrors((prev) => ({ ...prev, password: null }));
          }
        }}
        placeholder="Enter your password"
        autoComplete="current-password"
        disabled={isLoading || isSuccess}
        error={fieldErrors.password}
        leadingIcon={
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <rect x="4.5" y="9" width="11" height="7.5" rx="1.8" />
            <path
              strokeLinecap="round"
              d="M7 9V6.8a3 3 0 016 0V9"
            />
          </svg>
        }
        trailingAction={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isLoading || isSuccess}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="rounded-md p-1 text-slate-400 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight dark:text-slate-500 dark:hover:text-slate-200 dark:focus:ring-auctionme-emeraldDark"
          >
            {showPassword ? (
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-4 w-4"
              >
                <path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z" />
                <circle cx="10" cy="10" r="2.2" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3l14 14M8.5 8.6a2.2 2.2 0 002.9 2.9M6.2 6.3C4.2 7.5 2.8 10 2.8 10s2.6 4.8 7.2 4.8c1.4 0 2.7-.4 3.8-1.1M9.2 5.2c.3 0 .5-.1.8-.1 4.6 0 7.2 4.9 7.2 4.9s-.8 1.5-2.2 2.8"
                />
              </svg>
            )}
          </button>
        }
      />

      {/* Keep Me Signed In */}
      <div className="flex items-center justify-between pt-0.5">
        <label className="inline-flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading || isSuccess}
            className="h-4 w-4 rounded border-slate-300 bg-white text-auctionme-emeraldLight focus:ring-auctionme-emeraldLight dark:border-slate-600 dark:bg-auctionme-darkInput dark:text-auctionme-emeraldDark dark:focus:ring-auctionme-emeraldDark"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">
            Keep me signed in
          </span>
        </label>
      </div>

      {/* Form-Level Status Alert (Server Unavailable / Auth Missing / Success) */}
      <AuthStatusAlert
        status={formStatus === 'success' ? 'success' : alertMessage ? 'error' : null}
        message={alertMessage}
      />

      {infoNote && !alertMessage && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          {infoNote}
        </div>
      )}

      {/* Primary Sign-In Button */}
      <button
        type="submit"
        disabled={isLoading || isSuccess}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-auctionme-emeraldLight px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight focus:ring-offset-2 focus:ring-offset-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-75 dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover dark:focus:ring-auctionme-emeraldDark dark:focus:ring-offset-auctionme-darkPanel"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>SIGNING IN...</span>
          </>
        ) : (
          <span>SIGN IN</span>
        )}
      </button>

      {/* Registration Link */}
      <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        <span className="block sm:inline">New to AuctionMe? </span>
        <Link
          href="/signup"
          className="mt-0.5 inline-block font-semibold text-auctionme-emeraldLight transition hover:underline sm:mt-0 dark:text-auctionme-emeraldDark"
        >
          Create account
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 pt-5 text-center dark:border-slate-800/80">
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          © 2025 AuctionMe. All rights reserved.
        </p>

        <div className="mt-3 lg:hidden">
          <Link
            href="/"
            className="text-[11px] font-medium text-slate-500 transition hover:text-auctionme-emeraldLight dark:text-slate-400 dark:hover:text-auctionme-emeraldDark"
          >
            ← Return to Live Auction Room
          </Link>
        </div>
      </footer>
    </form>
  );
}
