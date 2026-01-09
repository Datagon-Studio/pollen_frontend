import { useState, useEffect } from "react";
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
import { UserPlus, Search, Filter, MoreHorizontal, Phone, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddMemberModal } from "@/components/modals/AddMemberModal";
import { format } from "date-fns";
import { memberApi, Member, isMemberActive } from "@/services/member.api";
import { useAccount } from "@/hooks/useAccount";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const columns = [
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
    render: (item: Member) => (
      <span>{formatCurrency(item.total_contributed)}</span>
    ),
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
    render: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border">
          <DropdownMenuItem>View Profile</DropdownMenuItem>
          <DropdownMenuItem>Edit Member</DropdownMenuItem>
          <DropdownMenuItem>View Contributions</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function Members() {
  const { account } = useAccount();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddMember, setShowAddMember] = useState(false);

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

  useEffect(() => {
    fetchMembers();
  }, [account?.account_id]);

  const filteredMembers = members.filter((member) => {
    const fullName = member.full_name.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
      (member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (member.membership_number?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const isActive = isMemberActive(member);
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && isActive) ||
      (statusFilter === "inactive" && !isActive);
    return matchesSearch && matchesStatus;
  });

  const activeCount = members.filter(isMemberActive).length;
  const inactiveCount = members.length - activeCount;

  return (
    <AppLayout>
      <PageHeader
        title="Members"
        description="Manage your group members and their contributions"
        actions={
          <Button size="sm" onClick={() => setShowAddMember(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add/Invite Member
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
      </div>

      {/* Summary */}
      <div className="flex gap-6 mb-6 text-sm">
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
    </AppLayout>
  );
}
