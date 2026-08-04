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
  if (normalized.includes("otp_expired") || normalized.includes("expired") || normalized.includes("otp_expired")) {
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
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const tokenHash = searchParams.get("token_hash");
  const recoveryType = searchParams.get("type") || "recovery";

  // Persist inviting account so login lands on the correct group
  useEffect(() => {
    const accountId = searchParams.get("account_id");
    if (accountId) {
      setPreferredAccountId(accountId);
      clearAccountCache();
    }
  }, [searchParams]);

  // Surface Supabase redirect errors (legacy action_link / forgot-password flow)
  useEffect(() => {
    const urlError = getAuthErrorFromUrl(searchParams);
    if (urlError) {
      setError(urlError);
    }
  }, [searchParams]);

  // Legacy: recovery session from Supabase action_link redirect
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setError("");
        setTokenReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setTokenReady(true);
    }
  }, [user]);

  /**
   * Verify hashed_token only when the user clicks Continue.
   * Auto-verifying on page load lets email security scanners consume the one-time token.
   */
  const handleContinueWithToken = async () => {
    if (!tokenHash) return;

    setVerifyingToken(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: recoveryType === "invite" ? "invite" : "recovery",
      });

      if (verifyError) {
        const message = verifyError.message?.toLowerCase() || "";
        if (message.includes("expired") || message.includes("otp") || message.includes("invalid")) {
          throw new Error(
            "This password setup link has expired or was already used. Ask your admin to resend the collector invite, or use Forgot Password on the sign-in page."
          );
        }
        throw verifyError;
      }

      setTokenReady(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to verify this password setup link.";
      setError(message);
    } finally {
      setVerifyingToken(false);
    }
  };

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

  const canSetPassword = Boolean(user) || tokenReady;
  const hasInviteToken = Boolean(tokenHash) && !canSetPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Password</CardTitle>
          <CardDescription>
            {canSetPassword
              ? "Choose a password for your collector account"
              : hasInviteToken
                ? "Confirm below to continue setting your password"
                : "Open the password setup link from your email to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canSetPassword ? (
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          ) : hasInviteToken ? (
            <div className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</p>
              )}
              <p className="text-sm text-muted-foreground">
                For security, confirm you want to set your password. This step prevents email
                scanners from using your invite link.
              </p>
              <Button
                className="w-full"
                onClick={handleContinueWithToken}
                disabled={verifyingToken}
              >
                {verifyingToken ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue to set password"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/signin")}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
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
