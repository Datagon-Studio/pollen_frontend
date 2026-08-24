import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Activity } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import { auditApi, AuditLog } from "@/services/audit.api";
import { useToast } from "@/hooks/use-toast";

const ACTION_LABELS: Record<string, string> = {
  PAYMENT_INITIALIZED: "Payment started",
  PAYMENT_VERIFIED: "Payment verified",
  PAYMENT_RECORDED: "Contribution recorded",
  PAYMENT_RECORDING_FAILED: "Recording failed",
  PAYMENT_FAILED: "Payment failed",
  CONTRIBUTION_CREATED: "Contribution created",
  CONTRIBUTION_CONFIRMED: "Contribution confirmed",
};

function statusVariant(status: AuditLog["status"]) {
  if (status === "success") return "default";
  if (status === "failed") return "secondary";
  return "destructive";
}

export default function Activity() {
  const { user } = useAuth();
  const { account } = useAccount(user?.id);
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    if (!account?.account_id) return;

    setLoading(true);
    auditApi
      .getByAccount(account.account_id, {
        limit: 100,
        category: category === "all" ? undefined : (category as any),
      })
      .then(setLogs)
      .catch((error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load activity",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [account?.account_id, category, toast]);

  const paymentFailures = useMemo(
    () => logs.filter((log) => log.action_type === "PAYMENT_RECORDING_FAILED"),
    [logs]
  );

  return (
    <AppLayout>
      <PageHeader
        title="Activity Log"
        description="Track payments, contributions, and system events"
        actions={
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All activity</SelectItem>
              <SelectItem value="PAYMENT">Payments</SelectItem>
              <SelectItem value="CONTRIBUTION">Contributions</SelectItem>
              <SelectItem value="MEMBER">Members</SelectItem>
              <SelectItem value="SYSTEM">System</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {paymentFailures.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4 mb-6">
          <p className="font-medium text-foreground">
            {paymentFailures.length} payment recording failure{paymentFailures.length === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            These payments may have succeeded on Paystack but were not saved. Use the payment reference to retry verify.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No activity recorded yet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {logs.map((log) => {
            const reference =
              log.entity_id ||
              (log.action_details?.payment_reference as string | undefined) ||
              "—";

            return (
              <div key={log.audit_id} className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">
                      {ACTION_LABELS[log.action_type] || log.action_type.replaceAll("_", " ")}
                    </p>
                    <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                    <Badge variant="outline">{log.action_category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                  </p>
                  {log.action_type.startsWith("PAYMENT") && (
                    <p className="text-sm text-foreground">
                      Reference: <span className="font-mono">{reference}</span>
                    </p>
                  )}
                  {log.error_message && (
                    <p className="text-sm text-destructive">{log.error_message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
