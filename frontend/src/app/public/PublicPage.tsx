import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Copy, Check, Upload, Wallet, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

// Fund model based on spec with is_active and is_public
const funds = [
  { id: 1, fundName: "Emergency Fund", isActive: true, isPublic: true },
  { id: 2, fundName: "Annual Dues 2026", isActive: true, isPublic: true },
  { id: 3, fundName: "Building Renovation", isActive: true, isPublic: true },
  { id: 4, fundName: "Youth Program", isActive: true, isPublic: false },
  { id: 5, fundName: "Scholarship Fund", isActive: true, isPublic: true },
];

const publicExpenses = [
  { id: 1, date: "Jan 2, 2026", expenseCategory: "Operations", expenseName: "Office supplies", amount: "$45.00" },
  { id: 2, date: "Jan 1, 2026", expenseCategory: "Utilities", expenseName: "Electricity bill", amount: "$285.00" },
  { id: 3, date: "Dec 30, 2025", expenseCategory: "Events", expenseName: "New Year celebration catering", amount: "$850.00" },
  { id: 4, date: "Dec 28, 2025", expenseCategory: "Events", expenseName: "Venue decoration", amount: "$320.00" },
];

const categoryColors: Record<string, string> = {
  "Operations": "bg-amber/10 text-amber-dark",
  "Events": "bg-gold/20 text-charcoal",
  "Utilities": "bg-muted text-muted-foreground",
};

export default function PublicPage() {
  const [isPublished, setIsPublished] = useState(true);
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState("funds");
  
  // Account Public Page fields based on spec
  const [urlSlug, setUrlSlug] = useState("community-group-123");
  const [displayName, setDisplayName] = useState("Community Group");
  const [primaryColor, setPrimaryColor] = useState("#f59e0b");
  
  const publicUrl = `https://pollenhive.app/g/${urlSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Only show public and active funds on public page
  const activeFunds = funds.filter(f => f.isActive && f.isPublic);

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
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
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
            <div className="p-8 min-h-[500px] bg-background">
              <div className="max-w-md mx-auto text-center">
                {/* Logo placeholder */}
                <div 
                  className="h-16 w-16 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-2xl font-bold text-white">PH</span>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {displayName}
                </h1>
                <p className="text-muted-foreground mb-6">
                  Support our community by contributing to our active funds
                </p>

                {/* Public page tabs */}
                <Tabs value={previewTab} onValueChange={setPreviewTab} className="mb-6">
                  <TabsList className="bg-secondary w-full">
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
                      {activeFunds.map((fund) => (
                        <button
                          key={fund.id}
                          className="w-full bg-card border border-border rounded-lg p-4 text-left hover:border-amber/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-amber" />
                              <span className="font-medium text-foreground">
                                {fund.fundName}
                              </span>
                            </div>
                            <span className="text-amber text-sm">Contribute →</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="expenses" className="mt-4">
                    <div className="space-y-2 text-left">
                      {publicExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="bg-card border border-border rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                                categoryColors[expense.expenseCategory] || "bg-secondary text-secondary-foreground"
                              )}
                            >
                              {expense.expenseCategory}
                            </span>
                            <span className="font-semibold text-foreground">{expense.amount}</span>
                          </div>
                          <p className="text-sm text-foreground">{expense.expenseName}</p>
                          <p className="text-xs text-muted-foreground mt-1">{expense.date}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <p className="text-xs text-muted-foreground">
                  Powered by PollenHive
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="order-1 xl:order-2 space-y-6">
          {/* Publish Toggle */}
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Publish Page</h3>
                <p className="text-sm text-muted-foreground">
                  Make your contribution page publicly accessible
                </p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>

            {isPublished && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">URL Slug</Label>
                  <Input 
                    value={urlSlug} 
                    onChange={(e) => setUrlSlug(e.target.value)}
                    className="mt-1.5" 
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Public URL</Label>
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
                </div>
              </div>
            )}
          </div>

          {/* Branding */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="font-medium text-foreground mb-4">Branding</h3>

            <div className="space-y-4">
              <div>
                <Label>Display Name</Label>
                <Input 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5" 
                />
              </div>

              <div>
                <Label>Logo</Label>
                <div className="mt-1.5 flex items-center gap-4">
                  <div 
                    className="h-14 w-14 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="text-lg font-bold text-white">PH</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                </div>
              </div>

              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 mt-1.5">
                  {["#f59e0b", "#eab308", "#84cc16", "#22c55e", "#3b82f6", "#8b5cf6"].map(
                    (color) => (
                      <button
                        key={color}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-colors",
                          primaryColor === color ? "border-foreground" : "border-transparent hover:border-foreground/20"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setPrimaryColor(color)}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full">Save Changes</Button>
        </div>
      </div>
    </AppLayout>
  );
}
