// Suy ra QUYỀN LỢI (entitlements) của người học từ vai trò + các Subscription
// còn hạn, và cấp Subscription khi thanh toán thành công.
//
// Quy tắc (theo chính sách giá — xem CLAUDE.md mục "Chính sách giá & Phân quyền"):
//  • ADMIN  → mở hết tất cả (mọi cấp lộ trình + tim không giới hạn).
//  • Mọi gói trả phí còn hạn → TIM KHÔNG GIỚI HẠN.
//  • Gói ROADMAP cấp X       → mở khoá toàn bộ lộ trình cấp X.
//  • Gói FREESTYLE           → quyền "tự do" (mọi tính năng ngoài lộ trình).
//  • Người miễn phí          → xem trước FREE_ROADMAP_LESSONS bài đầu mỗi cấp,
//                              các tính năng tự do giới hạn theo tim.
import { HSKLevel, SubscriptionType } from "@prisma/client";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/payment-plans";

/** Số bài lộ trình đầu tiên mỗi cấp được học MIỄN PHÍ (xem trước). */
export const FREE_ROADMAP_LESSONS = 3;

export interface Entitlements {
  isAdmin: boolean;
  /** Tim không giới hạn (admin hoặc bất kỳ gói trả phí còn hạn). */
  unlimitedHearts: boolean;
  /** Quyền "tự do": mọi tính năng ngoài lộ trình. */
  freestyle: boolean;
  /** Các cấp HSK đã mở khoá lộ trình đầy đủ. */
  roadmapLevels: Set<HSKLevel>;
}

const ALL_LEVELS = Object.values(HSKLevel);

export async function getEntitlements(
  userId: string | null | undefined,
  role: string | null | undefined
): Promise<Entitlements> {
  if (role === "ADMIN") {
    return {
      isAdmin: true,
      unlimitedHearts: true,
      freestyle: true,
      roadmapLevels: new Set(ALL_LEVELS),
    };
  }

  const empty: Entitlements = {
    isAdmin: false,
    unlimitedHearts: false,
    freestyle: false,
    roadmapLevels: new Set<HSKLevel>(),
  };
  if (!userId) return empty;

  const subs = await db.subscription.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { type: true, hskLevel: true },
  });

  const roadmapLevels = new Set<HSKLevel>();
  let freestyle = false;
  for (const s of subs) {
    if (s.type === SubscriptionType.ROADMAP && s.hskLevel) roadmapLevels.add(s.hskLevel);
    if (s.type === SubscriptionType.FREESTYLE) freestyle = true;
  }

  return {
    isAdmin: false,
    unlimitedHearts: subs.length > 0, // mọi gói trả phí → tim ∞
    freestyle,
    roadmapLevels,
  };
}

/** Người dùng có quyền học đầy đủ lộ trình của một cấp HSK không? */
export function hasRoadmapLevel(ent: Entitlements, level: HSKLevel): boolean {
  return ent.isAdmin || ent.roadmapLevels.has(level);
}

/**
 * Bài lộ trình thứ `lessonIndex` (0-based, theo thứ tự) có bị KHOÁ vì chưa mua
 * không? Free: mở FREE_ROADMAP_LESSONS bài đầu; đã mua cấp đó / admin: mở hết.
 */
export function isRoadmapLessonLocked(
  ent: Entitlements,
  level: HSKLevel,
  lessonIndex: number
): boolean {
  if (hasRoadmapLevel(ent, level)) return false;
  return lessonIndex >= FREE_ROADMAP_LESSONS;
}

/**
 * Cấp Subscription cho một Payment đã PAID. Idempotent: nếu payment này đã cấp
 * quyền thì bỏ qua. Gọi từ webhook PayOS khi đơn chuyển sang PAID.
 */
export async function grantSubscriptionsForPayment(payment: {
  id: string;
  userId: string | null;
  planId: string | null;
  paidAt: Date | null;
}): Promise<void> {
  if (!payment.userId || !payment.planId) return;
  const plan = getPlan(payment.planId);
  if (!plan || plan.grants.length === 0) return;

  // Idempotent — đã cấp quyền cho đơn này rồi thì thôi (webhook có thể lặp).
  const already = await db.subscription.findFirst({ where: { paymentId: payment.id } });
  if (already) return;

  const start = payment.paidAt ?? new Date();
  const expiresAt = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  await db.$transaction(
    plan.grants.map((g) =>
      db.subscription.create({
        data: {
          userId: payment.userId!,
          type: g.type as SubscriptionType,
          hskLevel: g.hskLevel ? (g.hskLevel as HSKLevel) : null,
          startedAt: start,
          expiresAt,
          paymentId: payment.id,
        },
      })
    )
  );
}
