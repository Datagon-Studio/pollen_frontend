import { useState } from "react";
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
import { UserPlus, Search, Filter, MoreHorizontal, Phone, CheckCircle2, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddMemberModal } from "@/components/modals/AddMemberModal";
import { format } from "date-fns";

// Member data model based on spec
interface Member {
  id: number;
  firstName: string;
  lastName: string;
  dob: Date | null;
  phone: string;
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  membershipNumber: string | null;
  totalContributed: string;
  createdAt: Date;
  updatedAt: Date;
}

const members: Member[] = [
  { id: 1, firstName: "Alice", lastName: "Johnson", dob: new Date(1985, 3, 15), phone: "+233 24 123 4567", phoneVerified: true, email: "alice@email.com", emailVerified: true, membershipNumber: "MEM-001", totalContributed: "$2,450", createdAt: new Date(2024, 5, 10), updatedAt: new Date(2026, 0, 2) },
  { id: 2, firstName: "Bob", lastName: "Smith", dob: new Date(1990, 7, 22), phone: "+233 24 234 5678", phoneVerified: true, email: "bob@email.com", emailVerified: true, membershipNumber: "MEM-002", totalContributed: "$1,875", createdAt: new Date(2024, 6, 15), updatedAt: new Date(2026, 0, 1) },
  { id: 3, firstName: "Carol", lastName: "White", dob: new Date(1988, 11, 5), phone: "+233 24 345 6789", phoneVerified: false, email: "carol@email.com", emailVerified: false, membershipNumber: null, totalContributed: "$950", createdAt: new Date(2024, 8, 20), updatedAt: new Date(2025, 11, 28) },
  { id: 4, firstName: "David", lastName: "Brown", dob: new Date(1975, 1, 28), phone: "+233 24 456 7890", phoneVerified: true, email: "david@email.com", emailVerified: true, membershipNumber: "MEM-004", totalContributed: "$3,200", createdAt: new Date(2024, 3, 5), updatedAt: new Date(2025, 11, 27) },
  { id: 5, firstName: "Eve", lastName: "Davis", dob: new Date(1992, 5, 10), phone: "+233 24 567 8901", phoneVerified: true, email: null, emailVerified: false, membershipNumber: "MEM-005", totalContributed: "$1,125", createdAt: new Date(2024, 9, 12), updatedAt: new Date(2025, 11, 25) },
  { id: 6, firstName: "Frank", lastName: "Miller", dob: new Date(1980, 9, 18), phone: "+233 24 678 9012", phoneVerified: false, email: "frank@email.com", emailVerified: false, membershipNumber: null, totalContributed: "$500", createdAt: new Date(2024, 10, 1), updatedAt: new Date(2025, 11, 20) },
  { id: 7, firstName: "Grace", lastName: "Lee", dob: new Date(1995, 2, 25), phone: "+233 24 789 0123", phoneVerified: true, email: "grace@email.com", emailVerified: true, membershipNumber: "MEM-007", totalContributed: "$4,100", createdAt: new Date(2024, 4, 8), updatedAt: new Date(2025, 11, 18) },
  { id: 8, firstName: "Henry", lastName: "Wilson", dob: new Date(1978, 6, 3), phone: "+233 24 890 1234", phoneVerified: true, email: "henry@email.com", emailVerified: true, membershipNumber: "MEM-008", totalContributed: "$2,750", createdAt: new Date(2024, 2, 14), updatedAt: new Date(2025, 11, 15) },
];

// Member is active if phone OR email is verified
const isMemberActive = (member: Member) => member.phoneVerified || member.emailVerified;

const columns = [
  {
    key: "name",
    header: "Member",
    render: (item: Member) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-amber/10 flex items-center justify-center">
          <span className="text-sm font-medium text-amber-dark">
            {item.firstName[0]}{item.lastName[0]}
          </span>
        </div>
        <div>
          <p className="font-medium text-foreground">{item.firstName} {item.lastName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {item.email ? (
              <>
                <span>{item.email}</span>
                {item.emailVerified ? (
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
    ),
  },
  {
    key: "phone",
    header: "Phone",
    render: (item: Member) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="h-3.5 w-3.5" />
        <span>{item.phone}</span>
        {item.phoneVerified ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    ),
  },
  {
    key: "membershipNumber",
    header: "Membership #",
    render: (item: Member) => (
      <span className="text-sm text-muted-foreground">
        {item.membershipNumber || "—"}
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
    key: "totalContributed",
    header: "Total Contributed",
    className: "text-right font-medium",
  },
  {
    key: "updatedAt",
    header: "Last Updated",
    render: (item: Member) => (
      <span className="text-sm text-muted-foreground">
        {format(item.updatedAt, "MMM d, yyyy")}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddMember, setShowAddMember] = useState(false);

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
      (member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (member.membershipNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
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
            Add Member
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

      <DataTable columns={columns as any} data={filteredMembers as any} />

      <AddMemberModal open={showAddMember} onOpenChange={setShowAddMember} />
    </AppLayout>
  );
}
