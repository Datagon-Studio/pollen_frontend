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
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");
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
            normalized === "phone number" ||
            normalized === "membership number"
          );
        });

        if (!nameHeader || !numberHeader) {
          reject(
            new Error(
              'Spreadsheet must have "Name" and "Number" columns in the first row'
            )
          );
          return;
        }

        const parsed: ParsedRow[] = [];
        rows.forEach((row, index) => {
          const fullName = String(row[nameHeader] ?? "").trim();
          const phone = String(row[numberHeader] ?? "").trim();

          if (!fullName && !phone) {
            return;
          }

          parsed.push({
            row: index + 2,
            full_name: fullName,
            phone,
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
  const [result, setResult] = useState<BulkCreateMemberResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    added: 0,
    currentName: "",
  });

  const resetState = () => {
    setParsedRows([]);
    setResult(null);
    setFileName(null);
    setUploading(false);
    setImportProgress({ current: 0, total: 0, added: 0, currentName: "" });
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

  const importMembers = async (rows: ParsedRow[]): Promise<BulkCreateMemberResult> => {
    if (!account?.account_id) {
      throw new Error("Account not found");
    }

    const created: Member[] = [];
    const failed: BulkCreateMemberResult["failed"] = [];
    const seenPhones = new Set<string>();

    setImportProgress({
      current: 0,
      total: rows.length,
      added: 0,
      currentName: rows[0]?.full_name ?? "",
    });

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      setImportProgress({
        current: index + 1,
        total: rows.length,
        added: created.length,
        currentName: row.full_name || "Member",
      });

      const fullName = row.full_name.trim();
      const phone = row.phone.trim();
      const normalizedPhone = phone.replace(/[\s\-+]/g, "");

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

      try {
        const response = await memberApi.create({
          account_id: account.account_id,
          full_name: fullName,
          phone,
          email: null,
          dob: null,
          membership_number: null,
          phone_verified: false,
          email_verified: false,
        });

        if (response.success && response.data) {
          created.push(response.data);
          seenPhones.add(normalizedPhone);
          setImportProgress({
            current: index + 1,
            total: rows.length,
            added: created.length,
            currentName: row.full_name,
          });
        } else {
          failed.push({
            row: row.row,
            full_name: fullName,
            phone,
            error: response.error || "Failed to create member",
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

    return { created, failed };
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

      const importResult = await importMembers(rows);
      setResult(importResult);

      if (importResult.created.length > 0) {
        onSuccess?.();
      }

      toast({
        title: "Import complete",
        description: `${importResult.created.length} member(s) added${
          importResult.failed.length
            ? `, ${importResult.failed.length} failed`
            : ""
        }.`,
        variant: importResult.created.length === 0 ? "destructive" : "default",
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
            Upload an Excel or CSV file with two columns: <strong>Name</strong> and{" "}
            <strong>Number</strong>. Members are added automatically once the file
            is uploaded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                    {importProgress.added}/{importProgress.total} added
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
                  .xlsx, .xls, or .csv with Name and Number columns
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
