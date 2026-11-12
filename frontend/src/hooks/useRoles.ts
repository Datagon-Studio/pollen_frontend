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
const ROLES_STORAGE_KEY = "pollean.account-roles";

function rolesCacheFresh(): boolean {
  return cacheTimestamp > 0 && Date.now() - cacheTimestamp < CACHE_DURATION;
}

function readStoredRoles(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      platformRole?: PlatformRole;
      accountRole?: AccountRole | null;
      accountId?: string | null;
      timestamp?: number;
    };
    if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(ROLES_STORAGE_KEY);
      return;
    }
    cachedPlatformRole = parsed.platformRole || "user";
    cachedAccountRole = parsed.accountRole ?? null;
    cachedAccountId = parsed.accountId ?? null;
    cacheTimestamp = parsed.timestamp;
  } catch {
    sessionStorage.removeItem(ROLES_STORAGE_KEY);
  }
}

function writeStoredRoles(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    ROLES_STORAGE_KEY,
    JSON.stringify({
      platformRole: cachedPlatformRole,
      accountRole: cachedAccountRole,
      accountId: cachedAccountId,
      timestamp: cacheTimestamp,
    })
  );
}

readStoredRoles();

export function clearRolesCache() {
  cachedPlatformRole = "user";
  cachedAccountRole = null;
  cachedAccountId = null;
  loadingPromise = null;
  cacheTimestamp = 0;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ROLES_STORAGE_KEY);
  }
}

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const { account, loading: accountLoading } = useAccount(user?.id);
  const [platformRole, setPlatformRole] = useState<PlatformRole>(cachedPlatformRole);
  const [accountRole, setAccountRole] = useState<AccountRole | null>(cachedAccountRole);
  // Important: keep loading true until account finishes loading; otherwise on refresh
  // we may briefly resolve with accountRole=null and trigger redirects to "/".
  const [loading, setLoading] = useState(() => !rolesCacheFresh());
  const mountedRef = useRef(true);

  useEffect(() => {
    // Auth starts signed-out on refresh until the session is restored.
    // Don't wipe a stored role during that gap.
    if (authLoading || user) return;
    clearRolesCache();
    setPlatformRole("user");
    setAccountRole(null);
    setLoading(false);
  }, [user, authLoading]);

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
      writeStoredRoles();
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
