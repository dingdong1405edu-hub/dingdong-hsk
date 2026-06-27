/** Phản hồi lỗi dùng chung cho mọi route /api/pdf/*. */

export function pdfUnauthorized(): Response {
  return new Response("Bạn cần đăng nhập để tải PDF.", { status: 401 });
}

export function pdfNotFound(): Response {
  return new Response("Không tìm thấy nội dung để tạo PDF.", { status: 404 });
}

/** Lỗi tạo PDF (thường do Chromium chưa sẵn sàng). Log đầy đủ, trả thông báo gọn. */
export function pdfError(err: unknown): Response {
  console.error("[pdf] tạo PDF thất bại:", err);
  return new Response("Không tạo được PDF lúc này. Vui lòng thử lại sau.", {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
