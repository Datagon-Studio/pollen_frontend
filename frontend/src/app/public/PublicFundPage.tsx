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
import { Wallet, Receipt, CheckCircle2, Loader2, Send, Lock, Search, Filter, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fundApi, Fund } from "@/services/fund.api";
import { contributionApi, Contribution } from "@/services/contribution.api";
import { expenseApi, Expense } from "@/services/expense.api";
import { useToast } from "@/hooks/use-toast";
import { accountApi, Account } from "@/services/account.api";

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark",
  "Events": "bg-gold/20 text-charcoal",
  "Utilities": "bg-muted text-muted-foreground",
  "Maintenance": "bg-charcoal/10 text-charcoal",
};

export default function PublicFundPage() {
  const { fundId } = useParams<{ fundId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [fund, setFund] = useState<Fund | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [publicFunds, setPublicFunds] = useState<Fund[]>([]);
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

  useEffect(() => {
    if (fundId) {
      loadData();
    }
  }, [fundId]);

  const loadData = async () => {
    if (!fundId) return;
    try {
      setLoading(true);
      console.log('[PublicFundPage] Loading fund:', fundId);
      
      // HARDCODED EXAMPLE DATA FOR TESTING
      const mockFund: Fund = {
        fund_id: fundId,
        account_id: "a8963668-f203-4133-85aa-059f32c35279",
        fund_name: "Emergency Fund",
        description: "Support our community emergency fund for urgent needs",
        default_amount: 100,
        is_active: true,
        is_public: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const mockAccount: Account = {
        account_id: "a8963668-f203-4133-85aa-059f32c35279",
        account_name: "Community Group",
        account_logo: "https://via.placeholder.com/200x200/FFA500/FFFFFF?text=CG",
        foreground_color: "#1a1a1a",
        background_color: "#ffffff",
        kyc_status: "verified",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const mockPublicFunds: Fund[] = [
        {
          fund_id: fundId,
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          fund_name: "Emergency Fund",
          description: "Support our community emergency fund for urgent needs",
          default_amount: 100,
          is_active: true,
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          fund_id: "b1234567-c234-5678-90ab-cdef12345678",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          fund_name: "Annual Dues 2026",
          description: "Annual membership dues for 2026",
          default_amount: 75,
          is_active: true,
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          fund_id: "c2345678-d345-6789-01bc-def234567890",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          fund_name: "Building Renovation",
          description: "Funds for community building renovations",
          default_amount: 200,
          is_active: true,
          is_public: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      
      const mockExpenses: Expense[] = [
        {
          expense_id: "exp1",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          expense_name: "Office supplies for monthly meeting",
          expense_category: "Operations",
          date: "2026-01-02",
          amount: 45.00,
          created_by_user_id: "user1",
          notes: null,
          member_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          expense_id: "exp2",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          expense_name: "Electricity bill - December 2025",
          expense_category: "Utilities",
          date: "2026-01-01",
          amount: 285.00,
          created_by_user_id: "user1",
          notes: null,
          member_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          expense_id: "exp3",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          expense_name: "Catering for New Year celebration",
          expense_category: "Events",
          date: "2025-12-30",
          amount: 850.00,
          created_by_user_id: "user1",
          notes: null,
          member_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      
      // Use hardcoded data
      setFund(mockFund);
      setAccount(mockAccount);
      setPublicFunds(mockPublicFunds);
      setExpenses(mockExpenses);
      
      // Uncomment below to use real API calls instead:
      /*
      const fundData = await fundApi.getById(fundId);
      setFund(fundData);
      
      // Load public funds for the account
      const publicFundsData = await fundApi.getPublicByAccount(fundData.account_id);
      setPublicFunds(publicFundsData);
      
      // Load account info for branding
      try {
        const accountData = await accountApi.getPublic(fundData.account_id);
        setAccount(accountData);
      } catch (error) {
        console.error("Failed to load account:", error);
      }
      
      // Load expenses (public ones)
      try {
        const expensesData = await expenseApi.getPublicByAccount(fundData.account_id);
        setExpenses(expensesData.filter(e => e.member_visible));
      } catch (error) {
        console.error("Failed to load expenses:", error);
      }
      */
    } catch (error) {
      console.error('[PublicFundPage] Error loading group:', error);
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
      // HARDCODED EXAMPLE DATA FOR TESTING
      const mockContributions: Contribution[] = [
        {
          id: "contrib1",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          member_id: memberId,
          fund_id: fundId || "",
          amount: 150.00,
          channel: "online",
          payment_method: "Mobile Money",
          status: "confirmed",
          date_received: "2026-01-02",
          comment: null,
          payment_reference: "MM123456",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "contrib2",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          member_id: memberId,
          fund_id: "b1234567-c234-5678-90ab-cdef12345678",
          amount: 75.00,
          channel: "offline",
          payment_method: "Cash",
          status: "confirmed",
          date_received: "2025-12-15",
          comment: "Annual dues payment",
          payment_reference: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "contrib3",
          account_id: "a8963668-f203-4133-85aa-059f32c35279",
          member_id: memberId,
          fund_id: "c2345678-d345-6789-01bc-def234567890",
          amount: 200.00,
          channel: "online",
          payment_method: "Bank Transfer",
          status: "confirmed",
          date_received: "2025-12-01",
          comment: null,
          payment_reference: "BT789012",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      
      setContributions(mockContributions);
      
      // Uncomment below to use real API calls instead:
      /*
      const contributionsData = await contributionApi.getByMember(memberId);
      if (contributionsData.success && contributionsData.data) {
        setContributions(contributionsData.data);
      }
      */
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
    
    setSendingOtp(true);
    try {
      // TODO: Call actual API to send OTP to member's phone
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${phone}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP",
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
    
    setVerifying(true);
    try {
      // TODO: Call actual API to verify OTP and get member ID
      // For now, simulate verification
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // TODO: Get actual member ID from API response
      const mockMemberId = "mock-member-id";
      setMemberId(mockMemberId);
      setIsVerified(true);
      setShowOtpVerification(false);
      
      // Load member data
      await loadMemberData(mockMemberId);
      
      // Set contributions tab as default after verification
      setActiveTab("contributions");
      
      toast({
        title: "Verified",
        description: "You now have access to view your contributions",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
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
      render: (item: Contribution) => format(new Date(item.date_received), "MMM d, yyyy"),
    },
    {
      key: "fund",
      header: "Fund",
      render: (item: Contribution) => {
        const fundName = publicFunds.find(f => f.fund_id === item.fund_id)?.fund_name || item.fund_id;
        return <span className="font-medium text-foreground">{fundName}</span>;
      },
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      render: (item: Contribution) => (
        <span className="text-foreground">${item.amount.toFixed(2)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: Contribution) => (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-xs text-success capitalize">{item.status}</span>
        </div>
      ),
    },
  ], [publicFunds]);

  // Expense table columns
  const expenseColumns = useMemo(() => [
    {
      key: "date",
      header: "Date",
      className: "text-muted-foreground",
      render: (item: Expense) => {
        const dateValue = item.date ? new Date(item.date) : new Date();
        return format(dateValue, "MMM d, yyyy");
      },
    },
    {
      key: "category",
      header: "Category",
      render: (item: Expense) => (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full",
            categoryColors[item.expense_category] || "bg-secondary text-secondary-foreground"
          )}
        >
          {item.expense_category}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (item: Expense) => (
        <span className="text-foreground">{item.expense_name}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-semibold",
      render: (item: Expense) => (
        <span className="text-foreground">${Number(item.amount).toFixed(2)}</span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Group not found</p>
            <Button onClick={() => navigate("/g")} className="w-full mt-4">
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
                    placeholder="+233 XX XXX XXXX"
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
              Support our community by contributing to our active funds
            </p>

            {/* Action Buttons */}
            {!isVerified && (
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Button 
                  onClick={handleRequestAccess} 
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  View My Contributions
                </Button>
              </div>
            )}
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
                <TabsTrigger value="expenses" className="flex-1">
                  <Receipt className="h-4 w-4 mr-2" />
                  Expenses
                </TabsTrigger>
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
                <TabsTrigger value="expenses" className="flex-1">
                  <Receipt className="h-4 w-4 mr-2" />
                  Expenses
                </TabsTrigger>
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
                    <p className="text-center text-muted-foreground">No public funds available</p>
                  </CardContent>
                </Card>
              ) : (
                publicFunds.map((f) => {
                  // HARDCODED EXAMPLE DATA - Progress calculation
                  const mockCollected = f.fund_id === fundId ? 15420 : f.fund_id === "b1234567-c234-5678-90ab-cdef12345678" ? 3600 : 8750;
                  const mockTarget = f.fund_id === fundId ? 20000 : f.fund_id === "b1234567-c234-5678-90ab-cdef12345678" ? 3600 : 50000;
                  const progress = (mockCollected / mockTarget) * 100;
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
                                // TODO: Open contribution modal
                                toast({
                                  title: "Contribute",
                                  description: "Contribution feature coming soon",
                                });
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
                        <div className="w-full bg-secondary rounded-full h-2 mb-2">
                          <div
                            className="bg-amber h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          ${mockCollected.toLocaleString()} of ${mockTarget.toLocaleString()} collected
                        </p>
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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search contributions..."
                        value={contributionSearch}
                        onChange={(e) => setContributionSearch(e.target.value)}
                        className="pl-9"
                        style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                      />
                    </div>
                    <Select value={contributionFundFilter} onValueChange={setContributionFundFilter}>
                      <SelectTrigger className="w-[180px]" style={{ backgroundColor: backgroundColor }}>
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by fund" />
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
                      <SelectTrigger className="w-[180px]" style={{ backgroundColor: backgroundColor }}>
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
                  
                  {/* Date Range Filter */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full sm:w-[200px] justify-start text-left font-normal",
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
                            "w-full sm:w-[200px] justify-start text-left font-normal",
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
                    
                    {(contributionStartDate || contributionEndDate) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setContributionStartDate(undefined);
                          setContributionEndDate(undefined);
                        }}
                        className="w-full sm:w-auto"
                        style={{ backgroundColor: backgroundColor, color: foregroundColor }}
                      >
                        Clear dates
                      </Button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <DataTable
                  columns={contributionColumns}
                  data={filteredContributions as any}
                  emptyMessage="No contributions found"
                />
              </div>
            )}
          </TabsContent>

          {/* Expenses Tab */}
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
                data={filteredExpenses as any}
                emptyMessage="No expenses found"
              />
            </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs opacity-60 mt-8" style={{ color: foregroundColor }}>
          Powered by PollenHive
        </p>
      </div>
    </div>
  );
}
