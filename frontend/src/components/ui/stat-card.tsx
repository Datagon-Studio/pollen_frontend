import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  accentBorder?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentBorder = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-5 transition-shadow hover:shadow-sm",
        accentBorder && "border-t-2 border-t-amber",
        className
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-amber" />
          </div>
        </div>
        <p className={cn(
          "font-semibold text-foreground",
          value.length >= 15 ? "text-lg" : value.length >= 12 ? "text-xl" : "text-2xl"
        )}>{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
