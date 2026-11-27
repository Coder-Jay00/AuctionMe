'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthInputField from './AuthInputField';
import AuthStatusAlert from './AuthStatusAlert';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import PasswordRequirementsBox from './PasswordRequirementsBox';
import { registerWithAuctionMeId } from '../../services/authApi';
import {
  evaluatePasswordRules,
  validateSignupForm,
} from '../../utils/authValidation';

function EyeToggleButton({ visible, onToggle, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={visible}
      className="rounded-md p-1 text-slate-400 transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight dark:text-slate-500 dark:hover:text-slate-200 dark:focus:ring-auctionme-emeraldDark"
    >
      {visible ? (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z" />
          <circle cx="10" cy="10" r="2.2" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l14 14M8.5 8.6a2.2 2.2 0 002.9 2.9M6.2 6.3C4.2 7.5 2.8 10 2.8 10s2.6 4.8 7.2 4.8c1.4 0 2.7-.4 3.8-1.1M9.2 5.2c.3 0 .5-.1.8-.1 4.6 0 7.2 4.9 7.2 4.9s-.8 1.5-2.2 2.8"
          />
        </svg>
      )}
    </button>
  );
}

export default function SignupForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [auctionMeId, setAuctionMeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touched, setTouched] = useState({
    displayName: false,
    auctionMeId: false,
    password: false,
    confirmPassword: false,
  });

  const [formStatus, setFormStatus] = useState('idle'); // idle | loading | error | success
  const [apiError, setApiError] = useState(null);

  const passwordRules = useMemo(
    () => evaluatePasswordRules(password),
    [password]
  );

  const validation = useMemo(
    () =>
      validateSignupForm({
        displayName,
        auctionMeId,
        password,
        confirmPassword,
      }),
    [displayName, auctionMeId, password, confirmPassword]
  );

  const isLoading = formStatus === 'loading';
  const isSuccess = formStatus === 'success';
  const canSubmit = validation.isValid && !isLoading && !isSuccess;

  const markTouched = (field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    setTouched({
      displayName: true,
      auctionMeId: true,
      password: true,
      confirmPassword: true,
    });

    if (!validation.isValid) {
      return;
    }

    setFormStatus('loading');
    try {
      const data = await registerWithAuctionMeId({
        displayName,
        auctionMeId,
        password,
      });
      setFormStatus('success');
      const role = data?.user?.role || 'BIDDER';
      const destination =
        role === 'ADMIN' ? '/admin' : role === 'HOST' ? '/host' : '/discover';
      setTimeout(() => {
        router.replace(destination);
      }, 700);
    } catch (err) {
      setFormStatus('error');
      setApiError(
        err?.message || 'Unable to create account. Please try again.'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-3.5">
      {/* Display Name */}
      <div onBlur={() => markTouched('displayName')}>
        <AuthInputField
          id="signup-display-name"
          label="Display Name"
          type="text"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            if (apiError) setApiError(null);
          }}
          placeholder="Enter your display name"
          autoComplete="name"
          disabled={isLoading || isSuccess}
          error={touched.displayName ? validation.errors.displayName : null}
          leadingIcon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
              <circle cx="10" cy="6.5" r="3" />
              <path strokeLinecap="round" d="M4.2 16.2c.9-2.5 3.1-3.9 5.8-3.9s4.9 1.4 5.8 3.9" />
            </svg>
          }
        />
      </div>

      {/* AuctionMe ID */}
      <div onBlur={() => markTouched('auctionMeId')}>
        <AuthInputField
          id="signup-auctionme-id"
          label="AuctionMe ID"
          type="text"
          value={auctionMeId}
          onChange={(e) => {
            setAuctionMeId(e.target.value);
            if (apiError) setApiError(null);
          }}
          placeholder="Choose a unique AuctionMe ID"
          autoComplete="username"
          disabled={isLoading || isSuccess}
          error={touched.auctionMeId ? validation.errors.auctionMeId : null}
          leadingIcon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
              <circle cx="10" cy="10" r="2.7" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12.7 10v1.1a1.7 1.7 0 003.4 0V10a6.1 6.1 0 10-2.6 5"
              />
            </svg>
          }
        />
      </div>

      {/* Password + Strength Meter */}
      <div onBlur={() => markTouched('password')}>
        <AuthInputField
          id="signup-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (apiError) setApiError(null);
          }}
          placeholder="Create your password"
          autoComplete="new-password"
          disabled={isLoading || isSuccess}
          error={touched.password ? validation.errors.password : null}
          leadingIcon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
              <rect x="4.5" y="9" width="11" height="7.5" rx="1.8" />
              <path strokeLinecap="round" d="M7 9V6.8a3 3 0 016 0V9" />
            </svg>
          }
          trailingAction={
            <EyeToggleButton
              visible={showPassword}
              onToggle={() => setShowPassword((prev) => !prev)}
              disabled={isLoading || isSuccess}
              label={showPassword ? 'Hide password' : 'Show password'}
            />
          }
        />
        <PasswordStrengthMeter rules={passwordRules} />
      </div>

      {/* Confirm Password */}
      <div onBlur={() => markTouched('confirmPassword')}>
        <AuthInputField
          id="signup-confirm-password"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (apiError) setApiError(null);
          }}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          disabled={isLoading || isSuccess}
          error={
            touched.confirmPassword || confirmPassword.length > 0
              ? validation.errors.confirmPassword
              : null
          }
          leadingIcon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
              <rect x="4.5" y="9" width="11" height="7.5" rx="1.8" />
              <path strokeLinecap="round" d="M7 9V6.8a3 3 0 016 0V9" />
            </svg>
          }
          trailingAction={
            <EyeToggleButton
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((prev) => !prev)}
              disabled={isLoading || isSuccess}
              label={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
            />
          }
        />
      </div>

      {/* Password Requirements Checklist */}
      <PasswordRequirementsBox rules={passwordRules} />

      {/* API Error / Missing Integration / Success Banner */}
      <AuthStatusAlert
        status={formStatus === 'success' ? 'success' : apiError ? 'error' : null}
        message={
          formStatus === 'success'
            ? 'Account created successfully! Redirecting to Auction Catalog...'
            : apiError
        }
      />

      {/* Primary Submit Button — Disabled until all required fields are valid */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-auctionme-emeraldLight px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-auctionme-emeraldLightHover focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight focus:ring-offset-2 focus:ring-offset-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-auctionme-emeraldDark dark:text-[#061b12] dark:hover:bg-auctionme-emeraldDarkHover dark:focus:ring-auctionme-emeraldDark dark:focus:ring-offset-auctionme-darkPanel"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>CREATING ACCOUNT...</span>
          </>
        ) : (
          <span>CREATE ACCOUNT</span>
        )}
      </button>

      {/* Link to Screen 01 — Sign In */}
      <div className="pt-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
        <span>Already have an account? </span>
        <Link
          href="/login"
          className="font-semibold text-auctionme-emeraldLight transition hover:underline dark:text-auctionme-emeraldDark"
        >
          Sign in
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 pt-4 text-center dark:border-slate-800/80">
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          © 2025 AuctionMe. All rights reserved.
        </p>

        <div className="mt-2.5 lg:hidden">
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
