import { useState, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Check, ChevronsUpDown, CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fundApi, Fund } from "@/services";
import { memberApi, Member } from "@/services";
import { useAccount } from "@/hooks/useAccount";
import { contributionApi } from "@/services/contribution.api";

interface RecordContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Channel options based on spec: offline channels for manual recording
const channels = ["Cash", "Bank Deposit", "Cheque", "Mobile Money"];

export function RecordContributionModal({ open, onOpenChange, onSuccess }: RecordContributionModalProps) {
  const { toast } = useToast();
  const { account } = useAccount();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && account?.account_id) {
      loadFunds();
      loadMembers();
    }
  }, [open, account?.account_id]);

  const loadFunds = async () => {
    if (!account?.account_id) return;
    
    try {
      setLoadingFunds(true);
      const data = await fundApi.getAll();
      setFunds(data || []);
    } catch (error) {
      console.error("Failed to load funds:", error);
      toast({
        title: "Error",
        description: "Failed to load funds",
        variant: "destructive",
      });
      setFunds([]);
    } finally {
      setLoadingFunds(false);
    }
  };

  const loadMembers = async () => {
    if (!account?.account_id) return;
    
    try {
      setLoadingMembers(true);
      const response = await memberApi.getByAccount(account.account_id);
      if (response.success && response.data) {
        setMembers(response.data || []);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Failed to load members:", error);
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };
  const [formData, setFormData] = useState({
    member: "",
    fund: "",
    amount: "",
    channel: "",
    dateReceived: new Date(),
    comment: "",
  });
  const [memberOpen, setMemberOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [fundSearch, setFundSearch] = useState("");

  const selectedMember = members.find(m => m.member_id === formData.member);
  const selectedFund = funds.find(f => f.fund_id === formData.fund);
  const defaultAmount = selectedFund?.default_amount || 0;

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const search = memberSearch.toLowerCase();
    return members.filter(m => 
      m.full_name.toLowerCase().includes(search) ||
      m.phone.toLowerCase().includes(search) ||
      (m.membership_number && m.membership_number.toLowerCase().includes(search))
    );
  }, [memberSearch, members]);

  const filteredFunds = useMemo(() => {
    if (!fundSearch) return funds;
    return funds.filter(f => 
      f.fund_name.toLowerCase().includes(fundSearch.toLowerCase())
    );
  }, [fundSearch, funds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account?.account_id) {
      toast({
        title: "Error",
        description: "Account not found",
        variant: "destructive",
      });
      return;
    }

    if (!formData.member || !formData.fund || !formData.amount || !formData.channel) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFund && selectedFund.default_amount && amount < selectedFund.default_amount) {
      toast({
        title: "Validation Error",
        description: `Minimum contribution for ${selectedFund.fund_name} is $${selectedFund.default_amount}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Map channel to contribution channel format
      const channel = formData.channel === "Cash" || formData.channel === "Bank Deposit" || formData.channel === "Cheque" 
        ? "offline" 
        : "online";

      const response = await contributionApi.create({
        account_id: account.account_id,
        fund_id: formData.fund,
        member_id: formData.member,
        amount: amount,
        channel: channel,
        payment_method: formData.channel, // Store the actual payment method selected
        date_received: formData.dateReceived.toISOString(),
        comment: formData.comment || null,
        payment_reference: null,
        status: "pending",
        received_by_user_id: null, // Will be set by backend from auth token
      });

      if (response.success) {
        toast({
          title: "Success",
          description: `Contribution of $${amount.toFixed(2)} has been recorded.`,
        });

        setFormData({ 
          member: "", 
          fund: "", 
          amount: "", 
          channel: "", 
          dateReceived: new Date(), 
          comment: "" 
        });
        setMemberSearch("");
        setFundSearch("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        throw new Error(response.error || "Failed to record contribution");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to record contribution";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setMemberSearch("");
      setFundSearch("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Record Contribution</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Member Search */}
            <div className="space-y-2">
              <Label>Member *</Label>
              <Popover open={memberOpen} onOpenChange={setMemberOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={memberOpen}
                    className="w-full justify-between font-normal"
                    disabled={loadingMembers}
                  >
                    {loadingMembers ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading members...
                      </>
                    ) : selectedMember ? (
                      selectedMember.full_name
                    ) : (
                      "Search member..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search member..." 
                      value={memberSearch}
                      onValueChange={setMemberSearch}
                    />
                    <CommandList>
                      {loadingMembers ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No member found.</CommandEmpty>
                          <CommandGroup>
                            {filteredMembers.map((member) => (
                              <CommandItem
                                key={member.member_id}
                                value={member.full_name}
                                onSelect={() => {
                                  setFormData({ ...formData, member: member.member_id });
                                  setMemberOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.member === member.member_id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{member.full_name}</span>
                                  {member.phone && (
                                    <span className="text-xs text-muted-foreground">{member.phone}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Fund Search */}
            <div className="space-y-2">
              <Label>Fund *</Label>
              <Popover open={fundOpen} onOpenChange={setFundOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={fundOpen}
                    className="w-full justify-between font-normal"
                    disabled={loadingFunds}
                  >
                    {loadingFunds ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading funds...
                      </>
                    ) : selectedFund ? (
                      selectedFund.fund_name
                    ) : (
                      "Search fund..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search fund..." 
                      value={fundSearch}
                      onValueChange={setFundSearch}
                    />
                    <CommandList>
                      {loadingFunds ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No fund found.</CommandEmpty>
                          <CommandGroup>
                            {filteredFunds.map((fund) => (
                              <CommandItem
                                key={fund.fund_id}
                                value={fund.fund_name}
                                onSelect={() => {
                                  setFormData({ ...formData, fund: fund.fund_id, amount: "" });
                                  setFundOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.fund === fund.fund_id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{fund.fund_name}</span>
                                  {fund.default_amount && (
                                    <span className="text-xs text-muted-foreground">Default: ${fund.default_amount}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount *
                {selectedFund && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Min: ${defaultAmount})
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder={selectedFund ? `${defaultAmount}.00` : "0.00"}
                  className="pl-7"
                  min={defaultAmount}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            {/* Date Received */}
            <div className="space-y-2">
              <Label>Date Received *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(formData.dateReceived, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dateReceived}
                    onSelect={(date) => date && setFormData({ ...formData, dateReceived: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Channel */}
            <div className="space-y-2">
              <Label htmlFor="channel">Payment Channel *</Label>
              <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {channels.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Additional notes about this contribution..."
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Contribution"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
