import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AUDIT_RETENTION_DAYS, entityLabel, pruneOldAuditLogs } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

const ACTION_META: Record<string, { label: string; cls: string }> = {
  CREATE: {
    label: "Tạo",
    cls: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  },
  UPDATE: {
    label: "Sửa",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  },
  DELETE: {
    label: "Xóa",
    cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
};

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ actorId?: string; action?: string; entity?: string }>;
}) {
  // Trang force-dynamic nên dọn bản ghi cũ ngay khi mở (không cần cron riêng).
  await pruneOldAuditLogs();

  const sp = await searchParams;
  const actorId = sp.actorId?.trim() || undefined;
  const action = sp.action?.trim() || undefined;
  const entity = sp.entity?.trim() || undefined;

  const where: Prisma.AuditLogWhereInput = {};
  if (actorId) where.actorId = actorId;
  if (action === "CREATE" || action === "UPDATE" || action === "DELETE") where.action = action;
  if (entity) where.entity = entity;

  const [logs, total, actors, entities] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      distinct: ["actorId"],
      select: { actorId: true, actorEmail: true, actorName: true },
      orderBy: { actorEmail: "asc" },
    }),
    db.auditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" },
    }),
  ]);

  const selectCls =
    "h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Lịch sử chỉnh sửa</h1>
        <p className="text-sm text-muted-foreground">
          Nhật ký thao tác của quản trị viên (tạo / sửa / xóa). Tự động xóa bản ghi cũ
          hơn {AUDIT_RETENTION_DAYS} ngày. Đang hiển thị {logs.length} / {total} bản ghi
          {total > PAGE_SIZE ? ` (mới nhất ${PAGE_SIZE})` : ""}.
        </p>
      </div>

      {/* Bộ lọc */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Người thực hiện
              <select name="actorId" defaultValue={actorId ?? ""} className={selectCls}>
                <option value="">Tất cả</option>
                {actors.map((a) => (
                  <option key={a.actorId ?? "null"} value={a.actorId ?? ""}>
                    {a.actorName ?? a.actorEmail}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Hành động
              <select name="action" defaultValue={action ?? ""} className={selectCls}>
                <option value="">Tất cả</option>
                <option value="CREATE">Tạo</option>
                <option value="UPDATE">Sửa</option>
                <option value="DELETE">Xóa</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Đối tượng
              <select name="entity" defaultValue={entity ?? ""} className={selectCls}>
                <option value="">Tất cả</option>
                {entities.map((e) => (
                  <option key={e.entity} value={e.entity}>
                    {entityLabel(e.entity)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm">
              Lọc
            </Button>
            {(actorId || action || entity) && (
              <a
                href="/admin/history"
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Xóa lọc
              </a>
            )}
          </form>
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          Chưa có bản ghi nào khớp bộ lọc.
        </p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    {["Thời gian", "Người thực hiện", "Hành động", "Đối tượng", "Mô tả", "Chi tiết"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const meta = ACTION_META[log.action] ?? { label: log.action, cls: "bg-muted text-foreground" };
                    const hasDetail = log.before != null || log.after != null;
                    return (
                      <tr key={log.id} className="border-b align-top hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{log.actorName ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{log.actorEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>{entityLabel(log.entity)}</div>
                          {log.entityId && (
                            <div className="text-[11px] text-muted-foreground/70">{log.entityId}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">{log.summary}</td>
                        <td className="px-4 py-3">
                          {hasDetail ? (
                            <details className="group">
                              <summary className="cursor-pointer select-none text-xs text-primary hover:underline">
                                Xem
                              </summary>
                              <div className="mt-2 space-y-2">
                                {log.before != null && (
                                  <div>
                                    <Badge variant="outline" className="mb-1 text-[10px]">
                                      Trước
                                    </Badge>
                                    <pre className="max-h-72 max-w-md overflow-auto rounded-md bg-muted p-2 text-[11px] leading-snug">
                                      {formatJson(log.before)}
                                    </pre>
                                  </div>
                                )}
                                {log.after != null && (
                                  <div>
                                    <Badge variant="outline" className="mb-1 text-[10px]">
                                      Sau
                                    </Badge>
                                    <pre className="max-h-72 max-w-md overflow-auto rounded-md bg-muted p-2 text-[11px] leading-snug">
                                      {formatJson(log.after)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
