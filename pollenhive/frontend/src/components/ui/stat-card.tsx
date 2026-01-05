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
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
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
        <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-amber" />
        </div>
      </div>
    </div>
  );
}
