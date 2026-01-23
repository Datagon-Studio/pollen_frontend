import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Wallet, Receipt, CheckCircle2, Loader2, Send, Lock, Search, Filter, CalendarIcon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fundApi, Fund } from "@/services/fund.api";
import { contributionApi, Contribution } from "@/services/contribution.api";
import { expenseApi, Expense } from "@/services/expense.api";
import { useToast } from "@/hooks/use-toast";
import { accountApi, Account } from "@/services/account.api";
import { memberApi } from "@/services/member.api";
import { ContributeConfirmationModal } from "@/components/modals/ContributeConfirmationModal";
import { PaystackPaymentModal } from "@/components/modals/PaystackPaymentModal";

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark",
  "Events": "bg-gold/20 text-charcoal",
  "Utilities": "bg-muted text-muted-foreground",
  "Maintenance": "bg-charcoal/10 text-charcoal",
};

const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_STORAGE_KEY = 'public_group_session';

export default function PublicGroupPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [publicFunds, setPublicFunds] = useState<Fund[]>([]);
  const [fundStats, setFundStats] = useState<Record<string, { totalCollected: number; contributorCount: number }>>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [activeTab, setActiveTab] = useState("funds");
  
  // Filter states for contributions
  const [contributionSearch, setContributionSearch] = useState("");
  const [contributionFundFilter, setContributionFundFilter] = useState("all");
  const [contributionStatusFilter, setContributionStatusFilter] = useState("all");
  const [contributionStartDate, setContributionStartDate] = useState<Date | undefined>(undefined);
  const [contributionEndDate, setContributionEndDate] = useState<Date | undefined>(undefined);
  
  // Filter states for expenses
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  
  // OTP verification states
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string | null>(null);

  // Contribution/Payment states
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Session management
  const saveSession = (memberId: string, memberName: string, phone: string) => {
    const sessionData = {
      memberId,
      memberName,
      phone,
      accountId: accountId || '',
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  };

  const loadSession = () => {
    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData);
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      
      // Check if session is for the current account
      if (session.accountId !== accountId) {
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setIsVerified(false);
    setMemberId(null);
    setMemberName(null);
    setContributions([]);
    setPhone("");
    setOtp("");
    setOtpSent(false);
  };

  useEffect(() => {
    if (accountId) {
      loadData();
      
      // Restore session on mount
      const session = loadSession();
      if (session) {
        setMemberId(session.memberId);
        setMemberName(session.memberName);
        setIsVerified(true);
        loadMemberData(session.memberId);
      }
      
      // Check session timeout every 30 seconds (only for public page, not admin)
      const timeoutInterval = setInterval(() => {
        // Only check if we're still on the public page
        if (window.location.pathname.startsWith('/group')) {
          const currentSession = loadSession();
          if (!currentSession && isVerified) {
            clearSession();
            toast({
              title: "Session Expired",
              description: "Your session has expired. Please verify again to continue.",
              variant: "destructive",
            });
          }
        }
      }, 30000);
      
      return () => clearInterval(timeoutInterval);
    }
  }, [accountId, isVerified, toast]);

  // Switch to funds tab if expenses tab is hidden and user is on expenses tab
  useEffect(() => {
    if (account && activeTab === "expenses") {
      const expensesTabVisible = account.expenses_tab_visible !== null ? account.expenses_tab_visible : true;
      if (!expensesTabVisible) {
        setActiveTab("funds");
      }
    }
  }, [account, activeTab]);

  const loadData = async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      console.log('[PublicGroupPage] Loading group:', accountId);
      
      // Parallelize data loading for better performance
      const [accountResult, fundsResult, expensesResult] = await Promise.allSettled([
        accountApi.getPublic(accountId),
        fundApi.getPublicByAccount(accountId),
        expenseApi.getPublicByAccount(accountId),
      ]);
      
      // Handle account data
      if (accountResult.status === 'fulfilled') {
        setAccount(accountResult.value);
      } else {
        console.error("Failed to load account:", accountResult.reason);
        toast({
          title: "Error",
          description: "Group not found",
          variant: "destructive",
        });
        return;
      }
      
      // Handle funds data
      if (fundsResult.status === 'fulfilled') {
        const funds = fundsResult.value;
        setPublicFunds(funds);
        
        // Fetch stats for each fund
        const statsMap: Record<string, { totalCollected: number; contributorCount: number }> = {};
        await Promise.all(
          funds.map(async (fund) => {
            try {
              const statsResponse = await contributionApi.getFundStats(fund.fund_id);
              if (statsResponse.success && statsResponse.data) {
                statsMap[fund.fund_id] = {
                  totalCollected: statsResponse.data.totalCollected || 0,
                  contributorCount: statsResponse.data.contributorCount || 0,
                };
              } else {
                statsMap[fund.fund_id] = { totalCollected: 0, contributorCount: 0 };
              }
            } catch (error) {
              console.error(`Failed to load stats for fund ${fund.fund_id}:`, error);
              statsMap[fund.fund_id] = { totalCollected: 0, contributorCount: 0 };
            }
          })
        );
        setFundStats(statsMap);
      } else {
        console.error("Failed to load funds:", fundsResult.reason);
      }
      
      // Handle expenses data
      if (expensesResult.status === 'fulfilled') {
        setExpenses(expensesResult.value.filter(e => e.member_visible));
      } else {
        console.error("Failed to load expenses:", expensesResult.reason);
      }
    } catch (error) {
      console.error('[PublicGroupPage] Error loading group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Group not found';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMemberData = async (memberId: string) => {
    try {
      console.log('[PublicGroupPage] Loading contributions for member:', memberId);
      const contributionsData = await contributionApi.getByMember(memberId);
      console.log('[PublicGroupPage] Contributions response:', contributionsData);
      if (contributionsData.success && contributionsData.data) {
        console.log('[PublicGroupPage] Setting contributions:', contributionsData.data.length, 'contributions');
        setContributions(contributionsData.data);
      } else {
        console.log('[PublicGroupPage] No contributions found or error:', contributionsData.error);
        setContributions([]);
      }
    } catch (error) {
      console.error("[PublicGroupPage] Failed to load contributions:", error);
      setContributions([]);
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
        const memberId = response.data.member_id;
        const memberName = response.data.full_name;
        
        setMemberId(memberId);
        setMemberName(memberName);
        setIsVerified(true);
        setShowOtpVerification(false);
        
        // Save session to localStorage
        saveSession(memberId, memberName, phone);
        
        // Load member data (contributions)
        await loadMemberData(memberId);
        
        // Set contributions tab as default after verification
        setActiveTab("contributions");
        
        toast({
          title: `Welcome, ${memberName}!`,
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

  const handleLogout = () => {
    clearSession();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const handleRequestAccess = () => {
    setShowOtpVerification(true);
  };

  // All hooks must be called before any conditional returns
  const backgroundColor = account?.background_color || "#ffffff";
  const foregroundColor = account?.foreground_color || "#000000";

  // Get unique funds and categories for filters
  const uniqueFunds = useMemo(() => {
    const fundMap = new Map(publicFunds.map(f => [f.fund_id, f.fund_name]));
    const fundNames = contributions
      .map(c => fundMap.get(c.fund_id) || c.fund_id)
      .filter((name, index, self) => self.indexOf(name) === index);
    return fundNames;
  }, [contributions, publicFunds]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(expenses.map(e => e.expense_category));
    return Array.from(categories);
  }, [expenses]);

  // Filter contributions
  const filteredContributions = useMemo(() => {
    return contributions.filter((contribution) => {
      const fundName = publicFunds.find(f => f.fund_id === contribution.fund_id)?.fund_name || contribution.fund_id;
      const matchesSearch = 
        fundName.toLowerCase().includes(contributionSearch.toLowerCase()) ||
        contribution.amount.toString().includes(contributionSearch.toLowerCase());
      const matchesFund = contributionFundFilter === "all" || fundName === contributionFundFilter;
      const matchesStatus = contributionStatusFilter === "all" || contribution.status === contributionStatusFilter;
      
      // Date filtering
      let matchesDate = true;
      if (contributionStartDate || contributionEndDate) {
        const contributionDate = new Date(contribution.date_received);
        if (contributionStartDate) {
          const start = new Date(contributionStartDate);
          start.setHours(0, 0, 0, 0);
          if (contributionDate < start) matchesDate = false;
        }
        if (contributionEndDate) {
          const end = new Date(contributionEndDate);
          end.setHours(23, 59, 59, 999);
          if (contributionDate > end) matchesDate = false;
        }
      }
      
      return matchesSearch && matchesFund && matchesStatus && matchesDate;
    });
  }, [contributions, contributionSearch, contributionFundFilter, contributionStatusFilter, contributionStartDate, contributionEndDate, publicFunds]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = 
        expense.expense_name.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expense.expense_category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expense.amount.toString().includes(expenseSearch.toLowerCase());
      const matchesCategory = expenseCategoryFilter === "all" || expense.expense_category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  // Contribution table columns
  const contributionColumns = useMemo(() => [
    {
      key: "date",
      header: "Date",
      className: "text-muted-foreground",
      render: (item: Record<string, unknown>) => {
        const contribution = item as unknown as Contribution;
        return format(new Date(contribution.date_received), "MMM d, yyyy");
      },
    },
    {
      key: "fund",
      header: "Fund",
      render: (item: Record<string, unknown>) => {
        const contribution = item as unknown as Contribution;
        const fundName = publicFunds.find(f => f.fund_id === contribution.fund_id)?.fund_name || contribution.fund_id;
        return <span className="font-medium text-foreground">{fundName}</span>;
      },
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      render: (item: Record<string, unknown>) => {
        const contribution = item as unknown as Contribution;
        return <span className="text-foreground">${contribution.amount.toFixed(2)}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (item: Record<string, unknown>) => {
        const contribution = item as unknown as Contribution;
        return (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-xs text-success capitalize">{contribution.status}</span>
          </div>
        );
      },
    },
  ], [publicFunds]);

  // Expense table columns
  const expenseColumns = useMemo(() => [
    {
      key: "date",
      header: "Date",
      className: "text-muted-foreground",
      render: (item: Record<string, unknown>) => {
        const expense = item as unknown as Expense;
        const dateValue = expense.date ? new Date(expense.date) : new Date();
        return format(dateValue, "MMM d, yyyy");
      },
    },
    {
      key: "category",
      header: "Category",
      render: (item: Record<string, unknown>) => {
        const expense = item as unknown as Expense;
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full",
              categoryColors[expense.expense_category] || "bg-secondary text-secondary-foreground"
            )}
          >
            {expense.expense_category}
          </span>
        );
      },
    },
    {
      key: "description",
      header: "Description",
      render: (item: Record<string, unknown>) => {
        const expense = item as unknown as Expense;
        return <span className="text-foreground">{expense.expense_name}</span>;
      },
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      render: (item: Record<string, unknown>) => {
        const expense = item as unknown as Expense;
        return <span className="text-foreground">${Number(expense.amount).toFixed(2)}</span>;
      },
    },
  ], []);

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
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Group not found</p>
            <Button onClick={() => navigate("/group")} className="w-full mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor, color: foregroundColor }}
    >
      {/* OTP Verification Modal */}
      {showOtpVerification && !isVerified && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader>
              <CardTitle>Verify Your Identity</CardTitle>
              <CardDescription>
                Enter your verified phone number to access your contributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
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
                  <Label htmlFor="otp">Enter OTP Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="otp"
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Header with Logo on Left */}
        <div className="flex items-start gap-6 mb-8">
          {/* Logo on Left */}
          <div className="flex-shrink-0">
            {account?.account_logo ? (
              <img 
                src={account.account_logo} 
                alt={account.account_name || "Logo"} 
                className="h-20 w-20 rounded-xl object-cover shadow-lg border-2"
                style={{ borderColor: foregroundColor + "20" }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div 
                className="h-20 w-20 rounded-xl flex items-center justify-center shadow-lg border-2"
                style={{ 
                  backgroundColor: foregroundColor + "10",
                  borderColor: foregroundColor + "20",
                  color: foregroundColor
                }}
              >
                <span className="text-2xl font-bold">
                  {(account?.account_name || "CG").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Title and Description */}
          <div className="flex-1">
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: foregroundColor }}
            >
              {account?.account_name || "Community Group"}
            </h1>
            <p 
              className="opacity-80 mb-4"
              style={{ color: foregroundColor }}
            >
              {isVerified && memberName 
                ? `Welcome back, ${memberName}! Support our community by contributing to our active groups.`
                : "Support our community by contributing to our active funds"
              }
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-3">
              {!isVerified ? (
                <Button 
                  onClick={handleRequestAccess} 
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  View My Contributions
                </Button>
              ) : (
                <Button 
                  onClick={handleLogout} 
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-secondary/50 w-full">
            {isVerified ? (
              <>
                <TabsTrigger value="contributions" className="flex-1">
                  <Receipt className="h-4 w-4 mr-2" />
                  My Contributions
                </TabsTrigger>
                <TabsTrigger value="funds" className="flex-1">
                  <Wallet className="h-4 w-4 mr-2" />
                  Contribute
                </TabsTrigger>
                {account && (account.expenses_tab_visible !== null ? account.expenses_tab_visible : true) && (
                  <TabsTrigger value="expenses" className="flex-1">
                    <Receipt className="h-4 w-4 mr-2" />
                    Expenses
                  </TabsTrigger>
                )}
              </>
            ) : (
              <>
                <TabsTrigger value="contributions" className="flex-1">
                  <Receipt className="h-4 w-4 mr-2" />
                  My Contributions
                </TabsTrigger>
                <TabsTrigger value="funds" className="flex-1">
                  <Wallet className="h-4 w-4 mr-2" />
                  Contribute
                </TabsTrigger>
                {account && (account.expenses_tab_visible !== null ? account.expenses_tab_visible : true) && (
                  <TabsTrigger value="expenses" className="flex-1">
                    <Receipt className="h-4 w-4 mr-2" />
                    Expenses
                  </TabsTrigger>
                )}
              </>
            )}
          </TabsList>

          {/* Funds Tab */}
          <TabsContent value="funds" className="mt-4">
            {!isVerified ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Verify to contribute</p>
                  <Button onClick={handleRequestAccess}>
                    <Lock className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              {publicFunds.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No Funds available</p>
                  </CardContent>
                </Card>
              ) : (
                publicFunds.map((f) => {
                  const stats = fundStats[f.fund_id] || { totalCollected: 0, contributorCount: 0 };
                  
                  return (
                    <Card key={f.fund_id} className="hover:border-amber/50 transition-colors">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Wallet className="h-5 w-5 text-amber" />
                            <span className="font-medium">{f.fund_name}</span>
                          </div>
                          {account && account.kyc_status === 'verified' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFund(f);
                                setShowConfirmationDialog(true);
                              }}
                            >
                              Contribute →
                            </Button>
                          )}
                        </div>
                        {f.description && (
                          <p className="text-sm text-muted-foreground mb-3">{f.description}</p>
                        )}
                        {f.default_amount && (
                          <p className="text-sm text-muted-foreground mb-3">
                            Suggested: ${f.default_amount.toFixed(2)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            )}
          </TabsContent>

          {/* My Contributions Tab */}
          <TabsContent value="contributions" className="mt-4">
            {!isVerified ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Verify to see your contributions</p>
                  <Button onClick={handleRequestAccess}>
                    <Lock className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Filters */}
                <div className="space-y-3">
                  {/* Search - Full width row */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contributions..."
                      value={contributionSearch}
                      onChange={(e) => setContributionSearch(e.target.value)}
                      className="pl-9"
                      style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                    />
                  </div>
                  
                  {/* All Funds and All Status - Side by side */}
                  <div className="flex gap-3">
                    <Select value={contributionFundFilter} onValueChange={setContributionFundFilter}>
                      <SelectTrigger className="flex-1" style={{ backgroundColor: backgroundColor }}>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by group" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">All Funds</SelectItem>
                        {uniqueFunds.map((fund) => (
                          <SelectItem key={fund} value={fund}>
                            {fund}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={contributionStatusFilter} onValueChange={setContributionStatusFilter}>
                      <SelectTrigger className="flex-1" style={{ backgroundColor: backgroundColor }}>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Start Date and End Date - Side by side */}
                  <div className="flex gap-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !contributionStartDate && "text-muted-foreground"
                          )}
                          style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contributionStartDate ? format(contributionStartDate, "MMM d, yyyy") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                        <Calendar
                          mode="single"
                          selected={contributionStartDate}
                          onSelect={setContributionStartDate}
                          initialFocus
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !contributionEndDate && "text-muted-foreground"
                          )}
                          style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {contributionEndDate ? format(contributionEndDate, "MMM d, yyyy") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                        <Calendar
                          mode="single"
                          selected={contributionEndDate}
                          onSelect={setContributionEndDate}
                          initialFocus
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  {/* Clear dates - Full width row */}
                  {(contributionStartDate || contributionEndDate) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setContributionStartDate(undefined);
                        setContributionEndDate(undefined);
                      }}
                      className="w-full"
                      style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                    >
                      Clear dates
                    </Button>
                  )}
                </div>

                {/* Table */}
                <DataTable
                  columns={contributionColumns}
                  data={filteredContributions as unknown as Record<string, unknown>[]}
                  emptyMessage="No contributions found"
                />
              </div>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          {account && (account.expenses_tab_visible !== null ? account.expenses_tab_visible : true) && (
            <TabsContent value="expenses" className="mt-4">
            {!isVerified ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Verify to see expenses</p>
                  <Button onClick={handleRequestAccess}>
                    <Lock className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="pl-9"
                    style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                  />
                </div>
                <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                  <SelectTrigger className="w-[180px]" style={{ backgroundColor: backgroundColor }}>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <DataTable
                columns={expenseColumns}
                data={filteredExpenses as unknown as Record<string, unknown>[]}
                emptyMessage="No expenses found"
              />
            </div>
            )}
          </TabsContent>
          )}
        </Tabs>

        <p className="text-center text-xs opacity-60 mt-8" style={{ color: foregroundColor }}>
          Powered by PollenHive
        </p>
      </div>

      {/* Contribution Confirmation Dialog */}
      <ContributeConfirmationModal
        open={showConfirmationDialog}
        onOpenChange={setShowConfirmationDialog}
        fund={selectedFund}
        onConfirm={() => {
          setShowConfirmationDialog(false);
          setShowPaymentModal(true);
        }}
      />

      {/* Paystack Payment Modal */}
      {account && (
        <PaystackPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          fund={selectedFund}
          accountId={account.account_id}
          memberId={memberId}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedFund(null);
            // Reload data to show updated contributions
            loadData();
            toast({
              title: "Success",
              description: "Your contribution has been processed successfully",
            });
          }}
        />
      )}
    </div>
  );
}
