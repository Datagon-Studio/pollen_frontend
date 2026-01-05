import { useState, useMemo } from "react";
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
import { Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RecordContributionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const members = [
  { id: "1", firstName: "Alice", lastName: "Johnson" },
  { id: "2", firstName: "Bob", lastName: "Smith" },
  { id: "3", firstName: "Carol", lastName: "White" },
  { id: "4", firstName: "David", lastName: "Brown" },
  { id: "5", firstName: "Eve", lastName: "Davis" },
  { id: "6", firstName: "Frank", lastName: "Miller" },
  { id: "7", firstName: "Grace", lastName: "Lee" },
  { id: "8", firstName: "Henry", lastName: "Wilson" },
  { id: "9", firstName: "Ivy", lastName: "Chen" },
  { id: "10", firstName: "Jack", lastName: "Taylor" },
  { id: "11", firstName: "Karen", lastName: "Moore" },
  { id: "12", firstName: "Leo", lastName: "Martinez" },
];

const funds = [
  { id: "emergency", fundName: "Emergency Fund", defaultAmount: 100 },
  { id: "annual", fundName: "Annual Dues", defaultAmount: 75 },
  { id: "building", fundName: "Building Fund", defaultAmount: 200 },
  { id: "youth", fundName: "Youth Program", defaultAmount: 50 },
  { id: "scholarship", fundName: "Scholarship Fund", defaultAmount: 100 },
  { id: "welfare", fundName: "Monthly Welfare", defaultAmount: 25 },
  { id: "upkeep", fundName: "Community Upkeep", defaultAmount: 15 },
];

// Channel options based on spec: offline channels for manual recording
const channels = ["Cash", "Bank Deposit", "Cheque", "Mobile Money"];

export function RecordContributionModal({ open, onOpenChange }: RecordContributionModalProps) {
  const { toast } = useToast();
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

  const selectedMember = members.find(m => m.id === formData.member);
  const selectedFund = funds.find(f => f.id === formData.fund);
  const defaultAmount = selectedFund?.defaultAmount || 0;

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const search = memberSearch.toLowerCase();
    return members.filter(m => 
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search)
    );
  }, [memberSearch]);

  const filteredFunds = useMemo(() => {
    if (!fundSearch) return funds;
    return funds.filter(f => 
      f.fundName.toLowerCase().includes(fundSearch.toLowerCase())
    );
  }, [fundSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.member || !formData.fund || !formData.amount || !formData.channel) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount < defaultAmount) {
      toast({
        title: "Validation Error",
        description: `Minimum contribution for ${selectedFund?.fundName} is $${defaultAmount}.`,
        variant: "destructive",
      });
      return;
    }

    const memberName = selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : "";
    toast({
      title: "Contribution Recorded",
      description: `$${formData.amount} contribution from ${memberName} has been recorded.`,
    });

    setFormData({ member: "", fund: "", amount: "", channel: "", dateReceived: new Date(), comment: "" });
    setMemberSearch("");
    setFundSearch("");
    onOpenChange(false);
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
                  >
                    {selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : "Search member..."}
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
                      <CommandEmpty>No member found.</CommandEmpty>
                      <CommandGroup>
                        {filteredMembers.map((member) => (
                          <CommandItem
                            key={member.id}
                            value={`${member.firstName} ${member.lastName}`}
                            onSelect={() => {
                              setFormData({ ...formData, member: member.id });
                              setMemberOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.member === member.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {member.firstName} {member.lastName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
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
                  >
                    {selectedFund ? selectedFund.fundName : "Search fund..."}
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
                      <CommandEmpty>No fund found.</CommandEmpty>
                      <CommandGroup>
                        {filteredFunds.map((fund) => (
                          <CommandItem
                            key={fund.id}
                            value={fund.fundName}
                            onSelect={() => {
                              setFormData({ ...formData, fund: fund.id, amount: "" });
                              setFundOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.fund === fund.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{fund.fundName}</span>
                              <span className="text-xs text-muted-foreground">Default: ${fund.defaultAmount}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
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
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Contribution</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
