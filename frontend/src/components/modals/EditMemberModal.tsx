import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { memberApi, Member, UpdateMemberInput, isMemberActive } from "@/services";
import { OtpUssdHint } from "@/components/ui/otp-ussd-hint";
import { useRoles } from "@/hooks/useRoles";

interface EditMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onSuccess?: () => void;
}

export function EditMemberModal({ open, onOpenChange, member, onSuccess }: EditMemberModalProps) {
  const { toast } = useToast();
  const { isOfficer } = useRoles();
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isCollector, setIsCollector] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneUssdCode, setPhoneUssdCode] = useState<string | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dob: undefined as Date | undefined,
    phone: "",
    email: "",
    membershipNumber: "",
  });

  useEffect(() => {
    if (member && open) {
      setFormData({
        fullName: member.full_name || "",
        dob: member.dob ? new Date(member.dob) : undefined,
        phone: member.phone || "",
        email: member.email || "",
        membershipNumber: member.membership_number || "",
      });
      setIsActive(isMemberActive(member));
      setIsCollector(false);
      setPhoneVerified(member.phone_verified);
      setPhoneOtpSent(false);
      setPhoneOtp("");
      setPhoneUssdCode(null);
      setEmailVerified(member.email_verified);
      setEmailOtpSent(false);
      setEmailOtp("");
    }
  }, [member, open]);

  const handleSendPhoneOtp = async () => {
    if (!formData.phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!member) return;
    
    setPhoneSending(true);
    try {
      const response = await memberApi.sendPhoneOTP(member.member_id);
      if (response.success) {
        setPhoneOtpSent(true);
        setPhoneUssdCode(response.ussd_code ?? null);
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${formData.phone}`,
        });
      } else {
        throw new Error(response.error || 'Failed to send OTP');
      }
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
    if (!phoneOtp.trim()) return;
    
    if (!member) return;
    
    setPhoneVerifying(true);
    try {
      const response = await memberApi.verifyPhoneOTP(member.member_id, phoneOtp);
      if (response.success && response.data) {
        setPhoneVerified(true);
        setPhoneOtpSent(false);
        setPhoneOtp("");
        setIsActive(true); // Member becomes active when phone is verified
        toast({
          title: "Phone Verified",
          description: "Phone number has been verified successfully.",
        });
      } else {
        throw new Error(response.error || 'Failed to verify phone');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify phone",
        variant: "destructive",
      });
    } finally {
      setPhoneVerifying(false);
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

    if (!member) return;

    setEmailSending(true);
    try {
      const response = await memberApi.sendEmailOTP(member.member_id, formData.email.trim());
      if (response.success) {
        setEmailOtpSent(true);
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${formData.email}`,
        });
      } else {
        throw new Error(response.error || "Failed to send OTP");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP code",
        variant: "destructive",
      });
      return;
    }

    if (!member) return;

    setEmailVerifying(true);
    try {
      const response = await memberApi.verifyEmailOTP(
        member.member_id,
        emailOtp.trim(),
        formData.email.trim()
      );
      if (response.success) {
        setEmailVerified(true);
        setEmailOtpSent(false);
        setEmailOtp("");
        toast({
          title: "Email Verified",
          description: "Email address has been verified successfully.",
        });
      } else {
        throw new Error(response.error || "Failed to verify OTP");
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid or expired OTP code",
        variant: "destructive",
      });
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleResendCollectorInvite = async () => {
    if (!member) return;
    if (!formData.email.trim() || !emailVerified) {
      toast({
        title: "Email Required",
        description: "Verify the member's email before resending a collector invite.",
        variant: "destructive",
      });
      return;
    }

    setResendingInvite(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : undefined;
      const response = await memberApi.resendCollectorInvite(member.member_id, baseUrl);
      if (!response.success) {
        throw new Error(response.error || "Failed to resend invite");
      }
      toast({
        title: "Invite Resent",
        description: `A fresh password setup link was sent to ${formData.email}. Previous links are no longer valid.`,
      });
    } catch (error) {
      toast({
        title: "Resend Failed",
        description: error instanceof Error ? error.message : "Failed to resend collector invite",
        variant: "destructive",
      });
    } finally {
      setResendingInvite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member) return;

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

    if (isCollector && !formData.email.trim()) {
      toast({
        title: "Email Required",
        description: "Email address is required to set a member as a collector.",
        variant: "destructive",
      });
      return;
    }

    if (isCollector && !emailVerified) {
      toast({
        title: "Email Verification Required",
        description: "Please verify the email address before setting a member as a collector.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : undefined;
      const input: UpdateMemberInput = {
        full_name: formData.fullName.trim(),
        dob: formData.dob ? format(formData.dob, "yyyy-MM-dd") : null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        membership_number: formData.membershipNumber.trim() || null,
        phone_verified: isActive ? phoneVerified : false,
        // If setting to inactive, also unverify email; otherwise keep OTP result
        email_verified: isActive ? emailVerified : false,
        ...(isCollector
          ? {
              isCollector: true,
              baseUrl,
            }
          : {}),
      };

      const response = await memberApi.update(member.member_id, input);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update member');
      }

      toast({
        title: "Member Updated",
        description: isCollector
          ? `${formData.fullName} has been updated and promoted to collector. A welcome email with password setup link has been sent to ${formData.email}.`
          : `${formData.fullName} has been updated successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update member",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
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

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  placeholder="XXX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (!phoneVerified) {
                      setPhoneOtpSent(false);
                      setPhoneOtp("");
                      setPhoneUssdCode(null);
                    }
                  }}
                  disabled={phoneVerified}
                  className={cn(phoneVerified && "bg-success/10 border-success")}
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
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
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
                  <OtpUssdHint ussdCode={phoneUssdCode} />
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (!emailVerified) {
                      setEmailOtpSent(false);
                      setEmailOtp("");
                    }
                  }}
                  disabled={emailVerified}
                  className={cn(emailVerified && "bg-success/10 border-success")}
                />
                {!emailVerified && (
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

            {/* Collector Option — only admins can assign collector role */}
            {!isOfficer && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isCollector"
                    checked={isCollector}
                    onCheckedChange={(checked) => setIsCollector(checked)}
                  />
                  <Label
                    htmlFor="isCollector"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Set as Collector
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Grant admin portal access. A password setup link (expires in 1 hour) will be sent to their email.
                </p>
                {emailVerified && formData.email.trim() && (
                  <div className="pl-6">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendCollectorInvite}
                      disabled={resendingInvite || saving}
                    >
                      {resendingInvite ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Resend collector invite
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use this if their password link expired. Prior links stop working when you resend.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Membership Number */}
            <div className="space-y-2">
              <Label htmlFor="membershipNumber">Membership Number</Label>
              <Input
                id="membershipNumber"
                placeholder="Optional unique ID"
                value={formData.membershipNumber}
                onChange={(e) => setFormData({ ...formData, membershipNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Optional unique identifier for this member</p>
            </div>

            {/* Active Status Toggle */}
            <div className="flex items-center justify-between space-x-2 py-2 border-t border-border">
              <div className="space-y-0.5">
                <Label htmlFor="active-status">Account Status</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Member is active" : "Member is inactive"}
                </p>
              </div>
              <Switch
                id="active-status"
                checked={isActive}
                onCheckedChange={(checked) => {
                  setIsActive(checked);
                  // If setting to inactive, unverify phone
                  if (!checked && phoneVerified) {
                    setPhoneVerified(false);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


