"use client";
import { useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, ClipboardPaste, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toPinyin } from "@/lib/pinyin";
import { bulkImportVocabWordsAction, type VocabBulkRow } from "@/server/actions/admin";
import { cn } from "@/lib/utils";

interface Props {
  lessonId: string;
  unitId: string;
  onImported: () => void;
}

interface RawRow {
  hanzi: string;
  pinyin: string;
  meaning: string;
  exHanzi: string;
  exMeaning: string;
}

interface PreviewRow extends RawRow {
  pinyinFilled: string;
  exPinyin: string;
  valid: boolean;
}

const HEADER_RE = /h[áa]n|hanzi|chữ|pinyin|nghĩa|meaning/i;
const hasHan = (s: string) => /\p{Script=Han}/u.test(s);

/** Split one CSV line, honouring "quoted, fields". */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Columns: 0 hán tự · 1 pinyin · 2 nghĩa · 3 ví dụ · 4 nghĩa ví dụ. */
function rowsFromMatrix(matrix: unknown[][]): RawRow[] {
  const cleaned = matrix
    .map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? "" : String(c)).trim()) : []))
    .filter((r) => r.some((c) => c !== ""));
  if (cleaned.length === 0) return [];
  // Drop a header row when the first row reads like labels (no Han in column 0).
  let start = 0;
  const first = cleaned[0];
  if (first && !hasHan(first[0] ?? "") && HEADER_RE.test(first.join(" "))) start = 1;
  return cleaned.slice(start).map((c) => ({
    hanzi: c[0] ?? "",
    pinyin: c[1] ?? "",
    meaning: c[2] ?? "",
    exHanzi: c[3] ?? "",
    exMeaning: c[4] ?? "",
  }));
}

function parsePasted(text: string): RawRow[] {
  const matrix = text
    .split(/\r?\n/)
    .map((line) => (line.includes("\t") ? line.split("\t") : splitCsvLine(line)));
  return rowsFromMatrix(matrix);
}

function finalize(rows: RawRow[]): PreviewRow[] {
  return rows.map((r) => ({
    ...r,
    valid: r.hanzi !== "" && r.meaning !== "" && hasHan(r.hanzi),
    pinyinFilled: r.pinyin || (r.hanzi ? toPinyin(r.hanzi) : ""),
    exPinyin: r.exHanzi ? toPinyin(r.exHanzi) : "",
  }));
}

const SAMPLE_CSV =
  "hán tự,pinyin,nghĩa,ví dụ,nghĩa ví dụ\n" +
  "你好,,Xin chào,你好吗？,Bạn khỏe không?\n" +
  "谢谢,,Cảm ơn,谢谢你,Cảm ơn bạn\n" +
  "学生,,Học sinh,我是学生,Tôi là học sinh\n";

export function VocabWordImport({ lessonId, unitId, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState<RawRow[]>([]);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => finalize(rows), [rows]);
  const validCount = preview.filter((r) => r.valid).length;
  const skipCount = preview.length - validCount;

  function reset() {
    setPasteText("");
    setRows([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePaste(text: string) {
    setPasteText(text);
    setFileName(null);
    setRows(parsePasted(text));
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("File rỗng.");
      const matrix = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        blankrows: false,
        defval: "",
      }) as unknown[][];
      setPasteText("");
      setFileName(file.name);
      setRows(rowsFromMatrix(matrix));
    } catch {
      toast.error("Không đọc được file. Hãy dùng .csv hoặc .xlsx hợp lệ.");
    }
  }

  function downloadSample() {
    const blob = new Blob(["﻿" + SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-tu-vung.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const payload: VocabBulkRow[] = preview
      .filter((r) => r.valid)
      .map((r) => ({
        hanzi: r.hanzi,
        pinyin: r.pinyinFilled,
        meaning: r.meaning,
        exHanzi: r.exHanzi,
        exPinyin: r.exPinyin,
        exMeaning: r.exMeaning,
      }));
    if (payload.length === 0) {
      toast.error("Không có dòng hợp lệ để nhập.");
      return;
    }
    setPending(true);
    const res = await bulkImportVocabWordsAction({ lessonId, unitId, rows: payload });
    setPending(false);
    if (res.ok) {
      toast.success(`Đã nhập ${res.created} từ${res.skipped ? `, bỏ qua ${res.skipped}` : ""}.`);
      reset();
      setOpen(false);
      onImported();
    } else {
      toast.error(res.error ?? "Lỗi khi nhập.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1 h-4 w-4" /> Nhập hàng loạt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập từ vựng hàng loạt</DialogTitle>
          <DialogDescription>
            Cột theo thứ tự: <b>Hán tự</b> · <b>Pinyin</b> (để trống sẽ tự sinh) · <b>Nghĩa</b> ·
            Ví dụ · Nghĩa ví dụ. Dán bảng từ Excel/Google Sheets hoặc tải file .csv / .xlsx.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="paste">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">
              <ClipboardPaste className="mr-1.5 h-4 w-4" /> Dán bảng
            </TabsTrigger>
            <TabsTrigger value="file">
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Tải file
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-2">
            <Textarea
              value={pasteText}
              onChange={(e) => handlePaste(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder={"你好\tnǐ hǎo\tXin chào\n谢谢\t\tCảm ơn"}
            />
            <p className="text-[11px] text-muted-foreground">
              Mỗi dòng một từ. Bôi đen các ô trong Excel rồi Ctrl+C → dán vào đây (ngăn cách bằng
              Tab), hoặc dán dạng CSV ngăn cách bằng dấu phẩy.
            </p>
          </TabsContent>

          <TabsContent value="file" className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
            />
            {fileName && (
              <p className="text-[11px] text-muted-foreground">Đã đọc: {fileName}</p>
            )}
            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Tải file mẫu (.csv)
            </button>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-green-600 dark:text-green-400">{validCount} hợp lệ</span>
              {skipCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {skipCount} bị bỏ qua
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">Hán tự</th>
                    <th className="px-2 py-1.5">Pinyin</th>
                    <th className="px-2 py-1.5">Nghĩa</th>
                    <th className="px-2 py-1.5">Ví dụ</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 200).map((r, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-t",
                        !r.valid && "bg-destructive/10 text-muted-foreground"
                      )}
                    >
                      <td className="px-2 py-1 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-1 font-chinese">{r.hanzi || "—"}</td>
                      <td className="px-2 py-1 font-pinyin text-xs">{r.pinyinFilled || "—"}</td>
                      <td className="px-2 py-1 text-xs">{r.meaning || "—"}</td>
                      <td className="px-2 py-1 font-chinese text-xs">{r.exHanzi || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 200 && (
              <p className="text-[11px] text-muted-foreground">
                Hiển thị 200/{preview.length} dòng đầu — tất cả dòng hợp lệ vẫn được nhập.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={handleImport} disabled={pending || validCount === 0}>
            {pending ? "Đang nhập..." : `Nhập ${validCount} từ`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
