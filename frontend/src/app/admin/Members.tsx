import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Search, Filter, MoreHorizontal, Phone, CheckCircle2, XCircle, Loader2, CalendarIcon, X, FileSpreadsheet, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AddMemberModal } from "@/components/modals/AddMemberModal";
import { BulkUploadMemberModal } from "@/components/modals/BulkUploadMemberModal";
import { BulkDeleteMemberModal } from "@/components/modals/BulkDeleteMemberModal";
import { EditMemberModal } from "@/components/modals/EditMemberModal";
import { DeleteMemberModal } from "@/components/modals/DeleteMemberModal";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { memberApi, Member, isMemberActive } from "@/services/member.api";
import { contributionApi, Contribution } from "@/services/contribution.api";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { configApi } from "@/services/config.api";
import { getCurrencySymbol } from "@/lib/currencies";

interface MemberActionsProps {
  member: Member;
  onEdit: () => void;
  onDelete: () => void;
}

function MemberActions({ member, onEdit, onDelete }: MemberActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem onClick={onEdit}>Edit Member</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Members() {
  const { user } = useAuth();
  const { account } = useAccount(user?.id);
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currencyCode, setCurrencyCode] = useState<string>("GHS");

  const formatAmount = useCallback((amount: number | null | undefined) => {
    const value = amount ?? 0;
    return `${getCurrencySymbol(currencyCode)}${value.toFixed(2)}`;
  }, [currencyCode]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  const fetchMembers = async () => {
    if (!account?.account_id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await memberApi.getByAccount(account.account_id);
      if (response.success && response.data) {
        setMembers(response.data);
      } else {
        throw new Error(response.error || 'Failed to load members');
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const fetchContributions = async () => {
    if (!account?.account_id) return;
    
    try {
      setLoadingContributions(true);
      const response = await contributionApi.getByAccount(account.account_id);
      if (response.success && response.data) {
        setContributions(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
    } finally {
      setLoadingContributions(false);
    }
  };

  useEffect(() => {
    if (account?.account_id) {
      // Parallelize data loading for better performance
      Promise.all([
        fetchMembers(),
        fetchContributions(),
      ]).catch(error => {
        console.error("Failed to load members data:", error);
      });

      configApi.getMyConfig()
        .then((cfg) => setCurrencyCode(cfg.currency_code || "GHS"))
        .catch(() => setCurrencyCode("GHS"));
    }
  }, [account?.account_id]);

  // All-time confirmed contribution totals per member
  const memberContributions = useMemo(() => {
    const totals: Record<string, number> = {};

    contributions.forEach((contribution) => {
      if (contribution.status !== 'confirmed' || !contribution.member_id) {
        return;
      }

      totals[contribution.member_id] =
        (totals[contribution.member_id] ?? 0) + contribution.amount;
    });

    return totals;
  }, [contributions]);

  const isMemberInAddedDateRange = useCallback(
    (member: Member) => {
      if (!startDate && !endDate) {
        return true;
      }

      const addedDate = new Date(member.created_at);
      if (Number.isNaN(addedDate.getTime())) {
        return false;
      }

      let rangeStart = startDate ? startOfDay(startDate) : new Date(0);
      let rangeEnd = endDate ? endOfDay(endDate) : new Date(8640000000000000);

      if (rangeStart > rangeEnd) {
        [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
      }

      return isWithinInterval(addedDate, { start: rangeStart, end: rangeEnd });
    },
    [startDate, endDate]
  );

  const filteredMembers = members.filter((member) => {
    const fullName = member.full_name.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
      (member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (member.membership_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const isActive = isMemberActive(member);
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);
    const matchesDateRange = isMemberInAddedDateRange(member);

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const activeCount = members.filter(isMemberActive).length;
  const inactiveCount = members.length - activeCount;

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((member) => selectedIds.has(member.member_id));
  const someFilteredSelected = filteredMembers.some((member) =>
    selectedIds.has(member.member_id)
  );

  const selectedMembers = members.filter((member) => selectedIds.has(member.member_id));

  const toggleMemberSelection = (memberId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(memberId);
      } else {
        next.delete(memberId);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredMembers.map((member) => member.member_id)));
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedIds(new Set());
    fetchMembers();
  };

  const columns = useMemo(() => [
    {
      key: "select",
      header: "",
      className: "w-10",
      render: (item: Member) => (
        <Checkbox
          checked={selectedIds.has(item.member_id)}
          onCheckedChange={(checked) =>
            toggleMemberSelection(item.member_id, checked === true)
          }
          aria-label={`Select ${item.full_name}`}
        />
      ),
    },
    {
      key: "name",
      header: "Member",
      render: (item: Member) => {
        const nameParts = item.full_name.trim().split(/\s+/);
        const initials = nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
          : nameParts[0] ? nameParts[0].substring(0, 2).toUpperCase() : "??";
        
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber/10 flex items-center justify-center">
              <span className="text-sm font-medium text-amber-dark">
                {initials}
              </span>
            </div>
            <div>
              <p className="font-medium text-foreground">{item.full_name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {item.email ? (
                  <>
                    <span>{item.email}</span>
                    {item.email_verified ? (
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    ) : (
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground/60">No email</span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
  {
    key: "phone",
    header: "Phone",
    render: (item: Member) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="h-3.5 w-3.5" />
        <span>{item.phone}</span>
        {item.phone_verified ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    ),
  },
  {
    key: "membership_number",
    header: "Membership #",
    render: (item: Member) => (
      <span className="text-sm text-muted-foreground">
        {item.membership_number || "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (item: Member) => {
      const isActive = isMemberActive(item);
      return <StatusBadge status={isActive ? "active" : "inactive"} />;
    },
  },
  {
    key: "total_contributed",
    header: "Total Contributed",
    className: "text-right font-medium",
    render: (item: Member) => {
      const total = memberContributions[item.member_id] ?? 0;
      return <span>{formatAmount(total)}</span>;
    },
  },
  {
    key: "updated_at",
    header: "Last Updated",
    render: (item: Member) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(item.updated_at), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    className: "w-12",
    render: (item: Member) => (
      <MemberActions 
        member={item} 
        onEdit={() => setEditingMember(item)} 
        onDelete={() => setDeletingMember(item)} 
      />
    ),
  },
], [memberContributions, selectedIds, formatAmount, setEditingMember, setDeletingMember]);

  return (
    <AppLayout>
      <PageHeader
        title="Members"
        description="Manage your group members and their contributions"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bulk Add
            </Button>
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add/Invite Member
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Filter members by date added */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {startDate ? format(startDate, "PPP") : "Added from"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => setStartDate(date ? startOfDay(date) : undefined)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {startDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStartDate(undefined)}
            className="h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {endDate ? format(endDate, "PPP") : "Added to"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => setEndDate(date ? startOfDay(date) : undefined)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {endDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEndDate(undefined)}
            className="h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            <span className="font-medium text-foreground">{members.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Active:</span>{" "}
            <span className="font-medium text-success">{activeCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Inactive:</span>{" "}
            <span className="font-medium text-amber">{inactiveCount}</span>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {filteredMembers.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => toggleSelectAllFiltered(checked === true)}
            aria-label="Select all visible members"
          />
          <span className="text-sm text-muted-foreground">
            Select all visible members
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchMembers}>Try Again</Button>
        </div>
      ) : (
        <DataTable columns={columns as any} data={filteredMembers as any} />
      )}

      <AddMemberModal open={showAddMember} onOpenChange={setShowAddMember} onSuccess={fetchMembers} />
      <BulkUploadMemberModal
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={fetchMembers}
      />
      <BulkDeleteMemberModal
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        members={selectedMembers}
        onSuccess={handleBulkDeleteSuccess}
      />
      <EditMemberModal 
        open={!!editingMember} 
        onOpenChange={(open) => !open && setEditingMember(null)} 
        member={editingMember}
        onSuccess={fetchMembers}
      />
      <DeleteMemberModal 
        open={!!deletingMember} 
        onOpenChange={(open) => !open && setDeletingMember(null)} 
        member={deletingMember}
        onSuccess={fetchMembers}
      />
    </AppLayout>
  );
}
