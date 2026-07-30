import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { memberApi, Member } from "@/services";
import { Loader2 } from "lucide-react";

interface BulkDeleteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onSuccess?: () => void;
}

export function BulkDeleteMemberModal({
  open,
  onOpenChange,
  members,
  onSuccess,
}: BulkDeleteMemberModalProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (members.length === 0) return;

    try {
      setDeleting(true);
      const response = await memberApi.bulkDelete(members.map((member) => member.member_id));

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to delete members");
      }

      const { deleted, failed } = response.data;

      toast({
        title: "Bulk delete complete",
        description: `${deleted.length} member(s) deleted${
          failed.length ? `, ${failed.length} failed` : ""
        }.`,
        variant: deleted.length === 0 ? "destructive" : "default",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete members",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (members.length === 0) return null;

  const previewMembers = members.slice(0, 5);
  const remainingCount = members.length - previewMembers.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Delete {members.length} Member{members.length !== 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the selected members? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <ul className="space-y-1 text-foreground">
            {previewMembers.map((member) => (
              <li key={member.member_id}>{member.full_name}</li>
            ))}
          </ul>
          {remainingCount > 0 && (
            <p className="mt-2 text-muted-foreground">
              and {remainingCount} more...
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${members.length} Member${members.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
