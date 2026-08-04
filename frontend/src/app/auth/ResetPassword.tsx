import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { setPreferredAccountId } from "@/lib/preferred-account";
import { clearAccountCache } from "@/hooks/useAccount";

function getAuthErrorFromUrl(searchParams: URLSearchParams): string | null {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const error =
    searchParams.get("error") ||
    searchParams.get("error_code") ||
    hashParams.get("error") ||
    hashParams.get("error_code");
  const description =
    searchParams.get("error_description") || hashParams.get("error_description");

  if (!error && !description) return null;

  const normalized = `${error || ""} ${description || ""}`.toLowerCase();
  if (normalized.includes("otp_expired") || normalized.includes("expired")) {
    return "This password setup link has expired or was already used. Ask your admin to resend the collector invite, or use Forgot Password on the sign-in page.";
  }
  if (normalized.includes("access_denied")) {
    return description?.replace(/\+/g, " ") || "This password setup link is no longer valid.";
  }
  return description?.replace(/\+/g, " ") || "Unable to open the password setup link.";
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Persist inviting account so login lands on the correct group
  useEffect(() => {
    const accountId = searchParams.get("account_id");
    if (accountId) {
      setPreferredAccountId(accountId);
      clearAccountCache();
    }
  }, [searchParams]);

  // Surface Supabase redirect errors (expired / used links)
  useEffect(() => {
    const urlError = getAuthErrorFromUrl(searchParams);
    if (urlError) {
      setError(urlError);
    }
  }, [searchParams]);

  // Listen for PASSWORD_RECOVERY event
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setError("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check if we have a valid session (user clicked reset link)
  useEffect(() => {
    if (!authLoading && !user && !error) {
      setError("Please click the password reset link in your email to continue.");
    }
  }, [user, authLoading, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. Please sign in.",
      });

      // End recovery session so they explicitly sign into the intended account
      await supabase.auth.signOut();
      clearAccountCache();
      navigate("/signin", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Password</CardTitle>
          <CardDescription>
            {user
              ? "Choose a password for your collector account"
              : "Open the password setup link from your email to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              {error ? (
                <p className="text-sm text-red-600 bg-red-50 rounded-md p-3 text-left">{error}</p>
              ) : (
                <p className="text-muted-foreground">
                  Please check your email and click the password setup link to continue.
                </p>
              )}
              <Button
                variant="outline"
                onClick={() => navigate("/signin")}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
