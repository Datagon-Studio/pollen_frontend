import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Copy, Check, Wallet, Receipt, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/hooks/useAccount";
import { accountApi } from "@/services/account.api";
import { expenseApi, Expense } from "@/services/expense.api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark",
  "Events": "bg-gold/20 text-charcoal",
  "Utilities": "bg-muted text-muted-foreground",
};

export default function PublicPage() {
  const { account, loading: accountLoading } = useAccount();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState("funds");
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  
  // Color states
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  // Load account data and expenses
  useEffect(() => {
    if (account) {
      setForegroundColor(account.foreground_color || "#000000");
      setBackgroundColor(account.background_color || "#ffffff");
      loadExpenses();
    }
  }, [account]);

  const loadExpenses = async () => {
    if (!account) return;
    try {
      setLoadingExpenses(true);
      const allExpenses = await expenseApi.getAll();
      setExpenses(allExpenses);
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

  const handleToggleExpenseVisibility = async (expenseId: string) => {
    try {
      await expenseApi.toggleVisibility(expenseId);
      await loadExpenses();
      toast({
        title: "Success",
        description: "Expense visibility updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update expense visibility",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!account) return;
    try {
      setSaving(true);
      await accountApi.updateMyAccount({
        foreground_color: foregroundColor,
        background_color: backgroundColor,
      });
      toast({
        title: "Success",
        description: "Public page settings saved",
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

  const publicUrl = account ? `https://localhost:3001/g/${account.account_id}` : "";

  const handleCopy = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter expenses that are visible (member_visible = true)
  const visibleExpenses = expenses.filter(e => e.member_visible);
  const hiddenExpenses = expenses.filter(e => !e.member_visible);

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
        title="Public Page"
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
                backgroundColor: backgroundColor,
                color: foregroundColor 
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
                    />
                  </div>
                )}

                <h1 
                  className="text-2xl font-bold mb-2"
                  style={{ color: foregroundColor }}
                >
                  {account.account_name || "Community Group"}
                </h1>
                <p 
                  className="mb-6 opacity-80"
                  style={{ color: foregroundColor }}
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
                    <TabsTrigger value="expenses" className="flex-1">
                      <Receipt className="h-4 w-4 mr-2" />
                      Expenses
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="funds" className="mt-4">
                    <div className="space-y-3">
                      <p className="text-sm opacity-70" style={{ color: foregroundColor }}>
                        Funds will appear here
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="expenses" className="mt-4">
                    <div className="space-y-2 text-left">
                      {visibleExpenses.length === 0 ? (
                        <p className="text-sm opacity-70 text-center" style={{ color: foregroundColor }}>
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
                                <span className="font-semibold" style={{ color: foregroundColor }}>
                                  ${Number(expense.amount).toFixed(2)}
                                </span>
                              </div>
                              <p className="text-sm" style={{ color: foregroundColor }}>
                                {expense.expense_name}
                              </p>
                              <p className="text-xs opacity-70 mt-1" style={{ color: foregroundColor }}>
                                {format(dateValue, "MMM d, yyyy")}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <p className="text-xs opacity-60" style={{ color: foregroundColor }}>
                  Powered by PollenHive
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

            <div className="space-y-4">
              <div>
                <Label>Foreground Color</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="h-10 w-20 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Background Color</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-10 w-20 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expense Visibility */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-medium text-foreground mb-4">Expense Visibility</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Control which expenses are visible on your public page
            </p>

            {loadingExpenses ? (
              <div className="text-sm text-muted-foreground">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-sm text-muted-foreground">No expenses found</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {expenses.map((expense) => {
                  const dateValue = expense.date ? new Date(expense.date) : new Date();
                  return (
                    <div
                      key={expense.expense_id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground truncate">
                            {expense.expense_name}
                          </span>
                          {!expense.member_visible && (
                            <span className="text-xs text-muted-foreground">(Hidden)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{expense.expense_category}</span>
                          <span>•</span>
                          <span>${Number(expense.amount).toFixed(2)}</span>
                          <span>•</span>
                          <span>{format(dateValue, "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <Switch
                        checked={expense.member_visible}
                        onCheckedChange={() => handleToggleExpenseVisibility(expense.expense_id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
