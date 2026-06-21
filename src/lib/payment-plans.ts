// ===========================================================================
//  CẤU HÌNH GÓI THANH TOÁN  —  CHỈNH SỬA TẠI ĐÂY
//  File này KHÔNG chứa secret và dùng được ở cả client lẫn server.
//  • amount: SỐ TIỀN VND, số nguyên (vd: 99000 = 99.000đ). Tối thiểu 1.000đ.
//  • code:   nội dung chuyển khoản hiển thị trong app ngân hàng — TỐI ĐA 25 ký
//            tự, nên viết KHÔNG DẤU để hiện đúng trên mọi ngân hàng.
//  • id:     mã định danh nội bộ — ĐỪNG đổi sau khi đã có người mua.
// ===========================================================================

export interface PaymentPlan {
  /** Mã định danh nội bộ (đừng đổi sau khi đã bán). */
  id: string;
  /** Tên hiển thị trên thẻ gói. */
  name: string;
  /** Nội dung chuyển khoản (≤ 25 ký tự, ưu tiên không dấu). */
  code: string;
  /** Số tiền VND, số nguyên. 👉 TỰ NHẬP GIÁ. */
  amount: number;
  /** Nhãn chu kỳ hiển thị cạnh giá, vd "/ tháng". Bỏ trống nếu mua 1 lần. */
  period?: string;
  /** Mô tả ngắn dưới tên gói. */
  description: string;
  /** Các gạch đầu dòng quyền lợi. */
  features: string[];
  /** Đặt true để làm nổi bật 1 gói (viền + badge "Phổ biến"). */
  highlighted?: boolean;
}

export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: "monthly",
    name: "Gói Tháng",
    code: "DDHSK GOI THANG",
    amount: 99000, // 👉 TỰ NHẬP GIÁ
    period: "/ tháng",
    description: "Trải nghiệm đầy đủ trong 1 tháng.",
    features: [
      "Toàn bộ bài học HSK 1–6",
      "AI chấm viết & luyện nói không giới hạn",
      "Không quảng cáo",
    ],
  },
  {
    id: "yearly",
    name: "Gói Năm",
    code: "DDHSK GOI NAM",
    amount: 499000, // 👉 TỰ NHẬP GIÁ
    period: "/ năm",
    description: "Học cả năm, tiết kiệm hơn hẳn.",
    features: [
      "Tất cả quyền lợi của Gói Tháng",
      "Tiết kiệm so với trả theo tháng",
      "Ưu tiên hỗ trợ",
    ],
    highlighted: true,
  },
  {
    id: "lifetime",
    name: "Trọn đời",
    code: "DDHSK TRON DOI",
    amount: 1990000, // 👉 TỰ NHẬP GIÁ
    description: "Một lần thanh toán, học mãi mãi.",
    features: [
      "Mọi quyền lợi, vĩnh viễn",
      "Mọi cập nhật trong tương lai",
      "Không phí định kỳ",
    ],
  },
];

export function getPlan(id: string): PaymentPlan | undefined {
  return PAYMENT_PLANS.find((p) => p.id === id);
}

/** Định dạng số tiền theo kiểu Việt Nam, vd 99000 → "99.000 ₫". */
export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
