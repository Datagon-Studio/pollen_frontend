import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ExternalLink,
  Copy,
  Check,
  Wallet,
  Receipt,
  Eye,
  EyeOff,
  Lock,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import { accountApi } from "@/services/account.api";
import { configApi, ExpenseVisibilityLevel } from "@/services/config.api";
import { accountPublicPageApi } from "@/services/account-public-page.api";
import { expenseApi, Expense } from "@/services/expense.api";
import { fundApi, Fund } from "@/services/fund.api";
import { contributionApi, Contribution } from "@/services/contribution.api";
import { memberApi } from "@/services/member.api";
import { THEME_DEFAULTS, hexToTailwindHsl } from "@/lib/theme-utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";

const categoryColors: Record<string, string> = {
  Operations: "bg-amber/10 text-amber-dark",
  Events: "bg-gold/20 text-charcoal",
  Utilities: "bg-muted text-muted-foreground",
};

export default function PublicSettings() {
  const { user } = useAuth();
  const { account, loading: accountLoading } = useAccount(user?.id);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState("funds");
  const [previewVerifiedMemberView, setPreviewVerifiedMemberView] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [publicFunds, setPublicFunds] = useState<Fund[]>([]);
  const [fundStats, setFundStats] = useState<
    Record<string, { totalCollected: number; contributorCount: number }>
  >({});
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [visiblePreviewExpenses, setVisiblePreviewExpenses] = useState<
    Expense[]
  >([]);
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
  const [useCustomTheme, setUseCustomTheme] = useState(false);
  const [customPrimaryColor, setCustomPrimaryColor] = useState(THEME_DEFAULTS.primary);
  const [customSecondaryLightColor, setCustomSecondaryLightColor] = useState(THEME_DEFAULTS.secondaryLight);
  const [customBackgroundLightColor, setCustomBackgroundLightColor] = useState(THEME_DEFAULTS.backgroundLight);
  const [customTextColor, setCustomTextColor] = useState(THEME_DEFAULTS.textColorLight);
  const [customSecondaryDarkColor, setCustomSecondaryDarkColor] = useState(THEME_DEFAULTS.secondaryDark);
  const [customBackgroundDarkColor, setCustomBackgroundDarkColor] = useState(THEME_DEFAULTS.backgroundDark);
  const [customTextColorDark, setCustomTextColorDark] = useState(THEME_DEFAULTS.textColorDark);
  const [customButtonTextColor, setCustomButtonTextColor] = useState(THEME_DEFAULTS.buttonTextColorLight);
  const [customButtonTextColorDark, setCustomButtonTextColorDark] = useState(THEME_DEFAULTS.buttonTextColorDark);
  const [expensesTabVisible, setExpensesTabVisible] = useState(true);
  const [expenseVisibilityLevel, setExpenseVisibilityLevel] =
    useState<ExpenseVisibilityLevel>("summary");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [previewIsDark, setPreviewIsDark] = useState(false);

  // Derived active colors for preview and general use
  const primaryColor = useCustomTheme ? customPrimaryColor : THEME_DEFAULTS.primary;
  const secondaryColor = useCustomTheme ? customSecondaryLightColor : THEME_DEFAULTS.secondaryLight;
  const backgroundLightColor = useCustomTheme ? customBackgroundLightColor : THEME_DEFAULTS.backgroundLight;
  const textColor = useCustomTheme ? customTextColor : THEME_DEFAULTS.textColorLight;
  const secondaryDarkColor = useCustomTheme ? customSecondaryDarkColor : THEME_DEFAULTS.secondaryDark;
  const backgroundDarkColor = useCustomTheme ? customBackgroundDarkColor : THEME_DEFAULTS.backgroundDark;
  const textColorDark = useCustomTheme ? customTextColorDark : THEME_DEFAULTS.textColorDark;
  const buttonTextColor = useCustomTheme ? customButtonTextColor : THEME_DEFAULTS.buttonTextColorLight;
  const buttonTextColorDark = useCustomTheme ? customButtonTextColorDark : THEME_DEFAULTS.buttonTextColorDark;

  const previewBgColor = previewIsDark
    ? (useCustomTheme ? customBackgroundDarkColor : THEME_DEFAULTS.backgroundDark)
    : (useCustomTheme ? customSecondaryLightColor : THEME_DEFAULTS.secondaryLight);
  const previewSecondaryColor = previewIsDark
    ? (useCustomTheme ? customSecondaryDarkColor : THEME_DEFAULTS.secondaryDark)
    : (useCustomTheme ? customSecondaryLightColor : THEME_DEFAULTS.secondaryLight);
  const previewTextColor = previewIsDark
    ? (useCustomTheme ? customTextColorDark : THEME_DEFAULTS.textColorDark)
    : (useCustomTheme ? customTextColor : THEME_DEFAULTS.textColorLight);
  const previewButtonTextColor = previewIsDark ? buttonTextColorDark : buttonTextColor;

  // Load account data, config, public page, and expenses
  useEffect(() => {
    if (account) {
      loadPublicPage();
      loadConfig();
      loadFunds();
      loadExpenses();
    }
  }, [account]);

  const loadPublicPage = async () => {
    try {
      const publicPage = await accountPublicPageApi.getMyPublicPage();
      setUseCustomTheme(publicPage.use_custom_theme || false);
      setCustomPrimaryColor(publicPage.custom_primary_color || publicPage.primary_color || THEME_DEFAULTS.primary);
      setCustomSecondaryLightColor(publicPage.custom_secondary_light_color || publicPage.secondary_color || THEME_DEFAULTS.secondaryLight);
      setCustomBackgroundLightColor(publicPage.custom_background_light_color || THEME_DEFAULTS.backgroundLight);
      setCustomTextColor(publicPage.custom_text_color || THEME_DEFAULTS.textColorLight);
      setCustomSecondaryDarkColor(publicPage.custom_secondary_dark_color || THEME_DEFAULTS.secondaryDark);
      setCustomBackgroundDarkColor(publicPage.custom_background_dark_color || THEME_DEFAULTS.backgroundDark);
      setCustomTextColorDark(publicPage.custom_text_color_dark || THEME_DEFAULTS.textColorDark);
      setCustomButtonTextColor(publicPage.custom_button_text_color || THEME_DEFAULTS.buttonTextColorLight);
      setCustomButtonTextColorDark(publicPage.custom_button_text_color_dark || THEME_DEFAULTS.buttonTextColorDark);
    } catch (error) {
      console.error("Error loading public page:", error);
      // Fallback to defaults if public page doesn't exist yet
      setUseCustomTheme(false);
      setCustomPrimaryColor(THEME_DEFAULTS.primary);
      setCustomSecondaryLightColor(THEME_DEFAULTS.secondaryLight);
      setCustomBackgroundLightColor(THEME_DEFAULTS.backgroundLight);
      setCustomTextColor(THEME_DEFAULTS.textColorLight);
      setCustomSecondaryDarkColor(THEME_DEFAULTS.secondaryDark);
      setCustomBackgroundDarkColor(THEME_DEFAULTS.backgroundDark);
      setCustomTextColorDark(THEME_DEFAULTS.textColorDark);
      setCustomButtonTextColor(THEME_DEFAULTS.buttonTextColorLight);
      setCustomButtonTextColorDark(THEME_DEFAULTS.buttonTextColorDark);
    }
  };

  // Update expenses tab visibility based on expense visibility level
  useEffect(() => {
    // Show expenses tab if visibility level is not 'none'
    setExpensesTabVisible(expenseVisibilityLevel !== "none");
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

  const loadFunds = async () => {
    if (!account) return;
    try {
      setLoadingFunds(true);
      const funds = await fundApi.getPublicByAccount(account.account_id);
      setPublicFunds(funds);

      const statsMap: Record<
        string,
        { totalCollected: number; contributorCount: number }
      > = {};

      await Promise.all(
        funds.map(async (fund) => {
          try {
            const statsResponse = await contributionApi.getFundStats(
              fund.fund_id,
            );
            if (statsResponse.success && statsResponse.data) {
              statsMap[fund.fund_id] = {
                totalCollected: statsResponse.data.totalCollected || 0,
                contributorCount: statsResponse.data.contributorCount || 0,
              };
            } else {
              statsMap[fund.fund_id] = {
                totalCollected: 0,
                contributorCount: 0,
              };
            }
          } catch (error) {
            console.error(
              `Failed to load stats for fund ${fund.fund_id}:`,
              error,
            );
            statsMap[fund.fund_id] = {
              totalCollected: 0,
              contributorCount: 0,
            };
          }
        }),
      );

      setFundStats(statsMap);
    } catch (error) {
      console.error("Error loading funds:", error);
      setPublicFunds([]);
      setFundStats({});
    } finally {
      setLoadingFunds(false);
    }
  };

  const loadExpenses = async () => {
    if (!account) return;
    try {
      setLoadingExpenses(true);
      const [allExpenses, visibleExpenses] = await Promise.all([
        expenseApi.getAll(),
        expenseApi.getVisible(),
      ]);
      setExpenses(allExpenses);
      setVisiblePreviewExpenses(visibleExpenses);

      // Also load all contributions for summary calculation
      const contributionsData = await contributionApi.getByAccount(
        account.account_id,
      );
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
          use_custom_theme: useCustomTheme,
          custom_primary_color: customPrimaryColor,
          custom_secondary_light_color: customSecondaryLightColor,
          custom_background_light_color: customBackgroundLightColor,
          custom_text_color: customTextColor,
          custom_secondary_dark_color: customSecondaryDarkColor,
          custom_background_dark_color: customBackgroundDarkColor,
          custom_text_color_dark: customTextColorDark,
          custom_button_text_color: customButtonTextColor,
          custom_button_text_color_dark: customButtonTextColorDark,
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
        description:
          error instanceof Error ? error.message : "Failed to save settings",
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
    if (expenseVisibilityLevel === "none") {
      return [];
    } else if (expenseVisibilityLevel === "summary") {
      return []; // Summary will show totals, not individual expenses
    } else {
      // detailed - show the same visible expenses members can see on the public page
      return visiblePreviewExpenses;
    }
  }, [visiblePreviewExpenses, expenseVisibilityLevel]);

  // Calculate totals for summary view
  const expenseSummary = useMemo(() => {
    if (expenseVisibilityLevel !== "summary") return null;
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );
    // Use all contributions for summary, not just verified member's
    const totalContributions = allContributions
      .filter((c) => c.status === "confirmed")
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
        throw new Error(response.error || "Failed to send OTP");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send OTP",
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
      const response = await memberApi.verifyOTP(
        phone,
        otp,
        account.account_id,
      );
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
        throw new Error(response.error || "Invalid OTP");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestAccess = () => {
    setShowOtpVerification(true);
  };

  const showVerifiedMemberPreview = previewVerifiedMemberView;

  // Contribution table columns
  const contributionColumns = useMemo(
    () => [
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
    ],
    [primaryColor],
  );

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
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
                <Label
                  htmlFor="preview-theme-toggle"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  {previewIsDark ? "Dark theme preview" : "Light theme preview"}
                </Label>
                <Switch
                  id="preview-theme-toggle"
                  checked={previewIsDark}
                  onCheckedChange={setPreviewIsDark}
                />
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
                {showVerifiedMemberPreview ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label
                  htmlFor="preview-member-view"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  {showVerifiedMemberPreview
                    ? "Verified member view"
                    : "Unverified member view"}
                </Label>
                <Switch
                  id="preview-member-view"
                  checked={previewVerifiedMemberView}
                  onCheckedChange={(checked) => {
                    setPreviewVerifiedMemberView(checked);
                    if (checked) {
                      setShowOtpVerification(false);
                    }
                  }}
                />
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            </div>
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
              className={cn("p-8 min-h-[500px]", previewIsDark && "dark")}
              style={{
                backgroundColor: previewBgColor,
                color: previewTextColor,
                ["--primary" as any]: hexToTailwindHsl(primaryColor),
                ["--primary-foreground" as any]: hexToTailwindHsl(previewButtonTextColor),
                ["--secondary" as any]: hexToTailwindHsl(previewSecondaryColor),
                ["--background" as any]: hexToTailwindHsl(
                  previewIsDark
                    ? (useCustomTheme ? customBackgroundDarkColor : THEME_DEFAULTS.backgroundDark)
                    : (useCustomTheme ? customBackgroundLightColor : THEME_DEFAULTS.backgroundLight)
                ),
                ["--foreground" as any]: hexToTailwindHsl(previewTextColor),
                ["--card" as any]: hexToTailwindHsl(
                  previewIsDark
                    ? (useCustomTheme ? customSecondaryDarkColor : THEME_DEFAULTS.secondaryDark)
                    : (useCustomTheme ? customBackgroundLightColor : THEME_DEFAULTS.backgroundLight)
                ),
                ["--card-foreground" as any]: hexToTailwindHsl(previewTextColor),
                ["--popover" as any]: hexToTailwindHsl(
                  previewIsDark
                    ? (useCustomTheme ? customSecondaryDarkColor : THEME_DEFAULTS.secondaryDark)
                    : (useCustomTheme ? customBackgroundLightColor : THEME_DEFAULTS.backgroundLight)
                ),
                ["--popover-foreground" as any]: hexToTailwindHsl(previewTextColor),
                ["--muted-foreground" as any]: hexToTailwindHsl(previewTextColor),
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
                  style={{ color: previewTextColor }}
                >
                  {account.account_name || "Community Group"}
                </h1>
                <p className="mb-6 opacity-80" style={{ color: previewTextColor }}>
                  Support our community by contributing to our active funds
                </p>

                {/* Public page tabs */}
                <Tabs
                  value={previewTab}
                  onValueChange={setPreviewTab}
                  className="mb-6"
                >
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
                    {!showVerifiedMemberPreview ? (
                      <div className="bg-card/50 border border-border/50 rounded-lg p-6 text-center">
                        <Lock
                          className="h-12 w-12 mx-auto mb-4 opacity-70"
                          style={{ color: primaryColor }}
                        />
                        <p
                          className="mb-4 opacity-70"
                          style={{ color: primaryColor }}
                        >
                          Verify to contribute
                        </p>
                        {isVerified ? (
                          <Button onClick={() => setPreviewVerifiedMemberView(true)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Switch to verified preview
                          </Button>
                        ) : (
                          <Button onClick={handleRequestAccess}>
                            <Lock className="h-4 w-4 mr-2" />
                            Verify
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 text-left">
                        {loadingFunds ? (
                          <p
                            className="text-sm opacity-70 text-center"
                            style={{ color: primaryColor }}
                          >
                            Loading funds...
                          </p>
                        ) : publicFunds.length === 0 ? (
                          <div className="bg-card/50 border border-border/50 rounded-lg p-6 text-center">
                            <p
                              className="text-sm opacity-70"
                              style={{ color: primaryColor }}
                            >
                              No public funds available
                            </p>
                          </div>
                        ) : (
                          publicFunds.map((fund) => {
                            const stats = fundStats[fund.fund_id] || {
                              totalCollected: 0,
                              contributorCount: 0,
                            };

                            const fundGoal =
                              fund.fund_goal != null
                                ? Number(fund.fund_goal)
                                : null;
                            const hasGoal =
                              fundGoal != null &&
                              !Number.isNaN(fundGoal) &&
                              fundGoal > 0;
                            const progress = hasGoal
                              ? Math.min(
                                  (stats.totalCollected / fundGoal) * 100,
                                  100,
                                )
                              : null;

                            return (
                              <div
                                key={fund.fund_id}
                                className="bg-card/50 border border-border/50 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Wallet
                                      className="h-5 w-5 shrink-0"
                                      style={{ color: primaryColor }}
                                    />
                                    <span
                                      className="font-medium truncate"
                                      style={{ color: primaryColor }}
                                    >
                                      {fund.fund_name}
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    type="button"
                                    disabled
                                  >
                                    Contribute →
                                  </Button>
                                </div>
                                {fund.description && (
                                  <p
                                    className="text-sm opacity-80 mb-3"
                                    style={{ color: primaryColor }}
                                  >
                                    {fund.description}
                                  </p>
                                )}
                                {hasGoal && (
                                  <div className="mt-3">
                                    <div className="relative h-2 mb-1 bg-secondary/50 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${progress || 0}%`,
                                          backgroundColor: primaryColor,
                                        }}
                                      />
                                    </div>
                                    <div
                                      className="flex items-center justify-between text-xs opacity-70"
                                      style={{ color: primaryColor }}
                                    >
                                      <span>
                                        ${stats.totalCollected.toFixed(2)}{" "}
                                        raised
                                      </span>
                                      <span>
                                        {progress !== null
                                          ? progress.toFixed(0)
                                          : 0}
                                        % of goal
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {expensesTabVisible && (
                    <TabsContent value="expenses" className="mt-4">
                      {!showVerifiedMemberPreview ? (
                        <div className="bg-card/50 border border-border/50 rounded-lg p-6 text-center">
                          <Lock
                            className="h-12 w-12 mx-auto mb-4 opacity-70"
                            style={{ color: primaryColor }}
                          />
                          <p
                            className="mb-4 opacity-70"
                            style={{ color: primaryColor }}
                          >
                            Verify to see expenses
                          </p>
                          {isVerified ? (
                            <Button onClick={() => setPreviewVerifiedMemberView(true)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Switch to verified preview
                            </Button>
                          ) : (
                            <Button onClick={handleRequestAccess}>
                              <Lock className="h-4 w-4 mr-2" />
                              Verify
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 text-left">
                          {expenseVisibilityLevel === "none" ? (
                            <p
                              className="text-sm opacity-70 text-center"
                              style={{ color: primaryColor }}
                            >
                              Expense information is not available
                            </p>
                          ) : expenseVisibilityLevel === "summary" ? (
                            expenseSummary ? (
                              <div className="space-y-3">
                                <div className="bg-card/50 border border-border/50 rounded-lg p-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <span
                                      className="text-sm opacity-80"
                                      style={{ color: primaryColor }}
                                    >
                                      Total Contributions
                                    </span>
                                    <span
                                      className="font-semibold"
                                      style={{ color: primaryColor }}
                                    >
                                      $
                                      {expenseSummary.totalContributions.toFixed(
                                        2,
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mb-2">
                                    <span
                                      className="text-sm opacity-80"
                                      style={{ color: primaryColor }}
                                    >
                                      Total Expenses
                                    </span>
                                    <span
                                      className="font-semibold"
                                      style={{ color: primaryColor }}
                                    >
                                      ${expenseSummary.totalExpenses.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="border-t border-border/50 pt-2 mt-2">
                                    <div className="flex justify-between items-center">
                                      <span
                                        className="text-sm font-medium"
                                        style={{ color: primaryColor }}
                                      >
                                        Net Position
                                      </span>
                                      <span
                                        className={cn(
                                          "font-bold",
                                          expenseSummary.netPosition >= 0
                                            ? "text-success"
                                            : "text-destructive",
                                        )}
                                        style={{
                                          color:
                                            expenseSummary.netPosition >= 0
                                              ? undefined
                                              : primaryColor,
                                        }}
                                      >
                                        ${expenseSummary.netPosition.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="text-sm opacity-70 text-center"
                                style={{ color: primaryColor }}
                              >
                                Loading summary...
                              </p>
                            )
                          ) : visibleExpenses.length === 0 ? (
                            <p
                              className="text-sm opacity-70 text-center"
                              style={{ color: primaryColor }}
                            >
                              No expenses visible
                            </p>
                          ) : (
                            visibleExpenses.map((expense) => {
                              const dateValue = expense.date
                                ? new Date(expense.date)
                                : new Date();
                              return (
                                <div
                                  key={expense.expense_id}
                                  className="bg-card/50 border border-border/50 rounded-lg p-3"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={cn(
                                        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                                        categoryColors[
                                          expense.expense_category
                                        ] ||
                                          "bg-secondary text-secondary-foreground",
                                      )}
                                    >
                                      {expense.expense_category}
                                    </span>
                                    <span
                                      className="font-semibold"
                                      style={{ color: primaryColor }}
                                    >
                                      ${Number(expense.amount).toFixed(2)}
                                    </span>
                                  </div>
                                  <p
                                    className="text-sm"
                                    style={{ color: primaryColor }}
                                  >
                                    {expense.expense_name}
                                  </p>
                                  <p
                                    className="text-xs opacity-70 mt-1"
                                    style={{ color: primaryColor }}
                                  >
                                    {format(dateValue, "MMM d, yyyy")}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </TabsContent>
                  )}

                  <TabsContent value="contributions" className="mt-4">
                    {!showVerifiedMemberPreview ? (
                      <div className="bg-card/50 border border-border/50 rounded-lg p-6 text-center">
                        <Lock
                          className="h-12 w-12 mx-auto mb-4 opacity-70"
                          style={{ color: primaryColor }}
                        />
                        <p
                          className="mb-4 opacity-70"
                          style={{ color: primaryColor }}
                        >
                          Verify to see your contributions
                        </p>
                        {isVerified ? (
                          <Button onClick={() => setPreviewVerifiedMemberView(true)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Switch to verified preview
                          </Button>
                        ) : (
                          <Button onClick={handleRequestAccess}>
                            <Lock className="h-4 w-4 mr-2" />
                            Verify
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {contributions.length === 0 ? (
                          <div className="bg-card/50 border border-border/50 rounded-lg p-6 text-center">
                            <p
                              className="text-sm opacity-70"
                              style={{ color: primaryColor }}
                            >
                              Verified member contributions will appear here
                              after a member is verified.
                            </p>
                          </div>
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
                {showOtpVerification &&
                  !showVerifiedMemberPreview &&
                  !isVerified && (
                    <div
                      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                      style={{ position: "absolute" }}
                    >
                      <Card className="w-full max-w-md bg-card border-border">
                        <CardHeader>
                          <CardTitle>Verify Your Identity</CardTitle>
                          <CardDescription>
                            Enter your verified phone number to access your
                            contributions
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
                              <Label htmlFor="preview-otp">
                                Enter OTP Code
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id="preview-otp"
                                  placeholder="000000"
                                  value={otp}
                                  onChange={(e) =>
                                    setOtp(e.target.value.replace(/\D/g, ""))
                                  }
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

                <p className="text-xs opacity-60" style={{ color: previewTextColor }}>
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
              <Label className="text-sm text-muted-foreground">
                Your public page URL
              </Label>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Branding</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="custom-theme-toggle" className="text-sm text-muted-foreground cursor-pointer">
                  Use Custom Colors
                </Label>
                <Switch
                  id="custom-theme-toggle"
                  checked={useCustomTheme}
                  onCheckedChange={setUseCustomTheme}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Primary Color */}
              <div>
                <Label className="font-semibold text-sm">Primary Brand Color</Label>
                <p className="text-xs text-muted-foreground mb-2">Used for buttons, links, and active elements</p>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div
                      className={cn(
                        "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                        !useCustomTheme && "opacity-60"
                      )}
                      style={{
                        backgroundColor: useCustomTheme ? customPrimaryColor : THEME_DEFAULTS.primary,
                        width: "80px",
                        height: "40px",
                      }}
                    >
                      <Input
                        type="color"
                        value={useCustomTheme ? customPrimaryColor : THEME_DEFAULTS.primary}
                        onChange={(e) => setCustomPrimaryColor(e.target.value)}
                        disabled={!useCustomTheme}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        style={{
                          border: "none",
                          outline: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                        }}
                      />
                    </div>
                    <Input
                      type="text"
                      value={useCustomTheme ? customPrimaryColor.toUpperCase() : THEME_DEFAULTS.primary}
                      onChange={(e) => setCustomPrimaryColor(e.target.value.toUpperCase())}
                      disabled={!useCustomTheme}
                      placeholder="#FFBD59"
                      className="w-28 uppercase font-mono"
                    />
                  </div>
                  {!useCustomTheme && (
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">Default</span>
                  )}
                </div>
              </div>

              {/* Light Mode Colors */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold mb-3">Light Mode Colors</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Background - Light</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customBackgroundLightColor : THEME_DEFAULTS.backgroundLight,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customBackgroundLightColor : THEME_DEFAULTS.backgroundLight}
                          onChange={(e) => setCustomBackgroundLightColor(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customBackgroundLightColor.toUpperCase() : THEME_DEFAULTS.backgroundLight}
                        onChange={(e) => setCustomBackgroundLightColor(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#F6F1EA"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Secondary - Light</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customSecondaryLightColor : THEME_DEFAULTS.secondaryLight,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customSecondaryLightColor : THEME_DEFAULTS.secondaryLight}
                          onChange={(e) => setCustomSecondaryLightColor(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customSecondaryLightColor.toUpperCase() : THEME_DEFAULTS.secondaryLight}
                        onChange={(e) => setCustomSecondaryLightColor(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#ECE7DF"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Text - Light</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customTextColor : THEME_DEFAULTS.textColorLight,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customTextColor : THEME_DEFAULTS.textColorLight}
                          onChange={(e) => setCustomTextColor(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customTextColor.toUpperCase() : THEME_DEFAULTS.textColorLight}
                        onChange={(e) => setCustomTextColor(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#2E2E2E"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Button Text - Light</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customButtonTextColor : THEME_DEFAULTS.buttonTextColorLight,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customButtonTextColor : THEME_DEFAULTS.buttonTextColorLight}
                          onChange={(e) => setCustomButtonTextColor(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customButtonTextColor.toUpperCase() : THEME_DEFAULTS.buttonTextColorLight}
                        onChange={(e) => setCustomButtonTextColor(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#2E2E2E"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dark Mode Colors */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold mb-3">Dark Mode Colors</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Background - Dark</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customBackgroundDarkColor : THEME_DEFAULTS.backgroundDark,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customBackgroundDarkColor : THEME_DEFAULTS.backgroundDark}
                          onChange={(e) => setCustomBackgroundDarkColor(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customBackgroundDarkColor.toUpperCase() : THEME_DEFAULTS.backgroundDark}
                        onChange={(e) => setCustomBackgroundDarkColor(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#2E2E2E"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Secondary - Dark</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customSecondaryDarkColor : THEME_DEFAULTS.secondaryDark,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customSecondaryDarkColor : THEME_DEFAULTS.secondaryDark}
                          onChange={(e) => setCustomSecondaryDarkColor(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customSecondaryDarkColor.toUpperCase() : THEME_DEFAULTS.secondaryDark}
                        onChange={(e) => setCustomSecondaryDarkColor(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#3D3D3D"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Text - Dark</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customTextColorDark : THEME_DEFAULTS.textColorDark,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customTextColorDark : THEME_DEFAULTS.textColorDark}
                          onChange={(e) => setCustomTextColorDark(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customTextColorDark.toUpperCase() : THEME_DEFAULTS.textColorDark}
                        onChange={(e) => setCustomTextColorDark(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#F6F1EA"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Button Text - Dark</Label>
                    <div className="flex gap-2 mt-1.5">
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden relative border border-border shadow-inner transition-opacity",
                          !useCustomTheme && "opacity-60"
                        )}
                        style={{
                          backgroundColor: useCustomTheme ? customButtonTextColorDark : THEME_DEFAULTS.buttonTextColorDark,
                          width: "60px",
                          height: "36px",
                        }}
                      >
                        <Input
                          type="color"
                          value={useCustomTheme ? customButtonTextColorDark : THEME_DEFAULTS.buttonTextColorDark}
                          onChange={(e) => setCustomButtonTextColorDark(e.target.value)}
                          disabled={!useCustomTheme}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          style={{
                            border: "none",
                            outline: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                          }}
                        />
                      </div>
                      <Input
                        type="text"
                        value={useCustomTheme ? customButtonTextColorDark.toUpperCase() : THEME_DEFAULTS.buttonTextColorDark}
                        onChange={(e) => setCustomButtonTextColorDark(e.target.value.toUpperCase())}
                        disabled={!useCustomTheme}
                        placeholder="#2E2E2E"
                        className="w-28 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Visibility */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">
                Expense Visibility
              </h3>
            </div>

            {/* Expense Visibility Level - 3-way toggle */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">
                Expense Visibility Level
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    expenseVisibilityLevel === "none" ? "default" : "outline"
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpenseVisibilityLevel("none")}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  None
                </Button>
                <Button
                  type="button"
                  variant={
                    expenseVisibilityLevel === "summary" ? "default" : "outline"
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpenseVisibilityLevel("summary")}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Summary
                </Button>
                <Button
                  type="button"
                  variant={
                    expenseVisibilityLevel === "detailed"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => setExpenseVisibilityLevel("detailed")}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Detailed
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {expenseVisibilityLevel === "none" &&
                  "No expense information is shown to members"}
                {expenseVisibilityLevel === "summary" &&
                  "Members see totals and net position only"}
                {expenseVisibilityLevel === "detailed" &&
                  "Members see individual expenses marked as visible. Individual expense visibility can be managed from the Expenses page in the admin panel."}
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
