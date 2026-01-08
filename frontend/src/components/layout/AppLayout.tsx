import { ReactNode, useState, useEffect } from "react";
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
  Menu,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useAccount";
import { userApi, UserProfile } from "@/services/user.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: Users },
  { label: "Funds", href: "/funds", icon: Wallet },
  { label: "Contributions", href: "/contributions", icon: HandCoins },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Public Page", href: "/public-page", icon: Globe },
  { label: "Member Preview", href: "/member-preview", icon: Users },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { account, getInitials: getAccountInitials, loading: accountLoading } = useAccount();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sidebarLogoLoaded, setSidebarLogoLoaded] = useState(false);
  const [mobileLogoLoaded, setMobileLogoLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch user profile when user is logged in
      setProfileLoading(true);
      userApi.getProfile()
        .then((profile) => {
          setUserProfile(profile);
          setProfileLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch user profile:', error);
          setProfileLoading(false);
          // Set default profile if fetch fails
          setUserProfile({
            user_id: user.id,
            email: user.email || '',
            role: 'admin',
            full_name: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
    } else {
      setUserProfile(null);
      setProfileLoading(false);
    }
  }, [user]);

  // Reset logo loaded states when account logo changes
  useEffect(() => {
    if (account?.account_logo) {
      setSidebarLogoLoaded(false);
      setMobileLogoLoaded(false);
    }
  }, [account?.account_logo]);

  const handleLogout = async () => {
    await logout();
    navigate("/signin", { replace: true });
  };

  // Get display name and initials
  const displayName = userProfile?.full_name || "User Profile";
  const initials = userProfile?.full_name
    ? userProfile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "UP";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center px-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-secondary rounded-md"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="ml-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-amber flex items-center justify-center overflow-hidden relative">
            {accountLoading ? (
              <div className="h-full w-full bg-amber/20 animate-pulse" />
            ) : account?.account_logo ? (
              <>
                {!mobileLogoLoaded && (
                  <div className="absolute inset-0 bg-amber/20 animate-pulse" />
                )}
                <img 
                  src={account.account_logo} 
                  alt="Account Logo" 
                  className={`h-full w-full object-cover ${mobileLogoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
                  onLoad={() => setMobileLogoLoaded(true)}
                  onError={() => setMobileLogoLoaded(true)}
                />
              </>
            ) : (
              <span className="text-sm font-bold text-primary-foreground">
                {account ? getAccountInitials(account.account_name) : "PH"}
              </span>
            )}
          </div>
          <span className="font-semibold text-foreground">PollenHive</span>
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
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-amber flex items-center justify-center shrink-0 overflow-hidden relative">
              {accountLoading ? (
                <div className="h-full w-full bg-amber/20 animate-pulse" />
              ) : account?.account_logo ? (
                <>
                  {!sidebarLogoLoaded && (
                    <div className="absolute inset-0 bg-amber/20 animate-pulse" />
                  )}
                  <img 
                    src={account.account_logo} 
                    alt="Account Logo" 
                    className={`h-full w-full object-cover ${sidebarLogoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
                    onLoad={() => setSidebarLogoLoaded(true)}
                    onError={() => setSidebarLogoLoaded(true)}
                  />
                </>
              ) : (
                <span className="text-lg font-bold text-charcoal">
                  {account ? getAccountInitials(account.account_name) : "PH"}
                </span>
              )}
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-foreground">PollenHive</span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 hover:bg-secondary rounded-md"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                !sidebarOpen && "rotate-180"
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
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-amber-dark")} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-secondary transition-colors">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {profileLoading ? "..." : initials}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profileLoading ? "Loading..." : displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">Admin</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {!sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-center p-2 rounded-md hover:bg-secondary transition-colors">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {profileLoading ? "..." : initials}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-300 pt-16 lg:pt-0",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
