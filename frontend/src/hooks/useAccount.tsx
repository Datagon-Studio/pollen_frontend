import { useState, useEffect, useRef } from 'react';
import { accountApi, Account } from '@/services/account.api';

// Module-level cache to share account data across all hook instances
let cachedAccount: Account | null = null;
let loadingPromise: Promise<Account> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useAccount() {
  const [account, setAccount] = useState<Account | null>(cachedAccount);
  const [loading, setLoading] = useState(!cachedAccount);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // If we have cached data that's still fresh, use it immediately
    const now = Date.now();
    if (cachedAccount && (now - cacheTimestamp) < CACHE_DURATION) {
      setAccount(cachedAccount);
      setLoading(false);
      return;
    }

    // If there's already a loading promise, wait for it
    if (loadingPromise) {
      loadingPromise
        .then((accountData) => {
          if (mountedRef.current) {
            setAccount(accountData);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (mountedRef.current) {
            console.error('Failed to load account:', err);
            setError(err instanceof Error ? err.message : 'Failed to load account');
            setLoading(false);
          }
        });
      return;
    }

    // Start a new fetch
    loadAccount();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a promise and cache it so other instances can reuse it
      loadingPromise = accountApi.getMyAccount();
      const accountData = await loadingPromise;
      
      // Update cache
      cachedAccount = accountData;
      cacheTimestamp = Date.now();
      loadingPromise = null;
      
      if (mountedRef.current) {
        setAccount(accountData);
        setLoading(false);
      }
    } catch (err) {
      loadingPromise = null;
      if (mountedRef.current) {
        console.error('Failed to load account:', err);
        setError(err instanceof Error ? err.message : 'Failed to load account');
        setLoading(false);
      }
    }
  };

  const refreshAccount = async () => {
    // Clear cache to force refresh
    cachedAccount = null;
    cacheTimestamp = 0;
    loadingPromise = null;
    return loadAccount();
  };

  const getInitials = (name: string | null): string => {
    if (!name) return 'UP';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return {
    account,
    loading,
    error,
    refreshAccount,
    getInitials,
  };
}



