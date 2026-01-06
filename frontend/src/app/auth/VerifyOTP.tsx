import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get email from URL params or session
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // Try to get from session if available
      const sessionEmail = sessionStorage.getItem("signup_email");
      if (sessionEmail) {
        setEmail(sessionEmail);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!otp || otp.length < 6) {
      setError("Please enter the complete OTP code");
      setLoading(false);
      return;
    }

    if (!email) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      // Verify OTP token for sign-up email verification
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid OTP. Please check your email and try again.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Clear signup email from session
        sessionStorage.removeItem("signup_email");
        
        // Redirect to sign in page after email verification
        navigate("/signin?verified=true");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);

    if (!email) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      // Resend sign-up OTP
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/signin?verified=true`,
        },
      });

      if (resendError) {
        setError(resendError.message || "Failed to resend OTP");
      } else {
        setError("");
        alert("OTP has been resent to your email");
      }
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber to-gold flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-white">PH</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Verify your email</CardTitle>
          <CardDescription className="text-center">
            We've sent a verification code to <strong>{email || "your email"}</strong>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="00000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setOtp(value);
                }}
                maxLength={10}
                className="text-center text-2xl tracking-widest font-mono"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the verification code from your email
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
              {loading ? "Verifying..." : "Verify Email"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-sm text-amber hover:underline font-medium disabled:opacity-50"
              >
                Resend OTP
              </button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Didn't receive the code? Check your spam folder or click "Resend OTP"
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

