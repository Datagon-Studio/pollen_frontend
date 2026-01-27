import { useState, useEffect } from "react";
import { userApi } from "@/services/user.api";
import { useAccount } from "./useAccount";

export type PlatformRole = 'superadmin' | 'admin' | 'user';
export type AccountRole = 'admin' | 'officer' | 'viewer';

export function useRoles() {
  const { account } = useAccount();
  const [platformRole, setPlatformRole] = useState<PlatformRole>('user');
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoading(true);
        const profile = await userApi.getProfile();
        setPlatformRole((profile.role as PlatformRole) || 'user');

        // Load account role if account exists
        if (account?.account_id) {
          try {
            const accountRoleData = await userApi.getAccountRole(account.account_id);
            setAccountRole(accountRoleData.role as AccountRole);
          } catch (error) {
            // If user doesn't have account role, default to null
            setAccountRole(null);
          }
        }
      } catch (error) {
        console.error("Error loading roles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [account?.account_id]);

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
