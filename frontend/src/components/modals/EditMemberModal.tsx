import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { memberApi, Member, UpdateMemberInput } from "@/services";

interface EditMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onSuccess?: () => void;
}

export function EditMemberModal({ open, onOpenChange, member, onSuccess }: EditMemberModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dob: undefined as Date | undefined,
    phone: "",
    email: "",
    membershipNumber: "",
  });

  useEffect(() => {
    if (member && open) {
      setFormData({
        fullName: member.full_name || "",
        dob: member.dob ? new Date(member.dob) : undefined,
        phone: member.phone || "",
        email: member.email || "",
        membershipNumber: member.membership_number || "",
      });
    }
  }, [member, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member) return;

    if (!formData.fullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const input: UpdateMemberInput = {
        full_name: formData.fullName.trim(),
        dob: formData.dob ? format(formData.dob, "yyyy-MM-dd") : null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        membership_number: formData.membershipNumber.trim() || null,
      };

      await memberApi.update(member.member_id, input);

      toast({
        title: "Member Updated",
        description: `${formData.fullName} has been updated successfully.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update member",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dob && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dob ? format(formData.dob, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dob}
                    onSelect={(date) => setFormData({ ...formData, dob: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                placeholder="+233 XX XXX XXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {member.phone_verified ? (
                  <span className="text-success">Phone verified</span>
                ) : (
                  <span>Phone not verified</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {member.email_verified ? (
                  <span className="text-success">Email verified</span>
                ) : member.email ? (
                  <span>Email not verified</span>
                ) : (
                  <span>No email</span>
                )}
              </div>
            </div>

            {/* Membership Number */}
            <div className="space-y-2">
              <Label htmlFor="membershipNumber">Membership Number</Label>
              <Input
                id="membershipNumber"
                placeholder="Optional unique ID"
                value={formData.membershipNumber}
                onChange={(e) => setFormData({ ...formData, membershipNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Optional unique identifier for this member</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


