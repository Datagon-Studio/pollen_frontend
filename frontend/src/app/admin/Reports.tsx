import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Calendar,
  Loader2,
  Monitor,
  User,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import {
  reportingApi,
  MonthlyData,
  FundBreakdown,
  NetPosition,
  PaymentChannelBreakdown,
} from "@/services/reporting.api";
import { useToast } from "@/components/ui/use-toast";
import { StatCard } from "@/components/ui/stat-card";

const FUND_COLORS = [
  '#f59e0b',
  '#fbbf24',
  '#d97706',
  '#b45309',
  '#92400e',
  '#78350f',
];

export default function Reports() {
  const { user } = useAuth();
  const { account, loading: accountLoading } = useAccount(user?.id);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<number>(6); // months
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [fundBreakdown, setFundBreakdown] = useState<FundBreakdown[]>([]);
  const [netPosition, setNetPosition] = useState<NetPosition | null>(null);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannelBreakdown | null>(null);

  useEffect(() => {
    if (account?.account_id) {
      loadReports();
    }
  }, [account?.account_id, period]);

  const loadReports = async () => {
    if (!account?.account_id) return;

    setLoading(true);
    try {
      const [monthly, funds, net, channelsResult] = await Promise.all([
        reportingApi.getMonthlyOverview(account.account_id, period),
        reportingApi.getFundBreakdown(account.account_id),
        reportingApi.getNetPosition(account.account_id),
        reportingApi.getPaymentChannelBreakdown(account.account_id, period).catch((err) => {
          console.error("Error loading payment channel breakdown:", err);
          return null;
        }),
      ]);

      setMonthlyData(monthly);
      setFundBreakdown(funds);
      setNetPosition(net);
      setPaymentChannels(channelsResult);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalContributions = monthlyData.reduce((sum, d) => sum + d.contributions, 0);
  const totalExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0);
  const netPos = netPosition?.netPosition ?? (totalContributions - totalExpenses);
  const paystackAmount = paymentChannels?.paystack.amount ?? 0;
  const manualAmount = paymentChannels?.manual.amount ?? 0;
  const paystackCount = paymentChannels?.paystack.count ?? 0;
  const manualCount = paymentChannels?.manual.count ?? 0;

  const formatMoney = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handlePeriodChange = (value: string) => {
    const monthsMap: Record<string, number> = {
      '30days': 1,
      '3months': 3,
      '6months': 6,
      '12months': 12,
    };
    setPeriod(monthsMap[value] || 6);
  };

  if (accountLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Financial insights and analytics"
        actions={
          <div className="flex gap-2">
            <Select defaultValue="6months" onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-amber">
          <p className="text-sm text-muted-foreground">Total Contributions</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatMoney(totalContributions)}
          </p>
          {netPosition && (
            <p className="text-xs text-success mt-1">
              {netPosition.totalContributions > 0 ? '+' : ''}
              {((netPosition.totalContributions / (netPosition.totalContributions + netPosition.totalExpenses)) * 100).toFixed(1)}% of total
            </p>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-charcoal">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatMoney(totalExpenses)}
          </p>
          {netPosition && (
            <p className="text-xs text-muted-foreground mt-1">
              {netPosition.totalExpenses > 0 ? '+' : ''}
              {((netPosition.totalExpenses / (netPosition.totalContributions + netPosition.totalExpenses)) * 100).toFixed(1)}% of total
            </p>
          )}
        </div>
        <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-success">
          <p className="text-sm text-muted-foreground">Net Position</p>
          <p className={`text-2xl font-semibold ${netPos >= 0 ? 'text-success' : 'text-destructive'}`}>
            {netPos >= 0 ? '+' : ''}{formatMoney(netPos)}
          </p>
          <p className={`text-xs mt-1 ${netPos >= 0 ? 'text-success' : 'text-destructive'}`}>
            {netPos >= 0 ? 'Surplus' : 'Deficit'}
          </p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          title="Paystack Payments"
          value={formatMoney(paystackAmount)}
          subtitle={`${paystackCount} payment${paystackCount === 1 ? "" : "s"}`}
          icon={Monitor}
          accentBorder
        />
        <StatCard
          title="Manual Payments"
          value={formatMoney(manualAmount)}
          subtitle={`${manualCount} payment${manualCount === 1 ? "" : "s"}`}
          icon={User}
          accentBorder
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-medium text-foreground mb-4">Monthly Overview</h3>
          {monthlyData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="contributions" fill="hsl(38, 95%, 55%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(220, 15%, 35%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-amber" />
                  <span className="text-sm text-muted-foreground">Contributions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-charcoal-light" />
                  <span className="text-sm text-muted-foreground">Expenses</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available for the selected period
            </div>
          )}
        </div>

        {/* Fund Breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-medium text-foreground mb-4">Contributions by Fund</h3>
          {fundBreakdown.length > 0 ? (
            <>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={fundBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {fundBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {fundBreakdown.map((fund) => (
                    <div key={fund.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: fund.color }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {fund.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No fund contributions available
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
