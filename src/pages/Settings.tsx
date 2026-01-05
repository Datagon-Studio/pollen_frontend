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
} from "lucide-react";

export default function Settings() {
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
              <Label>Account Name</Label>
              <Input defaultValue="Community Group" className="mt-1.5" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Account Status</Label>
                <Select defaultValue="active">
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account ID</Label>
                <Input defaultValue="ACC-CG-123456" disabled className="mt-1.5 bg-secondary" />
              </div>
            </div>
            <div>
              <Label>Group Logo</Label>
              <div className="mt-1.5 flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-amber flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-foreground">CG</span>
                </div>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New
                </Button>
              </div>
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
              <StatusBadge status="verified" />
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
