import { useEffect, useState } from "react";
import { format, parseISO, startOfMonth, subDays, subMonths, differenceInCalendarMonths } from "date-fns";
import type { DateRange } from "react-day-picker";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Calendar as CalendarIcon,
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
  ReportQuery,
} from "@/services/reporting.api";
import { useToast } from "@/components/ui/use-toast";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 16 }, (_, index) => CURRENT_YEAR - index);
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PRESETS = [
  { key: "30days", label: "Last 30 Days", showing: "Showing the last 30 days" },
  { key: "3months", label: "Last 3 Months", showing: "Showing the last 3 months" },
  { key: "6months", label: "Last 6 Months", showing: "Showing the last 6 months" },
  { key: "12months", label: "Last 12 Months", showing: "Showing the last 12 months" },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];
type PickerTab = "quick" | "range" | "month";

type AppliedFilter =
  | { kind: "preset"; preset: PresetKey }
  | { kind: "range"; startDate: string; endDate: string }
  | { kind: "monthYear"; month: number | null; years: number[] };

function yearPhrase(years: number[]): string {
  const sorted = (years.length ? years : [...YEAR_OPTIONS]).slice().sort((a, b) => a - b);
  if (years.length === 0) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  if (sorted.length === 1) return String(sorted[0]);
  const contiguous = sorted.every((year, index) => index === 0 || year === sorted[index - 1] + 1);
  if (contiguous) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  if (sorted.length === 2) return `${sorted[0]} and ${sorted[1]}`;
  if (sorted.length === 3) return `${sorted[0]}, ${sorted[1]}, and ${sorted[2]}`;
  return `${sorted.length} years`;
}

function buttonLabel(filter: AppliedFilter): string {
  if (filter.kind === "preset") {
    return PRESETS.find((preset) => preset.key === filter.preset)?.label ?? "Last 6 Months";
  }
  if (filter.kind === "range") {
    return `${format(parseISO(filter.startDate), "MMM d, yyyy")} – ${format(parseISO(filter.endDate), "MMM d, yyyy")}`;
  }
  if (filter.month && filter.years.length === 1) {
    return `${MONTH_SHORT[filter.month - 1]} ${filter.years[0]}`;
  }
  if (filter.month && filter.years.length === 0) {
    return `${MONTH_SHORT[filter.month - 1]} · all years`;
  }
  if (filter.month) {
    return `${MONTH_SHORT[filter.month - 1]} · ${filter.years.length} years`;
  }
  return yearPhrase(filter.years);
}

function showingText(filter: AppliedFilter): string {
  if (filter.kind === "preset") {
    return PRESETS.find((preset) => preset.key === filter.preset)?.showing ?? "Showing the last 6 months";
  }
  if (filter.kind === "range") {
    return `Showing ${format(parseISO(filter.startDate), "MMM d, yyyy")} – ${format(parseISO(filter.endDate), "MMM d, yyyy")}`;
  }
  const years = yearPhrase(filter.years);
  if (filter.month && filter.years.length === 0) {
    return `Showing ${MONTH_NAMES[filter.month - 1]} for ${years}`;
  }
  if (filter.month && filter.years.length === 1) {
    return `Showing ${MONTH_NAMES[filter.month - 1]} ${filter.years[0]}`;
  }
  if (filter.month) {
    return `Showing ${MONTH_NAMES[filter.month - 1]} in ${years}`;
  }
  return `Showing ${years}`;
}

function buildReportQuery(filter: AppliedFilter): ReportQuery {
  const today = new Date();
  if (filter.kind === "preset") {
    const endDate = format(today, "yyyy-MM-dd");
    if (filter.preset === "30days") {
      return { startDate: format(subDays(today, 29), "yyyy-MM-dd"), endDate };
    }
    const count = filter.preset === "3months" ? 3 : filter.preset === "6months" ? 6 : 12;
    return {
      startDate: format(startOfMonth(subMonths(today, count - 1)), "yyyy-MM-dd"),
      endDate,
    };
  }
  if (filter.kind === "range") {
    return { startDate: filter.startDate, endDate: filter.endDate };
  }

  const years = (filter.years.length ? filter.years : YEAR_OPTIONS).slice().sort((a, b) => a - b);
  const contiguous = years.every((year, index) => index === 0 || year === years[index - 1] + 1);
  return {
    startDate: `${years[0]}-01-01`,
    endDate: `${years[years.length - 1]}-12-31`,
    ...(filter.month ? { month: filter.month } : {}),
    ...(contiguous ? {} : { years }),
  };
}

function ReportPeriodPicker({
  applied,
  onApply,
}: {
  applied: AppliedFilter;
  onApply: (filter: AppliedFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PickerTab>("quick");
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [draftMonth, setDraftMonth] = useState("all");
  const [draftYears, setDraftYears] = useState<number[]>([]);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);

  const syncDraft = (filter: AppliedFilter) => {
    setRangeError(null);
    setPeriodError(null);
    if (filter.kind === "range") {
      setTab("range");
      setDraftRange({ from: parseISO(filter.startDate), to: parseISO(filter.endDate) });
      setDraftMonth("all");
      setDraftYears([]);
      return;
    }
    if (filter.kind === "monthYear") {
      setTab("month");
      setDraftRange(undefined);
      setDraftMonth(filter.month ? String(filter.month) : "all");
      setDraftYears(filter.years);
      return;
    }
    setTab("quick");
    setDraftRange(undefined);
    setDraftMonth("all");
    setDraftYears([]);
  };

  const applyPreset = (preset: PresetKey) => {
    onApply({ kind: "preset", preset });
    setOpen(false);
  };

  const applyRange = () => {
    if (!draftRange?.from || !draftRange.to) {
      setRangeError("Pick a start date and an end date.");
      return;
    }
    const from = draftRange.from <= draftRange.to ? draftRange.from : draftRange.to;
    const to = draftRange.from <= draftRange.to ? draftRange.to : draftRange.from;
    if (differenceInCalendarMonths(to, from) > 60) {
      setRangeError("Choose a range of 5 years or less.");
      return;
    }
    onApply({
      kind: "range",
      startDate: format(from, "yyyy-MM-dd"),
      endDate: format(to, "yyyy-MM-dd"),
    });
    setOpen(false);
  };

  const applyMonthYear = () => {
    const month = draftMonth === "all" ? null : Number(draftMonth);
    if (!month && draftYears.length === 0) {
      setPeriodError("Choose a month, one or more years, or both.");
      return;
    }
    if (!month && draftYears.length > 3) {
      setPeriodError("Select a month when comparing more than 3 years.");
      return;
    }
    onApply({
      kind: "monthYear",
      month,
      years: draftYears.slice().sort((a, b) => a - b),
    });
    setOpen(false);
  };

  const toggleYear = (year: number) => {
    setPeriodError(null);
    setDraftYears((current) =>
      current.includes(year)
        ? current.filter((value) => value !== year)
        : [...current, year].sort((a, b) => b - a),
    );
  };

  const rangeSummary = draftRange?.from
    ? draftRange.to
      ? `${format(draftRange.from, "MMM d, yyyy")} – ${format(draftRange.to, "MMM d, yyyy")}`
      : `${format(draftRange.from, "MMM d, yyyy")} – pick an end date`
    : "Pick a start date, then an end date.";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) syncDraft(applied);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[260px] justify-start" aria-label={`Report period: ${buttonLabel(applied)}`}>
          <CalendarIcon className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{buttonLabel(applied)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] max-h-[min(32rem,calc(100vh-6rem))] max-w-[calc(100vw-2rem)] overflow-y-auto p-3 bg-card border-border"
      >
        <Tabs value={tab} onValueChange={(value) => setTab(value as PickerTab)}>
          <TabsList className="grid h-9 w-full grid-cols-3">
            <TabsTrigger value="quick" className="text-xs">Quick</TabsTrigger>
            <TabsTrigger value="range" className="text-xs">Date range</TabsTrigger>
            <TabsTrigger value="month" className="text-xs">Month / year</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  size="sm"
                  variant={applied.kind === "preset" && applied.preset === preset.key ? "default" : "outline"}
                  onClick={() => applyPreset(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="range" className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">{rangeSummary}</p>
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={(range) => {
                setDraftRange(range);
                setRangeError(null);
              }}
              defaultMonth={draftRange?.from}
              numberOfMonths={1}
              className="p-0"
            />
            {rangeError && <p className="text-xs text-destructive">{rangeError}</p>}
            <Button type="button" size="sm" className="w-full" onClick={applyRange}>
              Apply range
            </Button>
          </TabsContent>

          <TabsContent value="month" className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose a month, one or more years, or both. A month with no year covers every year shown.
            </p>
            <div>
              <p className="mb-2 text-xs font-medium text-foreground">Month</p>
              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={draftMonth === "all" ? "default" : "outline"}
                  className="col-span-4 h-8"
                  onClick={() => {
                    setDraftMonth("all");
                    setPeriodError(null);
                  }}
                >
                  All months
                </Button>
                {MONTH_SHORT.map((label, index) => {
                  const value = String(index + 1);
                  return (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={draftMonth === value ? "default" : "outline"}
                      className="h-8 px-2"
                      onClick={() => {
                        setDraftMonth(value);
                        setPeriodError(null);
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">Years</p>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setPeriodError(null);
                    setDraftYears((current) =>
                      current.length === YEAR_OPTIONS.length ? [] : [...YEAR_OPTIONS],
                    );
                  }}
                >
                  {draftYears.length === YEAR_OPTIONS.length ? "Clear years" : "All years"}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {YEAR_OPTIONS.map((year) => (
                  <Button
                    key={year}
                    type="button"
                    size="sm"
                    variant={draftYears.includes(year) ? "default" : "outline"}
                    className="h-8 px-2"
                    onClick={() => toggleYear(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </div>
            {periodError && <p className="text-xs text-destructive">{periodError}</p>}
            <Button type="button" size="sm" className="w-full" onClick={applyMonthYear}>
              Apply month / year
            </Button>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const { account, loading: accountLoading } = useAccount(user?.id);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [applied, setApplied] = useState<AppliedFilter>({ kind: "preset", preset: "6months" });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [fundBreakdown, setFundBreakdown] = useState<FundBreakdown[]>([]);
  const [netPosition, setNetPosition] = useState<NetPosition | null>(null);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannelBreakdown | null>(null);

  useEffect(() => {
    if (!account?.account_id) return;
    const query = buildReportQuery(applied);
    let cancelled = false;

    const loadReports = async () => {
      setLoading(true);
      try {
        const [monthly, funds, net, channelsResult] = await Promise.all([
          reportingApi.getMonthlyOverview(account.account_id, query),
          reportingApi.getFundBreakdown(account.account_id, query),
          reportingApi.getNetPosition(account.account_id, query),
          reportingApi.getPaymentChannelBreakdown(account.account_id, query).catch((err) => {
            console.error("Error loading payment channel breakdown:", err);
            return null;
          }),
        ]);

        if (cancelled) return;
        setMonthlyData(monthly);
        setFundBreakdown(funds);
        setNetPosition(net);
        setPaymentChannels(channelsResult);
      } catch (error) {
        console.error("Error loading reports:", error);
        if (!cancelled) {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to load reports",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    };

    loadReports();
    return () => {
      cancelled = true;
    };
  }, [account?.account_id, applied, toast]);

  const totalContributions = monthlyData.reduce((sum, d) => sum + d.contributions, 0);
  const totalExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0);
  const netPos = netPosition?.netPosition ?? (totalContributions - totalExpenses);
  const paystackAmount = paymentChannels?.paystack.amount ?? 0;
  const manualAmount = paymentChannels?.manual.amount ?? 0;
  const paystackCount = paymentChannels?.paystack.count ?? 0;
  const manualCount = paymentChannels?.manual.count ?? 0;
  const activityTotal = (netPosition?.totalContributions ?? 0) + (netPosition?.totalExpenses ?? 0);
  const denseAxis = monthlyData.length > 8;

  const formatMoney = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (accountLoading || (loading && !hasLoaded)) {
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
            <ReportPeriodPicker applied={applied} onApply={setApplied} />
            {loading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        }
      />

      <p className="-mt-4 mb-6 text-sm text-muted-foreground">{showingText(applied)}</p>

      <div className={cn(loading && "opacity-60")}>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-amber">
            <p className="text-sm text-muted-foreground">Total Contributions</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatMoney(totalContributions)}
            </p>
            {netPosition && activityTotal > 0 && (
              <p className="text-xs text-success mt-1">
                {((netPosition.totalContributions / activityTotal) * 100).toFixed(1)}% of total
              </p>
            )}
          </div>
          <div className="bg-card border border-border rounded-lg p-5 border-t-2 border-t-charcoal">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatMoney(totalExpenses)}
            </p>
            {netPosition && activityTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((netPosition.totalExpenses / activityTotal) * 100).toFixed(1)}% of total
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
                    <BarChart data={monthlyData} margin={{ bottom: denseAxis ? 16 : 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        interval={denseAxis ? "preserveStartEnd" : 0}
                        angle={denseAxis ? -40 : 0}
                        textAnchor={denseAxis ? "end" : "middle"}
                        height={denseAxis ? 50 : 30}
                      />
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
                No data available for this period
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
      </div>
    </AppLayout>
  );
}
