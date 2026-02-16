import { useState, useEffect, useRef } from "react";
import { userApi } from "@/services/user.api";
import { useAccount } from "./useAccount";
import { useAuth } from "./useAuth";

export type PlatformRole = 'superadmin' | 'admin' | 'user';
export type AccountRole = 'admin' | 'officer' | 'viewer';

// Module-level cache to share roles data across all hook instances
let cachedPlatformRole: PlatformRole = 'user';
let cachedAccountRole: AccountRole | null = null;
let cachedAccountId: string | null = null;
let loadingPromise: Promise<{ platformRole: PlatformRole; accountRole: AccountRole | null }> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useRoles() {
  const { user } = useAuth();
  const { account, loading: accountLoading } = useAccount(user?.id);
  const [platformRole, setPlatformRole] = useState<PlatformRole>(cachedPlatformRole);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(cachedAccountRole);
  // Important: keep loading true until account finishes loading; otherwise on refresh
  // we may briefly resolve with accountRole=null and trigger redirects to "/".
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Wait for account to load (prevents route-guard redirects on refresh)
    if (accountLoading) {
      setLoading(true);
      return () => {
        mountedRef.current = false;
      };
    }
    
    // If account_id hasn't changed and we have cached data, use it immediately
    const now = Date.now();
    if (cachedAccountId === account?.account_id && (now - cacheTimestamp) < CACHE_DURATION) {
      setPlatformRole(cachedPlatformRole);
      setAccountRole(cachedAccountRole);
      setLoading(false);
      return;
    }

    // If there's already a loading promise for this account, wait for it
    if (loadingPromise && cachedAccountId === account?.account_id) {
      loadingPromise
        .then((rolesData) => {
          if (mountedRef.current) {
            setPlatformRole(rolesData.platformRole);
            setAccountRole(rolesData.accountRole);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (mountedRef.current) {
            console.error('Failed to load roles:', err);
            setLoading(false);
          }
        });
      return;
    }

    // Start a new fetch
    loadRoles();

    return () => {
      mountedRef.current = false;
    };
  }, [account?.account_id, accountLoading]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const profile = await userApi.getProfile();
      const platformRoleValue = (profile.role as PlatformRole) || 'user';
      setPlatformRole(platformRoleValue);

      let accountRoleValue: AccountRole | null = null;
      // Load account role if account exists
      if (account?.account_id) {
        try {
          const accountRoleData = await userApi.getAccountRole(account.account_id);
          accountRoleValue = accountRoleData.role as AccountRole;
          setAccountRole(accountRoleValue);
        } catch (error) {
          // If user doesn't have account role, default to null
          setAccountRole(null);
        }
      } else {
        setAccountRole(null);
      }

      // Update cache
      cachedPlatformRole = platformRoleValue;
      cachedAccountRole = accountRoleValue;
      cachedAccountId = account?.account_id || null;
      cacheTimestamp = Date.now();
      loadingPromise = null;

      if (mountedRef.current) {
        setLoading(false);
      }
    } catch (error) {
      loadingPromise = null;
      if (mountedRef.current) {
        console.error("Error loading roles:", error);
        setLoading(false);
      }
    }
  };

  const isSuperAdmin = platformRole === 'superadmin';
  const isAdmin = accountRole === 'admin' || isSuperAdmin;
  const isOfficer = accountRole === 'officer';
  const isViewer = accountRole === 'viewer';

  return {
    platformRole,
    accountRole,
    isSuperAdmin,
    isAdmin,
    isOfficer,
    isViewer,
    loading,
  };
}
