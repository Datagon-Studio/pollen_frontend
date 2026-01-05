import { cn } from "@/lib/utils";

type StatusType = "pending" | "confirmed" | "active" | "inactive" | "verified" | "unverified";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  pending: "bg-warning/15 text-warning border-warning/40",
  confirmed: "bg-success/15 text-success border-success/40",
  active: "bg-success/15 text-success border-success/40",
  inactive: "bg-muted text-muted-foreground border-border",
  verified: "bg-success/15 text-success border-success/40",
  unverified: "bg-warning/15 text-warning border-warning/40",
};

const statusLabels: Record<StatusType, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  active: "Active",
  inactive: "Inactive",
  verified: "Active",
  unverified: "Inactive",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border",
        statusStyles[status],
        className
      )}
    >
      {label || statusLabels[status]}
    </span>
  );
}
