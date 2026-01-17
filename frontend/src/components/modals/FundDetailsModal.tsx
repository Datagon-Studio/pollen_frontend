import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Wallet, TrendingUp, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Fund {
  id: number;
  name: string;
  status: "active" | "inactive";
  suggestedAmount: string;
  collected: number;
  target: number | null;
  contributors: number;
  description: string;
  recurring: boolean;
  isPublic?: boolean;
}

interface FundDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
}

// Recent contributions will be loaded from API if needed

export function FundDetailsModal({ open, onOpenChange, fund }: FundDetailsModalProps) {
  if (!fund) return null;

  const progress = fund.target ? (fund.collected / fund.target) * 100 : null;
  const isComplete = progress !== null && progress >= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-amber/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-amber" />
              </div>
              <div>
                <DialogTitle className="text-xl">{fund.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {fund.recurring && (
                    <span className="text-xs bg-gold/20 text-gold-dark px-2 py-0.5 rounded">
                      Recurring
                    </span>
                  )}
                  <StatusBadge status={fund.status} />
                  {fund.isPublic !== undefined && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      fund.isPublic 
                        ? "bg-blue/20 text-blue-dark" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {fund.isPublic ? "Public" : "Private"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">{fund.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Collected</span>
              </div>
              <p className="text-xl font-semibold text-foreground">
                ${fund.collected.toLocaleString()}
              </p>
              {fund.target && (
                <p className="text-xs text-muted-foreground">
                  of ${fund.target.toLocaleString()} target
                </p>
              )}
            </div>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Contributors</span>
              </div>
              <p className="text-xl font-semibold text-foreground">{fund.contributors}</p>
              <p className="text-xs text-muted-foreground">active members</p>
            </div>
          </div>

          {/* Progress Bar (only for non-recurring) */}
          {progress !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">{Math.min(progress, 100).toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(progress, 100)}
                className={cn(
                  "h-3",
                  isComplete ? "[&>div]:bg-success" : "[&>div]:bg-amber"
                )}
              />
            </div>
          )}

          {/* Suggested Amount */}
          <div className="flex items-center justify-between py-3 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Suggested Contribution</span>
            </div>
            <span className="font-medium text-foreground">{fund.suggestedAmount}</span>
          </div>

          {/* Recent Contributions - Load from API when fundId is available */}
          {/* <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Recent Contributions</h4>
            <div className="space-y-2">
              {recentContributions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contributions yet</p>
              ) : (
                recentContributions.map((contribution, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{contribution.member}</p>
                      <p className="text-xs text-muted-foreground">{contribution.date}</p>
                    </div>
                    <span className="font-medium text-foreground">{contribution.amount}</span>
                  </div>
                ))
              )}
            </div>
          </div> */}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>Edit Fund</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
