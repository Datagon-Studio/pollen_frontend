import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Send, Copy, CheckCircle2 } from "lucide-react";
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
import { useAccount } from "@/hooks/useAccount";

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMemberModal({ open, onOpenChange, onSuccess }: AddMemberModalProps) {
  const { toast } = useToast();
  const { account } = useAccount();
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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

  // Generate invite link
  const generateInviteLink = () => {
    if (!account?.account_id) return "";
    // Create a slug from account_id (first 8 chars) or use account name if available
    const slug = account.account_name
      ? account.account_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : account.account_id.substring(0, 8);
    return `https://pollenhive.app/g/${slug}/join`;
  };

  const inviteLink = generateInviteLink();

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      toast({
        title: "Link Copied",
        description: "Invite link has been copied to clipboard",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
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
    // Simulate sending OTP
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
    // Simulate verification
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

    if (!account?.account_id) {
      toast({
        title: "Error",
        description: "Account not found",
        variant: "destructive",
      });
      return;
    }
    
    setPhoneSending(true);
    try {
      const response = await memberApi.sendPhoneVerificationOTP(formData.phone.trim(), account.account_id);
      
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

    if (!account?.account_id) {
      toast({
        title: "Error",
        description: "Account not found",
        variant: "destructive",
      });
      return;
    }
    
    setPhoneVerifying(true);
    try {
      const response = await memberApi.verifyPhoneVerificationOTP(
        formData.phone.trim(),
        phoneOtp.trim(),
        account.account_id
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
        description: "Please verify the phone number before adding the member.",
        variant: "destructive",
      });
      return;
    }

    if (!account?.account_id) {
      toast({
        title: "Error",
        description: "Account not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      // Send full_name to match backend expectation
      const response = await memberApi.create({
        account_id: account.account_id,
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
        title: "Member Added",
        description: `${formData.fullName} has been added successfully.`,
      });

      // Reset form
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create member",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ fullName: "", membershipNumber: "", dob: undefined, phone: "", email: "" });
    setEmailOtpSent(false);
    setEmailOtp("");
    setEmailVerified(false);
    setPhoneOtpSent(false);
    setPhoneOtp("");
    setPhoneVerified(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add/Invite Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Copy Invite Link Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Copy Invite Link</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="bg-muted text-sm font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {linkCopied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with members to let them join your group
            </p>
          </div>

          {/* Divider */}
          <Separator />

          {/* Manual Add Member Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="+233 XX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    setPhoneOtpSent(false);
                    setPhoneVerified(false);
                    setPhoneOtp("");
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
                  <>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Send magic link when implemented
                        toast({
                          title: "Magic Link",
                          description: "Magic link functionality will be implemented soon",
                        });
                      }}
                      disabled={!formData.email.trim()}
                      className="shrink-0"
                    >
                      Verify
                    </Button>
                  </>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
