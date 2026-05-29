import { ReactNode, useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wallet,
  HandCoins,
  Receipt,
  Globe,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useAccount";
import { useRoles } from "@/hooks/useRoles";
import { userApi, UserProfile } from "@/services/user.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BrandFullLogo, BrandSymbol } from "@/components/ui/brand";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: Users },
  { label: "Funds", href: "/funds", icon: Wallet },
  { label: "Contributions", href: "/contributions", icon: HandCoins },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Public Settings", href: "/public-settings", icon: Globe },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  {
    label: "KYC Verification",
    href: "/kyc-verification",
    icon: Shield,
    superAdminOnly: true,
  },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "User Profile", href: "/user-profile", icon: User },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const {
    account,
    getInitials: getAccountInitials,
    loading: accountLoading,
  } = useAccount(user?.id);
  const {
    isSuperAdmin,
    isOfficer,
    accountRole,
    loading: rolesLoading,
  } = useRoles();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Filter nav items based on role - memoize to prevent recalculation on every render
  // Only recompute when roles actually change (not when loading state changes)
  const navItems = useMemo(() => {
    return allNavItems.filter((item) => {
      // Hide superadmin-only items from non-superadmins
      if (item.superAdminOnly && !isSuperAdmin) {
        return false;
      }
      // Hide Settings and Public Settings from collectors (officers)
      if (
        (item.href === "/settings" || item.href === "/public-settings") &&
        isOfficer
      ) {
        return false;
      }
      return true;
    });
  }, [isSuperAdmin, isOfficer]);

  // Cache user profile to avoid refetching on navigation
  const userProfileRef = useRef<UserProfile | null>(null);
  const userProfileLoadingRef = useRef(false);

  useEffect(() => {
    if (user) {
      // Load profile image from user metadata as an initial fallback
      const profileImageUrl = user.user_metadata?.profile_image_url;
      if (profileImageUrl) {
        setProfileImage(profileImageUrl);
      }

      // If we already have a cached profile for this user, use it
      if (
        userProfileRef.current &&
        userProfileRef.current.user_id === user.id
      ) {
        setUserProfile(userProfileRef.current);
        setProfileLoading(false);
        return;
      }

      // If already loading, don't start another fetch
      if (userProfileLoadingRef.current) {
        return;
      }

      // Fetch user profile when user is logged in
      setProfileLoading(true);
      userProfileLoadingRef.current = true;
      userApi
        .getProfile()
        .then((profile) => {
          userProfileRef.current = profile;
          setUserProfile(profile);
          if (profile.profile_image_url) {
            setProfileImage(profile.profile_image_url);
          }
          setProfileLoading(false);
          userProfileLoadingRef.current = false;
        })
        .catch((error) => {
          console.error("Failed to fetch user profile:", error);
          setProfileLoading(false);
          userProfileLoadingRef.current = false;
          // Set default profile if fetch fails
          const defaultProfile: UserProfile = {
            user_id: user.id,
            email: user.email || "",
            role: "admin",
            full_name: user.user_metadata?.full_name || null,
            profile_image_url: user.user_metadata?.profile_image_url || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          userProfileRef.current = defaultProfile;
          setUserProfile(defaultProfile);
        });
    } else {
      userProfileRef.current = null;
      setUserProfile(null);
      setProfileImage(null);
      setProfileLoading(false);
    }
  }, [user]);

  // Listen for auth state changes to update profile image
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profileImageUrl = session.user.user_metadata?.profile_image_url;
        if (profileImageUrl) {
          setProfileImage(profileImageUrl);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/signin", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      // Force navigation even if logout fails
      navigate("/signin", { replace: true });
    }
  };

  // Get display name and initials
  const displayName =
    userProfile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const initials = userProfile?.full_name
    ? userProfile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email
      ? user.email[0].toUpperCase()
      : "U";
  const isDarkTheme = theme === "dark";
  const currentNavItem =
    navItems.find((item) => item.href === location.pathname) ??
    allNavItems.find((item) => item.href === location.pathname);
  const currentPageTitle = account?.account_name || "Pollean";
  const currentPageSubtitle = currentNavItem?.label || "Dashboard";
  const rawRole = accountRole || userProfile?.role || "admin";
  const roleLabel = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);

  const handleThemeToggle = () => {
    setTheme(isDarkTheme ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center px-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-secondary rounded-md"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
        <div className="ml-4 flex items-center gap-2 min-w-0">
          {accountLoading ? (
            <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
          ) : account?.account_logo ? (
            <>
              <img
                src={account.account_logo}
                alt="Account Logo"
                className="h-8 w-8 rounded-md object-cover shrink-0"
                loading="eager"
                decoding="async"
                key={`mobile-${account.account_logo}`}
              />
              <span className="font-semibold text-foreground truncate">
                {account.account_name || "Pollean"}
              </span>
            </>
          ) : account?.account_name ? (
            <>
              <BrandSymbol className="h-6 w-6 shrink-0" alt="Pollean" />
              <span className="font-semibold text-foreground truncate">
                {account.account_name}
              </span>
            </>
          ) : (
            <BrandFullLogo
              className="max-w-full gap-2"
              symbolClassName="h-8 w-8"
              wordmarkClassName="h-8 w-auto"
              alt="Pollean"
            />
          )}
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-charcoal/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-card border-r border-border z-50 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="h-[101px] flex items-center justify-between px-4 border-b border-border">
          <Link
            to="/"
            className="flex items-center justify-center h-10 w-10 rounded-md"
          >
            <BrandSymbol className="h-16 w-16" alt="Pollean" />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 hover:bg-secondary rounded-md"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                !sidebarOpen && "rotate-180",
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
                  isActive
                    ? "bg-amber/10 text-amber-dark border-l-2 border-amber -ml-0.5 pl-[calc(0.75rem+2px)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive && "text-amber-dark",
                  )}
                />
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                {isDarkTheme ? (
                  <Moon className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Sun className="h-4 w-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">
                    {isDarkTheme ? "Dark" : "Light"}
                  </p>
                </div>
              </div>
              <Switch
                checked={isDarkTheme}
                onCheckedChange={handleThemeToggle}
                aria-label="Toggle theme"
              />
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
            <button
              onClick={handleThemeToggle}
              className="w-full flex items-center justify-center p-2 rounded-md hover:bg-secondary transition-colors"
              aria-label={
                isDarkTheme ? "Switch to light theme" : "Switch to dark theme"
              }
              title={
                isDarkTheme ? "Switch to light theme" : "Switch to dark theme"
              }
            >
              {isDarkTheme ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-300 pt-16 lg:pt-0",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20",
        )}
      >
        <div className="hidden lg:flex items-center justify-between gap-6 border-b border-border bg-card px-8 py-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {accountLoading ? (
                <div className="h-full w-full bg-muted animate-pulse" />
              ) : account?.account_logo ? (
                <img
                  src={account.account_logo}
                  alt="Account Logo"
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  key={`topbar-${account.account_logo}`}
                />
              ) : (
                <BrandSymbol className="h-7 w-7" alt="Pollean" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-foreground truncate">
                {currentPageTitle}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground truncate">
                {currentPageSubtitle}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-secondary transition-colors">
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground leading-none">
                    {profileLoading ? "Loading..." : displayName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {roleLabel}
                  </p>
                </div>
                <Avatar className="h-11 w-11 border border-border">
                  <AvatarImage
                    src={profileImage || undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className="text-sm font-medium">
                    {profileLoading ? "..." : initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || roleLabel}
                </p>
              </div>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
