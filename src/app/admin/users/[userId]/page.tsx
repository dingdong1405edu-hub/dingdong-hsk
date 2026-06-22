import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown, Heart, Star, Flame, Infinity as InfinityIcon } from "lucide-react";
import { Skill } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel, xpToLevel } from "@/lib/utils";
import { formatVnd, PAYMENT_PLANS } from "@/lib/payment-plans";
import { effectiveHearts } from "@/lib/hearts";
import { getEntitlements } from "@/lib/entitlements";
import { GrantSubscriptionForm } from "@/components/admin/grant-subscription-form";
import { UserManagePanel } from "@/components/admin/user-manage-panel";
import { RevokeSubscriptionButton } from "@/components/admin/revoke-subscription-button";

export const dynamic = "force-dynamic";

const SKILL_LABEL: Record<Skill, string> = {
  READING: "Đọc hiểu",
  LISTENING: "Nghe hiểu",
  WRITING: "Viết luận",
  SPEAKING: "Luyện nói",
  VOCAB: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  HANZI: "Chữ Hán",
  MOCK: "Thi thử",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã huỷ",
  EXPIRED: "Hết hạn",
  FAILED: "Thất bại",
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Phân giải tiêu đề bài cho lịch sử lượt làm (Attempt.refId không có quan hệ FK —
// tra cứu theo lô, gom theo kỹ năng). refId cũ/đã xoá → null (hiển thị "—").
async function resolveAttemptTitles(
  attempts: { skill: Skill; refId: string }[]
): Promise<Map<string, string>> {
  const bySkill: Record<Skill, string[]> = {
    READING: [], LISTENING: [], WRITING: [], SPEAKING: [], VOCAB: [], GRAMMAR: [], HANZI: [], MOCK: [],
  };
  for (const a of attempts) bySkill[a.skill].push(a.refId);

  const map = new Map<string, string>();
  const key = (skill: Skill, id: string) => `${skill}|${id}`;

  const [readings, listenings, writings, speakings, vlessons, glessons, hanzis, mocks] = await Promise.all([
    bySkill.READING.length
      ? db.readingTest.findMany({ where: { id: { in: bySkill.READING } }, select: { id: true, title: true } })
      : [],
    bySkill.LISTENING.length
      ? db.listeningTest.findMany({ where: { id: { in: bySkill.LISTENING } }, select: { id: true, title: true } })
      : [],
    bySkill.WRITING.length
      ? db.writingTask.findMany({ where: { id: { in: bySkill.WRITING } }, select: { id: true, prompt: true } })
      : [],
    bySkill.SPEAKING.length
      ? db.speakingSet.findMany({ where: { id: { in: bySkill.SPEAKING } }, select: { id: true, title: true } })
      : [],
    bySkill.VOCAB.length
      ? db.vocabLesson.findMany({ where: { id: { in: bySkill.VOCAB } }, select: { id: true, title: true } })
      : [],
    bySkill.GRAMMAR.length
      ? db.grammarLesson.findMany({ where: { id: { in: bySkill.GRAMMAR } }, select: { id: true, title: true } })
      : [],
    bySkill.HANZI.length
      ? db.hanziCharacter.findMany({ where: { id: { in: bySkill.HANZI } }, select: { id: true, character: true, meaning: true } })
      : [],
    bySkill.MOCK.length
      ? db.mockExam.findMany({ where: { id: { in: bySkill.MOCK } }, select: { id: true, title: true } })
      : [],
  ]);

  readings.forEach((r) => map.set(key(Skill.READING, r.id), r.title));
  listenings.forEach((r) => map.set(key(Skill.LISTENING, r.id), r.title));
  writings.forEach((r) => map.set(key(Skill.WRITING, r.id), r.prompt.slice(0, 50)));
  speakings.forEach((r) => map.set(key(Skill.SPEAKING, r.id), r.title || "Bộ luyện nói"));
  vlessons.forEach((r) => map.set(key(Skill.VOCAB, r.id), r.title || "Bài từ vựng"));
  glessons.forEach((r) => map.set(key(Skill.GRAMMAR, r.id), r.title || "Bài ngữ pháp"));
  hanzis.forEach((r) => map.set(key(Skill.HANZI, r.id), `${r.character} (${r.meaning})`));
  mocks.forEach((r) => map.set(key(Skill.MOCK, r.id), r.title));

  return map;
}

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 50 },
      attempts: { orderBy: { createdAt: "desc" }, take: 50 },
      vocabProgress: { where: { completed: true }, select: { id: true } },
      grammarProgress: { where: { completed: true }, select: { id: true } },
      hanziProgress: { where: { mastered: true }, select: { id: true } },
      roadmapProgress: { where: { completed: true }, select: { id: true } },
    },
  });
  if (!user) notFound();

  const ent = await getEntitlements(user.id, user.role);
  const liveHearts = effectiveHearts(user.hearts, user.heartsUpdatedAt);
  const { level } = xpToLevel(user.xp);
  const isSelf = session?.user?.id === user.id;
  const now = new Date();

  // Tổng nội dung học viên có thể truy cập (đã xuất bản) ở cấp HSK mục tiêu —
  // khớp với cách tính % ở dashboard học viên.
  const [vocabTotal, grammarTotal, hanziTotal] = await Promise.all([
    db.vocabLesson.count({ where: { published: true, unit: { published: true, hskLevel: user.hskLevel } } }),
    db.grammarLesson.count({ where: { published: true, unit: { published: true, hskLevel: user.hskLevel } } }),
    db.hanziCharacter.count({ where: { published: true, hskLevel: user.hskLevel } }),
  ]);

  const titleMap = await resolveAttemptTitles(user.attempts);
  const paymentById = new Map(user.payments.map((p) => [p.id, p]));
  const planNameById = new Map(PAYMENT_PLANS.map((p) => [p.id, p.name]));

  const progressRows = [
    { label: "Từ vựng", done: user.vocabProgress.length, total: vocabTotal },
    { label: "Ngữ pháp", done: user.grammarProgress.length, total: grammarTotal },
    { label: "Chữ Hán", done: user.hanziProgress.length, total: hanziTotal },
  ];

  const planOptions = PAYMENT_PLANS.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách người dùng
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{user.name ?? "(chưa đặt tên)"}</h1>
            {user.role === "ADMIN" && (
              <Badge className="gap-1">
                <Crown className="h-3 w-3" /> ADMIN
              </Badge>
            )}
            {user.banned && <Badge variant="destructive">Bị khoá</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Tham gia: {fmtDate(user.createdAt)}</p>
        </div>
        <UserManagePanel
          userId={user.id}
          role={user.role}
          banned={user.banned}
          isSelf={isSelf}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Star className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">XP · Cấp {level}</div>
              <div className="text-lg font-bold">{user.xp}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-xs text-muted-foreground">Chuỗi ngày</div>
              <div className="text-lg font-bold">{user.streakDays}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Heart className="h-5 w-5 text-rose-500" />
            <div>
              <div className="text-xs text-muted-foreground">Tim</div>
              <div className="flex items-center text-lg font-bold">
                {ent.unlimitedHearts ? <InfinityIcon className="h-5 w-5" /> : `${liveHearts} / 5`}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Crown className="h-5 w-5 text-violet-500" />
            <div>
              <div className="text-xs text-muted-foreground">HSK mục tiêu</div>
              <div className="text-lg font-bold">{hskLevelLabel(user.hskLevel)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quyền lợi hiện có (entitlements) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quyền lợi đang có</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {ent.isAdmin && <Badge variant="secondary">Admin · mở hết tất cả</Badge>}
          {ent.unlimitedHearts && <Badge variant="outline">Tim không giới hạn</Badge>}
          {ent.freestyle && <Badge variant="outline">Gói Tự do</Badge>}
          {[...ent.roadmapLevels].sort().map((lv) => (
            <Badge key={lv} variant="outline">
              Lộ trình {hskLevelLabel(lv)}
            </Badge>
          ))}
          {!ent.isAdmin && !ent.freestyle && ent.roadmapLevels.size === 0 && !ent.unlimitedHearts && (
            <span className="text-muted-foreground">Tài khoản miễn phí (chưa có gói trả phí).</span>
          )}
        </CardContent>
      </Card>

      {/* Tiến độ học */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tiến độ học · {hskLevelLabel(user.hskLevel)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {progressRows.map((r) => {
            const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
            return (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-muted-foreground">
                    {r.done}/{r.total} ({pct}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Bài lộ trình đã hoàn thành: <span className="font-semibold">{user.roadmapProgress.length}</span>
          </p>
        </CardContent>
      </Card>

      {/* Gói đã mua / được cấp */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gói quyền lợi ({user.subscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {user.subscriptions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Chưa có gói nào.</p>
          ) : (
            <div className="divide-y">
              {user.subscriptions.map((s) => {
                const active = s.expiresAt > now;
                const planName = s.paymentId
                  ? planNameById.get(paymentById.get(s.paymentId)?.planId ?? "")
                  : undefined;
                const typeLabel =
                  s.type === "ROADMAP" ? `Lộ trình ${s.hskLevel ? hskLevelLabel(s.hskLevel) : ""}`.trim() : "Gói Tự do";
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{planName ?? typeLabel}</span>
                        {active ? (
                          <Badge variant="outline" className="border-green-300 text-green-700">
                            Còn hạn
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Hết hạn</Badge>
                        )}
                        {!s.paymentId && <Badge variant="outline">Cấp thủ công</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(s.startedAt)} → {fmtDate(s.expiresAt)}
                      </div>
                    </div>
                    <RevokeSubscriptionButton subscriptionId={s.id} label={planName ?? typeLabel} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cấp gói thủ công */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cấp gói cho người dùng này</CardTitle>
        </CardHeader>
        <CardContent>
          <GrantSubscriptionForm plans={planOptions} defaultEmail={user.email} />
        </CardContent>
      </Card>

      {/* Lịch sử thanh toán */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử thanh toán ({user.payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {user.payments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Chưa có giao dịch.</p>
          ) : (
            <div className="divide-y">
              {user.payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{p.planName}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(p.paidAt ?? p.createdAt)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-semibold">{formatVnd(p.amount)}</span>
                    <Badge variant={p.status === "PAID" ? "default" : "secondary"}>
                      {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lượt làm bài gần đây */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lượt làm bài gần đây ({user.attempts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {user.attempts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
          ) : (
            <div className="divide-y">
              {user.attempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                      {SKILL_LABEL[a.skill]}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {titleMap.get(`${a.skill}|${a.refId}`) ?? "—"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {a.score !== null && <span className="font-semibold">{Math.round(a.score)}%</span>}
                    <span className="text-xs text-muted-foreground">{fmtDate(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
