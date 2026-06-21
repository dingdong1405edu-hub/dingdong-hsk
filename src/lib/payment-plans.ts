// ===========================================================================
//  CẤU HÌNH GÓI & CHÍNH SÁCH GIÁ  —  CHỈNH SỬA TẠI ĐÂY
//  File KHÔNG chứa secret, dùng được ở cả client lẫn server (đừng import prisma).
//
//  • amount       : SỐ TIỀN VND nguyên (vd 900000 = 900.000đ).
//  • durationDays : số ngày quyền lợi có hiệu lực (180 = 6 tháng, 30 = 1 tháng…).
//  • code         : nội dung chuyển khoản (≤ 25 ký tự, không dấu).
//  • grants       : quyền lợi được cấp khi thanh toán thành công.
//      - { type: "ROADMAP", hskLevel } → mở khoá lộ trình cấp đó.
//      - { type: "FREESTYLE" }         → mọi tính năng ngoài lộ trình + tim ∞.
//    (Mọi gói trả phí đều cho TIM KHÔNG GIỚI HẠN — xem src/lib/entitlements.ts.)
// ===========================================================================

export type GrantType = "ROADMAP" | "FREESTYLE";
export type HskLevelStr = "HSK1" | "HSK2" | "HSK3" | "HSK4" | "HSK5" | "HSK6";
export type PlanCategory = "roadmap" | "freestyle";

export interface PlanGrant {
  type: GrantType;
  hskLevel?: HskLevelStr;
}

export interface PaymentPlan {
  id: string;
  category: PlanCategory;
  name: string;
  /** Nội dung chuyển khoản (≤ 25 ký tự, ưu tiên không dấu). */
  code: string;
  /** 👉 GIÁ (VND). */
  amount: number;
  /** Thời hạn quyền lợi (ngày). */
  durationDays: number;
  /** Cấp HSK (chỉ gói lộ trình) — để hiển thị. */
  hskLevel?: HskLevelStr;
  /** Nhãn chu kỳ cạnh giá, vd "/ 6 tháng". */
  period?: string;
  description: string;
  features: string[];
  grants: PlanGrant[];
  /** Ghi chú khuyến mãi hiển thị trên thẻ. */
  promoNote?: string;
  highlighted?: boolean;
}

// --- Gói LỘ TRÌNH (theo cấp HSK, 6 tháng). HSK3–6 tặng kèm Gói Tự do. --------
export const ROADMAP_PLANS: PaymentPlan[] = [
  {
    id: "roadmap-hsk1",
    category: "roadmap",
    name: "Lộ trình HSK 1",
    code: "DDHSK LO TRINH HSK1",
    amount: 900000, // 👉 GIÁ
    durationDays: 180,
    hskLevel: "HSK1",
    period: "/ 6 tháng",
    description: "Toàn bộ lộ trình HSK 1 trong 6 tháng.",
    features: ["Mở khoá toàn bộ bài lộ trình HSK 1", "Tim không giới hạn", "Theo dõi tiến độ & XP"],
    grants: [{ type: "ROADMAP", hskLevel: "HSK1" }],
  },
  {
    id: "roadmap-hsk2",
    category: "roadmap",
    name: "Lộ trình HSK 2",
    code: "DDHSK LO TRINH HSK2",
    amount: 1200000, // 👉 GIÁ
    durationDays: 180,
    hskLevel: "HSK2",
    period: "/ 6 tháng",
    description: "Toàn bộ lộ trình HSK 2 trong 6 tháng.",
    features: ["Mở khoá toàn bộ bài lộ trình HSK 2", "Tim không giới hạn", "Theo dõi tiến độ & XP"],
    grants: [{ type: "ROADMAP", hskLevel: "HSK2" }],
  },
  {
    id: "roadmap-hsk3",
    category: "roadmap",
    name: "Lộ trình HSK 3",
    code: "DDHSK LO TRINH HSK3",
    amount: 1500000, // 👉 GIÁ
    durationDays: 180,
    hskLevel: "HSK3",
    period: "/ 6 tháng",
    description: "Lộ trình HSK 3 + tặng Gói Tự do.",
    features: ["Mở khoá toàn bộ bài lộ trình HSK 3", "🎁 Tặng kèm Gói Tự do", "Tim không giới hạn"],
    grants: [{ type: "ROADMAP", hskLevel: "HSK3" }, { type: "FREESTYLE" }],
    highlighted: true,
  },
  {
    id: "roadmap-hsk4",
    category: "roadmap",
    name: "Lộ trình HSK 4",
    code: "DDHSK LO TRINH HSK4",
    amount: 1800000, // 👉 GIÁ
    durationDays: 180,
    hskLevel: "HSK4",
    period: "/ 6 tháng",
    description: "Lộ trình HSK 4 + tặng Gói Tự do.",
    features: ["Mở khoá toàn bộ bài lộ trình HSK 4", "🎁 Tặng kèm Gói Tự do", "Tim không giới hạn"],
    grants: [{ type: "ROADMAP", hskLevel: "HSK4" }, { type: "FREESTYLE" }],
  },
  {
    id: "roadmap-hsk5",
    category: "roadmap",
    name: "Lộ trình HSK 5",
    code: "DDHSK LO TRINH HSK5",
    amount: 2100000, // 👉 GIÁ
    durationDays: 180,
    hskLevel: "HSK5",
    period: "/ 6 tháng",
    description: "Lộ trình HSK 5 + tặng Gói Tự do.",
    features: ["Mở khoá toàn bộ bài lộ trình HSK 5", "🎁 Tặng kèm Gói Tự do", "Tim không giới hạn"],
    grants: [{ type: "ROADMAP", hskLevel: "HSK5" }, { type: "FREESTYLE" }],
  },
  {
    id: "roadmap-hsk6",
    category: "roadmap",
    name: "Lộ trình HSK 6",
    code: "DDHSK LO TRINH HSK6",
    amount: 2400000, // 👉 GIÁ
    durationDays: 180,
    hskLevel: "HSK6",
    period: "/ 6 tháng",
    description: "Lộ trình HSK 6 + tặng Gói Tự do.",
    features: ["Mở khoá toàn bộ bài lộ trình HSK 6", "🎁 Tặng kèm Gói Tự do", "Tim không giới hạn"],
    grants: [{ type: "ROADMAP", hskLevel: "HSK6" }, { type: "FREESTYLE" }],
  },
];

// --- Gói TỰ DO (mọi tính năng ngoài lộ trình + tim không giới hạn) -----------
export const FREESTYLE_PLANS: PaymentPlan[] = [
  {
    id: "freestyle-1m",
    category: "freestyle",
    name: "Gói Tự do",
    code: "DDHSK TU DO 1THANG",
    amount: 250000, // 👉 GIÁ
    durationDays: 30,
    period: "/ tháng",
    description: "Mọi tính năng ngoài lộ trình, tim không giới hạn.",
    features: [
      "Tất cả tính năng (trừ học theo lộ trình)",
      "Tim không giới hạn",
      "AI chấm viết & luyện nói",
    ],
    grants: [{ type: "FREESTYLE" }],
  },
  {
    id: "freestyle-3m",
    category: "freestyle",
    name: "Gói Tự do · 3 tháng",
    code: "DDHSK TU DO 3THANG",
    amount: 600000, // 👉 GIÁ (tháng đầu giảm còn 100k → 100k + 250k + 250k)
    durationDays: 90,
    period: "/ 3 tháng",
    description: "Ưu đãi tháng đầu chỉ 100k.",
    features: ["Mọi quyền lợi Gói Tự do", "Tháng đầu chỉ 100k", "Tiết kiệm hơn trả từng tháng"],
    grants: [{ type: "FREESTYLE" }],
    promoNote: "🔥 Tháng đầu 100k",
    highlighted: true,
  },
];

export const PAYMENT_PLANS: PaymentPlan[] = [...ROADMAP_PLANS, ...FREESTYLE_PLANS];

export function getPlan(id: string): PaymentPlan | undefined {
  return PAYMENT_PLANS.find((p) => p.id === id);
}

/** Gói lộ trình tương ứng một cấp HSK (để liên kết "Nâng cấp" từ trang lộ trình). */
export function roadmapPlanForLevel(level: string): PaymentPlan | undefined {
  return ROADMAP_PLANS.find((p) => p.hskLevel === level);
}

/** Định dạng tiền VN, vd 900000 → "900.000 ₫". */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
