import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Check, Loader2, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  format,
  getYear,
  getMonth,
  setMonth as setMonthDate,
  setYear as setYearDate,
} from "date-fns";
import type { CaptionProps } from "react-day-picker";
import { memberApi } from "@/services";
import { accountApi } from "@/services/account.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrandSymbol } from "@/components/ui/brand";

// DatePicker component with custom caption
interface DatePickerWithInputsProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  fromYear?: number;
  toYear?: number;
}

function DatePickerWithInputs({
  selected,
  onSelect,
  fromYear = 1920,
  toYear = new Date().getFullYear(),
}: DatePickerWithInputsProps) {
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
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
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
          <Label htmlFor="year-input" className="text-xs text-muted-foreground">
            Year:
          </Label>
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

  // Phone OTP states
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);

  // Email OTP states
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

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
      const response = await memberApi.sendRegistrationOTP(
        formData.phone.trim(),
        accountId,
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to send OTP");
      }

      setPhoneOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formData.phone}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send OTP",
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
        accountId,
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to verify OTP");
      }

      setPhoneVerified(true);
      toast({
        title: "Phone Verified",
        description: "Phone number has been verified successfully.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description:
          error instanceof Error
            ? error.message
            : "Invalid or expired OTP code",
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

    if (!accountId || !account) {
      toast({
        title: "Error",
        description: "Group information not found",
        variant: "destructive",
      });
      return;
    }

    setEmailSending(true);
    try {
      const response = await memberApi.sendRegistrationEmailOTP(
        formData.email.trim(),
        accountId,
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to send OTP");
      }

      setEmailOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formData.email}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send OTP",
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

    if (!accountId || !account) {
      toast({
        title: "Error",
        description: "Group information not found",
        variant: "destructive",
      });
      return;
    }

    setEmailVerifying(true);
    try {
      const response = await memberApi.verifyRegistrationEmailOTP(
        formData.email.trim(),
        emailOtp.trim(),
        accountId,
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to verify OTP");
      }

      setEmailVerified(true);
      toast({
        title: "Email Verified",
        description: "Email address has been verified successfully.",
      });
    } catch (error) {
      toast({
        title: "Verification Failed",
        description:
          error instanceof Error
            ? error.message
            : "Invalid or expired OTP code",
        variant: "destructive",
      });
    } finally {
      setEmailVerifying(false);
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
        description:
          "Please verify your phone number before joining the group.",
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

      // Use public registration endpoint that doesn't require authentication
      const response = await memberApi.register({
        accountId: accountId!,
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        dob: formData.dob ? format(formData.dob, "yyyy-MM-dd") : null,
        email: formData.email.trim() || null,
        membership_number: formData.membershipNumber.trim() || null,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to register member");
      }

      const successMessage = `Welcome ${formData.fullName}! You've been added to the group.`;

      toast({
        title: "Success",
        description: successMessage,
      });

      // Redirect to public group page after a short delay
      setTimeout(() => {
        navigate(`/group/${accountId}`);
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to join group",
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
            <div className="h-16 w-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-md">
              <BrandSymbol className="h-10 w-10" alt="Pollean" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Join Group</CardTitle>
          <CardDescription className="text-center">
            Register as a member of{" "}
            <span className="font-bold">
              {account?.account_name || "this group"}
            </span>
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
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
              />
            </div>

            {/* Membership ID/Number */}
            <div className="space-y-2">
              <Label htmlFor="membershipNumber">
                Membership ID/Number (Optional)
              </Label>
              <Input
                id="membershipNumber"
                placeholder="Optional unique ID"
                value={formData.membershipNumber}
                onChange={(e) =>
                  setFormData({ ...formData, membershipNumber: e.target.value })
                }
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
                      !formData.dob && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dob ? format(formData.dob, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-card border-border shadow-lg"
                  align="start"
                >
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
                  className={cn(
                    phoneVerified && "bg-success/10 border-success",
                  )}
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
                  className={cn(
                    emailVerified && "bg-success/10 border-success",
                  )}
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
