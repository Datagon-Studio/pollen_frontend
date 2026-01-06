import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./app/auth/SignIn";
import SignUp from "./app/auth/SignUp";
import VerifyOTP from "./app/auth/VerifyOTP";
import Index from "./app/Index";
import Members from "./app/admin/Members";
import Funds from "./app/admin/Funds";
import Contributions from "./app/admin/Contributions";
import Expenses from "./app/admin/Expenses";
import PublicPage from "./app/public/PublicPage";
import MemberPreview from "./app/public/MemberPreview";
import Reports from "./app/admin/Reports";
import Settings from "./app/admin/Settings";
import NotFound from "./app/NotFound";
import { useAuth } from "./hooks/useAuth";

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

const App = () => {
  const { user, loading } = useAuth();

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
            <Route
              path="/"
              element={
                loading ? (
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-muted-foreground">Loading...</div>
                  </div>
                ) : user ? (
                  <Index />
                ) : (
                  <Navigate to="/signin" replace />
                )
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
          <Route path="/public-page" element={<PublicPage />} />
          <Route path="/member-preview" element={<MemberPreview />} />
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
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

