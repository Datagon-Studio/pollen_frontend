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
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Download,
  ArrowRight,
  Calendar,
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

const monthlyData = [
  { month: "Jul", contributions: 3200, expenses: 1800 },
  { month: "Aug", contributions: 4100, expenses: 2200 },
  { month: "Sep", contributions: 3800, expenses: 1950 },
  { month: "Oct", contributions: 4500, expenses: 2400 },
  { month: "Nov", contributions: 5200, expenses: 2100 },
  { month: "Dec", contributions: 4850, expenses: 2575 },
];

const fundBreakdown = [
  { name: "Emergency Fund", value: 15420, color: "#f59e0b" },
  { name: "Annual Dues", value: 3600, color: "#fbbf24" },
  { name: "Building Fund", value: 8750, color: "#d97706" },
  { name: "Youth Program", value: 2100, color: "#b45309" },
  { name: "Scholarship", value: 6800, color: "#92400e" },
];

const reportTypes = [
  {
    title: "Contributions by Fund",
    description: "Breakdown of contributions across all funds",
    icon: PieChart,
  },
  {
    title: "Contributions by Period",
    description: "Monthly and quarterly contribution trends",
    icon: TrendingUp,
  },
  {
    title: "Expenses Summary",
    description: "Categorized expense breakdown",
    icon: BarChart3,
  },
  {
    title: "Net Position",
    description: "Income vs expenses over time",
    icon: FileText,
  },
];

export default function Reports() {
  const totalContributions = monthlyData.reduce((sum, d) => sum + d.contributions, 0);
  const totalExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0);
  const netPosition = totalContributions - totalExpenses;

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        description="Financial insights and analytics"
        actions={
          <div className="flex gap-2">
            <Select defaultValue="6months">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-amber">
          <p className="text-sm text-muted-foreground">Total Contributions</p>
          <p className="text-2xl font-semibold text-foreground">
            ${totalContributions.toLocaleString()}
          </p>
          <p className="text-xs text-success mt-1">+15% vs previous period</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-charcoal">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-semibold text-foreground">
            ${totalExpenses.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">+8% vs previous period</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-success">
          <p className="text-sm text-muted-foreground">Net Position</p>
          <p className="text-2xl font-semibold text-success">
            +${netPosition.toLocaleString()}
          </p>
          <p className="text-xs text-success mt-1">Healthy surplus</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-medium text-foreground mb-4">Monthly Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
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
        </div>

        {/* Fund Breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-medium text-foreground mb-4">Contributions by Fund</h3>
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
                  formatter={(value: number) => `$${value.toLocaleString()}`}
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
        </div>
      </div>

      {/* Report Types */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Available Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reportTypes.map((report) => (
            <button
              key={report.title}
              className="bg-card border border-border rounded-lg p-5 text-left hover:border-amber/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
                  <report.icon className="h-5 w-5 text-amber" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{report.title}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
