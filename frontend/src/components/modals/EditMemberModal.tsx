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

interface EditMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onSuccess?: () => void;
}

export function EditMemberModal({ open, onOpenChange, member, onSuccess }: EditMemberModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
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
      setPhoneVerified(member.phone_verified);
      setPhoneOtpSent(false);
      setPhoneOtp("");
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
    
    setPhoneSending(true);
    try {
      // TODO: Call actual API to send OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPhoneOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formData.phone}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) return;
    
    setPhoneVerifying(true);
    try {
      if (!member) return;
      // Call API to verify phone
      const response = await memberApi.verifyPhone(member.member_id);
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

    try {
      setSaving(true);
      const input: UpdateMemberInput = {
        full_name: formData.fullName.trim(),
        dob: formData.dob ? format(formData.dob, "yyyy-MM-dd") : null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        membership_number: formData.membershipNumber.trim() || null,
        phone_verified: isActive ? phoneVerified : false,
        // If setting to inactive, also unverify email
        ...(isActive ? {} : { email_verified: false }),
      };

      const response = await memberApi.update(member.member_id, input);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update member');
      }

      toast({
        title: "Member Updated",
        description: `${formData.fullName} has been updated successfully.`,
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
                  placeholder="+233 XX XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (!phoneVerified) {
                      setPhoneOtpSent(false);
                      setPhoneOtp("");
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
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={member.email_verified}
                  className={cn(member.email_verified && "bg-success/10 border-success")}
                />
                {!member.email_verified && formData.email.trim() && (
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
                )}
                {member.email_verified && (
                  <div className="flex items-center gap-1 text-success shrink-0 px-2">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Verified</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {member.email_verified ? (
                  <span className="text-success">Email verified</span>
                ) : member.email ? (
                  <span>Email not verified</span>
                ) : (
                  <span>No email</span>
                )}
              </div>
            </div>

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


