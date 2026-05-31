import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hskLevelLabel } from "@/lib/utils";
import { adminUpdateUserAction } from "@/server/actions/admin";

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true, hskLevel: true,
      xp: true, hearts: true, streakDays: true, banned: true, createdAt: true,
      _count: { select: { attempts: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quản lý người dùng ({users.length})</h1>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["Tên", "Email", "Role", "HSK", "XP", "Lượt học", "Trạng thái", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.name ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{hskLevelLabel(u.hskLevel)}</td>
                    <td className="px-4 py-3">{u.xp}</td>
                    <td className="px-4 py-3">{u._count.attempts}</td>
                    <td className="px-4 py-3">
                      {u.banned ? (
                        <Badge variant="destructive">Bị ban</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-700 border-green-300">Hoạt động</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form>
                        <input type="hidden" name="userId" value={u.id} />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            formAction={async (fd: FormData) => {
                              "use server";
                              await adminUpdateUserAction({ userId: fd.get("userId") as string, action: "resetHearts" });
                            }}
                          >
                            ♥ Reset
                          </Button>
                          <Button
                            size="sm"
                            variant={u.banned ? "outline" : "destructive"}
                            formAction={async (fd: FormData) => {
                              "use server";
                              await adminUpdateUserAction({ userId: fd.get("userId") as string, action: u.banned ? "unban" : "ban" });
                            }}
                          >
                            {u.banned ? "Unban" : "Ban"}
                          </Button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
