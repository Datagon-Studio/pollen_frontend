import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Shield,
  Bell,
  Eye,
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Banknote,
  X,
} from "lucide-react";
import { accountApi, Account } from "@/services/account.api";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

export default function Settings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      const accountData = await accountApi.getMyAccount();
      setAccount(accountData);
      setAccountName(accountData.account_name || "");
      setLogoPreview(accountData.account_logo);
    } catch (error) {
      console.error("Error loading account:", error);
      toast({
        title: "Error",
        description: "Failed to load account details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null); // Clear preview to indicate removal
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    // If no file selected, return null to remove logo or keep existing
    if (!logoFile) {
      // If user clicked remove, return null; otherwise keep existing
      return logoPreview === null && account?.account_logo ? null : account?.account_logo || null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("account-logos")
        .upload(fileName, logoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("account-logos")
        .getPublicUrl(fileName);

      console.log("Logo uploaded successfully:", { fileName, publicUrl });
      return publicUrl;
    } catch (err) {
      console.error("Error uploading logo:", err);
      toast({
        title: "Logo Upload Failed",
        description: "Could not upload account logo.",
        variant: "destructive",
      });
      throw err; // Re-throw to prevent saving if upload fails
    }
  };

  const handleSaveAccountDetails = async () => {
    setSaving(true);
    try {
      let logoUrl: string | null;
      
      // Determine the logo URL to save
      if (logoFile) {
        // Upload new logo
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          toast({
            title: "Error",
            description: "Failed to upload logo. Please try again.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      } else if (logoPreview === null && account?.account_logo) {
        // User removed the logo - set to null
        logoUrl = null;
      } else {
        // Keep existing logo
        logoUrl = account?.account_logo || null;
      }

      const updatedAccountName = accountName.trim() === "" ? null : accountName.trim();

      console.log("Saving account with:", { account_name: updatedAccountName, account_logo: logoUrl });

      const updatedAccount = await accountApi.updateMyAccount({
        account_name: updatedAccountName,
        account_logo: logoUrl,
      });

      console.log("Account updated successfully:", updatedAccount);

      // Update local state with the response
      setAccount(updatedAccount);
      setLogoPreview(updatedAccount.account_logo);
      setLogoFile(null); // Clear file selection

      toast({
        title: "Success",
        description: "Account details updated successfully.",
      });
    } catch (error) {
      console.error("Error saving account:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save account details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "UP";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Manage your group account and preferences"
      />

      <div className="max-w-3xl space-y-8">
        {/* Account Details */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Account Details</h2>
              <p className="text-sm text-muted-foreground">
                Basic information about your group
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="mt-1.5"
                placeholder="Enter your account name"
              />
            </div>
            <div>
              <Label>Group Logo</Label>
              <div className="mt-1.5 flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Account Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-foreground">
                      {getInitials(accountName)}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                {logoPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveAccountDetails} disabled={saving} size="sm">
                {saving ? "Saving..." : "Save Account Details"}
              </Button>
            </div>
          </div>
        </section>

        {/* KYC Status */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">KYC Verification</h2>
              <p className="text-sm text-muted-foreground">
                Account verification status for online payments
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* KYC Status Badge */}
            <div className="flex items-center justify-between py-3 px-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Current KYC Status</p>
                <p className="text-sm text-muted-foreground">Verified accounts can accept online payments</p>
              </div>
              <StatusBadge status={account?.kyc_status || "unverified"} />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">Official Name</p>
                  <p className="text-sm text-muted-foreground">Community Group Association</p>
                </div>
              </div>
              <span className="text-xs text-success">Verified</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">Account Type</p>
                  <p className="text-sm text-muted-foreground">Business / Organization</p>
                </div>
              </div>
              <span className="text-xs text-success">Verified</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">National ID</p>
                  <p className="text-sm text-muted-foreground">Administrator identity confirmed</p>
                </div>
              </div>
              <span className="text-xs text-success">Verified</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber" />
                <div>
                  <p className="font-medium text-foreground">Business Registration</p>
                  <p className="text-sm text-muted-foreground">Optional for non-profits</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Upload
              </Button>
            </div>
          </div>
        </section>

        {/* Settlement Details */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Banknote className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Settlement Details</h2>
              <p className="text-sm text-muted-foreground">
                Where online contributions are sent
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Settlement Type</Label>
              <Select defaultValue="mobile_money">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Account Name</Label>
                <Input defaultValue="Community Group" className="mt-1.5" />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input defaultValue="024XXXXXXX" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Provider</Label>
              <Input defaultValue="MTN Mobile Money" className="mt-1.5" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-medium text-foreground">Active Settlement Account</p>
                <p className="text-sm text-muted-foreground">Funds will be sent to this account</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Configure how you receive updates
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Default Notification Channel</Label>
              <Select defaultValue="both">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">SMS and Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">New Contributions</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when members make contributions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Pending Confirmations</p>
                <p className="text-sm text-muted-foreground">
                  Daily summary of contributions awaiting confirmation
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Birthday Messages</p>
                <p className="text-sm text-muted-foreground">
                  Send birthday greetings to members
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Member Portal</p>
                <p className="text-sm text-muted-foreground">
                  Allow members to view their contributions via OTP
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Expense Transparency */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Expense Transparency</h2>
              <p className="text-sm text-muted-foreground">
                Control what members can see
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Expense Visibility Level</Label>
              <Select defaultValue="summary">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="none">None - Hide all expenses</SelectItem>
                  <SelectItem value="summary">Summary - Show totals by category</SelectItem>
                  <SelectItem value="detailed">Detailed - Show individual expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Fund Balances</p>
                <p className="text-sm text-muted-foreground">
                  Display current balance for each fund
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Contribution Rankings</p>
                <p className="text-sm text-muted-foreground">
                  Display top contributors (anonymized)
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
