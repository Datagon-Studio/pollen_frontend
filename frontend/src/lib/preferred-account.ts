const PREFERRED_ACCOUNT_KEY = 'pollean_preferred_account_id';

export function getPreferredAccountId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PREFERRED_ACCOUNT_KEY);
}

export function setPreferredAccountId(accountId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERRED_ACCOUNT_KEY, accountId);
}

export function clearPreferredAccountId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREFERRED_ACCOUNT_KEY);
}
