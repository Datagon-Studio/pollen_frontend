import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/hooks/useAuth";
import {
  memberApi,
  BulkCreateMemberResult,
  Member,
} from "@/services/member.api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface BulkUploadMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedRow {
  row: number;
  full_name: string;
  phone: string;
  membership_number: string;
}

type UploadResult = BulkCreateMemberResult & { unchanged: Member[] };

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-+()]/g, "");
  if (normalized.startsWith("00233") && normalized.length === 14) {
    normalized = `0${normalized.substring(5)}`;
  } else if (normalized.startsWith("233") && normalized.length === 12) {
    normalized = `0${normalized.substring(3)}`;
  }
  return normalized;
}

function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });

        if (rows.length === 0) {
          reject(new Error("The spreadsheet is empty"));
          return;
        }

        const headers = Object.keys(rows[0]);
        const nameHeader = headers.find((header) => {
          const normalized = normalizeHeader(header);
          return normalized === "name" || normalized === "full name";
        });
        const numberHeader = headers.find((header) => {
          const normalized = normalizeHeader(header);
          return (
            normalized === "number" ||
            normalized === "phone" ||
            normalized === "phone number"
          );
        });
        const idHeader = headers.find((header) => {
          const normalized = normalizeHeader(header);
          return (
            normalized === "id" ||
            normalized === "ids" ||
            normalized === "member id" ||
            normalized === "membership id" ||
            normalized === "membership number" ||
            normalized === "membership no" ||
            normalized === "membership #"
          );
        });

        if (!nameHeader || !numberHeader) {
          reject(
            new Error(
              'Spreadsheet must have "Name" and "Number" columns in the first row. "ID" is optional.'
            )
          );
          return;
        }

        const parsed: ParsedRow[] = [];
        rows.forEach((row, index) => {
          const fullName = String(row[nameHeader] ?? "").trim();
          const phone = String(row[numberHeader] ?? "").trim();
          const membershipNumber = idHeader
            ? String(row[idHeader] ?? "").trim()
            : "";

          if (!fullName && !phone && !membershipNumber) {
            return;
          }

          parsed.push({
            row: index + 2,
            full_name: fullName,
            phone,
            membership_number: membershipNumber,
          });
        });

        if (parsed.length === 0) {
          reject(new Error("No member rows found in the spreadsheet"));
          return;
        }

        resolve(parsed);
      } catch {
        reject(new Error("Failed to read spreadsheet. Please upload a valid Excel or CSV file."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function BulkUploadMemberModal({
  open,
  onOpenChange,
  onSuccess,
}: BulkUploadMemberModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { account } = useAccount(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    added: 0,
    updated: 0,
    unchanged: 0,
    currentName: "",
  });
  const [sendWelcomeSms, setSendWelcomeSms] = useState(true);

  const resetState = () => {
    setParsedRows([]);
    setResult(null);
    setFileName(null);
    setUploading(false);
    setImportProgress({ current: 0, total: 0, added: 0, updated: 0, unchanged: 0, currentName: "" });
    setSendWelcomeSms(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const importMembers = async (
    rows: ParsedRow[],
    shouldSendWelcomeSms: boolean
  ): Promise<UploadResult> => {
    if (!account?.account_id) {
      throw new Error("Account not found");
    }

    const existingResponse = await memberApi.getByAccount(account.account_id);
    if (!existingResponse.success || !existingResponse.data) {
      throw new Error(existingResponse.error || "Failed to load members");
    }

    const membersByPhone = new Map<string, Member>();
    for (const member of existingResponse.data) {
      const key = normalizePhone(member.phone);
      if (key && !membersByPhone.has(key)) {
        membersByPhone.set(key, member);
      }
    }

    const created: Member[] = [];
    const updated: Member[] = [];
    const unchanged: Member[] = [];
    const failed: BulkCreateMemberResult["failed"] = [];
    const seenPhones = new Set<string>();
    const seenMembershipNumbers = new Set<string>();

    setImportProgress({
      current: 0,
      total: rows.length,
      added: 0,
      updated: 0,
      unchanged: 0,
      currentName: rows[0]?.full_name ?? "",
    });

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      setImportProgress({
        current: index + 1,
        total: rows.length,
        added: created.length,
        updated: updated.length,
        unchanged: unchanged.length,
        currentName: row.full_name || "Member",
      });

      const fullName = row.full_name.trim();
      const phone = row.phone.trim();
      const membershipNumber = row.membership_number.trim();
      const normalizedPhone = normalizePhone(phone);

      if (!fullName) {
        failed.push({
          row: row.row,
          full_name: fullName,
          phone,
          error: "Name is required",
        });
        continue;
      }

      if (!phone) {
        failed.push({
          row: row.row,
          full_name: fullName,
          phone,
          error: "Number is required",
        });
        continue;
      }

      if (seenPhones.has(normalizedPhone)) {
        failed.push({
          row: row.row,
          full_name: fullName,
          phone,
          error: "Duplicate phone number in upload file",
        });
        continue;
      }

      if (membershipNumber && seenMembershipNumbers.has(membershipNumber)) {
        failed.push({
          row: row.row,
          full_name: fullName,
          phone,
          error: "Duplicate membership ID in upload file",
        });
        continue;
      }

      try {
        const existing = membersByPhone.get(normalizedPhone);
        let response;

        if (existing) {
          const currentId = existing.membership_number?.trim() || "";
          if (!membershipNumber || currentId === membershipNumber) {
            unchanged.push(existing);
            seenPhones.add(normalizedPhone);
            if (membershipNumber) seenMembershipNumbers.add(membershipNumber);
            continue;
          }
          if (currentId) {
            failed.push({
              row: row.row,
              full_name: fullName,
              phone,
              error: `Member already has membership ID ${currentId}`,
            });
            continue;
          }

          response = await memberApi.update(existing.member_id, {
            membership_number: membershipNumber,
          });
          if (response.success && response.data) {
            updated.push(response.data);
            membersByPhone.set(normalizedPhone, response.data);
          }
        } else {
          response = await memberApi.create({
            account_id: account.account_id,
            full_name: fullName,
            phone,
            email: null,
            dob: null,
            membership_number: membershipNumber || null,
            phone_verified: false,
            email_verified: false,
            send_welcome_sms: shouldSendWelcomeSms,
          });
          if (response.success && response.data) {
            created.push(response.data);
            membersByPhone.set(normalizedPhone, response.data);
          }
        }

        if (response?.success && response.data) {
          seenPhones.add(normalizedPhone);
          if (membershipNumber) {
            seenMembershipNumbers.add(membershipNumber);
          }
          setImportProgress({
            current: index + 1,
            total: rows.length,
            added: created.length,
            updated: updated.length,
            unchanged: unchanged.length,
            currentName: row.full_name,
          });
        } else if (response) {
          failed.push({
            row: row.row,
            full_name: fullName,
            phone,
            error: response.error || "Failed to save membership ID",
          });
        }
      } catch (error) {
        failed.push({
          row: row.row,
          full_name: fullName,
          phone,
          error: error instanceof Error ? error.message : "Failed to create member",
        });
      }
    }

    return { created, updated, unchanged, failed };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    setFileName(file.name);

    try {
      const rows = await parseSpreadsheet(file);
      setParsedRows(rows);

      const importResult = await importMembers(rows, sendWelcomeSms);
      setResult(importResult);

      if (
        importResult.created.length > 0 ||
        importResult.updated.length > 0 ||
        importResult.unchanged.length > 0
      ) {
        onSuccess?.();
      }

      const welcomeNote =
        sendWelcomeSms && importResult.created.length > 0
          ? " A welcome SMS was sent to each newly added member."
          : "";

      const updatedNote =
        importResult.updated.length > 0
          ? `, ${importResult.updated.length} membership ID(s) added`
          : "";

      const unchangedNote =
        importResult.unchanged.length > 0
          ? `, ${importResult.unchanged.length} already had an ID`
          : "";

      toast({
        title: "Import complete",
        description: `${importResult.created.length} member(s) added${updatedNote}${unchangedNote}${
          importResult.failed.length
            ? `, ${importResult.failed.length} failed`
            : ""
        }.${welcomeNote}`,
        variant:
          importResult.created.length === 0 &&
          importResult.updated.length === 0 &&
          importResult.unchanged.length === 0
            ? "destructive"
            : "default",
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "Failed to import members",
        variant: "destructive",
      });
      setParsedRows([]);
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Add Members</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file with <strong>Name</strong>, <strong>Phone</strong>,
            and <strong>Membership #</strong>. If the phone is already in Pollean and
            that member has no ID, the ID from the file is added. Name, phone, and
            existing IDs stay as they are.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulkSendWelcomeSms"
                checked={sendWelcomeSms}
                disabled={uploading}
                onCheckedChange={(checked) => setSendWelcomeSms(checked === true)}
              />
              <Label
                htmlFor="bulkSendWelcomeSms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Send welcome SMS
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              Text each imported member a welcome message with a link to the group page. Leave this off to add them without sending a message.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-amber hover:bg-amber/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3 w-full px-4">
                <Loader2 className="h-8 w-8 animate-spin text-amber" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {importProgress.added} added, {importProgress.updated} IDs added,{" "}
                    {importProgress.unchanged} already had an ID of {importProgress.total}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Importing from {fileName}
                    {importProgress.currentName
                      ? ` · Adding ${importProgress.currentName}`
                      : ""}
                  </p>
                </div>
                {importProgress.total > 0 && (
                  <Progress
                    value={(importProgress.current / importProgress.total) * 100}
                    className="w-full h-2"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Click to upload Excel or CSV
                </p>
                <p className="text-xs text-muted-foreground">
                  .xlsx, .xls, or .csv with Name, Phone, and Membership #
                </p>
              </div>
            )}
          </button>

          {parsedRows.length > 0 && !uploading && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">
                  ({parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""})
                </span>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {result.created.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      {result.created.length} member(s) added successfully
                    </p>
                  </div>
                </div>
              )}

              {result.updated.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      {result.updated.length} membership ID(s) added
                    </p>
                  </div>
                </div>
              )}

              {result.unchanged.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">
                      {result.unchanged.length} member(s) already had this ID
                    </p>
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="font-medium text-foreground">
                      {result.failed.length} row(s) could not be imported
                    </p>
                  </div>
                  <ul className="max-h-32 overflow-y-auto space-y-1 pl-6 text-muted-foreground">
                    {result.failed.map((failure) => (
                      <li key={`${failure.row}-${failure.phone}`}>
                        Row {failure.row}
                        {failure.full_name ? ` (${failure.full_name})` : ""}:{" "}
                        {failure.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          {!uploading && (
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Another File
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
