import { useState, useMemo, useEffect } from "react";
import * as React from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Send, Copy, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, getYear, getMonth, setMonth as setMonthDate, setYear as setYearDate } from "date-fns";
import { memberApi } from "@/services";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import type { CaptionProps } from "react-day-picker";
import { OtpUssdHint } from "@/components/ui/otp-ussd-hint";

// DatePicker component with custom caption
interface DatePickerWithInputsProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
}

function DatePickerWithInputs({ selected, onSelect, fromYear = 1920, toYear = new Date().getFullYear() }: DatePickerWithInputsProps) {
  const [month, setMonthState] = useState<Date>(selected || new Date());
  
  // Custom Caption component with typeable month/year inputs
  function CustomCaption(props: CaptionProps) {
    const { displayMonth } = props;
    const currentYear = getYear(displayMonth);
    const currentMonth = getMonth(displayMonth);
    
    const [yearInput, setYearInput] = useState(String(currentYear));

    const handleYearChange = (value: string) => {
      setYearInput(value);
      const yearNum = parseInt(value);
      if (!isNaN(yearNum) && yearNum >= fromYear && yearNum <= toYear) {
        const newDate = setYearDate(displayMonth, yearNum);
        setMonthState(newDate);
      }
    };

    const handleYearBlur = () => {
      const yearNum = parseInt(yearInput);
      if (isNaN(yearNum) || yearNum < fromYear || yearNum > toYear) {
        setYearInput(String(currentYear));
      }
    };

    const handlePreviousMonth = () => {
      const newDate = new Date(displayMonth);
      newDate.setMonth(newDate.getMonth() - 1);
      setMonthState(newDate);
    };

    const handleNextMonth = () => {
      const newDate = new Date(displayMonth);
      newDate.setMonth(newDate.getMonth() + 1);
      setMonthState(newDate);
    };

    // Update inputs when displayMonth changes externally
    useEffect(() => {
      setYearInput(String(getYear(displayMonth)));
    }, [displayMonth]);

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[currentMonth];

    return (
      <div className="flex items-center gap-3 px-1 py-2">
        {/* Navigation arrows on the left */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="h-7 w-7 p-0"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-7 w-7 p-0"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Month name */}
        <div className="text-sm font-medium text-foreground min-w-[80px]">
          {monthName}
        </div>
        
        {/* Year input */}
        <div className="flex items-center gap-1 ml-auto">
          <Label htmlFor="year-input" className="text-xs text-muted-foreground">Year:</Label>
          <Input
            id="year-input"
            type="number"
            min={fromYear}
            max={toYear}
            value={yearInput}
            onChange={(e) => handleYearChange(e.target.value)}
            onBlur={handleYearBlur}
            className="h-7 w-20 text-center text-sm px-1"
            placeholder="YYYY"
          />
        </div>
      </div>
    );
  }

  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={onSelect}
      month={month}
      onMonthChange={(date) => setMonthState(date)}
      initialFocus
      className="p-3 pointer-events-auto"
      fromYear={fromYear}
      toYear={toYear}
      components={{
        Caption: CustomCaption,
      }}
    />
  );
}

interface AddMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddMemberModal({ open, onOpenChange, onSuccess }: AddMemberModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { account } = useAccount(user?.id);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    membershipNumber: "",
    dob: undefined as Date | undefined,
    phone: "",
    email: "",
    isCollector: false,
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
  const [phoneUssdCode, setPhoneUssdCode] = useState<string | null>(null);

  // Generate invite link
  const generateInviteLink = () => {
    if (!account?.account_id) return "";
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/group/${account.account_id}/join`;
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

    if (!account?.account_id) {
      toast({
        title: "Error",
        description: "Account not found",
        variant: "destructive",
      });
      return;
    }
    
    setEmailSending(true);
    try {
      const response = await memberApi.sendRegistrationEmailOTP(formData.email.trim(), account.account_id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to send OTP');
      }

      setEmailOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formData.email}`,
      });
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

    if (!account?.account_id) {
      toast({
        title: "Error",
        description: "Account not found",
        variant: "destructive",
      });
      return;
    }
    
    setEmailVerifying(true);
    try {
      const response = await memberApi.verifyRegistrationEmailOTP(
        formData.email.trim(),
        emailOtp.trim(),
        account.account_id
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to verify OTP');
      }

      setEmailVerified(true);
      toast({
        title: "Email Verified",
        description: "Email address has been verified successfully.",
      });
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
      setPhoneUssdCode(response.ussd_code ?? null);
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

    if (formData.isCollector && !formData.email.trim()) {
      toast({
        title: "Email Required",
        description: "Email address is required to set a member as a collector.",
        variant: "destructive",
      });
      return;
    }

    if (formData.isCollector && !emailVerified) {
      toast({
        title: "Email Verification Required",
        description: "Please verify the email address before setting a member as a collector.",
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
        isCollector: formData.isCollector,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create member');
      }

      toast({
        title: "Member Added",
        description: formData.isCollector 
          ? `${formData.fullName} has been added as a collector. A welcome email with password setup link has been sent to ${formData.email}.`
          : `${formData.fullName} has been added successfully.`,
      });

      // Reset form
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('[AddMemberModal] Error creating member:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create member";
      toast({
        title: "Error",
        description: errorMessage.includes('fetch') || errorMessage.includes('Network') 
          ? "Unable to connect to server. Please check your connection and try again."
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ fullName: "", membershipNumber: "", dob: undefined, phone: "", email: "", isCollector: false });
    setEmailOtpSent(false);
    setEmailOtp("");
    setEmailVerified(false);
    setPhoneOtpSent(false);
    setPhoneOtp("");
    setPhoneVerified(false);
    setPhoneUssdCode(null);
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
                      "w-full justify-start text-left font-normal h-10 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm hover:bg-accent hover:text-accent-foreground",
                      !formData.dob && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {formData.dob ? format(formData.dob, "PPP") : "Select date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border shadow-lg" align="start">
                  <DatePickerWithInputs
                    selected={formData.dob}
                    onSelect={(date) => setFormData({ ...formData, dob: date })}
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
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
                    setPhoneUssdCode(null);
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
              <Label htmlFor="email">
                Email {formData.isCollector ? "*" : "(Optional)"}
              </Label>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendEmailOtp}
                  disabled={emailSending || emailVerified || !formData.email.trim()}
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

            {/* Collector Option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isCollector"
                  checked={formData.isCollector}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isCollector: checked === true })
                  }
                />
                <Label
                  htmlFor="isCollector"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Set as Collector
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Grant admin portal access. A magic link will be sent to their email to set up their password and log in.
              </p>
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
