import { useState, useEffect } from 'react';
import { accountApi, Account } from '@/services/account.api';

export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      const accountData = await accountApi.getMyAccount();
      setAccount(accountData);
    } catch (err) {
      console.error('Failed to load account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const refreshAccount = () => {
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

