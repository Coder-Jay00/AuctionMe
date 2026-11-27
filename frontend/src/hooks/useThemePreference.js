'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'auctionme-theme';

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyThemeClass(resolved) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState('dark');
  const [resolvedTheme, setResolvedTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const initialPref =
      saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
    const initialResolved =
      initialPref === 'system' ? getSystemTheme() : initialPref;

    setPreferenceState(initialPref);
    setResolvedTheme(initialResolved);
    applyThemeClass(initialResolved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const nextResolved =
        preference === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : preference;
      setResolvedTheme(nextResolved);
      applyThemeClass(nextResolved);
    };

    sync();

    if (preference === 'system') {
      mediaQuery.addEventListener('change', sync);
      return () => mediaQuery.removeEventListener('change', sync);
    }
    return undefined;
  }, [preference, mounted]);

  const setPreference = useCallback((nextPref) => {
    setPreferenceState(nextPref);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextPref);
    }
    const nextResolved = nextPref === 'system' ? getSystemTheme() : nextPref;
    setResolvedTheme(nextResolved);
    applyThemeClass(nextResolved);
  }, []);

  return { preference, resolvedTheme, setPreference, mounted };
}
