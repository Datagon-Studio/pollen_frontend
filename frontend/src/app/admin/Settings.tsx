import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Shield,
  Bell,
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Banknote,
  X,
} from "lucide-react";
import { accountApi, Account, kycApi, AccountKYC, SubmitKYCInput } from "@/services/account.api";
import { settlementApi, SettlementDetails, CreateSettlementDetailsInput } from "@/services/settlement.api";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FileText, Image as ImageIcon } from "lucide-react";

export default function Settings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // KYC state
  const [kyc, setKyc] = useState<AccountKYC | null>(null);
  const [loadingKYC, setLoadingKYC] = useState(true);
  const [savingKYC, setSavingKYC] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'business'>('business');
  const [officialName, setOfficialName] = useState("");
  const [businessRegFile, setBusinessRegFile] = useState<File | null>(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const businessRegInputRef = useRef<HTMLInputElement>(null);
  const passportPhotoInputRef = useRef<HTMLInputElement>(null);
  const nationalIdInputRef = useRef<HTMLInputElement>(null);

  // Check if KYC has been submitted (pending, verified, or rejected)
  const isKYCSubmitted = account?.kyc_status === 'pending' || account?.kyc_status === 'verified' || account?.kyc_status === 'rejected';

  // Settlement state
  const [settlementDetails, setSettlementDetails] = useState<SettlementDetails | null>(null);
  const [loadingSettlement, setLoadingSettlement] = useState(true);
  const [savingSettlement, setSavingSettlement] = useState(false);
  const [settlementType, setSettlementType] = useState<'bank' | 'mobile_money'>('mobile_money');
  const [settlementAccountName, setSettlementAccountName] = useState("");
  const [settlementAccountNumber, setSettlementAccountNumber] = useState("");
  const [settlementBankName, setSettlementBankName] = useState("");
  const [settlementBankBranch, setSettlementBankBranch] = useState("");
  const [settlementProvider, setSettlementProvider] = useState("");
  const [settlementOtherProvider, setSettlementOtherProvider] = useState("");
  const [settlementIsActive, setSettlementIsActive] = useState(true);

  useEffect(() => {
    const init = async () => {
      await loadAccount();
      await loadKYC();
      await loadSettlementDetails();
    };
    init();
  }, []);

  const loadAccount = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      const accountData = await accountApi.getMyAccount();
      console.log("Loaded account data:", accountData);
      console.log("KYC Status:", accountData.kyc_status);
      setAccount(accountData);
      setAccountName(accountData.account_name || "");
      setLogoPreview(accountData.account_logo);
    } catch (error) {
      console.error("Error loading account:", error);
      if (!skipLoading) {
        toast({
          title: "Error",
          description: "Failed to load account details",
          variant: "destructive",
        });
      }
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  const loadKYC = async () => {
    try {
      setLoadingKYC(true);
      const kycData = await kycApi.getMyAccountKYC();
      if (kycData) {
        setKyc(kycData);
        setAccountType(kycData.account_type);
        setOfficialName(kycData.official_name);
      }
    } catch (error) {
      console.error("Error loading KYC:", error);
      // Don't show error toast - KYC might not exist yet
      // Just set loading to false
    } finally {
      setLoadingKYC(false);
    }
  };

  const loadSettlementDetails = async () => {
    try {
      setLoadingSettlement(true);
      const settlements = await settlementApi.getMySettlementDetails();
      const active = settlements.find(s => s.is_active) || settlements[0] || null;
      if (active) {
        setSettlementDetails(active);
        setSettlementType(active.settlement_type);
        setSettlementAccountName(active.account_name);
        setSettlementAccountNumber(active.account_number);
        setSettlementBankName(active.bank_name || "");
        setSettlementBankBranch(active.bank_branch || "");
        const provider = active.provider || "";
        setSettlementProvider(provider);
        // If provider is not in the standard list, set it as "Other" and store the name
        if (provider && !["MTN Mobile Money", "Vodafone Cash", "AirtelTigo Money"].includes(provider)) {
          setSettlementProvider("Other");
          setSettlementOtherProvider(provider);
        } else {
          setSettlementOtherProvider("");
        }
        setSettlementIsActive(active.is_active);
      }
    } catch (error) {
      console.error("Error loading settlement details:", error);
    } finally {
      setLoadingSettlement(false);
    }
  };

  const handleSaveSettlementDetails = async () => {
    if (!account) return;

    if (!settlementAccountName.trim()) {
      toast({
        title: "Validation Error",
        description: "Account name is required",
        variant: "destructive",
      });
      return;
    }

    if (!settlementAccountNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Account number is required",
        variant: "destructive",
      });
      return;
    }

    // Validate mobile money number is exactly 10 digits
    if (settlementType === 'mobile_money') {
      const accountNumberDigits = settlementAccountNumber.trim().replace(/\D/g, '');
      if (accountNumberDigits.length !== 10) {
        toast({
          title: "Validation Error",
          description: "Mobile money number must be exactly 10 digits",
          variant: "destructive",
        });
        return;
      }
    }

    if (settlementType === 'mobile_money') {
      if (!settlementProvider.trim()) {
        toast({
          title: "Validation Error",
          description: "Mobile money provider is required",
          variant: "destructive",
        });
        return;
      }
      
      // If "Other" is selected, require the other provider name
      if (settlementProvider === "Other" && !settlementOtherProvider.trim()) {
        toast({
          title: "Validation Error",
          description: "Please specify the mobile money provider name",
          variant: "destructive",
        });
        return;
      }
    }

    setSavingSettlement(true);
    try {
      // Determine the provider value - use "Other" provider name if "Other" is selected
      const providerValue = settlementType === 'mobile_money' 
        ? (settlementProvider === "Other" ? settlementOtherProvider.trim() : settlementProvider.trim())
        : null;

      const input: CreateSettlementDetailsInput = {
        settlement_type: settlementType,
        account_name: settlementAccountName.trim(),
        account_number: settlementAccountNumber.trim(),
        bank_name: settlementType === 'bank' ? settlementBankName.trim() || null : null,
        bank_branch: settlementType === 'bank' ? settlementBankBranch.trim() || null : null,
        provider: providerValue,
        is_active: settlementIsActive,
      };

      const updated = await settlementApi.upsertSettlementDetails(input);
      setSettlementDetails(updated);
      
      toast({
        title: "Success",
        description: "Settlement details saved successfully",
      });
    } catch (error) {
      console.error("Error saving settlement details:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settlement details",
        variant: "destructive",
      });
    } finally {
      setSavingSettlement(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null); // Clear preview to indicate removal
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    // If no file selected, return null to remove logo or keep existing
    if (!logoFile) {
      // If user clicked remove, return null; otherwise keep existing
      return logoPreview === null && account?.account_logo ? null : account?.account_logo || null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("account-logos")
        .upload(fileName, logoFile, {
          cacheControl: "31536000", // 1 year cache
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("account-logos")
        .getPublicUrl(fileName);

      console.log("Logo uploaded successfully:", { fileName, publicUrl });
      return publicUrl;
    } catch (err) {
      console.error("Error uploading logo:", err);
      toast({
        title: "Logo Upload Failed",
        description: "Could not upload account logo.",
        variant: "destructive",
      });
      throw err; // Re-throw to prevent saving if upload fails
    }
  };

  const uploadKYCDocument = async (file: File, bucket: string, folder: string): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Store the file path (not URL) in the database
      // We'll generate signed URLs on-demand when viewing
      return fileName;
    } catch (err) {
      console.error(`Error uploading ${folder}:`, err);
      throw err;
    }
  };

  const handleKYCDocumentChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'business_reg' | 'passport' | 'national_id'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (type === 'national_id' || type === 'business_reg') {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file",
          description: "Please select a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "PDF size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
    } else if (type === 'passport') {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
    }

    if (type === 'business_reg') {
      setBusinessRegFile(file);
    } else if (type === 'passport') {
      setPassportPhotoFile(file);
    } else {
      setNationalIdFile(file);
    }
  };

  const handleSubmitKYCClick = () => {
    // Show warning dialog before submission
    setShowWarningDialog(true);
  };

  const handleSubmitKYC = async () => {
    if (!account) return;

    // Prevent resubmission if already submitted
    if (isKYCSubmitted) {
      toast({
        title: "Cannot Resubmit",
        description: "This submission cannot be modified or resubmitted until a decision has been made.",
        variant: "destructive",
      });
      return;
    }

    if (!officialName.trim()) {
      toast({
        title: "Validation Error",
        description: "Official name is required",
        variant: "destructive",
      });
      return;
    }

    if (!nationalIdFile && !kyc?.national_id_url) {
      toast({
        title: "Validation Error",
        description: "National ID document is required",
        variant: "destructive",
      });
      return;
    }

    if (accountType === 'business' && !businessRegFile && !kyc?.business_registration_url) {
      toast({
        title: "Validation Error",
        description: "Business registration document is required for business accounts",
        variant: "destructive",
      });
      return;
    }

    if (accountType === 'individual' && !passportPhotoFile && !kyc?.passport_photo_url) {
      toast({
        title: "Validation Error",
        description: "Passport photo is required for individual accounts",
        variant: "destructive",
      });
      return;
    }

    setSavingKYC(true);
    try {
      let businessRegUrl = kyc?.business_registration_url || null;
      let passportPhotoUrl = kyc?.passport_photo_url || null;
      let nationalIdUrl = kyc?.national_id_url || "";

      // Upload documents
      if (businessRegFile) {
        businessRegUrl = await uploadKYCDocument(businessRegFile, "kyc-documents", "business-registration");
      }
      if (passportPhotoFile) {
        passportPhotoUrl = await uploadKYCDocument(passportPhotoFile, "kyc-documents", "passport-photo");
      }
      if (nationalIdFile) {
        nationalIdUrl = await uploadKYCDocument(nationalIdFile, "kyc-documents", "national-id");
      }

      const input: SubmitKYCInput = {
        account_type: accountType,
        official_name: officialName.trim(),
        business_registration_url: accountType === 'business' ? businessRegUrl : null,
        passport_photo_url: accountType === 'individual' ? passportPhotoUrl : null,
        national_id_url: nationalIdUrl,
      };

      const updatedKYC = await kycApi.submitKYC(input);
      setKyc(updatedKYC);
      console.log("KYC submitted, updated KYC:", updatedKYC);
      
      // Reload account to get updated KYC status (skip loading state to avoid UI flicker)
      await loadAccount(true);
      
      // Double-check by fetching account directly
      const refreshedAccount = await accountApi.getMyAccount();
      console.log("Refreshed account after submission:", refreshedAccount);
      console.log("Account KYC status:", refreshedAccount.kyc_status);
      setAccount(refreshedAccount);

      // Clear file inputs
      setBusinessRegFile(null);
      setPassportPhotoFile(null);
      setNationalIdFile(null);
      if (businessRegInputRef.current) businessRegInputRef.current.value = "";
      if (passportPhotoInputRef.current) passportPhotoInputRef.current.value = "";
      if (nationalIdInputRef.current) nationalIdInputRef.current.value = "";

      toast({
        title: "Success",
        description: "KYC information submitted successfully. Your account is now pending verification.",
      });
      
      // Close the warning dialog
      setShowWarningDialog(false);
    } catch (error) {
      console.error("Error submitting KYC:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit KYC information",
        variant: "destructive",
      });
    } finally {
      setSavingKYC(false);
    }
  };

  const handleSaveAccountDetails = async () => {
    setSaving(true);
    try {
      let logoUrl: string | null;
      
      // Determine the logo URL to save
      if (logoFile) {
        // Upload new logo
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          toast({
            title: "Error",
            description: "Failed to upload logo. Please try again.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      } else if (logoPreview === null && account?.account_logo) {
        // User removed the logo - set to null
        logoUrl = null;
      } else {
        // Keep existing logo
        logoUrl = account?.account_logo || null;
      }

      const updatedAccountName = accountName.trim() === "" ? null : accountName.trim();

      console.log("Saving account with:", { account_name: updatedAccountName, account_logo: logoUrl });

      const updatedAccount = await accountApi.updateMyAccount({
        account_name: updatedAccountName,
        account_logo: logoUrl,
      });

      console.log("Account updated successfully:", updatedAccount);

      // Update local state with the response
      setAccount(updatedAccount);
      setLogoPreview(updatedAccount.account_logo);
      setLogoFile(null); // Clear file selection

      toast({
        title: "Success",
        description: "Account details updated successfully.",
      });
    } catch (error) {
      console.error("Error saving account:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save account details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "UP";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Manage your group account and preferences"
      />

      <div className="max-w-3xl space-y-8">
        {/* Account Details */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Account Details</h2>
              <p className="text-sm text-muted-foreground">
                Basic information about your group
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="mt-1.5"
                placeholder="Enter your account name"
              />
            </div>
            <div>
              <Label>Group Logo</Label>
              <div className="mt-1.5 flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Account Logo"
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="text-xl font-bold text-foreground">
                      {getInitials(accountName)}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                {logoPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveAccountDetails} disabled={saving} size="sm">
                {saving ? "Saving..." : "Save Account Details"}
              </Button>
            </div>
          </div>
        </section>

        {/* KYC Status */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">KYC Verification</h2>
              <p className="text-sm text-muted-foreground">
                Account verification status for online payments
              </p>
            </div>
          </div>

          {loadingKYC ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* KYC Status Badge */}
              <div className="flex items-center justify-between py-3 px-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Current KYC Status</p>
                  <p className="text-sm text-muted-foreground">Verified accounts can accept online payments</p>
                </div>
                <StatusBadge status={account?.kyc_status || "unverified"} />
              </div>

              {/* Account Type */}
              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <Select 
                  value={accountType} 
                  onValueChange={(v: 'individual' | 'business') => setAccountType(v)}
                  disabled={isKYCSubmitted}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="individual">Individual / Personal</SelectItem>
                    <SelectItem value="business">Business / Organization</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Official Name */}
              <div>
                <Label htmlFor="officialName">Official Name *</Label>
                <Input
                  id="officialName"
                  value={officialName}
                  onChange={(e) => setOfficialName(e.target.value)}
                  className="mt-1.5"
                  placeholder="Enter official registered name"
                  disabled={isKYCSubmitted}
                />
              </div>

              {/* Business Registration (only for business) */}
              {accountType === 'business' && (
                <div>
                  <Label>Business Registration Document *</Label>
                  <p className="text-xs text-muted-foreground mb-2">Upload PDF of business registration certificate</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={businessRegInputRef}
                      accept="application/pdf"
                      onChange={(e) => handleKYCDocumentChange(e, 'business_reg')}
                      className="hidden"
                      disabled={isKYCSubmitted}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => businessRegInputRef.current?.click()}
                      className="flex-1"
                      disabled={isKYCSubmitted}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {businessRegFile ? businessRegFile.name : kyc?.business_registration_url ? "Change Document" : "Upload PDF"}
                    </Button>
                    {kyc?.business_registration_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          // Generate a fresh signed URL for viewing
                          // The stored value is the file path
                          const { data } = await supabase.storage
                            .from('kyc-documents')
                            .createSignedUrl(kyc.business_registration_url!, 3600);
                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          }
                        }}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Passport Photo (only for individual) */}
              {accountType === 'individual' && (
                <div>
                  <Label>Passport Photo *</Label>
                  <p className="text-xs text-muted-foreground mb-2">Upload passport-sized photo</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={passportPhotoInputRef}
                      accept="image/*"
                      onChange={(e) => handleKYCDocumentChange(e, 'passport')}
                      className="hidden"
                      disabled={isKYCSubmitted}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => passportPhotoInputRef.current?.click()}
                      className="flex-1"
                      disabled={isKYCSubmitted}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {passportPhotoFile ? passportPhotoFile.name : kyc?.passport_photo_url ? "Change Photo" : "Upload Photo"}
                    </Button>
                    {kyc?.passport_photo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(kyc.passport_photo_url!, '_blank')}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* National ID */}
              <div>
                <Label>National ID Document *</Label>
                <p className="text-xs text-muted-foreground mb-2">Upload PDF with front and back of National ID combined</p>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={nationalIdInputRef}
                    accept="application/pdf"
                    onChange={(e) => handleKYCDocumentChange(e, 'national_id')}
                    className="hidden"
                    disabled={isKYCSubmitted}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nationalIdInputRef.current?.click()}
                    className="flex-1"
                    disabled={isKYCSubmitted}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {nationalIdFile ? nationalIdFile.name : kyc?.national_id_url ? "Change Document" : "Upload PDF"}
                  </Button>
                  {kyc?.national_id_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        // Generate a fresh signed URL for viewing
                        // The stored value is the file path
                        const { data } = await supabase.storage
                          .from('kyc-documents')
                          .createSignedUrl(kyc.national_id_url, 3600);
                        if (data?.signedUrl) {
                          window.open(data.signedUrl, '_blank');
                        }
                      }}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleSubmitKYCClick} 
                  disabled={savingKYC || isKYCSubmitted} 
                  size="sm"
                >
                  {savingKYC ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : isKYCSubmitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Submitted
                    </>
                  ) : (
                    "Submit KYC Information"
                  )}
                </Button>
              </div>

              {/* Warning Dialog */}
              <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm KYC Submission</AlertDialogTitle>
                    <AlertDialogDescription>
                      This submission cannot be modified or resubmitted until a decision has been made. 
                      Are you sure you want to submit your KYC information?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setShowWarningDialog(false);
                        handleSubmitKYC();
                      }}
                    >
                      Submit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </section>

        {/* Settlement Details */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Banknote className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Settlement Details</h2>
              <p className="text-sm text-muted-foreground">
                Where online contributions are sent
              </p>
            </div>
          </div>

          {loadingSettlement ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Settlement Type *</Label>
                <Select 
                  value={settlementType} 
                  onValueChange={(v: 'bank' | 'mobile_money') => {
                    setSettlementType(v);
                    if (v === 'bank') {
                      setSettlementProvider("");
                      setSettlementOtherProvider("");
                    } else {
                      setSettlementBankName("");
                      setSettlementBankBranch("");
                    }
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settlementType === 'bank' && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Account Name *</Label>
                      <Input
                        value={settlementAccountName}
                        onChange={(e) => setSettlementAccountName(e.target.value)}
                        placeholder="Name on bank account"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Account Number *</Label>
                      <Input
                        value={settlementAccountNumber}
                        onChange={(e) => setSettlementAccountNumber(e.target.value)}
                        placeholder="Bank account number"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Bank Name</Label>
                      <Input
                        value={settlementBankName}
                        onChange={(e) => setSettlementBankName(e.target.value)}
                        placeholder="Bank name"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Bank Branch</Label>
                      <Input
                        value={settlementBankBranch}
                        onChange={(e) => setSettlementBankBranch(e.target.value)}
                        placeholder="Bank branch"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </>
              )}

              {settlementType === 'mobile_money' && (
                <>
                  <div>
                    <Label>Mobile Money Service *</Label>
                    <Select 
                      value={settlementProvider} 
                      onValueChange={(value) => {
                        setSettlementProvider(value);
                        if (value !== "Other") {
                          setSettlementOtherProvider("");
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select service provider" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="MTN Mobile Money">MTN Mobile Money</SelectItem>
                        <SelectItem value="Vodafone Cash">Vodafone Cash</SelectItem>
                        <SelectItem value="AirtelTigo Money">AirtelTigo Money</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {settlementProvider === "Other" && (
                    <div>
                      <Label>Provider Name *</Label>
                      <Input
                        value={settlementOtherProvider}
                        onChange={(e) => setSettlementOtherProvider(e.target.value)}
                        placeholder="Enter mobile money provider name"
                        className="mt-1.5"
                      />
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Name on MoMo *</Label>
                      <Input
                        value={settlementAccountName}
                        onChange={(e) => setSettlementAccountName(e.target.value)}
                        placeholder="Name registered on MoMo"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>MoMo Number *</Label>
                      <Input
                        value={settlementAccountNumber}
                        onChange={(e) => setSettlementAccountNumber(e.target.value)}
                        placeholder="Mobile money number (10 digits)"
                        maxLength={10}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-medium text-foreground">Active Settlement Account</p>
                  <p className="text-sm text-muted-foreground">Funds will be sent to this account</p>
                </div>
                <Switch 
                  checked={settlementIsActive}
                  onCheckedChange={setSettlementIsActive}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveSettlementDetails} disabled={savingSettlement} size="sm">
                  {savingSettlement ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settlement Details"
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Notifications */}
        <section className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-amber/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-amber" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Configure how you receive updates
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Default Notification Channel</Label>
              <Select defaultValue="both">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">SMS and Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">New Contributions</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when members make contributions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Pending Confirmations</p>
                <p className="text-sm text-muted-foreground">
                  Weekly reminders for contributions awaiting confirmation
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Birthday Messages</p>
                <p className="text-sm text-muted-foreground">
                  Send birthday greetings to members
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
