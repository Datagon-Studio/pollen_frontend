import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { memberApi } from "@/services";
import { accountApi } from "@/services/account.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function JoinGroupPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    membershipNumber: "",
    dob: undefined as Date | undefined,
    phone: "",
    email: "",
  });
  
  // OTP states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [accountId]);

  const loadGroup = async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      
      // Load account info
      const accountData = await accountApi.getPublic(accountId);
      setAccount(accountData);
    } catch (error) {
      console.error("Error loading group:", error);
      // Don't navigate away, just show error
      toast({
        title: "Error",
        description: "Group not found",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!formData.email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address first.",
        variant: "destructive",
      });
      return;
    }
    
    setEmailSending(true);
    // TODO: Call actual API to send OTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    setEmailSending(false);
    setEmailOtpSent(true);
    toast({
      title: "OTP Sent",
      description: `Verification code sent to ${formData.email}`,
    });
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) return;
    
    setEmailVerifying(true);
    // TODO: Call actual API to verify OTP
    await new Promise(resolve => setTimeout(resolve, 800));
    setEmailVerifying(false);
    setEmailVerified(true);
    toast({
      title: "Email Verified",
      description: "Email address has been verified successfully.",
    });
  };

  const handleSendPhoneOtp = async () => {
    if (!formData.phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number first.",
        variant: "destructive",
      });
      return;
    }

    if (!accountId || !account) {
      toast({
        title: "Error",
        description: "Group information not found",
        variant: "destructive",
      });
      return;
    }
    
    setPhoneSending(true);
    try {
      const response = await memberApi.sendRegistrationOTP(formData.phone.trim(), accountId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to send OTP');
      }

      setPhoneOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formData.phone}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP code",
        variant: "destructive",
      });
      return;
    }

    if (!accountId || !account) {
      toast({
        title: "Error",
        description: "Group information not found",
        variant: "destructive",
      });
      return;
    }
    
    setPhoneVerifying(true);
    try {
      const response = await memberApi.verifyRegistrationOTP(
        formData.phone.trim(),
        phoneOtp.trim(),
        accountId
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to verify OTP');
      }

      setPhoneVerified(true);
      toast({
        title: "Phone Verified",
        description: "Phone number has been verified successfully.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid or expired OTP code",
        variant: "destructive",
      });
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number is required.",
        variant: "destructive",
      });
      return;
    }

    if (!phoneVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify your phone number before joining the group.",
        variant: "destructive",
      });
      return;
    }

    if (!accountId || !account) {
      toast({
        title: "Error",
        description: "Group information not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const response = await memberApi.create({
        account_id: accountId!,
        full_name: formData.fullName.trim(),
        dob: formData.dob ? format(formData.dob, "yyyy-MM-dd") : null,
        phone: formData.phone.trim(),
        phone_verified: phoneVerified,
        email: formData.email.trim() || null,
        email_verified: emailVerified,
        membership_number: formData.membershipNumber.trim() || null,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create member');
      }

      toast({
        title: "Success",
        description: `Welcome ${formData.fullName}! You've been added to the group.`,
      });

      // Redirect to public group page after a short delay
      setTimeout(() => {
        navigate(`/group/${accountId}`);
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join group",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Group not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber to-gold flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-white">PH</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Join Group</CardTitle>
          <CardDescription className="text-center">
            Register as a member of {account?.account_name || "this group"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            {/* Membership ID/Number */}
            <div className="space-y-2">
              <Label htmlFor="membershipNumber">Membership ID/Number (Optional)</Label>
              <Input
                id="membershipNumber"
                placeholder="Optional unique ID"
                value={formData.membershipNumber}
                onChange={(e) => setFormData({ ...formData, membershipNumber: e.target.value })}
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dob && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dob ? format(formData.dob, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dob}
                    onSelect={(date) => setFormData({ ...formData, dob: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (with OTP) *</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  placeholder="XXX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    setPhoneOtpSent(false);
                    setPhoneVerified(false);
                    setPhoneOtp("");
                  }}
                  disabled={phoneVerified}
                  className={cn(phoneVerified && "bg-success/10 border-success")}
                  required
                />
                {!phoneVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendPhoneOtp}
                    disabled={phoneSending || !formData.phone.trim()}
                    className="shrink-0"
                  >
                    {phoneSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Send OTP
                      </>
                    )}
                  </Button>
                )}
                {phoneVerified && (
                  <div className="flex items-center gap-1 text-success shrink-0 px-2">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Verified</span>
                  </div>
                )}
              </div>
              
              {/* Phone OTP Input */}
              {phoneOtpSent && !phoneVerified && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter OTP code"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerifyPhoneOtp}
                    disabled={phoneVerifying || !phoneOtp.trim()}
                  >
                    {phoneVerifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setEmailOtpSent(false);
                    setEmailVerified(false);
                    setEmailOtp("");
                  }}
                  disabled={emailVerified}
                  className={cn(emailVerified && "bg-success/10 border-success")}
                />
                {!emailVerified && formData.email.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendEmailOtp}
                    disabled={emailSending || !formData.email.trim()}
                    className="shrink-0"
                  >
                    {emailSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Send OTP
                      </>
                    )}
                  </Button>
                )}
                {emailVerified && (
                  <div className="flex items-center gap-1 text-success shrink-0 px-2">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Verified</span>
                  </div>
                )}
              </div>
              
              {/* Email OTP Input */}
              {emailOtpSent && !emailVerified && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter OTP code"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerifyEmailOtp}
                    disabled={emailVerifying || !emailOtp.trim()}
                  >
                    {emailVerifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/group/${accountId}`)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Joining..." : "Join Group"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
