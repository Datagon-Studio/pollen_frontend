import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExternalLink, Copy, Check, Wallet, Receipt, Eye, EyeOff, Lock, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import { accountApi } from "@/services/account.api";
import { configApi, ExpenseVisibilityLevel } from "@/services/config.api";
import { accountPublicPageApi } from "@/services/account-public-page.api";
import { expenseApi, Expense } from "@/services/expense.api";
import { contributionApi, Contribution } from "@/services/contribution.api";
import { memberApi } from "@/services/member.api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark",
  "Events": "bg-gold/20 text-charcoal",
  "Utilities": "bg-muted text-muted-foreground",
};

export default function PublicSettings() {
  const { user } = useAuth();
  const { account, loading: accountLoading } = useAccount(user?.id);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState("funds");
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  
  // OTP verification states
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  
  // Color states
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [expensesTabVisible, setExpensesTabVisible] = useState(true);
  const [expenseVisibilityLevel, setExpenseVisibilityLevel] = useState<ExpenseVisibilityLevel>('summary');
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Load account data, config, public page, and expenses
  useEffect(() => {
    if (account) {
      loadPublicPage();
      loadConfig();
      loadExpenses();
    }
  }, [account]);

  const loadPublicPage = async () => {
    try {
      const publicPage = await accountPublicPageApi.getMyPublicPage();
      setPrimaryColor(publicPage.primary_color || "#000000");
      setSecondaryColor(publicPage.secondary_color || "#ffffff");
    } catch (error) {
      console.error("Error loading public page:", error);
      // Fallback to defaults if public page doesn't exist yet
      setPrimaryColor("#000000");
      setSecondaryColor("#ffffff");
    }
  };

  // Update expenses tab visibility based on expense visibility level
  useEffect(() => {
    // Show expenses tab if visibility level is not 'none'
    setExpensesTabVisible(expenseVisibilityLevel !== 'none');
  }, [expenseVisibilityLevel]);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const config = await configApi.getMyConfig();
      setExpenseVisibilityLevel(config.expense_visibility_level);
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Switch to funds tab if expenses tab is hidden and user is on expenses tab
  useEffect(() => {
    if (!expensesTabVisible && previewTab === "expenses") {
      setPreviewTab("funds");
    }
  }, [expensesTabVisible, previewTab]);

  const loadExpenses = async () => {
    if (!account) return;
    try {
      setLoadingExpenses(true);
      const allExpenses = await expenseApi.getAll();
      setExpenses(allExpenses);
      
      // Also load all contributions for summary calculation
      const contributionsData = await contributionApi.getByAccount(account.account_id);
      if (contributionsData.success && contributionsData.data) {
        setAllContributions(contributionsData.data);
      }
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } finally {
      setLoadingExpenses(false);
    }
  };


  const handleSave = async () => {
    if (!account) return;
    try {
      setSaving(true);
      await Promise.all([
        accountPublicPageApi.updateMyPublicPage({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        }),
        configApi.updateMyConfig({
          expense_visibility_level: expenseVisibilityLevel,
        }),
      ]);
      toast({
        title: "Success",
        description: "Public settings saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8080";
  const publicUrl = account ? `${baseUrl}/group/${account.account_id}` : "";

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter expenses based on visibility level
  const visibleExpenses = useMemo(() => {
    if (expenseVisibilityLevel === 'none') {
      return [];
    } else if (expenseVisibilityLevel === 'summary') {
      return []; // Summary will show totals, not individual expenses
    } else {
      // detailed - show expenses marked as member_visible
      return expenses.filter(e => e.member_visible);
    }
  }, [expenses, expenseVisibilityLevel]);

  // Calculate totals for summary view
  const expenseSummary = useMemo(() => {
    if (expenseVisibilityLevel !== 'summary') return null;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    // Use all contributions for summary, not just verified member's
    const totalContributions = allContributions
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    const netPosition = totalContributions - totalExpenses;
    return { totalExpenses, totalContributions, netPosition };
  }, [expenses, allContributions, expenseVisibilityLevel]);

  const loadMemberData = async (memberId: string) => {
    try {
      const contributionsData = await contributionApi.getByMember(memberId);
      if (contributionsData.success && contributionsData.data) {
        setContributions(contributionsData.data);
      }
    } catch (error) {
      console.error("Failed to load contributions:", error);
    }
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (!account?.account_id) {
      toast({
        title: "Error",
        description: "Account information not available",
        variant: "destructive",
      });
      return;
    }
    
    setSendingOtp(true);
    try {
      const response = await memberApi.sendOTP(phone, account.account_id);
      if (response.success) {
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${phone}`,
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
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
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
        description: "Account information not available",
        variant: "destructive",
      });
      return;
    }
    
    setVerifying(true);
    try {
      const response = await memberApi.verifyOTP(phone, otp, account.account_id);
      if (response.success && response.data) {
        setMemberId(response.data.member_id);
        setIsVerified(true);
        setShowOtpVerification(false);
        
        // Load member data
        await loadMemberData(response.data.member_id);
        
        // Set contributions tab as default after verification
        setPreviewTab("contributions");
        
        toast({
          title: "Verified",
          description: "You now have access to view your contributions",
        });
      } else {
        throw new Error(response.error || 'Invalid OTP');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestAccess = () => {
    setShowOtpVerification(true);
  };

  // Contribution table columns
  const contributionColumns = useMemo(() => [
    {
      key: "date",
      header: "Date",
      render: (item: Contribution) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(item.date_received), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      render: (item: Contribution) => (
        <span style={{ color: primaryColor }}>
          ${Number(item.amount).toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: Contribution) => (
        <span className="text-xs capitalize" style={{ color: primaryColor }}>
          {item.status}
        </span>
      ),
    },
  ], [primaryColor]);

  if (accountLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!account) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Account not found</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Public Settings"
        description="Configure your public-facing contribution page"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Preview */}
        <div className="order-2 xl:order-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-background">
            {/* Mock browser bar */}
            <div className="bg-secondary border-b border-border px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-destructive/50" />
                <div className="h-3 w-3 rounded-full bg-amber/50" />
                <div className="h-3 w-3 rounded-full bg-success/50" />
              </div>
              <div className="flex-1 bg-card border border-border rounded px-3 py-1 text-xs text-muted-foreground ml-2">
                {publicUrl}
              </div>
            </div>

            {/* Preview content */}
            <div 
              className="p-8 min-h-[500px]"
              style={{ 
                backgroundColor: "#FFFFFF",
                color: primaryColor 
              }}
            >
              <div className="max-w-md mx-auto text-center">
                {/* Logo */}
                {account.account_logo && (
                  <div className="mb-4">
                    <img 
                      src={account.account_logo} 
                      alt={account.account_name || "Logo"} 
                      className="h-16 w-16 rounded-xl mx-auto object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}

                <h1 
                  className="text-2xl font-bold mb-2"
                  style={{ color: "#000000" }}
                >
                  {account.account_name || "Community Group"}
                </h1>
                <p 
                  className="mb-6 opacity-80"
                  style={{ color: "#000000" }}
                >
                  Support our community by contributing to our active funds
                </p>

                {/* Public page tabs */}
                <Tabs value={previewTab} onValueChange={setPreviewTab} className="mb-6">
                  <TabsList className="bg-secondary/50 w-full">
                    <TabsTrigger value="funds" className="flex-1">
                      <Wallet className="h-4 w-4 mr-2" />
                      Funds
                    </TabsTrigger>
                    {expensesTabVisible && (
                      <TabsTrigger value="expenses" className="flex-1">
                        <Receipt className="h-4 w-4 mr-2" />
                        Expenses
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="contributions" className="flex-1">
                      <Receipt className="h-4 w-4 mr-2" />
                      My Contributions
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="funds" className="mt-4">
                    <div className="space-y-3">
                      <p className="text-sm opacity-70" style={{ color: primaryColor }}>
                        Funds will appear here
                      </p>
                    </div>
                  </TabsContent>


                  {expensesTabVisible && (
                    <TabsContent value="expenses" className="mt-4">
                      <div className="space-y-2 text-left">
                        {expenseVisibilityLevel === 'none' ? (
                          <p className="text-sm opacity-70 text-center" style={{ color: primaryColor }}>
                            Expense information is not available
                          </p>
                        ) : expenseVisibilityLevel === 'summary' ? (
                          expenseSummary ? (
                            <div className="space-y-3">
                              <div className="bg-card/50 border border-border/50 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm opacity-80" style={{ color: primaryColor }}>
                                    Total Contributions
                                  </span>
                                  <span className="font-semibold" style={{ color: primaryColor }}>
                                    ${expenseSummary.totalContributions.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm opacity-80" style={{ color: primaryColor }}>
                                    Total Expenses
                                  </span>
                                  <span className="font-semibold" style={{ color: primaryColor }}>
                                    ${expenseSummary.totalExpenses.toFixed(2)}
                                  </span>
                                </div>
                                <div className="border-t border-border/50 pt-2 mt-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium" style={{ color: primaryColor }}>
                                      Net Position
                                    </span>
                                    <span 
                                      className={cn(
                                        "font-bold",
                                        expenseSummary.netPosition >= 0 ? "text-success" : "text-destructive"
                                      )}
                                      style={{ color: expenseSummary.netPosition >= 0 ? undefined : primaryColor }}
                                    >
                                      ${expenseSummary.netPosition.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm opacity-70 text-center" style={{ color: primaryColor }}>
                              Loading summary...
                            </p>
                          )
                        ) : (
                          // detailed view
                          visibleExpenses.length === 0 ? (
                            <p className="text-sm opacity-70 text-center" style={{ color: primaryColor }}>
                              No expenses visible
                            </p>
                          ) : (
                            visibleExpenses.map((expense) => {
                              const dateValue = expense.date ? new Date(expense.date) : new Date();
                              return (
                                <div
                                  key={expense.expense_id}
                                  className="bg-card/50 border border-border/50 rounded-lg p-3"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={cn(
                                        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                                        categoryColors[expense.expense_category] || "bg-secondary text-secondary-foreground"
                                      )}
                                    >
                                      {expense.expense_category}
                                    </span>
                                    <span className="font-semibold" style={{ color: primaryColor }}>
                                      ${Number(expense.amount).toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-sm" style={{ color: primaryColor }}>
                                    {expense.expense_name}
                                  </p>
                                  <p className="text-xs opacity-70 mt-1" style={{ color: primaryColor }}>
                                    {format(dateValue, "MMM d, yyyy")}
                                  </p>
                                </div>
                              );
                            })
                          )
                        )}
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="contributions" className="mt-4">
                    {!isVerified ? (
                      <div className="bg-card/50 border border-border/50 rounded-lg p-6 text-center">
                        <Lock className="h-12 w-12 mx-auto mb-4 opacity-70" style={{ color: primaryColor }} />
                        <p className="mb-4 opacity-70" style={{ color: primaryColor }}>
                          Verify to see your contributions
                        </p>
                        <Button 
                          onClick={handleRequestAccess}
                          style={{ backgroundColor: primaryColor, color: secondaryColor }}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Verify
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {contributions.length === 0 ? (
                          <p className="text-sm opacity-70 text-center" style={{ color: primaryColor }}>
                            No contributions found
                          </p>
                        ) : (
                          <DataTable
                            columns={contributionColumns as any}
                            data={contributions as any}
                            emptyMessage="No contributions found"
                          />
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* OTP Verification Modal */}
                {showOtpVerification && !isVerified && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ position: 'absolute' }}>
                    <Card className="w-full max-w-md bg-card border-border">
                      <CardHeader>
                        <CardTitle>Verify Your Identity</CardTitle>
                        <CardDescription>
                          Enter your verified phone number to access your contributions
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="preview-phone">Phone Number</Label>
                          <div className="flex gap-2">
                            <Input
                              id="preview-phone"
                              placeholder="XXX XXX XXXX"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              disabled={otpSent}
                            />
                            {!otpSent && (
                              <Button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={sendingOtp || !phone.trim()}
                              >
                                {sendingOtp ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send OTP
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {otpSent && (
                          <div className="space-y-2">
                            <Label htmlFor="preview-otp">Enter OTP Code</Label>
                            <div className="flex gap-2">
                              <Input
                                id="preview-otp"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                maxLength={6}
                                className="text-center text-2xl tracking-widest font-mono"
                              />
                              <Button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={verifying || !otp.trim()}
                              >
                                {verifying ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Verify"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowOtpVerification(false);
                              setOtpSent(false);
                              setPhone("");
                              setOtp("");
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <p className="text-xs opacity-60" style={{ color: "#000000" }}>
                  Powered by Pollean
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="order-1 xl:order-2 space-y-6">
          {/* Public URL */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-medium text-foreground mb-4">Public URL</h3>
            <div>
              <Label className="text-sm text-muted-foreground">Your public page URL</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={publicUrl} readOnly className="bg-secondary" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Share this URL to allow others to view your public page
              </p>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-medium text-foreground mb-4">Branding</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 mt-1.5">
                  <div 
                    className="rounded-lg overflow-hidden relative"
                    style={{ backgroundColor: primaryColor, width: '80px', height: '40px' }}
                  >
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      style={{ 
                        border: 'none',
                        outline: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                    />
                  </div>
                  <Input
                    type="text"
                    value={primaryColor.toUpperCase()}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    placeholder="#000000"
                    className="w-24 uppercase"
                  />
                </div>
              </div>

              <div>
                <Label>Secondary Color</Label>
                <div className="flex gap-2 mt-1.5">
                  <div 
                    className="rounded-lg overflow-hidden relative"
                    style={{ backgroundColor: secondaryColor, width: '80px', height: '40px' }}
                  >
                    <Input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                      style={{ 
                        border: 'none',
                        outline: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                    />
                  </div>
                  <Input
                    type="text"
                    value={secondaryColor.toUpperCase()}
                    onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                    placeholder="#ffffff"
                    className="w-24 uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expense Visibility */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Expense Visibility</h3>

            </div>
            
            {/* Expense Visibility Level - 3-way toggle */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Expense Visibility Level</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={expenseVisibilityLevel === 'none' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpenseVisibilityLevel('none')}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  None
                </Button>
                <Button
                  type="button"
                  variant={expenseVisibilityLevel === 'summary' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpenseVisibilityLevel('summary')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Summary
                </Button>
                <Button
                  type="button"
                  variant={expenseVisibilityLevel === 'detailed' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpenseVisibilityLevel('detailed')}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Detailed
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {expenseVisibilityLevel === 'none' && 'No expense information is shown to members'}
                {expenseVisibilityLevel === 'summary' && 'Members see totals and net position only'}
                {expenseVisibilityLevel === 'detailed' && 'Members see individual expenses marked as visible. Individual expense visibility can be managed from the Expenses page in the admin panel.'}
              </p>
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
