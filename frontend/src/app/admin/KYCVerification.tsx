import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Building2,
  User,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Calendar,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { kycAdminApi, KYCWithAccount } from "@/services/account.api";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function KYCVerification() {
  const [kycList, setKycList] = useState<KYCWithAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadKYCList();
  }, []);

  const loadKYCList = async () => {
    try {
      setLoading(true);
      const data = await kycAdminApi.getAllKYC();
      setKycList(data);
    } catch (error) {
      console.error("Error loading KYC list:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load KYC submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredKYC = useMemo(() => {
    return kycList.filter((kyc) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        kyc.account_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kyc.official_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kyc.account_id.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === "all" || kyc.account_kyc_status === statusFilter;

      // Type filter
      const matchesType = typeFilter === "all" || kyc.account_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [kycList, searchQuery, statusFilter, typeFilter]);

  const toggleRow = (kycId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(kycId)) {
      newExpanded.delete(kycId);
    } else {
      newExpanded.add(kycId);
    }
    setExpandedRows(newExpanded);
  };

  const handleVerify = async (accountId: string) => {
    try {
      setProcessing(accountId);
      await kycAdminApi.verifyKYC(accountId);
      toast({
        title: "Success",
        description: "KYC verified successfully",
      });
      await loadKYCList();
      // Close expanded row after verification
      const newExpanded = new Set(expandedRows);
      newExpanded.delete(accountId);
      setExpandedRows(newExpanded);
    } catch (error) {
      console.error("Error verifying KYC:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify KYC",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (accountId: string) => {
    if (!confirm("Are you sure you want to reject this KYC submission?")) {
      return;
    }

    try {
      setProcessing(accountId);
      await kycAdminApi.rejectKYC(accountId);
      toast({
        title: "Success",
        description: "KYC rejected successfully",
      });
      await loadKYCList();
      // Close expanded row after rejection
      const newExpanded = new Set(expandedRows);
      newExpanded.delete(accountId);
      setExpandedRows(newExpanded);
    } catch (error) {
      console.error("Error rejecting KYC:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject KYC",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      // Generate a signed URL for downloading
      const { data } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(filePath, 3600);
      
      if (data?.signedUrl) {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error("Failed to generate signed URL");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="KYC Verification"
        description="Review and verify account KYC submissions"
      />

      {/* Filters and Search */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by account name, official name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {filteredKYC.length} of {kycList.length} KYC submissions
      </div>

      {/* Table */}
      {filteredKYC.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No KYC submissions found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Official Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKYC.map((kyc) => {
                const isExpanded = expandedRows.has(kyc.kyc_id);
                return (
                  <>
                    <TableRow
                      key={kyc.kyc_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(kyc.kyc_id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {kyc.account_name || "Unnamed Account"}
                      </TableCell>
                      <TableCell>{kyc.official_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {kyc.account_type === 'business' ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          <span className="capitalize">{kyc.account_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={kyc.account_kyc_status || "unverified"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(kyc.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {kyc.account_kyc_status !== 'verified' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleVerify(kyc.account_id)}
                              disabled={processing === kyc.account_id}
                            >
                              {processing === kyc.account_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Verify
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(kyc.account_id)}
                              disabled={processing === kyc.account_id}
                            >
                              {processing === kyc.account_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {kyc.account_kyc_status === 'verified' && (
                          <div className="flex items-center justify-end gap-2 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Verified</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-6">
                          <div className="space-y-6">
                            {/* Account Details */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                                <p className="mt-1 font-mono text-sm">{kyc.account_id}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Official Name</label>
                                <p className="mt-1 font-medium">{kyc.official_name}</p>
                              </div>
                            </div>

                            {/* Documents */}
                            <div>
                              <h3 className="text-sm font-semibold mb-3">Documents</h3>
                              <div className="space-y-2">
                                {/* Business Registration (if business) */}
                                {kyc.account_type === 'business' && kyc.business_registration_url && (
                                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-5 w-5 text-muted-foreground" />
                                      <div>
                                        <p className="font-medium">Business Registration</p>
                                        <p className="text-sm text-muted-foreground">PDF Document</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadDocument(
                                        kyc.business_registration_url!,
                                        `business-registration-${kyc.account_id}.pdf`
                                      )}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                )}

                                {/* Passport Photo (if individual) */}
                                {kyc.account_type === 'individual' && kyc.passport_photo_url && (
                                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                    <div className="flex items-center gap-3">
                                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                      <div>
                                        <p className="font-medium">Passport Photo</p>
                                        <p className="text-sm text-muted-foreground">Image File</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadDocument(
                                        kyc.passport_photo_url!,
                                        `passport-photo-${kyc.account_id}.jpg`
                                      )}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                )}

                                {/* National ID (always present) */}
                                {kyc.national_id_url && (
                                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-5 w-5 text-muted-foreground" />
                                      <div>
                                        <p className="font-medium">National ID</p>
                                        <p className="text-sm text-muted-foreground">Front and Back Combined (PDF)</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadDocument(
                                        kyc.national_id_url,
                                        `national-id-${kyc.account_id}.pdf`
                                      )}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Submission Info */}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Submitted: {format(new Date(kyc.created_at), "PPp")}</span>
                              </div>
                              {kyc.verified_at && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                  <span>Verified: {format(new Date(kyc.verified_at), "PPp")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}
