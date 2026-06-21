// PayOS client (https://payos.vn) — triển khai trực tiếp bằng `fetch` + `crypto`
// để không phải thêm thư viện ngoài stack. Thuật toán chữ ký được sao đúng theo
// SDK chính thức @payos/node để tương thích 100% với máy chủ PayOS.
//
// 3 giá trị lấy trong dashboard PayOS (Kênh thanh toán → Thông tin xác thực):
//   PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY
//
// File này CHỈ chạy ở server (đọc env + dùng node:crypto). Không import vào
// client component.
import crypto from "node:crypto";

const PAYOS_BASE_URL = "https://api-merchant.payos.vn";

export interface PayosCredentials {
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export function getPayosCredentials(): PayosCredentials | null {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!clientId || !apiKey || !checksumKey) return null;
  return { clientId, apiKey, checksumKey };
}

export function isPayosConfigured(): boolean {
  return getPayosCredentials() !== null;
}

// ---------------------------------------------------------------------------
//  Chữ ký (sao theo @payos/node)
// ---------------------------------------------------------------------------

function sortObjDataByKey(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

function convertObjToQueryStr(obj: Record<string, unknown>): string {
  return Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .map((key) => {
      let value = obj[key];
      // Mảng (vd items): stringify với từng phần tử đã sort key.
      if (value !== null && Array.isArray(value)) {
        value = JSON.stringify(
          value.map((v) =>
            v && typeof v === "object" ? sortObjDataByKey(v as Record<string, unknown>) : v
          )
        );
      }
      // null/undefined → chuỗi rỗng (đúng theo PayOS).
      if (value === null || value === undefined || value === "undefined" || value === "null") {
        value = "";
      }
      return `${key}=${value as string | number | boolean}`;
    })
    .join("&");
}

function hmac(data: string, key: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

/** Chữ ký cho object bất kỳ (dùng cho webhook & response). */
function signObject(data: Record<string, unknown>, checksumKey: string): string {
  return hmac(convertObjToQueryStr(sortObjDataByKey(data)), checksumKey);
}

/**
 * Chữ ký cho yêu cầu tạo link thanh toán: CHỈ gồm 5 trường, theo đúng thứ tự
 * alphabet: amount, cancelUrl, description, orderCode, returnUrl.
 */
function signPaymentRequest(
  d: { amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string },
  checksumKey: string
): string {
  const str = `amount=${d.amount}&cancelUrl=${d.cancelUrl}&description=${d.description}&orderCode=${d.orderCode}&returnUrl=${d.returnUrl}`;
  return hmac(str, checksumKey);
}

function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ---------------------------------------------------------------------------
//  Tạo link thanh toán
// ---------------------------------------------------------------------------

export interface CreatePaymentLinkParams {
  orderCode: number;
  amount: number;
  /** ≤ 25 ký tự — sẽ tự cắt bớt nếu dài hơn. */
  description: string;
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
  buyerEmail?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  /** Unix seconds — thời điểm link hết hạn. */
  expiredAt?: number;
}

export interface PayosPaymentLink {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  checkoutUrl: string;
  qrCode: string;
}

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PayosPaymentLink> {
  const creds = getPayosCredentials();
  if (!creds) {
    throw new Error(
      "PayOS chưa được cấu hình (thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY)."
    );
  }

  const description = params.description.slice(0, 25);
  const signature = signPaymentRequest(
    {
      amount: params.amount,
      cancelUrl: params.cancelUrl,
      description,
      orderCode: params.orderCode,
      returnUrl: params.returnUrl,
    },
    creds.checksumKey
  );

  const body: Record<string, unknown> = {
    orderCode: params.orderCode,
    amount: params.amount,
    description,
    cancelUrl: params.cancelUrl,
    returnUrl: params.returnUrl,
    signature,
  };
  if (params.buyerName) body.buyerName = params.buyerName;
  if (params.buyerEmail) body.buyerEmail = params.buyerEmail;
  if (params.items) body.items = params.items;
  if (params.expiredAt) body.expiredAt = params.expiredAt;

  const res = await fetch(`${PAYOS_BASE_URL}/v2/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": creds.clientId,
      "x-api-key": creds.apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as {
    code?: string;
    desc?: string;
    data?: PayosPaymentLink | null;
    signature?: string;
  } | null;

  if (!json || json.code !== "00" || !json.data) {
    throw new Error(`PayOS lỗi tạo link thanh toán: ${json?.desc || json?.code || "unknown"}`);
  }

  // Xác minh chữ ký phản hồi (defense-in-depth; không chặn nếu lệch để tránh
  // vỡ luồng vì PayOS đổi field — bảo mật trọng yếu nằm ở webhook).
  if (json.signature) {
    const expected = signObject(
      json.data as unknown as Record<string, unknown>,
      creds.checksumKey
    );
    if (!safeEqualHex(expected, json.signature)) {
      console.warn("[payos] response signature mismatch khi tạo link thanh toán");
    }
  }

  return json.data;
}

// ---------------------------------------------------------------------------
//  Webhook
// ---------------------------------------------------------------------------

export interface PayosWebhookBody {
  code?: string;
  desc?: string;
  success?: boolean;
  data: Record<string, unknown> | null;
  signature?: string;
}

/** Xác minh webhook đến từ PayOS bằng checksum key. */
export function verifyWebhookSignature(body: PayosWebhookBody): boolean {
  const creds = getPayosCredentials();
  if (!creds || !body || !body.data || !body.signature) return false;
  const expected = signObject(body.data, creds.checksumKey);
  return safeEqualHex(expected, body.signature);
}
