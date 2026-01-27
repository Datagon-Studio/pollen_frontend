import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import SignIn from "./app/auth/SignIn";
import SignUp from "./app/auth/SignUp";
import VerifyOTP from "./app/auth/VerifyOTP";
import ResetPassword from "./app/auth/ResetPassword";
import Index from "./app/Index";
import Members from "./app/admin/Members";
import Funds from "./app/admin/Funds";
import Contributions from "./app/admin/Contributions";
import Expenses from "./app/admin/Expenses";
import PublicSettings from "./app/admin/PublicSettings";
import PublicGroupLanding from "./app/public/PublicGroupLanding";
import PublicGroupPage from "./app/public/PublicGroupPage";
import JoinGroupPage from "./app/public/JoinGroupPage";
import VerifyMemberEmail from "./app/public/VerifyMemberEmail";
import PaymentCallback from "./app/public/PaymentCallback";
import Reports from "./app/admin/Reports";
import Settings from "./app/admin/Settings";
import KYCVerification from "./app/admin/KYCVerification";
import UserProfile from "./app/admin/UserProfile";
import NotFound from "./app/NotFound";
import { useAuth } from "./hooks/useAuth";
import { useRoles } from "./hooks/useRoles";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/signin" replace />;
};

// Superadmin-only route wrapper
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isSuperAdmin, loading: rolesLoading } = useRoles();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Admin-only route wrapper (excludes officers/viewers)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Only admins (not officers/viewers) can access admin routes
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  // Don't call useAuth here - it's called inside ProtectedRoute and other components
  // This prevents the hook from running before Router context is available

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
          <Route
            path="/members"
            element={
              <ProtectedRoute>
                <Members />
              </ProtectedRoute>
            }
          />
          <Route
            path="/funds"
            element={
              <ProtectedRoute>
                <Funds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contributions"
            element={
              <ProtectedRoute>
                <Contributions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/public-settings"
            element={
              <AdminRoute>
                <PublicSettings />
              </AdminRoute>
            }
          />
          <Route path="/group" element={<PublicGroupLanding />} />
          <Route path="/group/:accountId" element={<PublicGroupPage />} />
          <Route path="/group/:accountId/join" element={<JoinGroupPage />} />
          <Route path="/verify-member-email" element={<VerifyMemberEmail />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <AdminRoute>
                <Settings />
              </AdminRoute>
            }
          />
          <Route
            path="/kyc-verification"
            element={
              <SuperAdminRoute>
                <KYCVerification />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/user-profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

