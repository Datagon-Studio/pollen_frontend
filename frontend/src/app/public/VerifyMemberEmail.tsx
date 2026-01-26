import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { memberApi } from "@/services/member.api";
import { useToast } from "@/hooks/use-toast";

export default function VerifyMemberEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await memberApi.verifyEmailToken(token);
        
        if (response.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          
          toast({
            title: "Email Verified",
            description: "Your email has been verified successfully.",
          });

          // Redirect after 3 seconds
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.error || 'Failed to verify email');
        }
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An error occurred while verifying your email');
      }
    };

    verifyEmail();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-16 w-16 text-success" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Please wait while we verify your email address'}
            {status === 'success' && 'Your email has been verified successfully'}
            {status === 'error' && 'We could not verify your email address'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{message}</p>
            {status === 'error' && (
              <Button onClick={() => navigate('/')} className="mt-4">
                Go to Home
              </Button>
            )}
            {status === 'success' && (
              <p className="text-sm text-muted-foreground mt-4">
                Redirecting you to the home page...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
